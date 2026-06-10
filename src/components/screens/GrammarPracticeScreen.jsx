import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle, Eye, Lightbulb, Sparkle, X, Loader2, Award, ClipboardCheck, Save, Trash2, Edit2, FileJson } from 'lucide-react'
import { fetchGrammarPointById, updateGrammarPoint } from '../../utils/grammarService';
import { aiCheckGrammarAnswer } from '../../utils/aiProvider';
import { playCorrectSound, playIncorrectSound, playCompletionFanfare } from '../../utils/soundEffects';

const formatExplanation = (text) => {
    if (!text) return null;
    let textStr = '';
    if (typeof text !== 'string') {
        if (Array.isArray(text)) {
            textStr = text.join('\n');
        } else {
            textStr = String(text);
        }
    } else {
        textStr = text;
    }
    const lines = textStr.split('\n');
    return lines.map((line, index) => {
        const trimmed = line.trim();
        if (!trimmed) return null;

        const isBullet = trimmed.startsWith('-') || trimmed.startsWith('*');
        const content = isBullet ? trimmed.substring(1).trim() : trimmed;

        const parts = content.split(/\*\*/g);
        const parsedElements = parts.map((part, i) => {
            if (i % 2 === 1) {
                return (
                    <strong key={i} className="font-extrabold text-indigo-600 dark:text-indigo-400 bg-indigo-50/80 dark:bg-indigo-900/30 px-1 py-0.5 rounded text-[11px] font-mono mx-0.5">
                        {part}
                    </strong>
                );
            }
            return <span key={i}>{part}</span>;
        });

        if (isBullet) {
            return (
                <div key={index} className="flex items-start gap-1.5 mt-1 ml-1 text-slate-700 dark:text-slate-300">
                    <span className="text-indigo-500 font-bold select-none">•</span>
                    <span className="leading-relaxed text-xs">{parsedElements}</span>
                </div>
            );
        }

        return (
            <p key={index} className="mt-1 text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                {parsedElements}
            </p>
        );
    }).filter(Boolean);
};

