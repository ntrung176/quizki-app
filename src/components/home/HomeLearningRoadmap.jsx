import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Sparkles, Lock, CheckCircle2, Star, Play, Compass,
    RotateCcw, Trophy, ChevronRight, Award, Zap
} from 'lucide-react';
import { ROUTES } from '../../router';
import { useLanguage } from '../../context/LanguageContext';
import { useTargetLanguage } from '../../context/TargetLanguageContext';
import {
    getRoadmapStages,
    getRoadmapProgress,
    isLessonUnlocked,
    getStageStats,
    findCurrentActiveLessonId
} from '../../data/roadmap';
import RoadmapLessonModal from './RoadmapLessonModal';

/**
 * HomeLearningRoadmap Component - Authentic Duolingo Interactive Winding Path
 * Provides real bite-sized playable lessons, visual stepping stone path,
 * node progression (completed/active/locked), XP rewards, and stage switching.
 */
const HomeLearningRoadmap = ({ isHighlighted = false, awardXP, userId }) => {
    const navigate = useNavigate();
    const { t } = useLanguage();
    const { targetLanguage, isJapaneseMode, isKoreanMode, isEnglishMode } = useTargetLanguage();

    const langCode = isKoreanMode ? 'ko' : isEnglishMode ? 'en' : 'ja';

    // 1. Load curriculum stages based on current language
    const stages = useMemo(() => getRoadmapStages(langCode), [langCode]);

    // 2. Load stored progress state
    const [progress, setProgress] = useState(() => getRoadmapProgress());

    // Listen to roadmap update events from any lesson completion
    useEffect(() => {
        const handleProgressUpdate = () => {
            setProgress(getRoadmapProgress());
        };
        window.addEventListener('quizki-roadmap-updated', handleProgressUpdate);
        return () => window.removeEventListener('quizki-roadmap-updated', handleProgressUpdate);
    }, []);

    // 3. Current active stage index (1-based)
    const [selectedStageNum, setSelectedStageNum] = useState(1);

    // Selected lesson for active runner modal
    const [activeLessonData, setActiveLessonData] = useState(null); // { lesson, stage }
    const [lockedHint, setLockedHint] = useState(null);

    // Find the global next active lesson across all stages
    const currentActiveLessonId = useMemo(() => {
        return findCurrentActiveLessonId(stages, progress);
    }, [stages, progress]);

    // Auto-select stage that contains the active lesson on initial load
    useEffect(() => {
        if (!currentActiveLessonId) return;
        for (const st of stages) {
            if (st.lessons.some(l => l.id === currentActiveLessonId)) {
                setSelectedStageNum(st.stage);
                break;
            }
        }
    }, [stages, currentActiveLessonId]);

    // Current selected stage object
    const currentStage = useMemo(() => {
        return stages.find(s => s.stage === selectedStageNum) || stages[0];
    }, [stages, selectedStageNum]);

    // Current stage completion stats
    const currentStageStats = useMemo(() => {
        return getStageStats(currentStage, progress);
    }, [currentStage, progress]);

    // Handle node click
    const handleNodeClick = (lesson, stage, isUnlocked, isCompleted) => {
        if (!isUnlocked) {
            setLockedHint(`Hoàn thành bài học trước để mở khóa "${lesson.shortTitle}" nhé! 🔒`);
            setTimeout(() => setLockedHint(null), 3000);
            return;
        }
        // Launch lesson player
        setActiveLessonData({ lesson, stage });
    };

    // Close lesson modal
    const handleCloseModal = () => {
        setActiveLessonData(null);
    };

    // Callback when lesson is finished
    const handleLessonCompleted = (lessonId, score, stars) => {
        setProgress(getRoadmapProgress());
    };

    return (
        <section
            id="home-learning-roadmap"
            className={`p-4 sm:p-6 bg-white/95 dark:bg-slate-900/95 rounded-3xl border-2 transition-all backdrop-blur-md shadow-xs ${
                isHighlighted
                    ? 'border-emerald-500 ring-4 ring-emerald-400/20'
                    : 'border-slate-200/80 dark:border-slate-800/80'
            }`}
        >
            {/* 1. ROADMAP HEADER */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 pb-4 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center text-2xl shadow-md shadow-emerald-500/20 shrink-0">
                        🗺️
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight">
                                {t('roadmap.title', 'Lộ Trình Học Tương Tác')}
                            </h2>
                            <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-300/40 shrink-0">
                                Beta
                            </span>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            {t('roadmap.subtitle', 'Chinh phục từng bài học tương tác, tích lũy XP và mở khóa toàn bộ các chặng.')}
                        </p>
                    </div>
                </div>

                {/* Retake survey shortcut */}
                <button
                    onClick={() => navigate(ROUTES.ONBOARDING)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 bg-white dark:bg-slate-850 border-2 border-b-4 border-slate-200 dark:border-slate-700 rounded-xl transition-all self-start sm:self-auto cursor-pointer select-none active:translate-y-0.5 active:border-b-2"
                >
                    <Compass className="w-3.5 h-3.5 text-emerald-500" />
                    <span>{t('roadmap.retakeSurvey', 'Khảo sát trình độ')}</span>
                </button>
            </div>

            {/* 2. STAGE SELECTOR TABS (Duolingo Tactile 3D Pills) */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-5">
                {stages.map((st) => {
                    const isSelected = st.stage === selectedStageNum;
                    const isStageUnlocked = (progress.unlockedStages || [1]).includes(st.stage);
                    const stats = getStageStats(st, progress);

                    return (
                        <button
                            key={st.stage}
                            onClick={() => setSelectedStageNum(st.stage)}
                            className={`p-2.5 sm:p-3 rounded-2xl border-2 border-b-4 text-left transition-all cursor-pointer select-none active:translate-y-0.5 active:border-b-2 relative overflow-hidden ${
                                isSelected
                                    ? 'bg-emerald-500 border-emerald-400 border-b-emerald-700 text-white shadow-md shadow-emerald-500/20'
                                    : isStageUnlocked
                                    ? 'bg-slate-50 dark:bg-slate-850 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-700 dark:text-slate-200'
                                    : 'bg-slate-100/60 dark:bg-slate-900/60 border-slate-200/60 dark:border-slate-800/60 text-slate-400 opacity-75'
                            }`}
                        >
                            <div className="flex items-center justify-between gap-1 mb-1">
                                <span className="text-base sm:text-lg">{st.icon}</span>
                                {stats.isAllCompleted ? (
                                    <span className={`text-[10px] font-black px-1.5 py-0.2 rounded-md ${
                                        isSelected ? 'bg-white/20 text-white' : 'bg-amber-100 dark:bg-amber-950 text-amber-600'
                                    }`}>
                                        ⭐ 100%
                                    </span>
                                ) : !isStageUnlocked ? (
                                    <Lock className="w-3.5 h-3.5 opacity-60" />
                                ) : (
                                    <span className={`text-[10px] font-black ${isSelected ? 'text-white/80' : 'text-slate-400'}`}>
                                        {stats.percent}%
                                    </span>
                                )}
                            </div>
                            <div className="text-xs font-black truncate">
                                Chặng {st.stage}
                            </div>
                        </button>
                    );
                })}
            </div>

            {/* 3. ACTIVE STAGE HERO BANNER */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-sky-500/10 border-2 border-emerald-300/40 dark:border-emerald-800/40 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-emerald-500 text-white shadow-xs">
                            Đang học: Chặng {currentStage.stage}
                        </span>
                        {currentStageStats.isAllCompleted && (
                            <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-amber-500 text-white flex items-center gap-1 shadow-xs">
                                🏆 Đã Xuất Sắc Hoàn Thành
                            </span>
                        )}
                    </div>
                    <h3 className="font-black text-sm sm:text-base text-slate-900 dark:text-white">
                        {currentStage.title}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                        {currentStage.sub}
                    </p>
                </div>

                {/* Stage Progress Capsule */}
                <div className="shrink-0 sm:text-right">
                    <div className="text-xs font-black text-slate-700 dark:text-slate-300 mb-1">
                        {currentStageStats.completed} / {currentStageStats.total} Bài học
                    </div>
                    <div className="w-36 bg-slate-200 dark:bg-slate-700 h-2.5 rounded-full overflow-hidden">
                        <div
                            className="bg-emerald-500 h-full rounded-full transition-all duration-300"
                            style={{ width: `${currentStageStats.percent}%` }}
                        />
                    </div>
                </div>
            </div>

            {/* Locked Hint Toast */}
            {lockedHint && (
                <div className="mb-4 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-800 text-amber-800 dark:text-amber-200 text-xs font-bold flex items-center justify-center gap-2 animate-in fade-in slide-in-from-top-2">
                    <span>{lockedHint}</span>
                </div>
            )}

            {/* 4. THE DUOLINGO WINDING PATH (Stepping Stones) */}
            <div className="relative py-6 sm:py-10 max-w-md mx-auto flex flex-col items-center">
                {/* Background Connecting Trail Line */}
                <div className="absolute top-12 bottom-12 left-1/2 -translate-x-1/2 w-1.5 bg-dashed border-l-4 border-dashed border-slate-300 dark:border-slate-700 pointer-events-none -z-0" />

                {/* Lesson Nodes */}
                <div className="space-y-10 sm:space-y-12 w-full relative z-10">
                    {currentStage.lessons.map((lesson, idx) => {
                        const isCompleted = !!progress.completedLessons?.[lesson.id]?.completed;
                        const isUnlocked = isLessonUnlocked(currentStage, idx, progress);
                        const isActive = lesson.id === currentActiveLessonId || (!isCompleted && isUnlocked);
                        const isMilestone = lesson.isMilestone;

                        // Zig-zag offset pattern: center -> left -> center -> right -> center
                        const offsetClass =
                            idx % 4 === 1
                                ? '-translate-x-10 sm:-translate-x-16'
                                : idx % 4 === 3
                                ? 'translate-x-10 sm:translate-x-16'
                                : 'translate-x-0';

                        return (
                            <div
                                key={lesson.id}
                                className={`flex flex-col items-center transition-transform duration-300 ${offsetClass}`}
                            >
                                {/* Tooltip Speech Bubble on Active Node (Duolingo Style) */}
                                {isActive && !isCompleted && (
                                    <div className="mb-2 animate-bounce flex flex-col items-center">
                                        <div className="px-3 py-1 rounded-xl bg-emerald-500 text-white font-black text-[11px] uppercase tracking-wider shadow-lg shadow-emerald-500/30 flex items-center gap-1.5">
                                            <Play className="w-3 h-3 fill-white" />
                                            <span>Bắt Đầu Học</span>
                                        </div>
                                        <div className="w-0 h-0 border-x-4 border-x-transparent border-t-6 border-t-emerald-500" />
                                    </div>
                                )}

                                {/* Node Circle Button */}
                                <button
                                    onClick={() => handleNodeClick(lesson, currentStage, isUnlocked, isCompleted)}
                                    className={`group relative rounded-full transition-all select-none cursor-pointer flex items-center justify-center ${
                                        isMilestone
                                            ? 'w-20 h-20 sm:w-24 sm:h-24'
                                            : 'w-16 h-16 sm:w-20 sm:h-20'
                                    } ${
                                        isCompleted
                                            ? 'bg-emerald-500 hover:bg-emerald-400 border-4 border-emerald-400 border-b-[8px] border-b-emerald-700 text-white shadow-lg shadow-emerald-500/30 active:translate-y-1 active:border-b-4'
                                            : isActive
                                            ? 'bg-emerald-500 hover:bg-emerald-400 border-4 border-emerald-300 border-b-[8px] border-b-emerald-700 text-white ring-8 ring-emerald-400/30 dark:ring-emerald-500/30 shadow-xl shadow-emerald-500/40 active:translate-y-1 active:border-b-4 animate-pulse'
                                            : 'bg-slate-200 dark:bg-slate-800 border-4 border-slate-300 dark:border-slate-700 border-b-[8px] border-b-slate-400 dark:border-b-slate-900 text-slate-400 cursor-not-allowed opacity-80'
                                    }`}
                                    title={isUnlocked ? lesson.title : 'Hoàn thành bài trước để mở khóa'}
                                >
                                    {/* Icon inside circle */}
                                    {isCompleted ? (
                                        <div className="flex flex-col items-center">
                                            <CheckCircle2 className="w-7 h-7 stroke-[3] text-white" />
                                        </div>
                                    ) : !isUnlocked ? (
                                        <Lock className="w-6 h-6 stroke-[2.5]" />
                                    ) : isMilestone ? (
                                        <span className="text-3xl sm:text-4xl animate-bounce">
                                            👑
                                        </span>
                                    ) : (
                                        <span className="text-xl sm:text-2xl font-black font-japanese">
                                            {lesson.icon || 'あ'}
                                        </span>
                                    )}

                                    {/* Star Badge for Completed */}
                                    {isCompleted && (
                                        <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-amber-400 border-2 border-white dark:border-slate-900 text-amber-950 flex items-center justify-center text-[10px] font-black shadow-xs">
                                            ★
                                        </div>
                                    )}
                                </button>

                                {/* Lesson Title & Info under button */}
                                <div className="mt-2 text-center max-w-[150px]">
                                    <div className="font-black text-xs sm:text-sm text-slate-800 dark:text-slate-200 leading-snug">
                                        {lesson.shortTitle}
                                    </div>
                                    <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 mt-0.5 flex items-center justify-center gap-1">
                                        <Zap className="w-2.5 h-2.5 text-amber-500" />
                                        <span>+{lesson.xp} XP</span>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* 5. INTERACTIVE LESSON RUNNER MODAL */}
            {activeLessonData && (
                <RoadmapLessonModal
                    lesson={activeLessonData.lesson}
                    stage={activeLessonData.stage}
                    targetLang={langCode}
                    awardXP={awardXP}
                    onClose={handleCloseModal}
                    onLessonCompleted={handleLessonCompleted}
                />
            )}
        </section>
    );
};

export default HomeLearningRoadmap;
