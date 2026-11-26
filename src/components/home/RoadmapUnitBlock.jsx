import React from 'react';
import { Lock, CheckCircle2, Play, Zap, BookOpen } from 'lucide-react';
import { isLessonUnlocked } from '../../data/roadmap';

const LESSON_TYPE_STYLE = {
    vocab: {
        activeBg: 'bg-sky-500 hover:bg-sky-400 border-sky-300 border-b-sky-700 ring-sky-400/30 shadow-sky-500/35',
        doneBg: 'bg-sky-500 hover:bg-sky-400 border-sky-400 border-b-sky-700 shadow-sky-500/25',
        pill: 'bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/20'
    },
    kanji: {
        activeBg: 'bg-amber-500 hover:bg-amber-400 border-amber-300 border-b-amber-700 ring-amber-400/30 shadow-amber-500/35',
        doneBg: 'bg-amber-500 hover:bg-amber-400 border-amber-400 border-b-amber-700 shadow-amber-500/25',
        pill: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20'
    },
    grammar: {
        activeBg: 'bg-emerald-500 hover:bg-emerald-400 border-emerald-300 border-b-emerald-700 ring-emerald-400/30 shadow-emerald-500/35',
        doneBg: 'bg-emerald-500 hover:bg-emerald-400 border-emerald-400 border-b-emerald-700 shadow-emerald-500/25',
        pill: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20'
    },
    listening: {
        activeBg: 'bg-cyan-500 hover:bg-cyan-400 border-cyan-300 border-b-cyan-700 ring-cyan-400/30 shadow-cyan-500/35',
        doneBg: 'bg-cyan-500 hover:bg-cyan-400 border-cyan-400 border-b-cyan-700 shadow-cyan-500/25',
        pill: 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border-cyan-500/20'
    },
    jlpt: {
        activeBg: 'bg-teal-500 hover:bg-teal-400 border-teal-300 border-b-teal-700 ring-teal-400/30 shadow-teal-500/35',
        doneBg: 'bg-teal-500 hover:bg-teal-400 border-teal-400 border-b-teal-700 shadow-teal-500/25',
        pill: 'bg-teal-500/10 text-teal-700 dark:text-teal-300 border-teal-500/20'
    },
    milestone: {
        activeBg: 'bg-amber-500 hover:bg-amber-400 border-amber-300 border-b-amber-700 ring-amber-400/30 shadow-amber-500/40',
        doneBg: 'bg-emerald-500 hover:bg-emerald-400 border-emerald-400 border-b-emerald-700 shadow-emerald-500/30',
        pill: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30'
    }
};

const UNIT_BANNERS = [
    'from-emerald-500 to-teal-600 border-emerald-700',
    'from-sky-500 to-cyan-600 border-sky-700',
    'from-amber-500 to-orange-500 border-amber-700',
    'from-teal-500 to-emerald-600 border-teal-700'
];

