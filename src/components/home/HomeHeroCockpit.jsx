import React from 'react';
import { ArrowRight, CheckCircle2, Clock } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

const HomeHeroCockpit = ({
    effectiveDisplayName,
    totalDue = 0,
    isInitialLoading = false,
    onStartReview,
    onLearnNew
}) => {
    const { t } = useLanguage();
    const estimatedMins = Math.max(3, Math.ceil(totalDue * 0.25));

    return (
        <div className="bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xs">
            {/* Header: Greeting */}
            <div className="mb-4">
                <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                    {effectiveDisplayName ? `${effectiveDisplayName}!` : t('home.helloUser', 'Chào bạn!')} 👋
                </h1>
            </div>

            {/* Primary Action Card (Duolingo Style: Big, Clean, Action-Focused) */}
            <div>
                {totalDue > 0 ? (
                    <div className="bg-slate-50 dark:bg-slate-800/60 border-2 border-emerald-500/25 dark:border-emerald-500/30 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="space-y-1.5">
                            <div className="flex items-center gap-2">
                                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-200/80 dark:border-rose-800/80 flex items-center gap-1.5">
                                    <Clock className="w-3 h-3" />
                                    ~{estimatedMins} {t('common.minutes', 'phút')}
                                </span>
                            </div>
                            <h2 className="font-extrabold text-base sm:text-xl text-slate-900 dark:text-white">
                                {totalDue} {t('home.dueVocab', 'từ vựng cần ôn')}
                            </h2>
                        </div>

                        <button
                            type="button"
                            onClick={onStartReview}
                            className="shrink-0 px-6 py-3.5 bg-emerald-500 hover:bg-emerald-400 active:translate-y-1 active:border-b-0 border-b-4 border-emerald-700 text-white font-black text-sm sm:text-base rounded-2xl shadow-md transition-all uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer select-none"
                        >
                            <span>{t('home.startDailyReview', 'Bắt đầu ôn tập ngay')}</span>
                            <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                        </button>
                    </div>
                ) : (
                    <div className="bg-slate-50 dark:bg-slate-800/60 border-2 border-emerald-500/25 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold text-base">
                            <CheckCircle2 className="w-5 h-5" />
                            <span>{t('home.allCaughtUp', 'Đã hoàn thành xuất sắc hôm nay! 🎉')}</span>
                        </div>

                        <button
                            type="button"
                            onClick={onLearnNew}
                            className="shrink-0 px-5 py-3 bg-indigo-600 hover:bg-indigo-500 active:translate-y-1 active:border-b-0 border-b-4 border-indigo-800 text-white font-black text-xs sm:text-sm rounded-2xl shadow-md transition-all uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer select-none"
                        >
                            <span>{t('home.learnNewWords', 'Học bài mới')}</span>
                            <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default HomeHeroCockpit;
