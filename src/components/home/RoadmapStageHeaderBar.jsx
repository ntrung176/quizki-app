import React from 'react';
import { Lock, Unlock, Loader2, Sparkles } from 'lucide-react';
import { getStageStats } from '../../data/roadmap';

const STAGE_LEVEL_PILL = {
    Kana: 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/25',
    N5: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/25',
    N4: 'bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-500/25',
    N3: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/25',
    N2: 'bg-teal-500/15 text-teal-600 dark:text-teal-400 border-teal-500/25',
    N1: 'bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border-cyan-500/25'
};

const RoadmapStageHeaderBar = ({
    stages = [],
    progress = {},
    selectedStageNum = 1,
    onSelectStage,
    currentStage,
    currentStageStats,
    isLoadingStage = false,
    onJumpTestStage
}) => {
    const isCurrentStageUnlocked = (progress.unlockedStages || [1]).includes(currentStage?.stage);

    return (
        <>
            {/* Stage Selector Pills Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-5">
                {stages.map((st) => {
                    const isSelected = st.stage === selectedStageNum;
                    const isStageUnlocked = (progress.unlockedStages || [1]).includes(st.stage);
                    const stats = getStageStats(st, progress);

                    return (
                        <button
                            key={st.stage}
                            type="button"
                            onClick={() => onSelectStage(st.stage)}
                            className={`p-2.5 sm:p-3 rounded-2xl border-2 border-b-4 text-left transition-all cursor-pointer select-none active:translate-y-0.5 active:border-b-2 relative overflow-hidden ${
                                isSelected
                                    ? 'bg-emerald-500 border-emerald-400 border-b-emerald-700 text-white shadow-md shadow-emerald-500/20'
                                    : isStageUnlocked
                                    ? 'bg-slate-50 dark:bg-slate-850 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-700 dark:text-slate-200'
                                    : 'bg-slate-100/60 dark:bg-slate-900/60 border-slate-200/60 dark:border-slate-800/60 text-slate-400 hover:opacity-100 opacity-80'
                            }`}
                        >
                            <div className="flex items-center justify-between gap-1 mb-1">
                                <div className="flex items-center gap-1">
                                    <span className="text-base">{st.icon}</span>
                                    {st.jlptLevel && (
                                        <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-md border ${
                                            isSelected
                                                ? 'bg-white/20 text-white border-white/30'
                                                : (STAGE_LEVEL_PILL[st.jlptLevel] || STAGE_LEVEL_PILL.N5)
                                        }`}>
                                            {st.jlptLevel}
                                        </span>
                                    )}
                                </div>
                                {stats.isAllCompleted ? (
                                    <span className={`text-[10px] font-black px-1.5 py-0.2 rounded-md ${
                                        isSelected ? 'bg-white/20 text-white' : 'bg-amber-100 dark:bg-amber-950 text-amber-600'
                                    }`}>
                                        ★ 100%
                                    </span>
                                ) : !isStageUnlocked ? (
                                    <Lock className="w-3.5 h-3.5 opacity-60 shrink-0" />
                                ) : (
                                    <span className={`text-[10px] font-black ${isSelected ? 'text-white/90' : 'text-slate-400'}`}>
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

            {/* Active Stage Hero Banner */}
            {currentStage && (
                <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-sky-500/10 border-2 border-emerald-300/40 dark:border-emerald-800/40 mb-6 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                                <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md text-white shadow-xs ${
                                    isCurrentStageUnlocked ? 'bg-emerald-500' : 'bg-slate-500'
                                }`}>
                                    {isCurrentStageUnlocked ? `Đang mở: Chặng ${currentStage.stage}` : `Chặng ${currentStage.stage} đang khóa`}
                                </span>
                                {currentStage.jlptLevel && (
                                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-sky-500 text-white shadow-xs">
                                        {currentStage.jlptLevel}
                                    </span>
                                )}
                                {currentStageStats.isAllCompleted && (
                                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-amber-500 text-white flex items-center gap-1 shadow-xs">
                                        🏆 Đã Hoàn Thành
                                    </span>
                                )}
                                {isLoadingStage && (
                                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-sky-600 dark:text-sky-400">
                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                        Đang tải bài học...
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

                        <div className="shrink-0 sm:text-right flex flex-col sm:items-end gap-2">
                            <div>
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
                            {!isCurrentStageUnlocked && onJumpTestStage && (
                                <button
                                    type="button"
                                    onClick={() => onJumpTestStage(currentStage.stage)}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 border-b-2 border-amber-700 text-white text-[11px] font-black uppercase tracking-wider shadow-xs cursor-pointer active:translate-y-0.5 transition"
                                >
                                    <Unlock className="w-3.5 h-3.5" />
                                    <span>Thi vượt chặng mở khóa</span>
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Stage SRS Yield Bar */}
                    {currentStage.stats && (
                        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-emerald-500/15 text-[11px] font-bold text-slate-600 dark:text-slate-300">
                            <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400">
                                <Sparkles className="w-3.5 h-3.5" />
                                Đồng bộ SRS sau mỗi bài:
                            </span>
                            {currentStage.stats.vocabCount > 0 && (
                                <span className="px-2 py-0.5 rounded-lg bg-sky-500/10 text-sky-700 dark:text-sky-300 border border-sky-500/20 font-mono">
                                    📚 {currentStage.stats.vocabCount} Từ vựng
                                </span>
                            )}
                            {currentStage.stats.kanjiCount > 0 && (
                                <span className="px-2 py-0.5 rounded-lg bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20 font-mono">
                                    🈶 {currentStage.stats.kanjiCount} Kanji
                                </span>
                            )}
                            {currentStage.stats.grammarCount > 0 && (
                                <span className="px-2 py-0.5 rounded-lg bg-teal-500/10 text-teal-700 dark:text-teal-300 border border-teal-500/20 font-mono">
                                    📝 {currentStage.stats.grammarCount} Ngữ pháp
                                </span>
                            )}
                        </div>
                    )}
                </div>
            )}
        </>
    );
};

export default RoadmapStageHeaderBar;
