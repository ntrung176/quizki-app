import React from 'react';
import { X, Heart } from 'lucide-react';

/**
 * Duolingo-style Full-screen Lesson Header Bar
 * Displays exit button, animated capsule progress bar, and hearts counter.
 */
const RoadmapLessonHeader = ({
    progressPercent = 0,
    hearts = 5,
    onCloseClick
}) => {
    return (
        <header className="w-full max-w-5xl mx-auto px-4 sm:px-8 pt-4 sm:pt-6 pb-3 flex items-center justify-between gap-4 sm:gap-6 shrink-0">
            {/* 1. Close (X) Button */}
            <button
                type="button"
                onClick={onCloseClick}
                className="w-10 h-10 rounded-2xl flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-all cursor-pointer select-none active:scale-95"
                title="Đóng bài học"
                aria-label="Đóng bài học"
            >
                <X className="w-6 h-6 stroke-[2.5]" />
            </button>

            {/* 2. Duolingo Capsule Progress Bar */}
            <div className="flex-1 max-w-3xl">
                <div className="w-full bg-slate-200 dark:bg-slate-800 h-4 rounded-full overflow-hidden p-0.5 border border-slate-300/40 dark:border-slate-700/60">
                    <div
                        className="h-full bg-emerald-500 rounded-full transition-all duration-400 ease-out relative"
                        style={{ width: `${Math.min(100, Math.max(5, progressPercent))}%` }}
                    >
                        {/* 3D highlight reflection stripe */}
                        <div className="absolute top-0.5 left-1 right-1 h-1 bg-white/40 rounded-full pointer-events-none" />
                    </div>
                </div>
            </div>

            {/* 3. Hearts / Lives Counter */}
            <div className="flex items-center gap-1.5 px-3.5 py-1.5 bg-rose-50 dark:bg-rose-950/40 rounded-2xl border border-rose-200 dark:border-rose-900/60 shrink-0 select-none shadow-2xs">
                <Heart className="w-4 h-4 sm:w-5 sm:h-5 text-rose-500 fill-rose-500 animate-pulse" />
                <span className="font-black text-xs sm:text-sm text-rose-600 dark:text-rose-400">
                    {hearts}
                </span>
            </div>
        </header>
    );
};

export default RoadmapLessonHeader;

