import React, { useEffect } from 'react';
import { Zap, RotateCcw, ChevronRight, ArrowLeft } from 'lucide-react';
import { launchFanfare } from '../../utils/celebrations';

export const UnifiedStudyCompleteModal = ({
    totalCards = 0,
    title = 'Xuất sắc!',
    subtitle = null,
    badgeText = '100% Thuần thục',
    onRestart,
    onComplete,
    onBack
}) => {
    useEffect(() => {
        launchFanfare();
    }, []);

    const handleDoneClick = () => {
        if (onComplete) onComplete();
        else if (onBack) onBack();
    };

    return (
        <div className="relative w-full min-h-[calc(100vh-6rem)] flex flex-col items-center justify-center py-6 px-4 animate-fade-in">
            {/* Top Toolbar (Back) */}
            <div className="w-full max-w-md flex items-center justify-start mb-4">
                {onBack && (
                    <button
                        type="button"
                        onClick={onBack}
                        className="px-3 py-1.5 flex items-center gap-1.5 rounded-xl bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-200 shadow-md border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700 transition-all hover:scale-105 cursor-pointer text-xs font-semibold"
                        title="Trở lại"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        <span>Trở lại</span>
                    </button>
                )}
            </div>

            {/* Central Completion Card - Styled consistently for all 6 study modes */}
            <div className="w-full max-w-md mx-auto flex flex-col items-center justify-center text-center space-y-6 p-8 bg-white dark:bg-slate-900/90 border-2 border-indigo-400/40 dark:border-indigo-500/30 rounded-3xl shadow-2xl backdrop-blur-xl">
                <div className="text-6xl mb-1 animate-bounce">🎉</div>
                
                <div>
                    <h2 className="text-3xl font-black text-slate-800 dark:text-white mb-2 tracking-tight">
                        {title}
                    </h2>
                    <p className="text-slate-600 dark:text-slate-300 text-base font-medium">
                        {subtitle || (totalCards > 0 ? (
                            <>Bạn đã thuần thục <span className="font-bold text-emerald-600 dark:text-emerald-400">{totalCards}</span> từ vựng</>
                        ) : 'Bạn đã hoàn thành phiên học này.')}
                    </p>
                </div>

                {/* Badge Metric */}
                <div className="w-full bg-slate-50 dark:bg-slate-950/80 rounded-2xl p-4 border border-emerald-200/60 dark:border-emerald-800/50 shadow-inner">
                    <div className="flex items-center justify-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold text-base">
                        <Zap className="w-5 h-5 fill-emerald-500/20 text-emerald-500" />
                        <span>{badgeText}</span>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col gap-3 w-full pt-2">
                    <button
                        type="button"
                        onClick={handleDoneClick}
                        className="w-full py-3.5 bg-gradient-to-r from-indigo-600 via-indigo-500 to-sky-500 hover:from-indigo-500 hover:to-sky-400 text-white font-bold text-base rounded-2xl shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 transition-all hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center gap-2 cursor-pointer"
                    >
                        <span>🏆 Hoàn thành xuất sắc! 🏆</span>
                        <ChevronRight className="w-5 h-5" />
                    </button>

                    {onRestart && (
                        <button
                            type="button"
                            onClick={onRestart}
                            className="w-full py-3 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-300 font-semibold rounded-2xl border border-indigo-200/60 dark:border-indigo-800/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 transition-all flex items-center justify-center gap-2 cursor-pointer text-sm"
                        >
                            <RotateCcw className="w-4 h-4" />
                            <span>Học lại</span>
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default UnifiedStudyCompleteModal;
