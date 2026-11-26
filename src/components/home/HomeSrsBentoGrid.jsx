import React, { useState, useEffect } from 'react';
import { BookOpen, Languages, Layers, ArrowRight, Check, Clock } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

const StatSkeleton = () => (
    <div className="h-8 w-14 bg-slate-200 dark:bg-slate-800 rounded-xl animate-pulse" />
);

// Đồng hồ đếm ngược SRS hiển thị trực tiếp trên thẻ Bento
const BentoCountdownBadge = ({ targetMs }) => {
    const validTargetMs = typeof targetMs === 'number' && !isNaN(targetMs) && targetMs > 0 ? targetMs : 0;
    const [secondsLeft, setSecondsLeft] = useState(() =>
        validTargetMs > 0 ? Math.max(0, Math.ceil((validTargetMs - Date.now()) / 1000)) : 0
    );

    useEffect(() => {
        if (!validTargetMs) return;
        const update = () => {
            const left = Math.max(0, Math.ceil((validTargetMs - Date.now()) / 1000));
            setSecondsLeft(left);
        };
        update();
        const interval = setInterval(update, 1000);
        return () => clearInterval(interval);
    }, [validTargetMs]);

    if (!validTargetMs || secondsLeft <= 0) {
        return (
            <div className="w-full py-2.5 px-3 rounded-2xl font-black text-xs uppercase tracking-wider bg-slate-100 dark:bg-slate-800/80 border-2 border-slate-200 dark:border-slate-700/80 text-slate-500 dark:text-slate-400 flex items-center justify-center gap-2 select-none shadow-xs">
                <Check className="w-4 h-4 text-emerald-500 stroke-[3]" />
                <span>HẾT THẺ ÔN TẬP</span>
            </div>
        );
    }

    const hours = Math.floor(secondsLeft / 3600);
    const mins = Math.floor((secondsLeft % 3600) / 60);
    const secs = secondsLeft % 60;
    const pad = (n) => String(n).padStart(2, '0');
    const formatted = hours > 0
        ? `${pad(hours)}:${pad(mins)}:${pad(secs)}`
        : `${pad(mins)}:${pad(secs)}`;

    return (
        <div className="w-full py-2.5 px-3 rounded-2xl font-black text-xs uppercase tracking-wider bg-slate-100 dark:bg-slate-800/90 border-2 border-slate-200 dark:border-slate-700/80 text-slate-600 dark:text-slate-300 flex items-center justify-center gap-2 select-none shadow-xs">
            <Clock className="w-3.5 h-3.5 text-amber-500 animate-spin-slow shrink-0" />
            <span className="font-mono font-bold tracking-wider">TIẾP SAU: {formatted}</span>
        </div>
    );
};

