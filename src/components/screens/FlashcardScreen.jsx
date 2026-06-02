import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { RotateCcw, Check, X, Undo2, Trophy, RefreshCw, Volume2, ArrowLeft, ChevronRight, Zap, Layers, Settings } from 'lucide-react';
import { playAudio, speakJapanese } from '../../utils/audio';
import FuriganaText from '../ui/FuriganaText';
import { POS_TYPES } from '../../config/constants';
import { launchFireworks, playCompletionFanfare } from '../../utils/soundEffects';

const getCardScaleStyles = (card, cardSettings) => {
    if (!card) return {};
    
    // Check if example display setting is enabled
    const showFrontExamples = !!(cardSettings?.front?.example && card.example);
    const showBackExamples = !!(cardSettings?.back?.example && card.example);
    const showExamples = showFrontExamples || showBackExamples;
    
    let wordSize = "text-3xl md:text-4xl";
    let titleSize = "text-xl";
    let meaningSize = "text-2xl md:text-3xl font-bold";
    let exampleBoxPadding = "p-4";
    let exampleItemGap = "space-y-3";
    let exampleTitleSize = "text-xs";
    let exampleTextSize = "text-sm";
    let exampleMeaningSize = "text-xs font-sans mt-0.5";
    let cardPadding = "p-6";
    
    let textLength = card.example ? (card.example.length + (card.exampleMeaning?.length || 0)) : 0;
    const exampleLines = card.example ? card.example.split('\n').filter(e => e.trim()).length : 0;
    
    // Word size scales down ONLY if front examples are enabled
    if (showFrontExamples) {
        if (textLength + card.back.length > 240 || exampleLines >= 3) {
            wordSize = "text-[20px] md:text-[22px] leading-tight font-extrabold";
        } else if (textLength + card.back.length > 150 || exampleLines >= 2) {
            wordSize = "text-2xl leading-snug font-extrabold";
        } else {
            wordSize = "text-2xl md:text-3xl leading-normal font-extrabold";
        }
    }
    
    // Meaning size scales down ONLY if back examples are enabled
    if (showBackExamples) {
        if (textLength + card.back.length > 240 || exampleLines >= 3) {
            meaningSize = "text-lg md:text-xl font-bold mt-1.5";
        } else if (textLength + card.back.length > 150 || exampleLines >= 2) {
            meaningSize = "text-xl md:text-2xl font-bold mt-2";
        } else {
            meaningSize = "text-2xl md:text-3xl font-bold mt-2";
        }
    }
    
    // Other properties scale if either is enabled
    if (showExamples) {
        if (textLength + card.back.length > 240 || exampleLines >= 3) {
            titleSize = "text-sm font-extrabold";
            exampleBoxPadding = "p-2";
            exampleItemGap = "space-y-1";
            exampleTitleSize = "text-[9px]";
            exampleTextSize = "text-[10px] leading-tight";
            exampleMeaningSize = "text-[9px] font-sans mt-0 leading-tight";
            cardPadding = "p-4 pb-12";
        } else if (textLength + card.back.length > 150 || exampleLines >= 2) {
            titleSize = "text-base font-extrabold";
            exampleBoxPadding = "p-2.5";
            exampleItemGap = "space-y-1.5";
            exampleTitleSize = "text-[10px]";
            exampleTextSize = "text-[11.5px] leading-snug";
            exampleMeaningSize = "text-[10px] font-sans mt-0.5 leading-snug";
            cardPadding = "p-5 pb-12";
        } else {
            titleSize = "text-xl font-extrabold";
            exampleBoxPadding = "p-3";
            exampleItemGap = "space-y-2";
            exampleTitleSize = "text-[11px]";
            exampleTextSize = "text-[12.5px] leading-normal";
            exampleMeaningSize = "text-[11px] font-sans mt-0.5";
            cardPadding = "p-6 pb-12";
        }
    }
    
    return {
        wordSize,
        titleSize,
        meaningSize,
        exampleBoxPadding,
        exampleItemGap,
        exampleTitleSize,
        exampleTextSize,
        exampleMeaningSize,
        cardPadding
    };
};

