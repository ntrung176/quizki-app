import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
    ArrowLeft, Plus, Trash2, Edit2, Save, ChevronRight, PenTool, FileJson,
    Clipboard, Check, AlertCircle, Sparkles, Clock, X,
    Loader2, Award, ClipboardCheck, Lightbulb, Sparkle, Eye, CheckCircle
} from 'lucide-react';
import {
    subscribeTextbooks, subscribeLessons, subscribeGrammarPoints,
    addGrammarPoint, updateGrammarPoint, deleteGrammarPoint, importGrammarPointsFromJson,
    updateLesson
} from '../../utils/grammarService';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../../config/firebase';
import { aiCheckGrammarAnswer } from '../../utils/aiProvider';
import { playCorrectSound, playIncorrectSound, playCompletionFanfare } from '../../utils/soundEffects';

const SAMPLE_POINTS_JSON = `[
  {
    "pattern": "〜際(に)",
    "meaningShort": "Nhân dịp / Khi",
    "meaning": "Khi, lúc (dùng trong văn phong trang trọng, thông báo công cộng)",
    "meaningFull": "Cấu trúc trang trọng tương tự とき, dùng khi hướng dẫn, thông báo công cộng.\\nChú ý: Không dùng cho các hoạt động sinh hoạt thường ngày.",
    "structureRaw": "Vた / Nの",
    "examplesRaw": "お降りの際は、足元にご注意ください。\\nKhi xuống xe, xin hãy chú ý dưới chân.\\n緊急の際は、このボタンを押してください。\\nTrong trường hợp khẩn cấp, hãy ấn nút này.",
    "visual": {
      "image": "",
      "sentenceJa": "お降りの際は、足元にご注意ください。",
      "descriptionVi": "Khi xuống xe, xin hãy chú ý dưới chân."
    }
  }
]`;

const EMPTY_FORM = {
    pattern: '',
    meaningShort: '',
    meaning: '',
    meaningFull: '',
    structureRaw: '',
    tipsRaw: '',
    examplesRaw: '',
    visual: {
        title: '',
        imageLabel: '',
        image: '',
        sentenceJa: '',
        sentenceJaUnderline: '',
        descriptionVi: ''
    }
};

