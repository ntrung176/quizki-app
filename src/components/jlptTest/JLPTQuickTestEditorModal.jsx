import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import {
    X, Save, Loader2, Plus, Trash2, Search, ChevronDown, ChevronUp,
    Headphones, BookOpen, CheckCircle2, Lock, Unlock, Sparkles,
    Code2, Edit3
} from 'lucide-react';
import { ROUTES } from '../../router';
import { ensureFullTestLoaded } from '../../services/jlptDataService';
import ListeningQuestionEditorCard from '../admin/ListeningQuestionEditorCard';
import QuestionEditModal from './QuestionEditModal';
import { JLPT_LEVELS, parseYearlyExamMeta, resolveQuestionMondai } from './jlptYearlyConstants';
import { resolveSectionMondaiMeta } from './jlptLevelBlueprints';

const SECTION_TYPE_PRESETS = [
    { type: 'vocabulary', title: 'Từ vựng (文字・語彙)' },
    { type: 'grammar', title: 'Ngữ pháp (文法)' },
    { type: 'reading', title: 'Đọc hiểu (読解)' },
    { type: 'listening', title: 'Nghe hiểu (聴解)' }
];

const createBlankQuestion = (secType, existingQuestions = []) => {
    if (secType === 'listening') {
        const lastAudio = existingQuestions.find((q) => q?.audioUrl)?.audioUrl || '';
        const lastMondai = Number(existingQuestions[existingQuestions.length - 1]?.mondai || 1);
        const sameMondaiCount = existingQuestions.filter((q) => Number(q?.mondai || 1) === lastMondai).length;
        return {
            mondai: lastMondai,
            questionNumber: sameMondaiCount + 1,
            paperPrompt: '',
            stem: '',
            spokenQuestion: '',
            question: `${sameMondaiCount + 1}番`,
            options: ['1', '2', '3', '4'],
            correctAnswer: 0,
            answer: 0,
            audioUrl: lastAudio,
            audioStartSec: 0,
            audioEndSec: 30,
            imageUrl: '',
            script: [],
            explanation: ''
        };
    }
    return {
        mondai: 1,
        questionNumber: existingQuestions.length + 1,
        passage: '',
        question: '',
        options: ['', '', '', ''],
        correctAnswer: 0,
        answer: 0,
        explanation: ''
    };
};

