import React, { useState, useEffect, useCallback } from 'react';
import LoadingIndicator from '../ui/LoadingIndicator';
import {
    collection, query, onSnapshot, doc, setDoc, deleteDoc, serverTimestamp, orderBy
} from 'firebase/firestore';
import { db, appId } from '../../config/firebase';
import {
    Plus, Trash2, Edit3, Save, X, ChevronDown, ChevronUp,
    FileText, Headphones, BookOpen, Languages, AlertTriangle,
    CheckCircle, Loader2, Copy, Upload, Eye, ArrowLeft, Award,
    Bold, Underline, Highlighter
} from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { ROUTES } from '../../router';
import { compressImage, fileToBase64 } from '../../utils/image';

const SECTION_TYPES = [
    { value: 'vocabulary', label: 'Từ vựng (文字・語彙)', icon: Languages, color: 'blue' },
    { value: 'grammar', label: 'Ngữ pháp (文法)', icon: BookOpen, color: 'purple' },
    { value: 'kanji', label: 'Hán tự (漢字)', icon: Award, color: 'teal' },
    { value: 'reading', label: 'Đọc hiểu (読解)', icon: FileText, color: 'green' },
    { value: 'listening', label: 'Nghe hiểu (聴解)', icon: Headphones, color: 'orange' },
];

// Helper to map values
const SKILL_LABELS = {
    vocabulary: 'Từ vựng',
    grammar: 'Ngữ pháp',
    kanji: 'Hán tự',
    reading: 'Đọc hiểu',
    listening: 'Nghe hiểu'
};

const EMPTY_QUESTION = {
    question: '', options: ['', '', '', ''], correctAnswer: 0,
    explanation: '', audioUrl: '', passage: '', imageUrl: ''
};

const EMPTY_SECTION = { type: 'vocabulary', title: '', questions: [{ ...EMPTY_QUESTION }] };

const EMPTY_TEST = {
    title: '', level: 'N5', timeLimit: 60,
    isSkillTest: false,
    skillType: 'vocabulary',
    sections: [{ ...EMPTY_SECTION, questions: [{ ...EMPTY_QUESTION }] }]
};

const SAMPLE_FULL_JSON = {
    title: "JLPT N5 - Đề mẫu 1 (Đầy đủ)",
    level: "N5",
    timeLimit: 60,
    isSkillTest: false,
    sections: [
        {
            type: "vocabulary",
            title: "Từ vựng (文字・語彙)",
            questions: [
                {
                    question: "「学校」の読み方は？",
                    options: ["がっこう", "がくこう", "がこう", "がっこ"],
                    correctAnswer: 0,
                    explanation: "学校（がっこう）= trường học"
                }
            ]
        },
        {
            type: "listening",
            title: "Nghe hiểu (聴解)",
            questions: [
                {
                    question: "Nghe và chọn đáp án đúng",
                    audioUrl: "https://example.com/audio.mp3",
                    imageUrl: "https://example.com/image.png",
                    options: ["Đáp án A", "Đáp án B", "Đáp án C", "Đáp án D"],
                    correctAnswer: 1,
                    explanation: "Giải thích..."
                }
            ]
        }
    ]
};

const SAMPLE_SKILL_JSON = {
    title: "Luyện chuyên sâu Nghe hiểu N5 - Bài 1",
    level: "N5",
    timeLimit: 15,
    isSkillTest: true,
    skillType: "listening",
    sections: [
        {
            type: "listening",
            title: "Nghe hiểu (聴解)",
            questions: [
                {
                    question: "Nghe và chọn đáp án đúng",
                    audioUrl: "https://example.com/audio.mp3",
                    imageUrl: "https://example.com/image.png",
                    options: ["Đáp án A", "Đáp án B", "Đáp án C", "Đáp án D"],
                    correctAnswer: 1,
                    explanation: "Giải thích..."
                }
            ]
        }
    ]
};

