import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
    Award, AlertTriangle, FileText, X, Settings, Check, 
    Maximize, Minimize, ChevronLeft, ChevronRight, Edit3, 
    CheckCircle, XCircle, Pencil, RotateCcw, Play, Printer, 
    List, CheckCircle2, ChevronDown, Volume2, BookOpen, Layers,
    HelpCircle, Eye, EyeOff
} from 'lucide-react';
import QuestionContent from './QuestionContent';
import QuestionEditModal from './QuestionEditModal';
import QuestionExplanationCard from './QuestionExplanationCard';
import InteractiveReadingPassage from './InteractiveReadingPassage';
import HandwritingCanvas from '../ui/HandwritingCanvas';
import ExamAnnotationOverlay from '../screens/ExamAnnotationOverlay';
import { SECTION_ICONS, SECTION_COLORS } from './jlptConstants';

export const hasHtmlTags = (str) => {
    if (!str) return false;
    return /<\/?[a-z][\s\S]*>/i.test(str);
};

export const getCleanClassName = (baseClass, text) => {
    if (hasHtmlTags(text)) {
        return baseClass;
    }
    return `${baseClass} whitespace-pre-line`;
};

const getSectionDisplayInfo = (sec, idx) => {
    const type = (sec?.type || '').toLowerCase();
    const title = sec?.title || '';
    
    if (type === 'vocabulary' || type === 'kanji' || title.includes('文字') || title.includes('語彙') || title.toLowerCase().includes('từ vựng') || title.toLowerCase().includes('chữ')) {
        return {
            id: 'vocab',
            ja: '文字・語彙',
            vi: 'Chữ · Từ vựng',
            fullLabel: '文字・語彙 · Chữ · Từ vựng',
            icon: SECTION_ICONS.vocabulary || BookOpen,
            color: 'blue'
        };
    }
    if (type === 'grammar' || title.includes('文法') || title.toLowerCase().includes('ngữ pháp')) {
        return {
            id: 'grammar',
            ja: '文法',
            vi: 'Ngữ pháp',
            fullLabel: '文法 · Ngữ pháp',
            icon: SECTION_ICONS.grammar || BookOpen,
            color: 'sky'
        };
    }
    if (type === 'reading' || title.includes('読解') || title.toLowerCase().includes('đọc hiểu')) {
        return {
            id: 'reading',
            ja: '読解',
            vi: 'Đọc hiểu',
            fullLabel: '読解 · Đọc hiểu',
            icon: SECTION_ICONS.reading || FileText,
            color: 'emerald'
        };
    }
    if (type === 'listening' || title.includes('聴解') || title.toLowerCase().includes('nghe hiểu')) {
        return {
            id: 'listening',
            ja: '聴解',
            vi: 'Nghe hiểu',
            fullLabel: '聴解 · Nghe hiểu',
            icon: SECTION_ICONS.listening || Volume2,
            color: 'amber'
        };
    }
    return {
        id: `sec_${idx}`,
        ja: title.split('·')[0]?.trim() || `Phần ${idx + 1}`,
        vi: title.split('·')[1]?.trim() || title,
        fullLabel: title || `Phần thi ${idx + 1}`,
        icon: SECTION_ICONS[type] || FileText,
        color: SECTION_COLORS[type] || 'indigo'
    };
};

