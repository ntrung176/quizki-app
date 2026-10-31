import React from 'react';
import { Flame, Gem } from 'lucide-react';
import { FlagIcon } from '../ui/FlagIcon';
import { useLanguage } from '../../context/LanguageContext';

const HomeTelemetryBar = ({
    streak = 0,
    totalMastered = 0,
    targetLanguage = 'ja'
}) => {
    const { t } = useLanguage();

    const countryCode = targetLanguage === 'en' ? 'gb' : targetLanguage === 'ko' ? 'kr' : 'jp';
    const langLabel = targetLanguage === 'en' ? 'English' : targetLanguage === 'ko' ? '한국어' : '日本語';

    return (
        <div className="bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-2xl p-2 sm:p-2.5 flex items-center justify-between shadow-xs select-none">
            {/* 1. Target Language */}
            <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 font-bold text-xs text-slate-700 dark:text-slate-200">
                <FlagIcon countryCode={countryCode} className="w-4 h-3 rounded-xs object-cover" />
                <span>{langLabel}</span>
            </div>

            {/* 2. Streak */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800/80 font-black text-xs text-amber-600 dark:text-amber-400" title={t('home.studyStreak', 'Chuỗi ngày học')}>
                <Flame className="w-4 h-4 fill-current animate-pulse text-amber-500" />
                <span>{streak}</span>
            </div>

            {/* 3. Mastered / Gems */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-200/80 dark:border-cyan-800/80 font-black text-xs text-cyan-600 dark:text-cyan-400" title={t('home.masteredLabel', 'Đã thuộc')}>
                <Gem className="w-4 h-4 text-cyan-500 fill-cyan-400/20" />
                <span>{totalMastered.toLocaleString()}</span>
            </div>
        </div>
    );
};

export default HomeTelemetryBar;
