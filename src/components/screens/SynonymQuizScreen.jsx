import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeft, Users, CheckCircle, XCircle, RotateCcw, ChevronRight, Zap, Settings, X } from 'lucide-react'
import FuriganaText from '../ui/FuriganaText';
import { playCorrectSound, playIncorrectSound, playCompletionFanfare } from '../../utils/soundEffects';
import { speakJapanese } from '../../utils/audio';

const shuffleArr = (arr) => {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1));[a[i], a[j]] = [a[j], a[i]]; }
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
    const [quizQueue, setQuizQueue] = useState(() => savedProgress?.quizQueue || quizCards);
    const [currentIndex, setCurrentIndex] = useState(savedProgress?.currentIndex || 0);
    const [selectedAnswer, setSelectedAnswer] = useState(null);
    const [isRevealed, setIsRevealed] = useState(false);
    const [score, setScore] = useState(savedProgress?.score || { correct: 0, incorrect: 0 });
    const [isComplete, setIsComplete] = useState(savedProgress?.isComplete || false);
    const [isTransitioning, setIsTransitioning] = useState(false);

    const [showSettings, setShowSettings] = useState(false);
    const [synonymFuriganaEnabled, setSynonymFuriganaEnabled] = useState(() => {
        return localStorage.getItem('synonym_furigana_enabled') !== 'false';
    });
    const [synonymVietnameseEnabled, setSynonymVietnameseEnabled] = useState(() => {
        return localStorage.getItem('synonym_vietnamese_enabled') !== 'false';
    });

    const currentCard = quizQueue[currentIndex];
    const failedCardsRef = useRef(new Set(savedProgress?.failedCardIdsList || []));
    const sessionWrongCardIdsRef = useRef(new Set(savedProgress?.sessionWrongCardIdsList || []));
    const autoAdvanceTimerRef = useRef(null);

    // Clean up timer on unmount
    useEffect(() => {
        return () => {
            if (autoAdvanceTimerRef.current) {
                clearTimeout(autoAdvanceTimerRef.current);
            }
        };
    }, []);

    // Save progress to localStorage whenever state changes
    useEffect(() => {
        if (!setId || isComplete) return;
        const progressData = {
            currentIndex,
            score,
            timestamp: Date.now(),
            quizQueue,
            failedCardIdsList: Array.from(failedCardsRef.current),
            sessionWrongCardIdsList: Array.from(sessionWrongCardIdsRef.current)
        };
        const key = `study_progress_${setId}_synonym`;
        localStorage.setItem(key, JSON.stringify(progressData));
    }, [currentIndex, score, isComplete, quizQueue, setId]);

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

    const handleNext = useCallback((isAuto = false) => {
        if (autoAdvanceTimerRef.current) {
            clearTimeout(autoAdvanceTimerRef.current);
            autoAdvanceTimerRef.current = null;
        }

        if (currentIndex < quizQueue.length - 1) {
            setCurrentIndex(i => i + 1);
            setSelectedAnswer(null);
            setIsRevealed(false);
        } else {
            // Reached the end of the current queue
            const finalFailedIds = Array.from(failedCardsRef.current);
            const finalFailed = finalFailedIds
                .map(id => quizCards.find(c => c.id === id))
                .filter(Boolean);

            if (finalFailed.length > 0) {
                // There are failed cards, restart queue with them!
                setIsTransitioning(true);
                const delay = isAuto ? 100 : 500;
                setTimeout(() => {
                    setQuizQueue(shuffleArr(finalFailed));
                    setCurrentIndex(0);
                    setSelectedAnswer(null);
                    setIsRevealed(false);
                    setIsTransitioning(false);
                }, delay);
            } else {
                // No failed cards, complete the quiz!
                setIsTransitioning(true);
                const delay = isAuto ? 100 : 800;
                setTimeout(() => {
                    setIsComplete(true);
                    playCompletionFanfare();
                    setIsTransitioning(false);
                }, delay);
            }
        }
    }, [currentIndex, quizQueue, quizCards]);

    const handleSelect = useCallback((option) => {
        if (isRevealed || !currentCard) return;
        setSelectedAnswer(option);
        setIsRevealed(true);
        const isCorrect = option === currentCard.synonym;
        const isFirstTry = !sessionWrongCardIdsRef.current.has(currentCard.id);

        if (isCorrect) {
            playCorrectSound();
            
            // Remove from failed list if answered correctly
            failedCardsRef.current.delete(currentCard.id);

            if (isFirstTry) {
                setScore(s => ({ ...s, correct: s.correct + 1 }));
                if (onUpdateCard && currentCard?.id) {
                    onUpdateCard(currentCard.id, true, 'synonym', 'synonym_quiz');
                }
            }
            if (autoAdvanceTimerRef.current) {
                clearTimeout(autoAdvanceTimerRef.current);
            }
            autoAdvanceTimerRef.current = setTimeout(() => {
                handleNext(true);
            }, 1500);
        } else {
            playIncorrectSound();

            // Add to failed list
            failedCardsRef.current.add(currentCard.id);

            if (isFirstTry) {
                setScore(s => ({ ...s, incorrect: s.incorrect + 1 }));
                sessionWrongCardIdsRef.current.add(currentCard.id);
                if (onUpdateCard && currentCard?.id) {
                    onUpdateCard(currentCard.id, false, 'synonym', 'synonym_quiz');
                }
            }
        }

        setTimeout(() => {
            speakJapanese(currentCard.front, currentCard.audioBase64).catch(e => console.warn(e));
        }, 500);
    }, [isRevealed, currentCard, onUpdateCard, handleNext]);

    const handleReset = () => {
        if (setId) {
            localStorage.removeItem(`study_completed_${setId}_synonym`);
            localStorage.removeItem(`study_progress_${setId}_synonym`);
        }
        setQuizQueue(quizCards);
        failedCardsRef.current = new Set();
        sessionWrongCardIdsRef.current = new Set();
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
            if (!isRevealed && ['1', '2', '3', '4'].includes(e.key)) {
                const idx = parseInt(e.key) - 1;
                if (options[idx]) handleSelect(options[idx]);
            }
            if (isRevealed && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); handleNext(false); }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [isRevealed, options, handleSelect, handleNext]);

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
                        <div className="flex justify-between items-center text-sm font-bold text-purple-500 dark:text-purple-400">
                            <span className="flex items-center gap-2"><Users className="w-4 h-4" /> ĐỒNG NGHĨA</span>
                            <div className="flex items-center gap-2">
                                <span className="text-gray-500">{currentIndex + 1} / {quizQueue.length}</span>
                                <button onClick={() => setShowSettings(true)} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 transition-all text-gray-500 hover:text-purple-650" title="Cài đặt">
                                    <Settings className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                        <div className="h-2 bg-gray-100 dark:bg-slate-800 rounded-full overflow-hidden">
                            <div className="h-full bg-purple-500 rounded-full transition-all duration-300" style={{ width: `${progress}%` }}></div>
                        </div>
                    </div>

                    {/* Question */}
                    <div className="text-center py-6">
                        <p className="text-sm text-gray-400 mb-2">Từ đồng nghĩa của</p>
                        <h2 className="text-3xl md:text-4xl font-bold text-gray-800 dark:text-white font-japanese">
                            <FuriganaText text={currentCard.frontWithFurigana || currentCard.front} forceHide={!synonymFuriganaEnabled} />
                        </h2>
                        {synonymVietnameseEnabled && <p className="text-gray-500 dark:text-gray-400 mt-2 text-base">{currentCard.back}</p>}
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
                                cls += 'bg-green-50 dark:bg-green-900/20 border-green-400 dark:border-green-600 text-green-700 dark:text-green-400 cursor-default';
                            } else if (isSelected && !isCorrect) {
                                cls += 'bg-red-50 dark:bg-red-900/20 border-red-400 dark:border-red-600 text-red-700 dark:text-red-400 cursor-default';
                            } else {
                                cls += 'bg-gray-50 dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-gray-400 dark:text-gray-500 opacity-60 cursor-default';
                            }
                            return (
                                <div key={i} onClick={() => { if (!isRevealed) handleSelect(option); }} className={cls}>
                                    <span className="flex items-center gap-3">
                                        <span className="w-7 h-7 rounded-full bg-gray-200 dark:bg-slate-700 flex items-center justify-center text-xs font-bold text-gray-500 dark:text-gray-400 flex-shrink-0 select-none">{i + 1}</span>
                                        <span className="font-japanese"><FuriganaText text={option} forceHide={!synonymFuriganaEnabled} /></span>
                                        {isRevealed && isCorrect && <CheckCircle className="w-5 h-5 text-green-500 ml-auto flex-shrink-0" />}
                                        {isRevealed && isSelected && !isCorrect && <XCircle className="w-5 h-5 text-red-500 ml-auto flex-shrink-0" />}
                                    </span>
                                </div>
                            );
                        })}
                    </div>

                    {/* Next */}
                    {isRevealed && selectedAnswer !== currentCard?.synonym && (
                        <>
                            <div className="w-full p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-300 text-sm space-y-1.5 mt-2">
                                <p className="font-semibold text-red-650 dark:text-red-350">✗ Chưa đúng!</p>
                                <div className="space-y-1.5 text-sm border-t border-red-200 dark:border-red-800/40 pt-2 mt-1">
                                    <p className="text-red-800 dark:text-red-300">
                                        Từ vựng: <span className="font-japanese font-bold text-base"><FuriganaText text={currentCard.frontWithFurigana || currentCard.front} forceHide={!synonymFuriganaEnabled} /></span>
                                    </p>
                                    {synonymVietnameseEnabled && (
                                        <p className="text-red-800 dark:text-red-300">
                                            Ý nghĩa: <span className="font-semibold">{currentCard.back}</span>
                                        </p>
                                    )}
                                    <p className="text-red-800 dark:text-red-300">
                                        Từ đồng nghĩa đúng: <span className="font-japanese font-bold text-base"><FuriganaText text={currentCard.synonym} forceHide={!synonymFuriganaEnabled} /></span>
                                    </p>
                                </div>
                            </div>
                            <button 
                                onClick={() => handleNext(false)} 
                                disabled={isTransitioning}
                                className={`w-full py-4 rounded-xl font-bold text-lg bg-purple-600 hover:bg-purple-700 text-white shadow-lg transition-all flex items-center justify-center gap-2 mt-2 ${isTransitioning ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer'}`}
                            >
                                {isTransitioning ? 'Đang hoàn tất...' : (currentIndex < quizQueue.length - 1 ? <><span>Tiếp tục</span><ChevronRight className="w-5 h-5" /></> : <span>Hoàn thành 🎉</span>)}
                            </button>
                        </>
                    )}

                    <p className="text-center text-[10px] text-gray-400">1-4: Chọn | Enter: Tiếp tục</p>
                </div>
            </div>

            {/* Settings Modal Popup */}
            {showSettings && createPortal(
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setShowSettings(false)}>
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm"></div>
                    <div className="relative bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-5 border border-gray-200 dark:border-slate-700"
                        onClick={e => e.stopPropagation()}>
                        {/* Header */}
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Settings className="w-5 h-5 text-indigo-500" />
                                <h3 className="font-bold text-lg text-gray-800 dark:text-white">Cài đặt ôn tập</h3>
                            </div>
                            <button onClick={() => setShowSettings(false)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-all">
                                <X className="w-5 h-5 text-gray-400" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-bold text-gray-600 dark:text-gray-300">Bật Furigana</span>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={synonymFuriganaEnabled}
                                        onChange={(e) => {
                                            setSynonymFuriganaEnabled(e.target.checked);
                                            localStorage.setItem('synonym_furigana_enabled', e.target.checked);
                                        }}
                                        className="sr-only peer"
                                    />
                                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-650 peer-checked:bg-indigo-600"></div>
                                </label>
                            </div>

                            <div className="flex items-center justify-between border-t border-gray-100 dark:border-slate-700 pt-3">
                                <span className="text-sm font-bold text-gray-600 dark:text-gray-300">Hiện nghĩa tiếng Việt</span>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={synonymVietnameseEnabled}
                                        onChange={(e) => {
                                            setSynonymVietnameseEnabled(e.target.checked);
                                            localStorage.setItem('synonym_vietnamese_enabled', e.target.checked);
                                        }}
                                        className="sr-only peer"
                                    />
                                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-650 peer-checked:bg-indigo-600"></div>
                                </label>
                            </div>
                        </div>

                        {/* Close button */}
                        <button
                            onClick={() => setShowSettings(false)}
                            className="w-full py-2.5 bg-indigo-500 hover:bg-indigo-600 text-white font-bold rounded-xl transition-all text-sm"
                        >
                            Xong
                        </button>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};

export default SynonymQuizScreen;
