import React from 'react';
import { Volume2, Sparkles } from 'lucide-react';

/**
 * Duolingo-style Question Content Renderer
 * Handles Choice, Audio Choice, and Interactive Matching Pairs.
 */
const RoadmapQuestionContent = ({
    currentQ,
    stage,
    lesson,
    currentIdx = 0,
    totalQuestions = 1,
    selectedOption = null,
    answerStatus = null,
    onSelectOption,
    playAudio,
    isPlayingAudio = false,
    matchedPairs = new Set(),
    selectedLeft = null,
    selectedRight = null,
    shuffledRightPairs = [],
    mismatchShake = false,
    onSelectLeft,
    onSelectRight
}) => {
    if (!currentQ) return null;

    return (
        <div className="w-full max-w-3xl mx-auto flex flex-col justify-center space-y-6 sm:space-y-8 animate-in fade-in duration-200">
            {/* 1. Category Tag / Breadcrumb Badge */}
            <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 text-xs font-black uppercase tracking-wider border border-amber-200 dark:border-amber-900/60 shadow-2xs">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500 fill-amber-400" />
                    <span>{stage?.title?.split(':')[0] || 'LỘ TRÌNH'} • CÂU {currentIdx + 1}/{totalQuestions}</span>
                </span>
                {lesson?.shortTitle && (
                    <span className="text-xs font-bold text-slate-400 dark:text-slate-500 truncate max-w-[200px]">
                        {lesson.shortTitle}
                    </span>
                )}
            </div>

            {/* 2. Main Question Heading */}
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-slate-900 dark:text-white tracking-tight leading-snug text-left">
                {currentQ.prompt}
            </h2>

            {/* 3. Character Spotlight & Native Audio Pronunciation Banner */}
            {(currentQ.character || currentQ.audio) && (
                <div className="flex items-center justify-between sm:justify-start gap-4 p-5 sm:p-6 bg-slate-50 dark:bg-slate-900/80 rounded-3xl border-2 border-slate-200/90 dark:border-slate-800 shadow-xs">
                    {currentQ.audio && (
                        <button
                            type="button"
                            onClick={() => playAudio(currentQ.audio)}
                            className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl border-2 border-b-4 flex items-center justify-center transition-all cursor-pointer select-none active:translate-y-1 active:border-b-2 shrink-0 ${
                                isPlayingAudio
                                    ? 'bg-sky-500 border-sky-700 text-white scale-105 shadow-md shadow-sky-500/20'
                                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-sky-500 hover:bg-sky-50 dark:hover:bg-slate-750'
                            }`}
                            title="Nghe phát âm bản xứ"
                            aria-label="Phát âm"
                        >
                            <Volume2 className="w-7 h-7 sm:w-8 sm:h-8 stroke-[2.5]" />
                        </button>
                    )}

                    <div className="flex flex-col min-w-0">
                        {currentQ.character && (
                            <div className="font-japanese font-black text-3xl sm:text-4xl text-slate-900 dark:text-white tracking-wide">
                                {currentQ.character}
                            </div>
                        )}
                        {currentQ.reading && currentQ.reading !== currentQ.character && (
                            <div className="text-xs sm:text-sm font-bold text-slate-400 dark:text-slate-500 mt-0.5">
                                {currentQ.reading}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* 4. Type: Choice & Audio Choice */}
            {(currentQ.type === 'choice' || currentQ.type === 'audio_choice') && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 w-full pt-1">
                    {currentQ.options?.map((opt, idx) => {
                        const isSelected = selectedOption === idx;
                        let cardStyle = 'border-slate-200 dark:border-slate-800 border-b-slate-300 dark:border-b-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-850';

                        if (answerStatus) {
                            if (idx === currentQ.correctIndex) {
                                cardStyle = 'border-emerald-500 border-b-emerald-700 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-200';
                            } else if (isSelected && idx !== currentQ.correctIndex) {
                                cardStyle = 'border-rose-500 border-b-rose-700 bg-rose-50 dark:bg-rose-950/60 text-rose-800 dark:text-rose-200';
                            }
                        } else if (isSelected) {
                            cardStyle = 'border-sky-400 dark:border-sky-500 border-b-sky-600 dark:border-b-sky-700 bg-sky-50 dark:bg-sky-950/50 text-sky-800 dark:text-sky-200 ring-2 ring-sky-400/30';
                        }

                        return (
                            <button
                                key={idx}
                                type="button"
                                disabled={!!answerStatus}
                                onClick={() => onSelectOption(idx, opt)}
                                className={`p-4 sm:p-5 rounded-2xl border-2 border-b-4 font-bold text-left transition-all flex items-center justify-between gap-3 cursor-pointer select-none active:translate-y-1 active:border-b-2 ${cardStyle}`}
                            >
                                <span className="text-base sm:text-lg font-bold leading-snug">
                                    {opt}
                                </span>

                                {/* Duolingo Number Shortcut Badge */}
                                <span className="w-7 h-7 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-xs font-mono font-black flex items-center justify-center shrink-0">
                                    {idx + 1}
                                </span>
                            </button>
                        );
                    })}
                </div>
            )}

            {/* 5. Type: Matching Pairs */}
            {currentQ.type === 'matching' && (
                <div className="space-y-4 pt-1">
                    <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-semibold">
                        Chạm vào một từ bên trái, sau đó chạm vào nghĩa tương ứng bên phải để ghép cặp:
                    </p>
                    <div className={`grid grid-cols-2 gap-3 sm:gap-4 ${mismatchShake ? 'animate-shake' : ''}`}>
                        {/* Left column */}
                        <div className="space-y-3">
                            {currentQ.pairs?.map((pair, idx) => {
                                const isMatched = matchedPairs.has(pair.left);
                                const isSelected = selectedLeft?.left === pair.left;
                                return (
                                    <button
                                        key={`left-${idx}`}
                                        type="button"
                                        disabled={isMatched || !!answerStatus}
                                        onClick={() => onSelectLeft(pair)}
                                        className={`w-full p-4 rounded-2xl border-2 border-b-4 font-bold text-left text-sm sm:text-base transition-all select-none active:translate-y-0.5 ${
                                            isMatched
                                                ? 'opacity-40 border-emerald-400 border-b-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 line-through cursor-default'
                                                : isSelected
                                                ? 'border-sky-500 border-b-sky-700 bg-sky-50 dark:bg-sky-950/50 text-sky-700 ring-2 ring-sky-400/30 cursor-pointer'
                                                : 'border-slate-200 dark:border-slate-700 border-b-slate-300 dark:border-b-slate-800 bg-white dark:bg-slate-850 text-slate-800 dark:text-white hover:border-slate-300 cursor-pointer'
                                        }`}
                                    >
                                        {pair.left}
                                    </button>
                                );
                            })}
                        </div>

                        {/* Right column */}
                        <div className="space-y-3">
                            {shuffledRightPairs.map((pair, idx) => {
                                const isMatched = matchedPairs.has(pair.left);
                                const isSelected = selectedRight?.left === pair.left;
                                return (
                                    <button
                                        key={`right-${idx}`}
                                        type="button"
                                        disabled={isMatched || !!answerStatus}
                                        onClick={() => onSelectRight(pair)}
                                        className={`w-full p-4 rounded-2xl border-2 border-b-4 font-bold text-left text-sm sm:text-base transition-all select-none active:translate-y-0.5 ${
                                            isMatched
                                                ? 'opacity-40 border-emerald-400 border-b-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 line-through cursor-default'
                                                : isSelected
                                                ? 'border-sky-500 border-b-sky-700 bg-sky-50 dark:bg-sky-950/50 text-sky-700 ring-2 ring-sky-400/30 cursor-pointer'
                                                : 'border-slate-200 dark:border-slate-700 border-b-slate-300 dark:border-b-slate-800 bg-white dark:bg-slate-850 text-slate-800 dark:text-white hover:border-slate-300 cursor-pointer'
                                        }`}
                                    >
                                        {pair.right}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default RoadmapQuestionContent;