const JLPTAdminScreen = ({ userId }) => {
    const location = useLocation();
    const [tests, setTests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editingTest, setEditingTest] = useState(null);
    const [formData, setFormData] = useState({ ...EMPTY_TEST });
    const [saving, setSaving] = useState(false);
    const [notification, setNotification] = useState(null);
    const [expandedSections, setExpandedSections] = useState({});
    const [showJsonImport, setShowJsonImport] = useState(false);
    const [jsonInput, setJsonInput] = useState('');
    const [confirmDelete, setConfirmDelete] = useState(null);
    const [importType, setImportType] = useState('full');
    const [importSkillType, setImportSkillType] = useState('vocabulary');

    const testsPath = `artifacts/${appId}/jlptTests`;

    // Load tests
    useEffect(() => {
        if (!db) return;
        const q = query(collection(db, testsPath), orderBy('createdAt', 'desc'));
        const unsub = onSnapshot(q, (snap) => {
            setTests(snap.docs.map(d => ({ id: d.id, ...d.data() })));
            setLoading(false);
        });
        return () => unsub();
    }, [testsPath]);

    // Notification auto-clear
    useEffect(() => {
        if (notification) {
            const t = setTimeout(() => setNotification(null), 3000);
            return () => clearTimeout(t);
        }
    }, [notification]);

    const notify = (type, message) => setNotification({ type, message });

    // Handle type change (Full vs Skill)
    const handleTestTypeChange = (isSkill) => {
        const sections = isSkill 
            ? [{ type: formData.skillType, title: SKILL_LABELS[formData.skillType], questions: [{ ...EMPTY_QUESTION }] }]
            : [{ ...EMPTY_SECTION, type: 'vocabulary', title: 'Từ vựng (文字・語彙)', questions: [{ ...EMPTY_QUESTION }] }];
        setFormData({
            ...formData,
            isSkillTest: isSkill,
            sections
        });
    };

    const handleSkillTypeChange = (skill) => {
        const sections = [{ type: skill, title: SKILL_LABELS[skill], questions: [{ ...EMPTY_QUESTION }] }];
        setFormData({
            ...formData,
            skillType: skill,
            sections
        });
    };

    // Save test
    const handleSave = async () => {
        if (!formData.title.trim()) { notify('error', 'Vui lòng nhập tên đề thi'); return; }
        if (formData.sections.length === 0) { notify('error', 'Cần ít nhất 1 phần thi'); return; }

        // Validate all sections & questions
        for (let sIdx = 0; sIdx < formData.sections.length; sIdx++) {
            const sec = formData.sections[sIdx];
            if (!sec.title.trim()) { notify('error', `Phần ${sIdx + 1} cần có tiêu đề`); return; }
            for (let qIdx = 0; qIdx < sec.questions.length; qIdx++) {
                const q = sec.questions[qIdx];
                if (!q.question.trim()) { notify('error', `Phần "${sec.title}" - Câu ${qIdx + 1} chưa nhập nội dung câu hỏi`); return; }
                if (q.options.some(o => !o.trim())) { notify('error', `Phần "${sec.title}" - Câu ${qIdx + 1} có đáp án trống`); return; }
            }
        }

        setSaving(true);
        try {
            const testId = editingTest?.id || `test_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
            const testData = {
                ...formData,
                isSkillTest: !!formData.isSkillTest,
                skillType: formData.isSkillTest ? formData.skillType : '',
                updatedAt: serverTimestamp(),
                updatedBy: userId || 'admin',
            };
            if (!editingTest) {
                testData.createdAt = serverTimestamp();
                testData.createdBy = userId || 'admin';
            } else {
                testData.createdAt = editingTest.createdAt || serverTimestamp();
                testData.createdBy = editingTest.createdBy || 'admin';
            }
            await setDoc(doc(db, testsPath, testId), testData);
            notify('success', editingTest ? 'Cập nhật đề thi thành công!' : 'Tạo đề thi mới thành công!');
            resetForm();
        } catch (e) {
            console.error(e);
            notify('error', 'Lỗi: ' + e.message);
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!confirmDelete) return;
        try {
            await deleteDoc(doc(db, testsPath, confirmDelete.id));
            notify('success', 'Đã xóa đề thi thành công');
            if (editingTest?.id === confirmDelete.id) resetForm();
        } catch (e) {
            notify('error', 'Lỗi: ' + e.message);
        } finally {
            setConfirmDelete(null);
        }
    };

    const resetForm = () => {
        setEditingTest(null);
        setFormData(JSON.parse(JSON.stringify(EMPTY_TEST)));
        setExpandedSections({});
    };

    const handleEdit = (test) => {
        setEditingTest(test);
        setFormData({
            title: test.title || '',
            level: test.level || 'N5',
            timeLimit: test.timeLimit || 60,
            isSkillTest: !!test.isSkillTest,
            skillType: test.skillType || 'vocabulary',
            sections: test.sections || [],
        });
        setExpandedSections({ 0: true });
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    useEffect(() => {
        if (location.state?.editTest) {
            handleEdit(location.state.editTest);
            // Clear the history state to prevent re-entering edit mode on refresh
            window.history.replaceState({}, document.title);
        }
    }, [location.state]);

    const handleJsonImport = () => {
        try {
            const parsed = JSON.parse(jsonInput);
            if (!parsed.title || !parsed.sections) throw new Error('JSON thiếu trường title hoặc sections bắt buộc.');
            
            const isSkill = importType === 'skill';
            const skillType = isSkill ? importSkillType : '';

            setFormData({
                title: parsed.title || '',
                level: parsed.level || 'N5',
                timeLimit: parsed.timeLimit || 60,
                isSkillTest: isSkill,
                skillType: skillType,
                sections: parsed.sections.map(s => ({
                    type: isSkill ? skillType : (s.type || 'vocabulary'),
                    title: isSkill ? (SKILL_LABELS[skillType] || s.title) : (s.title || ''),
                    questions: (s.questions || []).map(q => ({
                        question: q.question || '',
                        options: q.options || ['', '', '', ''],
                        correctAnswer: q.correctAnswer ?? 0,
                        explanation: q.explanation || '',
                        audioUrl: q.audioUrl || '',
                        passage: q.passage || '',
                        imageUrl: q.imageUrl || '',
                    }))
                }))
            });
            setShowJsonImport(false);
            setJsonInput('');
            notify('success', 'Đã nhập dữ liệu JSON thành công!');
        } catch (e) {
            notify('error', 'JSON không hợp lệ: ' + e.message);
        }
    };

    // Section/Question modifiers
    const updateSection = (si, field, value) => {
        const s = [...formData.sections];
        s[si] = { ...s[si], [field]: value };
        setFormData({ ...formData, sections: s });
    };

    const addSection = () => {
        const newSections = [...formData.sections, JSON.parse(JSON.stringify(EMPTY_SECTION))];
        setFormData({ ...formData, sections: newSections });
        setExpandedSections({ ...expandedSections, [newSections.length - 1]: true });
    };

    const removeSection = (si) => {
        setFormData({ ...formData, sections: formData.sections.filter((_, i) => i !== si) });
    };

    const updateQuestion = (si, qi, field, value) => {
        const s = [...formData.sections];
        const qs = [...s[si].questions];
        qs[qi] = { ...qs[qi], [field]: value };
        s[si] = { ...s[si], questions: qs };
        setFormData({ ...formData, sections: s });
    };

    const updateOption = (si, qi, oi, value) => {
        const s = [...formData.sections];
        const qs = [...s[si].questions];
        const opts = [...qs[qi].options];
        opts[oi] = value;
        qs[qi] = { ...qs[qi], options: opts };
        s[si] = { ...s[si], questions: qs };
        setFormData({ ...formData, sections: s });
    };

    const addQuestion = (si) => {
        const s = [...formData.sections];
        s[si] = { ...s[si], questions: [...s[si].questions, { ...EMPTY_QUESTION }] };
        setFormData({ ...formData, sections: s });
    };

    const removeQuestion = (si, qi) => {
        const s = [...formData.sections];
        s[si] = { ...s[si], questions: s[si].questions.filter((_, i) => i !== qi) };
        setFormData({ ...formData, sections: s });
    };

    const insertFormatTag = (sectionIdx, questionIdx, field, tag) => {
        const id = `textarea-${sectionIdx}-${questionIdx}-${field}`;
        const textarea = document.getElementById(id);
        if (!textarea) return;

        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const text = textarea.value;
        const selectedText = text.substring(start, end);
        
        let replacement = '';
        if (tag === 'b') {
            replacement = `<b>${selectedText || 'chữ in đậm'}</b>`;
        } else if (tag === 'u') {
            replacement = `<u>${selectedText || 'chữ gạch chân'}</u>`;
        } else if (tag === 'mark') {
            replacement = `<mark>${selectedText || 'chữ highlight'}</mark>`;
        }

        const newText = text.substring(0, start) + replacement + text.substring(end);
        
        updateQuestion(sectionIdx, questionIdx, field, newText);

        setTimeout(() => {
            textarea.focus();
            const offset = tag === 'b' || tag === 'u' ? 3 : 6; 
            textarea.setSelectionRange(start + offset, start + offset + selectedText.length);
        }, 0);
    };

    const handleAudioUpload = async (si, qi, file) => {
        if (!file) return;
        try {
            const base64Audio = await fileToBase64(file);
            updateQuestion(si, qi, 'audioUrl', base64Audio);
            notify('success', 'Đã tải lên audio thành công!');
        } catch (error) {
            console.error('Audio upload error:', error);
            notify('error', 'Lỗi tải audio: ' + error.message);
        }
    };

    const handleImageUpload = async (si, qi, file) => {
        if (!file) return;
        try {
            const base64Image = await compressImage(file);
            updateQuestion(si, qi, 'imageUrl', base64Image);
            notify('success', 'Đã tải lên hình ảnh thành công!');
        } catch (error) {
            console.error('Image upload error:', error);
            notify('error', 'Lỗi tải hình ảnh: ' + error.message);
        }
    };

    const toggleSection = (i) => setExpandedSections(p => ({ ...p, [i]: !p[i] }));

    const totalQuestions = formData.sections.reduce((sum, s) => sum + (s.questions?.length || 0), 0);

    const getSectionMeta = (type) => SECTION_TYPES.find(s => s.value === type) || SECTION_TYPES[0];

    // Render
    if (loading) {
        return <LoadingIndicator text="Đang tải dữ liệu cấu hình..." />;
    }

    return (
        <div className="jlpt-screen min-h-screen bg-[#FAFBFD] dark:bg-slate-900 p-4 md:p-8 font-sans">
            <div className="max-w-6xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <Link to={ROUTES.JLPT_TEST} className="p-2.5 flex items-center justify-center rounded-xl bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-300 shadow-md border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700 transition-all hover:scale-105">
                            <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                        </Link>
                        <div>
                            <h1 className="text-2xl font-extrabold text-slate-800 dark:text-white tracking-tight flex items-center gap-2">
                                <FileText className="w-6 h-6 text-[#2E5B70]" />
                                Quản lý đề thi & luyện tập JLPT
                            </h1>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Cấu hình đề thi thử đầy đủ hoặc bài luyện tập chuyên sâu cho từng kỹ năng</p>
                        </div>
                    </div>
                    <div className="flex gap-2.5">
                        <button onClick={() => setShowJsonImport(true)}
                            className="px-4 py-2 text-xs font-bold bg-[#2E5B70] text-white rounded-xl hover:bg-[#254A5C] transition flex items-center gap-1.5 shadow-sm cursor-pointer">
                            <Upload className="w-4 h-4" /> Nhập JSON
                        </button>
                        <button onClick={() => { 
                            const sample = formData.isSkillTest ? SAMPLE_SKILL_JSON : SAMPLE_FULL_JSON;
                            navigator.clipboard.writeText(JSON.stringify(sample, null, 2)); 
                            notify('success', 'Đã copy JSON mẫu vào Clipboard!'); 
                        }}
                            className="px-4 py-2 text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl transition flex items-center gap-1.5 cursor-pointer">
                            <Copy className="w-4 h-4" /> Copy JSON mẫu
                        </button>
                    </div>
                </div>

                {/* Form nhập liệu */}
                <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700/50 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] overflow-hidden">
                    <div className="p-5 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50">
                        <h2 className="font-extrabold text-slate-800 dark:text-white text-base">
                            {editingTest ? '✏️ Chỉnh sửa đề thi / bài luyện' : '➕ Thêm đề thi hoặc bài luyện mới'}
                        </h2>
                    </div>
                    
                    <div className="p-6 space-y-6">
                        {/* Cấu hình loại đề */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 dark:bg-slate-900/30 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Loại đề ôn tập</label>
                                <div className="flex gap-3">
                                    <button
                                        type="button"
                                        onClick={() => handleTestTypeChange(false)}
                                        className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all border ${!formData.isSkillTest 
                                            ? 'bg-white dark:bg-slate-800 text-[#2E5B70] dark:text-sky-400 border-slate-200 dark:border-slate-700 shadow-sm' 
                                            : 'bg-transparent text-slate-400 border-transparent hover:text-slate-600'}`}
                                    >
                                        Đề thi thử đầy đủ (Full Test)
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleTestTypeChange(true)}
                                        className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all border ${formData.isSkillTest 
                                            ? 'bg-white dark:bg-slate-800 text-[#2E5B70] dark:text-sky-400 border-slate-200 dark:border-slate-700 shadow-sm' 
                                            : 'bg-transparent text-slate-400 border-transparent hover:text-slate-600'}`}
                                    >
                                        Luyện chuyên sâu 1 kỹ năng
                                    </button>
                                </div>
                            </div>
                            
                            {formData.isSkillTest && (
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Chọn kỹ năng luyện tập</label>
                                    <select 
                                        value={formData.skillType} 
                                        onChange={e => handleSkillTypeChange(e.target.value)}
                                        className="w-full px-3 py-2.5 text-xs font-bold border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-[#2E5B70]/10"
                                    >
                                        {Object.entries(SKILL_LABELS).map(([val, label]) => (
                                            <option key={val} value={val}>{label}</option>
                                        ))}
                                    </select>
                                </div>
                            )}
                        </div>

                        {/* Thông tin cơ bản */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Tên đề thi / bài luyện</label>
                                <input type="text" value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })}
                                    placeholder="VD: Đề thi thử JLPT N2 - Đề số 1" className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-900/40 text-slate-800 dark:text-white focus:ring-2 focus:ring-[#2E5B70]/20 outline-none" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Cấp độ (JLPT Level)</label>
                                <select value={formData.level} onChange={e => setFormData({ ...formData, level: e.target.value })}
                                    className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-900/40 text-slate-800 dark:text-white focus:ring-2 focus:ring-[#2E5B70]/20 outline-none">
                                    {['N5', 'N4', 'N3', 'N2', 'N1'].map(l => <option key={l} value={l}>{l}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Thời gian làm bài (Phút)</label>
                                <input type="number" value={formData.timeLimit} onChange={e => setFormData({ ...formData, timeLimit: Number(e.target.value) })}
                                    min={5} max={300} className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-900/40 text-slate-800 dark:text-white focus:ring-2 focus:ring-[#2E5B70]/20 outline-none" />
                            </div>
                        </div>

                        {/* Quản lý các phần thi */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-2">
                                <h3 className="text-sm font-bold text-slate-800 dark:text-white">
                                    Cấu trúc đề thi ({formData.sections.length} phần) • Tổng số: {totalQuestions} câu hỏi
                                </h3>
                                {!formData.isSkillTest && (
                                    <button onClick={addSection} className="px-3.5 py-1.5 text-xs font-bold bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/30 dark:hover:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-xl transition flex items-center gap-1.5 cursor-pointer">
                                        <Plus className="w-3.5 h-3.5" /> Thêm phần thi
                                    </button>
                                )}
                            </div>

                            <div className="space-y-4">
                                {formData.sections.map((section, si) => {
                                    const meta = getSectionMeta(section.type);
                                    const Icon = meta.icon || FileText;
                                    const isExpanded = expandedSections[si] !== false; // Default expanded

                                    return (
                                        <div key={si} className="border border-slate-100 dark:border-slate-700 rounded-2xl overflow-hidden shadow-sm bg-white dark:bg-slate-800">
                                            {/* Header phần */}
                                            <div className="flex items-center justify-between p-4 bg-slate-50/70 dark:bg-slate-900/20 cursor-pointer border-b border-slate-100 dark:border-slate-700/50"
                                                onClick={() => toggleSection(si)}>
                                                <div className="flex items-center gap-2.5">
                                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center bg-${meta.color}-50 dark:bg-${meta.color}-950/20 text-${meta.color}-600`}>
                                                        <Icon className="w-4 h-4" />
                                                    </div>
                                                    <div>
                                                        <span className="font-extrabold text-slate-800 dark:text-white text-xs block">
                                                            PHẦN {si + 1}: {section.title || SKILL_LABELS[section.type] || section.type}
                                                        </span>
                                                        <span className="text-[10px] text-slate-400 font-semibold">{section.questions.length} câu hỏi • Thể loại: {SKILL_LABELS[section.type] || section.type}</span>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
                                                    {!formData.isSkillTest && formData.sections.length > 1 && (
                                                        <button onClick={() => removeSection(si)}
                                                            className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition cursor-pointer">
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                    <button onClick={() => toggleSection(si)} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg transition cursor-pointer">
                                                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                                    </button>
                                                </div>
                                            </div>

                                            {isExpanded && (
                                                <div className="p-5 space-y-5 bg-white dark:bg-slate-800">
                                                    {/* Loại phần thi (chỉ cho phép sửa nếu không phải là đề luyện kỹ năng chuyên biệt) */}
                                                    {!formData.isSkillTest && (
                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                            <div>
                                                                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Loại kỹ năng</label>
                                                                <select value={section.type} onChange={e => { updateSection(si, 'type', e.target.value); updateSection(si, 'title', SKILL_LABELS[e.target.value]); }}
                                                                    className="w-full px-2.5 py-2 text-xs border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-900/40 text-slate-800 dark:text-white outline-none">
                                                                    {SECTION_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                                                                </select>
                                                            </div>
                                                            <div>
                                                                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Tiêu đề hiển thị</label>
                                                                <input type="text" value={section.title} onChange={e => updateSection(si, 'title', e.target.value)}
                                                                    placeholder="VD: Từ vựng - Moji Goi" className="w-full px-2.5 py-2 text-xs border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-900/40 text-slate-800 dark:text-white outline-none" />
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Câu hỏi con */}
                                                    <div className="space-y-4 pt-2">
                                                        {section.questions.map((q, qi) => (
                                                            <div key={qi} className="p-4 bg-slate-50 dark:bg-slate-900/20 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-4">
                                                                <div className="flex items-center justify-between">
                                                                    <span className="text-xs font-extrabold text-slate-700 dark:text-slate-300">Câu hỏi số {qi + 1}</span>
                                                                    {section.questions.length > 1 && (
                                                                        <button onClick={() => removeQuestion(si, qi)} className="p-1 text-slate-400 hover:text-red-500 transition cursor-pointer">
                                                                            <X className="w-4 h-4" />
                                                                        </button>
                                                                    )}
                                                                </div>
                                                                <div>
                                                                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center justify-between">
                                                                        <span>Đề bài / Câu hỏi</span>
                                                                        <div className="flex gap-1.5 bg-slate-100 dark:bg-slate-700/50 px-1.5 py-0.5 rounded-lg border border-slate-200 dark:border-slate-600">
                                                                            <button type="button" onClick={() => insertFormatTag(si, qi, 'question', 'b')} title="In đậm (Bold)" className="p-0.5 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 rounded cursor-pointer"><Bold className="w-3.5 h-3.5" /></button>
                                                                            <button type="button" onClick={() => insertFormatTag(si, qi, 'question', 'u')} title="Gạch chân (Underline)" className="p-0.5 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 rounded cursor-pointer"><Underline className="w-3.5 h-3.5" /></button>
                                                                            <button type="button" onClick={() => insertFormatTag(si, qi, 'question', 'mark')} title="Tô sáng (Highlight)" className="p-0.5 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 rounded cursor-pointer"><Highlighter className="w-3.5 h-3.5" /></button>
                                                                        </div>
                                                                    </label>
                                                                    <textarea id={`textarea-${si}-${qi}-question`} value={q.question} onChange={e => updateQuestion(si, qi, 'question', e.target.value)}
                                                                        placeholder="Nhập nội dung câu hỏi..." rows={2}
                                                                        className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-800 dark:text-white outline-none resize-none font-japanese" />
                                                                </div>

                                                                {/* Đoạn văn cho Đọc hiểu */}
                                                                {(section.type === 'reading' || formData.skillType === 'reading') && (
                                                                    <div>
                                                                        <label className="block text-[10px] font-bold text-slate-450 uppercase tracking-wider mb-1 flex items-center justify-between">
                                                                            <span>Đoạn văn đọc hiểu (Nếu có)</span>
                                                                            <div className="flex gap-1.5 bg-slate-100 dark:bg-slate-700/50 px-1.5 py-0.5 rounded-lg border border-slate-200 dark:border-slate-600">
                                                                                <button type="button" onClick={() => insertFormatTag(si, qi, 'passage', 'b')} title="In đậm (Bold)" className="p-0.5 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 rounded cursor-pointer"><Bold className="w-3.5 h-3.5" /></button>
                                                                                <button type="button" onClick={() => insertFormatTag(si, qi, 'passage', 'u')} title="Gạch chân (Underline)" className="p-0.5 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 rounded cursor-pointer"><Underline className="w-3.5 h-3.5" /></button>
                                                                                <button type="button" onClick={() => insertFormatTag(si, qi, 'passage', 'mark')} title="Tô sáng (Highlight)" className="p-0.5 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 rounded cursor-pointer"><Highlighter className="w-3.5 h-3.5" /></button>
                                                                            </div>
                                                                        </label>
                                                                        <textarea id={`textarea-${si}-${qi}-passage`} value={q.passage || ''} onChange={e => updateQuestion(si, qi, 'passage', e.target.value)}
                                                                            placeholder="Nhập đoạn văn bản tiếng Nhật..." rows={4}
                                                                            className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-800 dark:text-white outline-none resize-none font-japanese leading-relaxed" />
                                                                    </div>
                                                                )}

                                                                {/* File Audio và Hình ảnh cho Nghe hiểu */}
                                                                {(section.type === 'listening' || formData.skillType === 'listening') && (
                                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-orange-50/20 dark:bg-orange-950/5 p-3 rounded-2xl border border-orange-100 dark:border-orange-900/50">
                                                                        {/* Audio Upload/URL Section */}
                                                                        <div className="space-y-2">
                                                                            <label className="block text-[10px] font-bold text-orange-600 dark:text-orange-400 uppercase tracking-wider">File âm thanh (Audio)</label>
                                                                            <div className="flex gap-2">
                                                                                <input 
                                                                                    type="text" 
                                                                                    value={q.audioUrl && q.audioUrl.startsWith('data:') ? 'Đã tải lên file Audio' : (q.audioUrl || '')} 
                                                                                    onChange={e => updateQuestion(si, qi, 'audioUrl', e.target.value)}
                                                                                    disabled={q.audioUrl && q.audioUrl.startsWith('data:')}
                                                                                    placeholder="Nhập đường dẫn hoặc tải lên..." 
                                                                                    className="flex-1 px-3 py-1.5 text-xs border border-orange-200 dark:border-orange-800 rounded-xl bg-white dark:bg-slate-800 text-slate-800 dark:text-white outline-none" 
                                                                                />
                                                                                <label className="px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-bold transition flex items-center justify-center cursor-pointer shrink-0 select-none">
                                                                                    Tải lên
                                                                                    <input 
                                                                                        type="file" 
                                                                                        accept="audio/*" 
                                                                                        onChange={e => handleAudioUpload(si, qi, e.target.files[0])} 
                                                                                        className="hidden" 
                                                                                    />
                                                                                </label>
                                                                            </div>
                                                                            {q.audioUrl && (
                                                                                <div className="flex items-center justify-between bg-white dark:bg-slate-800 p-2 rounded-xl border border-orange-100 dark:border-orange-900/30">
                                                                                    <audio src={q.audioUrl} controls className="h-6 max-w-full text-xs" />
                                                                                    <button 
                                                                                        type="button" 
                                                                                        onClick={() => updateQuestion(si, qi, 'audioUrl', '')} 
                                                                                        className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition"
                                                                                    >
                                                                                        <Trash2 className="w-3.5 h-3.5" />
                                                                                    </button>
                                                                                </div>
                                                                            )}
                                                                        </div>

                                                                        {/* Image Upload/URL Section */}
                                                                        <div className="space-y-2">
                                                                            <label className="block text-[10px] font-bold text-orange-600 dark:text-orange-400 uppercase tracking-wider">Hình ảnh câu hỏi (Image)</label>
                                                                            <div className="flex gap-2">
                                                                                <input 
                                                                                    type="text" 
                                                                                    value={q.imageUrl && q.imageUrl.startsWith('data:') ? 'Đã tải lên file ảnh' : (q.imageUrl || '')} 
                                                                                    onChange={e => updateQuestion(si, qi, 'imageUrl', e.target.value)}
                                                                                    disabled={q.imageUrl && q.imageUrl.startsWith('data:')}
                                                                                    placeholder="Nhập đường dẫn hoặc tải lên..." 
                                                                                    className="flex-1 px-3 py-1.5 text-xs border border-orange-200 dark:border-orange-800 rounded-xl bg-white dark:bg-slate-800 text-slate-800 dark:text-white outline-none" 
                                                                                />
                                                                                <label className="px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-bold transition flex items-center justify-center cursor-pointer shrink-0 select-none">
                                                                                    Tải lên
                                                                                    <input 
                                                                                        type="file" 
                                                                                        accept="image/*" 
                                                                                        onChange={e => handleImageUpload(si, qi, e.target.files[0])} 
                                                                                        className="hidden" 
                                                                                    />
                                                                                </label>
                                                                            </div>
                                                                            {q.imageUrl && (
                                                                                <div className="flex items-center justify-between bg-white dark:bg-slate-800 p-2 rounded-xl border border-orange-100 dark:border-orange-900/30">
                                                                                    <div className="h-10 w-16 rounded overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900">
                                                                                        <img src={q.imageUrl} alt="Preview" className="h-full w-full object-contain" />
                                                                                    </div>
                                                                                    <button 
                                                                                        type="button" 
                                                                                        onClick={() => updateQuestion(si, qi, 'imageUrl', '')} 
                                                                                        className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition"
                                                                                    >
                                                                                        <Trash2 className="w-3.5 h-3.5" />
                                                                                    </button>
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                )}


                                                                {/* Các phương án lựa chọn */}
                                                                <div>
                                                                    <label className="block text-[10px] font-bold text-slate-450 uppercase tracking-wider mb-2">Các phương án trả lời & Tích chọn đáp án đúng</label>
                                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                                        {q.options.map((opt, oi) => (
                                                                            <div key={oi} className="flex items-center gap-2">
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={() => updateQuestion(si, qi, 'correctAnswer', oi)}
                                                                                    className={`w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-extrabold transition-all cursor-pointer ${q.correctAnswer === oi
                                                                                        ? 'bg-green-500 text-white ring-2 ring-green-150'
                                                                                        : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-300'
                                                                                        }`}
                                                                                >
                                                                                    {String.fromCharCode(65 + oi)}
                                                                                </button>
                                                                                <input type="text" value={opt} onChange={e => updateOption(si, qi, oi, e.target.value)}
                                                                                    placeholder={`Phương án ${String.fromCharCode(65 + oi)}`}
                                                                                    className="flex-1 px-3 py-1.5 text-xs border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-800 dark:text-white outline-none font-japanese" />
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                </div>

                                                                {/* Giải thích câu hỏi */}
                                                                <div>
                                                                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Giải thích chi tiết (Dành cho phần xem lại đề)</label>
                                                                    <input type="text" value={q.explanation || ''} onChange={e => updateQuestion(si, qi, 'explanation', e.target.value)}
                                                                        placeholder="Giải thích ngữ pháp hoặc dịch từ vựng..."
                                                                        className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-800 dark:text-white outline-none" />
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>

                                                    <button onClick={() => addQuestion(si)}
                                                        className="w-full py-2.5 text-xs font-bold text-[#2E5B70] dark:text-sky-400 border-2 border-dashed border-[#2E5B70]/20 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-900/10 transition flex items-center justify-center gap-1 cursor-pointer">
                                                        <Plus className="w-4 h-4" /> Thêm câu hỏi mới cho phần này
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Thao tác lưu / Hủy */}
                        <div className="flex gap-3 pt-2">
                            <button onClick={handleSave} disabled={saving}
                                className="flex-1 py-3 bg-[#2E5B70] text-white rounded-xl font-bold hover:bg-[#254A5C] transition flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer shadow-sm">
                                {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                                {editingTest ? 'Lưu cập nhật thay đổi' : 'Lưu và xuất bản đề thi'}
                            </button>
                            {editingTest && (
                                <button onClick={resetForm} className="px-6 py-3 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-600 dark:text-slate-350 hover:bg-slate-50 dark:hover:bg-slate-800 font-bold text-xs transition cursor-pointer">
                                    Hủy bỏ sửa
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Danh sách đề thi hiện có */}
                <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700/50 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] overflow-hidden">
                    <div className="p-5 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50">
                        <h2 className="font-extrabold text-slate-800 dark:text-white text-base">📋 Danh sách đề thi & bài luyện hiện có ({tests.length})</h2>
                    </div>
                    <div className="divide-y divide-slate-100 dark:divide-slate-700">
                        {tests.length === 0 ? (
                            <div className="p-12 text-center text-slate-400">
                                <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
                                <p className="text-xs font-medium">Chưa có đề thi nào trong hệ thống. Hãy tạo đề thi đầu tiên!</p>
                            </div>
                        ) : tests.map(test => {
                            const totalQ = (test.sections || []).reduce((s, sec) => s + (sec.questions?.length || 0), 0);
                            const levelColors = {
                                N5: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400 border border-emerald-100/55',
                                N4: 'bg-teal-50 text-teal-600 dark:bg-teal-950/20 dark:text-teal-400 border border-teal-100/55',
                                N3: 'bg-blue-50 text-blue-600 dark:bg-blue-950/20 dark:text-blue-400 border border-blue-100/55',
                                N2: 'bg-violet-50 text-violet-600 dark:bg-violet-950/20 dark:text-violet-400 border border-violet-100/55',
                                N1: 'bg-rose-50 text-rose-600 dark:bg-rose-950/20 dark:text-rose-400 border border-rose-100/55',
                            };
                            return (
                                <div key={test.id} className="p-4 hover:bg-slate-50/60 dark:hover:bg-slate-900/10 transition flex items-center justify-between gap-4">
                                    <div className="flex items-center gap-3">
                                        <span className={`px-2.5 py-1 rounded-lg text-xs font-extrabold ${levelColors[test.level] || ''}`}>
                                            {test.level}
                                        </span>
                                        <div>
                                            <p className="font-extrabold text-slate-800 dark:text-white text-xs">{test.title}</p>
                                            <p className="text-[10px] text-slate-400 font-semibold mt-0.5 flex items-center gap-2">
                                                <span>{totalQ} câu hỏi</span>
                                                <span>•</span>
                                                <span>{test.timeLimit} phút</span>
                                                <span>•</span>
                                                <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${test.isSkillTest ? 'bg-sky-50 dark:bg-sky-950/25 text-sky-600' : 'bg-indigo-50 dark:bg-indigo-950/25 text-indigo-600'}`}>
                                                    {test.isSkillTest ? `Luyện kỹ năng: ${SKILL_LABELS[test.skillType] || test.skillType}` : 'Đề thi thử đầy đủ'}
                                                </span>
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1 flex-shrink-0">
                                        <button onClick={() => handleEdit(test)} className="p-2 text-[#2E5B70] hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition cursor-pointer">
                                            <Edit3 className="w-4 h-4" />
                                        </button>
                                        <button onClick={() => setConfirmDelete(test)} className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-xl transition cursor-pointer">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* JSON Import Modal */}
            {showJsonImport && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl max-w-2xl w-full p-6 space-y-4 max-h-[85vh] overflow-y-auto border border-slate-100 dark:border-slate-700">
                        <div className="flex items-center justify-between">
                            <h3 className="text-base font-extrabold text-slate-800 dark:text-white">Import đề thi / bài luyện từ cấu trúc JSON</h3>
                            <button onClick={() => setShowJsonImport(false)} className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"><X className="w-5 h-5" /></button>
                        </div>
                        
                        {/* Selector for Import Type */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-900/30 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Loại đề nhập vào</label>
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setImportType('full')}
                                        className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all border ${importType === 'full' 
                                            ? 'bg-white dark:bg-slate-800 text-[#2E5B70] dark:text-sky-400 border-slate-200 dark:border-slate-700 shadow-sm' 
                                            : 'bg-transparent text-slate-400 border-transparent hover:text-slate-600'}`}
                                    >
                                        Đề thi đầy đủ
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setImportType('skill')}
                                        className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all border ${importType === 'skill' 
                                            ? 'bg-white dark:bg-slate-800 text-[#2E5B70] dark:text-sky-400 border-slate-200 dark:border-slate-700 shadow-sm' 
                                            : 'bg-transparent text-slate-400 border-transparent hover:text-slate-600'}`}
                                    >
                                        Luyện chuyên sâu
                                    </button>
                                </div>
                            </div>
                            
                            {importType === 'skill' && (
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Kỹ năng chuyên sâu</label>
                                    <select 
                                        value={importSkillType} 
                                        onChange={e => setImportSkillType(e.target.value)}
                                        className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-700 dark:text-white outline-none"
                                    >
                                        {Object.entries(SKILL_LABELS).map(([val, label]) => (
                                            <option key={val} value={val}>{label}</option>
                                        ))}
                                    </select>
                                </div>
                            )}
                        </div>

                        <div className="flex items-center justify-between">
                            <span className="text-[11px] text-slate-400 font-medium">Mẫu cấu trúc tương ứng:</span>
                            <button
                                type="button"
                                onClick={() => {
                                    const sample = importType === 'full' ? SAMPLE_FULL_JSON : SAMPLE_SKILL_JSON;
                                    navigator.clipboard.writeText(JSON.stringify(sample, null, 2));
                                    notify('success', 'Đã copy JSON mẫu vào Clipboard!');
                                }}
                                className="px-2.5 py-1.5 text-[10px] font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 rounded-xl transition flex items-center gap-1.5 cursor-pointer select-none"
                            >
                                <Copy className="w-3.5 h-3.5" /> Sao chép JSON mẫu
                            </button>
                        </div>

                        <textarea value={jsonInput} onChange={e => setJsonInput(e.target.value)}
                            placeholder="Dán mã JSON đề thi vào đây..." rows={10}
                            className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-700 rounded-2xl bg-slate-50 dark:bg-slate-900/50 text-slate-800 dark:text-white outline-none resize-none font-mono" />
                        
                        <div className="flex gap-3">
                            <button onClick={handleJsonImport} className="flex-1 py-2.5 bg-[#2E5B70] text-white rounded-xl font-bold hover:bg-[#254A5C] transition cursor-pointer text-xs">
                                Tiến hành Import
                            </button>
                            <button onClick={() => setShowJsonImport(false)} className="px-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-600 dark:text-slate-350 hover:bg-slate-50 dark:hover:bg-slate-800 transition font-bold text-xs cursor-pointer">
                                Hủy bỏ
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Xác nhận xóa */}
            {confirmDelete && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl max-w-sm w-full p-6 space-y-4 border border-slate-100 dark:border-slate-700">
                        <div className="text-center">
                            <div className="w-12 h-12 rounded-full bg-red-50 dark:bg-red-950/20 flex items-center justify-center mx-auto mb-3">
                                <AlertTriangle className="w-6 h-6 text-red-500" />
                            </div>
                            <h3 className="text-sm font-extrabold text-slate-800 dark:text-white">Bạn thực sự muốn xóa?</h3>
                            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                                Đề thi <strong>{confirmDelete.title}</strong> sẽ bị xóa vĩnh viễn khỏi cơ sở dữ liệu và không thể khôi phục lại.
                            </p>
                        </div>
                        <div className="flex gap-3">
                            <button onClick={() => setConfirmDelete(null)} className="flex-1 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition cursor-pointer">Hủy bỏ</button>
                            <button onClick={handleDelete} className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-xs transition flex items-center justify-center gap-1.5 cursor-pointer">
                                <Trash2 className="w-4 h-4" /> Đồng ý Xóa
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Thông báo góc màn hình */}
            {notification && (
                <div className={`fixed bottom-4 right-4 z-50 px-4 py-3 rounded-2xl shadow-xl flex items-center gap-2 animate-bounce text-xs font-bold text-white ${notification.type === 'success' ? 'bg-emerald-500' : 'bg-rose-500'}`}>
                    {notification.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                    <span>{notification.message}</span>
                </div>
            )}
        </div>
    );
};

export default JLPTAdminScreen;
