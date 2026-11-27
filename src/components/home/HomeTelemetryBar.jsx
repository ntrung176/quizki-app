import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Flame, Gem, Zap } from 'lucide-react';
import { FlagIcon } from '../ui/FlagIcon';
import { useLanguage } from '../../context/LanguageContext';
import { useAiCredits } from '../../hooks/useAiCredits';
import { ROUTES } from '../../router';

const HomeTelemetryBar = ({
    streak = 0,
    totalMastered = 0,
    aiCreditsRemaining = null,
    targetLanguage = 'ja'
}) => {
    const { t } = useLanguage();
    const navigate = useNavigate();
    const { remaining: liveCredits, isUnlimited, initialized } = useAiCredits();

    const effectiveCredits = aiCreditsRemaining !== null && aiCreditsRemaining !== undefined
        ? (initialized ? liveCredits : Number(aiCreditsRemaining))
        : liveCredits;

    const countryCode = targetLanguage === 'en' ? 'gb' : targetLanguage === 'ko' ? 'kr' : 'jp';
    const langLabel = targetLanguage === 'en' ? 'English' : targetLanguage === 'ko' ? '한국어' : '日本語';
    const isLowCredits = !isUnlimited && Number(effectiveCredits) <= 10;

    return (
        <div className="bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-2xl p-2 sm:p-2.5 flex flex-wrap items-center justify-between gap-1.5 shadow-xs select-none">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80" title={t('home.activeLanguage', 'Ngôn ngữ đang học')}>
                <FlagIcon code={countryCode} className="w-5 h-3.5 rounded-[3px] shadow-xs" />
                <span className="text-xs font-black text-slate-700 dark:text-slate-200">{langLabel}</span>
            </div>

            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60" title={t('home.streakDaysTooltip', 'Chuỗi ngày học liên tiếp')}>
                <Flame className="w-4 h-4 text-orange-500 fill-orange-500" />
                <span className="text-xs font-black text-orange-600 dark:text-orange-400 tabular-nums">{streak}</span>
            </div>

            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800/60" title={t('home.totalMasteredTooltip', 'Tổng số thẻ đã thành thạo')}>
                <Gem className="w-4 h-4 text-sky-500 fill-sky-400/20" />
                <span className="text-xs font-black text-sky-600 dark:text-sky-400 tabular-nums">{totalMastered.toLocaleString()}</span>
            </div>

            <button
                type="button"
                onClick={() => navigate(ROUTES.UPGRADE)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl border transition-all cursor-pointer active:scale-95 ${
                    isLowCredits
                        ? 'bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/50 border-rose-200 dark:border-rose-800/70'
                        : 'bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/50 border-emerald-200 dark:border-emerald-800/70'
                }`}
                title={
                    isUnlimited
                        ? 'Credit AI: Không giới hạn (Quản trị viên)'
                        : `Số dư Credit AI: ${Number(effectiveCredits).toLocaleString()} Credit — Bấm để nạp thêm`
                }
            >
                <Zap className={`w-4 h-4 ${isLowCredits ? 'text-rose-500 fill-rose-500' : 'text-amber-500 fill-amber-400'} shrink-0`} />
                <span className={`text-xs font-black tabular-nums ${isLowCredits ? 'text-rose-600 dark:text-rose-300' : 'text-emerald-700 dark:text-emerald-300'}`}>
                    {isUnlimited ? '∞ AI' : `${Number(effectiveCredits).toLocaleString()} AI`}
                </span>
            </button>
        </div>
    );
};

export default HomeTelemetryBar;
