import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { ArrowLeft, Users, CheckCircle, XCircle, RotateCcw, Trophy, ChevronRight } from 'lucide-react';
import FuriganaText from '../ui/FuriganaText';
import { playCorrectSound, playIncorrectSound, launchFireworks, playCompletionFanfare } from '../../utils/soundEffects';

const shuffleArr = (arr) => {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
};

const SynonymQuizScreen = ({ cards, onBack, onComplete }) => {
    // Filter cards that have synonyms
    const quizCards = useMemo(() => shuffleArr(cards.filter(c => c.synonym && c.synonym.trim())), [cards]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [selectedAnswer, setSelectedAnswer] = useState(null);
    const [isRevealed, setIsRevealed] = useState(false);
    const [score, setScore] = useState({ correct: 0, incorrect: 0 });
    const [isComplete, setIsComplete] = useState(false);

    const currentCard = quizCards[currentIndex];

    // Generate multiple choice options
    const options = useMemo(() => {
        if (!currentCard) return [];
        const correctAnswer = currentCard.synonym;
        // Get wrong answers from other cards' synonyms or meanings
        const pool = cards
            .filter(c => c.id !== currentCard.id && (c.synonym || c.back))
            .map(c => c.synonym || c.back);
        const wrongAnswers = shuffleArr(pool).slice(0, 3);
        // Combine and shuffle
        const allOptions = shuffleArr([correctAnswer, ...wrongAnswers.slice(0, 3)]);
        // Ensure we have exactly 4 options, pad with meanings if needed
        while (allOptions.length < 4) {
            const extra = cards.find(c => c.id !== currentCard.id && !allOptions.includes(c.back));
            if (extra) allOptions.push(extra.back); else break;
        }
        return allOptions.slice(0, 4);
    }, [currentCard, cards, currentIndex]);

    const handleSelect = useCallback((option) => {
        if (isRevealed) return;
        setSelectedAnswer(option);
        setIsRevealed(true);
        const isCorrect = option === currentCard.synonym;
        if (isCorrect) { playCorrectSound(); setScore(s => ({ ...s, correct: s.correct + 1 })); }
        else { playIncorrectSound(); setScore(s => ({ ...s, incorrect: s.incorrect + 1 })); }
    }, [isRevealed, currentCard]);

    const handleNext = () => {
        if (currentIndex < quizCards.length - 1) {
            setCurrentIndex(i => i + 1);
            setSelectedAnswer(null);
            setIsRevealed(false);
        } else {
            setIsComplete(true);
            launchFireworks();
            playCompletionFanfare();
        }
    };

    const handleReset = () => {
        setCurrentIndex(0);
        setSelectedAnswer(null);
        setIsRevealed(false);
        setScore({ correct: 0, incorrect: 0 });
        setIsComplete(false);
    };

    // Keyboard
    useEffect(() => {
        const handler = (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
            if (!isRevealed && ['1','2','3','4'].includes(e.key)) {
                const idx = parseInt(e.key) - 1;
                if (options[idx]) handleSelect(options[idx]);
            }
            if (isRevealed && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); handleNext(); }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [isRevealed, options, handleSelect]);

    if (quizCards.length === 0) {
        return (
            <div className="relative w-full h-full flex flex-col items-center justify-center p-8">
                <Users className="w-16 h-16 text-gray-300 dark:text-gray-600 mb-4" />
                <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-2">Không đủ dữ liệu</h2>
                <p className="text-gray-500 dark:text-gray-400 text-center mb-6">Các từ vựng trong học phần này chưa có trường đồng nghĩa (synonym). Hãy thêm synonym cho từ vựng trước.</p>
                <button onClick={onBack} className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors">Trở lại</button>
            </div>
        );
    }

    if (isComplete) {
        const pct = Math.round((score.correct / quizCards.length) * 100);
        return (
            <div className="relative w-full h-full flex flex-col justify-center">
                <div className="w-[600px] max-w-[95vw] mx-auto my-auto flex flex-col items-center space-y-6 p-8 bg-white dark:bg-slate-900 border-2 border-purple-400/30 rounded-3xl shadow-xl">
                    <div className="w-20 h-20 bg-gradient-to-br from-purple-400 to-indigo-500 rounded-full flex items-center justify-center shadow-lg">
                        <Trophy className="w-10 h-10 text-white" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Hoàn thành!</h2>
                    <p className="text-gray-500 dark:text-gray-400">Bạn đã trả lời đúng {score.correct}/{quizCards.length} câu ({pct}%)</p>
                    <div className="w-full grid grid-cols-2 gap-3">
                        <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-200 dark:border-green-800">
                            <div className="text-2xl font-bold text-green-600">{score.correct}</div>
                            <div className="text-xs text-green-600/70 mt-1">Đúng</div>
                        </div>
                        <div className="text-center p-3 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800">
                            <div className="text-2xl font-bold text-red-500">{score.incorrect}</div>
                            <div className="text-xs text-red-500/70 mt-1">Sai</div>
                        </div>
                    </div>
                    <div className="w-full space-y-3 pt-2">
                        <button onClick={handleReset} className="w-full py-3.5 rounded-xl font-bold bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-white shadow-lg flex items-center justify-center gap-2">
                            <RotateCcw className="w-5 h-5" /> Làm lại
                        </button>
                        <button onClick={onBack} className="w-full py-3 rounded-xl font-bold bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700">
                            Thoát
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    const progress = (currentIndex / quizCards.length) * 100;

    return (
        <div className="relative w-full h-full flex flex-col justify-center">
            <div className="w-[700px] max-w-[95vw] mx-auto my-auto flex flex-col items-center space-y-3">
                {onBack && (
                    <div className="w-full flex justify-start mb-1">
                        <button onClick={onBack} className="p-2.5 flex items-center rounded-xl bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-300 shadow-md border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700 transition-all hover:scale-105">
                            <ArrowLeft className="w-5 h-5" /><span className="text-sm font-medium ml-1">Trở lại</span>
                        </button>
                    </div>
                )}
                <div className="w-full flex flex-col space-y-4 p-5 md:p-8 bg-white dark:bg-slate-900 border-2 border-purple-400/30 rounded-3xl shadow-xl">
                    {/* Progress */}
                    <div className="space-y-1">
                        <div className="flex justify-between text-sm font-bold text-purple-500 dark:text-purple-400">
                            <span className="flex items-center gap-2"><Users className="w-4 h-4" /> ĐỒNG NGHĨA</span>
                            <span className="text-gray-500">{currentIndex + 1} / {quizCards.length}</span>
                        </div>
                        <div className="h-2 bg-gray-100 dark:bg-slate-800 rounded-full overflow-hidden">
                            <div className="h-full bg-purple-500 rounded-full transition-all duration-300" style={{ width: `${progress}%` }}></div>
                        </div>
                    </div>

                    {/* Question */}
                    <div className="text-center py-6">
                        <p className="text-sm text-gray-400 mb-2">Từ đồng nghĩa của</p>
                        <h2 className="text-3xl md:text-4xl font-bold text-gray-800 dark:text-white font-japanese">
                            <FuriganaText text={currentCard.frontWithFurigana || currentCard.front} />
                        </h2>
                        <p className="text-gray-500 dark:text-gray-400 mt-2 text-base">{currentCard.back}</p>
                    </div>

                    {/* Options */}
                    <div className="grid grid-cols-1 gap-3">
                        {options.map((option, i) => {
                            const isCorrect = option === currentCard.synonym;
                            const isSelected = selectedAnswer === option;
                            let cls = 'w-full p-4 rounded-xl font-bold text-left border-2 transition-all text-base ';
                            if (!isRevealed) {
                                cls += 'bg-gray-50 dark:bg-slate-800 border-gray-200 dark:border-slate-700 hover:border-purple-400 dark:hover:border-purple-500 hover:bg-purple-50 dark:hover:bg-purple-900/20 text-gray-800 dark:text-gray-200 cursor-pointer';
                            } else if (isCorrect) {
                                cls += 'bg-green-50 dark:bg-green-900/20 border-green-400 dark:border-green-600 text-green-700 dark:text-green-400';
                            } else if (isSelected && !isCorrect) {
                                cls += 'bg-red-50 dark:bg-red-900/20 border-red-400 dark:border-red-600 text-red-700 dark:text-red-400';
                            } else {
                                cls += 'bg-gray-50 dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-gray-400 dark:text-gray-500 opacity-60';
                            }
                            return (
                                <button key={i} onClick={() => handleSelect(option)} className={cls} disabled={isRevealed}>
                                    <span className="flex items-center gap-3">
                                        <span className="w-7 h-7 rounded-full bg-gray-200 dark:bg-slate-700 flex items-center justify-center text-xs font-bold text-gray-500 dark:text-gray-400 flex-shrink-0">{i + 1}</span>
                                        <span className="font-japanese"><FuriganaText text={option} /></span>
                                        {isRevealed && isCorrect && <CheckCircle className="w-5 h-5 text-green-500 ml-auto flex-shrink-0" />}
                                        {isRevealed && isSelected && !isCorrect && <XCircle className="w-5 h-5 text-red-500 ml-auto flex-shrink-0" />}
                                    </span>
                                </button>
                            );
                        })}
                    </div>

                    {/* Next */}
                    {isRevealed && (
                        <button onClick={handleNext} className="w-full py-4 rounded-xl font-bold text-lg bg-purple-600 hover:bg-purple-700 text-white shadow-lg transition-all flex items-center justify-center gap-2 mt-2">
                            {currentIndex < quizCards.length - 1 ? <><span>Tiếp tục</span><ChevronRight className="w-5 h-5" /></> : <span>Hoàn thành 🎉</span>}
                        </button>
                    )}

                    <p className="text-center text-[10px] text-gray-400">1-4: Chọn | Enter: Tiếp tục</p>
                </div>
            </div>
        </div>
    );
};

export default SynonymQuizScreen;
