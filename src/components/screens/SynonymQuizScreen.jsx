import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { ArrowLeft, Users, CheckCircle, XCircle, RotateCcw, Trophy, ChevronRight, Zap } from 'lucide-react';
import FuriganaText from '../ui/FuriganaText';
import { playCorrectSound, playIncorrectSound, launchFireworks, playCompletionFanfare } from '../../utils/soundEffects';
import { speakJapanese } from '../../utils/audio';

const shuffleArr = (arr) => {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
};

const SynonymQuizScreen = ({ cards, setId, onUpdateCard, onBack, onComplete }) => {
    // Load saved progress from localStorage
    const getSavedProgress = () => {
        try {
            if (!setId) return null;
            const key = `study_progress_${setId}_synonym`;
            const saved = localStorage.getItem(key);
            if (saved) {
                const data = JSON.parse(saved);
                return data;
            }
        } catch (e) { /* ignore */ }
        return null;
    };

    const savedProgress = getSavedProgress();
    // Filter cards that have synonyms
    const quizCards = useMemo(() => shuffleArr(cards.filter(c => c.synonym && c.synonym.trim())), [cards]);
    const [currentIndex, setCurrentIndex] = useState(savedProgress?.currentIndex || 0);
    const [selectedAnswer, setSelectedAnswer] = useState(null);
    const [isRevealed, setIsRevealed] = useState(false);
    const [score, setScore] = useState(savedProgress?.score || { correct: 0, incorrect: 0 });
    const [isComplete, setIsComplete] = useState(savedProgress?.isComplete || false);

    const currentCard = quizCards[currentIndex];
    const sessionWrongCardIdsRef = useRef(new Set());

    // Save progress to localStorage whenever state changes
    useEffect(() => {
        if (!setId || isComplete) return;
        const progressData = {
            currentIndex,
            score,
            timestamp: Date.now(),
        };
        const key = `study_progress_${setId}_synonym`;
        localStorage.setItem(key, JSON.stringify(progressData));
    }, [currentIndex, score, isComplete, setId]);

    // Generate multiple choice options
    const options = useMemo(() => {
        if (!currentCard) return [];
        const correctAnswer = currentCard.synonym;
        
        // Get all unique synonyms from other cards
        let synonymPool = Array.from(new Set(
            cards
                .filter(c => c.synonym && c.synonym.trim() && c.synonym !== correctAnswer)
                .map(c => c.synonym)
        ));
        
        // If we don't have enough synonyms in the deck, we can pad with other cards' Japanese fronts
        let paddingPool = [];
        if (synonymPool.length < 3) {
            paddingPool = Array.from(new Set(
                cards
                    .filter(c => c.front && c.front.trim() && c.front !== currentCard.front && c.synonym !== c.front)
                    .map(c => c.front)
            ));
        }

        const wrongAnswers = shuffleArr(synonymPool).slice(0, 3);
        const allOptions = [correctAnswer, ...wrongAnswers];

        // Pad with padding pool if still less than 4 options
        if (allOptions.length < 4) {
            const extraWrong = shuffleArr(paddingPool);
            for (const item of extraWrong) {
                if (!allOptions.includes(item)) {
                    allOptions.push(item);
                }
                if (allOptions.length >= 4) break;
            }
        }

        // Just in case we still don't have 4 options, create dummy ones or duplicate
        while (allOptions.length < 4) {
            allOptions.push(`Lựa chọn ${allOptions.length + 1}`);
        }

        return shuffleArr(allOptions);
    }, [currentCard, cards, currentIndex]);

    const handleSelect = useCallback((option) => {
        if (isRevealed) return;
        setSelectedAnswer(option);
        setIsRevealed(true);
        const isCorrect = option === currentCard.synonym;
        if (isCorrect) { 
            playCorrectSound(); 
            setScore(s => ({ ...s, correct: s.correct + 1 })); 
            if (onUpdateCard && currentCard?.id && !sessionWrongCardIdsRef.current.has(currentCard.id)) {
                onUpdateCard(currentCard.id, true, 'synonym', 'synonym_quiz');
            }
        } else { 
            playIncorrectSound(); 
            setScore(s => ({ ...s, incorrect: s.incorrect + 1 })); 
            sessionWrongCardIdsRef.current.add(currentCard.id);
            if (onUpdateCard && currentCard?.id) {
                onUpdateCard(currentCard.id, false, 'synonym', 'synonym_quiz');
            }
        }

        setTimeout(() => {
            speakJapanese(currentCard.front, currentCard.audioBase64).catch(e => console.warn(e));
        }, 500);
    }, [isRevealed, currentCard, onUpdateCard]);

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
        if (setId) {
            localStorage.removeItem(`study_completed_${setId}_synonym`);
            localStorage.removeItem(`study_progress_${setId}_synonym`);
        }
        setCurrentIndex(0);
        setSelectedAnswer(null);
        setIsRevealed(false);
        setScore({ correct: 0, incorrect: 0 });
        setIsComplete(false);
    };

    // Auto-exit when completed
    useEffect(() => {
        if (isComplete) {
            const timer = setTimeout(() => {
                if (onComplete) onComplete();
                else if (onBack) onBack();
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [isComplete, onComplete, onBack]);

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
            <div className="relative w-full h-full flex flex-col justify-center py-6 animate-fade-in">
                <div className="w-[600px] max-w-[95vw] mx-auto my-auto flex flex-col items-center space-y-6 p-8 bg-white dark:bg-slate-900 border-2 border-indigo-400/30 rounded-3xl shadow-xl">
                    <div className="text-6xl mb-2">🎉</div>
                    <div>
                        <h2 className="text-3xl font-black text-gray-800 dark:text-white mb-2">Xuất sắc!</h2>
                        <p className="text-gray-500 dark:text-gray-400 text-lg">
                            Bạn đã hoàn thành trò chơi đồng nghĩa.
                        </p>
                    </div>
                    <div className="w-full max-w-xs bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-2xl p-5 border border-indigo-200/60 dark:border-indigo-800/60 shadow-lg">
                        <div className="flex flex-col items-center justify-center gap-1">
                            <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300 font-bold text-lg">
                                <Zap className="w-5 h-5" />
                                <span>Chính xác: {pct}%</span>
                            </div>
                            <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">Đúng {score.correct} / {quizCards.length} câu</span>
                        </div>
                    </div>
                    <div className="flex gap-3 w-full max-w-xs pt-2">
                        <button 
                            onClick={handleReset} 
                            className="flex-1 py-3 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 font-bold rounded-xl hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-all flex items-center justify-center gap-1 cursor-pointer"
                        >
                            <RotateCcw className="w-4 h-4" /> Làm lại
                        </button>
                        <button 
                            onClick={onComplete || onBack} 
                            className="flex-1 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold rounded-xl shadow-md transition-all hover:-translate-y-0.5 flex items-center justify-center gap-1 cursor-pointer"
                        >
                            Xong <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    const progress = (currentIndex / quizCards.length) * 100;

    return (
        <div className="relative w-full h-full flex flex-col justify-center py-6">
            <div className="w-[800px] max-w-[95vw] mx-auto my-auto flex flex-col items-center space-y-3">
                {onBack && (
                    <div className="w-full flex justify-start mb-1">
                        <button
                            onClick={onBack}
                            className="p-2.5 flex items-center justify-center rounded-xl bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-300 shadow-md border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700 transition-all hover:scale-105"
                            title="Trở lại"
                        >
                            <ArrowLeft className="w-5 h-5" />
                            <span className="text-sm font-medium ml-1">Trở lại</span>
                        </button>
                    </div>
                )}
                <div className="w-full flex flex-col space-y-4 p-5 md:p-8 bg-white dark:bg-slate-900 border-2 border-indigo-400/30 rounded-3xl shadow-xl">
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