const FlashcardScreen = ({ cards: initialCards, setId, onComplete, onUpdateCard, onSaveCardAudio, onBack }) => {
    // Load saved progress from localStorage
    const getSavedProgress = () => {
        try {
            const key = setId ? `study_progress_${setId}_flashcard` : 'flashcard_progress';
            const saved = localStorage.getItem(key);
            if (saved) {
                const data = JSON.parse(saved);
                // Verify saved cards match current cards (same IDs)
                const savedIds = new Set(data.cardIds || []);
                const currentIds = initialCards.map(c => c.id);
                if (currentIds.length === savedIds.size && currentIds.every(id => savedIds.has(id))) {
                    return data;
                }
            }
        } catch (e) { /* ignore */ }
        return null;
    };

    const savedProgress = getSavedProgress();
    const [allCards] = useState(initialCards);
    const [currentDeck, setCurrentDeck] = useState(() => {
        if (savedProgress && savedProgress.currentDeckIds) {
            // Restore deck order
            const deckMap = new Map(initialCards.map(c => [c.id, c]));
            return savedProgress.currentDeckIds.map(id => deckMap.get(id)).filter(Boolean);
        }
        return initialCards;
    });
    const [currentIndex, setCurrentIndex] = useState(savedProgress?.currentIndex || 0);
    const [isFlipped, setIsFlipped] = useState(false);
    const [slideDirection, setSlideDirection] = useState('');
    const [unknownCards, setUnknownCards] = useState(() => {
        if (savedProgress?.unknownCardIds) {
            return initialCards.filter(c => savedProgress.unknownCardIds.includes(c.id));
        }
        return [];
    });
    const [knownCards, setKnownCards] = useState(() => {
        if (savedProgress?.knownCardIds) {
            return initialCards.filter(c => savedProgress.knownCardIds.includes(c.id));
        }
        return [];
    });
    const [history, setHistory] = useState([]); // For undo: {card, action, index}
    const [isComplete, setIsComplete] = useState(savedProgress?.isComplete || false);
    const [round, setRound] = useState(savedProgress?.round || 1);

    // Card Settings State (stored in localStorage with v2 version to apply new defaults)
    const [cardSettings, setCardSettings] = useState(() => {
        try {
            const saved = localStorage.getItem('quizki_flashcard_settings_v2');
            if (saved) return JSON.parse(saved);
        } catch (e) {}
        return {
            front: {
                word: true,
                furigana: false,
                hanviet: false,
                example: false
            },
            back: {
                meaning: true,
                hanviet: true,
                synonym: false,
                example: false
            },
            swapSides: false
        };
    });

    const [showSettingsMenu, setShowSettingsMenu] = useState(false);

    useEffect(() => {
        localStorage.setItem('quizki_flashcard_settings_v2', JSON.stringify(cardSettings));
    }, [cardSettings]);
    const [touchStart, setTouchStart] = useState(null);
    const [touchEnd, setTouchEnd] = useState(null);
    const [swipeOffset, setSwipeOffset] = useState(0);
    const [buttonPressed, setButtonPressed] = useState(null); // 'known' | 'unknown' | null
    const cardShownTimeRef = useRef(Date.now()); // Track thời gian hiển thị card
    const sessionWrongCardIdsRef = useRef(new Set());

    // Save progress to localStorage whenever state changes
    useEffect(() => {
        if (!setId || (isComplete && unknownCards.length === 0)) return;
        const progressData = {
            cardIds: initialCards.map(c => c.id),
            currentDeckIds: currentDeck.map(c => c.id),
            currentIndex,
            knownCardIds: knownCards.map(c => c.id),
            unknownCardIds: unknownCards.map(c => c.id),
            isComplete,
            round,
            timestamp: Date.now(),
        };
        const key = setId ? `study_progress_${setId}_flashcard` : 'flashcard_progress';
        localStorage.setItem(key, JSON.stringify(progressData));
    }, [currentIndex, knownCards, unknownCards, isComplete, round, currentDeck, setId]);

    const currentCard = currentDeck[currentIndex];
    const progress = currentDeck.length > 0 ? Math.round(((currentIndex) / currentDeck.length) * 100) : 100;

    // Reset flip when changing card
    useEffect(() => {
        setIsFlipped(false);
        setSlideDirection('');
        setSwipeOffset(0);
        setButtonPressed(null);
        cardShownTimeRef.current = Date.now(); // Reset timer khi đổi card
    }, [currentIndex, round]);

    // Auto-exit when all cards are completed in Flashcards
    useEffect(() => {
        if (isComplete && unknownCards.length === 0) {
            launchFireworks();
            playCompletionFanfare();
            const timer = setTimeout(() => {
                if (onComplete) onComplete();
                else if (onBack) onBack();
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [isComplete, unknownCards.length, onComplete, onBack]);

    // Format multiple meanings
    const formatMultipleMeanings = (text) => {
        if (!text) return text;
        const numberSymbols = ['➀', '➁', '➂', '➃', '➄', '➅', '➆', '➇', '➈', '➉'];
        const meanings = text.split(/[;；\n]/).map(m => m.trim()).filter(m => m);
        if (meanings.length <= 1) return text;
        return meanings.map((m, i) => `${numberSymbols[i] || `${i + 1}.`} ${m}`).join('\n');
    };

    const handleFlip = useCallback(() => {
        const newFlippedState = !isFlipped;
        setIsFlipped(newFlippedState);
        if (currentCard) {
            // Play pronunciation when the Japanese side becomes visible.
            // If swapSides is false: Japanese is on Front side (visible when newFlippedState is false).
            // If swapSides is true: Japanese is on Back side (visible when newFlippedState is true).
            const isJapaneseSideVisible = !cardSettings.swapSides ? !newFlippedState : newFlippedState;
            if (isJapaneseSideVisible) {
                speakJapanese(currentCard.front, currentCard.audioBase64, onSaveCardAudio ? (b64, vid) => onSaveCardAudio(currentCard.id, b64, vid) : null);
            }
        }
    }, [isFlipped, currentCard, cardSettings.swapSides]);

    // Mark card as known
    const handleKnown = useCallback(() => {
        if (!isFlipped || !currentCard || buttonPressed) return;
        setButtonPressed('known');

        // Save to history for undo
        setHistory(prev => [...prev, {
            card: currentCard,
            action: 'known',
            index: currentIndex,
            round,
        }]);

        setKnownCards(prev => [...prev, currentCard]);

        // Cập nhật SRS: flashcard_known (nhớ) - chỉ khi chưa từng trả lời sai trong phiên học này
        if (onUpdateCard && currentCard.id && !sessionWrongCardIdsRef.current.has(currentCard.id)) {
            onUpdateCard(currentCard.id, true, 'back', 'flashcard_known', Date.now() - cardShownTimeRef.current);
        }

        setTimeout(() => {
            setSlideDirection('left');
            setTimeout(() => {
                if (currentIndex < currentDeck.length - 1) {
                    setCurrentIndex(currentIndex + 1);
                } else {
                    // Deck finished
                    checkCompletion();
                }
                setSlideDirection('');
            }, 200);
        }, 300);
    }, [isFlipped, currentCard, currentIndex, currentDeck.length, buttonPressed, onUpdateCard]);

    // Mark card as unknown
    const handleUnknown = useCallback(() => {
        if (!isFlipped || !currentCard || buttonPressed) return;
        setButtonPressed('unknown');

        // Thêm vào danh sách sai trong phiên học
        sessionWrongCardIdsRef.current.add(currentCard.id);

        // Save to history for undo
        setHistory(prev => [...prev, {
            card: currentCard,
            action: 'unknown',
            index: currentIndex,
            round,
        }]);

        setUnknownCards(prev => [...prev, currentCard]);

        // Cập nhật SRS: flashcard_unknown (chưa nhớ)
        if (onUpdateCard && currentCard.id) {
            onUpdateCard(currentCard.id, false, 'back', 'flashcard_unknown', Date.now() - cardShownTimeRef.current);
        }

        setTimeout(() => {
            setSlideDirection('left');
            setTimeout(() => {
                if (currentIndex < currentDeck.length - 1) {
                    setCurrentIndex(currentIndex + 1);
                } else {
                    // Deck finished
                    checkCompletion();
                }
                setSlideDirection('');
            }, 200);
        }, 300);
    }, [isFlipped, currentCard, currentIndex, currentDeck.length, buttonPressed, onUpdateCard]);

    // Check if round is complete
    const checkCompletion = useCallback(() => {
        // Count unknown cards from this round only
        const thisRoundUnknown = [];
        // We need to count from history + current action
        // Actually, we track via unknownCards state
        setIsComplete(true);
    }, []);

    // Continue with unknown cards
    const handleContinueUnknown = useCallback(() => {
        if (unknownCards.length === 0) return;
        setCurrentDeck([...unknownCards]);
        setCurrentIndex(0);
        setUnknownCards([]);
        setKnownCards([]);
        setHistory([]);
        setIsComplete(false);
        setRound(prev => prev + 1);
    }, [unknownCards]);

    const handleRestart = useCallback(() => {
        setCurrentDeck(initialCards);
        setCurrentIndex(0);
        setKnownCards([]);
        setUnknownCards([]);
        setHistory([]);
        setIsComplete(false);
        setRound(1);
        sessionWrongCardIdsRef.current = new Set();
        if (setId) {
            localStorage.removeItem(`study_progress_${setId}_flashcard`);
        }
    }, [initialCards, setId]);

    // Undo last action
    const handleUndo = useCallback(() => {
        if (history.length === 0) return;

        const lastAction = history[history.length - 1];
        setHistory(prev => prev.slice(0, -1));

        // Remove card from known/unknown list
        if (lastAction.action === 'known') {
            setKnownCards(prev => prev.filter(c => c.id !== lastAction.card.id));
        } else {
            setUnknownCards(prev => prev.filter(c => c.id !== lastAction.card.id));
        }

        // If we were in completion screen, go back
        if (isComplete) {
            setIsComplete(false);
        }

        // Go back to the previous card
        setCurrentIndex(lastAction.index);
        setButtonPressed(null);
    }, [history, isComplete]);

    // Keyboard controls
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

            if (e.key === ' ') {
                e.preventDefault();
                if (!isComplete) handleFlip();
            } else if (e.key === 'ArrowLeft' || e.key === '1') {
                e.preventDefault();
                if (!isComplete && isFlipped) handleUnknown();
            } else if (e.key === 'ArrowRight' || e.key === '2') {
                e.preventDefault();
                if (!isComplete && isFlipped) handleKnown();
            } else if (e.key === 'z' && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                handleUndo();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleFlip, handleKnown, handleUnknown, handleUndo, isComplete, isFlipped]);

    // Touch handlers
    const minSwipeDistance = 50;

    const onTouchStart = (e) => {
        setTouchEnd(null);
        setTouchStart(e.targetTouches[0].clientX);
    };

    const onTouchMove = (e) => {
        if (!touchStart) return;
        const currentTouch = e.targetTouches[0].clientX;
        setTouchEnd(currentTouch);
        const diff = currentTouch - touchStart;
        const maxOffset = 200;
        setSwipeOffset(Math.max(-maxOffset, Math.min(maxOffset, diff)));
    };

    const onTouchEnd = () => {
        if (!touchStart || !touchEnd) {
            setTouchStart(null);
            setTouchEnd(null);
            setSwipeOffset(0);
            return;
        }

        const distance = touchStart - touchEnd;
        const isLeftSwipe = distance > minSwipeDistance;
        const isRightSwipe = distance < -minSwipeDistance;

        if (isLeftSwipe && isFlipped) {
            // Swipe left = known
            handleKnown();
        } else if (isRightSwipe && isFlipped) {
            // Swipe right = unknown
            handleUnknown();
        }

        setTouchStart(null);
        setTouchEnd(null);
        setSwipeOffset(0);
    };

    // ============ COMPLETION SCREEN ============
    if (isComplete) {
        const totalInRound = currentDeck.length;
        const knownCount = knownCards.length;
        const unknownCount = unknownCards.length;
        const totalKnown = allCards.length - unknownCount;
        const allDone = unknownCount === 0;

        return (
            <div className="relative w-full h-full flex flex-col justify-center">
                {/* Back Button */}
                {onBack && (
                    <button
                        onClick={onBack}
                        className="absolute top-2 left-2 z-50 p-2 rounded-xl bg-white/80 hover:bg-white dark:bg-slate-800/80 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-200 shadow-md backdrop-blur-sm transition-all border border-gray-200 dark:border-slate-700 hover:scale-105"
                        title="Trở lại"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                )}
                {allDone ? (
                    <div className="w-[600px] max-w-[95vw] mx-auto my-auto flex flex-col justify-center items-center space-y-6 p-8 bg-white dark:bg-slate-900 border-2 border-indigo-400/30 rounded-3xl shadow-xl animate-fade-in">
                        <div className="text-6xl mb-2">🎉</div>
                        <div>
                            <h2 className="text-3xl font-black text-gray-800 dark:text-white mb-2">Xuất sắc!</h2>
                            <p className="text-gray-500 dark:text-gray-400 text-lg">
                                Bạn đã thuộc hết tất cả <span className="font-black text-emerald-600 dark:text-emerald-400">{allCards.length}</span> thẻ!
                            </p>
                        </div>
                        <div className="w-full max-w-xs bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-2xl p-5 border border-emerald-200/60 dark:border-emerald-800/60 shadow-lg">
                            <div className="flex items-center justify-center gap-2 text-emerald-700 dark:text-emerald-300 font-bold text-lg">
                                <Zap className="w-5 h-5" />
                                <span>100% Thuần thục</span>
                            </div>
                        </div>
                        <div className="flex gap-3 w-full max-w-xs pt-2">
                            <button 
                                onClick={handleRestart} 
                                className="flex-1 py-3 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 font-bold rounded-xl hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-all flex items-center justify-center gap-1 cursor-pointer"
                            >
                                <RotateCcw className="w-4 h-4" /> Học lại
                            </button>
                            <button 
                                onClick={onComplete} 
                                className="flex-1 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold rounded-xl shadow-md transition-all hover:-translate-y-0.5 flex items-center justify-center gap-1 cursor-pointer"
                            >
                                Xong <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="w-[600px] max-w-[95vw] mx-auto my-auto flex flex-col justify-center items-center space-y-6 p-8 bg-white dark:bg-slate-900 border-2 border-indigo-400/30 rounded-3xl shadow-xl animate-fade-in">
                        <div className="text-6xl mb-2">✨</div>
                        <div>
                            <h2 className="text-3xl font-black text-gray-800 dark:text-white mb-2">Hoàn thành vòng {round}!</h2>
                            <p className="text-gray-500 dark:text-gray-400 text-lg">
                                Hãy tiếp tục ôn luyện những thẻ chưa thuộc.
                            </p>
                        </div>
                        <div className="w-full max-w-xs bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-2xl p-5 border border-indigo-200/60 dark:border-indigo-800/60 shadow-lg">
                            <div className="flex items-center justify-center gap-2 text-indigo-700 dark:text-indigo-300 font-bold text-lg">
                                <Layers className="w-5 h-5" />
                                <span>Đã thuộc: {totalKnown} / {allCards.length}</span>
                            </div>
                        </div>
                        <div className="flex flex-col gap-3 w-full max-w-xs pt-2">
                            {unknownCount > 0 && (
                                <button
                                    onClick={handleContinueUnknown}
                                    className="w-full py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold rounded-xl shadow-md hover:-translate-y-0.5 transition-all flex items-center justify-center gap-1 cursor-pointer"
                                >
                                    <RefreshCw className="w-4 h-4" /> Tiếp tục ({unknownCount} thẻ)
                                </button>
                            )}
                            <button 
                                onClick={onComplete} 
                                className="w-full py-3 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 font-bold rounded-xl hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-all flex items-center justify-center gap-1 cursor-pointer"
                            >
                                Thoát <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    // ============ NO CARD ============
    if (!currentCard) {
        return (
            <div className="flex items-center justify-center h-full">
                <p className="text-gray-500">Không có thẻ nào để hiển thị.</p>
            </div>
        );
    }

    return (
        <div className="relative w-full h-full flex flex-col justify-center">
            <div className="w-[800px] max-w-[95vw] mx-auto my-auto flex flex-col justify-center items-center space-y-3">
                {/* Back Button - outside frame */}
                {onBack && (
                    <div className="w-full flex justify-start mb-1">
                        <button
                            onClick={onBack}
                            className="p-2.5 flex items-center justify-center rounded-xl bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-300 shadow-md border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700 transition-all hover:scale-105"
                            title="Trở lại"
                        >
                            <ArrowLeft className="w-5 h-5" />
                            <span className="text-sm font-medium">Trở lại</span>
                        </button>
                    </div>
                )}
                <div className="w-full flex flex-col justify-center items-center space-y-4">
                    {/* Progress bar */}
                    <div className="w-full space-y-1 flex-shrink-0">
                        <div className="flex justify-between items-center text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                            <span className="px-2.5 py-0.5 bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400 rounded-full text-xs font-semibold">Vòng {round}</span>
                            <span className="px-2.5 py-0.5 bg-slate-100 text-slate-650 dark:bg-slate-800/80 dark:text-slate-400 rounded-full text-xs font-bold">{currentIndex + 1} / {currentDeck.length}</span>
                        </div>
                        <div className="h-2 w-full bg-gray-200/60 dark:bg-gray-700/60 rounded-full overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-indigo-500 to-indigo-600 progress-bar rounded-full" style={{ width: `${progress}%` }}></div>
                        </div>
                        <div className="flex justify-between text-[11px] font-semibold mt-1">
                            <span className="px-2.5 py-0.5 bg-green-50 text-green-600 dark:bg-green-950/20 dark:text-green-400 rounded-full">{knownCards.length} đã thuộc</span>
                            <span className="px-2.5 py-0.5 bg-red-50 text-red-500 dark:bg-red-950/20 dark:text-red-400 rounded-full">{unknownCards.length} chưa thuộc</span>
                        </div>
                    </div>

                    {/* Flashcard Area */}
                    <div className="w-full relative group perspective flex-shrink-0">
                        <div className="perspective-1000 w-full mx-auto relative" style={{ height: '460px' }}>

                            <div
                                className={`flip-card-container transform-style-3d cursor-pointer relative card-slide ${isFlipped ? 'rotate-y-180' : ''} ${slideDirection === 'left' ? 'slide-out-left' : slideDirection === 'right' ? 'slide-out-right' : ''}`}
                                onClick={() => {
                                    if (Math.abs(swipeOffset) < 10) {
                                        handleFlip();
                                    }
                                }}
                                onTouchStart={onTouchStart}
                                onTouchMove={onTouchMove}
                                onTouchEnd={onTouchEnd}
                                style={{
                                    width: '100%',
                                    height: '460px',
                                    transform: swipeOffset ? `translateX(${swipeOffset}px)` : undefined,
                                    transition: swipeOffset ? 'none' : (slideDirection ? 'transform 0.3s cubic-bezier(0.4, 0.0, 0.2, 1), opacity 0.3s ease' : 'transform 0.4s cubic-bezier(0.4, 0.0, 0.2, 1)'),
                                    touchAction: 'pan-y',
                                }}
                            >
                                {(() => {
                                    const scale = getCardScaleStyles(currentCard, cardSettings);

                                    const renderFrontContent = () => {
                                        if (!currentCard) return null;
                                        return (
                                            <div className="flex-1 flex flex-col items-center justify-center text-center space-y-4 w-full">
                                                {cardSettings.front.word && (
                                                    <div className={`${scale.wordSize} font-bold text-slate-850 dark:text-white font-japanese select-none leading-relaxed`}>
                                                        <FuriganaText text={currentCard.frontWithFurigana || currentCard.front} forceHide={!cardSettings.front.furigana} />
                                                    </div>
                                                )}
                                                {cardSettings.front.hanviet && currentCard.sinoVietnamese && (
                                                    <p className="text-amber-600 dark:text-yellow-300 text-sm font-semibold">
                                                        <span className="text-slate-450 dark:text-slate-400 font-normal">Hán Việt: </span>{currentCard.sinoVietnamese}
                                                    </p>
                                                )}
                                                {cardSettings.front.example && currentCard.example && (
                                                    <div className={`mt-3 ${scale.exampleItemGap} text-left w-full max-w-md mx-auto ${scale.exampleBoxPadding} bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 rounded-2xl`}>
                                                        {currentCard.example.split('\n').map(e => e.trim()).filter(e => e).map((ex, idx) => {
                                                            const meaning = (currentCard.exampleMeaning || '').split('\n')[idx]?.trim();
                                                            return (
                                                                <div key={idx} className="border-l-2 border-indigo-500/30 pl-3">
                                                                    <div className={`${scale.exampleTextSize} text-slate-700 dark:text-slate-350 font-japanese leading-relaxed`}>
                                                                        <FuriganaText text={ex} />
                                                                    </div>
                                                                    {meaning && (
                                                                        <p className={scale.exampleMeaningSize}>{meaning}</p>
                                                                    )}
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    };

                                    const renderBackContent = () => {
                                        if (!currentCard) return null;
                                        return (
                                            <div className="flex-1 flex flex-row items-center justify-center gap-4 md:gap-8 px-2 w-full h-full min-h-0">
                                                {currentCard.imageBase64 && (
                                                    <div className="flex-shrink-0">
                                                        <img
                                                            src={currentCard.imageBase64}
                                                            alt={currentCard.front}
                                                            className="w-24 h-24 sm:w-32 sm:h-32 md:w-44 md:h-44 rounded-2xl object-cover border border-gray-200 dark:border-slate-600/50 shadow-sm"
                                                        />
                                                    </div>
                                                )}
                                                <div className="flex-1 flex flex-col items-center justify-center text-center min-w-0 space-y-1.5 h-full py-2">
                                                    {cardSettings.back.meaning && (
                                                        <div className={`${scale.meaningSize} flashcard-back-text font-bold text-slate-850 dark:text-white break-words whitespace-pre-line flashcard-text-autofit leading-relaxed`}>
                                                            {currentCard.back}
                                                        </div>
                                                    )}
                                                    {cardSettings.back.hanviet && currentCard.sinoVietnamese && (
                                                        <p className="text-base font-semibold text-amber-600 dark:text-yellow-300">
                                                            <span className="text-slate-450 dark:text-slate-400 font-normal">Hán Việt: </span>{currentCard.sinoVietnamese}
                                                        </p>
                                                    )}
                                                    {currentCard.pos && (
                                                        <p className="text-sm mt-1">
                                                            <span className="inline-block px-3 py-1 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100/50 dark:border-indigo-900/30 rounded-full text-xs font-semibold text-indigo-600 dark:text-indigo-300">{POS_TYPES[currentCard.pos]?.label || currentCard.pos}</span>
                                                        </p>
                                                    )}
                                                    {cardSettings.back.synonym && currentCard.synonym && (
                                                        <p className="text-sm text-slate-750 dark:text-slate-350 mt-1 font-bold">
                                                            <span className="font-semibold text-slate-450 dark:text-slate-400">Đồng nghĩa: </span>
                                                            <FuriganaText text={currentCard.synonym} className="font-japanese" />
                                                        </p>
                                                    )}
                                                    {cardSettings.back.example && currentCard.example && (
                                                        <div className={`mt-2 ${scale.exampleItemGap} text-left w-full max-w-md mx-auto ${scale.exampleBoxPadding} bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 rounded-2xl overflow-y-auto max-h-[160px] no-scrollbar`}>
                                                            {currentCard.example.split('\n').map(e => e.trim()).filter(e => e).map((ex, idx) => {
                                                                const meaning = (currentCard.exampleMeaning || '').split('\n')[idx]?.trim();
                                                                return (
                                                                    <div key={idx} className="border-l-2 border-indigo-500/30 pl-3">
                                                                        <div className={`${scale.exampleTextSize} text-slate-700 dark:text-slate-350 font-japanese leading-relaxed`}>
                                                                            <FuriganaText text={ex} />
                                                                        </div>
                                                                        {meaning && (
                                                                            <p className={scale.exampleMeaningSize}>{meaning}</p>
                                                                        )}
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    };

                                    return (
                                        <>
                                            {/* Front Side */}
                                            <div className="flip-card-front backface-hidden absolute inset-0 w-full h-full">
                                                <div className={`bg-white dark:bg-slate-800 rounded-[32px] border border-gray-200/80 dark:border-slate-700/80 shadow-lg shadow-gray-150/30 dark:shadow-none ${scale.cardPadding || 'p-6'} flex flex-col items-center w-full h-full hover:shadow-xl transition-shadow relative overflow-hidden`}>
                                                    <div className="flex flex-col items-center justify-center my-auto w-full py-4 pb-14 relative">
                                                        {!cardSettings.swapSides ? renderFrontContent() : renderBackContent()}
                                                    </div>

                                                    <div className="absolute bottom-4 left-0 right-0 text-center pointer-events-none">
                                                        <span className="px-3.5 py-1.5 bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400 rounded-full text-xs font-semibold shadow-sm tracking-wide">
                                                            Nhấn để lật thẻ
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Back Side */}
                                            <div className="flip-card-back backface-hidden absolute inset-0 w-full h-full rotate-y-180">
                                                <div className={`bg-white dark:bg-slate-800 rounded-[32px] border border-gray-200/80 dark:border-slate-700/80 shadow-lg shadow-gray-150/30 dark:shadow-none ${scale.cardPadding || 'p-6'} flex flex-col items-center w-full h-full hover:shadow-xl transition-shadow relative overflow-hidden`}>
                                                    <div className="flex flex-col items-center justify-center my-auto w-full py-4 pb-14 relative">
                                                        {!cardSettings.swapSides ? renderBackContent() : renderFrontContent()}
                                                    </div>

                                                    <div className="absolute bottom-4 left-0 right-0 text-center pointer-events-none">
                                                        <span className="px-3.5 py-1.5 bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400 rounded-full text-xs font-semibold shadow-sm tracking-wide">
                                                            Nhấn để lật thẻ
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </>
                                    );
                                })()}
                            </div>

                            {/* Settings Button - OUTSIDE the flipping container */}
                            <button
                                onClick={(e) => { e.stopPropagation(); setShowSettingsMenu(true); }}
                                className="absolute top-6 right-6 p-2.5 bg-slate-100/80 hover:bg-indigo-50 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-655 dark:text-slate-350 rounded-full transition-all hover:scale-110 z-30 shadow-md border border-gray-200 dark:border-slate-700"
                                title="Cấu hình hiển thị"
                            >
                                <Settings className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    {/* Action buttons - Know / Don't Know / Undo */}
                    <div className="flex items-center justify-center gap-3 w-full">
                        {/* Don't know button */}
                        <button
                            onClick={handleUnknown}
                            disabled={!isFlipped || !!buttonPressed}
                            className={`flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-base transition-all ${!isFlipped || buttonPressed
                                ? 'bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
                                : buttonPressed === 'unknown'
                                    ? 'bg-red-600 text-white scale-95'
                                    : 'bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-800/60 border-2 border-red-300 dark:border-red-700 hover:scale-[1.02] shadow-md'
                                }`}
                        >
                            <X className="w-5 h-5" />
                            Chưa thuộc
                        </button>

                        {/* Known button */}
                        <button
                            onClick={handleKnown}
                            disabled={!isFlipped || !!buttonPressed}
                            className={`flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-base transition-all ${!isFlipped || buttonPressed
                                ? 'bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
                                : buttonPressed === 'known'
                                    ? 'bg-green-600 text-white scale-95'
                                    : 'bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-800/60 border-2 border-green-300 dark:border-green-700 hover:scale-[1.02] shadow-md'
                                }`}
                        >
                            <Check className="w-5 h-5" />
                            Đã thuộc
                        </button>

                        {/* Undo button */}
                        <button
                            onClick={handleUndo}
                            disabled={history.length === 0}
                            className={`p-3.5 rounded-xl transition-all ${history.length === 0
                                ? 'bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
                                : 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-600 dark:text-yellow-400 hover:bg-yellow-200 dark:hover:bg-yellow-800/60 border-2 border-yellow-300 dark:border-yellow-700 hover:scale-[1.05] shadow-md'
                                }`}
                            title="Hoàn tác (Ctrl+Z)"
                        >
                            <Undo2 className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Keyboard hint */}
                    <p className="text-center text-[10px] md:text-xs text-gray-500 mt-1 flex items-center justify-center gap-1">
                        Space: Lật | ←/1: Chưa thuộc | →/2: Đã thuộc | Ctrl+Z: Hoàn tác
                    </p>
                </div>
            </div>

            {/* Flashcard Settings Modal */}
            {showSettingsMenu && createPortal(
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" onClick={() => setShowSettingsMenu(false)}>
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"></div>
                    <div className="relative bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-sm p-6 space-y-4 border border-gray-200 dark:border-slate-700/80 animate-fade-in text-slate-850 dark:text-slate-200" onClick={e => e.stopPropagation()}>
                        <h4 className="font-extrabold text-lg border-b border-gray-150 dark:border-slate-700 pb-2.5 mb-3">Cấu hình thẻ ghi nhớ</h4>
                        <div className="space-y-4 text-xs font-semibold text-slate-750 dark:text-slate-350">
                            <div className="flex items-center justify-between border-b border-gray-150/40 dark:border-slate-700 pb-3 mb-2">
                                <span className="text-indigo-650 dark:text-indigo-400 font-bold">Đổi mặt trước/mặt sau</span>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input type="checkbox" checked={cardSettings.swapSides} onChange={(e) => setCardSettings(prev => ({ ...prev, swapSides: e.target.checked }))} className="sr-only peer" />
                                    <div className="w-9 h-5 bg-gray-200 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                                </label>
                            </div>
                            <div>
                                <p className="text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2 text-[10px]">Mặt tiếng Nhật hiển thị:</p>
                                <div className="space-y-2.5 pl-1 text-[13px]">
                                    <label className="flex items-center gap-2.5 cursor-pointer"><input type="checkbox" checked={cardSettings.front.word} onChange={(e) => setCardSettings(prev => ({ ...prev, front: { ...prev.front, word: e.target.checked } }))} className="rounded border-gray-300 dark:border-slate-650 text-indigo-650 dark:text-indigo-400 focus:ring-indigo-550 w-4 h-4" /><span>Chữ Hán / Từ vựng</span></label>
                                    <label className="flex items-center gap-2.5 cursor-pointer"><input type="checkbox" checked={cardSettings.front.furigana} onChange={(e) => setCardSettings(prev => ({ ...prev, front: { ...prev.front, furigana: e.target.checked } }))} className="rounded border-gray-300 dark:border-slate-650 text-indigo-650 dark:text-indigo-400 focus:ring-indigo-550 w-4 h-4" /><span>Phiên âm Furigana</span></label>
                                    <label className="flex items-center gap-2.5 cursor-pointer"><input type="checkbox" checked={cardSettings.front.hanviet} onChange={(e) => setCardSettings(prev => ({ ...prev, front: { ...prev.front, hanviet: e.target.checked } }))} className="rounded border-gray-300 dark:border-slate-650 text-indigo-650 dark:text-indigo-400 focus:ring-indigo-550 w-4 h-4" /><span>Âm Hán Việt</span></label>
                                    <label className="flex items-center gap-2.5 cursor-pointer"><input type="checkbox" checked={cardSettings.front.example} onChange={(e) => setCardSettings(prev => ({ ...prev, front: { ...prev.front, example: e.target.checked } }))} className="rounded border-gray-300 dark:border-slate-650 text-indigo-650 dark:text-indigo-400 focus:ring-indigo-550 w-4 h-4" /><span>Ví dụ</span></label>
                                </div>
                            </div>
                            <div>
                                <p className="text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2 text-[10px]">Mặt nghĩa dịch hiển thị:</p>
                                <div className="space-y-2.5 pl-1 text-[13px]">
                                    <label className="flex items-center gap-2.5 cursor-pointer"><input type="checkbox" checked={cardSettings.back.meaning} onChange={(e) => setCardSettings(prev => ({ ...prev, back: { ...prev.back, meaning: e.target.checked } }))} className="rounded border-gray-300 dark:border-slate-650 text-indigo-650 dark:text-indigo-400 focus:ring-indigo-550 w-4 h-4" /><span>Nghĩa tiếng Việt</span></label>
                                    <label className="flex items-center gap-2.5 cursor-pointer"><input type="checkbox" checked={cardSettings.back.hanviet} onChange={(e) => setCardSettings(prev => ({ ...prev, back: { ...prev.back, hanviet: e.target.checked } }))} className="rounded border-gray-300 dark:border-slate-650 text-indigo-650 dark:text-indigo-400 focus:ring-indigo-550 w-4 h-4" /><span>Âm Hán Việt</span></label>
                                    <label className="flex items-center gap-2.5 cursor-pointer"><input type="checkbox" checked={cardSettings.back.synonym} onChange={(e) => setCardSettings(prev => ({ ...prev, back: { ...prev.back, synonym: e.target.checked } }))} className="rounded border-gray-300 dark:border-slate-650 text-indigo-650 dark:text-indigo-400 focus:ring-indigo-550 w-4 h-4" /><span>Đồng nghĩa</span></label>
                                    <label className="flex items-center gap-2.5 cursor-pointer"><input type="checkbox" checked={cardSettings.back.example} onChange={(e) => setCardSettings(prev => ({ ...prev, back: { ...prev.back, example: e.target.checked } }))} className="rounded border-gray-300 dark:border-slate-650 text-indigo-650 dark:text-indigo-400 focus:ring-indigo-550 w-4 h-4" /><span>Ví dụ</span></label>
                                </div>
                            </div>
                        </div>
                        <div className="pt-3">
                            <button onClick={() => setShowSettingsMenu(false)} className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-all shadow-md active:scale-95 text-sm">
                                Đóng
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};

export default FlashcardScreen;
