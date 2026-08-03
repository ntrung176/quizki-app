import React from 'react';
import { ArrowLeft, Settings, Maximize2, Minimize2 } from 'lucide-react';

const ReviewHeader = ({
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
    return (
        <>
            {/* Back Button - outside frame */}
            {onBack && (
                <div className="w-full flex justify-start mb-1">
                    <button
                        onClick={onBack}
                        className="p-2 flex items-center gap-1.5 justify-center rounded-xl bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-300 shadow-md border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700 transition-all hover:scale-105 cursor-pointer"
                        title="Trở lại"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        <span className="text-xs font-medium">Trở lại</span>
                    </button>
                </div>
            )}

            {/* Progress bar + Settings & Fullscreen */}
            <div className="w-full space-y-1 flex-shrink-0">
                <div className="flex justify-between items-center text-xs font-medium text-gray-500 dark:text-gray-400">
                    <span>{currentIndex + 1} / {totalCards}</span>
                    <div className="flex items-center gap-2">
                        {failedCount > 0 && <span className="text-red-500 font-semibold">({failedCount} sai)</span>}
                        {toggleFullscreen && (
                            <button
                                type="button"
                                onClick={toggleFullscreen}
                                className="p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all cursor-pointer"
                                title={isFullscreen ? "Thoát toàn màn hình (Esc)" : "Toàn màn hình"}
                            >
                                {isFullscreen ? <Minimize2 className="w-4 h-4 text-indigo-400" /> : <Maximize2 className="w-4 h-4" />}
                            </button>
                        )}
                        {reviewMode !== 'dictation' && reviewMode !== 'flashcard' && (
                            <button
                                type="button"
                                onClick={() => setShowSettings(true)}
                                className="p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all cursor-pointer"
                                title="Cài đặt"
                            >
                                <Settings className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                </div>
                <div className="h-1.5 w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div className="h-full bg-indigo-500 progress-bar rounded-full" style={{ width: `${progress}%` }}></div>
                </div>
            </div>
        </>
    );
};

export default ReviewHeader;
