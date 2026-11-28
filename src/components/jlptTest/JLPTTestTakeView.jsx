import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
    X, Check, Settings, Maximize, Minimize, FileText, 
    Save, ChevronLeft, ChevronRight, Edit3, Pencil, 
    ShieldAlert, Play, BookOpen, Lock, Volume2, Printer, 
    RotateCcw, HelpCircle, Layers, Eye, EyeOff, 
    CheckCircle2, ChevronDown, List, AlertCircle, Zap, FileCode, Wand2, Loader2
} from 'lucide-react';
import QuestionEditModal from './QuestionEditModal';
import HandwritingCanvas from '../ui/HandwritingCanvas';
import ExamAnnotationOverlay from '../screens/ExamAnnotationOverlay';
import InteractiveReadingPassage from './InteractiveReadingPassage';
import QuestionExplanationCard from './QuestionExplanationCard';
import ListeningAudioPlayer from './ListeningAudioPlayer';
import ListeningScriptBox from './ListeningScriptBox';
import PreloadedQuestionImage from './PreloadedQuestionImage';
import AiImageRecreatorModal from '../admin/AiImageRecreatorModal';
import { ListeningMondaiFilterBar, ListeningMondaiSectionBanner } from './ListeningMondaiHeader';
import { SECTION_ICONS, SECTION_COLORS } from './jlptConstants';
import { getListeningDisplayMeta, groupQuestionsByMondai, isBareNumberOptions, buildSectionDisplayClusters, resolveSharedMondaiAudioUrl, resolveQuestionMondai } from './jlptYearlyConstants';
import { aiAnalyzeReadingPassage, aiBatchAnalyzeReadingSections, hasRichReadingAnalysis } from '../../services/ai/jlptExplanationAiService';
import { preloadTestImages } from '../../utils/jlptMediaPreloader';
import { showToast } from '../../utils/toast';

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
        color: SECTION_COLORS[type] || 'emerald'
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
    onSaveSections = null,
    submitTest,
    exitTest,
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
    setShowQuestionSearchModal,
    onOpenExportImport,
    onEditTest,
    setAnswers,
    examPhases = [],
    currentPhaseIdx = 0,
    onAdvancePhase = null,
    onSaveQuestionImage = null
}) => {
    const [selectedTabIdx, setSelectedTabIdx] = useState(currentSectionIdx || 0);
    const [selectedMondaiFilter, setSelectedMondaiFilter] = useState('');
    const [showMobileTOC, setShowMobileTOC] = useState(false);
    const [showSubmitModal, setShowSubmitModal] = useState(false);
    const [showExitModal, setShowExitModal] = useState(false);
    const [showResetModal, setShowResetModal] = useState(false);
    const [showAdvancePhaseModal, setShowAdvancePhaseModal] = useState(false);
    const [aiImageTarget, setAiImageTarget] = useState(null);
    const [activeNoteTarget, setActiveNoteTarget] = useState(null); // { sIdx, qIdx }
    const [openScriptKeys, setOpenScriptKeys] = useState({});
    const [analyzingPassageKey, setAnalyzingPassageKey] = useState('');
    const [localPassageDataMap, setLocalPassageDataMap] = useState({});
    const [batchAnalyzeProgress, setBatchAnalyzeProgress] = useState(null);
    const isInstantPracticeMode = !isRealExam; // Luyện tập: Hiện đáp án ngay | Thi thực tế: Tắt (chấm điểm sau khi nộp)

    const activePhase = isRealExam && Array.isArray(examPhases) && examPhases.length > 0
        ? (examPhases[currentPhaseIdx] || null)
        : null;
    const isSectionAccessible = (sIdx) => (!activePhase || activePhase.sectionIndices.includes(sIdx));

    const rightScrollContainerRef = useRef(null);

    // Sync tab when currentSectionIdx or phase changes externally
    useEffect(() => {
        if (currentSectionIdx !== undefined && currentSectionIdx !== selectedTabIdx) {
            setSelectedTabIdx(currentSectionIdx);
            setSelectedMondaiFilter('');
        }
    }, [currentSectionIdx]);

    // Preload and pre-decode all section/Mondai images in the background
    useEffect(() => {
        if (activeTest) {
            preloadTestImages(activeTest);
        }
    }, [activeTest]);

    const activeSection = activeTest?.sections?.[selectedTabIdx] || activeTest?.sections?.[0];

    const sectionReadingStats = useMemo(() => {
        if (!activeSection?.questions) return { totalPassages: 0, missingPassages: 0 };
        const seen = new Set();
        let totalPassages = 0;
        let missingPassages = 0;
        activeSection.questions.forEach((q) => {
            const raw = String(q?.passage || '').trim();
            if (!raw || raw.replace(/<[^>]+>/g, '').trim().length < 20) return;
            const key = raw.replace(/\s+/g, ' ').trim();
            if (seen.has(key)) return;
            seen.add(key);
            totalPassages += 1;
            if (!localPassageDataMap[key] && !hasRichReadingAnalysis(q)) {
                missingPassages += 1;
            }
        });
        return { totalPassages, missingPassages };
    }, [activeSection, localPassageDataMap]);

    const handleAnalyzeSinglePassage = async (cluster) => {
        if (isRealExam || !cluster?.passageHtml || analyzingPassageKey) return;
        const pKey = cluster.passageKey;
        setAnalyzingPassageKey(pKey);
        try {
            const analyzed = await aiAnalyzeReadingPassage({
                passageHtml: cluster.passageHtml,
                level: activeTest?.level || 'N3'
            });
            setLocalPassageDataMap((prev) => ({ ...prev, [pKey]: analyzed }));

            if (canEdit && onSaveSections && activeTest?.sections) {
                const updatedSections = JSON.parse(JSON.stringify(activeTest.sections));
                cluster.items.forEach(({ qIdx }) => {
                    if (updatedSections[selectedTabIdx]?.questions?.[qIdx]) {
                        updatedSections[selectedTabIdx].questions[qIdx].passageData = analyzed;
                    }
                });
                await onSaveSections(updatedSections, 'Đã AI phân tích & lưu bài đọc vào đề!');
            } else {
                showToast('Đã tạo phân tích chi tiết từng câu cho bài đọc!', 'success');
            }
        } catch (err) {
            showToast('Lỗi AI phân tích bài đọc: ' + err.message, 'error');
        } finally {
            setAnalyzingPassageKey('');
        }
    };

    const handleBatchAnalyzeSectionPassages = async () => {
        if (isRealExam || !activeTest?.sections || batchAnalyzeProgress) return;
        setBatchAnalyzeProgress({
            current: 0,
            total: sectionReadingStats.missingPassages || sectionReadingStats.totalPassages,
            percent: 5,
            detail: 'Đang chuẩn bị AI phân tích...'
        });
        try {
            const { updatedSections, analyzedCount } = await aiBatchAnalyzeReadingSections(activeTest.sections, {
                targetSectionIdx: selectedTabIdx,
                level: activeTest.level || 'N3',
                forceAll: sectionReadingStats.missingPassages === 0,
                onProgress: (p) => setBatchAnalyzeProgress(p)
            });

            if (analyzedCount > 0) {
                const nextLocal = {};
                (updatedSections[selectedTabIdx]?.questions || []).forEach((q) => {
                    if (q?.passage && q?.passageData) {
                        const key = String(q.passage).replace(/\s+/g, ' ').trim();
                        nextLocal[key] = q.passageData;
                    }
                });
                setLocalPassageDataMap((prev) => ({ ...prev, ...nextLocal }));
                if (canEdit && onSaveSections) {
                    await onSaveSections(updatedSections, `Đã phân tích & lưu ${analyzedCount} bài đọc vào đề!`);
                } else {
                    showToast(`Đã phân tích xong ${analyzedCount} bài đọc!`, 'success');
                }
            } else {
                showToast('Tất cả bài đọc trong phần này đều đã có phân tích sẵn.', 'info');
            }
        } catch (err) {
            showToast('Lỗi AI phân tích bài đọc: ' + err.message, 'error');
        } finally {
            setBatchAnalyzeProgress(null);
        }
    };

    const listeningMondaiData = useMemo(() => {
        return groupQuestionsByMondai(activeSection?.questions || [], activeTest?.level, activeSection?.title, activeSection?.type);
    }, [activeSection, activeTest?.level]);

    const mondaiSharedAudioUrls = useMemo(() => {
        const map = {};
        if (!listeningMondaiData.isListening) return map;
        listeningMondaiData.groups.forEach((g) => {
            const shared = resolveSharedMondaiAudioUrl(g);
            if (shared) map[g.mondai] = shared;
        });
        return map;
    }, [listeningMondaiData]);

    const effectiveMondaiFilter = listeningMondaiData.groups.some((g) => String(g.mondai) === String(selectedMondaiFilter))
        ? selectedMondaiFilter
        : (listeningMondaiData.groups[0]?.mondai ?? 'all');

    const activeMondaiIdx = listeningMondaiData.groups.findIndex((g) => String(g.mondai) === String(effectiveMondaiFilter));
    const nextMondaiGroup = activeMondaiIdx >= 0 && activeMondaiIdx < listeningMondaiData.groups.length - 1
        ? listeningMondaiData.groups[activeMondaiIdx + 1]
        : null;

    const displayClusters = useMemo(() => buildSectionDisplayClusters({
        questions: activeSection?.questions || [],
        sectionPassages: activeSection?.passages,
        sectionTitle: activeSection?.title,
        sectionType: activeSection?.type,
        mondaiFilter: effectiveMondaiFilter,
        hasMondaiStructure: listeningMondaiData.hasMondaiStructure,
        mondaiGroups: listeningMondaiData.groups
    }), [activeSection, effectiveMondaiFilter, listeningMondaiData]);

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

    // Scroll to specific question card (locked if in another timed JLPT phase)
    const scrollToQuestion = (sIdx, qIdx) => {
        if (activePhase && !activePhase.sectionIndices.includes(sIdx)) return;
        const sec = activeTest?.sections?.[sIdx];
        const targetQ = sec?.questions?.[qIdx];
        setSelectedTabIdx(sIdx);
        if (targetQ) {
            setSelectedMondaiFilter(resolveQuestionMondai(targetQ, sec?.title || '', sec?.type === 'listening' ? 5 : 15));
        }
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
                        onClick={() => {
                            if (answeredCount > 0) {
                                setShowExitModal(true);
                            } else if (exitTest) {
                                exitTest();
                            } else {
                                saveProgressAndExit();
                            }
                        }} 
                        className="p-1.5 sm:px-3 sm:py-1.5 text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white transition flex items-center gap-1.5 text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-xl cursor-pointer shrink-0 active:scale-95"
                        title="Thoát khỏi bài làm"
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
                                <span className="px-1.5 py-0.5 rounded-md text-[10px] font-black bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200/50 dark:border-emerald-800/40">
                                    {activeTest.level}
                                </span>
                            )}
                            {canEdit && (
                                <label 
                                    className={`flex items-center gap-1.5 cursor-pointer select-none text-[10px] sm:text-xs font-black px-2.5 py-1 rounded-xl transition-all shadow-2xs ${
                                        activeTest?.isFixed
                                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700'
                                            : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:border-slate-300'
                                    }`}
                                    title="Admin: Đánh dấu bài thi đã được chuẩn hóa dữ liệu"
                                >
                                    <input 
                                        type="checkbox" 
                                        checked={!!activeTest?.isFixed} 
                                        onChange={(e) => handleToggleTestFixed && handleToggleTestFixed(e, activeTest)}
                                        className="w-3.5 h-3.5 rounded border-emerald-400 text-emerald-500 cursor-pointer accent-emerald-500"
                                    />
                                    <span>Đã chuẩn data</span>
                                </label>
                            )}
                        </div>
                    </div>
                </div>

                {/* Right Controls: Timer, Scratchpad, Settings, Fullscreen */}
                <div className="flex items-center gap-2 shrink-0">
                    {/* Timer (Official JLPT Phased Real-Exam Clock) */}
                    {isRealExam && showTimer && (
                        <div className="flex items-center gap-1.5">
                            <div className={`px-2.5 sm:px-3 py-1 rounded-xl text-xs font-mono font-black flex items-center gap-1.5 shadow-xs ${
                                timeRemaining < 300
                                    ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400 animate-pulse border border-rose-300'
                                    : activePhase?.isListening
                                        ? 'bg-amber-50 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-300 dark:border-amber-800'
                                        : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800'
                            }`}>
                                <span>⏱️</span>
                                {activePhase && (
                                    <span className="hidden md:inline font-sans font-extrabold">
                                        {activePhase.isListening ? 'Nghe' : `P${currentPhaseIdx + 1}/${examPhases.length}`} ·
                                    </span>
                                )}
                                <span>{formatTime(timeRemaining)}</span>
                            </div>

                            {activePhase && currentPhaseIdx < examPhases.length - 1 && (
                                <button
                                    type="button"
                                    onClick={() => setShowAdvancePhaseModal(true)}
                                    className="px-2.5 py-1 rounded-xl bg-amber-500 hover:bg-amber-400 text-white text-[11px] font-black cursor-pointer shrink-0 transition"
                                    title="Chốt phần hiện tại để chuyển sang tính giờ phần tiếp theo"
                                >
                                    Sang phần tiếp →
                                </button>
                            )}
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
                                    <Settings className="w-4 h-4 text-emerald-500" />
                                    <span className="font-black text-xs text-slate-800 dark:text-white uppercase tracking-wider">Cài đặt đề thi</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-xs font-bold text-slate-700 dark:text-slate-300">Hiển thị Furigana</p>
                                        <p className="text-[10px] text-slate-400 dark:text-slate-500">Bật/tắt phiên âm chữ Hán</p>
                                    </div>
                                    <button 
                                        onClick={() => setShowFurigana(!showFurigana)} 
                                        className={`relative inline-flex h-5 w-10 items-center rounded-full transition-colors focus:outline-none cursor-pointer ${showFurigana ? 'bg-emerald-600' : 'bg-gray-300 dark:bg-slate-700'}`}
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
                                                        className={`w-6 h-6 rounded-full flex items-center justify-center text-white transition-all transform hover:scale-110 cursor-pointer ${colorOpt.bgClass} ${isSelected ? 'ring-2 ring-emerald-500 ring-offset-2 dark:ring-offset-slate-900 scale-105' : 'opacity-80'}`}
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
                            <List className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
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
                            const secLocked = !isSectionAccessible(sIdx);

                            return (
                                <div key={sIdx} className={`rounded-2xl p-2.5 transition-all border ${
                                    secLocked
                                        ? 'opacity-45 bg-slate-50/40 dark:bg-slate-900/40 border-transparent'
                                        : isCurrentTab 
                                            ? 'bg-slate-50/90 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 shadow-xs' 
                                            : 'border-transparent hover:bg-slate-50/50 dark:hover:bg-slate-800/30'
                                }`}>
                                    {/* Section Title Header */}
                                    <button
                                        disabled={secLocked}
                                        onClick={() => {
                                            if (secLocked) return;
                                            setSelectedTabIdx(sIdx);
                                            setSelectedMondaiFilter('');
                                            if (rightScrollContainerRef.current) {
                                                rightScrollContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
                                            }
                                        }}
                                        className="w-full flex items-center justify-between text-left mb-2 group cursor-pointer disabled:cursor-not-allowed"
                                    >
                                        <div className="flex items-center gap-1.5 min-w-0">
                                            {secLocked ? <Lock className="w-3.5 h-3.5 text-slate-400" /> : <SecIcon className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-500" />}
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
                                            const secMeta = activeTest?.sections?.[sIdx];
                                            const qDisplay = secMeta?.type === 'listening'
                                                ? getListeningDisplayMeta(q, qIdx, secMeta.title, secMeta.type).pairCode
                                                : (qIdx + 1);

                                            let btnClass = 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-slate-400 dark:hover:border-slate-500';
                                            if (status === 'correct') {
                                                btnClass = 'bg-emerald-500 text-white shadow-xs hover:bg-emerald-600 font-black';
                                            } else if (status === 'wrong') {
                                                btnClass = 'bg-rose-500 text-white shadow-xs hover:bg-rose-600 font-black';
                                            } else if (status === 'answered') {
                                                btnClass = 'bg-emerald-500 text-white shadow-xs hover:bg-emerald-600 font-black';
                                            } else if (isFocused) {
                                                btnClass = 'bg-emerald-600 text-white ring-2 ring-emerald-300 dark:ring-emerald-700 font-black';
                                            }

                                            return (
                                                <button
                                                    key={qIdx}
                                                    onClick={() => scrollToQuestion(sIdx, qIdx)}
                                                    className={`h-7.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer flex items-center justify-center select-none active:scale-90 ${btnClass}`}
                                                    title={`Câu ${qDisplay} (${status === 'correct' ? 'Đúng' : status === 'wrong' ? 'Sai' : status === 'answered' ? 'Đã làm' : 'Chưa làm'})`}
                                                >
                                                    {qDisplay}
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
                            className="w-full py-3 rounded-2xl font-black text-xs uppercase tracking-wider bg-emerald-500 hover:bg-emerald-400 active:translate-y-0.5 active:border-b-0 border-b-4 border-emerald-700 text-white transition flex items-center justify-center gap-1.5 cursor-pointer select-none"
                        >
                            <Check className="w-4 h-4 stroke-[3]" />
                            <span>Nộp bài ({answeredCount}/{totalQ})</span>
                        </button>
                    </div>
                </aside>

                {/* RIGHT SCROLLABLE QUESTIONS FEED ("ROLL XUỐNG") */}
                <main 
                    ref={rightScrollContainerRef}
                    className="flex-1 min-w-0 min-h-0 h-full overflow-y-auto px-3.5 sm:px-6 md:px-8 py-4 sm:py-6 space-y-5 scroll-smooth custom-scrollbar relative overscroll-y-contain"
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
                                        <List className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
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
                            <div className="flex flex-wrap items-center gap-2 py-0.5">
                                {sectionStats.map((sec, sIdx) => {
                                    const isActive = selectedTabIdx === sIdx;
                                    const secLocked = !isSectionAccessible(sIdx);
                                    return (
                                        <button
                                            key={sIdx}
                                            disabled={secLocked}
                                            onClick={() => {
                                                if (secLocked) return;
                                                setSelectedTabIdx(sIdx);
                                                setSelectedMondaiFilter('');
                                                if (rightScrollContainerRef.current) {
                                                    rightScrollContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
                                                }
                                            }}
                                            title={secLocked ? 'Khóa theo giờ từng phần quy chế JLPT' : undefined}
                                            className={`px-3.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all duration-200 flex items-center gap-2 shrink-0 ${
                                                secLocked
                                                    ? 'opacity-45 bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 text-slate-400 cursor-not-allowed'
                                                    : isActive
                                                        ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-md ring-2 ring-slate-900 dark:ring-white cursor-pointer active:scale-95'
                                                        : 'bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer active:scale-95'
                                            }`}
                                        >
                                            {secLocked && <Lock className="w-3 h-3 shrink-0" />}
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

                            {listeningMondaiData.hasMondaiStructure && (
                                <ListeningMondaiFilterBar
                                    groups={listeningMondaiData.groups}
                                    totalCount={activeSection?.questions?.length || 0}
                                    selectedMondai={effectiveMondaiFilter}
                                    onSelectMondai={setSelectedMondaiFilter}
                                    isListening={listeningMondaiData.isListening}
                                />
                            )}

                            {/* Actions Bar */}
                            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                                <div className="text-xs font-bold text-slate-600 dark:text-slate-300">
                                    Đã làm <strong className="text-emerald-600 dark:text-emerald-400">{answeredCount}/{totalQ}</strong> câu
                                </div>

                                <div className="flex items-center gap-2 flex-wrap">
                                    {!isRealExam && sectionReadingStats.totalPassages > 0 && (
                                        <button
                                            type="button"
                                            disabled={Boolean(batchAnalyzeProgress)}
                                            onClick={handleBatchAnalyzeSectionPassages}
                                            className="px-3 py-1.5 rounded-xl text-xs font-black bg-emerald-500 hover:bg-emerald-400 border-b-2 border-emerald-700 disabled:opacity-60 text-white transition flex items-center gap-1.5 cursor-pointer active:translate-y-0.5 shadow-2xs"
                                            title="Dùng AI phân tích dịch từng câu, từ vựng & ngữ pháp cho các bài đọc trong phần này"
                                        >
                                            {batchAnalyzeProgress ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wand2 className="w-3.5 h-3.5" />}
                                            <span>
                                                {batchAnalyzeProgress
                                                    ? `AI Phân tích ${batchAnalyzeProgress.percent}%`
                                                    : sectionReadingStats.missingPassages > 0
                                                        ? `AI Phân tích bài đọc (${sectionReadingStats.missingPassages})`
                                                        : 'AI Phân tích lại bài đọc'}
                                            </span>
                                        </button>
                                    )}

                                    {canEdit && onEditTest && (
                                        <button
                                            type="button"
                                            onClick={() => onEditTest(activeTest)}
                                            className="px-3 py-1.5 rounded-xl text-xs font-black bg-sky-50 hover:bg-sky-100 dark:bg-sky-950/60 dark:hover:bg-sky-900/60 text-sky-700 dark:text-sky-300 transition flex items-center gap-1.5 cursor-pointer border border-sky-300 dark:border-sky-800 active:scale-95 shadow-2xs"
                                            title="Sửa trực tiếp toàn bộ đề thi"
                                        >
                                            <Edit3 className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                                            <span>Sửa đề</span>
                                        </button>
                                    )}

                                    {canEdit && onOpenExportImport && (
                                        <button
                                            onClick={onOpenExportImport}
                                            className="px-3 py-1.5 rounded-xl text-xs font-black bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 transition flex items-center gap-1.5 cursor-pointer border border-emerald-300 dark:border-emerald-800 active:scale-95 shadow-2xs"
                                            title="Xuất dữ liệu & Nhập đè JSON đã chuẩn hóa bằng ChatGPT / Gemini"
                                        >
                                            <FileCode className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                                            <span>Xuất / Nhập đề</span>
                                        </button>
                                    )}

                                    {canEdit && setShowQuestionSearchModal && (
                                        <button
                                            onClick={() => setShowQuestionSearchModal(true)}
                                            className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition flex items-center gap-1 cursor-pointer active:scale-95"
                                            title="Tìm kiếm câu hỏi trong đề thi (Ctrl+K)"
                                        >
                                            <List className="w-3.5 h-3.5" />
                                            <span className="hidden sm:inline">Tìm câu</span>
                                        </button>
                                    )}

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
                                        className="px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider bg-emerald-500 hover:bg-emerald-400 active:translate-y-0.5 active:border-b-0 border-b-2 border-emerald-700 text-white transition flex items-center gap-1.5 cursor-pointer select-none"
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
                            {(() => {
                                const renderTakeQuestionItem = ({ question, qIdx, qMeta }, insideCluster = false) => {
                                    const qKey = answerKey(selectedTabIdx, qIdx);
                                    const selectedOpt = answers[qKey];
                                    const isAnswered = isQuestionAnswered(selectedTabIdx, qIdx, question);
                                    const bareListeningOpts = qMeta.isListening && isBareNumberOptions(question.options);
                                    const nKey = getQuestionNoteKey(selectedTabIdx, qIdx);
                                    const dKey = getQuestionDrawKey(selectedTabIdx, qIdx);
                                    const sKey = getQuestionStrokesKey(selectedTabIdx, qIdx);
                                    const hasTextNote = !!notes?.[nKey];
                                    const hasDrawNote = !!notes?.[dKey];
                                    const isNoteOpen = activeNoteTarget?.sIdx === selectedTabIdx && activeNoteTarget?.qIdx === qIdx;
                                    const qStatus = getQuestionStatus(selectedTabIdx, qIdx, question);
                                    const hasScriptData = qMeta.isListening && (
                                        (Array.isArray(question?.script) && question.script.length > 0)
                                        || Boolean(question?.stem)
                                        || Boolean(question?.spokenQuestion)
                                        || (Array.isArray(question?.spokenOptions) && question.spokenOptions.length > 0)
                                    );
                                    const isScriptOpen = !!openScriptKeys[qKey];

                                    const wrapperClass = insideCluster
                                        ? 'pt-5 first:pt-1 scroll-mt-28 sm:scroll-mt-32'
                                        : `bg-white dark:bg-slate-900 border rounded-2xl sm:rounded-3xl p-4 sm:p-6 transition-all duration-200 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 scroll-mt-28 sm:scroll-mt-32 border-slate-200/90 dark:border-slate-800`;

                                    return (
                                        <div key={qIdx} id={`q-card-${selectedTabIdx}-${qIdx}`} className={wrapperClass}>
                                            {/* Question Card Header */}
                                            <div className="flex items-start justify-between gap-3 mb-4">
                                                <div className="flex items-start gap-3 min-w-0 flex-1">
                                                    {/* Number Badge */}
                                                    <span className={`px-2.5 h-7 sm:h-8 min-w-8 rounded-xl font-black text-xs sm:text-sm flex items-center justify-center shrink-0 shadow-xs transition-colors ${
                                                        qStatus === 'correct'
                                                            ? 'bg-emerald-500 text-white'
                                                            : qStatus === 'wrong'
                                                                ? 'bg-rose-500 text-white'
                                                                : isAnswered
                                                                    ? 'bg-emerald-500 text-white'
                                                                    : qMeta.isListening
                                                                        ? 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700'
                                                                        : 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                                                    }`}>
                                                        {qMeta.isListening ? qMeta.pairCode : qIdx + 1}
                                                    </span>

                                                    {/* Question Prompt Text */}
                                                    <div className="min-w-0 flex-1 pt-0.5 space-y-1">
                                                        {qMeta.isListening && (
                                                            <span className="text-base sm:text-lg font-black text-slate-900 dark:text-white font-japanese block leading-tight">
                                                                {qMeta.banLabel}
                                                            </span>
                                                        )}
                                                        {(!qMeta.isListening || qMeta.paperPrompt) && (
                                                            <div
                                                                className={getCleanClassName("text-[16px] sm:text-[18px] font-medium text-slate-900 dark:text-slate-100 leading-relaxed font-japanese", qMeta.isListening ? qMeta.paperPrompt : question.question)}
                                                                dangerouslySetInnerHTML={{ __html: qMeta.isListening ? qMeta.paperPrompt : question.question }}
                                                            />
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Right Tools on Question */}
                                                <div className="flex items-center gap-1.5 shrink-0">
                                                    {canEdit && onSaveQuestionImage && (
                                                        <button
                                                            type="button"
                                                            onClick={() => setAiImageTarget({
                                                                sIdx: selectedTabIdx,
                                                                qIdx,
                                                                label: qMeta.isListening ? `M${qMeta.mondaiNum} · ${qMeta.banLabel}` : `Câu ${qIdx + 1}`,
                                                                existingUrl: question.imageUrl || ''
                                                            })}
                                                            className="px-2 py-1 rounded-lg bg-sky-50 hover:bg-sky-100 dark:bg-sky-950/50 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800 text-[11px] font-black flex items-center gap-1 cursor-pointer transition"
                                                            title="Dán ảnh chụp đề & vẽ lại bằng AI cho đẹp"
                                                        >
                                                            <Wand2 className="w-3 h-3" />
                                                            <span>Ảnh AI</span>
                                                        </button>
                                                    )}
                                                    {canEdit && onEditQuestion && (
                                                        <button
                                                            onClick={() => onEditQuestion(question, selectedTabIdx, qIdx)}
                                                            className="p-1.5 rounded-xl text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer active:scale-95"
                                                            title="Sửa nội dung câu hỏi"
                                                        >
                                                            <Edit3 className="w-4 h-4" />
                                                        </button>
                                                    )}

                                                    <button
                                                        onClick={() => {
                                                            if (isNoteOpen) {
                                                                setActiveNoteTarget(null);
                                                            } else {
                                                                setNoteDraft(notes?.[nKey] || '');
                                                                let strokes = [];
                                                                try { strokes = notes?.[sKey] || []; } catch (e) {}
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

                                                    {hasScriptData && (
                                                        <button
                                                            type="button"
                                                            onClick={() => setOpenScriptKeys((prev) => ({ ...prev, [qKey]: !prev[qKey] }))}
                                                            className={`px-2 py-1 rounded-lg transition text-[11px] font-bold flex items-center gap-1 cursor-pointer ${
                                                                isScriptOpen
                                                                    ? 'bg-sky-500 text-white shadow-2xs'
                                                                    : 'bg-sky-50 dark:bg-sky-950/50 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800 hover:bg-sky-100'
                                                            }`}
                                                            title="Xem / ẩn Script hội thoại của câu nghe này"
                                                        >
                                                            <FileText className="w-3.5 h-3.5" />
                                                            <span>{isScriptOpen ? 'Ẩn Script' : 'Script'}</span>
                                                        </button>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Per-question Audio Player ONLY when NOT sharing a Mondai track */}
                                            {question?.audioUrl && (activeSection?.type === 'listening' || question?.audioUrl) && !mondaiSharedAudioUrls[qMeta.mondaiNum] && (
                                                <div className="mb-4">
                                                    <ListeningAudioPlayer
                                                        src={question.audioUrl}
                                                        startSec={question.audioStartSec}
                                                        endSec={question.audioEndSec}
                                                        externalRef={audioRef}
                                                        label=""
                                                    />
                                                </div>
                                            )}

                                            {/* Question Image */}
                                            {question?.imageUrl && (
                                                <PreloadedQuestionImage src={question.imageUrl} alt="Hình ảnh câu hỏi" />
                                            )}

                                            {/* Collapsible Per-Question Listening Script Drawer */}
                                            {isScriptOpen && hasScriptData && (
                                                <div className="mb-4">
                                                    <ListeningScriptBox
                                                        question={question}
                                                        correctIdx={isInstantPracticeMode && isAnswered ? (typeof question.correctAnswer === 'number' ? question.correctAnswer : (typeof question.answer === 'number' ? question.answer : -1)) : -1}
                                                        revealAnswer={isInstantPracticeMode && isAnswered}
                                                        compact
                                                    />
                                                </div>
                                            )}

                                            {/* Options */}
                                            {(!question.subQuestions || question.subQuestions.length === 0) ? (
                                                <div>
                                                    <div className={qMeta.isListening
                                                        ? (bareListeningOpts ? (question.options?.length === 3 ? 'grid grid-cols-3 gap-2.5' : 'grid grid-cols-2 sm:grid-cols-4 gap-2.5') : 'grid grid-cols-1 gap-2')
                                                        : 'grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3'
                                                    }>
                                                        {question.options?.map((opt, oi) => {
                                                            const isSelected = selectedOpt === oi;
                                                            const letter = qMeta.isListening ? String(oi + 1) : String.fromCharCode(65 + oi);
                                                            const correctIndex = typeof question.correctAnswer === 'number'
                                                                ? question.correctAnswer
                                                                : (typeof question.answer === 'number'
                                                                    ? question.answer
                                                                    : (typeof question.correct === 'number'
                                                                        ? question.correct
                                                                        : (typeof question.correct === 'string'
                                                                            ? question.options?.findIndex((o) => o.trim() === question.correct.trim())
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
                                                                optionStyle = 'bg-emerald-50/90 dark:bg-emerald-950/40 border-emerald-600 dark:border-emerald-500 text-slate-900 dark:text-white shadow-xs font-bold';
                                                            }

                                                            return (
                                                                <button
                                                                    key={oi}
                                                                    type="button"
                                                                    disabled={isInstantPracticeMode && selectedOpt !== undefined}
                                                                    onClick={() => selectAnswer(selectedTabIdx, qIdx, oi)}
                                                                    className={`p-3 sm:p-3.5 rounded-2xl text-left transition-all duration-150 flex items-center justify-between gap-3 border-2 border-b-4 select-none ${
                                                                        isInstantPracticeMode && selectedOpt !== undefined
                                                                            ? 'cursor-default'
                                                                            : 'cursor-pointer active:translate-y-0.5 active:border-b-2'
                                                                    } ${optionStyle}`}
                                                                >
                                                                    <div className={`flex items-center gap-2.5 min-w-0 flex-1 ${bareListeningOpts ? 'justify-center' : ''}`}>
                                                                        <span className={`w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center shrink-0 transition-colors ${
                                                                            isInstantPracticeMode && selectedOpt !== undefined
                                                                                ? isCorrectOpt
                                                                                    ? 'bg-emerald-600 text-white'
                                                                                    : isWrongSelected
                                                                                        ? 'bg-rose-600 text-white'
                                                                                        : 'bg-slate-200 text-slate-500'
                                                                                : isSelected
                                                                                    ? 'bg-emerald-600 text-white'
                                                                                    : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-300/60 dark:border-slate-600'
                                                                        }`}>
                                                                            {letter}
                                                                        </span>
                                                                        {!bareListeningOpts && (
                                                                            <span
                                                                                className={getCleanClassName("font-japanese text-[15px] sm:text-[16px] leading-relaxed", opt)}
                                                                                dangerouslySetInnerHTML={{ __html: opt }}
                                                                            />
                                                                        )}
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
                                                                        <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                                                                    ) : null}
                                                                </button>
                                                            );
                                                        })}
                                                    </div>

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
                                                                                ? question.options?.findIndex((o) => o.trim() === question.correct.trim())
                                                                                : -1)))
                                                            }
                                                            userAnswer={selectedOpt}
                                                        />
                                                    )}
                                                </div>
                                            ) : (
                                                /* SubQuestions */
                                                <div className="space-y-4 pl-2 sm:pl-4 border-l-2 border-emerald-200 dark:border-emerald-800/60 mt-2">
                                                    {question.subQuestions.map((sq, sqi) => {
                                                        const subAnsKey = subAnswerKey(selectedTabIdx, qIdx, sqi);
                                                        const isSubSelected = answers[subAnsKey];
                                                        const sqCorrectIdx = typeof sq.correctAnswer === 'number' ? sq.correctAnswer : (typeof sq.answer === 'number' ? sq.answer : -1);

                                                        return (
                                                            <div key={sqi} className="space-y-3 p-3.5 bg-slate-50/60 dark:bg-slate-950/30 rounded-2xl border border-slate-100 dark:border-slate-800/80">
                                                                <div className="flex items-center justify-between gap-2">
                                                                    <div className="flex items-center gap-2 min-w-0 flex-1">
                                                                        <span className="text-xs font-black px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 shrink-0">
                                                                            {qMeta.isListening ? `質問${sqi + 1}` : `${qIdx + 1}.${sqi + 1}`}
                                                                        </span>
                                                                        <h4
                                                                            className={getCleanClassName("text-[15px] sm:text-[17px] font-medium text-slate-800 dark:text-slate-200 font-japanese", sq.question)}
                                                                            dangerouslySetInnerHTML={{ __html: sq.question || `Câu hỏi phụ ${sqi + 1}:` }}
                                                                        />
                                                                    </div>
                                                                    {canEdit && onEditQuestion && (
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => onEditQuestion(question, selectedTabIdx, qIdx, `sq-${sqi}`)}
                                                                            className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer shrink-0 active:scale-95"
                                                                            title={`Sửa câu ${qIdx + 1}.${sqi + 1}`}
                                                                        >
                                                                            <Edit3 className="w-3.5 h-3.5" />
                                                                        </button>
                                                                    )}
                                                                </div>

                                                                <div className={qMeta.isListening ? 'grid grid-cols-1 gap-2' : 'grid grid-cols-1 sm:grid-cols-2 gap-2'}>
                                                                    {sq.options?.map((opt, oi) => {
                                                                        const isSqOptSelected = isSubSelected === oi;
                                                                        const letter = qMeta.isListening ? String(oi + 1) : String.fromCharCode(65 + oi);
                                                                        const isSqCorrect = sqCorrectIdx !== -1 && oi === sqCorrectIdx;
                                                                        const isSqWrong = isSqOptSelected && !isSqCorrect;

                                                                        let sqStyle = 'bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-750 text-slate-700 dark:text-slate-200 hover:border-slate-400 dark:hover:border-slate-500';
                                                                        if (isInstantPracticeMode && isSubSelected !== undefined) {
                                                                            if (isSqCorrect) sqStyle = 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 text-emerald-800 font-bold';
                                                                            else if (isSqWrong) sqStyle = 'bg-rose-50 dark:bg-rose-950/40 border-rose-500 text-rose-800 font-bold';
                                                                        } else if (isSqOptSelected) {
                                                                            sqStyle = 'bg-emerald-50/90 dark:bg-emerald-950/40 border-emerald-600 dark:border-emerald-500 text-slate-900 dark:text-white shadow-xs font-bold';
                                                                        }

                                                                        return (
                                                                            <button
                                                                                key={oi}
                                                                                type="button"
                                                                                disabled={isInstantPracticeMode && isSubSelected !== undefined}
                                                                                onClick={() => selectAnswerSub(selectedTabIdx, qIdx, sqi, oi)}
                                                                                className={`p-3 rounded-2xl text-left transition-all duration-150 flex items-center justify-between gap-2.5 border-2 border-b-4 select-none ${
                                                                                    isInstantPracticeMode && isSubSelected !== undefined
                                                                                        ? 'cursor-default'
                                                                                        : 'cursor-pointer active:translate-y-0.5 active:border-b-2'
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
                                                                                                ? 'bg-emerald-600 text-white'
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
                                                                                    <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
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
                                };

                                return displayClusters.map((cluster) => (
                                    <React.Fragment key={cluster.id}>
                                        {cluster.mondaiGroup && (
                                            <ListeningMondaiSectionBanner
                                                group={cluster.mondaiGroup}
                                                isListening={listeningMondaiData.isListening}
                                                sharedAudioUrl={mondaiSharedAudioUrls[cluster.mondaiGroup.mondai] || ''}
                                            />
                                        )}
                                        {cluster.isPassageCluster ? (
                                            <div className="bg-white dark:bg-slate-900 border-2 border-emerald-200/70 dark:border-emerald-900/50 rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-xs space-y-5">
                                                <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-slate-100 dark:border-slate-800">
                                                    <span className="inline-flex items-center gap-1.5 text-xs font-black text-emerald-700 dark:text-emerald-300 uppercase tracking-wider">
                                                        <BookOpen className="w-4 h-4 text-emerald-500" />
                                                        <span>
                                                            {cluster.items.length > 1
                                                                ? `Bài đọc chung · ${cluster.items.length} câu hỏi (Câu ${cluster.items[0].qIdx + 1} – Câu ${cluster.items[cluster.items.length - 1].qIdx + 1})`
                                                                : `Bài đọc hiểu · Câu ${cluster.items[0].qIdx + 1}`}
                                                        </span>
                                                    </span>
                                                </div>

                                                <InteractiveReadingPassage
                                                    passageHtml={cluster.passageHtml}
                                                    passageData={localPassageDataMap[cluster.passageKey] || cluster.passageData}
                                                    explanationText={cluster.explanationText}
                                                    question={cluster.firstQuestion}
                                                    isRealExam={isRealExam}
                                                    onAnalyzePassage={!isRealExam ? () => handleAnalyzeSinglePassage(cluster) : null}
                                                    isAnalyzing={analyzingPassageKey === cluster.passageKey}
                                                />

                                                <div className="divide-y divide-slate-200/80 dark:divide-slate-800 space-y-5">
                                                    {cluster.items.map((item) => renderTakeQuestionItem(item, true))}
                                                </div>
                                            </div>
                                        ) : (
                                            renderTakeQuestionItem(cluster.items[0], false)
                                        )}
                                    </React.Fragment>
                                ));
                            })()}
                        </div>

                        {/* BOTTOM MONDAI & SECTION NAVIGATION BUTTONS */}
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-6 pb-6 border-t border-slate-200 dark:border-slate-800">
                            {selectedTabIdx > 0 && isSectionAccessible(selectedTabIdx - 1) ? (
                                <button
                                    onClick={() => {
                                        const prevIdx = selectedTabIdx - 1;
                                        setSelectedTabIdx(prevIdx);
                                        setSelectedMondaiFilter('');
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

                            <div className="flex flex-wrap items-center justify-end gap-2.5 w-full sm:w-auto">
                                {nextMondaiGroup && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setSelectedMondaiFilter(nextMondaiGroup.mondai);
                                            if (rightScrollContainerRef.current) {
                                                rightScrollContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
                                            }
                                        }}
                                        className="w-full sm:w-auto px-5 py-3 rounded-2xl font-black text-xs sm:text-sm bg-amber-500 hover:bg-amber-400 border-b-4 border-amber-700 text-white transition flex items-center justify-center gap-2 cursor-pointer shadow-xs active:translate-y-0.5 active:border-b-2"
                                    >
                                        <span>Tiếp theo: 問題{nextMondaiGroup.mondai} · {nextMondaiGroup.meta.vi}</span>
                                        <ChevronRight className="w-4 h-4" />
                                    </button>
                                )}

                                {selectedTabIdx < (activeTest?.sections?.length || 1) - 1 && isSectionAccessible(selectedTabIdx + 1) ? (
                                    <button
                                        onClick={() => {
                                            const nextIdx = selectedTabIdx + 1;
                                            setSelectedTabIdx(nextIdx);
                                            setSelectedMondaiFilter('');
                                            if (rightScrollContainerRef.current) {
                                                rightScrollContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
                                            }
                                        }}
                                        className="w-full sm:w-auto px-6 py-3 rounded-2xl font-black text-xs sm:text-sm bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 transition flex items-center justify-center gap-2 cursor-pointer shadow-md active:scale-95"
                                    >
                                        <span>Phần tiếp theo: {sectionStats[selectedTabIdx + 1]?.ja}</span>
                                        <ChevronRight className="w-4 h-4" />
                                    </button>
                                ) : activePhase && currentPhaseIdx < examPhases.length - 1 ? (
                                    <button
                                        type="button"
                                        onClick={() => setShowAdvancePhaseModal(true)}
                                        className="w-full sm:w-auto px-6 py-3.5 rounded-2xl font-black text-xs sm:text-sm bg-sky-500 hover:bg-sky-400 border-b-4 border-sky-700 text-white transition flex items-center justify-center gap-2 cursor-pointer active:translate-y-0.5 active:border-b-2"
                                    >
                                        <span>Sang {examPhases[currentPhaseIdx + 1]?.label} ({examPhases[currentPhaseIdx + 1]?.minutes}p)</span>
                                        <ChevronRight className="w-4 h-4" />
                                    </button>
                                ) : !nextMondaiGroup && (
                                    <button
                                        onClick={() => setShowSubmitModal(true)}
                                        className="w-full sm:w-auto px-8 py-3.5 rounded-2xl font-black text-sm uppercase tracking-wider bg-emerald-500 hover:bg-emerald-400 active:translate-y-0.5 active:border-b-0 border-b-4 border-emerald-700 text-white transition flex items-center justify-center gap-2 cursor-pointer select-none"
                                    >
                                        <Check className="w-5 h-5 stroke-[3]" />
                                        <span>Hoàn thành & Nộp bài</span>
                                    </button>
                                )}
                            </div>
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
                    <List className="w-4 h-4 text-emerald-400" />
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
                                <List className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
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
                                                const secMeta = activeTest?.sections?.[sIdx];
                                                const qDisplay = secMeta?.type === 'listening'
                                                    ? getListeningDisplayMeta(q, qIdx, secMeta.title, secMeta.type).pairCode
                                                    : (qIdx + 1);
                                                let btnClass = 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300';
                                                if (status === 'correct') {
                                                    btnClass = 'bg-emerald-500 text-white font-black';
                                                } else if (status === 'wrong') {
                                                    btnClass = 'bg-rose-500 text-white font-black';
                                                } else if (status === 'answered') {
                                                    btnClass = 'bg-emerald-500 text-white font-black';
                                                } else if (isCurrentTab && currentQuestionIdx === qIdx) {
                                                    btnClass = 'bg-emerald-600 text-white ring-2 ring-emerald-300';
                                                }

                                                return (
                                                    <button
                                                        key={qIdx}
                                                        onClick={() => scrollToQuestion(sIdx, qIdx)}
                                                        className={`h-8 rounded-lg text-[11px] font-bold flex items-center justify-center cursor-pointer transition select-none active:scale-90 ${btnClass}`}
                                                    >
                                                        {qDisplay}
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
                                className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 active:translate-y-0.5 active:border-b-0 border-b-4 border-emerald-700 text-white font-black rounded-2xl text-xs uppercase tracking-wider transition cursor-pointer select-none"
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
                                className="py-2.5 rounded-xl text-xs font-black uppercase tracking-wider bg-emerald-500 hover:bg-emerald-400 active:translate-y-0.5 active:border-b-0 border-b-2 border-emerald-700 text-white transition cursor-pointer select-none"
                            >
                                Nộp bài ngay
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* 6. CONFIRM EXIT & SAVE PROGRESS MODAL */}
            {showExitModal && (
                <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in font-sans">
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-sm w-full shadow-2xl space-y-4 text-center">
                        <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto">
                            <Save className="w-7 h-7" />
                        </div>
                        <div>
                            <h3 className="text-lg font-black text-slate-900 dark:text-white">Lưu tiến trình trước khi thoát?</h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
                                Bạn đã hoàn thành <strong className="text-emerald-600 dark:text-emerald-400">{answeredCount}/{totalQ}</strong> câu hỏi. Bạn có muốn lưu tiến trình để lần sau làm tiếp không?
                            </p>
                        </div>

                        <div className="space-y-2 pt-2">
                            <button
                                type="button"
                                onClick={() => {
                                    setShowExitModal(false);
                                    saveProgressAndExit();
                                }}
                                className="w-full py-2.5 rounded-xl text-xs font-black uppercase tracking-wider bg-emerald-500 hover:bg-emerald-400 active:translate-y-0.5 border-b-2 border-emerald-700 text-white transition cursor-pointer select-none"
                            >
                                Lưu tiến trình &amp; Thoát
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setShowExitModal(false);
                                    if (exitTest) exitTest();
                                }}
                                className="w-full py-2.5 rounded-xl text-xs font-bold bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800/70 transition cursor-pointer"
                            >
                                Thoát, không lưu
                            </button>
                            <button
                                type="button"
                                onClick={() => setShowExitModal(false)}
                                className="w-full py-2.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition cursor-pointer"
                            >
                                Tiếp tục làm bài
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* 7. CONFIRM RESET MODAL */}
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

            {/* 8. CONFIRM ADVANCE TO NEXT TIMED JLPT PHASE MODAL */}
            {showAdvancePhaseModal && activePhase && currentPhaseIdx < examPhases.length - 1 && (
                <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in font-sans">
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-sm w-full shadow-2xl space-y-4 text-center">
                        <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 flex items-center justify-center mx-auto">
                            <Lock className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="text-lg font-black text-slate-900 dark:text-white">
                                Chuyển sang {examPhases[currentPhaseIdx + 1]?.label}?
                            </h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
                                Theo quy chế thi JLPT, sau khi sang phần tiếp theo ({examPhases[currentPhaseIdx + 1]?.minutes} phút tính riêng), bạn sẽ <strong>không thể quay lại sửa</strong> các câu ở phần hiện tại.
                            </p>
                        </div>
                        <div className="grid grid-cols-2 gap-2 pt-2">
                            <button
                                type="button"
                                onClick={() => setShowAdvancePhaseModal(false)}
                                className="py-2.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 cursor-pointer"
                            >
                                Kiểm tra lại
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setShowAdvancePhaseModal(false);
                                    if (onAdvancePhase) onAdvancePhase();
                                }}
                                className="py-2.5 rounded-xl text-xs font-black bg-amber-500 hover:bg-amber-400 border-b-2 border-amber-700 text-white cursor-pointer"
                            >
                                Chốt &amp; Tiếp tục
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* 9. SCREENSHOT PASTE & AI ILLUSTRATION RECREATOR */}
            {aiImageTarget && onSaveQuestionImage && (
                <AiImageRecreatorModal
                    isOpen={!!aiImageTarget}
                    onClose={() => setAiImageTarget(null)}
                    storagePrefix={`jlpt_images/${(activeTest?.level || 'jlpt').toLowerCase()}`}
                    questionLabel={aiImageTarget.label}
                    existingImageUrl={aiImageTarget.existingUrl}
                    onSaveImage={(url) => onSaveQuestionImage(aiImageTarget.sIdx, aiImageTarget.qIdx, url)}
                />
            )}
        </div>
    );
};

export default JLPTTestTakeView;
