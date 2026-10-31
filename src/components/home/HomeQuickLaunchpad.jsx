import React from 'react';
import { Zap } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

const iconColorMap = {
    'kana-study': 'text-rose-500',
    'kaiwa-ai': 'text-sky-500',
    'jlpt-test': 'text-amber-500',
    'add': 'text-emerald-500',
    'vocab-review': 'text-sky-500',
};

const HomeQuickLaunchpad = ({
    actions = [],
    onActionClick
}) => {
    const { t } = useLanguage();

    return (
        <div className="bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-xs">
            <div className="flex items-center gap-2 mb-3.5">
                <div className="w-7 h-7 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                    <Zap className="w-4 h-4 stroke-[2.5]" />
                </div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white uppercase tracking-wider">
                    {t('home.quickLaunchpad', 'Bắt đầu nhanh')}
                </h3>
            </div>

            {/* 2x2 Clean Duolingo Action Tiles - NO verbose subtitles */}
            <div className="grid grid-cols-2 gap-2.5">
                {actions.map((action) => {
                    const Icon = action.icon;
                    const colorClass = iconColorMap[action.id] || 'text-slate-700 dark:text-slate-200';
                    return (
                        <button
                            key={action.id}
                            type="button"
                            onClick={() => onActionClick(action)}
                            className="group flex flex-col justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border-2 border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 active:translate-y-0.5 active:border-b-2 border-b-4 hover:bg-slate-100/80 dark:hover:bg-slate-800 transition-all text-left select-none cursor-pointer"
                        >
                            <div className={`w-8 h-8 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-center font-bold ${colorClass} mb-2 shadow-xs group-hover:scale-105 transition-transform`}>
                                <Icon className="w-4 h-4 stroke-[2.5]" />
                            </div>
                            <span className="text-xs font-bold text-slate-900 dark:text-white leading-tight">
                                {action.title}
                            </span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
};

export default HomeQuickLaunchpad;
