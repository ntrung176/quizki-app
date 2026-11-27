import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { Check, X, HelpCircle } from 'lucide-react';
import { playCorrectSound, playIncorrectSound } from '../../utils/soundEffects';
import { buildSrsQuizQuestion } from './srsQuizHelper';
import FuriganaText from '../ui/FuriganaText';

const SrsMultipleChoicePanel = ({
    type = 'vocab',
    card,
    pool = [],
    swapSides = false,
    grammarStudyMode = 'ja_to_vi',
    cardIndex = 0,
    undoNonce = 0,
    isFlipped = false,
    onCheck,
    onFlip,
    showFurigana = true
}) => {
    const poolRef = useRef(pool);
    poolRef.current = pool;

    const cardKey = card?.id || card?.character || card?.pattern || card?.front || '';

    // Keep options stable during 1s countdown ticks; regenerate only on card change, direction flip, or undo
    const quizData = useMemo(() => {
        return buildSrsQuizQuestion({
            type,
            card,
            pool: poolRef.current,
            swapSides,
            grammarStudyMode,
            seedKey: `${cardIndex}_${undoNonce}`
        });
    }, [type, cardKey, cardIndex, undoNonce, swapSides, grammarStudyMode]);

    const [selectedOption, setSelectedOption] = useState(null);
    const [hasChecked, setHasChecked] = useState(false);

    useEffect(() => {
        setSelectedOption(null);
        setHasChecked(false);
    }, [cardKey, cardIndex, undoNonce, swapSides, grammarStudyMode]);

    const handleSelect = useCallback((opt) => {
        if (hasChecked || !opt) return;
        const isCorrect = opt === quizData.correctAnswer;
        setSelectedOption(opt);
        setHasChecked(true);

        try {
            if (isCorrect) playCorrectSound();
            else playIncorrectSound();
        } catch (_) {}

        if (onCheck) {
            onCheck({ isMatch: isCorrect, selectedOption: opt, correctAnswer: quizData.correctAnswer });
        }
        if (onFlip) {
            onFlip();
        }
    }, [hasChecked, quizData.correctAnswer, onCheck, onFlip]);

    // Reveal answer if user flips externally while unlocked
    useEffect(() => {
        if (isFlipped && !hasChecked) {
            setHasChecked(true);
            if (onCheck) {
                onCheck({ isMatch: false, selectedOption: null, correctAnswer: quizData.correctAnswer });
            }
        }
    }, [isFlipped, hasChecked, onCheck, quizData.correctAnswer]);

    // Keys 1-4 select option A-D strictly BEFORE checking; parent screen handles 1-4 rating AFTER check
    useEffect(() => {
        if (hasChecked) return;
        const handleKey = (e) => {
            if (e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
            const activeTag = e.target ? e.target.tagName : '';
            if (activeTag === 'INPUT' || activeTag === 'TEXTAREA' || e.target?.isContentEditable) return;

            const idx = ['1', '2', '3', '4'].indexOf(e.key);
            if (idx !== -1 && quizData.options[idx]) {
                e.preventDefault();
                handleSelect(quizData.options[idx]);
            }
        };
        window.addEventListener('keydown', handleKey);
        return () => window.removeEventListener('keydown', handleKey);
    }, [hasChecked, quizData.options, handleSelect]);

    if (!card || quizData.options.length === 0) return null;

    const isSelectedCorrect = selectedOption === quizData.correctAnswer;
    const isKanjiTargetText = (type === 'kanji' && swapSides) || (type === 'vocab' && swapSides) || (type === 'grammar' && grammarStudyMode === 'vi_to_ja');

    return (
        <div className="w-full space-y-2.5 sm:space-y-3 animate-fade-in" data-tour-id="SRS_QUIZ_PANEL">
            {/* Prompt / Result Feedback Header */}
            {!hasChecked ? (
                <div className="flex items-center justify-between px-1">
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 dark:text-slate-400">
                        <HelpCircle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                        <span>{quizData.promptHint}</span>
                    </span>
                    <span className="text-[10px] font-mono font-bold text-slate-400 dark:text-slate-500 hidden sm:inline">
                        Phím 1–4 chọn đáp án
                    </span>
                </div>
            ) : (
                <div
                    className={`px-4 py-2.5 rounded-2xl border-2 flex items-center justify-between gap-2 text-xs sm:text-sm font-bold animate-fade-in ${
                        isSelectedCorrect
                            ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-400 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300'
                            : 'bg-rose-50 dark:bg-rose-950/50 border-rose-400 dark:border-rose-700 text-rose-700 dark:text-rose-300'
                    }`}
                >
                    <div className="flex items-center gap-2 min-w-0">
                        {isSelectedCorrect ? (
                            <Check className="w-4 h-4 shrink-0 stroke-[3]" />
                        ) : (
                            <X className="w-4 h-4 shrink-0 stroke-[3]" />
                        )}
                        <span className="truncate">
                            {isSelectedCorrect
                                ? 'Chính xác! Hãy chọn mức độ ghi nhớ bên dưới.'
                                : `Chưa đúng! Đáp án: ${quizData.correctAnswer}`}
                        </span>
                    </div>
                </div>
            )}

            {/* 4 Options Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full">
                {quizData.options.map((opt, idx) => {
                    const isCorrectOpt = opt === quizData.correctAnswer;
                    const isChosenOpt = opt === selectedOption;

                    let cardCls = 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 hover:border-amber-400 dark:hover:border-amber-500 hover:bg-amber-50/30 dark:hover:bg-amber-950/20 cursor-pointer';
                    let badgeCls = 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300';

                    if (hasChecked) {
                        if (isCorrectOpt) {
                            cardCls = 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-500 dark:border-emerald-500 text-emerald-800 dark:text-emerald-200 ring-2 ring-emerald-400/20 cursor-default';
                            badgeCls = 'bg-emerald-500 text-white';
                        } else if (isChosenOpt) {
                            cardCls = 'bg-rose-50 dark:bg-rose-950/60 border-rose-500 dark:border-rose-500 text-rose-800 dark:text-rose-200 cursor-default';
                            badgeCls = 'bg-rose-500 text-white';
                        } else {
                            cardCls = 'bg-slate-50/70 dark:bg-slate-900/50 border-slate-200/70 dark:border-slate-800 text-slate-400 dark:text-slate-500 opacity-50 cursor-default';
                            badgeCls = 'bg-slate-100 dark:bg-slate-800 text-slate-400';
                        }
                    }

                    return (
                        <button
                            key={`${idx}_${opt}`}
                            type="button"
                            disabled={hasChecked}
                            onClick={(e) => {
                                e.stopPropagation();
                                handleSelect(opt);
                            }}
                            className={`p-3 sm:p-3.5 rounded-2xl border-2 border-b-4 font-bold text-xs sm:text-sm text-left flex items-center justify-between gap-2.5 transition-all select-none ${
                                !hasChecked ? 'active:translate-y-0.5 active:border-b-2' : ''
                            } ${cardCls}`}
                        >
                            <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                <span className={`w-6 h-6 rounded-lg text-[11px] font-mono font-black flex items-center justify-center shrink-0 transition-colors ${badgeCls}`}>
                                    {hasChecked && isCorrectOpt ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : (hasChecked && isChosenOpt && !isCorrectOpt ? <X className="w-3.5 h-3.5 stroke-[3]" /> : idx + 1)}
                                </span>
                                <span className={`${isKanjiTargetText ? 'font-japanese text-sm sm:text-base' : ''} leading-snug break-words line-clamp-2`}>
                                    {isKanjiTargetText ? <FuriganaText text={opt} forceHide={!showFurigana} /> : opt}
                                </span>
                            </div>
                        </button>
                    );
                })}
            </div>
        </div>
    );
};

export default React.memo(SrsMultipleChoicePanel);