const HomeSrsBentoGrid = ({
    stats,
    kanjiSrsStats,
    grammarSrsStats,
    isJapaneseMode = true,
    onTriggerReview
}) => {
    const { t } = useLanguage();

    // 1. Vocabulary Calculations
    const vocabTotal = stats?.totalCards ?? 0;
    const vocabMastered = stats?.masteredCards ?? 0;
    const vocabDue = stats?.dueCards ?? 0;
    const vocabPct = vocabTotal > 0 ? Math.round((vocabMastered / vocabTotal) * 100) : 0;

    // 2. Kanji Calculations
    const kanjiTotal = kanjiSrsStats?.total ?? 0;
    const kanjiMastered = kanjiSrsStats?.mastered ?? 0;
    const kanjiDue = kanjiSrsStats?.dueCount ?? 0;
    const kanjiPct = kanjiTotal > 0 ? Math.round((kanjiMastered / kanjiTotal) * 100) : 0;

    // 3. Grammar Calculations
    const grammarTotal = grammarSrsStats?.total ?? 0;
    const grammarMastered = grammarSrsStats?.mastered ?? 0;
    const grammarDue = grammarSrsStats?.dueCount ?? 0;
    const grammarPct = grammarTotal > 0 ? Math.round((grammarMastered / grammarTotal) * 100) : 0;

    const pillars = [
        {
            id: 'vocab',
            title: t('home.pillarVocab', 'Kho Từ Vựng'),
            icon: BookOpen,
            iconColor: 'text-sky-600 dark:text-sky-400',
            buttonClass: 'bg-sky-500 hover:bg-sky-400 border-b-4 border-sky-700',
            progressColor: 'bg-sky-500',
            due: vocabDue,
            pct: vocabPct,
            isLoading: stats?.isInitialLoading,
            nextDueTime: stats?.nextDueTime
        },
        ...(isJapaneseMode ? [
            {
                id: 'kanji',
                title: t('home.pillarKanji', 'Hán Tự Kanji'),
                icon: Languages,
                iconColor: 'text-amber-600 dark:text-amber-400',
                buttonClass: 'bg-amber-500 hover:bg-amber-400 border-b-4 border-amber-700',
                progressColor: 'bg-amber-500',
                due: kanjiDue,
                pct: kanjiPct,
                isLoading: kanjiSrsStats?.isInitialLoading,
                nextDueTime: kanjiSrsStats?.nextDueTime
            },
            {
                id: 'grammar',
                title: t('home.pillarGrammar', 'Ngữ Pháp'),
                icon: Layers,
                iconColor: 'text-teal-600 dark:text-teal-400',
                buttonClass: 'bg-teal-600 hover:bg-teal-500 border-b-4 border-teal-800',
                progressColor: 'bg-teal-600',
                due: grammarDue,
                pct: grammarPct,
                isLoading: grammarSrsStats?.isInitialLoading,
                nextDueTime: grammarSrsStats?.nextDueTime
            }
        ] : [])
    ];

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {pillars.map((p) => {
                const Icon = p.icon;
                const hasDue = !p.isLoading && p.due > 0;
                return (
                    <div
                        key={p.id}
                        onClick={() => {
                            if (hasDue) {
                                onTriggerReview(p.id);
                            }
                        }}
                        className={`group bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-xs transition-all duration-200 flex flex-col justify-between select-none ${
                            hasDue ? 'cursor-pointer hover:border-slate-300 dark:hover:border-slate-700' : 'cursor-default'
                        }`}
                    >
                        <div>
                            {/* Card Header: Icon + Title only (clean, no clutter) */}
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700 flex items-center justify-center font-bold">
                                    <Icon className={`w-5 h-5 stroke-[2.5] ${p.iconColor}`} />
                                </div>
                                <h3 className="font-extrabold text-base text-slate-900 dark:text-white leading-tight">
                                    {p.title}
                                </h3>
                            </div>

                            {/* Core Metric: Exactly ONE clear status (no redundant duplicates) */}
                            <div className="mb-3">
                                {p.isLoading ? (
                                    <div className="flex items-center gap-2.5 py-1">
                                        <StatSkeleton />
                                        <span className="text-xs font-bold text-sky-600 dark:text-sky-400 animate-pulse">
                                            {t('common.syncing', 'Đang đồng bộ...')}
                                        </span>
                                    </div>
                                ) : hasDue ? (
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-3xl font-black font-mono text-slate-900 dark:text-white leading-none">
                                            {p.due}
                                        </span>
                                        <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                            thẻ cần ôn
                                        </span>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold text-sm py-1">
                                        <Check className="w-5 h-5 stroke-[3]" />
                                        <span>Đã hoàn thành</span>
                                    </div>
                                )}
                            </div>

                            {/* Sleek, subtle progress line */}
                            <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden mb-4">
                                <div
                                    className={`h-full ${p.isLoading ? 'bg-sky-400/60 animate-pulse w-1/3' : p.progressColor} rounded-full transition-all duration-500`}
                                    style={p.isLoading ? undefined : { width: `${Math.min(100, Math.max(0, p.pct))}%` }}
                                />
                            </div>
                        </div>

                        {/* Duolingo-styled 3D Button or Countdown Badge when finished */}
                        <div className="pt-1">
                            {p.isLoading ? (
                                <div className="w-full py-2.5 px-3 rounded-2xl font-black text-xs uppercase tracking-wider bg-sky-500/10 border-2 border-sky-500/20 text-sky-600 dark:text-sky-400 flex items-center justify-center gap-2 select-none">
                                    <span className="w-2 h-2 rounded-full bg-sky-500 animate-ping shrink-0" />
                                    <span>{t('common.syncingCloudShort', 'ĐANG ĐỒNG BỘ...')}</span>
                                </div>
                            ) : hasDue ? (
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onTriggerReview(p.id);
                                    }}
                                    className={`w-full py-2.5 px-4 rounded-2xl font-black text-xs uppercase tracking-wider text-white ${p.buttonClass} active:translate-y-0.5 active:border-b-0 transition-all flex items-center justify-center gap-2 shadow-xs cursor-pointer`}
                                >
                                    <span>Ôn tập ngay</span>
                                    <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                                </button>
                            ) : (
                                <BentoCountdownBadge targetMs={p.nextDueTime} />
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export default HomeSrsBentoGrid;