const GrammarPracticeScreen = ({ isAdmin, profile = null }) => {
    const { grammarId } = useParams();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [gp, setGp] = useState(null);
    const [loading, setLoading] = useState(true);
    const tb = searchParams.get('tb');
    const ls = searchParams.get('ls');

    // Tab state: 'translate' (Đặt câu) or 'quiz' (Trắc nghiệm)
    const [activeTab, setActiveTab] = useState('translate');

    // Đặt câu states
    const [translateAnswers, setTranslateAnswers] = useState({});
    const [translateResults, setTranslateResults] = useState({});
    const [showTranslateAnswer, setShowTranslateAnswer] = useState({});
    const [showTranslateHint, setShowTranslateHint] = useState({});
    const [aiResults, setAiResults] = useState({});
    const [aiLoading, setAiLoading] = useState({});

    // Trắc nghiệm states
    const [quizAnswers, setQuizAnswers] = useState({}); // { [quizIndex]: selectedOption }

    // Admin states
    const [showImportPanel, setShowImportPanel] = useState(false);
    const [jsonInputTranslate, setJsonInputTranslate] = useState('');
    const [jsonInputQuiz, setJsonInputQuiz] = useState('');
    const [importing, setImporting] = useState(false);

    // Inline edit states
    const [editingItem, setEditingItem] = useState(null); // { type: 'translate' | 'quiz', index: number }
    const [editForm, setEditForm] = useState(null); // stores the copy of item being edited

    const inputRef = useRef(null);

    useEffect(() => {
        (async () => {
            setLoading(true);
            const data = await fetchGrammarPointById(grammarId);
            setGp(data);
            // Choose initial active tab based on what data is available
            if (data) {
                if (data.exercises?.length > 0) {
                    setActiveTab('translate');
                } else if (data.quizzes?.length > 0) {
                    setActiveTab('quiz');
                }
            }
            setLoading(false);
        })();
    }, [grammarId]);

    useEffect(() => {
        if (gp && profile) {
            const userIsAdmin = profile?.email && ['ntrungforwork@gmail.com', 'lynguyennhattrung1706@gmail.com'].includes(profile.email);
            const isLocked = gp.lesson?.isPremium && !userIsAdmin && !profile?.isPremiumUnlocked && !(profile?.unlockedSpecializedPackages || []).includes('grammar_zen');
            if (isLocked) {
                navigate(`/grammar/textbook/${tb || gp.textbookId}`);
            }
        }
    }, [gp, profile, tb, navigate]);

    useEffect(() => {
        if (activeTab === 'translate') {
            inputRef.current?.focus();
        }
    }, [activeTab]);

    if (loading) return <div className="p-8 text-center text-slate-500">Đang tải...</div>;

    const exercises = gp?.exercises || [];
    const quizzes = gp?.quizzes || [];

    const normalizeJa = (s) => s.replace(/\s+/g, '').replace(/[。、！？]/g, '');

    // Đặt câu handles
    const handleAiCheck = async (id) => {
        const ex = exercises.find(e => e.id === id || e.questionVi === id);
        const user = (translateAnswers[id] || '').trim();
        if (!user || !ex) return;
        setAiLoading(p => ({ ...p, [id]: true }));
        try {
            const result = await aiCheckGrammarAnswer(user, ex.questionVi, ex.answers, gp.pattern);
            if (result) {
                setAiResults(p => ({ ...p, [id]: result }));
                if (result.isCorrect) {
                    playCorrectSound();
                    setTranslateResults(p => {
                        const next = { ...p, [id]: 'correct' };
                        const completed = Object.values(next).filter(r => r === 'correct').length;
                        if (completed === exercises.length) {
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

    // Admin: JSON Import to Append
    const handleImportJson = async (type) => {
        setImporting(true);
        const rawJson = type === 'translate' ? jsonInputTranslate : jsonInputQuiz;
        if (!rawJson.trim()) {
            alert("Vui lòng nhập chuỗi JSON!");
            setImporting(false);
            return;
        }

        try {
            const parsed = JSON.parse(rawJson);
            if (!Array.isArray(parsed)) {
                throw new Error("Dữ liệu nhập vào phải là một mảng (Array) các câu hỏi.");
            }

            let updatedExercises = [...exercises];
            let updatedQuizzes = [...quizzes];

            if (type === 'translate') {
                // Validate fields
                parsed.forEach(item => {
                    if (!item.questionVi || !Array.isArray(item.answers)) {
                        throw new Error("Mỗi câu hỏi Đặt câu cần có 'questionVi' và mảng 'answers'.");
                    }
                });
                updatedExercises = [...updatedExercises, ...parsed];
            } else {
                // Validate fields
                parsed.forEach(item => {
                    if (!item.question || !Array.isArray(item.options) || !item.answer) {
                        throw new Error("Mỗi câu hỏi Trắc nghiệm cần có 'question', mảng 'options', và đáp án chính xác 'answer'.");
                    }
                });
                updatedQuizzes = [...updatedQuizzes, ...parsed];
            }

            const success = await updateGrammarPoint(gp.textbookId, gp.lessonId, grammarId, {
                ...gp,
                exercises: updatedExercises,
                quizzes: updatedQuizzes
            });

            if (success) {
                setGp(prev => ({
                    ...prev,
                    exercises: updatedExercises,
                    quizzes: updatedQuizzes
                }));
                alert(`Đã thêm thành công ${parsed.length} câu hỏi!`);
                if (type === 'translate') setJsonInputTranslate('');
                else setJsonInputQuiz('');
                setShowImportPanel(false);
            } else {
                alert("Lỗi khi lưu dữ liệu lên Firestore.");
            }
        } catch (e) {
            alert("Lỗi JSON không hợp lệ: " + e.message);
        }
        setImporting(false);
    };

    // Admin: Inline edit modes
    const startInlineEdit = (type, index, item) => {
        setEditingItem({ type, index });
        if (type === 'translate') {
            setEditForm({
                questionVi: item.questionVi || '',
                hint: item.hint || '',
                answersRaw: (item.answers || []).join('\n')
            });
        } else {
            setEditForm({
                question: item.question || '',
                options: [...(item.options || ['', '', '', ''])],
                answer: item.answer || '',
                explanation: item.explanation || ''
            });
        }
    };

    const cancelInlineEdit = () => {
        setEditingItem(null);
        setEditForm(null);
    };

    const saveInlineEdit = async (type, index) => {
        let updatedExercises = [...exercises];
        let updatedQuizzes = [...quizzes];

        if (type === 'translate') {
            const answers = editForm.answersRaw.split('\n').map(a => a.trim()).filter(Boolean);
            if (!editForm.questionVi.trim()) {
                alert("Câu hỏi tiếng Việt không được để trống!");
                return;
            }
            if (answers.length === 0) {
                alert("Vui lòng nhập ít nhất 1 đáp án!");
                return;
            }
            updatedExercises[index] = {
                ...updatedExercises[index],
                questionVi: editForm.questionVi.trim(),
                hint: editForm.hint.trim(),
                answers
            };
        } else {
            if (!editForm.question.trim()) {
                alert("Câu hỏi không được để trống!");
                return;
            }
            const filledOptions = editForm.options.map(o => o.trim()).filter(Boolean);
            if (filledOptions.length < 2) {
                alert("Vui lòng điền ít nhất 2 lựa chọn!");
                return;
            }
            if (!editForm.answer.trim()) {
                alert("Vui lòng chọn hoặc điền đáp án chính xác!");
                return;
            }
            updatedQuizzes[index] = {
                ...updatedQuizzes[index],
                question: editForm.question.trim(),
                options: filledOptions,
                answer: editForm.answer.trim(),
                explanation: editForm.explanation.trim()
            };
        }

        const success = await updateGrammarPoint(gp.textbookId, gp.lessonId, grammarId, {
            ...gp,
            exercises: updatedExercises,
            quizzes: updatedQuizzes
        });

        if (success) {
            setGp(prev => ({
                ...prev,
                exercises: updatedExercises,
                quizzes: updatedQuizzes
            }));
            setEditingItem(null);
            setEditForm(null);
        } else {
            alert("Lỗi khi lưu dữ liệu.");
        }
    };

    const deleteQuestion = async (type, index) => {
        if (!window.confirm("Bạn có chắc chắn muốn xoá câu hỏi này?")) return;
        let updatedExercises = [...exercises];
        let updatedQuizzes = [...quizzes];

        if (type === 'translate') {
            updatedExercises.splice(index, 1);
        } else {
            updatedQuizzes.splice(index, 1);
        }

        const success = await updateGrammarPoint(gp.textbookId, gp.lessonId, grammarId, {
            ...gp,
            exercises: updatedExercises,
            quizzes: updatedQuizzes
        });

        if (success) {
            setGp(prev => ({
                ...prev,
                exercises: updatedExercises,
                quizzes: updatedQuizzes
            }));
            // Clear current outputs
            setTranslateAnswers({});
            setTranslateResults({});
            setQuizAnswers({});
        } else {
            alert("Lỗi khi xóa dữ liệu.");
        }
    };

    const handleSelectQuiz = (qIdx, opt, quiz) => {
        const isCorrect = opt === quiz.answer;
        if (isCorrect) {
            playCorrectSound();
        } else {
            playIncorrectSound();
        }
        setQuizAnswers(p => {
            const newAnswers = { ...p, [qIdx]: opt };
            const completed = quizzes.filter((q, idx) => {
                const ans = idx === qIdx ? opt : newAnswers[idx];
                return ans === q.answer;
            }).length;
            if (completed === quizzes.length) {
                playCompletionFanfare();
            }
            return newAnswers;
        });
    };

    // Calculate progress based on tab
    let pct = 0;
    let completedCount = 0;
    let totalInTab = 0;

    if (activeTab === 'translate') {
        totalInTab = exercises.length;
        completedCount = Object.values(translateResults).filter(r => r === 'correct').length;
        pct = totalInTab > 0 ? Math.round((completedCount / totalInTab) * 100) : 0;
    } else {
        totalInTab = quizzes.length;
        completedCount = quizzes.filter((q, idx) => quizAnswers[idx] === q.answer).length;
        pct = totalInTab > 0 ? Math.round((completedCount / totalInTab) * 100) : 0;
    }

    return (
        <div className="max-w-3xl mx-auto space-y-5 animate-fade-in">
            <div className="flex items-start justify-between">
                <div>
                    <button onClick={() => navigate(`/grammar/detail/${grammarId}?tb=${tb}&ls=${ls}`)} className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline mb-2">
                        <ArrowLeft className="w-3.5 h-3.5" /> Quay lại mẫu ngữ pháp
                    </button>
                    {gp.textbook && <p className="text-xs text-slate-400 mb-1">{gp.textbook.title || gp.textbook.titleVi} • {gp.lesson?.sectionLabel} {gp.lesson?.title}</p>}
                    <h1 className="text-2xl font-black text-slate-800 dark:text-white">{gp.pattern}</h1>
                    <p className="text-sm text-slate-500">{gp.meaningShort}</p>
                </div>
                {isAdmin && (
                    <button onClick={() => setShowImportPanel(!showImportPanel)}
                        className="flex items-center gap-1.5 px-3 py-2 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950 dark:hover:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 text-xs font-bold rounded-xl transition-all border border-indigo-200 dark:border-indigo-800/80 shadow-sm shrink-0">
                        <FileJson className="w-3.5 h-3.5" /> {showImportPanel ? 'Ẩn ô thêm JSON' : 'Thêm bằng JSON'}
                    </button>
                )}
            </div>

            {/* ADMIN JSON IMPORT PANEL */}
            {isAdmin && showImportPanel && (
                <div className="bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 space-y-4 shadow-sm animate-in fade-in slide-in-from-top duration-200">
                    <div>
                        <h3 className="font-extrabold text-slate-800 dark:text-white flex items-center gap-2 text-sm">
                            ⚙️ Nhập và Thêm câu hỏi bằng JSON (Admin)
                        </h3>
                        <p className="text-[11px] text-slate-500 mt-0.5">Dữ liệu dán vào sẽ được thêm nối tiếp vào danh sách câu hỏi hiện tại.</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <label className="text-[10px] font-bold text-slate-500 uppercase block">Thêm Đặt câu (JSON)</label>
                                <button onClick={() => {
                                    setJsonInputTranslate(`[\n  {\n    "questionVi": "Câu tiếng Việt ở đây",\n    "hint": "Gợi ý",\n    "answers": ["Đáp án tiếng Nhật"]\n  }\n]`);
                                }} className="text-[10px] text-indigo-600 hover:underline">Copy mẫu</button>
                            </div>
                            <textarea value={jsonInputTranslate} onChange={e => setJsonInputTranslate(e.target.value)} rows={6} placeholder='[{"questionVi": "...", "answers": ["..."]}]'
                                className="w-full font-mono text-[11px] p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl dark:text-white outline-none resize-none" />
                            <button onClick={() => handleImportJson('translate')} disabled={importing || !jsonInputTranslate.trim()}
                                className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg disabled:opacity-50">
                                Nhập thêm Đặt câu
                            </button>
                        </div>
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <label className="text-[10px] font-bold text-slate-500 uppercase block">Thêm Trắc nghiệm (JSON)</label>
                                <button onClick={() => {
                                    setJsonInputQuiz(`[\n  {\n    "question": "非常の______、このボタンを押してください。",\n    "options": ["際", "際に", "とき", "こと"],\n    "answer": "際",\n    "explanation": "Giải thích cấu trúc"\n  }\n]`);
                                }} className="text-[10px] text-indigo-600 hover:underline">Copy mẫu</button>
                            </div>
                            <textarea value={jsonInputQuiz} onChange={e => setJsonInputQuiz(e.target.value)} rows={6} placeholder='[{"question": "...", "options": ["..."], "answer": "..."}]'
                                className="w-full font-mono text-[11px] p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl dark:text-white outline-none resize-none" />
                            <button onClick={() => handleImportJson('quiz')} disabled={importing || !jsonInputQuiz.trim()}
                                className="w-full py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-lg disabled:opacity-50">
                                Nhập thêm Trắc nghiệm
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {exercises.length === 0 && quizzes.length === 0 ? (
                <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-8 text-center">
                    <p className="text-slate-500">Không có bài tập cho mẫu ngữ pháp này. {isAdmin ? 'Nhấn "Thêm bằng JSON" ở trên để nhập câu hỏi.' : ''}</p>
                </div>
            ) : (
                <>
                    {/* TAB SELECTOR */}
                    <div className="flex gap-2 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl">
                        {exercises.length > 0 && (
                            <button onClick={() => setActiveTab('translate')}
                                className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 ${activeTab === 'translate' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`}>
                                <ClipboardCheck className="w-4 h-4" /> Đặt câu ({exercises.length})
                            </button>
                        )}
                        {quizzes.length > 0 && (
                            <button onClick={() => setActiveTab('quiz')}
                                className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 ${activeTab === 'quiz' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`}>
                                <Award className="w-4 h-4" /> Trắc nghiệm ({quizzes.length})
                            </button>
                        )}
                    </div>

                    {/* ĐẶT CÂU LAYOUT */}
                    {activeTab === 'translate' && exercises.length > 0 && (
                        <div className="space-y-5">
                            <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl p-4">
                                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                                    Đọc câu tiếng Việt, dịch sang tiếng Nhật bằng cấu trúc ngữ pháp <strong>{gp.pattern}</strong>. Nhấp "AI đánh giá" để xem điểm số và phân tích chi tiết.
                                </p>
                            </div>

                            <div className="space-y-6">
                                {exercises.map((ex, idx) => {
                                    const id = ex.id || `ex-${idx}`;
                                    const isEditing = editingItem?.type === 'translate' && editingItem?.index === idx;

                                    if (isEditing) {
                                        return (
                                            <div key={id} className="bg-slate-50 dark:bg-slate-900 border-2 border-indigo-400 dark:border-indigo-600 rounded-2xl p-5 space-y-3">
                                                <h4 className="text-xs font-bold text-indigo-600 uppercase">Sửa câu hỏi {idx + 1}</h4>
                                                <div>
                                                    <label className="text-[10px] font-bold text-slate-400 uppercase">Câu hỏi tiếng Việt</label>
                                                    <input value={editForm.questionVi} onChange={e => setEditForm(f => ({ ...f, questionVi: e.target.value }))}
                                                        className="w-full px-3 py-2 bg-white dark:bg-slate-800 border rounded-lg text-sm outline-none" />
                                                </div>
                                                <div>
                                                    <label className="text-[10px] font-bold text-slate-400 uppercase">Gợi ý (Hint)</label>
                                                    <input value={editForm.hint} onChange={e => setEditForm(f => ({ ...f, hint: e.target.value }))}
                                                        className="w-full px-3 py-2 bg-white dark:bg-slate-800 border rounded-lg text-sm outline-none" />
                                                </div>
                                                <div>
                                                    <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Đáp án tiếng Nhật (Mỗi dòng một đáp án)</label>
                                                    <textarea value={editForm.answersRaw} onChange={e => setEditForm(f => ({ ...f, answersRaw: e.target.value }))} rows={3}
                                                        className="w-full px-3 py-2 bg-white dark:bg-slate-800 border rounded-lg text-sm outline-none font-mono" />
                                                </div>
                                                <div className="flex gap-2">
                                                    <button onClick={() => saveInlineEdit('translate', idx)} className="px-3.5 py-1.5 bg-indigo-600 text-white text-xs font-bold rounded-lg flex items-center gap-1"><Save className="w-3.5 h-3.5" /> Lưu</button>
                                                    <button onClick={cancelInlineEdit} className="px-3.5 py-1.5 bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs rounded-lg">Huỷ</button>
                                                </div>
                                            </div>
                                        );
                                    }

                                    const r = translateResults[id];
                                    const ai = aiResults[id];
                                    const isAiLoading = aiLoading[id];
                                    return (
                                        <div key={id} className={`group relative bg-white dark:bg-slate-800 border rounded-2xl p-5 transition-all ${r === 'correct' ? 'border-emerald-300 dark:border-emerald-700/50' : r === 'incorrect' ? 'border-red-300 dark:border-red-700/50' : 'border-slate-200 dark:border-slate-700'}`}>
                                            {/* Admin Edit/Delete overlays */}
                                            {isAdmin && (
                                                <div className="absolute top-4 right-4 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button onClick={() => startInlineEdit('translate', idx, ex)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500" title="Chỉnh sửa"><Edit2 className="w-3.5 h-3.5" /></button>
                                                    <button onClick={() => deleteQuestion('translate', idx)} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950 text-red-500" title="Xoá"><Trash2 className="w-3.5 h-3.5" /></button>
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
                                            <input ref={idx === 0 ? inputRef : null} type="text" value={translateAnswers[id] || ''} onChange={e => setTranslateAnswers(p => ({ ...p, [id]: e.target.value }))}
                                                onKeyDown={e => { if (e.key === 'Enter') handleAiCheck(id); }} placeholder="Gõ bản dịch tiếng Nhật..." disabled={r === 'correct'}
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

                                                    {ai.explanation && (
                                                        <div className="mt-2.5">
                                                            <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-0.5">Phân tích chuyên sâu:</p>
                                                            <div className="space-y-0.5">{formatExplanation(ai.explanation)}</div>
                                                        </div>
                                                    )}

                                                    {ai.correction && (
                                                        <div className="mt-2.5 pt-2 border-t border-slate-200/40 dark:border-slate-700/40">
                                                            <p className="text-[10px] font-bold text-indigo-500 dark:text-indigo-400 uppercase tracking-wider mb-0.5">Bản dịch gợi ý tốt nhất:</p>
                                                            <p className="text-sm font-bold text-slate-800 dark:text-white select-all">{ai.correction}</p>
                                                        </div>
                                                    )}

                                                    {ai.grammarUsed === false && (
                                                        <p className="text-xs text-amber-600 dark:text-amber-400 font-semibold mt-2.5 flex items-center gap-1">
                                                            ⚠️ Chưa sử dụng mẫu ngữ pháp: <span className="font-bold underline">{gp.pattern}</span>
                                                        </p>
                                                    )}
                                                </div>
                                            )}

                                            <div className="flex flex-wrap items-center gap-2.5 mt-4">
                                                <button onClick={() => handleAiCheck(id)} disabled={!translateAnswers[id]?.trim() || isAiLoading}
                                                    className="px-4 py-2 bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-white text-sm font-bold rounded-xl disabled:opacity-40 flex items-center gap-1.5">
                                                    {isAiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkle className="w-4 h-4" />} AI đánh giá
                                                </button>
                                                <button onClick={() => setShowTranslateAnswer(p => ({ ...p, [id]: true }))}
                                                    className="px-4 py-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 text-sm font-bold rounded-xl hover:bg-slate-50 flex items-center gap-1.5">
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
                    {activeTab === 'quiz' && quizzes.length > 0 && (
                        <div className="space-y-5">
                            <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl p-4">
                                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                                    Chọn đáp án chính xác để hoàn thành câu dưới đây.
                                </p>
                            </div>

                            <div className="space-y-6">
                                {quizzes.map((quiz, qIdx) => {
                                    const isEditing = editingItem?.type === 'quiz' && editingItem?.index === qIdx;

                                    if (isEditing) {
                                        return (
                                            <div key={qIdx} className="bg-slate-50 dark:bg-slate-900 border-2 border-purple-400 dark:border-purple-600 rounded-2xl p-5 space-y-3">
                                                <h4 className="text-xs font-bold text-purple-600 uppercase">Sửa câu hỏi trắc nghiệm {qIdx + 1}</h4>
                                                <div>
                                                    <label className="text-[10px] font-bold text-slate-400 uppercase">Câu hỏi (Dùng ______ để điền chỗ trống)</label>
                                                    <input value={editForm.question} onChange={e => setEditForm(f => ({ ...f, question: e.target.value }))}
                                                        className="w-full px-3 py-2 bg-white dark:bg-slate-800 border rounded-lg text-sm outline-none" />
                                                </div>
                                                <div className="grid grid-cols-2 gap-2">
                                                    {editForm.options.map((opt, oIdx) => (
                                                        <div key={oIdx}>
                                                            <label className="text-[10px] font-bold text-slate-400 uppercase">Lựa chọn {String.fromCharCode(65 + oIdx)}</label>
                                                            <input value={opt} onChange={e => {
                                                                const newOpts = [...editForm.options];
                                                                newOpts[oIdx] = e.target.value;
                                                                setEditForm(f => ({ ...f, options: newOpts }));
                                                            }} className="w-full px-3 py-1.5 bg-white dark:bg-slate-800 border rounded-lg text-sm outline-none" />
                                                        </div>
                                                    ))}
                                                </div>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div>
                                                        <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Đáp án đúng</label>
                                                        <select value={editForm.answer} onChange={e => setEditForm(f => ({ ...f, answer: e.target.value }))}
                                                            className="w-full px-3 py-2 bg-white dark:bg-slate-800 border rounded-lg text-sm outline-none">
                                                            <option value="">-- Chọn đáp án đúng --</option>
                                                            {editForm.options.filter(Boolean).map((opt, oIdx) => (
                                                                <option key={oIdx} value={opt}>{opt}</option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                    <div>
                                                        <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Giải thích (Explanation)</label>
                                                        <input value={editForm.explanation} onChange={e => setEditForm(f => ({ ...f, explanation: e.target.value }))}
                                                            className="w-full px-3 py-2 bg-white dark:bg-slate-800 border rounded-lg text-sm outline-none" />
                                                    </div>
                                                </div>
                                                <div className="flex gap-2">
                                                    <button onClick={() => saveInlineEdit('quiz', qIdx)} className="px-3.5 py-1.5 bg-indigo-600 text-white text-xs font-bold rounded-lg flex items-center gap-1"><Save className="w-3.5 h-3.5" /> Lưu</button>
                                                    <button onClick={cancelInlineEdit} className="px-3.5 py-1.5 bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs rounded-lg">Huỷ</button>
                                                </div>
                                            </div>
                                        );
                                    }

                                    const selected = quizAnswers[qIdx];
                                    const isAnswered = selected !== undefined;
                                    const isCorrect = selected === quiz.answer;

                                    return (
                                        <div key={qIdx} className={`group relative bg-white dark:bg-slate-800 border rounded-2xl p-5 transition-all ${isAnswered ? (isCorrect ? 'border-emerald-300 dark:border-emerald-700/50 shadow-sm' : 'border-red-300 dark:border-red-700/50') : 'border-slate-200 dark:border-slate-700'}`}>
                                            {/* Admin Edit/Delete overlays */}
                                            {isAdmin && (
                                                <div className="absolute top-4 right-4 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button onClick={() => startInlineEdit('quiz', qIdx, quiz)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500" title="Chỉnh sửa"><Edit2 className="w-3.5 h-3.5" /></button>
                                                    <button onClick={() => deleteQuestion('quiz', qIdx)} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950 text-red-500" title="Xoá"><Trash2 className="w-3.5 h-3.5" /></button>
                                                </div>
                                            )}

                                            <div className="flex items-center justify-between mb-3">
                                                <span className="w-8 h-8 flex items-center justify-center rounded-full bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 text-sm font-black">{qIdx + 1}</span>
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
                                                    const optionLetter = String.fromCharCode(65 + optIdx); // A, B, C, D...
                                                    const isSelectedOpt = selected === opt;
                                                    const isCorrectOpt = quiz.answer === opt;

                                                    let btnClass = "border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 text-slate-700 dark:text-slate-200";
                                                    let iconBg = "bg-slate-100 dark:bg-slate-700 text-slate-500";

                                                    if (isAnswered) {
                                                        if (isCorrectOpt) {
                                                            btnClass = "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-300 font-extrabold ring-2 ring-emerald-500/20";
                                                            iconBg = "bg-emerald-500 text-white";
                                                        } else if (isSelectedOpt) {
                                                            btnClass = "border-red-500 bg-red-50 dark:bg-red-950/20 text-red-800 dark:text-red-300 font-extrabold ring-2 ring-red-500/20";
                                                            iconBg = "bg-red-500 text-white";
                                                        } else {
                                                            btnClass = "opacity-50 border-slate-200 dark:border-slate-700 text-slate-400";
                                                        }
                                                    }

                                                    return (
                                                        <button key={optIdx} onClick={() => { if (!isAnswered) handleSelectQuiz(qIdx, opt, quiz); }} disabled={isAnswered}
                                                            className={`flex items-center gap-3 p-3.5 border rounded-xl text-left text-sm transition-all duration-200 ${btnClass}`}>
                                                            <span className={`w-6 h-6 flex items-center justify-center rounded-lg text-xs font-black shrink-0 ${iconBg}`}>{optionLetter}</span>
                                                            <span className="font-medium">{opt}</span>
                                                        </button>
                                                    );
                                                })}
                                            </div>

                                            {quiz.explanation && isAnswered && (
                                                <div className="mt-4 p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
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
                    <div className="sticky bottom-4 bg-white/95 dark:bg-slate-800/95 backdrop-blur-md border border-slate-200 dark:border-slate-700 rounded-2xl px-5 py-3 shadow-lg flex items-center justify-between">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                            <span className="text-xs font-bold text-slate-500 shrink-0">Tiến độ</span>
                            <div className="flex-1 h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                                <div className="h-full bg-indigo-600 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                            </div>
                            <span className="text-xs font-bold text-indigo-600 shrink-0">{pct}%</span>
                        </div>
                        <span className="text-xs font-bold text-slate-600 dark:text-slate-300 ml-4">{completedCount} / {totalInTab}</span>
                    </div>
                </>
            )}
        </div>
    );
};

export default GrammarPracticeScreen;