const JLPTTestResultView = ({
    activeTest,
    showDetailedReview,
    setShowDetailedReview,
    currentSectionIdx,
    currentQuestionIdx,
    answers = {},
    results,
    passed,
    wasRealExam,
    timeTaken,
    formatTime,
    exitTest,
    startTest,
    retakeTest,
    goToQuestion,
    nextQuestion,
    prevQuestion,
    canEdit,
    handleToggleTestFixed,
    showSettingsMenu,
    setShowSettingsMenu,
    settingsMenuRef,
    showFurigana,
    setShowFurigana,
    furiganaColor,
    setFuriganaColor,
    furiganaStyleElement,
    isFullscreen,
    toggleFullscreen,
    containerRef,
    // Notes states
    notes = {},
    editingReviewNoteKey,
    setEditingReviewNoteKey,
    reviewNoteDraft,
    setReviewNoteDraft,
    reviewNoteTab,
    setReviewNoteTab,
    reviewDrawDraftStrokes,
    setReviewDrawDraftStrokes,
    reviewDrawDraftDataUrl,
    setReviewDrawDraftDataUrl,
    saveNotesMultiple,
    deleteNotesMultiple,
    // Admin Edit modal
    editingQuestionData,
    setEditingQuestionData,
    handleSaveQuestionHtml,
    handleStartPrint
}) => {
    const [selectedTabIdx, setSelectedTabIdx] = useState(currentSectionIdx || 0);
    const [showMobileTOC, setShowMobileTOC] = useState(false);
    const [activeNoteTarget, setActiveNoteTarget] = useState(null); // { sIdx, qIdx }
    const rightScrollContainerRef = useRef(null);

    const answerKey = (si, qi) => `s${si}_q${qi}`;
    const subAnswerKey = (si, qi, sqi) => `s${si}_q${qi}_sq${sqi}`;

    const activeSection = activeTest?.sections?.[selectedTabIdx] || activeTest?.sections?.[0];

    // Calculate total questions & total correct
    const { totalQ, correctCount, sectionStats } = useMemo(() => {
        let total = 0;
        let correct = 0;
        if (!activeTest?.sections) return { totalQ: 0, correctCount: 0, sectionStats: [] };

        const stats = activeTest.sections.map((sec, sIdx) => {
            let secTotal = 0;
            let secCorrect = 0;

            sec.questions?.forEach((q, qIdx) => {
                if (q.subQuestions && q.subQuestions.length > 0) {
                    q.subQuestions.forEach((sq, sqi) => {
                        total++;
                        secTotal++;
                        const userAns = answers[subAnswerKey(sIdx, qIdx, sqi)];
                        if (userAns === sq.correctAnswer) {
                            correct++;
                            secCorrect++;
                        }
                    });
                } else {
                    total++;
                    secTotal++;
                    const userAns = answers[answerKey(sIdx, qIdx)];
                    if (userAns === q.correctAnswer) {
                        correct++;
                        secCorrect++;
                    }
                }
            });

            const info = getSectionDisplayInfo(sec, sIdx);
            return {
                ...info,
                sectionIdx: sIdx,
                total: secTotal,
                correct: secCorrect,
                isAllCorrect: secTotal > 0 && secCorrect === secTotal
            };
        });

        return { totalQ: total, correctCount: correct, sectionStats: stats };
    }, [activeTest, answers]);

    const isQuestionCorrect = (sIdx, qIdx, q) => {
        if (q.subQuestions && q.subQuestions.length > 0) {
            return q.subQuestions.every((sq, sqi) => answers[subAnswerKey(sIdx, qIdx, sqi)] === sq.correctAnswer);
        }
        return answers[answerKey(sIdx, qIdx)] === q.correctAnswer;
    };

    // Scroll to specific question card
    const scrollToQuestion = (sIdx, qIdx) => {
        setSelectedTabIdx(sIdx);
        setShowMobileTOC(false);
        setTimeout(() => {
            const el = document.getElementById(`review-q-card-${sIdx}-${qIdx}`);
            if (el) {
                el.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }, 80);
    };

    // Notes container renderer
    const renderReviewNoteContainer = (si, qi) => {
        const noteKey = `${activeTest?.id}_s${si}_q${qi}`;
        const drawKey = `${noteKey}_draw`;
        const strokesKey = `${noteKey}_strokes`;

        const questionNote = notes[noteKey];
        const questionDraw = notes[drawKey];
        const hasAnyReviewNote = !!questionNote || !!questionDraw;
        const isEditingThisReviewNote = editingReviewNoteKey === noteKey;

        return (
            <div className="mt-4 border-t border-slate-100 dark:border-slate-800/80 pt-4 font-sans">
                {isEditingThisReviewNote ? (
                    <div className="bg-amber-50/40 dark:bg-amber-950/15 border border-amber-250/50 dark:border-amber-900/40 rounded-2xl p-4 space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                                <Edit3 className="w-3.5 h-3.5" /> Ghi chú & Lời phê cho câu này
                            </span>
                            <button onClick={() => setEditingReviewNoteKey(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="flex border-b border-slate-200 dark:border-slate-800">
                            <button
                                type="button"
                                onClick={() => setReviewNoteTab('text')}
                                className={`px-3.5 py-1.5 text-xs font-bold flex items-center gap-1.5 border-b-2 transition-all ${
                                    reviewNoteTab === 'text'
                                        ? 'border-amber-500 text-amber-700 dark:text-amber-400 font-black'
                                        : 'border-transparent text-slate-400 hover:text-slate-600'
                                }`}
                            >
                                <Edit3 className="w-3.5 h-3.5" /> Ghi chú chữ
                            </button>
                            <button
                                type="button"
                                onClick={() => setReviewNoteTab('draw')}
                                className={`px-3.5 py-1.5 text-xs font-bold flex items-center gap-1.5 border-b-2 transition-all ${
                                    reviewNoteTab === 'draw'
                                        ? 'border-amber-500 text-amber-700 dark:text-amber-400 font-black'
                                        : 'border-transparent text-slate-400 hover:text-slate-600'
                                }`}
                            >
                                <Pencil className="w-3.5 h-3.5" /> Bản viết tay
                            </button>
                        </div>

                        {reviewNoteTab === 'text' ? (
                            <textarea
                                value={reviewNoteDraft}
                                onChange={(e) => setReviewNoteDraft(e.target.value)}
                                placeholder="Nhập ghi chú hoặc phân tích thêm cho câu hỏi này..."
                                className="w-full min-h-[90px] p-3 border border-amber-250 dark:border-amber-800/60 rounded-xl text-xs bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 font-sans leading-relaxed"
                            />
                        ) : (
                            <div className="p-2 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-800/80">
                                <HandwritingCanvas
                                    initialStrokes={reviewDrawDraftStrokes}
                                    onChange={(strokes, dataUrl) => {
                                        setReviewDrawDraftStrokes(strokes);
                                        setReviewDrawDraftDataUrl(dataUrl);
                                    }}
                                    darkMode={document.documentElement.classList.contains('dark')}
                                />
                            </div>
                        )}

                        <div className="flex items-center justify-end gap-2">
                            <button 
                                type="button"
                                onClick={() => setEditingReviewNoteKey(null)}
                                className="px-3 py-1.5 text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl cursor-pointer"
                            >
                                Hủy
                            </button>
                            <button 
                                type="button"
                                onClick={() => {
                                    const updates = {};
                                    const deletes = [];
                                    if (reviewNoteDraft.trim()) { updates[noteKey] = reviewNoteDraft; } else { deletes.push(noteKey); }
                                    if (reviewDrawDraftDataUrl) { updates[drawKey] = reviewDrawDraftDataUrl; updates[strokesKey] = reviewDrawDraftStrokes; } else { deletes.push(drawKey); deletes.push(strokesKey); }
                                    if (Object.keys(updates).length > 0) { saveNotesMultiple(updates); }
                                    if (deletes.length > 0) { deleteNotesMultiple(deletes); }
                                    setEditingReviewNoteKey(null);
                                }}
                                className="px-4 py-1.5 text-xs font-black bg-[#f494bc] hover:bg-[#f6a0c5] text-slate-950 rounded-xl transition shadow-[0_3px_10px_rgba(244,148,188,0.35)] cursor-pointer"
                            >
                                Lưu ghi chú
                            </button>
                        </div>
                    </div>
                ) : (
                    <div>
                        {hasAnyReviewNote ? (
                            <div className="bg-rose-50/40 dark:bg-rose-950/15 border border-dashed border-rose-300 dark:border-rose-900/40 rounded-2xl p-4 shadow-xs relative animate-fade-in space-y-2.5">
                                <div className="flex items-center justify-between border-b border-rose-200/40 dark:border-rose-900/20 pb-2">
                                    <span className="text-rose-700 dark:text-rose-400 font-extrabold text-xs flex items-center gap-1.5 uppercase tracking-wider">
                                        <span>✍️</span> Lời phê / Ghi chú ôn tập
                                    </span>
                                    <div className="flex items-center gap-1.5">
                                        <button 
                                            onClick={() => {
                                                setReviewNoteDraft(questionNote || '');
                                                let strokes = [];
                                                try { strokes = notes[strokesKey] || []; } catch (e) {}
                                                setReviewDrawDraftStrokes(strokes);
                                                setReviewDrawDraftDataUrl(questionDraw || '');
                                                setReviewNoteTab(questionDraw ? 'draw' : 'text');
                                                setEditingReviewNoteKey(noteKey);
                                            }} 
                                            className="p-1.5 rounded-lg hover:bg-rose-100 dark:hover:bg-rose-900/40 text-rose-700 dark:text-rose-400 transition cursor-pointer"
                                            title="Sửa ghi chú"
                                        >
                                            <Edit3 className="w-3.5 h-3.5" />
                                        </button>
                                        <button 
                                            onClick={async () => {
                                                if (window.confirm("Bạn có muốn xóa ghi chú cho câu này?")) {
                                                    deleteNotesMultiple([noteKey, drawKey, strokesKey]);
                                                }
                                            }} 
                                            className="p-1.5 rounded-lg hover:bg-rose-100 dark:hover:bg-rose-900/40 text-rose-600 dark:text-rose-400 transition cursor-pointer"
                                            title="Xóa ghi chú"
                                        >
                                            <X className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    {questionNote && (
                                        <p className="text-xs sm:text-sm text-rose-900 dark:text-rose-200 font-sans italic whitespace-pre-line leading-relaxed pl-2 border-l-2 border-rose-300">
                                            "{questionNote.toString().normalize('NFC')}"
                                        </p>
                                    )}
                                    {questionDraw && (
                                        <div className="flex justify-center bg-white dark:bg-slate-900 p-2 rounded-xl border border-rose-100 dark:border-rose-900/30">
                                            <img 
                                                src={questionDraw} 
                                                alt="Ghi chú viết tay" 
                                                className="max-h-40 object-contain dark:invert-[0.1]" 
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <button 
                                onClick={() => {
                                    setReviewNoteDraft('');
                                    setReviewDrawDraftStrokes([]);
                                    setReviewDrawDraftDataUrl('');
                                    setReviewNoteTab('text');
                                    setEditingReviewNoteKey(noteKey);
                                }}
                                className="py-1.5 px-3 border border-dashed border-slate-300 dark:border-slate-700 hover:border-[#f494bc] rounded-xl flex items-center gap-1.5 text-slate-500 hover:text-slate-800 dark:hover:text-white font-bold text-xs transition cursor-pointer select-none"
                            >
                                <Edit3 className="w-3.5 h-3.5 text-[#db2777]" />
                                <span>Thêm ghi chú / Lời phê</span>
                            </button>
                        )}
                    </div>
                )}
            </div>
        );
    };

    // =========================================================================
    // VIEW 1: FULL CONTINUOUS QUESTIONS ROLL (XEM LẠI ĐỀ DẠNG SỔ CÂU HỎI XUỐNG)
    // =========================================================================
    if (showDetailedReview) {
        return (
            <div 
                ref={containerRef} 
                className="fixed inset-0 z-50 bg-[#FAFBFD] dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col overflow-hidden font-sans select-none-take"
            >
                {furiganaStyleElement}

                {/* 1. FIXED TOP BAR */}
                <header className="h-14 shrink-0 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-3.5 sm:px-6 flex items-center justify-between z-40 shadow-xs">
                    {/* Left: Back to Scorecard & Title info */}
                    <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
                        <button 
                            onClick={() => setShowDetailedReview(false)} 
                            className="p-1.5 sm:px-3 sm:py-1.5 text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white transition flex items-center gap-1.5 text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-xl cursor-pointer shrink-0 active:scale-95"
                            title="Quay lại bảng điểm"
                        >
                            <ChevronLeft className="w-4 h-4" />
                            <span>Bảng điểm</span>
                        </button>

                        <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs sm:text-sm font-black text-slate-900 dark:text-white truncate">
                                    {activeTest?.title} (Xem lại đáp án)
                                </span>
                                {activeTest?.level && (
                                    <span className="px-1.5 py-0.5 rounded-md text-[10px] font-black bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200/50 dark:border-indigo-800/40">
                                        {activeTest.level}
                                    </span>
                                )}
                                {canEdit && (
                                    <label className="hidden md:flex items-center gap-1 cursor-pointer select-none text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 px-2 py-0.5 rounded-md border border-emerald-200/40">
                                        <input 
                                            type="checkbox" 
                                            checked={!!activeTest?.isFixed} 
                                            onChange={(e) => handleToggleTestFixed && handleToggleTestFixed(e, activeTest)}
                                            className="w-3 h-3 rounded border-emerald-400 text-emerald-500 cursor-pointer"
                                        />
                                        <span>Đã sửa đề</span>
                                    </label>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Right Controls: Score Badge, Settings, Fullscreen */}
                    <div className="flex items-center gap-2 shrink-0">
                        {/* Score summary badge */}
                        <div className="px-2.5 sm:px-3 py-1 rounded-xl text-xs font-mono font-black flex items-center gap-1.5 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800 shadow-xs">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                            <span>{correctCount}/{totalQ} câu đúng ({results?.percentage ?? Math.round((correctCount / Math.max(1, totalQ)) * 100)}%)</span>
                        </div>

                        {/* Settings Menu */}
                        <div className="relative" ref={settingsMenuRef}>
                            <button 
                                onClick={() => setShowSettingsMenu(!showSettingsMenu)}
                                className={`p-1.5 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer ${showSettingsMenu ? 'bg-slate-100 dark:bg-slate-800' : ''}`}
                                title="Cài đặt Furigana"
                            >
                                <Settings className="w-4.5 h-4.5" />
                            </button>

                            {showSettingsMenu && (
                                <div className="absolute right-0 mt-2 w-72 bg-white/98 dark:bg-slate-900/98 backdrop-blur-lg border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-4 z-50 text-left space-y-4 animate-scale-in font-sans">
                                    <div className="flex items-center gap-1.5 border-b border-slate-100 dark:border-slate-800 pb-2">
                                        <Settings className="w-4 h-4 text-indigo-500" />
                                        <span className="font-black text-xs text-slate-800 dark:text-white uppercase tracking-wider">Cài đặt đề thi</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-xs font-bold text-slate-700 dark:text-slate-300">Hiển thị Furigana</p>
                                            <p className="text-[10px] text-slate-400 dark:text-slate-500">Bật/tắt phiên âm chữ Hán</p>
                                        </div>
                                        <button 
                                            onClick={() => setShowFurigana(!showFurigana)} 
                                            className={`relative inline-flex h-5 w-10 items-center rounded-full transition-colors focus:outline-none cursor-pointer ${showFurigana ? 'bg-[#f494bc]' : 'bg-gray-300 dark:bg-slate-700'}`}
                                        >
                                            <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-slate-950 transition-transform ${showFurigana ? 'translate-x-5.5' : 'translate-x-1'}`} />
                                        </button>
                                    </div>
                                    {showFurigana && (
                                        <div className="space-y-2 pt-1 border-t border-slate-100 dark:border-slate-800">
                                            <div>
                                                <p className="text-xs font-bold text-slate-700 dark:text-slate-300">Màu chữ Furigana</p>
                                                <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">Chọn màu cho phiên âm</p>
                                            </div>
                                            <div className="flex flex-wrap items-center gap-2">
                                                {[
                                                    { id: 'default', label: 'Mặc định', bgClass: 'bg-slate-400 dark:bg-slate-500' },
                                                    { id: 'red', label: 'Đỏ', bgClass: 'bg-red-500' },
                                                    { id: 'blue', label: 'Xanh', bgClass: 'bg-blue-500' },
                                                    { id: 'green', label: 'Lá', bgClass: 'bg-emerald-500' },
                                                    { id: 'sky', label: 'Xanh trời', bgClass: 'bg-sky-500' },
                                                    { id: 'orange', label: 'Cam', bgClass: 'bg-amber-500' }
                                                ].map(colorOpt => {
                                                    const isSelected = furiganaColor === colorOpt.id;
                                                    return (
                                                        <button
                                                            key={colorOpt.id}
                                                            onClick={() => setFuriganaColor(colorOpt.id)}
                                                            className={`w-6 h-6 rounded-full flex items-center justify-center text-white transition-all transform hover:scale-110 cursor-pointer ${colorOpt.bgClass} ${isSelected ? 'ring-2 ring-indigo-500 ring-offset-2 dark:ring-offset-slate-900 scale-105' : 'opacity-80'}`}
                                                            title={colorOpt.label}
                                                        >
                                                            {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Fullscreen Toggle */}
                        <button 
                            onClick={toggleFullscreen}
                            className="p-1.5 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                            title="Toàn màn hình"
                        >
                            {isFullscreen ? <Minimize className="w-4.5 h-4.5" /> : <Maximize className="w-4.5 h-4.5" />}
                        </button>
                    </div>
                </header>

                {/* 2. BODY SPLIT: FIXED LEFT SIDEBAR (TOC) + SCROLLABLE RIGHT QUESTIONS ROLL */}
                <div className="flex-1 flex overflow-hidden w-full relative">
                    
                    {/* LEFT SIDEBAR: Table of Contents */}
                    <aside className="hidden lg:flex flex-col w-72 xl:w-80 shrink-0 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 h-full overflow-hidden shadow-xs z-30 select-none">
                        {/* TOC Header */}
                        <div className="p-4 pb-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
                            <div className="flex items-center gap-2">
                                <List className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                                <h3 className="font-black text-sm text-slate-800 dark:text-white">一覧 · Mục lục đáp án</h3>
                            </div>
                            <span className="text-xs font-mono font-black px-2.5 py-0.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-lg border border-emerald-200/50">
                                {correctCount}/{totalQ} Đúng
                            </span>
                        </div>

                        {/* Progress Bar */}
                        <div className="px-4 py-2 shrink-0 border-b border-slate-100 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-900/50">
                            <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 mb-1">
                                <span>Tỷ lệ chính xác</span>
                                <span className="text-emerald-600 dark:text-emerald-400 font-mono">
                                    {results?.percentage ?? Math.round((correctCount / Math.max(1, totalQ)) * 100)}%
                                </span>
                            </div>
                            <div className="w-full bg-slate-200/80 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                                <div 
                                    className="bg-emerald-500 h-1.5 rounded-full transition-all duration-300"
                                    style={{ width: `${results?.percentage ?? Math.round((correctCount / Math.max(1, totalQ)) * 100)}%` }}
                                />
                            </div>
                        </div>

                        {/* Scrollable Questions Grid for all Sections */}
                        <div className="flex-1 overflow-y-auto p-3 space-y-4 custom-scrollbar">
                            {sectionStats.map((sec, sIdx) => {
                                const isCurrentTab = selectedTabIdx === sIdx;
                                const SecIcon = sec.icon || FileText;

                                return (
                                    <div key={sIdx} className={`rounded-2xl p-2.5 transition-all border ${
                                        isCurrentTab 
                                            ? 'bg-slate-50/90 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 shadow-xs' 
                                            : 'border-transparent hover:bg-slate-50/50 dark:hover:bg-slate-800/30'
                                    }`}>
                                        {/* Section Title Header */}
                                        <button
                                            onClick={() => {
                                                setSelectedTabIdx(sIdx);
                                                if (rightScrollContainerRef.current) {
                                                    rightScrollContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
                                                }
                                            }}
                                            className="w-full flex items-center justify-between text-left mb-2 group cursor-pointer"
                                        >
                                            <div className="flex items-center gap-1.5 min-w-0">
                                                <SecIcon className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-500" />
                                                <span className="text-xs font-extrabold text-slate-800 dark:text-slate-200 truncate">
                                                    {sec.ja}
                                                </span>
                                            </div>
                                            <span className="text-[10px] font-black px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">
                                                {sec.correct}/{sec.total} đúng
                                            </span>
                                        </button>

                                        {/* Question Grid Buttons */}
                                        <div className="grid grid-cols-5 gap-1.5">
                                            {activeTest?.sections?.[sIdx]?.questions?.map((q, qIdx) => {
                                                const correct = isQuestionCorrect(sIdx, qIdx, q);

                                                return (
                                                    <button
                                                        key={qIdx}
                                                        onClick={() => scrollToQuestion(sIdx, qIdx)}
                                                        className={`h-7.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center select-none active:scale-90 ${
                                                            correct
                                                                ? 'bg-emerald-500 text-white shadow-xs hover:bg-emerald-600 font-black'
                                                                : 'bg-rose-500 text-white shadow-xs hover:bg-rose-600 font-black'
                                                        }`}
                                                        title={`Câu ${qIdx + 1} (${correct ? 'Đúng' : 'Sai'})`}
                                                    >
                                                        {qIdx + 1}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Sidebar Footer with Action Buttons */}
                        <div className="p-3 border-t border-slate-100 dark:border-slate-800 shrink-0 bg-white dark:bg-slate-900 space-y-2">
                            <div className="flex items-center justify-around text-[10px] font-bold text-slate-500 dark:text-slate-400">
                                <div className="flex items-center gap-1.5">
                                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                                    <span>Đúng</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                                    <span>Sai</span>
                                </div>
                            </div>

                            <button
                                onClick={() => (retakeTest || startTest)(activeTest)}
                                className="w-full py-2.5 rounded-xl font-black text-xs bg-[#f494bc] hover:bg-[#f6a0c5] text-slate-950 transition flex items-center justify-center gap-1.5 shadow-[0_4px_14px_rgba(244,148,188,0.35)] cursor-pointer active:scale-95"
                            >
                                <RotateCcw className="w-3.5 h-3.5 stroke-[2.5]" />
                                <span>Làm lại bài này</span>
                            </button>
                        </div>
                    </aside>

                    {/* RIGHT SCROLLABLE QUESTIONS FEED ("SỔ CÂU HỎI XUỐNG") */}
                    <main 
                        ref={rightScrollContainerRef}
                        className="flex-1 h-full overflow-y-auto px-3.5 sm:px-6 md:px-8 py-4 sm:py-6 space-y-5 scroll-smooth custom-scrollbar relative"
                        id="jlpt-review-right-scroll-container"
                    >
                        <div className="max-w-4xl mx-auto space-y-5 pb-20">
                            
                            {/* 1. SECTION TABS & ACTION BAR */}
                            <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl sm:rounded-3xl p-3.5 sm:p-4.5 shadow-xs space-y-3">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-slate-100 dark:border-slate-800">
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => setShowMobileTOC(true)}
                                            className="lg:hidden px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-800 dark:text-slate-200 text-xs font-bold flex items-center gap-1.5 cursor-pointer shrink-0"
                                            title="Xem danh sách câu hỏi"
                                        >
                                            <List className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                                            <span>Mục lục</span>
                                        </button>
                                        <div>
                                            <h2 className="text-sm sm:text-base font-black text-slate-900 dark:text-white leading-snug">
                                                {activeSection?.title || activeTest?.title}
                                            </h2>
                                        </div>
                                    </div>
                                    <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                                        Kết quả: <strong className="text-emerald-600 dark:text-emerald-400">{correctCount}/{totalQ}</strong> câu đúng
                                    </div>
                                </div>

                                {/* 4 Section Tabs Horizontal Pills */}
                                <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5 scroll-smooth">
                                    {sectionStats.map((sec, sIdx) => {
                                        const isActive = selectedTabIdx === sIdx;
                                        return (
                                            <button
                                                key={sIdx}
                                                onClick={() => {
                                                    setSelectedTabIdx(sIdx);
                                                    if (rightScrollContainerRef.current) {
                                                        rightScrollContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
                                                    }
                                                }}
                                                className={`px-3.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all duration-200 flex items-center gap-2 cursor-pointer shrink-0 active:scale-95 ${
                                                    isActive
                                                        ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-md ring-2 ring-slate-900 dark:ring-white'
                                                        : 'bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                                                }`}
                                            >
                                                <span>{sec.ja}</span>
                                                <span className="opacity-70 text-[11px] sm:text-xs">· {sec.vi}</span>
                                                <span className={`text-[10px] font-extrabold px-1.5 py-0.2 rounded-md ${
                                                    isActive 
                                                        ? 'bg-white/20 dark:bg-slate-900/20 text-white dark:text-slate-900' 
                                                        : sec.isAllCorrect 
                                                            ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400' 
                                                            : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                                                }`}>
                                                    {sec.correct}/{sec.total}
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>

                                {/* Actions Bar */}
                                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                                    <button
                                        onClick={() => setShowDetailedReview(false)}
                                        className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition flex items-center gap-1.5 cursor-pointer active:scale-95"
                                    >
                                        <ChevronLeft className="w-3.5 h-3.5" />
                                        <span>Xem bảng điểm tổng kết</span>
                                    </button>

                                    <div className="flex items-center gap-2 flex-wrap">
                                        {handleStartPrint && (
                                            <button
                                                onClick={() => handleStartPrint(activeTest)}
                                                className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition flex items-center gap-1 cursor-pointer active:scale-95"
                                                title="In đề thi ra giấy hoặc PDF"
                                            >
                                                <Printer className="w-3.5 h-3.5" />
                                                <span>In đề</span>
                                            </button>
                                        )}

                                        <button
                                            onClick={() => (retakeTest || startTest)(activeTest)}
                                            className="px-4 py-1.5 rounded-xl text-xs font-black bg-[#f494bc] hover:bg-[#f6a0c5] text-slate-950 transition flex items-center gap-1.5 shadow-[0_4px_14px_rgba(244,148,188,0.35)] cursor-pointer active:scale-95"
                                        >
                                            <RotateCcw className="w-3.5 h-3.5" />
                                            <span>Làm lại</span>
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* 2. QUESTIONS STREAM (ROLL XUỐNG CÙNG GIẢI THÍCH CHI TIẾT) */}
                            <div className="space-y-5" id="jlpt-review-questions-stream-container">
                                {activeSection?.questions?.map((question, qIdx) => {
                                    const qKey = answerKey(selectedTabIdx, qIdx);
                                    const userChoice = answers[qKey];
                                    const isCorrect = isQuestionCorrect(selectedTabIdx, qIdx, question);
                                    const hasSub = question.subQuestions && question.subQuestions.length > 0;

                                    return (
                                        <div 
                                            key={qIdx}
                                            id={`review-q-card-${selectedTabIdx}-${qIdx}`}
                                            className={`bg-white dark:bg-slate-900 border rounded-2xl sm:rounded-3xl p-4 sm:p-6 transition-all duration-200 shadow-xs scroll-mt-28 sm:scroll-mt-32 ${
                                                isCorrect
                                                    ? 'border-emerald-200 dark:border-emerald-900/60'
                                                    : 'border-rose-200 dark:border-rose-900/60'
                                            }`}
                                        >
                                            {/* Question Card Header */}
                                            <div className="flex items-start justify-between gap-3 mb-4">
                                                <div className="flex items-start gap-3 min-w-0 flex-1">
                                                    {/* Number Badge */}
                                                    <span className={`w-7 h-7 sm:w-8 sm:h-8 rounded-xl font-black text-xs sm:text-sm flex items-center justify-center shrink-0 shadow-xs ${
                                                        isCorrect
                                                            ? 'bg-emerald-500 text-white'
                                                            : 'bg-rose-500 text-white'
                                                    }`}>
                                                        {qIdx + 1}
                                                    </span>

                                                    {/* Prompt & Status */}
                                                    <div className="min-w-0 flex-1 pt-0.5 space-y-1">
                                                        <div className="flex items-center gap-2">
                                                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider ${
                                                                isCorrect
                                                                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-400'
                                                                    : 'bg-rose-100 text-rose-700 dark:bg-rose-950/80 dark:text-rose-400'
                                                            }`}>
                                                                {isCorrect ? '✓ Đáp án đúng' : '✕ Đáp án sai'}
                                                            </span>
                                                        </div>
                                                        <div 
                                                            className={getCleanClassName("text-[16px] sm:text-[18px] font-medium text-slate-900 dark:text-slate-100 leading-relaxed font-japanese", question.question)} 
                                                            dangerouslySetInnerHTML={{ __html: question.question }} 
                                                        />
                                                    </div>
                                                </div>

                                                {/* Tools */}
                                                <div className="flex items-center gap-1.5 shrink-0">
                                                    {canEdit && setEditingQuestionData && (
                                                        <button
                                                            onClick={() => setEditingQuestionData({ question: question, sectionIdx: selectedTabIdx, questionIdx: qIdx })}
                                                            className="p-1.5 text-slate-400 hover:text-amber-500 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-950/30 transition cursor-pointer"
                                                            title="Sửa HTML câu hỏi"
                                                        >
                                                            <Edit3 className="w-3.5 h-3.5" />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Reading Passage if exists */}
                                            {(() => {
                                                const prevQ = qIdx > 0 ? activeSection?.questions?.[qIdx - 1] : null;
                                                const currentPassage = (question.passage || (activeSection?.passages && typeof question.passageIndex === 'number' ? activeSection.passages[question.passageIndex]?.passage : '') || question.passageData?.japanese || '').trim();
                                                const prevPassage = prevQ ? ((prevQ.passage || (activeSection?.passages && typeof prevQ.passageIndex === 'number' ? activeSection.passages[prevQ.passageIndex]?.passage : '') || prevQ.passageData?.japanese || '').trim()) : '';

                                                const isSamePassage = !!(currentPassage && prevPassage && currentPassage === prevPassage);
                                                const hasPassage = !!(question?.passageData || question?.passage || (activeSection?.passages && typeof question?.passageIndex === 'number'));

                                                if (!hasPassage) return null;

                                                if (isSamePassage) {
                                                    return (
                                                        <div className="mb-3.5 inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-indigo-50/80 dark:bg-indigo-950/40 text-xs font-bold text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/40">
                                                            <BookOpen className="w-3.5 h-3.5" />
                                                            <span>Câu hỏi cùng bài đọc ở trên ↑</span>
                                                        </div>
                                                    );
                                                }

                                                return (
                                                    <div className="mb-4">
                                                        <InteractiveReadingPassage
                                                            passageHtml={question.passage || (activeSection?.passages && typeof question?.passageIndex === 'number' ? activeSection.passages[question.passageIndex]?.passage : '')}
                                                            passageData={question.passageData || (activeSection?.passages && typeof question?.passageIndex === 'number' ? activeSection.passages[question.passageIndex]?.passageData : null)}
                                                            explanationText={question.explanation || question.detail}
                                                            question={question}
                                                        />
                                                    </div>
                                                );
                                            })()}

                                            {/* Multi-Question or Single Question Choices */}
                                            {hasSub ? (
                                                <div className="space-y-4 pl-0 sm:pl-3 border-l-0 sm:border-l-2 border-slate-100 dark:border-slate-800">
                                                    {question.subQuestions.map((sq, sqi) => {
                                                        const sqKey = subAnswerKey(selectedTabIdx, qIdx, sqi);
                                                        const subUserAns = answers[sqKey];
                                                        const subIsCorrect = subUserAns === sq.correctAnswer;

                                                        return (
                                                            <div key={sqi} className="p-3.5 rounded-2xl bg-slate-50/70 dark:bg-slate-950/40 border border-slate-200/80 dark:border-slate-800 space-y-3">
                                                                <div className="flex items-start gap-2">
                                                                    <span className={`w-6 h-6 rounded-lg text-xs font-black flex items-center justify-center shrink-0 ${
                                                                        subIsCorrect ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'
                                                                    }`}>
                                                                        {sqi + 1}
                                                                    </span>
                                                                    <div 
                                                                        className={getCleanClassName("text-sm sm:text-base font-medium text-slate-800 dark:text-slate-200 font-japanese leading-relaxed", sq.question)}
                                                                        dangerouslySetInnerHTML={{ __html: sq.question }}
                                                                    />
                                                                </div>

                                                                {/* Options Grid */}
                                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                                    {sq.options?.map((opt, optIdx) => {
                                                                        const isOptionCorrect = optIdx === sq.correctAnswer;
                                                                        const isUserPick = optIdx === subUserAns;

                                                                        let optClass = 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300';
                                                                        if (isOptionCorrect) {
                                                                            optClass = 'bg-emerald-50 dark:bg-emerald-950/50 border-2 border-emerald-500 text-emerald-900 dark:text-emerald-100 font-bold';
                                                                        } else if (isUserPick && !isOptionCorrect) {
                                                                            optClass = 'bg-rose-50 dark:bg-rose-950/50 border-2 border-rose-500 text-rose-900 dark:text-rose-100 font-bold';
                                                                        }

                                                                        return (
                                                                            <div
                                                                                key={optIdx}
                                                                                className={`p-3 rounded-xl border flex items-center justify-between gap-2 text-xs sm:text-sm font-japanese ${optClass}`}
                                                                            >
                                                                                <div className="flex items-center gap-2 min-w-0 flex-1">
                                                                                    <span className="font-bold text-xs opacity-70">
                                                                                        {String.fromCharCode(65 + optIdx)}.
                                                                                    </span>
                                                                                    <span dangerouslySetInnerHTML={{ __html: opt }} />
                                                                                </div>
                                                                                {isOptionCorrect && (
                                                                                    <span className="px-2 py-0.5 rounded text-[10px] font-black bg-emerald-500 text-white shrink-0">
                                                                                        Đáp án đúng
                                                                                    </span>
                                                                                )}
                                                                                {isUserPick && !isOptionCorrect && (
                                                                                    <span className="px-2 py-0.5 rounded text-[10px] font-black bg-rose-500 text-white shrink-0">
                                                                                        Bạn chọn
                                                                                    </span>
                                                                                )}
                                                                            </div>
                                                                        );
                                                                    })}
                                                                </div>

                                                                {/* Subquestion Explanation Card */}
                                                                <QuestionExplanationCard
                                                                    question={sq}
                                                                    options={sq.options || []}
                                                                    correctAnswer={sq.correctAnswer}
                                                                    userAnswer={subUserAns}
                                                                />
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            ) : (
                                                /* Single Question Choices */
                                                <div className="space-y-3">
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                                        {question.options?.map((opt, optIdx) => {
                                                            const isOptionCorrect = optIdx === question.correctAnswer;
                                                            const isUserPick = optIdx === userChoice;

                                                            let optClass = 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300';
                                                            if (isOptionCorrect) {
                                                                optClass = 'bg-emerald-50 dark:bg-emerald-950/50 border-2 border-emerald-500 text-emerald-900 dark:text-emerald-100 font-bold';
                                                            } else if (isUserPick && !isOptionCorrect) {
                                                                optClass = 'bg-rose-50 dark:bg-rose-950/50 border-2 border-rose-500 text-rose-900 dark:text-rose-100 font-bold';
                                                            }

                                                            return (
                                                                <div
                                                                    key={optIdx}
                                                                    className={`p-3.5 rounded-2xl border flex items-center justify-between gap-2.5 text-xs sm:text-sm font-japanese transition-all ${optClass}`}
                                                                >
                                                                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                                                        <span className="w-6 h-6 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-black text-xs flex items-center justify-center shrink-0">
                                                                            {String.fromCharCode(65 + optIdx)}
                                                                        </span>
                                                                        <div 
                                                                            className="leading-relaxed"
                                                                            dangerouslySetInnerHTML={{ __html: opt }} 
                                                                        />
                                                                    </div>
                                                                    {isOptionCorrect && (
                                                                        <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-emerald-500 text-white shrink-0">
                                                                            Đáp án đúng
                                                                        </span>
                                                                    )}
                                                                    {isUserPick && !isOptionCorrect && (
                                                                        <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-rose-500 text-white shrink-0">
                                                                            Bạn chọn
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            );
                                                        })}
                                                    </div>

                                                    {/* Full Explanation Card */}
                                                    <QuestionExplanationCard
                                                        question={question}
                                                        options={question.options || []}
                                                        correctAnswer={question.correctAnswer}
                                                        userAnswer={userChoice}
                                                    />
                                                </div>
                                            )}

                                            {/* Note & Teacher Correction Container */}
                                            {renderReviewNoteContainer(selectedTabIdx, qIdx)}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </main>
                </div>

                {/* Mobile TOC Drawer Modal */}
                {showMobileTOC && (
                    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex justify-end animate-fade-in lg:hidden">
                        <div className="w-80 max-w-[85vw] h-full bg-white dark:bg-slate-900 p-4 flex flex-col justify-between shadow-2xl">
                            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                                <h3 className="font-black text-sm">Danh sách câu hỏi</h3>
                                <button onClick={() => setShowMobileTOC(false)} className="p-1 rounded-lg">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            <div className="flex-1 overflow-y-auto py-3 space-y-4">
                                {sectionStats.map((sec, sIdx) => (
                                    <div key={sIdx} className="space-y-2">
                                        <div className="text-xs font-black text-slate-800 dark:text-white flex justify-between">
                                            <span>{sec.ja}</span>
                                            <span className="text-slate-400 font-mono">{sec.correct}/{sec.total} đúng</span>
                                        </div>
                                        <div className="grid grid-cols-5 gap-1.5">
                                            {activeTest?.sections?.[sIdx]?.questions?.map((q, qIdx) => {
                                                const correct = isQuestionCorrect(sIdx, qIdx, q);
                                                return (
                                                    <button
                                                        key={qIdx}
                                                        onClick={() => scrollToQuestion(sIdx, qIdx)}
                                                        className={`h-7.5 rounded-lg text-xs font-bold flex items-center justify-center ${
                                                            correct ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'
                                                        }`}
                                                    >
                                                        {qIdx + 1}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <button
                                onClick={() => setShowMobileTOC(false)}
                                className="w-full py-2.5 rounded-xl font-black text-xs bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                            >
                                Đóng
                            </button>
                        </div>
                    </div>
                )}

                {/* Admin HTML Edit Modal */}
                {editingQuestionData && (
                    <QuestionEditModal 
                        isOpen={!!editingQuestionData} 
                        onClose={() => setEditingQuestionData(null)} 
                        initialQuestion={editingQuestionData.question} 
                        onSave={handleSaveQuestionHtml} 
                    />
                )}
            </div>
        );
    }

    // =========================================================================
    // VIEW 2: SCORECARD SUMMARY VIEW
    // =========================================================================
    return (
        <div ref={containerRef} className="min-h-screen bg-[#FAFBFD] dark:bg-slate-950 p-4 md:p-8 font-sans animate-fade-in text-slate-900 dark:text-slate-100">
            {furiganaStyleElement}
            <div className="max-w-4xl mx-auto space-y-6">
                {/* Score Card Hero */}
                <div className={`bg-gradient-to-br ${passed ? 'from-emerald-600 via-teal-700 to-emerald-800' : 'from-rose-600 via-pink-700 to-rose-800'} rounded-3xl p-8 text-white text-center shadow-xl relative overflow-hidden`}>
                    <div className="w-20 h-20 mx-auto mb-3 rounded-3xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-inner">
                        {passed ? <Award className="w-10 h-10" /> : <AlertTriangle className="w-10 h-10" />}
                    </div>
                    <h2 className="text-2xl sm:text-3xl font-black mb-1">
                        {passed ? '🎉 Chúc mừng bạn đã vượt qua!' : '💪 Hãy tiếp tục cố gắng hơn!'}
                    </h2>
                    <div className="text-5xl sm:text-6xl font-black my-3 font-mono tracking-tight">
                        {results?.percentage ?? Math.round((correctCount / Math.max(1, totalQ)) * 100)}%
                    </div>
                    <p className="text-base sm:text-lg font-bold opacity-90">
                        {correctCount}/{totalQ} câu trả lời chính xác
                    </p>
                    <p className="text-xs opacity-80 mt-1">
                        {wasRealExam ? (
                            <>Thời gian hoàn thành: {formatTime(timeTaken)} / {activeTest.timeLimit} phút (Thi thực tế)</>
                        ) : (
                            <>Thời gian làm bài: {formatTime(timeTaken)} (Luyện tập)</>
                        )}
                    </p>
                </div>

                {/* Section Scores Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {sectionStats.map((sec, si) => {
                        const Icon = sec.icon || FileText;
                        const pct = sec.total > 0 ? Math.round((sec.correct / sec.total) * 100) : 0;

                        return (
                            <div key={si} className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3">
                                <div className="flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                                            <Icon className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <h4 className="font-extrabold text-xs sm:text-sm text-slate-900 dark:text-white">{sec.fullLabel}</h4>
                                        </div>
                                    </div>
                                    <span className="text-xs font-mono font-black text-slate-700 dark:text-slate-300">
                                        {sec.correct}/{sec.total} ({pct}%)
                                    </span>
                                </div>
                                <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                                    <div 
                                        className={`h-full rounded-full transition-all duration-500 ${pct >= 60 ? 'bg-emerald-500' : 'bg-rose-500'}`} 
                                        style={{ width: `${pct}%` }} 
                                    />
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                    <button 
                        onClick={exitTest} 
                        className="px-5 py-3 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-2xl text-xs font-bold border border-slate-200 dark:border-slate-700 transition cursor-pointer active:scale-95"
                    >
                        ← Về trang danh sách
                    </button>
                    <button 
                        onClick={() => (retakeTest || startTest)(activeTest)} 
                        className="px-5 py-3 bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white rounded-2xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer active:scale-95"
                    >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Làm lại đề này</span>
                    </button>
                    <button 
                        onClick={() => setShowDetailedReview(true)} 
                        className="px-6 py-3 bg-[#f494bc] hover:bg-[#f6a0c5] text-slate-950 font-black rounded-2xl text-xs sm:text-sm transition flex items-center gap-2 shadow-[0_4px_16px_rgba(244,148,188,0.4)] hover:shadow-[0_8px_24px_rgba(244,148,188,0.65)] cursor-pointer active:scale-95"
                    >
                        <BookOpen className="w-4 h-4" />
                        <span>Xem chi tiết đáp án & giải thích</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default JLPTTestResultView;
