import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
    X, Check, Settings, Maximize, Minimize, FileText, 
    Save, ChevronLeft, ChevronRight, Edit3, Pencil, 
    ShieldAlert, Play, BookOpen, Lock, Volume2, Printer, 
    RotateCcw, HelpCircle, Layers, Eye, EyeOff, 
    CheckCircle2, ChevronDown, List, AlertCircle, Zap
} from 'lucide-react';
import QuestionEditModal from './QuestionEditModal';
import HandwritingCanvas from '../ui/HandwritingCanvas';
import ExamAnnotationOverlay from '../screens/ExamAnnotationOverlay';
import InteractiveReadingPassage from './InteractiveReadingPassage';
import QuestionExplanationCard from './QuestionExplanationCard';
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

const JLPTTestTakeView = ({
    activeTest,
    currentSectionIdx,
    currentQuestionIdx,
    answers,
    selectAnswer,
    selectAnswerSub,
    audioRef,
    isRealExam,
    canEdit,
    onEditQuestion,
    submitTest,
    saveProgressAndExit,
    goToQuestion,
    nextQuestion,
    prevQuestion,
    isFirst,
    isLast,
    answeredCount,
    totalQ,
    globalIdx,
    timeRemaining,
    formatTime,
    showTimer,
    showFurigana,
    setShowFurigana,
    furiganaColor,
    setFuriganaColor,
    showSettingsMenu,
    setShowSettingsMenu,
    settingsMenuRef,
    furiganaStyleElement,
    isFullscreen,
    toggleFullscreen,
    containerRef,
    // Notes states
    notes,
    isEditingNote,
    setIsEditingNote,
    noteDraft,
    setNoteDraft,
    noteTab,
    setNoteTab,
    drawDraftStrokes,
    setDrawDraftStrokes,
    drawDraftDataUrl,
    setDrawDraftDataUrl,
    saveNotesMultiple,
    deleteNotesMultiple,
    showScratchpad,
    setShowScratchpad,
    // Modals & Handlers
    editingQuestionData,
    setEditingQuestionData,
    handleSaveQuestionHtml,
    showViolationWarning,
    setShowViolationWarning,
    violationCount,
    showFullscreenRequired,
    setShowFullscreenRequired,
    handleToggleTestFixed,
    handleStartPrint,
    setAnswers
}) => {
    const [selectedTabIdx, setSelectedTabIdx] = useState(currentSectionIdx || 0);
    const [showMobileTOC, setShowMobileTOC] = useState(false);
    const [showSubmitModal, setShowSubmitModal] = useState(false);
    const [showResetModal, setShowResetModal] = useState(false);
    const [activeNoteTarget, setActiveNoteTarget] = useState(null); // { sIdx, qIdx }
    const isInstantPracticeMode = !isRealExam; // Luyện tập: Hiện đáp án ngay | Thi thực tế: Tắt (chấm điểm sau khi nộp)

    const rightScrollContainerRef = useRef(null);

    // Sync tab when currentSectionIdx changes externally
    useEffect(() => {
        if (currentSectionIdx !== undefined && currentSectionIdx !== selectedTabIdx) {
            setSelectedTabIdx(currentSectionIdx);
        }
    }, [currentSectionIdx]);

    const activeSection = activeTest?.sections?.[selectedTabIdx] || activeTest?.sections?.[0];

    const answerKey = (si, qi) => `s${si}_q${qi}`;
    const subAnswerKey = (si, qi, sqi) => `s${si}_q${qi}_sq${sqi}`;

    const isQuestionAnswered = (si, qi, q) => {
        if (q.subQuestions && q.subQuestions.length > 0) {
            return q.subQuestions.every((_, sqi) => answers[subAnswerKey(si, qi, sqi)] !== undefined);
        }
        return answers[answerKey(si, qi)] !== undefined;
    };

    const getQuestionStatus = (si, qi, q) => {
        if (!isQuestionAnswered(si, qi, q)) return 'unanswered';
        if (!isInstantPracticeMode) return 'answered';

        if (q.subQuestions && q.subQuestions.length > 0) {
            const isAllCorrect = q.subQuestions.every((sq, sqi) => {
                const subAns = answers[subAnswerKey(si, qi, sqi)];
                const sqCorrect = typeof sq.correctAnswer === 'number' 
                    ? sq.correctAnswer 
                    : (typeof sq.answer === 'number' 
                        ? sq.answer 
                        : (typeof sq.correct === 'number' 
                            ? sq.correct 
                            : (typeof sq.correct === 'string' && sq.options 
                                ? sq.options.findIndex(o => o.trim() === sq.correct.trim()) 
                                : -1)));
                return sqCorrect !== -1 && subAns === sqCorrect;
            });
            return isAllCorrect ? 'correct' : 'wrong';
        }

        const userAns = answers[answerKey(si, qi)];
        const correctIdx = typeof q.correctAnswer === 'number' 
            ? q.correctAnswer 
            : (typeof q.answer === 'number' 
                ? q.answer 
                : (typeof q.correct === 'number' 
                    ? q.correct 
                    : (typeof q.correct === 'string' && q.options 
                        ? q.options.findIndex(o => o.trim() === q.correct.trim()) 
                        : -1)));
        
        if (correctIdx !== -1 && userAns === correctIdx) {
            return 'correct';
        }
        return 'wrong';
    };

    // Calculate section stats
    const sectionStats = useMemo(() => {
        if (!activeTest?.sections) return [];
        return activeTest.sections.map((sec, sIdx) => {
            let total = 0;
            let answered = 0;
            sec.questions?.forEach((q, qIdx) => {
                if (q.subQuestions && q.subQuestions.length > 0) {
                    q.subQuestions.forEach((_, sqi) => {
                        total++;
                        if (answers[subAnswerKey(sIdx, qIdx, sqi)] !== undefined) answered++;
                    });
                } else {
                    total++;
                    if (answers[answerKey(sIdx, qIdx)] !== undefined) answered++;
                }
            });
            const info = getSectionDisplayInfo(sec, sIdx);
            return {
                ...info,
                sectionIdx: sIdx,
                total,
                answered,
                isComplete: total > 0 && answered === total
            };
        });
    }, [activeTest, answers]);

    // Scroll to specific question card
    const scrollToQuestion = (sIdx, qIdx) => {
        setSelectedTabIdx(sIdx);
        if (goToQuestion) goToQuestion(sIdx, qIdx);
        setShowMobileTOC(false);
        setTimeout(() => {
            const el = document.getElementById(`q-card-${sIdx}-${qIdx}`);
            if (el) {
                el.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }, 80);
    };

    // Reset test answers
    const handleResetAnswers = () => {
        if (setAnswers) {
            setAnswers({});
        }
        setShowResetModal(false);
    };

    // Notes helpers for a specific question
    const getQuestionNoteKey = (sIdx, qIdx) => `${activeTest?.id}_s${sIdx}_q${qIdx}`;
    const getQuestionDrawKey = (sIdx, qIdx) => `${getQuestionNoteKey(sIdx, qIdx)}_draw`;
    const getQuestionStrokesKey = (sIdx, qIdx) => `${getQuestionNoteKey(sIdx, qIdx)}_strokes`;

    return (
        <div 
            ref={containerRef} 
            className="fixed inset-0 z-50 bg-[#FAFBFD] dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col overflow-hidden font-sans select-none-take"
            style={{ WebkitOverflowScrolling: 'touch' }}
        >
            {furiganaStyleElement}

            {/* 1. FIXED TOP BAR */}
            <header className="h-14 shrink-0 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-3.5 sm:px-6 flex items-center justify-between z-40 shadow-xs">
                {/* Left: Back & Title info */}
                <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
                    <button 
                        onClick={saveProgressAndExit} 
                        className="p-1.5 sm:px-3 sm:py-1.5 text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white transition flex items-center gap-1.5 text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-xl cursor-pointer shrink-0 active:scale-95"
                        title="Lưu tiến trình và thoát"
                    >
                        <ChevronLeft className="w-4 h-4" />
                        <span className="hidden sm:inline">Thoát</span>
                    </button>

                    <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs sm:text-sm font-black text-slate-900 dark:text-white truncate">
                                {activeTest?.title}
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

                {/* Right Controls: Timer, Scratchpad, Settings, Fullscreen */}
                <div className="flex items-center gap-2 shrink-0">
                    {/* Timer */}
                    {isRealExam && showTimer && (
                        <div className={`px-2.5 sm:px-3 py-1 rounded-xl text-xs font-mono font-black flex items-center gap-1.5 shadow-xs ${
                            timeRemaining < 300
                                ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400 animate-pulse border border-rose-300'
                                : 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800'
                        }`}>
                            <span>⏱️</span>
                            <span>{formatTime(timeRemaining)}</span>
                        </div>
                    )}

                    {/* Scratchpad Toggle */}
                    <button
                        type="button"
                        onClick={() => setShowScratchpad(!showScratchpad)}
                        className={`px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95 ${
                            showScratchpad
                                ? 'bg-amber-500 text-white shadow-amber-500/20'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                        }`}
                        title="Bật bảng vẽ tay nháp"
                    >
                        <Pencil className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Bảng nháp</span>
                    </button>

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
                            <div className="absolute right-0 mt-2 w-72 bg-white/98 dark:bg-slate-900/98 backdrop-blur-lg border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-4 z-50 text-left space-y-4 animate-scale-in">
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
                                        className={`relative inline-flex h-5 w-10 items-center rounded-full transition-colors focus:outline-none cursor-pointer ${showFurigana ? 'bg-indigo-600' : 'bg-gray-300 dark:bg-slate-700'}`}
                                    >
                                        <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${showFurigana ? 'translate-x-5.5' : 'translate-x-1'}`} />
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

            {/* 2. BODY SPLIT: FIXED LEFT SIDEBAR (FIT ENTIRE LEFT) + SCROLLABLE RIGHT QUESTIONS ROLL */}
            <div className="flex-1 min-h-0 flex overflow-hidden w-full relative">
                
                {/* LEFT SIDEBAR: Table of Contents (FIT TO LEFT, NEVER SCROLLS AWAY) */}
                <aside className="hidden lg:flex flex-col w-72 xl:w-80 shrink-0 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 h-full overflow-hidden shadow-xs z-30 select-none">
                    {/* TOC Header */}
                    <div className="p-4 pb-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
                        <div className="flex items-center gap-2">
                            <List className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                            <h3 className="font-black text-sm text-slate-800 dark:text-white">一覧 · Mục lục</h3>
                        </div>
                        <span className="text-xs font-mono font-black px-2.5 py-0.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-lg border border-emerald-200/50">
                            {answeredCount}/{totalQ}
                        </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="px-4 py-2 shrink-0 border-b border-slate-100 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-900/50">
                        <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 mb-1">
                            <span>Tiến độ hoàn thành</span>
                            <span className="text-emerald-600 dark:text-emerald-400 font-mono">{Math.round(totalQ > 0 ? (answeredCount / totalQ) * 100 : 0)}%</span>
                        </div>
                        <div className="w-full bg-slate-200/80 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                            <div 
                                className="bg-emerald-500 h-1.5 rounded-full transition-all duration-300"
                                style={{ width: `${totalQ > 0 ? (answeredCount / totalQ) * 100 : 0}%` }}
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
                                            {sec.answered}/{sec.total}
                                        </span>
                                    </button>

                                    {/* Question Grid Buttons */}
                                    <div className="grid grid-cols-5 gap-1.5">
                                        {activeTest?.sections?.[sIdx]?.questions?.map((q, qIdx) => {
                                            const status = getQuestionStatus(sIdx, qIdx, q);
                                            const isFocused = isCurrentTab && currentQuestionIdx === qIdx;

                                            let btnClass = 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-slate-400 dark:hover:border-slate-500';
                                            if (status === 'correct') {
                                                btnClass = 'bg-emerald-500 text-white shadow-xs hover:bg-emerald-600 font-black';
                                            } else if (status === 'wrong') {
                                                btnClass = 'bg-rose-500 text-white shadow-xs hover:bg-rose-600 font-black';
                                            } else if (status === 'answered') {
                                                btnClass = 'bg-emerald-500 text-white shadow-xs hover:bg-emerald-600 font-black';
                                            } else if (isFocused) {
                                                btnClass = 'bg-indigo-600 text-white ring-2 ring-indigo-300 dark:ring-indigo-700 font-black';
                                            }

                                            return (
                                                <button
                                                    key={qIdx}
                                                    onClick={() => scrollToQuestion(sIdx, qIdx)}
                                                    className={`h-7.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center select-none active:scale-90 ${btnClass}`}
                                                    title={`Câu ${qIdx + 1} (${status === 'correct' ? 'Đúng' : status === 'wrong' ? 'Sai' : status === 'answered' ? 'Đã làm' : 'Chưa làm'})`}
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

                    {/* Sidebar Footer with Submit Button */}
                    <div className="p-3 border-t border-slate-100 dark:border-slate-800 shrink-0 bg-white dark:bg-slate-900 space-y-2.5">
                        <div className="flex items-center justify-around text-[10px] font-bold text-slate-500 dark:text-slate-400">
                            <div className="flex items-center gap-1.5">
                                <span className="w-2.5 h-2.5 rounded-full border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800" />
                                <span>Chưa làm</span>
                            </div>
                            {isInstantPracticeMode ? (
                                <>
                                    <div className="flex items-center gap-1.5">
                                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                                        <span>Đúng</span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                                        <span>Sai</span>
                                    </div>
                                </>
                            ) : (
                                <div className="flex items-center gap-1.5">
                                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                                    <span>Đã làm</span>
                                </div>
                            )}
                        </div>

                        <button
                            onClick={() => setShowSubmitModal(true)}
                            className="w-full py-2.5 rounded-xl font-black text-xs bg-[#f494bc] hover:bg-[#f6a0c5] text-slate-950 transition flex items-center justify-center gap-1.5 shadow-[0_4px_14px_rgba(244,148,188,0.35)] cursor-pointer active:scale-95"
                        >
                            <Check className="w-4 h-4 stroke-[3]" />
                            <span>Nộp bài ({answeredCount}/{totalQ})</span>
                        </button>
                    </div>
                </aside>

                {/* RIGHT SCROLLABLE QUESTIONS FEED ("ROLL XUỐNG") */}
                <main 
                    ref={rightScrollContainerRef}
                    className="flex-1 min-h-0 h-full overflow-y-auto px-3.5 sm:px-6 md:px-8 py-4 sm:py-6 space-y-5 scroll-smooth custom-scrollbar relative overscroll-y-contain"
                    style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-y' }}
                    id="jlpt-take-right-scroll-container"
                >
                    <div className="max-w-4xl mx-auto space-y-5 pb-36 sm:pb-28">
                        
                        {/* 1. SECTION TABS & ACTION BAR (SCROLLS NATURALLY WITH QUESTIONS) */}
                        <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl sm:rounded-3xl p-3.5 sm:p-4.5 shadow-xs space-y-3">
                            {/* Title and Subtitle */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-slate-100 dark:border-slate-800">
                                <div className="flex items-center gap-2">
                                    {/* Mobile Quick TOC Button */}
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
                                    {totalQ} câu · Tự chấm điểm · Tra từ vựng
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
                                                    : sec.isComplete 
                                                        ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400' 
                                                        : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                                            }`}>
                                                {sec.answered}/{sec.total}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Actions Bar */}
                            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                                <div className="text-xs font-bold text-slate-600 dark:text-slate-300">
                                    Đã làm <strong className="text-emerald-600 dark:text-emerald-400">{answeredCount}/{totalQ}</strong> câu
                                </div>

                                <div className="flex items-center gap-2 flex-wrap">
                                    <button
                                        onClick={() => setShowResetModal(true)}
                                        className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition flex items-center gap-1 cursor-pointer active:scale-95"
                                        title="Làm lại từ đầu"
                                    >
                                        <RotateCcw className="w-3.5 h-3.5" />
                                        <span>Làm lại</span>
                                    </button>

                                    {handleStartPrint && (
                                        <button
                                            onClick={handleStartPrint}
                                            className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition flex items-center gap-1 cursor-pointer active:scale-95"
                                            title="In đề thi ra giấy hoặc PDF"
                                        >
                                            <Printer className="w-3.5 h-3.5" />
                                            <span>In đề</span>
                                        </button>
                                    )}

                                    <button
                                        onClick={() => setShowSubmitModal(true)}
                                        className="px-4 py-1.5 rounded-xl text-xs font-black bg-[#f494bc] hover:bg-[#f6a0c5] text-slate-950 transition flex items-center gap-1.5 shadow-[0_4px_14px_rgba(244,148,188,0.35)] cursor-pointer active:scale-95"
                                        title="Nộp bài thi"
                                    >
                                        <Check className="w-4 h-4 stroke-[3]" />
                                        <span>Nộp bài</span>
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* 2. EXAM ANNOTATION / SCRATCHPAD OVERLAY */}
                        {showScratchpad && (
                            <div className="rounded-2xl border-2 border-amber-300 dark:border-amber-700 p-3 bg-amber-50/20 dark:bg-amber-950/10">
                                <ExamAnnotationOverlay
                                    testId={activeTest?.id}
                                    sectionIdx={selectedTabIdx}
                                    questionIdx={currentQuestionIdx}
                                    isEnabled={showScratchpad}
                                />
                            </div>
                        )}

                        {/* 3. QUESTIONS STREAM (ROLL XUỐNG) */}
                        <div className="space-y-4 sm:space-y-5" id="jlpt-questions-stream-container">
                            {activeSection?.questions?.map((question, qIdx) => {
                                const qKey = answerKey(selectedTabIdx, qIdx);
                                const selectedOpt = answers[qKey];
                                const isAnswered = isQuestionAnswered(selectedTabIdx, qIdx, question);
                                const nKey = getQuestionNoteKey(selectedTabIdx, qIdx);
                                const dKey = getQuestionDrawKey(selectedTabIdx, qIdx);
                                const sKey = getQuestionStrokesKey(selectedTabIdx, qIdx);
                                const hasTextNote = !!notes?.[nKey];
                                const hasDrawNote = !!notes?.[dKey];
                                const isNoteOpen = activeNoteTarget?.sIdx === selectedTabIdx && activeNoteTarget?.qIdx === qIdx;

                                return (
                                    <div 
                                        key={qIdx}
                                        id={`q-card-${selectedTabIdx}-${qIdx}`}
                                        className={`bg-white dark:bg-slate-900 border rounded-2xl sm:rounded-3xl p-4 sm:p-6 transition-all duration-200 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 scroll-mt-28 sm:scroll-mt-32 ${
                                            isAnswered 
                                                ? 'border-slate-200 dark:border-slate-800' 
                                                : 'border-slate-200/90 dark:border-slate-800'
                                        }`}
                                    >
                                        {/* Question Card Header */}
                                        <div className="flex items-start justify-between gap-3 mb-4">
                                            <div className="flex items-start gap-3 min-w-0 flex-1">
                                                {/* Number Badge */}
                                                {(() => {
                                                    const qStatus = getQuestionStatus(selectedTabIdx, qIdx, question);
                                                    return (
                                                        <span className={`w-7 h-7 sm:w-8 sm:h-8 rounded-xl font-black text-xs sm:text-sm flex items-center justify-center shrink-0 shadow-xs transition-colors ${
                                                            qStatus === 'correct'
                                                                ? 'bg-emerald-500 text-white'
                                                                : qStatus === 'wrong'
                                                                    ? 'bg-rose-500 text-white'
                                                                    : isAnswered
                                                                        ? 'bg-emerald-500 text-white'
                                                                        : 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                                                        }`}>
                                                            {qIdx + 1}
                                                        </span>
                                                    );
                                                })()}

                                                {/* Question Prompt Text */}
                                                <div className="min-w-0 flex-1 pt-0.5">
                                                    <div 
                                                        className={getCleanClassName("text-[16px] sm:text-[18px] font-medium text-slate-900 dark:text-slate-100 leading-relaxed font-japanese", question.question)} 
                                                        dangerouslySetInnerHTML={{ __html: question.question }} 
                                                    />
                                                </div>
                                            </div>

                                            {/* Right Tools on Question */}
                                            <div className="flex items-center gap-1.5 shrink-0">
                                                {canEdit && onEditQuestion && (
                                                    <button
                                                        onClick={() => onEditQuestion(question, selectedTabIdx, qIdx)}
                                                        className="p-1.5 text-slate-400 hover:text-amber-500 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-950/30 transition cursor-pointer"
                                                        title="Sửa HTML câu hỏi"
                                                    >
                                                        <Edit3 className="w-3.5 h-3.5" />
                                                    </button>
                                                )}

                                                <button
                                                    onClick={() => {
                                                        if (isNoteOpen) {
                                                            setActiveNoteTarget(null);
                                                        } else {
                                                            setNoteDraft(notes?.[nKey] || '');
                                                            let strokes = [];
                                                            try { strokes = notes?.[sKey] || []; } catch(e) {}
                                                            setDrawDraftStrokes(strokes);
                                                            setDrawDraftDataUrl(notes?.[dKey] || '');
                                                            setNoteTab(notes?.[dKey] ? 'draw' : 'text');
                                                            setActiveNoteTarget({ sIdx: selectedTabIdx, qIdx });
                                                        }
                                                    }}
                                                    className={`p-1.5 rounded-lg transition text-xs font-bold flex items-center gap-1 cursor-pointer ${
                                                        hasTextNote || hasDrawNote
                                                            ? 'bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 border border-amber-300/50'
                                                            : 'text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                                                    }`}
                                                    title="Ghi chú cho câu hỏi này"
                                                >
                                                    <Pencil className="w-3.5 h-3.5" />
                                                    {(hasTextNote || hasDrawNote) && <span className="text-[10px] hidden sm:inline">Ghi chú</span>}
                                                </button>
                                            </div>
                                        </div>

                                        {/* Audio Player for Listening */}
                                        {activeSection?.type === 'listening' && question?.audioUrl && (
                                            <div className="mb-4 p-3.5 bg-orange-50/80 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-900/50 rounded-2xl flex items-center gap-3">
                                                <Volume2 className="w-5 h-5 text-orange-600 dark:text-orange-400 shrink-0" />
                                                <audio 
                                                    ref={audioRef} 
                                                    controls 
                                                    className="flex-1 h-9"
                                                    src={question.audioUrl} 
                                                    preload="auto"
                                                >
                                                    Trình duyệt không hỗ trợ audio.
                                                </audio>
                                            </div>
                                        )}

                                        {/* Reading Passage (Interactive Sentence Analysis & Audio) */}
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
                                                        passageHtml={question.passage || (activeSection?.passages && typeof question.passageIndex === 'number' ? activeSection.passages[question.passageIndex]?.passage : '')} 
                                                        passageData={question.passageData || (activeSection?.passages && typeof question.passageIndex === 'number' ? activeSection.passages[question.passageIndex]?.passageData : null)}
                                                        explanationText={question.explanation || question.detail}
                                                        question={question}
                                                    />
                                                </div>
                                            );
                                        })()}

                                        {/* Question Image */}
                                        {question?.imageUrl && (
                                            <div className="mb-4 max-w-xl mx-auto rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-white p-2 flex justify-center">
                                                <img src={question.imageUrl} alt="Hình ảnh câu hỏi" className="max-h-80 object-contain rounded-xl" />
                                            </div>
                                        )}

                                        {/* Options (Standard 4 Options: A, B, C, D) */}
                                        {(!question.subQuestions || question.subQuestions.length === 0) ? (
                                            <div>
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
                                                    {question.options?.map((opt, oi) => {
                                                        const isSelected = selectedOpt === oi;
                                                        const letter = String.fromCharCode(65 + oi);
                                                        
                                                        // Correct answer calculation
                                                        const correctIndex = typeof question.correctAnswer === 'number' 
                                                            ? question.correctAnswer 
                                                            : (typeof question.answer === 'number' 
                                                                ? question.answer 
                                                                : (typeof question.correct === 'number' 
                                                                    ? question.correct 
                                                                    : (typeof question.correct === 'string' 
                                                                        ? question.options?.findIndex(o => o.trim() === question.correct.trim()) 
                                                                        : -1)));

                                                        const isCorrectOpt = correctIndex !== -1 && oi === correctIndex;
                                                        const isWrongSelected = isSelected && !isCorrectOpt;

                                                        let optionStyle = 'bg-white dark:bg-slate-800/80 border-slate-200/90 dark:border-slate-750 text-slate-700 dark:text-slate-200 hover:border-slate-400 dark:hover:border-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800';

                                                        if (isInstantPracticeMode && selectedOpt !== undefined) {
                                                            if (isCorrectOpt) {
                                                                optionStyle = 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 text-emerald-800 dark:text-emerald-200 font-bold shadow-xs';
                                                            } else if (isWrongSelected) {
                                                                optionStyle = 'bg-rose-50 dark:bg-rose-950/40 border-rose-500 text-rose-800 dark:text-rose-200 font-bold shadow-xs';
                                                            } else {
                                                                optionStyle = 'bg-slate-50/60 dark:bg-slate-900/40 border-slate-200/50 dark:border-slate-800 text-slate-400 opacity-60';
                                                            }
                                                        } else if (isSelected) {
                                                            optionStyle = 'bg-indigo-50/90 dark:bg-indigo-950/40 border-indigo-600 dark:border-indigo-500 text-slate-900 dark:text-white shadow-xs font-bold';
                                                        }

                                                        return (
                                                            <button
                                                                key={oi}
                                                                type="button"
                                                                disabled={isInstantPracticeMode && selectedOpt !== undefined}
                                                                onClick={() => selectAnswer(selectedTabIdx, qIdx, oi)}
                                                                className={`p-3 sm:p-3.5 rounded-2xl text-left transition-all duration-150 flex items-center justify-between gap-3 border-2 select-none ${
                                                                    isInstantPracticeMode && selectedOpt !== undefined 
                                                                        ? 'cursor-default' 
                                                                        : 'cursor-pointer active:scale-[0.98]'
                                                                } ${optionStyle}`}
                                                            >
                                                                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                                                    <span className={`w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center shrink-0 transition-colors ${
                                                                        isInstantPracticeMode && selectedOpt !== undefined
                                                                            ? isCorrectOpt
                                                                                ? 'bg-emerald-600 text-white'
                                                                                : isWrongSelected
                                                                                    ? 'bg-rose-600 text-white'
                                                                                    : 'bg-slate-200 text-slate-500'
                                                                            : isSelected
                                                                                ? 'bg-indigo-600 text-white'
                                                                                : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-300/60 dark:border-slate-600'
                                                                    }`}>
                                                                        {letter}
                                                                    </span>
                                                                    <span 
                                                                        className={getCleanClassName("font-japanese text-[15px] sm:text-[16px] leading-relaxed", opt)} 
                                                                        dangerouslySetInnerHTML={{ __html: opt }} 
                                                                    />
                                                                </div>
                                                                {isInstantPracticeMode && selectedOpt !== undefined ? (
                                                                    isCorrectOpt ? (
                                                                        <span className="text-[11px] font-black text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950 px-2 py-0.5 rounded-md shrink-0">
                                                                            ✓ Đúng
                                                                        </span>
                                                                    ) : isWrongSelected ? (
                                                                        <span className="text-[11px] font-black text-rose-600 dark:text-rose-400 bg-rose-100 dark:bg-rose-950 px-2 py-0.5 rounded-md shrink-0">
                                                                            ✗ Sai
                                                                        </span>
                                                                    ) : null
                                                                ) : isSelected ? (
                                                                    <Check className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                                                                ) : null}
                                                            </button>
                                                        );
                                                    })}
                                                </div>

                                                {/* Instant Explanation Box with structured parsing */}
                                                {isInstantPracticeMode && selectedOpt !== undefined && (
                                                    <QuestionExplanationCard 
                                                        question={question}
                                                        options={question.options || []}
                                                        correctAnswer={
                                                            typeof question.correctAnswer === 'number' 
                                                                ? question.correctAnswer 
                                                                : (typeof question.answer === 'number' 
                                                                    ? question.answer 
                                                                    : (typeof question.correct === 'number' 
                                                                        ? question.correct 
                                                                        : (typeof question.correct === 'string' 
                                                                            ? question.options?.findIndex(o => o.trim() === question.correct.trim()) 
                                                                            : -1)))
                                                        }
                                                        userAnswer={selectedOpt}
                                                    />
                                                )}
                                            </div>
                                        ) : (
                                            /* SubQuestions */
                                            <div className="space-y-4 pl-2 sm:pl-4 border-l-2 border-indigo-200 dark:border-indigo-800/60 mt-2">
                                                {question.subQuestions.map((sq, sqi) => {
                                                    const subAnsKey = subAnswerKey(selectedTabIdx, qIdx, sqi);
                                                    const isSubSelected = answers[subAnsKey];
                                                    const sqCorrectIdx = typeof sq.correctAnswer === 'number' ? sq.correctAnswer : (typeof sq.answer === 'number' ? sq.answer : -1);

                                                    return (
                                                        <div key={sqi} className="space-y-3 p-3.5 bg-slate-50/60 dark:bg-slate-950/30 rounded-2xl border border-slate-100 dark:border-slate-800/80">
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-xs font-black px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300">
                                                                    {qIdx + 1}.{sqi + 1}
                                                                </span>
                                                                <h4 
                                                                    className={getCleanClassName("text-[15px] sm:text-[17px] font-medium text-slate-800 dark:text-slate-200 font-japanese", sq.question)} 
                                                                    dangerouslySetInnerHTML={{ __html: sq.question || `Câu hỏi phụ ${sqi + 1}:` }} 
                                                                />
                                                            </div>

                                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                                {sq.options?.map((opt, oi) => {
                                                                    const isSqOptSelected = isSubSelected === oi;
                                                                    const letter = String.fromCharCode(65 + oi);
                                                                    
                                                                    const isSqCorrect = sqCorrectIdx !== -1 && oi === sqCorrectIdx;
                                                                    const isSqWrong = isSqOptSelected && !isSqCorrect;

                                                                    let sqStyle = 'bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-750 text-slate-700 dark:text-slate-200 hover:border-slate-400 dark:hover:border-slate-500';

                                                                    if (isInstantPracticeMode && isSubSelected !== undefined) {
                                                                        if (isSqCorrect) sqStyle = 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 text-emerald-800 font-bold';
                                                                        else if (isSqWrong) sqStyle = 'bg-rose-50 dark:bg-rose-950/40 border-rose-500 text-rose-800 font-bold';
                                                                    } else if (isSqOptSelected) {
                                                                        sqStyle = 'bg-indigo-50/90 dark:bg-indigo-950/40 border-indigo-600 dark:border-indigo-500 text-slate-900 dark:text-white shadow-xs font-bold';
                                                                    }

                                                                    return (
                                                                        <button
                                                                            key={oi}
                                                                            type="button"
                                                                            disabled={isInstantPracticeMode && isSubSelected !== undefined}
                                                                            onClick={() => selectAnswerSub(selectedTabIdx, qIdx, sqi, oi)}
                                                                            className={`p-3 rounded-xl text-left transition-all duration-150 flex items-center justify-between gap-2.5 border-2 select-none ${
                                                                                isInstantPracticeMode && isSubSelected !== undefined 
                                                                                    ? 'cursor-default' 
                                                                                    : 'cursor-pointer active:scale-[0.98]'
                                                                            } ${sqStyle}`}
                                                                        >
                                                                            <div className="flex items-center gap-2 min-w-0 flex-1">
                                                                                <span className={`w-5.5 h-5.5 rounded-full text-xs font-bold flex items-center justify-center shrink-0 ${
                                                                                    isInstantPracticeMode && isSubSelected !== undefined
                                                                                        ? isSqCorrect
                                                                                            ? 'bg-emerald-600 text-white'
                                                                                            : isSqWrong
                                                                                                ? 'bg-rose-600 text-white'
                                                                                                : 'bg-slate-200 text-slate-500'
                                                                                        : isSqOptSelected
                                                                                            ? 'bg-indigo-600 text-white'
                                                                                            : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                                                                                }`}>
                                                                                    {letter}
                                                                                </span>
                                                                                <span 
                                                                                    className={getCleanClassName("font-japanese text-[14px] sm:text-[15px] leading-relaxed", opt)} 
                                                                                    dangerouslySetInnerHTML={{ __html: opt }} 
                                                                                />
                                                                            </div>
                                                                            {isInstantPracticeMode && isSubSelected !== undefined ? (
                                                                                isSqCorrect ? (
                                                                                    <span className="text-[11px] font-black text-emerald-600 bg-emerald-100 px-1.5 py-0.5 rounded shrink-0">✓ Đúng</span>
                                                                                ) : isSqWrong ? (
                                                                                    <span className="text-[11px] font-black text-rose-600 bg-rose-100 px-1.5 py-0.5 rounded shrink-0">✗ Sai</span>
                                                                                ) : null
                                                                            ) : isSqOptSelected ? (
                                                                                <Check className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                                                                            ) : null}
                                                                        </button>
                                                                    );
                                                                })}
                                                            </div>

                                                            {isInstantPracticeMode && isSubSelected !== undefined && (
                                                                <QuestionExplanationCard 
                                                                    question={sq}
                                                                    options={sq.options || []}
                                                                    correctAnswer={sqCorrectIdx}
                                                                    userAnswer={isSubSelected}
                                                                />
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}

                                        {/* Inline Note Editor Drawer */}
                                        {isNoteOpen && (
                                            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 space-y-3 bg-amber-50/30 dark:bg-amber-950/15 p-3.5 rounded-2xl border border-amber-200/50 dark:border-amber-900/40">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            type="button"
                                                            onClick={() => setNoteTab('text')}
                                                            className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                                                                noteTab === 'text'
                                                                    ? 'bg-amber-500 text-white'
                                                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                                                            }`}
                                                        >
                                                            Ghi chú chữ
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => setNoteTab('draw')}
                                                            className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                                                                noteTab === 'draw'
                                                                    ? 'bg-amber-500 text-white'
                                                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                                                            }`}
                                                        >
                                                            Viết tay nháp
                                                        </button>
                                                    </div>
                                                    <button onClick={() => setActiveNoteTarget(null)} className="p-1 text-slate-400 hover:text-slate-600">
                                                        <X className="w-4 h-4" />
                                                    </button>
                                                </div>

                                                {noteTab === 'text' ? (
                                                    <textarea
                                                        value={noteDraft}
                                                        onChange={(e) => setNoteDraft(e.target.value)}
                                                        placeholder="Nhập ghi chú cho câu hỏi này..."
                                                        className="w-full min-h-[80px] p-3 border border-amber-200 dark:border-amber-800/60 rounded-xl text-xs sm:text-sm bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                                                    />
                                                ) : (
                                                    <div className="p-1 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                                                        <HandwritingCanvas
                                                            initialStrokes={drawDraftStrokes}
                                                            onChange={(strokes, dataUrl) => {
                                                                setDrawDraftStrokes(strokes);
                                                                setDrawDraftDataUrl(dataUrl);
                                                            }}
                                                            darkMode={document.documentElement.classList.contains('dark')}
                                                        />
                                                    </div>
                                                )}

                                                <div className="flex items-center justify-end gap-2 pt-1">
                                                    <button
                                                        type="button"
                                                        onClick={() => setActiveNoteTarget(null)}
                                                        className="px-3 py-1 text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
                                                    >
                                                        Hủy
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            const updates = {};
                                                            const deletes = [];
                                                            if (noteDraft.trim()) { updates[nKey] = noteDraft; } else { deletes.push(nKey); }
                                                            if (drawDraftDataUrl) { updates[dKey] = drawDraftDataUrl; updates[sKey] = drawDraftStrokes; } else { deletes.push(dKey); deletes.push(sKey); }
                                                            if (Object.keys(updates).length > 0) { saveNotesMultiple(updates); }
                                                            if (deletes.length > 0) { deleteNotesMultiple(deletes); }
                                                            setActiveNoteTarget(null);
                                                        }}
                                                        className="px-4 py-1.5 text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white rounded-lg shadow-sm"
                                                    >
                                                        Lưu ghi chú
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        {/* BOTTOM SECTION NAVIGATION BUTTONS */}
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-6 pb-6 border-t border-slate-200 dark:border-slate-800">
                            {selectedTabIdx > 0 ? (
                                <button
                                    onClick={() => {
                                        const prevIdx = selectedTabIdx - 1;
                                        setSelectedTabIdx(prevIdx);
                                        if (rightScrollContainerRef.current) {
                                            rightScrollContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
                                        }
                                    }}
                                    className="w-full sm:w-auto px-5 py-3 rounded-2xl font-bold text-xs sm:text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition flex items-center justify-center gap-2 cursor-pointer shadow-xs active:scale-95"
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                    <span>Phần trước: {sectionStats[selectedTabIdx - 1]?.ja}</span>
                                </button>
                            ) : <div className="hidden sm:block" />}

                            {selectedTabIdx < (activeTest?.sections?.length || 1) - 1 ? (
                                <button
                                    onClick={() => {
                                        const nextIdx = selectedTabIdx + 1;
                                        setSelectedTabIdx(nextIdx);
                                        if (rightScrollContainerRef.current) {
                                            rightScrollContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
                                        }
                                    }}
                                    className="w-full sm:w-auto px-6 py-3 rounded-2xl font-black text-xs sm:text-sm bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 transition flex items-center justify-center gap-2 cursor-pointer shadow-md active:scale-95"
                                >
                                    <span>Phần tiếp theo: {sectionStats[selectedTabIdx + 1]?.ja}</span>
                                    <ChevronRight className="w-4 h-4" />
                                </button>
                            ) : (
                                <button
                                    onClick={() => setShowSubmitModal(true)}
                                    className="w-full sm:w-auto px-8 py-3.5 rounded-2xl font-black text-sm sm:text-base bg-[#f494bc] hover:bg-[#f6a0c5] text-slate-950 transition flex items-center justify-center gap-2 cursor-pointer shadow-xl shadow-[#f494bc]/30 active:scale-95"
                                >
                                    <Check className="w-5 h-5 stroke-[3]" />
                                    <span>Hoàn thành & Nộp bài</span>
                                </button>
                            )}
                        </div>
                    </div>
                </main>
            </div>

            {/* 3. FLOATING MOBILE CONTROLS BAR (< lg) */}
            <div className="lg:hidden fixed bottom-5 left-3.5 z-40 flex items-center pointer-events-none pb-[env(safe-area-inset-bottom,0px)]">
                <button
                    onClick={() => setShowMobileTOC(true)}
                    className="pointer-events-auto flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-slate-900/95 dark:bg-slate-800/95 text-white font-extrabold text-xs shadow-2xl backdrop-blur-md border border-slate-700/40 active:scale-90 transition-transform cursor-pointer"
                >
                    <List className="w-4 h-4 text-indigo-400" />
                    <span>Mục lục ({answeredCount}/{totalQ})</span>
                </button>
            </div>

            {/* 4. MOBILE TABLE OF CONTENTS DRAWER (Slide Up) */}
            {showMobileTOC && (
                <div className="lg:hidden fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex flex-col justify-end animate-fade-in font-sans">
                    <div className="bg-white dark:bg-slate-900 rounded-t-3xl border-t border-slate-200 dark:border-slate-800 p-5 max-h-[80vh] flex flex-col shadow-2xl animate-slide-up">
                        {/* Drawer Header */}
                        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                            <div className="flex items-center gap-2">
                                <List className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                                <h3 className="font-black text-sm text-slate-900 dark:text-white">一覧 · Danh sách câu hỏi</h3>
                            </div>
                            <button onClick={() => setShowMobileTOC(false)} className="p-1 text-slate-400 hover:text-slate-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Progress */}
                        <div className="py-3">
                            <div className="flex items-center justify-between text-xs font-bold mb-1.5 text-slate-600 dark:text-slate-300">
                                <span>Tiến độ làm bài</span>
                                <span className="text-emerald-600 dark:text-emerald-400 font-mono">{answeredCount}/{totalQ} ({Math.round(totalQ > 0 ? (answeredCount / totalQ) * 100 : 0)}%)</span>
                            </div>
                            <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                                <div className="bg-emerald-500 h-2 rounded-full transition-all" style={{ width: `${totalQ > 0 ? (answeredCount / totalQ) * 100 : 0}%` }} />
                            </div>
                        </div>

                        {/* Sections and Question Grid */}
                        <div className="flex-1 overflow-y-auto space-y-4 py-2 custom-scrollbar">
                            {sectionStats.map((sec, sIdx) => {
                                const isCurrentTab = selectedTabIdx === sIdx;
                                return (
                                    <div key={sIdx} className="bg-slate-50 dark:bg-slate-800/40 rounded-2xl p-3 border border-slate-100 dark:border-slate-800">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-xs font-black text-slate-800 dark:text-white">
                                                {sec.ja} · {sec.vi}
                                            </span>
                                            <span className="text-[11px] font-bold text-slate-500">
                                                {sec.answered}/{sec.total}
                                            </span>
                                        </div>
                                        <div className="grid grid-cols-6 gap-1.5">
                                            {activeTest?.sections?.[sIdx]?.questions?.map((q, qIdx) => {
                                                const status = getQuestionStatus(sIdx, qIdx, q);
                                                let btnClass = 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300';
                                                if (status === 'correct') {
                                                    btnClass = 'bg-emerald-500 text-white font-black';
                                                } else if (status === 'wrong') {
                                                    btnClass = 'bg-rose-500 text-white font-black';
                                                } else if (status === 'answered') {
                                                    btnClass = 'bg-emerald-500 text-white font-black';
                                                } else if (isCurrentTab && currentQuestionIdx === qIdx) {
                                                    btnClass = 'bg-indigo-600 text-white ring-2 ring-indigo-300';
                                                }

                                                return (
                                                    <button
                                                        key={qIdx}
                                                        onClick={() => scrollToQuestion(sIdx, qIdx)}
                                                        className={`h-8 rounded-lg text-xs font-bold flex items-center justify-center cursor-pointer transition select-none active:scale-90 ${btnClass}`}
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

                        {/* Drawer Submit Button */}
                        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex gap-2">
                            <button
                                onClick={() => {
                                    setShowMobileTOC(false);
                                    setShowSubmitModal(true);
                                }}
                                className="w-full py-2.5 bg-[#f494bc] hover:bg-[#f6a0c5] text-slate-950 font-black rounded-xl text-xs transition shadow-md shadow-[#f494bc]/30 cursor-pointer"
                            >
                                Nộp bài thi ({answeredCount}/{totalQ})
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* 5. CONFIRM SUBMIT MODAL */}
            {showSubmitModal && (
                <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in font-sans">
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-sm w-full shadow-2xl space-y-4 text-center">
                        <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
                            <CheckCircle2 className="w-7 h-7" />
                        </div>
                        <div>
                            <h3 className="text-lg font-black text-slate-900 dark:text-white">Xác nhận Nộp bài thi?</h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
                                Bạn đã hoàn thành <strong className="text-emerald-600 dark:text-emerald-400">{answeredCount}/{totalQ}</strong> câu hỏi.
                                {totalQ > answeredCount && (
                                    <span className="block text-amber-600 dark:text-amber-400 font-semibold mt-1">
                                        ⚠️ Còn {totalQ - answeredCount} câu chưa trả lời.
                                    </span>
                                )}
                            </p>
                        </div>

                        <div className="grid grid-cols-2 gap-2 pt-2">
                            <button
                                onClick={() => setShowSubmitModal(false)}
                                className="py-2.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition cursor-pointer"
                            >
                                Tiếp tục làm
                            </button>
                            <button
                                onClick={() => {
                                    setShowSubmitModal(false);
                                    submitTest();
                                }}
                                className="py-2.5 rounded-xl text-xs font-black bg-[#f494bc] hover:bg-[#f6a0c5] text-slate-950 transition shadow-[0_4px_14px_rgba(244,148,188,0.35)] cursor-pointer"
                            >
                                Nộp bài ngay
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* 6. CONFIRM RESET MODAL */}
            {showResetModal && (
                <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in font-sans">
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-sm w-full shadow-2xl space-y-4 text-center">
                        <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto">
                            <AlertCircle className="w-7 h-7" />
                        </div>
                        <div>
                            <h3 className="text-lg font-black text-slate-900 dark:text-white">Làm lại từ đầu?</h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
                                Thao tác này sẽ xóa tất cả {answeredCount} câu trả lời bạn đã chọn trong bài thi hiện tại.
                            </p>
                        </div>

                        <div className="grid grid-cols-2 gap-2 pt-2">
                            <button
                                onClick={() => setShowResetModal(false)}
                                className="py-2.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition cursor-pointer"
                            >
                                Giữ lại
                            </button>
                            <button
                                onClick={handleResetAnswers}
                                className="py-2.5 rounded-xl text-xs font-black bg-rose-600 hover:bg-rose-500 text-white transition shadow-md cursor-pointer"
                            >
                                Xóa & Làm lại
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* 7. EDITING QUESTION HTML MODAL */}
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
};

export default JLPTTestTakeView;
