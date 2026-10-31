import React from 'react';
import { BookOpen } from 'lucide-react';

const QuizKiLogo = ({
    size = 'md', // 'sm' | 'md' | 'lg'
    showSubtitle = true,
    subtitleText = 'LEARNING PLATFORM',
    isIconOnly = false,
    className = ''
}) => {
    const iconSizes = {
        sm: { box: 'w-7 h-7 rounded-xl', icon: 'w-3.5 h-3.5 stroke-[2.5]', text: 'text-base', badge: 'text-[9px]' },
        md: { box: 'w-9 h-9 rounded-2xl', icon: 'w-4.5 h-4.5 stroke-[2.5]', text: 'text-xl', badge: 'text-[10px]' },
        lg: { box: 'w-11 h-11 rounded-2xl', icon: 'w-5.5 h-5.5 stroke-[2.5]', text: 'text-2xl', badge: 'text-xs' }
    };
    const s = iconSizes[size] || iconSizes.md;

    return (
        <div className={`flex items-center gap-2.5 select-none ${className}`}>
            <div className={`${s.box} bg-emerald-500 rounded-2xl flex items-center justify-center text-white shadow-md shadow-emerald-500/20 border-b-2 border-emerald-600 shrink-0 transition-transform group-hover:scale-105`}>
                <BookOpen className={s.icon} />
            </div>

            {!isIconOnly && (
                <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-1.5 leading-none">
                        <span className={`${s.text} font-black tracking-tight text-slate-900 dark:text-white`}>
                            QuizKi
                        </span>
                        <span className={`${s.badge} font-mono font-black text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800 uppercase`}>
                            AI
                        </span>
                    </div>
                    {showSubtitle && (
                        <span className="text-[9px] font-mono font-bold tracking-widest text-slate-400 dark:text-slate-500 uppercase mt-0.5 truncate">
                            {subtitleText}
                        </span>
                    )}
                </div>
            )}
        </div>
    );
};

export default QuizKiLogo;