const NonListeningQuestionCard = ({
    question,
    index,
    level,
    sectionType,
    sectionTitle,
    onChange,
    onDelete,
    onOpenRichEditor
}) => {
    const [expanded, setExpanded] = useState(index < 2);
    const mNum = resolveQuestionMondai(question, sectionTitle, 15);
    const mMeta = resolveSectionMondaiMeta(level, sectionType, mNum, sectionTitle);
    const hasSub = Array.isArray(question.subQuestions) && question.subQuestions.length > 0;

    const updateField = (field, val) => onChange({ ...question, [field]: val });
    const updateOption = (optIdx, val) => {
        const next = [...(question.options || ['', '', '', ''])];
        next[optIdx] = val;
        updateField('options', next);
    };

    return (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border-2 border-slate-200 dark:border-slate-700/80 overflow-hidden shadow-2xs">
            <div
                onClick={() => setExpanded((prev) => !prev)}
                className="px-4 py-3 bg-slate-50 dark:bg-slate-800/70 flex items-center justify-between gap-3 cursor-pointer hover:bg-slate-100/70 dark:hover:bg-slate-800 transition"
            >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                    <span className="px-2.5 py-1 rounded-lg bg-sky-500 text-white text-[11px] font-black shrink-0">
                        Câu {question.questionNumber || index + 1}
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-slate-200/70 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-[10px] font-bold shrink-0">
                        M{mNum}: {mMeta.ja}
                    </span>
                    {hasSub && (
                        <span className="px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 text-[10px] font-bold shrink-0">
                            {question.subQuestions.length} câu phụ
                        </span>
                    )}
                    <p className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate font-japanese">
                        {(question.question || '').replace(/<[^>]+>/g, ' ') || '(Chưa có nội dung câu hỏi)'}
                    </p>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            onOpenRichEditor();
                        }}
                        className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-[11px] font-black flex items-center gap-1 cursor-pointer"
                        title="Mở trình sửa HTML / Đoạn văn / Câu phụ đầy đủ"
                    >
                        <Code2 className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">HTML / Nâng cao</span>
                    </button>
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            onDelete();
                        }}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
                        title="Xóa câu này"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                    {expanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                </div>
            </div>

            {expanded && (
                <div className="p-4 space-y-3 border-t border-slate-100 dark:border-slate-800">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div>
                            <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Mondai</label>
                            <input
                                type="number"
                                min={1}
                                max={15}
                                value={question.mondai || mNum}
                                onChange={(e) => updateField('mondai', Math.max(1, Number(e.target.value) || 1))}
                                className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs font-bold text-slate-800 dark:text-white"
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Số thứ tự trên đề</label>
                            <input
                                type="number"
                                min={1}
                                value={question.questionNumber || index + 1}
                                onChange={(e) => updateField('questionNumber', Math.max(1, Number(e.target.value) || 1))}
                                className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs font-bold text-slate-800 dark:text-white"
                            />
                        </div>
                        <div className="col-span-2">
                            <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Tên Mondai (tùy chọn)</label>
                            <input
                                type="text"
                                value={question.mondaiTitle || ''}
                                onChange={(e) => updateField('mondaiTitle', e.target.value)}
                                placeholder={`問題${mNum}：${mMeta.ja}`}
                                className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs font-bold text-slate-800 dark:text-white font-japanese"
                            />
                        </div>
                    </div>

                    {(sectionType === 'reading' || sectionType === 'grammar' || question.passage) && (
                        <div>
                            <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Đoạn văn / Bảng biểu HTML (Passage)</label>
                            <textarea
                                rows={3}
                                value={question.passage || ''}
                                onChange={(e) => updateField('passage', e.target.value)}
                                placeholder="Dán đoạn văn đọc hiểu hoặc bảng <table>...</table>..."
                                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs font-japanese text-slate-800 dark:text-slate-100"
                            />
                        </div>
                    )}

                    <div>
                        <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Nội dung câu hỏi (hỗ trợ HTML &lt;u&gt;, ★...)</label>
                        <textarea
                            rows={2}
                            value={question.question || ''}
                            onChange={(e) => updateField('question', e.target.value)}
                            className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs font-japanese text-slate-800 dark:text-slate-100"
                        />
                    </div>

                    {hasSub ? (
                        <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 flex items-center justify-between gap-3">
                            <span className="text-xs font-bold text-amber-800 dark:text-amber-300">
                                Câu này có {question.subQuestions.length} câu hỏi phụ. Bấm nút bên phải để sửa chi tiết từng câu phụ.
                            </span>
                            <button
                                type="button"
                                onClick={onOpenRichEditor}
                                className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-white text-xs font-black shrink-0 cursor-pointer"
                            >
                                Sửa câu phụ
                            </button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {(question.options || ['', '', '', '']).map((opt, optIdx) => {
                                const isAns = Number(question.correctAnswer ?? question.answer ?? 0) === optIdx;
                                return (
                                    <div key={optIdx} className={`flex items-center gap-2 p-2 rounded-xl border ${
                                        isAns
                                            ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-400 dark:border-emerald-700'
                                            : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800'
                                    }`}>
                                        <button
                                            type="button"
                                            onClick={() => onChange({ ...question, correctAnswer: optIdx, answer: optIdx })}
                                            className={`w-6 h-6 rounded-lg text-[11px] font-black shrink-0 cursor-pointer ${
                                                isAns ? 'bg-emerald-500 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                                            }`}
                                            title="Chọn làm đáp án đúng"
                                        >
                                            {optIdx + 1}
                                        </button>
                                        <input
                                            type="text"
                                            value={opt}
                                            onChange={(e) => updateOption(optIdx, e.target.value)}
                                            className="flex-1 bg-transparent text-xs font-bold text-slate-800 dark:text-white font-japanese outline-none"
                                            placeholder={`Đáp án ${optIdx + 1}`}
                                        />
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    <div>
                        <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Giải thích (Tiếng Việt)</label>
                        <textarea
                            rows={2}
                            value={question.explanation || ''}
                            onChange={(e) => updateField('explanation', e.target.value)}
                            className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs text-slate-700 dark:text-slate-200"
                        />
                    </div>
                </div>
            )}
        </div>
    );
};

/**
 * Direct in-place JLPT Exam Editor Modal launched right from any exam card or test view.
 */
const JLPTQuickTestEditorModal = ({ isOpen, onClose, initialTest, onSaveTest, onDeleteTest = null }) => {
    const [draft, setDraft] = useState(null);
    const [loadingFull, setLoadingFull] = useState(false);
    const [activeSecIdx, setActiveSecIdx] = useState(0);
    const [searchText, setSearchText] = useState('');
    const [saving, setSaving] = useState(false);
    const [richEditTarget, setRichEditTarget] = useState(null); // { sectionIdx, questionIdx, question }
    const [showNewSecMenu, setShowNewSecMenu] = useState(false);

    useEffect(() => {
        if (!isOpen || !initialTest) {
            setDraft(null);
            setRichEditTarget(null);
            return;
        }
        let cancelled = false;
        const hydrate = async () => {
            let full = initialTest;
            if (!Array.isArray(full.sections) || full.sections.length === 0) {
                setLoadingFull(true);
                try {
                    full = (await ensureFullTestLoaded(initialTest.id, initialTest.level)) || initialTest;
                } finally {
                    if (!cancelled) setLoadingFull(false);
                }
            }
            if (!cancelled) {
                const clone = JSON.parse(JSON.stringify(full));
                clone.sections = Array.isArray(clone.sections) && clone.sections.length > 0
                    ? clone.sections
                    : [{ type: 'vocabulary', title: 'Từ vựng (文字・語彙)', questions: [] }];
                setDraft(clone);
                setActiveSecIdx(0);
                setSearchText('');
            }
        };
        hydrate();
        return () => { cancelled = true; };
    }, [isOpen, initialTest]);

    const periodMeta = useMemo(() => parseYearlyExamMeta(draft), [draft]);

    if (!isOpen || !initialTest) return null;

    const sections = draft?.sections || [];
    const safeSecIdx = Math.min(activeSecIdx, Math.max(0, sections.length - 1));
    const currentSection = sections[safeSecIdx] || null;
    const isListeningSec = currentSection?.type === 'listening'
        || /聴解|nghe hiểu|listening/i.test(currentSection?.title || '');

    const totalQuestions = sections.reduce((sum, s) => sum + (s.questions?.length || 0), 0);

    const updateDraftField = (field, val) => setDraft((prev) => (prev ? { ...prev, [field]: val } : prev));

    const updateQuestionAt = (secIdx, qIdx, updatedQ) => {
        setDraft((prev) => {
            if (!prev) return prev;
            const nextSections = [...prev.sections];
            const sec = { ...nextSections[secIdx] };
            const qs = [...(sec.questions || [])];
            qs[qIdx] = updatedQ;
            sec.questions = qs;
            nextSections[secIdx] = sec;
            return { ...prev, sections: nextSections };
        });
    };

    const deleteQuestionAt = (secIdx, qIdx) => {
        setDraft((prev) => {
            if (!prev) return prev;
            const nextSections = [...prev.sections];
            const sec = { ...nextSections[secIdx] };
            sec.questions = (sec.questions || []).filter((_, i) => i !== qIdx);
            nextSections[secIdx] = sec;
            return { ...prev, sections: nextSections };
        });
    };

    const addQuestionToCurrentSection = () => {
        if (!currentSection) return;
        const newQ = createBlankQuestion(currentSection.type, currentSection.questions || []);
        setDraft((prev) => {
            const nextSections = [...prev.sections];
            const sec = { ...nextSections[safeSecIdx] };
            sec.questions = [...(sec.questions || []), newQ];
            nextSections[safeSecIdx] = sec;
            return { ...prev, sections: nextSections };
        });
    };

    const addSectionPreset = (preset) => {
        setShowNewSecMenu(false);
        setDraft((prev) => {
            const nextSections = [
                ...(prev?.sections || []),
                { type: preset.type, title: preset.title, questions: [createBlankQuestion(preset.type, [])] }
            ];
            setActiveSecIdx(nextSections.length - 1);
            return { ...prev, sections: nextSections };
        });
    };

    const deleteSectionAt = (secIdx) => {
        if (sections.length <= 1) return;
        setDraft((prev) => {
            const nextSections = prev.sections.filter((_, i) => i !== secIdx);
            return { ...prev, sections: nextSections };
        });
        setActiveSecIdx((prev) => Math.max(0, Math.min(prev, sections.length - 2)));
    };

    const handleSaveAll = async () => {
        if (!draft || saving) return;
        setSaving(true);
        try {
            const ok = await onSaveTest(draft);
            if (ok !== false) onClose();
        } finally {
            setSaving(false);
        }
    };

    const qFilter = searchText.trim().toLowerCase();
    const filteredQuestionEntries = (currentSection?.questions || [])
        .map((q, qIdx) => ({ q, qIdx }))
        .filter(({ q, qIdx }) => {
            if (!qFilter) return true;
            const hay = `${qIdx + 1} M${q.mondai || ''} ${q.questionNumber || ''} ${q.question || ''} ${q.stem || ''} ${q.passage || ''} ${(q.options || []).join(' ')}`.toLowerCase();
            return hay.includes(qFilter);
        });

    const studioUrl = draft?.category === 'mondai_listening'
        ? `${ROUTES.JLPT_ADMIN}?mode=studio&authorMode=mondai&testId=${encodeURIComponent(draft?.id || initialTest.id)}&level=${draft?.level || 'N3'}&mondai=${draft?.mondaiNumber || 1}`
        : `${ROUTES.JLPT_ADMIN}?mode=studio&authorMode=append&testId=${encodeURIComponent(draft?.id || initialTest.id)}&level=${draft?.level || 'N3'}&year=${periodMeta.year || 2024}&session=${periodMeta.session || '12'}`;

    return createPortal(
        <>
            <div className="fixed inset-0 z-[9998] bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 animate-fade-in">
                <div className="bg-slate-50 dark:bg-slate-950 w-full max-w-5xl h-[92vh] rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col overflow-hidden">
                    {/* Top Header */}
                    <div className="px-4 sm:px-6 py-3.5 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
                        <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-9 h-9 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0">
                                <Edit3 className="w-4 h-4" />
                            </div>
                            <div className="min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                                        {draft?.level || initialTest.level || 'JLPT'}
                                    </span>
                                    <h2 className="text-sm sm:text-base font-black text-slate-900 dark:text-white truncate">
                                        Sửa Đề Trực Tiếp · {draft?.title || initialTest.title}
                                    </h2>
                                    <span className="text-[11px] font-bold text-slate-400">({totalQuestions} câu)</span>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 flex-wrap">
                            <Link
                                to={studioUrl}
                                onClick={onClose}
                                className="px-2.5 py-1.5 rounded-xl text-[11px] font-black bg-sky-50 hover:bg-sky-100 dark:bg-sky-950/50 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800 flex items-center gap-1"
                                title="Mở Studio để nhập JSON Gemini hoặc cắt Audio theo Mondai"
                            >
                                <Sparkles className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">Mở trong Studio</span>
                            </Link>
                            {onDeleteTest && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        const target = draft || initialTest;
                                        onClose();
                                        onDeleteTest(target);
                                    }}
                                    className="p-2 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800 cursor-pointer"
                                    title="Xóa đề thi này"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            )}
                            <button
                                type="button"
                                onClick={handleSaveAll}
                                disabled={!draft || loadingFull || saving}
                                className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 border-b-2 border-emerald-700 text-white text-xs font-black flex items-center gap-1.5 cursor-pointer"
                            >
                                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                                <span>{saving ? 'Đang lưu...' : 'Lưu thay đổi'}</span>
                            </button>
                            <button
                                type="button"
                                onClick={onClose}
                                className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                                title="Đóng"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                    </div>

                    {loadingFull || !draft ? (
                        <div className="flex-1 flex flex-col items-center justify-center gap-3 p-10 text-slate-500">
                            <Loader2 className="w-7 h-7 animate-spin text-emerald-500" />
                            <span className="text-xs font-bold">Đang nạp đầy đủ các phần thi &amp; câu hỏi...</span>
                        </div>
                    ) : (
                        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
                            {/* Test Metadata Strip */}
                            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-3.5 grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                                <div className="sm:col-span-5">
                                    <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Tên đề thi</label>
                                    <input
                                        type="text"
                                        value={draft.title || ''}
                                        onChange={(e) => updateDraftField('title', e.target.value)}
                                        className="w-full px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs font-bold text-slate-800 dark:text-white"
                                    />
                                </div>
                                <div className="sm:col-span-2">
                                    <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Cấp độ</label>
                                    <select
                                        value={draft.level || 'N3'}
                                        onChange={(e) => updateDraftField('level', e.target.value)}
                                        className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs font-black text-slate-800 dark:text-white"
                                    >
                                        {JLPT_LEVELS.map((lvl) => <option key={lvl} value={lvl}>{lvl}</option>)}
                                    </select>
                                </div>
                                <div className="sm:col-span-2">
                                    <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Phút thi</label>
                                    <input
                                        type="number"
                                        min={1}
                                        value={draft.timeLimit || 60}
                                        onChange={(e) => updateDraftField('timeLimit', Math.max(1, Number(e.target.value) || 60))}
                                        className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs font-bold text-slate-800 dark:text-white"
                                    />
                                </div>
                                <div className="sm:col-span-3 flex items-center gap-2 flex-wrap pb-0.5">
                                    <button
                                        type="button"
                                        onClick={() => updateDraftField('isPremium', !draft.isPremium)}
                                        className={`px-2.5 py-1.5 rounded-xl text-[11px] font-black border flex items-center gap-1 cursor-pointer ${
                                            draft.isPremium
                                                ? 'bg-amber-50 dark:bg-amber-950/50 border-amber-300 text-amber-700 dark:text-amber-300'
                                                : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500'
                                        }`}
                                    >
                                        {draft.isPremium ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                                        <span>{draft.isPremium ? 'VIP' : 'Miễn phí'}</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const next = !(draft.isFixed || draft.isDataStandardized);
                                            setDraft((p) => ({ ...p, isFixed: next, isDataStandardized: next }));
                                        }}
                                        className={`px-2.5 py-1.5 rounded-xl text-[11px] font-black border flex items-center gap-1 cursor-pointer ${
                                            (draft.isFixed || draft.isDataStandardized)
                                                ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-300 text-emerald-700 dark:text-emerald-300'
                                                : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500'
                                        }`}
                                    >
                                        <CheckCircle2 className="w-3 h-3" />
                                        <span>{(draft.isFixed || draft.isDataStandardized) ? 'Chuẩn' : 'Mới'}</span>
                                    </button>
                                </div>
                            </div>

                            {/* Section Tabs & Actions */}
                            <div className="flex flex-wrap items-center justify-between gap-2 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-2.5">
                                <div className="flex flex-wrap items-center gap-1.5">
                                    {sections.map((sec, sIdx) => {
                                        const isActive = sIdx === safeSecIdx;
                                        const isListen = sec.type === 'listening';
                                        return (
                                            <div key={sIdx} className="flex items-center">
                                                <button
                                                    type="button"
                                                    onClick={() => setActiveSecIdx(sIdx)}
                                                    className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer transition ${
                                                        isActive
                                                            ? (isListen ? 'bg-amber-500 text-white' : 'bg-sky-500 text-white')
                                                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                                                    }`}
                                                >
                                                    {isListen ? <Headphones className="w-3.5 h-3.5" /> : <BookOpen className="w-3.5 h-3.5" />}
                                                    <span>{sec.title || sec.type}</span>
                                                    <span className={`px-1.5 rounded text-[10px] ${isActive ? 'bg-white/25' : 'bg-white dark:bg-slate-700'}`}>
                                                        {sec.questions?.length || 0}
                                                    </span>
                                                </button>
                                                {isActive && sections.length > 1 && (
                                                    <button
                                                        type="button"
                                                        onClick={() => deleteSectionAt(sIdx)}
                                                        className="ml-1 p-1 rounded-lg text-slate-400 hover:text-rose-500 cursor-pointer"
                                                        title="Xóa phần thi này"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                )}
                                            </div>
                                        );
                                    })}

                                    <div className="relative">
                                        <button
                                            type="button"
                                            onClick={() => setShowNewSecMenu((v) => !v)}
                                            className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center gap-1 cursor-pointer"
                                        >
                                            <Plus className="w-3.5 h-3.5" />
                                            <span>Thêm phần</span>
                                        </button>
                                        {showNewSecMenu && (
                                            <div className="absolute left-0 mt-1 w-48 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xl p-1.5 z-20 space-y-1">
                                                {SECTION_TYPE_PRESETS.map((preset) => (
                                                    <button
                                                        key={preset.type}
                                                        type="button"
                                                        onClick={() => addSectionPreset(preset)}
                                                        className="w-full text-left px-3 py-1.5 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 cursor-pointer"
                                                    >
                                                        + {preset.title}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    <div className="relative">
                                        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                                        <input
                                            type="text"
                                            value={searchText}
                                            onChange={(e) => setSearchText(e.target.value)}
                                            placeholder="Tìm câu / M1.."
                                            className="pl-7 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs font-bold text-slate-700 dark:text-slate-200 w-36 sm:w-44"
                                        />
                                    </div>
                                    <button
                                        type="button"
                                        onClick={addQuestionToCurrentSection}
                                        className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-black flex items-center gap-1 cursor-pointer"
                                    >
                                        <Plus className="w-3.5 h-3.5" />
                                        <span>Thêm câu</span>
                                    </button>
                                </div>
                            </div>

                            {/* Questions List */}
                            <div className="space-y-3">
                                {filteredQuestionEntries.map(({ q, qIdx }) => (
                                    <div key={qIdx} className="space-y-1.5">
                                        {isListeningSec ? (
                                            <>
                                                <ListeningQuestionEditorCard
                                                    question={q}
                                                    index={qIdx}
                                                    level={draft.level || 'N3'}
                                                    onChange={(updatedQ) => updateQuestionAt(safeSecIdx, qIdx, updatedQ)}
                                                    onDelete={() => deleteQuestionAt(safeSecIdx, qIdx)}
                                                />
                                                {Array.isArray(q.subQuestions) && q.subQuestions.length > 0 && (
                                                    <div className="flex justify-end pr-2">
                                                        <button
                                                            type="button"
                                                            onClick={() => setRichEditTarget({ sectionIdx: safeSecIdx, questionIdx: qIdx, question: q })}
                                                            className="px-3 py-1 rounded-lg bg-amber-100 hover:bg-amber-200 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 text-[11px] font-black flex items-center gap-1 cursor-pointer"
                                                        >
                                                            <Code2 className="w-3.5 h-3.5" />
                                                            <span>Sửa chi tiết {q.subQuestions.length} câu phụ (質問1/2)</span>
                                                        </button>
                                                    </div>
                                                )}
                                            </>
                                        ) : (
                                            <NonListeningQuestionCard
                                                question={q}
                                                index={qIdx}
                                                level={draft.level || 'N3'}
                                                sectionType={currentSection?.type || 'vocabulary'}
                                                sectionTitle={currentSection?.title || ''}
                                                onChange={(updatedQ) => updateQuestionAt(safeSecIdx, qIdx, updatedQ)}
                                                onDelete={() => deleteQuestionAt(safeSecIdx, qIdx)}
                                                onOpenRichEditor={() => setRichEditTarget({ sectionIdx: safeSecIdx, questionIdx: qIdx, question: q })}
                                            />
                                        )}
                                    </div>
                                ))}

                                {filteredQuestionEntries.length === 0 && (
                                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8 text-center text-xs text-slate-400 font-bold">
                                        Không có câu hỏi nào trong phần này. Bấm &ldquo;+ Thêm câu&rdquo; để tạo mới.
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {richEditTarget && (
                <QuestionEditModal
                    isOpen={!!richEditTarget}
                    onClose={() => setRichEditTarget(null)}
                    initialQuestion={richEditTarget.question}
                    onSave={(updatedQ) => {
                        updateQuestionAt(richEditTarget.sectionIdx, richEditTarget.questionIdx, updatedQ);
                        setRichEditTarget(null);
                    }}
                />
            )}
        </>,
        document.body
    );
};

export default JLPTQuickTestEditorModal;
