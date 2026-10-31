import React from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { ArrowLeft, Settings, Maximize2, Minimize2 } from 'lucide-react';

const ReviewHeader = ({
    // review header

    onBack,
    currentIndex,
    totalCards,
    failedCount,
    reviewMode,
    setShowSettings,
    progress,
    isFullscreen,
    toggleFullscreen
}) => {
    const { t } = useLanguage();
    return (
        <>
            {/* Back Button - outside frame */}
            {onBack && (
                <div className="w-full flex justify-start mb-1">
                    <button
                        onClick={onBack}
                        className="px-3.5 py-2 flex items-center gap-1.5 justify-center rounded-2xl bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 shadow-xs border-2 border-b-4 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 active:translate-y-0.5 active:border-b-2 font-bold transition-all cursor-pointer select-none"
                        title={t('common.back', 'Trở lại')}
                    >
                        <ArrowLeft className="w-4 h-4" />
                        <span className="text-xs sm:text-sm font-bold">{t('common.back', 'Trở lại')}</span>
                    </button>
                </div>
            )}

            {/* Progress bar + Settings & Fullscreen */}
            <div className="w-full space-y-2 flex-shrink-0">
                <div className="flex justify-between items-center text-xs font-bold text-slate-600 dark:text-slate-400">
                    <span className="bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 px-2.5 py-0.5 rounded-full font-mono font-black text-xs">
                        {currentIndex + 1} / {totalCards}
                    </span>
                    <div className="flex items-center gap-2">
                        {failedCount > 0 && (
                            <span className="bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 px-2 py-0.5 rounded-full font-bold text-xs">
                                ({failedCount} {t('common.incorrectCount', 'sai')})
                            </span>
                        )}
                        {toggleFullscreen && (
                            <button
                                type="button"
                                onClick={toggleFullscreen}
                                className="p-1.5 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all cursor-pointer"
                                title={isFullscreen ? t('common.exitFullscreen', 'Thoát toàn màn hình (Esc)') : t('common.fullscreen', 'Toàn màn hình')}
                            >
                                {isFullscreen ? <Minimize2 className="w-4 h-4 text-emerald-500" /> : <Maximize2 className="w-4 h-4" />}
                            </button>
                        )}
                        {reviewMode !== 'dictation' && reviewMode !== 'flashcard' && (
                            <button
                                type="button"
                                onClick={() => setShowSettings(true)}
                                className="p-1.5 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all cursor-pointer"
                                title={t('common.settings', 'Cài đặt')}
                            >
                                <Settings className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                </div>
                <div className="h-3.5 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden p-0.5 border border-slate-300/40 dark:border-slate-700">
                    <div className="h-full bg-emerald-500 rounded-full transition-all duration-500 ease-out shadow-xs" style={{ width: `${progress}%` }}></div>
                </div>
            </div>
        </>
    );
};

export default ReviewHeader;
