import React, { useState, useEffect, useCallback } from 'react';
import {
    collection, query, onSnapshot, doc, setDoc, deleteDoc, serverTimestamp, orderBy
} from 'firebase/firestore';
import { db, appId } from '../../config/firebase';
import {
    Plus, Trash2, Edit3, Save, X, ChevronDown, ChevronUp,
    FileText, Headphones, BookOpen, Languages, AlertTriangle,
    CheckCircle, Loader2, Copy, Upload, Eye, ArrowLeft
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { ROUTES } from '../../router';

const SECTION_TYPES = [
    { value: 'vocabulary', label: '文字・語彙 (Moji/Goi)', icon: Languages, color: 'blue' },
    { value: 'grammar', label: '文法 (Bunpou)', icon: BookOpen, color: 'purple' },
    { value: 'reading', label: '読解 (Dokkai)', icon: FileText, color: 'green' },
    { value: 'listening', label: '聴解 (Choukai)', icon: Headphones, color: 'orange' },
];

const EMPTY_QUESTION = {
    question: '', options: ['', '', '', ''], correctAnswer: 0,
    explanation: '', audioUrl: '', passage: '', imageUrl: ''
};

const EMPTY_SECTION = { type: 'vocabulary', title: '', questions: [{ ...EMPTY_QUESTION }] };

const EMPTY_TEST = {
    title: '', level: 'N5', timeLimit: 60,
    sections: [{ ...EMPTY_SECTION, questions: [{ ...EMPTY_QUESTION }] }]
};

const SAMPLE_JSON = {
    title: "JLPT N5 - Đề mẫu 1",
    level: "N5",
    timeLimit: 60,
    sections: [
        {
            type: "vocabulary",
            title: "文字・語彙",
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
            title: "聴解",
            questions: [
                {
                    question: "Nghe và chọn đáp án đúng",
                    audioUrl: "https://example.com/audio.mp3",
                    options: ["Đáp án A", "Đáp án B", "Đáp án C", "Đáp án D"],
                    correctAnswer: 1,
                    explanation: "Giải thích..."
                }
            ]
        }
    ]
};

const JLPTAdminScreen = ({ userId }) => {
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
    const [previewTest, setPreviewTest] = useState(null);

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

    // Save test
    const handleSave = async () => {
        if (!formData.title.trim()) { notify('error', 'Vui lòng nhập tên đề thi'); return; }
        if (formData.sections.length === 0) { notify('error', 'Cần ít nhất 1 phần'); return; }

        // Validate all questions have content
        for (const sec of formData.sections) {
            if (!sec.title.trim()) { notify('error', 'Mỗi phần cần có tiêu đề'); return; }
            for (const q of sec.questions) {
                if (!q.question.trim()) { notify('error', 'Mỗi câu hỏi cần có nội dung'); return; }
                if (q.options.some(o => !o.trim())) { notify('error', 'Tất cả đáp án cần được điền'); return; }
            }
        }

        setSaving(true);
        try {
            const testId = editingTest?.id || `test_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
            const testData = {
                ...formData,
                updatedAt: serverTimestamp(),
                updatedBy: userId,
            };
            if (!editingTest) {
                testData.createdAt = serverTimestamp();
                testData.createdBy = userId;
            }
            await setDoc(doc(db, testsPath, testId), testData);
            notify('success', editingTest ? 'Đã cập nhật đề thi!' : 'Đã tạo đề thi mới!');
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
            notify('success', 'Đã xóa đề thi');
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
            sections: test.sections || [],
        });
        setExpandedSections({ 0: true });
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleJsonImport = () => {
        try {
            const parsed = JSON.parse(jsonInput);
            if (!parsed.title || !parsed.sections) throw new Error('JSON không hợp lệ');
            setFormData({
                title: parsed.title || '',
                level: parsed.level || 'N5',
                timeLimit: parsed.timeLimit || 60,
                sections: parsed.sections.map(s => ({
                    type: s.type || 'vocabulary',
                    title: s.title || '',
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
            notify('success', 'Đã import JSON thành công!');
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

    const toggleSection = (i) => setExpandedSections(p => ({ ...p, [i]: !p[i] }));

    const totalQuestions = formData.sections.reduce((sum, s) => sum + s.questions.length, 0);

    const getSectionMeta = (type) => SECTION_TYPES.find(s => s.value === type) || SECTION_TYPES[0];

    // Render
    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-indigo-900/20 p-4 md:p-6">
            <div className="max-w-5xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Link to={ROUTES.JLPT_TEST} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition">
                            <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                        </Link>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                                <FileText className="w-6 h-6 text-indigo-500" />
                                Quản lý đề thi JLPT
                            </h1>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Tạo, chỉnh sửa và quản lý đề thi theo cấu trúc JLPT chuẩn</p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={() => setShowJsonImport(true)}
                            className="px-3 py-2 text-sm bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 rounded-lg hover:bg-violet-200 dark:hover:bg-violet-900/50 transition flex items-center gap-1">
                            <Upload className="w-4 h-4" /> Import JSON
                        </button>
                        <button onClick={() => { navigator.clipboard.writeText(JSON.stringify(SAMPLE_JSON, null, 2)); notify('success', 'Đã copy JSON mẫu!'); }}
                            className="px-3 py-2 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition flex items-center gap-1">
                            <Copy className="w-4 h-4" /> Copy JSON mẫu
                        </button>
                    </div>
                </div>

                {/* Form */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
                    <div className="p-5 border-b border-gray-100 dark:border-gray-700">
                        <h2 className="font-bold text-gray-800 dark:text-white text-lg">
                            {editingTest ? '✏️ Chỉnh sửa đề thi' : '➕ Tạo đề thi mới'}
                        </h2>
                    </div>
                    <div className="p-5 space-y-5">
                        {/* Basic info */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="md:col-span-1">
                                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Tên đề thi</label>
                                <input type="text" value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })}
                                    placeholder="VD: JLPT N5 - Đề số 1" className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none" />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Cấp độ</label>
                                <select value={formData.level} onChange={e => setFormData({ ...formData, level: e.target.value })}
                                    className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-white focus:ring-2 focus:ring-indigo-500/20 outline-none">
                                    {['N5', 'N4', 'N3', 'N2', 'N1'].map(l => <option key={l} value={l}>{l}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Thời gian (phút)</label>
                                <input type="number" value={formData.timeLimit} onChange={e => setFormData({ ...formData, timeLimit: Number(e.target.value) })}
                                    min={10} max={300} className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-white focus:ring-2 focus:ring-indigo-500/20 outline-none" />
                            </div>
                        </div>

                        {/* Sections */}
                        <div>
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="font-bold text-gray-700 dark:text-gray-300">Các phần ({formData.sections.length}) • {totalQuestions} câu hỏi</h3>
                                <button onClick={addSection} className="px-3 py-1.5 text-sm bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-lg hover:bg-indigo-200 transition flex items-center gap-1">
                                    <Plus className="w-4 h-4" /> Thêm phần
                                </button>
                            </div>

                            <div className="space-y-3">
                                {formData.sections.map((section, si) => {
                                    const meta = getSectionMeta(section.type);
                                    const Icon = meta.icon;
                                    const isExpanded = expandedSections[si];

                                    return (
                                        <div key={si} className="border border-gray-200 dark:border-gray-600 rounded-xl overflow-hidden">
                                            {/* Section header */}
                                            <div className={`flex items-center justify-between p-3 bg-${meta.color}-50 dark:bg-${meta.color}-900/20 cursor-pointer`}
                                                onClick={() => toggleSection(si)}>
                                                <div className="flex items-center gap-2">
                                                    <Icon className={`w-5 h-5 text-${meta.color}-600 dark:text-${meta.color}-400`} />
                                                    <span className="font-semibold text-gray-800 dark:text-white text-sm">
                                                        {section.title || meta.label} ({section.questions.length} câu)
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <button onClick={(e) => { e.stopPropagation(); removeSection(si); }}
                                                        className="p-1 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30 rounded transition">
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                    {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
                                                </div>
                                            </div>

                                            {isExpanded && (
                                                <div className="p-4 space-y-4">
                                                    {/* Section type & title */}
                                                    <div className="grid grid-cols-2 gap-3">
                                                        <div>
                                                            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Loại phần</label>
                                                            <select value={section.type} onChange={e => updateSection(si, 'type', e.target.value)}
                                                                className="w-full px-2 py-1.5 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-white outline-none">
                                                                {SECTION_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                                                            </select>
                                                        </div>
                                                        <div>
                                                            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Tiêu đề</label>
                                                            <input type="text" value={section.title} onChange={e => updateSection(si, 'title', e.target.value)}
                                                                placeholder={meta.label} className="w-full px-2 py-1.5 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-white outline-none" />
                                                        </div>
                                                    </div>

                                                    {/* Questions */}
                                                    {section.questions.map((q, qi) => (
                                                        <div key={qi} className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-100 dark:border-gray-600 space-y-3">
                                                            <div className="flex items-center justify-between">
                                                                <span className="text-sm font-bold text-gray-700 dark:text-gray-300">Câu {qi + 1}</span>
                                                                {section.questions.length > 1 && (
                                                                    <button onClick={() => removeQuestion(si, qi)} className="p-1 text-red-400 hover:text-red-600 transition">
                                                                        <X className="w-4 h-4" />
                                                                    </button>
                                                                )}
                                                            </div>

                                                            <textarea value={q.question} onChange={e => updateQuestion(si, qi, 'question', e.target.value)}
                                                                placeholder="Nội dung câu hỏi..." rows={2}
                                                                className="w-full px-2 py-1.5 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-600 text-gray-800 dark:text-white outline-none resize-none" />

                                                            {/* Passage for reading */}
                                                            {section.type === 'reading' && (
                                                                <textarea value={q.passage} onChange={e => updateQuestion(si, qi, 'passage', e.target.value)}
                                                                    placeholder="Đoạn văn đọc hiểu..." rows={4}
                                                                    className="w-full px-2 py-1.5 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-600 text-gray-800 dark:text-white outline-none resize-none font-japanese" />
                                                            )}

                                                            {/* Audio URL for listening */}
                                                            {section.type === 'listening' && (
                                                                <input type="text" value={q.audioUrl} onChange={e => updateQuestion(si, qi, 'audioUrl', e.target.value)}
                                                                    placeholder="URL file audio (mp3, wav...)"
                                                                    className="w-full px-2 py-1.5 text-sm border border-orange-200 dark:border-orange-700 rounded-lg bg-orange-50 dark:bg-orange-900/20 text-gray-800 dark:text-white outline-none" />
                                                            )}

                                                            {/* Options */}
                                                            <div className="grid grid-cols-2 gap-2">
                                                                {q.options.map((opt, oi) => (
                                                                    <div key={oi} className="flex items-center gap-1.5">
                                                                        <button onClick={() => updateQuestion(si, qi, 'correctAnswer', oi)}
                                                                            className={`w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold transition ${q.correctAnswer === oi
                                                                                ? 'bg-green-500 text-white ring-2 ring-green-300'
                                                                                : 'bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-400 hover:bg-green-100'
                                                                                }`}>
                                                                            {String.fromCharCode(65 + oi)}
                                                                        </button>
                                                                        <input type="text" value={opt} onChange={e => updateOption(si, qi, oi, e.target.value)}
                                                                            placeholder={`Đáp án ${String.fromCharCode(65 + oi)}`}
                                                                            className="flex-1 px-2 py-1 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-600 text-gray-800 dark:text-white outline-none" />
                                                                    </div>
                                                                ))}
                                                            </div>

                                                            {/* Explanation */}
                                                            <input type="text" value={q.explanation} onChange={e => updateQuestion(si, qi, 'explanation', e.target.value)}
                                                                placeholder="Giải thích đáp án..."
                                                                className="w-full px-2 py-1.5 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-600 text-gray-800 dark:text-white outline-none" />
                                                        </div>
                                                    ))}

                                                    <button onClick={() => addQuestion(si)}
                                                        className="w-full py-2 text-sm text-indigo-600 dark:text-indigo-400 border-2 border-dashed border-indigo-200 dark:border-indigo-700 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition flex items-center justify-center gap-1">
                                                        <Plus className="w-4 h-4" /> Thêm câu hỏi
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-3 pt-2">
                            <button onClick={handleSave} disabled={saving}
                                className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition flex items-center justify-center gap-2 disabled:opacity-50">
                                {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                                {editingTest ? 'Cập nhật đề thi' : 'Lưu đề thi'}
                            </button>
                            {editingTest && (
                                <button onClick={resetForm} className="px-6 py-3 border border-gray-200 dark:border-gray-600 rounded-xl text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                                    Hủy
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Test list */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
                    <div className="p-5 border-b border-gray-100 dark:border-gray-700">
                        <h2 className="font-bold text-gray-800 dark:text-white text-lg">📋 Danh sách đề thi ({tests.length})</h2>
                    </div>
                    <div className="divide-y divide-gray-100 dark:divide-gray-700">
                        {tests.length === 0 ? (
                            <div className="p-10 text-center text-gray-400">
                                <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
                                <p>Chưa có đề thi nào. Hãy tạo đề mới!</p>
                            </div>
                        ) : tests.map(test => {
                            const totalQ = (test.sections || []).reduce((s, sec) => s + (sec.questions?.length || 0), 0);
                            const levelColors = {
                                N5: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
                                N4: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
                                N3: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
                                N2: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400',
                                N1: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400',
                            };
                            return (
                                <div key={test.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <span className={`px-2 py-1 rounded-lg text-xs font-bold ${levelColors[test.level] || ''}`}>
                                                {test.level}
                                            </span>
                                            <div>
                                                <p className="font-semibold text-gray-800 dark:text-white">{test.title}</p>
                                                <p className="text-xs text-gray-500">{totalQ} câu • {test.timeLimit} phút • {(test.sections || []).length} phần</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <button onClick={() => handleEdit(test)} className="p-2 text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition">
                                                <Edit3 className="w-4 h-4" />
                                            </button>
                                            <button onClick={() => setConfirmDelete(test)} className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition">
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* JSON Import Modal */}
            {showJsonImport && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full p-6 space-y-4 max-h-[80vh] overflow-y-auto">
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-bold text-gray-800 dark:text-white">Import đề thi từ JSON</h3>
                            <button onClick={() => setShowJsonImport(false)} className="p-1 text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
                        </div>
                        <textarea value={jsonInput} onChange={e => setJsonInput(e.target.value)}
                            placeholder="Paste JSON đề thi vào đây..." rows={15}
                            className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-white outline-none resize-none font-mono" />
                        <div className="flex gap-3">
                            <button onClick={handleJsonImport} className="flex-1 py-2 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 transition">
                                Import
                            </button>
                            <button onClick={() => setShowJsonImport(false)} className="px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                                Hủy
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirm */}
            {confirmDelete && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-sm w-full p-6 space-y-4">
                        <div className="text-center">
                            <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto mb-3">
                                <AlertTriangle className="w-6 h-6 text-red-600" />
                            </div>
                            <h3 className="text-lg font-bold text-gray-800 dark:text-white">Xóa đề thi?</h3>
                            <p className="text-sm text-gray-500 mt-2">
                                Xóa <strong>{confirmDelete.title}</strong>? Hành động này không thể hoàn tác.
                            </p>
                        </div>
                        <div className="flex gap-3">
                            <button onClick={() => setConfirmDelete(null)} className="flex-1 px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition">Hủy</button>
                            <button onClick={handleDelete} className="flex-1 px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition flex items-center justify-center gap-1">
                                <Trash2 className="w-4 h-4" /> Xóa
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Notification */}
            {notification && (
                <div className={`fixed bottom-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg flex items-center gap-2 animate-fade-in ${notification.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>
                    {notification.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
                    <span className="text-sm font-medium">{notification.message}</span>
                </div>
            )}
        </div>
    );
};

export default JLPTAdminScreen;