const RoadmapUnitBlock = ({
    unit,
    unitIndex = 0,
    currentStage,
    lessonGlobalIndexMap,
    progress,
    currentActiveLessonId,
    onNodeClick
}) => {
    const lessons = unit.lessons || [];
    const doneInUnit = lessons.filter((l) => progress.completedLessons?.[l.id]?.completed).length;
    const bannerClass = UNIT_BANNERS[unitIndex % UNIT_BANNERS.length];

    return (
        <div className="space-y-6">
            {/* Unit Divider Header (Duolingo Colored Banner) */}
            <div className={`px-4 py-3.5 rounded-2xl bg-gradient-to-r ${bannerClass} border-b-4 text-white shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-2`}>
                <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                        {unit.bookLabel && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/20 text-[10px] font-black uppercase tracking-wider">
                                <BookOpen className="w-3 h-3" />
                                {unit.bookLabel}
                            </span>
                        )}
                        <span className="text-[11px] font-black opacity-90 font-mono">
                            {doneInUnit}/{lessons.length} bài
                        </span>
                    </div>
                    <h4 className="font-black text-sm sm:text-base mt-1 leading-snug">
                        {unit.title}
                    </h4>
                    {unit.subtitle && (
                        <p className="text-[11px] text-white/85 line-clamp-1 mt-0.5">
                            {unit.subtitle}
                        </p>
                    )}
                </div>
            </div>

            {/* Stepping Stone Nodes */}
            <div className="relative py-4 max-w-md mx-auto flex flex-col items-center">
                <div className="absolute top-10 bottom-10 left-1/2 -translate-x-1/2 w-1.5 border-l-4 border-dashed border-slate-300 dark:border-slate-700 pointer-events-none -z-0" />

                <div className="space-y-8 sm:space-y-10 w-full relative z-10">
                    {lessons.map((lesson, idx) => {
                        const globalIdx = lessonGlobalIndexMap.get(lesson.id) ?? idx;
                        const compEntry = progress.completedLessons?.[lesson.id];
                        const isCompleted = !!compEntry?.completed;
                        const isUnlocked = isLessonUnlocked(currentStage, globalIdx, progress);
                        const isActive = lesson.id === currentActiveLessonId || (!isCompleted && isUnlocked);
                        const isMilestone = !!lesson.isMilestone;
                        const lType = isMilestone ? 'milestone' : (lesson.lessonType || 'vocab');
                        const palette = LESSON_TYPE_STYLE[lType] || LESSON_TYPE_STYLE.vocab;
                        const counts = lesson.itemCounts || {
                            vocab: (lesson.items?.vocab || []).length,
                            kanji: (lesson.items?.kanji || []).length,
                            grammar: (lesson.items?.grammar || []).length
                        };

                        const offsetClass =
                            idx % 4 === 1
                                ? '-translate-x-10 sm:-translate-x-16'
                                : idx % 4 === 3
                                ? 'translate-x-10 sm:translate-x-16'
                                : 'translate-x-0';

                        const starsCount = compEntry?.stars || 3;

                        return (
                            <div
                                key={lesson.id}
                                className={`flex flex-col items-center transition-transform duration-300 ${offsetClass}`}
                            >
                                {isActive && !isCompleted && (
                                    <div className="mb-2 animate-bounce flex flex-col items-center">
                                        <div className="px-3 py-1 rounded-xl bg-emerald-500 text-white font-black text-[11px] uppercase tracking-wider shadow-lg shadow-emerald-500/30 flex items-center gap-1.5">
                                            <Play className="w-3 h-3 fill-white" />
                                            <span>{isMilestone ? 'Vượt ải!' : 'Bắt Đầu'}</span>
                                        </div>
                                        <div className="w-0 h-0 border-x-4 border-x-transparent border-t-6 border-t-emerald-500" />
                                    </div>
                                )}

                                <button
                                    type="button"
                                    onClick={() => onNodeClick(lesson, currentStage, isUnlocked, isCompleted)}
                                    className={`group relative rounded-full transition-all select-none cursor-pointer flex items-center justify-center ${
                                        isMilestone ? 'w-20 h-20 sm:w-24 sm:h-24' : 'w-16 h-16 sm:w-20 sm:h-20'
                                    } ${
                                        isCompleted
                                            ? `${palette.doneBg} border-4 border-b-[8px] text-white shadow-lg active:translate-y-1 active:border-b-4`
                                            : isActive
                                            ? `${palette.activeBg} border-4 border-b-[8px] text-white ring-8 shadow-xl active:translate-y-1 active:border-b-4`
                                            : 'bg-slate-200 dark:bg-slate-800 border-4 border-slate-300 dark:border-slate-700 border-b-[8px] border-b-slate-400 dark:border-b-slate-900 text-slate-400 cursor-not-allowed opacity-80'
                                    }`}
                                    title={isUnlocked ? lesson.title : 'Hoàn thành bài trước hoặc thi vượt chặng để mở khóa'}
                                >
                                    {isCompleted ? (
                                        <CheckCircle2 className="w-7 h-7 stroke-[3] text-white" />
                                    ) : !isUnlocked ? (
                                        <Lock className="w-6 h-6 stroke-[2.5]" />
                                    ) : isMilestone ? (
                                        <span className="text-3xl sm:text-4xl animate-bounce">👑</span>
                                    ) : (
                                        <span className="text-xl sm:text-2xl font-black font-japanese">
                                            {lesson.icon || 'あ'}
                                        </span>
                                    )}

                                    {isCompleted && (
                                        <div className="absolute -top-1.5 -right-1.5 px-1.5 h-6 rounded-full bg-amber-400 border-2 border-white dark:border-slate-900 text-amber-950 flex items-center justify-center text-[10px] font-black shadow-xs">
                                            {'★'.repeat(Math.min(3, Math.max(1, starsCount)))}
                                        </div>
                                    )}
                                </button>

                                <div className="mt-2 text-center max-w-[185px] space-y-1">
                                    <div className="font-black text-xs sm:text-sm text-slate-800 dark:text-slate-200 leading-snug">
                                        {lesson.shortTitle}
                                    </div>
                                    <div className="flex flex-wrap items-center justify-center gap-1 text-[10px] font-bold text-slate-500 dark:text-slate-400">
                                        {lesson.sourceBadge && (
                                            <span className={`px-1.5 py-0.5 rounded-md border ${palette.pill}`}>
                                                {lesson.sourceBadge}
                                            </span>
                                        )}
                                        <span className="inline-flex items-center gap-0.5">
                                            <Zap className="w-2.5 h-2.5 text-amber-500" />
                                            +{lesson.xp} XP
                                        </span>
                                    </div>
                                    {(counts.vocab > 0 || counts.kanji > 0 || counts.grammar > 0) && (
                                        <div className="text-[10px] font-mono text-slate-400 dark:text-slate-500">
                                            {[
                                                counts.vocab > 0 ? `+${counts.vocab} từ` : '',
                                                counts.kanji > 0 ? `+${counts.kanji} Kanji` : '',
                                                counts.grammar > 0 ? `+${counts.grammar} NP` : ''
                                            ].filter(Boolean).join(' • ')}
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default RoadmapUnitBlock;