const GrammarPointsScreen = ({ isAdmin, profile = null }) => {
    const { textbookId, lessonId } = useParams();
    const navigate = useNavigate();
    const [textbook, setTextbook] = useState(null);
    const [lesson, setLesson] = useState(null);
    const [points, setPoints] = useState([]);
    const [showAdd, setShowAdd] = useState(false);
    const [showJsonImport, setShowJsonImport] = useState(false);
    const [jsonText, setJsonText] = useState('');
    const [importError, setImportError] = useState('');
    const [importSuccess, setImportSuccess] = useState('');
    const [copied, setCopied] = useState(false);
    const [editId, setEditId] = useState(null);
    const [form, setForm] = useState(EMPTY_FORM);
    const [saving, setSaving] = useState(false);

    // Image uploading state for single visual
    const [uploadingState, setUploadingState] = useState(false);

    // Review Lesson States
    const [activeTab, setActiveTab] = useState('quiz'); // default to quiz
    const [translateAnswers, setTranslateAnswers] = useState({});
    const [translateResults, setTranslateResults] = useState({});
    const [showTranslateAnswer, setShowTranslateAnswer] = useState({});
    const [showTranslateHint, setShowTranslateHint] = useState({});
    const [aiResults, setAiResults] = useState({});
    const [aiLoading, setAiLoading] = useState({});
    const [quizAnswers, setQuizAnswers] = useState({});

    // Admin Review Lesson States
    const [showReviewImportPanel, setShowReviewImportPanel] = useState(false);
    const [showAddQuizPanel, setShowAddQuizPanel] = useState(false);
    const [activeAddQuizTab, setActiveAddQuizTab] = useState('manual'); // 'manual' or 'json'
    const [manualQuizForm, setManualQuizForm] = useState({
        question: '',
        options: ['', '', '', ''],
        answer: '',
        explanation: ''
    });
    const [jsonInputTranslate, setJsonInputTranslate] = useState('');
    const [jsonInputQuiz, setJsonInputQuiz] = useState('');
    const [importingReview, setImportingReview] = useState(false);
    const [editingReviewItem, setEditingReviewItem] = useState(null); // { type: 'translate' | 'quiz', index: number }
    const [editReviewForm, setEditReviewForm] = useState(null);

    const handleReviewAddQuizManually = async () => {
        const q = manualQuizForm.question.trim();
        const opts = manualQuizForm.options.map(o => o.trim()).filter(Boolean);
        const ans = manualQuizForm.answer.trim();
        const expl = manualQuizForm.explanation.trim();

        if (!q) {
            alert("Vui lòng nhập câu hỏi!");
            return;
        }
        if (opts.length < 2) {
            alert("Vui lòng nhập ít nhất 2 lựa chọn!");
            return;
        }
        if (!ans || !opts.includes(ans)) {
            alert("Vui lòng chọn hoặc nhập đáp án đúng nằm trong danh sách các lựa chọn!");
            return;
        }

        setImportingReview(true);
        try {
            const newQuiz = {
                question: q,
                options: opts,
                answer: ans,
                explanation: expl
            };

            const updatedQuizzes = [...(lesson.quizzes || []), newQuiz];

            const success = await updateLesson(textbookId, lessonId, {
                ...lesson,
                quizzes: updatedQuizzes
            });

            if (success) {
                setLesson(prev => ({
                    ...prev,
                    quizzes: updatedQuizzes
                }));
                alert("Đã thêm câu hỏi trắc nghiệm thành công!");
                setManualQuizForm({
                    question: '',
                    options: ['', '', '', ''],
                    answer: '',
                    explanation: ''
                });
                setShowAddQuizPanel(false);
            } else {
                alert("Lỗi khi cập nhật database.");
            }
        } catch (e) {
            console.error(e);
            alert("Lỗi: " + e.message);
        }
        setImportingReview(false);
    };

    const handleReviewAiCheck = async (id) => {
        const ex = (lesson.exercises || []).find(e => e.id === id || e.questionVi === id);
        const user = (translateAnswers[id] || '').trim();
        if (!user || !ex) return;
        setAiLoading(p => ({ ...p, [id]: true }));
        try {
            const result = await aiCheckGrammarAnswer(user, ex.questionVi, ex.answers, lesson.title);
            if (result) {
                setAiResults(p => ({ ...p, [id]: result }));
                if (result.isCorrect) {
                    playCorrectSound();
                    setTranslateResults(p => {
                        const next = { ...p, [id]: 'correct' };
                        const completed = Object.values(next).filter(r => r === 'correct').length;
                        if (completed === (lesson.exercises || []).length) {
                            playCompletionFanfare();
                        }
                        return next;
                    });
                } else {
                    playIncorrectSound();
                    setTranslateResults(p => ({ ...p, [id]: 'incorrect' }));
                }
            }
        } catch (e) {
            console.error(e);
        }
        setAiLoading(p => ({ ...p, [id]: false }));
    };

    const handleReviewImportJson = async (type) => {
        setImportingReview(true);
        const rawJson = type === 'translate' ? jsonInputTranslate : jsonInputQuiz;
        if (!rawJson.trim()) {
            alert("Vui lòng nhập chuỗi JSON!");
            setImportingReview(false);
            return;
        }

        try {
            const parsed = JSON.parse(rawJson);
            if (!Array.isArray(parsed)) {
                throw new Error("Dữ liệu nhập vào phải là một mảng (Array) các câu hỏi.");
            }

            let updatedExercises = [...(lesson.exercises || [])];
            let updatedQuizzes = [...(lesson.quizzes || [])];

            if (type === 'translate') {
                parsed.forEach(item => {
                    if (!item.questionVi || !Array.isArray(item.answers)) {
                        throw new Error("Mỗi câu hỏi Đặt câu cần có 'questionVi' và mảng 'answers'.");
                    }
                });
                updatedExercises = [...updatedExercises, ...parsed];
            } else {
                parsed.forEach(item => {
                    if (!item.question || !Array.isArray(item.options) || !item.answer) {
                        throw new Error("Mỗi câu hỏi Trắc nghiệm cần có 'question', mảng 'options', và đáp án chính xác 'answer'.");
                    }
                });
                updatedQuizzes = [...updatedQuizzes, ...parsed];
            }

            const success = await updateLesson(textbookId, lessonId, {
                ...lesson,
                exercises: updatedExercises,
                quizzes: updatedQuizzes
            });

            if (success) {
                setLesson(prev => ({
                    ...prev,
                    exercises: updatedExercises,
                    quizzes: updatedQuizzes
                }));
                alert(`Đã thêm thành công ${parsed.length} câu hỏi!`);
                if (type === 'translate') setJsonInputTranslate('');
                else setJsonInputQuiz('');
                setShowReviewImportPanel(false);
            } else {
                alert("Lỗi khi lưu dữ liệu lên Firestore.");
            }
        } catch (e) {
            alert("Lỗi JSON không hợp lệ: " + e.message);
        }
        setImportingReview(false);
    };

    const startReviewInlineEdit = (type, index, item) => {
        setEditingReviewItem({ type, index });
        if (type === 'translate') {
            setEditReviewForm({
                questionVi: item.questionVi || '',
                hint: item.hint || '',
                answersRaw: (item.answers || []).join('\n')
            });
        } else {
            setEditReviewForm({
                question: item.question || '',
                options: [...(item.options || ['', '', '', ''])],
                answer: item.answer || '',
                explanation: item.explanation || ''
            });
        }
    };

    const cancelReviewInlineEdit = () => {
        setEditingReviewItem(null);
        setEditReviewForm(null);
    };

    const saveReviewInlineEdit = async (type, index) => {
        let updatedExercises = [...(lesson.exercises || [])];
        let updatedQuizzes = [...(lesson.quizzes || [])];

        if (type === 'translate') {
            const answers = editReviewForm.answersRaw.split('\n').map(a => a.trim()).filter(Boolean);
            if (!editReviewForm.questionVi.trim()) {
                alert("Câu hỏi tiếng Việt không được để trống!");
                return;
            }
            if (answers.length === 0) {
                alert("Vui lòng nhập ít nhất 1 đáp án!");
                return;
            }
            updatedExercises[index] = {
                ...updatedExercises[index],
                questionVi: editReviewForm.questionVi.trim(),
                hint: editReviewForm.hint.trim(),
                answers
            };
        } else {
            if (!editReviewForm.question.trim()) {
                alert("Câu hỏi không được để trống!");
                return;
            }
            const filledOptions = editReviewForm.options.map(o => o.trim()).filter(Boolean);
            if (filledOptions.length < 2) {
                alert("Vui lòng điền ít nhất 2 lựa chọn!");
                return;
            }
            if (!editReviewForm.answer.trim()) {
                alert("Vui lòng chọn hoặc điền đáp án chính xác!");
                return;
            }
            updatedQuizzes[index] = {
                ...updatedQuizzes[index],
                question: editReviewForm.question.trim(),
                options: filledOptions,
                answer: editReviewForm.answer.trim(),
                explanation: editReviewForm.explanation.trim()
            };
        }

        const success = await updateLesson(textbookId, lessonId, {
            ...lesson,
            exercises: updatedExercises,
            quizzes: updatedQuizzes
        });

        if (success) {
            setLesson(prev => ({
                ...prev,
                exercises: updatedExercises,
                quizzes: updatedQuizzes
            }));
            setEditingReviewItem(null);
            setEditReviewForm(null);
        } else {
            alert("Lỗi khi lưu dữ liệu.");
        }
    };

    const deleteReviewQuestion = async (type, index) => {
        if (!await window.showConfirm("Bạn có chắc chắn muốn xoá câu hỏi này?", { type: 'danger' })) return;
        let updatedExercises = [...(lesson.exercises || [])];
        let updatedQuizzes = [...(lesson.quizzes || [])];

        if (type === 'translate') {
            updatedExercises.splice(index, 1);
        } else {
            updatedQuizzes.splice(index, 1);
        }

        const success = await updateLesson(textbookId, lessonId, {
            ...lesson,
            exercises: updatedExercises,
            quizzes: updatedQuizzes
        });

        if (success) {
            setLesson(prev => ({
                ...prev,
                exercises: updatedExercises,
                quizzes: updatedQuizzes
            }));
            setTranslateAnswers({});
            setTranslateResults({});
            setQuizAnswers({});
        } else {
            alert("Lỗi khi xóa dữ liệu.");
        }
    };

    const handleReviewSelectQuiz = (qIdx, opt, quiz) => {
        const isCorrect = opt === quiz.answer;
        if (isCorrect) {
            playCorrectSound();
        } else {
            playIncorrectSound();
        }
        setQuizAnswers(p => {
            const newAnswers = { ...p, [qIdx]: opt };
            const completed = (lesson.quizzes || []).filter((q, idx) => {
                const ans = idx === qIdx ? opt : newAnswers[idx];
                return ans === q.answer;
            }).length;
            if (completed === (lesson.quizzes || []).length) {
                playCompletionFanfare();
            }
            return newAnswers;
        });
    };

    useEffect(() => {
        const u1 = subscribeTextbooks(tbs => setTextbook(tbs.find(t => t.id === textbookId)), isAdmin);
        const u2 = subscribeLessons(textbookId, ls => setLesson(ls.find(l => l.id === lessonId)), isAdmin);
        const u3 = subscribeGrammarPoints(textbookId, lessonId, setPoints, isAdmin);
        return () => { u1?.(); u2?.(); u3?.(); };
    }, [textbookId, lessonId, isAdmin]);

    useEffect(() => {
        if (lesson && profile) {
            const userIsAdmin = profile?.email && ['ntrungforwork@gmail.com', 'lynguyennhattrung1706@gmail.com'].includes(profile.email);
            const isLocked = lesson.isPremium && !userIsAdmin && !profile?.isPremiumUnlocked && !(profile?.unlockedSpecializedPackages || []).includes('grammar_zen');
            if (isLocked) {
                navigate(`/grammar/textbook/${textbookId}`);
            }
        }
    }, [lesson, profile, textbookId, navigate]);

    // Parse helpers: admin inputs simple text, we convert to arrays
    const parseStructure = (raw) => {
        if (!raw) return [];
        return raw.split('+').map(s => {
            const t = s.trim();
            if (t.startsWith('*')) return { text: t.slice(1), type: 'highlight' };
            if (t.startsWith('V')) return { text: t, type: 'verb' };
            if (t.startsWith('N') || t.startsWith('A')) return { text: t, type: 'noun' };
            return { text: t, type: 'connector' };
        });
    };
    const parseTips = (raw) => raw ? raw.split('\n').filter(Boolean).map(l => ({ icon: '💡', text: l.trim() })) : [];
    const parseExamples = (raw) => {
        if (!raw) return [];
        const lines = raw.split('\n').filter(Boolean);
        const exs = [];
        for (let i = 0; i < lines.length; i += 2) {
            exs.push({ ja: lines[i]?.trim() || '', vi: lines[i + 1]?.trim() || '' });
        }
        return exs;
    };

    // Reverse: convert structured data to raw text for editing
    const toStructureRaw = (arr) => arr ? arr.map(s => s.type === 'highlight' ? `*${s.text}` : s.text).join(' + ') : '';
    const toTipsRaw = (arr) => arr ? arr.map(t => t.text).join('\n') : '';
    const toExamplesRaw = (arr) => arr ? arr.map(e => `${e.ja}\n${e.vi}`).join('\n') : '';

    // Firebase Storage upload helper
    const uploadImageFile = async (file) => {
        try {
            const fileExt = file.name ? file.name.split('.').pop() : 'png';
            const storageRef = ref(storage, `grammar_visuals/${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${fileExt}`);
            const snapshot = await uploadBytes(storageRef, file);
            const downloadUrl = await getDownloadURL(snapshot.ref);
            return downloadUrl;
        } catch (error) {
            console.error("Upload error:", error);
            throw error;
        }
    };

    // Paste & drop handler
    const handleImagePasteOrDrop = async (e) => {
        e.preventDefault();
        let file = null;

        if (e.type === 'paste') {
            const items = e.clipboardData?.items;
            if (items) {
                for (let i = 0; i < items.length; i++) {
                    if (items[i].type.indexOf('image') !== -1) {
                        file = items[i].getAsFile();
                        break;
                    }
                }
            }
        } else if (e.type === 'drop') {
            const files = e.dataTransfer?.files;
            if (files && files.length > 0) {
                if (files[0].type.indexOf('image') !== -1) {
                    file = files[0];
                }
            }
        }

        if (file) {
            try {
                setUploadingState(true);
                const url = await uploadImageFile(file);
                setForm(f => ({
                    ...f,
                    visual: {
                        ...f.visual,
                        image: url
                    }
                }));
            } catch (err) {
                alert("Lỗi khi tải ảnh lên: " + err.message);
            } finally {
                setUploadingState(false);
            }
        }
    };

    const handleSave = async () => {
        setSaving(true);
        const data = {
            pattern: form.pattern.trim(),
            meaningShort: form.meaningShort.trim(),
            meaning: form.meaning.trim(),
            meaningFull: form.meaningFull.trim(),
            structure: parseStructure(form.structureRaw),
            tips: parseTips(form.tipsRaw),
            examples: parseExamples(form.examplesRaw),
            visual: {
                active: !!(form.visual.image.trim() || form.visual.sentenceJa.trim()),
                title: form.visual.title.trim() || "Học Ngữ pháp Trực quan Zen",
                imageLabel: form.visual.imageLabel.trim(),
                image: form.visual.image.trim(),
                sentenceJa: form.visual.sentenceJa.trim(),
                sentenceJaUnderline: form.visual.sentenceJaUnderline.trim(),
                descriptionVi: form.visual.descriptionVi.trim()
            }
        };

        if (editId) {
            const original = points.find(p => p.id === editId);
            data.exercises = original?.exercises || [];
            data.quizzes = original?.quizzes || [];
            await updateGrammarPoint(textbookId, lessonId, editId, data);
        } else {
            data.exercises = [];
            data.quizzes = [];
            await addGrammarPoint(textbookId, lessonId, data, 'admin');
        }
        setShowAdd(false);
        setEditId(null);
        setForm(EMPTY_FORM);
        setSaving(false);
    };

    const handleJsonImportSubmit = async () => {
        setSaving(true);
        setImportError('');
        setImportSuccess('');
        try {
            const parsed = JSON.parse(jsonText);
            if (!Array.isArray(parsed)) {
                throw new Error("Dữ liệu JSON phải là một Danh sách các Ngữ pháp (Array).");
            }
            const res = await importGrammarPointsFromJson(textbookId, lessonId, parsed, 'admin');
            if (res.success) {
                setImportSuccess(`Nhập ngữ pháp thành công! Đã thêm ${res.count} cấu trúc.`);
                setJsonText('');
                setTimeout(() => setShowJsonImport(false), 2000);
            } else {
                setImportError(res.error || "Có lỗi xảy ra khi lưu vào Firestore.");
            }
        } catch (e) {
            setImportError(`JSON không hợp lệ: ${e.message}`);
        }
        setSaving(false);
    };

    const handleCopySample = () => {
        navigator.clipboard.writeText(SAMPLE_POINTS_JSON);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleEdit = (gp) => {
        setForm({
            pattern: gp.pattern || '',
            meaningShort: gp.meaningShort || '',
            meaning: gp.meaning || '',
            meaningFull: gp.meaningFull || '',
            structureRaw: toStructureRaw(gp.structure),
            tipsRaw: toTipsRaw(gp.tips),
            examplesRaw: toExamplesRaw(gp.examples),
            visual: gp.visual ? {
                title: gp.visual.title || '',
                imageLabel: gp.visual.imageLabel || gp.visual.themeRight || gp.visual.themeLeft || '',
                image: gp.visual.image || gp.visual.rightImage || gp.visual.leftImage || '',
                sentenceJa: gp.visual.sentenceJa || '',
                sentenceJaUnderline: gp.visual.sentenceJaUnderline || '',
                descriptionVi: gp.visual.descriptionVi || ''
            } : EMPTY_FORM.visual
        });
        setEditId(gp.id);
        setShowAdd(true);
        setShowJsonImport(false);
    };

    if (!textbook || !lesson) return <div className="p-8 text-center text-slate-500">Đang tải...</div>;

    if (lesson.isReview) {
        const exercises = lesson.exercises || [];
        const quizzes = lesson.quizzes || [];

        let pct = 0;
        let completedCount = 0;
        let totalInTab = 0;
        const currentTab = (activeTab === 'translate' && exercises.length === 0 && quizzes.length > 0) ? 'quiz' : activeTab;

        if (currentTab === 'translate') {
            totalInTab = exercises.length;
            completedCount = Object.values(translateResults).filter(r => r === 'correct').length;
            pct = totalInTab > 0 ? Math.round((completedCount / totalInTab) * 100) : 0;
        } else {
            totalInTab = quizzes.length;
            completedCount = quizzes.filter((q, idx) => quizAnswers[idx] === q.answer).length;
            pct = totalInTab > 0 ? Math.round((completedCount / totalInTab) * 100) : 0;
        }

        return (
            <div className="max-w-3xl mx-auto space-y-5 animate-fade-in px-4 md:px-0">
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-md flex items-start justify-between gap-4">
                    <div>
                        <button onClick={() => navigate(`/grammar/textbook/${textbookId}`)} className="flex items-center gap-1.5 text-xs font-bold text-cyan-600 dark:text-cyan-400 hover:underline mb-2 font-mono">
                            <ArrowLeft className="w-3.5 h-3.5" /> Quay lại
                        </button>
                        <p className="text-xs font-mono font-bold text-slate-400 mb-1">{textbook.title || textbook.titleVi} • {lesson.sectionLabel}</p>
                        <h1 className="text-2xl font-black text-slate-900 dark:text-white">{lesson.title}</h1>
                        <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">{lesson.meaning || 'Bài ôn tập tổng hợp'}</p>
                    </div>
                    {isAdmin && (
                        <div className="flex gap-2 shrink-0">
                            <button onClick={() => { setShowAddQuizPanel(!showAddQuizPanel); setShowReviewImportPanel(false); }}
                                className="flex items-center gap-1.5 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950 dark:hover:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 text-xs font-bold rounded-xl transition-all border border-emerald-200 dark:border-emerald-800/80 shadow-sm">
                                <Plus className="w-3.5 h-3.5" /> Thêm Trắc nghiệm
                            </button>
                            <button onClick={() => { setShowReviewImportPanel(!showReviewImportPanel); setShowAddQuizPanel(false); }}
                                className="flex items-center gap-1.5 px-3 py-2 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950 dark:hover:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 text-xs font-bold rounded-xl transition-all border border-indigo-200 dark:border-indigo-800/80 shadow-sm">
                                <FileJson className="w-3.5 h-3.5" /> Nhập Đặt câu (JSON)
                            </button>
                        </div>
                    )}
                </div>

                {/* ADMIN JSON TRANSLATE IMPORT PANEL */}
                {isAdmin && showReviewImportPanel && (
                    <div className="bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 space-y-4 shadow-sm animate-in fade-in slide-in-from-top duration-200">
                        <div>
                            <h3 className="font-extrabold text-slate-800 dark:text-white flex items-center gap-2 text-sm">
                                ⚙️ Nhập và Thêm Đặt câu bằng JSON (Admin)
                            </h3>
                            <p className="text-[11px] text-slate-500 mt-0.5">Dữ liệu dán vào sẽ được thêm nối tiếp vào danh sách câu hỏi hiện tại.</p>
                        </div>
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <label className="text-[10px] font-bold text-slate-500 uppercase block">Thêm Đặt câu (JSON)</label>
                                <button onClick={() => {
                                    setJsonInputTranslate(`[\n  {\n    "questionVi": "Câu tiếng Việt ở đây",\n    "hint": "Gợi ý",\n    "answers": ["Đáp án tiếng Nhật"]\n  }\n]`);
                                }} className="text-[10px] text-indigo-600 hover:underline">Copy mẫu</button>
                            </div>
                            <textarea value={jsonInputTranslate} onChange={e => setJsonInputTranslate(e.target.value)} rows={6} placeholder='[{"questionVi": "...", "answers": ["..."]}]'
                                className="w-full font-mono text-[11px] p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl dark:text-white outline-none resize-none focus:ring-2 focus:ring-indigo-500/25" />
                            <button onClick={() => handleReviewImportJson('translate')} disabled={importingReview || !jsonInputTranslate.trim()}
                                className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg disabled:opacity-50">
                                Nhập thêm Đặt câu
                            </button>
                        </div>
                    </div>
                )}

                {/* ADMIN ADD QUIZ PANEL (MANUAL & JSON) */}
                {isAdmin && showAddQuizPanel && (
                    <div className="bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 space-y-4 shadow-sm animate-in fade-in slide-in-from-top duration-200">
                        <div className="flex items-center justify-between border-b border-slate-250 dark:border-slate-700 pb-2.5">
                            <h3 className="font-extrabold text-slate-800 dark:text-white flex items-center gap-2 text-sm">
                                ⚙️ Thêm câu hỏi Trắc nghiệm (Admin)
                            </h3>
                            <div className="flex gap-1.5 p-0.5 bg-slate-200 dark:bg-slate-700 rounded-lg">
                                <button onClick={() => setActiveAddQuizTab('manual')}
                                    className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition-all ${activeAddQuizTab === 'manual' ? 'bg-white dark:bg-slate-600 text-slate-800 dark:text-white shadow-xs' : 'text-slate-500 hover:text-slate-750 dark:hover:text-slate-200'}`}>
                                    Nhập thủ công
                                </button>
                                <button onClick={() => setActiveAddQuizTab('json')}
                                    className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition-all ${activeAddQuizTab === 'json' ? 'bg-white dark:bg-slate-600 text-slate-800 dark:text-white shadow-xs' : 'text-slate-500 hover:text-slate-750 dark:hover:text-slate-200'}`}>
                                    Nhập bằng JSON
                                </button>
                            </div>
                        </div>

                        {activeAddQuizTab === 'manual' ? (
                            <div className="space-y-3 animate-fade-in">
                                <div>
                                    <label className="text-[10px] font-bold text-slate-400 uppercase">Câu hỏi (Dùng ______ để điền chỗ trống)</label>
                                    <input value={manualQuizForm.question} onChange={e => setManualQuizForm(f => ({ ...f, question: e.target.value }))} placeholder="Ví dụ: 非常の______、このボタンを押してください。"
                                        className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm dark:text-white outline-none focus:ring-2 focus:ring-indigo-500/25" />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    {manualQuizForm.options.map((opt, oIdx) => (
                                        <div key={oIdx}>
                                            <label className="text-[10px] font-bold text-slate-400 uppercase">Lựa chọn {String.fromCharCode(65 + oIdx)}</label>
                                            <input value={opt} onChange={e => {
                                                const newOpts = [...manualQuizForm.options];
                                                newOpts[oIdx] = e.target.value;
                                                setManualQuizForm(f => ({ ...f, options: newOpts }));
                                            }} placeholder={`Lựa chọn ${oIdx + 1}`}
                                                className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm dark:text-white outline-none focus:ring-2 focus:ring-indigo-500/25" />
                                        </div>
                                    ))}
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Đáp án đúng</label>
                                        <select value={manualQuizForm.answer} onChange={e => setManualQuizForm(f => ({ ...f, answer: e.target.value }))}
                                            className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm dark:text-white outline-none focus:ring-2 focus:ring-indigo-500/25">
                                            <option value="">-- Chọn đáp án đúng --</option>
                                            {manualQuizForm.options.filter(Boolean).map((opt, oIdx) => (
                                                <option key={oIdx} value={opt}>{opt}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Giải thích (Explanation)</label>
                                        <input value={manualQuizForm.explanation} onChange={e => setManualQuizForm(f => ({ ...f, explanation: e.target.value }))} placeholder="Ví dụ: Cách dùng trang trọng của 際"
                                            className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm dark:text-white outline-none focus:ring-2 focus:ring-indigo-500/25" />
                                    </div>
                                </div>
                                <button onClick={handleReviewAddQuizManually} disabled={importingReview}
                                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm">
                                    Thêm câu hỏi Trắc nghiệm
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-2 animate-fade-in">
                                <div className="flex items-center justify-between">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase block">Trắc nghiệm JSON</label>
                                    <button onClick={() => {
                                        setJsonInputQuiz(`[\n  {\n    "question": "非常の______、このボタンを押してください。",\n    "options": ["際", "際に", "とき", "こと"],\n    "answer": "際",\n    "explanation": "Giải thích cấu trúc"\n  }\n]`);
                                    }} className="text-[10px] text-indigo-600 hover:underline">Copy mẫu</button>
                                </div>
                                <textarea value={jsonInputQuiz} onChange={e => setJsonInputQuiz(e.target.value)} rows={5} placeholder='[{"question": "...", "options": ["..."], "answer": "..."}]'
                                    className="w-full font-mono text-[11px] p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl dark:text-white outline-none resize-none focus:ring-2 focus:ring-indigo-500/25" />
                                <button onClick={() => { handleReviewImportJson('quiz'); setShowAddQuizPanel(false); }} disabled={importingReview || !jsonInputQuiz.trim()}
                                    className="w-full py-2 bg-sky-500 hover:bg-sky-600 text-white text-xs font-bold rounded-xl transition-all shadow-sm">
                                    Nhập câu hỏi từ JSON
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {exercises.length === 0 && quizzes.length === 0 ? (
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 text-center shadow-md">
                        <p className="text-slate-500 dark:text-slate-400">Không có bài tập ôn tập cho bài học này. {isAdmin ? 'Sử dụng các nút thêm ở trên để bắt đầu nhập câu hỏi.' : ''}</p>
                    </div>
                ) : (
                    <>
                        {/* TAB SELECTOR */}
                        <div className="flex gap-2 p-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-md">
                            {exercises.length > 0 && (
                                <button onClick={() => setActiveTab('translate')}
                                    className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 ${currentTab === 'translate' ? 'bg-slate-100 dark:bg-slate-800 text-indigo-600 dark:text-white shadow-xs' : 'text-slate-500 hover:text-slate-850 dark:hover:text-slate-200'}`}>
                                    <ClipboardCheck className="w-4 h-4" /> Đặt câu ({exercises.length})
                                </button>
                            )}
                            {quizzes.length > 0 && (
                                <button onClick={() => setActiveTab('quiz')}
                                    className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 ${currentTab === 'quiz' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-xs' : 'text-slate-500 hover:text-slate-850 dark:hover:text-slate-200'}`}>
                                    <Award className="w-4 h-4" /> Trắc nghiệm ({quizzes.length})
                                </button>
                            )}
                        </div>

                        {/* ĐẶT CÂU LAYOUT */}
                        {currentTab === 'translate' && exercises.length > 0 && (
                            <div className="space-y-5">
                                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm">
                                    <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                                        Đọc câu tiếng Việt, dịch sang tiếng Nhật bằng cấu trúc ngữ pháp đã học. Nhấp "AI đánh giá" để xem điểm số và phân tích chi tiết.
                                    </p>
                                </div>

                                <div className="space-y-6">
                                    {exercises.map((ex, idx) => {
                                        const id = ex.id || `ex-${idx}`;
                                        const isEditing = editingReviewItem?.type === 'translate' && editingReviewItem?.index === idx;

                                        if (isEditing) {
                                            return (
                                                <div key={id} className="bg-slate-50 dark:bg-slate-900 border-2 border-indigo-400 dark:border-indigo-600 rounded-2xl p-5 space-y-3 animate-fade-in">
                                                    <h4 className="text-xs font-bold text-indigo-600 uppercase">Sửa câu hỏi {idx + 1}</h4>
                                                    <div>
                                                        <label className="text-[10px] font-bold text-slate-400 uppercase">Câu hỏi tiếng Việt</label>
                                                        <input value={editReviewForm.questionVi} onChange={e => setEditReviewForm(f => ({ ...f, questionVi: e.target.value }))}
                                                            className="w-full px-3 py-2 bg-white dark:bg-slate-800 border rounded-lg text-sm outline-none" />
                                                    </div>
                                                    <div>
                                                        <label className="text-[10px] font-bold text-slate-400 uppercase">Gợi ý (Hint)</label>
                                                        <input value={editReviewForm.hint} onChange={e => setEditReviewForm(f => ({ ...f, hint: e.target.value }))}
                                                            className="w-full px-3 py-2 bg-white dark:bg-slate-800 border rounded-lg text-sm outline-none" />
                                                    </div>
                                                    <div>
                                                        <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Đáp án tiếng Nhật (Mỗi dòng một đáp án)</label>
                                                        <textarea value={editReviewForm.answersRaw} onChange={e => setEditReviewForm(f => ({ ...f, answersRaw: e.target.value }))} rows={3}
                                                            className="w-full px-3 py-2 bg-white dark:bg-slate-800 border rounded-lg text-sm outline-none font-mono" />
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <button onClick={() => saveReviewInlineEdit('translate', idx)} className="px-3.5 py-1.5 bg-indigo-600 text-white text-xs font-bold rounded-lg flex items-center gap-1"><Save className="w-3.5 h-3.5" /> Lưu</button>
                                                        <button onClick={cancelReviewInlineEdit} className="px-3.5 py-1.5 bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs rounded-lg">Huỷ</button>
                                                    </div>
                                                </div>
                                            );
                                        }

                                        const r = translateResults[id];
                                        const ai = aiResults[id];
                                        const isAiLoading = aiLoading[id];
                                        return (
                                            <div key={id} className={`group relative bg-white dark:bg-slate-800 border rounded-2xl p-5 transition-all duration-300 ${r === 'correct' ? 'border-emerald-500 dark:border-emerald-700/50' : r === 'incorrect' ? 'border-red-500 dark:border-red-700/50' : 'border-slate-200 dark:border-slate-700'}`}>
                                                {/* Admin Edit/Delete overlays */}
                                                {isAdmin && (
                                                    <div className="absolute top-4 right-4 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                                        <button onClick={() => startReviewInlineEdit('translate', idx, ex)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500" title="Chỉnh sửa"><Edit2 className="w-3.5 h-3.5" /></button>
                                                        <button onClick={() => deleteReviewQuestion('translate', idx)} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950 text-red-500" title="Xoá"><Trash2 className="w-3.5 h-3.5" /></button>
                                                    </div>
                                                )}

                                                <div className="flex items-center justify-between mb-3">
                                                    <span className="w-8 h-8 flex items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 text-sm font-black">{idx + 1}</span>
                                                    {r === 'correct' && <CheckCircle className="w-5 h-5 text-emerald-500 mr-8" />}
                                                    {r === 'incorrect' && <X className="w-5 h-5 text-red-500 mr-8" />}
                                                </div>

                                                <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Tiếng Việt</p>
                                                <p className="text-base font-bold text-slate-800 dark:text-white mb-1">{ex.questionVi}</p>

                                                {ex.hint && (
                                                    <button onClick={() => setShowTranslateHint(p => ({ ...p, [id]: !p[id] }))} className="flex items-center gap-1 text-xs text-amber-600 font-medium hover:underline mb-2">
                                                        <Lightbulb className="w-3.5 h-3.5" /> {showTranslateHint[id] ? 'Ẩn gợi ý' : 'Hiện gợi ý'}
                                                    </button>
                                                )}
                                                {showTranslateHint[id] && <div className="mb-3 px-3 py-2 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/30 rounded-lg text-xs text-amber-700 font-medium">💡 {ex.hint}</div>}

                                                <p className="text-[10px] font-bold text-slate-400 uppercase mb-1.5">Bản dịch của bạn (日本語)</p>
                                                <input type="text" value={translateAnswers[id] || ''} onChange={e => setTranslateAnswers(p => ({ ...p, [id]: e.target.value }))}
                                                    onKeyDown={e => { if (e.key === 'Enter') handleReviewAiCheck(id); }} placeholder="Gõ bản dịch tiếng Nhật..." disabled={r === 'correct'}
                                                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm dark:text-white outline-none focus:ring-2 focus:ring-indigo-500/20 disabled:opacity-60 font-medium" />

                                                {showTranslateAnswer[id] && (
                                                    <div className="mt-3 px-4 py-3 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800/40 rounded-xl">
                                                        <p className="text-[10px] font-bold text-indigo-500 uppercase mb-1">Đáp án mẫu:</p>
                                                        {ex.answers?.map((a, i) => <p key={i} className="text-sm font-bold text-slate-800 dark:text-white">{a}</p>)}
                                                    </div>
                                                )}

                                                {/* AI feedback */}
                                                {ai && (
                                                    <div className={`mt-3 px-4 py-3.5 rounded-xl border transition-all ${ai.isCorrect ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/40 text-emerald-900 dark:text-emerald-200' : 'bg-amber-50/60 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800/40 text-amber-900 dark:text-amber-200'}`}>
                                                        <div className="flex items-center gap-2 mb-2 pb-1.5 border-b border-slate-200/40 dark:border-slate-700/40">
                                                            <Sparkle className="w-4 h-4 text-indigo-500 animate-pulse" />
                                                            <span className="text-xs font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">AI Đánh Giá Chi Tiết</span>
                                                            <span className={`ml-auto text-sm font-black px-2 py-0.5 rounded-full ${ai.score >= 80 ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300' : ai.score >= 50 ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300' : 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300'}`}>{ai.score}/100</span>
                                                        </div>

                                                        <p className="text-sm font-bold text-slate-800 dark:text-slate-100 mb-1">{ai.feedback}</p>

                                                        {ai.errors && ai.errors.length > 0 && (
                                                            <div className="mt-2.5">
                                                                <p className="text-[10px] font-bold text-red-500 dark:text-red-400 uppercase tracking-wider mb-1">Các lỗi sai phát hiện:</p>
                                                                <ul className="list-disc pl-4 text-xs text-slate-700 dark:text-slate-300 space-y-1">
                                                                    {ai.errors.map((err, i) => <li key={i}>{err}</li>)}
                                                                </ul>
                                                            </div>
                                                        )}

                                                        {ai.correction && (
                                                            <div className="mt-2.5 pt-2 border-t border-slate-200/40 dark:border-slate-700/40">
                                                                <p className="text-[10px] font-bold text-indigo-500 dark:text-indigo-400 uppercase tracking-wider mb-0.5">Bản dịch gợi ý tốt nhất:</p>
                                                                <p className="text-sm font-bold text-slate-800 dark:text-white select-all">{ai.correction}</p>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}

                                                <div className="flex flex-wrap items-center gap-2.5 mt-4">
                                                    <button onClick={() => handleReviewAiCheck(id)} disabled={!translateAnswers[id]?.trim() || isAiLoading}
                                                        className="px-4 py-2 bg-gradient-to-r from-sky-500 to-indigo-500 hover:from-sky-600 hover:to-indigo-600 text-white text-sm font-bold rounded-xl disabled:opacity-40 flex items-center gap-1.5 transition-all">
                                                        {isAiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkle className="w-4 h-4" />} AI đánh giá
                                                    </button>
                                                    <button onClick={() => setShowTranslateAnswer(p => ({ ...p, [id]: true }))}
                                                        className="px-4 py-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 text-sm font-bold rounded-xl hover:bg-slate-50 dark:hover:bg-slate-600 flex items-center gap-1.5 transition-all">
                                                        <Eye className="w-4 h-4" /> Xem đáp án
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* TRẮC NGHIỆM LAYOUT */}
                        {currentTab === 'quiz' && quizzes.length > 0 && (
                            <div className="space-y-5">
                                <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl p-4">
                                    <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                                        Chọn đáp án chính xác để hoàn thành câu dưới đây.
                                    </p>
                                </div>

                                <div className="space-y-6">
                                    {quizzes.map((quiz, qIdx) => {
                                        const isEditing = editingReviewItem?.type === 'quiz' && editingReviewItem?.index === qIdx;

                                        if (isEditing) {
                                            return (
                                                <div key={qIdx} className="bg-slate-50 dark:bg-slate-900 border-2 border-sky-400 dark:border-sky-600 rounded-2xl p-5 space-y-3 animate-fade-in">
                                                    <h4 className="text-xs font-bold text-sky-600 uppercase">Sửa câu hỏi trắc nghiệm {qIdx + 1}</h4>
                                                    <div>
                                                        <label className="text-[10px] font-bold text-slate-400 uppercase">Câu hỏi (Dùng ______ để điền chỗ trống)</label>
                                                        <input value={editReviewForm.question} onChange={e => setEditReviewForm(f => ({ ...f, question: e.target.value }))}
                                                            className="w-full px-3 py-2 bg-white dark:bg-slate-800 border rounded-lg text-sm outline-none" />
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-2">
                                                        {editReviewForm.options.map((opt, oIdx) => (
                                                            <div key={oIdx}>
                                                                <label className="text-[10px] font-bold text-slate-400 uppercase">Lựa chọn {String.fromCharCode(65 + oIdx)}</label>
                                                                <input value={opt} onChange={e => {
                                                                    const newOpts = [...editReviewForm.options];
                                                                    newOpts[oIdx] = e.target.value;
                                                                    setEditReviewForm(f => ({ ...f, options: newOpts }));
                                                                }} className="w-full px-3 py-1.5 bg-white dark:bg-slate-800 border rounded-lg text-sm outline-none" />
                                                            </div>
                                                        ))}
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div>
                                                            <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Đáp án đúng</label>
                                                            <select value={editReviewForm.answer} onChange={e => setEditReviewForm(f => ({ ...f, answer: e.target.value }))}
                                                                className="w-full px-3 py-2 bg-white dark:bg-slate-800 border rounded-lg text-sm outline-none">
                                                                <option value="">-- Chọn đáp án đúng --</option>
                                                                {editReviewForm.options.filter(Boolean).map((opt, oIdx) => (
                                                                    <option key={oIdx} value={opt}>{opt}</option>
                                                                ))}
                                                            </select>
                                                        </div>
                                                        <div>
                                                            <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Giải thích (Explanation)</label>
                                                            <input value={editReviewForm.explanation} onChange={e => setEditReviewForm(f => ({ ...f, explanation: e.target.value }))}
                                                                className="w-full px-3 py-2 bg-white dark:bg-slate-800 border rounded-lg text-sm outline-none" />
                                                        </div>
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <button onClick={() => saveReviewInlineEdit('quiz', qIdx)} className="px-3.5 py-1.5 bg-indigo-600 text-white text-xs font-bold rounded-lg flex items-center gap-1"><Save className="w-3.5 h-3.5" /> Lưu</button>
                                                        <button onClick={cancelReviewInlineEdit} className="px-3.5 py-1.5 bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs rounded-lg">Huỷ</button>
                                                    </div>
                                                </div>
                                            );
                                        }

                                        const selected = quizAnswers[qIdx];
                                        const isAnswered = selected !== undefined;
                                        const isCorrect = selected === quiz.answer;

                                        return (
                                            <div key={qIdx} className={`group relative bg-white dark:bg-slate-800 border rounded-2xl p-5 transition-all duration-300 ${isAnswered ? (isCorrect ? 'border-emerald-500 dark:border-emerald-700/50 shadow-sm' : 'border-red-500 dark:border-red-700/50') : 'border-slate-200 dark:border-slate-700'}`}>
                                                {/* Admin Edit/Delete overlays */}
                                                {isAdmin && (
                                                    <div className="absolute top-4 right-4 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                                        <button onClick={() => startReviewInlineEdit('quiz', qIdx, quiz)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500" title="Chỉnh sửa"><Edit2 className="w-3.5 h-3.5" /></button>
                                                        <button onClick={() => deleteReviewQuestion('quiz', qIdx)} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950 text-red-500" title="Xoá"><Trash2 className="w-3.5 h-3.5" /></button>
                                                    </div>
                                                )}

                                                <div className="flex items-center justify-between mb-3">
                                                    <span className="w-8 h-8 flex items-center justify-center rounded-full bg-sky-100 dark:bg-sky-900/40 text-sky-700 dark:text-sky-300 text-sm font-black">{qIdx + 1}</span>
                                                    {isAnswered && (
                                                        isCorrect ? (
                                                            <span className="text-xs font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 px-2.5 py-1 rounded-lg mr-8">Chính xác</span>
                                                        ) : (
                                                            <span className="text-xs font-bold text-red-600 bg-red-50 dark:bg-red-900/20 px-2.5 py-1 rounded-lg mr-8">Chưa đúng</span>
                                                        )
                                                    )}
                                                </div>

                                                <p className="text-lg font-bold text-slate-800 dark:text-white mb-4 leading-relaxed">{quiz.question}</p>

                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                    {quiz.options.map((opt, optIdx) => {
                                                        const optionLetter = String.fromCharCode(65 + optIdx);
                                                        const isSelectedOpt = selected === opt;
                                                        const isCorrectOpt = quiz.answer === opt;

                                                        let btnClass = "border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 text-slate-700 dark:text-slate-200 cursor-pointer";
                                                        let iconBg = "bg-slate-100 dark:bg-slate-700 text-slate-500";

                                                        if (isAnswered) {
                                                            if (isCorrectOpt) {
                                                                btnClass = "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-300 font-extrabold ring-2 ring-emerald-500/20 cursor-default";
                                                                iconBg = "bg-emerald-500 text-white";
                                                            } else if (isSelectedOpt) {
                                                                btnClass = "border-red-500 bg-red-50 dark:bg-red-950/20 text-red-800 dark:text-red-300 font-extrabold ring-2 ring-red-500/20 cursor-default";
                                                                iconBg = "bg-red-500 text-white";
                                                            } else {
                                                                btnClass = "opacity-50 border-slate-200 dark:border-slate-700 text-slate-400 cursor-default";
                                                            }
                                                        }

                                                        return (
                                                            <div key={optIdx} onClick={() => { if (!isAnswered) handleReviewSelectQuiz(qIdx, opt, quiz); }}
                                                                className={`flex items-center gap-3 p-3.5 border rounded-xl text-left text-sm transition-all duration-200 ${btnClass}`}>
                                                                <span className={`w-6 h-6 flex items-center justify-center rounded-lg text-xs font-black shrink-0 select-none ${iconBg}`}>{optionLetter}</span>
                                                                <span className="font-medium">{opt}</span>
                                                            </div>
                                                        );
                                                    })}
                                                </div>

                                                {quiz.explanation && isAnswered && (
                                                    <div className="mt-4 p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-600 dark:text-slate-400 leading-relaxed animate-fade-in">
                                                        💡 <strong>Giải thích:</strong> {quiz.explanation}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* PROGRESS BAR */}
                        <div className="sticky bottom-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl px-5 py-3 shadow-xl flex items-center justify-between z-10 animate-fade-in">
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                                <span className="text-xs font-bold text-slate-500 shrink-0">Tiến độ</span>
                                <div className="flex-1 h-2 bg-slate-100 dark:bg-slate-750 rounded-full overflow-hidden">
                                    <div className="h-full bg-indigo-650 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                                </div>
                                <span className="text-xs font-bold text-indigo-600 shrink-0">{pct}%</span>
                            </div>
                            <span className="text-xs font-bold text-slate-600 dark:text-slate-300 ml-4">{completedCount} / {totalInTab}</span>
                        </div>
                    </>
                )}
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto space-y-6 animate-fade-in px-4 md:px-0">
            <div>
                <button onClick={() => navigate(`/grammar/textbook/${textbookId}`)} className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline mb-3">
                    <ArrowLeft className="w-3.5 h-3.5" /> Quay lại
                </button>
                <h1 className="text-xl font-bold text-slate-800 dark:text-white">{textbook.title || textbook.titleVi} - {lesson.sectionLabel}</h1>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{lesson.title} • {lesson.meaning}</p>
            </div>

            {isAdmin && (
                <div className="flex flex-wrap gap-2">
                    <button onClick={() => { setShowAdd(true); setShowJsonImport(false); setEditId(null); setForm(EMPTY_FORM); }}
                        className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl transition-colors">
                        <Plus className="w-4 h-4" /> Thêm mẫu ngữ pháp
                    </button>
                    <button onClick={() => { setShowJsonImport(true); setShowAdd(false); setImportError(''); setImportSuccess(''); }}
                        className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-sm font-bold rounded-xl transition-colors border border-slate-200 dark:border-slate-700">
                        <FileJson className="w-4 h-4 text-indigo-500" /> Nhập bằng JSON
                    </button>
                </div>
            )}

            {showAdd && isAdmin && (
                <div className="bg-white dark:bg-slate-800 border border-slate-250 dark:border-slate-700 rounded-3xl p-6 space-y-4 shadow-sm w-full">
                    <h3 className="font-bold text-slate-800 dark:text-white text-lg">{editId ? 'Sửa ngữ pháp' : 'Thêm ngữ pháp'}</h3>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
                        <div>
                            <label className="text-xs font-bold text-slate-500 mb-1 block">Mẫu ngữ pháp</label>
                            <input placeholder="Mẫu (VD: 〜際(に))" value={form.pattern} onChange={e => setForm(f => ({ ...f, pattern: e.target.value }))}
                                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-250 dark:border-slate-700 rounded-xl text-sm dark:text-white outline-none font-bold" />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-500 mb-1 block">Dịch ngữ pháp (Nghĩa ngắn)</label>
                            <input placeholder="Dịch ngữ pháp (VD: Nhân dịp / Khi)" value={form.meaningShort} onChange={e => setForm(f => ({ ...f, meaningShort: e.target.value }))}
                                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-250 dark:border-slate-700 rounded-xl text-sm dark:text-white outline-none" />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-500 mb-1 block">Ý nghĩa ngữ pháp</label>
                            <input placeholder="Ý nghĩa ngữ pháp" value={form.meaning} onChange={e => setForm(f => ({ ...f, meaning: e.target.value }))}
                                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-250 dark:border-slate-700 rounded-xl text-sm dark:text-white outline-none font-bold" />
                        </div>
                    </div>

                    <div>
                        <label className="text-xs font-bold text-slate-500 mb-1 block">Giải thích chi tiết (GIẢI THÍCH)</label>
                        <textarea placeholder="Giải thích chi tiết..." value={form.meaningFull} onChange={e => setForm(f => ({ ...f, meaningFull: e.target.value }))} rows={2}
                            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-250 dark:border-slate-700 rounded-xl text-sm dark:text-white outline-none resize-none" />
                    </div>

                    <div>
                        <label className="text-xs font-bold text-slate-500 mb-1 block">Cấu trúc (dùng + ngăn cách, *đọc highlight): VD: V-た + *際(ni) + N-no</label>
                        <input value={form.structureRaw} onChange={e => setForm(f => ({ ...f, structureRaw: e.target.value }))}
                            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-250 dark:border-slate-700 rounded-xl text-sm dark:text-white outline-none font-mono" />
                    </div>

                    <div>
                        <label className="text-xs font-bold text-slate-500 mb-1 block">Lưu ý (mỗi dòng 1 lưu ý)</label>
                        <textarea value={form.tipsRaw} onChange={e => setForm(f => ({ ...f, tipsRaw: e.target.value }))} rows={3}
                            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-250 dark:border-slate-700 rounded-xl text-sm dark:text-white outline-none resize-none" />
                    </div>

                    <div>
                        <label className="text-xs font-bold text-slate-500 mb-1 block">Ví dụ (dòng lẻ: tiếng Nhật, dòng chẵn: tiếng Việt)</label>
                        <textarea value={form.examplesRaw} onChange={e => setForm(f => ({ ...f, examplesRaw: e.target.value }))} rows={4}
                            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-250 dark:border-slate-700 rounded-xl text-sm dark:text-white outline-none resize-none font-sans" />
                    </div>

                    {/* Zen Visual Grammar Card integrated directly */}
                    <div className="border-t border-slate-200 dark:border-slate-700 pt-6 mt-6 space-y-4 w-full">
                        <h3 className="text-base font-bold text-slate-855 dark:text-white flex items-center gap-2">
                            <Sparkles className="w-5 h-5 text-indigo-500" /> Giao diện trực quan (Zen Visual Grammar)
                        </h3>

                        <div className="grid grid-cols-1 gap-4 bg-slate-50 dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 w-full">

                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Đường dẫn ảnh minh hoạ</label>
                                <input
                                    value={form.visual.image}
                                    onChange={e => setForm(f => ({ ...f, visual: { ...f.visual, image: e.target.value } }))}
                                    placeholder="VD: /images/grammar/ageku_miss.png hoặc URL"
                                    className="w-full px-3 py-2 bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none"
                                />
                            </div>

                            {/* Image Paste/Drop zone */}
                            <div
                                onPaste={handleImagePasteOrDrop}
                                onDrop={handleImagePasteOrDrop}
                                onDragOver={e => e.preventDefault()}
                                className="border border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-4 text-center cursor-pointer hover:bg-slate-100/50 dark:hover:bg-slate-800/40 transition-colors relative"
                            >
                                {uploadingState ? (
                                    <p className="text-xs text-indigo-500 font-bold animate-pulse py-4">Đang tải ảnh lên...</p>
                                ) : (
                                    <div className="space-y-2">
                                        <p className="text-xs text-slate-500 font-bold">Bấm vào đây rồi dán ảnh (Ctrl+V) hoặc kéo thả file để tải lên</p>
                                        {form.visual.image && (
                                            <img src={form.visual.image} alt="preview" className="max-h-24 mx-auto object-contain rounded border border-slate-200 shadow-sm" />
                                        )}
                                    </div>
                                )}
                            </div>

                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Nghĩa tiếng Việt giải thích cho ảnh</label>
                                <textarea
                                    value={form.visual.descriptionVi}
                                    onChange={e => setForm(f => ({ ...f, visual: { ...f.visual, descriptionVi: e.target.value } }))}
                                    placeholder="VD: Sau một hồi chạy thục mạng, cuối cùng tôi lại bị lỡ chuyến xe buýt."
                                    rows={2}
                                    className="w-full px-3 py-2 bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none resize-none"
                                />
                            </div>

                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Câu tiếng Nhật minh hoạ</label>
                                <input
                                    value={form.visual.sentenceJa}
                                    onChange={e => setForm(f => ({ ...f, visual: { ...f.visual, sentenceJa: e.target.value } }))}
                                    placeholder="VD: 必死で走ったあげく、バスに乗り遅れてしまった。"
                                    className="w-full px-3 py-2 bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none font-bold"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-2 pt-2 shrink-0">
                        <button onClick={handleSave} disabled={saving || !form.pattern} className="px-5 py-2.5 bg-indigo-600 text-white text-sm font-bold rounded-xl disabled:opacity-50 flex items-center gap-1.5 shadow-sm transition-all hover:bg-indigo-700"><Save className="w-4 h-4" /> Lưu ngữ pháp</button>
                        <button onClick={() => setShowAdd(false)} className="px-5 py-2.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-sm font-bold rounded-xl transition-all hover:bg-slate-200">Huỷ</button>
                    </div>
                </div>
            )}

            {/* Admin: JSON Import Panel */}
            {showJsonImport && isAdmin && (
                <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 space-y-4 shadow-sm w-full">
                    <div className="flex items-center justify-between">
                        <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                            <FileJson className="w-5 h-5 text-indigo-500" /> Nhập cấu trúc Ngữ pháp hàng loạt từ JSON
                        </h3>
                        <button onClick={() => handleCopySample()} className="flex items-center gap-1 px-3 py-1 bg-slate-100 dark:bg-slate-700 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 text-slate-600 dark:text-slate-300 hover:text-indigo-600 text-xs font-bold rounded-lg transition-all border border-transparent hover:border-indigo-200">
                            {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Clipboard className="w-3.5 h-3.5" />}
                            {copied ? 'Đã sao chép mẫu!' : 'Copy JSON mẫu'}
                        </button>
                    </div>

                    <p className="text-xs text-slate-500 leading-relaxed">
                        Nhập danh sách ngữ pháp cho bài học này. Cấu trúc JSON gồm: <code>pattern</code>, <code>meaningShort</code>, <code>meaningFull</code>, <code>structureRaw</code>, <code>tipsRaw</code>, <code>examplesRaw</code>, và <code>visual</code>.
                    </p>

                    <textarea placeholder="Paste chuỗi JSON ngữ pháp vào đây..." value={jsonText} onChange={e => setJsonText(e.target.value)} rows={8}
                        className="w-full font-mono text-xs px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg dark:text-white outline-none resize-y" />

                    {importError && (
                        <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800/40 rounded-xl text-xs text-red-600 font-medium">
                            <AlertCircle className="w-4 h-4 shrink-0" />
                            <span>{importError}</span>
                        </div>
                    )}

                    {importSuccess && (
                        <div className="flex items-start gap-2 p-3 bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-800/40 rounded-xl text-xs text-emerald-600 font-medium">
                            <Check className="w-4 h-4 shrink-0 text-emerald-500" />
                            <span>{importSuccess}</span>
                        </div>
                    )}

                    <div className="flex gap-2">
                        <button onClick={handleJsonImportSubmit} disabled={saving || !jsonText.trim()} className="px-4 py-2 bg-indigo-600 text-white text-sm font-bold rounded-lg hover:bg-indigo-700 disabled:opacity-50">
                            {saving ? 'Đang nhập...' : 'Nhập ngữ pháp'}
                        </button>
                        <button onClick={() => setShowJsonImport(false)} className="px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-sm rounded-lg hover:bg-slate-200">
                            Huỷ
                        </button>
                    </div>
                </div>
            )}

            {points.length === 0 && <p className="text-center text-slate-400 py-12">Chưa có mẫu ngữ pháp nào. {isAdmin ? 'Nhấn "Thêm mẫu ngữ pháp" hoặc "Nhập bằng JSON" để bắt đầu.' : ''}</p>}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
                {points.map(gp => (
                    <div key={gp.id} className="group relative bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 min-w-0 w-full">
                        <button onClick={() => navigate(`/grammar/detail/${gp.id}?tb=${textbookId}&ls=${lessonId}`)} className="w-full text-left">
                            <h3 className="text-lg font-bold text-slate-800 dark:text-white pr-16 break-all">{gp.pattern}</h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 break-all">{gp.meaningShort}</p>
                        </button>
                        {isAdmin && (
                            <div className="flex gap-2 mt-4 pt-3 border-t border-slate-100 dark:border-slate-700/50">
                                <button onClick={() => navigate(`/grammar/practice/${gp.id}?tb=${textbookId}&ls=${lessonId}&add=translate`)}
                                    className="flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-650 dark:bg-indigo-950/40 dark:text-indigo-400 dark:hover:bg-indigo-950 rounded-lg transition-colors border border-indigo-100 dark:border-indigo-900/40">
                                    <Plus className="w-3 h-3" /> Thêm đặt câu
                                </button>
                                <button onClick={() => navigate(`/grammar/practice/${gp.id}?tb=${textbookId}&ls=${lessonId}&add=quiz`)}
                                    className="flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-650 dark:bg-emerald-950/40 dark:text-emerald-400 dark:hover:bg-emerald-950 rounded-lg transition-colors border border-emerald-100 dark:border-emerald-900/40">
                                    <Plus className="w-3 h-3" /> Thêm trắc nghiệm
                                </button>
                            </div>
                        )}
                        <div className="absolute top-3 right-3 flex items-center gap-1 shrink-0">
                            {isAdmin && (
                                <>
                                    <button onClick={() => handleEdit(gp)} className="p-1.5 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/30 opacity-0 group-hover:opacity-100 transition-all"><Edit2 className="w-3.5 h-3.5 text-indigo-600" /></button>
                                    <button onClick={async () => { if (await window.showConfirm('Xoá?', { type: 'danger' })) deleteGrammarPoint(textbookId, lessonId, gp.id); }} className="p-1.5 rounded-lg hover:bg-red-100 opacity-0 group-hover:opacity-100 transition-all"><Trash2 className="w-3.5 h-3.5 text-red-500" /></button>
                                </>
                            )}
                            <button onClick={() => navigate(`/grammar/practice/${gp.id}?tb=${textbookId}&ls=${lessonId}`)} className="p-1.5 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-200 transition-colors" title="Làm bài tập"><PenTool className="w-4 h-4" /></button>
                            <ChevronRight className="w-4 h-4 text-slate-300" />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default GrammarPointsScreen;

