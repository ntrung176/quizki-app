import React from 'react';
import { CheckCircle2, XCircle, ArrowRight } from 'lucide-react';

/**
 * Duolingo-style Full-screen Lesson Footer Bar
 * Houses the iconic "BỎ QUA" (Skip), "KIỂM TRA" (Check) and feedback results.
 */
const RoadmapLessonFooter = ({
    answerStatus,
    canCheck = false,
    isMatching = false,
    explanation = '',
    correctAnswerText = '',
    onSkip,
    onCheck,
    onNext
}) => {
    const isCorrect = answerStatus === 'correct';
    const isIncorrect = answerStatus === 'incorrect';

    return (
        <footer
            className={`w-full border-t-2 py-4 sm:py-6 px-4 sm:px-8 transition-colors duration-250 shrink-0 ${
                isCorrect
                    ? 'bg-emerald-100/90 dark:bg-emerald-950/90 border-emerald-300 dark:border-emerald-800'
                    : isIncorrect
                    ? 'bg-rose-100/90 dark:bg-rose-950/90 border-rose-300 dark:border-rose-800'
                    : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800'
            }`}
        >
            <div className="max-w-5xl mx-auto w-full flex flex-col sm:flex-row items-center justify-between gap-4">
                {/* 1. LEFT SIDE: Skip button OR Result Feedback Banner */}
                <div className="w-full sm:w-auto flex-1 min-w-0">
                    {isCorrect ? (
                        <div className="flex items-center gap-3 sm:gap-4 animate-in fade-in duration-200">
                            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-white dark:bg-slate-900 text-emerald-500 flex items-center justify-center shrink-0 shadow-md border-2 border-emerald-400">
                                <CheckCircle2 className="w-8 h-8 sm:w-9 sm:h-9 stroke-[2.5]" />
                            </div>
                            <div className="min-w-0">
                                <h3 className="text-lg sm:text-xl font-black text-emerald-800 dark:text-emerald-200 tracking-tight">
                                    Làm tốt lắm! 🎉
                                </h3>
                                {explanation && (
                                    <p className="text-xs sm:text-sm font-semibold text-emerald-700/90 dark:text-emerald-300/90 mt-0.5 line-clamp-2">
                                        {explanation}
                                    </p>
                                )}
                            </div>
                        </div>
                    ) : isIncorrect ? (
                        <div className="flex items-center gap-3 sm:gap-4 animate-in fade-in duration-200">
                            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-white dark:bg-slate-900 text-rose-500 flex items-center justify-center shrink-0 shadow-md border-2 border-rose-400">
                                <XCircle className="w-8 h-8 sm:w-9 sm:h-9 stroke-[2.5]" />
                            </div>
                            <div className="min-w-0">
                                <h3 className="text-lg sm:text-xl font-black text-rose-800 dark:text-rose-200 tracking-tight">
                                    Đáp án chính xác:
                                </h3>
                                <p className="text-sm sm:text-base font-black text-rose-700 dark:text-rose-300 mt-0.5 underline">
                                    {correctAnswerText || 'Đáp án mẫu'}
                                </p>
                                {explanation && (
                                    <p className="text-xs text-rose-600/90 dark:text-rose-400/90 font-medium mt-0.5 line-clamp-2">
                                        {explanation}
                                    </p>
                                )}
                            </div>
                        </div>
                    ) : !isMatching ? (
                        <button
                            type="button"
                            onClick={onSkip}
                            className="px-6 py-3 rounded-2xl font-black text-sm uppercase tracking-wider text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-900 border-2 border-transparent hover:border-slate-300 dark:hover:border-slate-700 transition-all cursor-pointer select-none active:translate-y-0.5"
                        >
                            BỎ QUA
                        </button>
                    ) : (
                        <div className="text-xs font-bold text-slate-400">
                            Ghép các cặp tương ứng để tiếp tục 🧩
                        </div>
                    )}
                </div>

                {/* 2. RIGHT SIDE: 3D Action Button (KIỂM TRA / TIẾP TỤC) */}
                <div className="w-full sm:w-auto shrink-0 flex items-center justify-end">
                    {answerStatus ? (
                        <button
                            type="button"
                            onClick={onNext}
                            className={`w-full sm:w-auto px-10 sm:px-14 py-3.5 sm:py-4 rounded-2xl font-black text-sm sm:text-base uppercase tracking-wider text-white transition-all cursor-pointer select-none active:translate-y-1 active:border-b-0 shadow-md flex items-center justify-center gap-2 ${
                                isCorrect
                                    ? 'bg-emerald-500 hover:bg-emerald-400 border-b-4 border-emerald-700 shadow-emerald-500/25'
                                    : 'bg-rose-500 hover:bg-rose-400 border-b-4 border-rose-700 shadow-rose-500/25'
                            }`}
                        >
                            <span>TIẾP TỤC</span>
                            <ArrowRight className="w-5 h-5 stroke-[3]" />
                        </button>
                    ) : !isMatching ? (
                        <button
                            type="button"
                            disabled={!canCheck}
                            onClick={onCheck}
                            className={`w-full sm:w-auto px-10 sm:px-14 py-3.5 sm:py-4 rounded-2xl font-black text-sm sm:text-base uppercase tracking-wider transition-all select-none flex items-center justify-center ${
                                canCheck
                                    ? 'text-white bg-emerald-500 hover:bg-emerald-400 border-b-4 border-emerald-700 active:translate-y-1 active:border-b-0 shadow-md cursor-pointer'
                                    : 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-600 border-b-4 border-slate-300 dark:border-slate-700 cursor-not-allowed'
                            }`}
                        >
                            KIỂM TRA
                        </button>
                    ) : null}
                </div>
            </div>
        </footer>
    );
};

export default RoadmapLessonFooter;

