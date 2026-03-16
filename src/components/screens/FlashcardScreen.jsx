import React, { useState, useEffect, useCallback, useRef } from 'react';
import { RotateCcw, Check, X, Undo2, Trophy, RefreshCw, Volume2, ArrowLeft } from 'lucide-react';
import { playAudio, speakJapanese } from '../../utils/audio';
import FuriganaText from '../ui/FuriganaText';
import { POS_TYPES } from '../../config/constants';

const FlashcardScreen = ({ cards: initialCards, onComplete, onUpdateCard, onSaveCardAudio, onBack }) => {
    // Load saved progress from localStorage
    const getSavedProgress = () => {
        try {
            const saved = localStorage.getItem('flashcard_progress');
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
    const [touchStart, setTouchStart] = useState(null);
    const [touchEnd, setTouchEnd] = useState(null);
    const [swipeOffset, setSwipeOffset] = useState(0);
    const [buttonPressed, setButtonPressed] = useState(null); // 'known' | 'unknown' | null
    const cardShownTimeRef = useRef(Date.now()); // Track thời gian hiển thị card

    // Save progress to localStorage whenever state changes
    useEffect(() => {
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
        localStorage.setItem('flashcard_progress', JSON.stringify(progressData));
    }, [currentIndex, knownCards, unknownCards, isComplete, round, currentDeck]);

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
        if (newFlippedState && currentCard) {
            // Phát âm khi lật: dùng audioBase64 nếu có, không thì fallback Web Speech API
            speakJapanese(currentCard.front, currentCard.audioBase64, onSaveCardAudio ? (b64, vid) => onSaveCardAudio(currentCard.id, b64, vid) : null);
        }
    }, [isFlipped, currentCard]);

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

        // Cập nhật SRS: flashcard_known (nhớ)
        if (onUpdateCard && currentCard.id) {
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
                <div className="w-[600px] max-w-[95vw] mx-auto my-auto flex flex-col justify-center items-center space-y-6 p-6 border-2 border-indigo-400/30 rounded-2xl">
                    {/* Header */}
                    <div className="text-center space-y-3">
                        {allDone ? (
                            <>
                                <div className="w-20 h-20 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center mx-auto shadow-lg animate-bounce">
                                    <Trophy className="w-10 h-10 text-white" />
                                </div>
                                <h2 className="text-2xl font-bold text-gray-800 dark:text-white">
                                    🎉 Xuất sắc!
                                </h2>
                                <p className="text-gray-500 dark:text-gray-400 text-sm">
                                    Bạn đã thuộc hết tất cả {allCards.length} thẻ!
                                </p>
                            </>
                        ) : (
                            <>
                                <div className="w-20 h-20 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-full flex items-center justify-center mx-auto shadow-lg">
                                    <RefreshCw className="w-10 h-10 text-white" />
                                </div>
                                <h2 className="text-2xl font-bold text-gray-800 dark:text-white">
                                    Hoàn thành vòng {round}!
                                </h2>
                                <p className="text-gray-500 dark:text-gray-400 text-sm">
                                    Hãy tiếp tục ôn luyện những thẻ chưa thuộc
                                </p>
                            </>
                        )}
                    </div>

                    {/* Stats */}
                    <div className="w-full grid grid-cols-3 gap-3">
                        <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-200 dark:border-green-800">
                            <div className="text-2xl font-bold text-green-600 dark:text-green-400">{knownCount}</div>
                            <div className="text-xs text-green-600/70 dark:text-green-400/70 mt-1">Đã thuộc</div>
                        </div>
                        <div className="text-center p-3 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800">
                            <div className="text-2xl font-bold text-red-500">{unknownCount}</div>
                            <div className="text-xs text-red-500/70 mt-1">Chưa thuộc</div>
                        </div>
                        <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
                            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{totalInRound}</div>
                            <div className="text-xs text-blue-600/70 dark:text-blue-400/70 mt-1">Tổng thẻ</div>
                        </div>
                    </div>

                    {/* Progress bar */}
                    <div className="w-full">
                        <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
                            <span>Tiến độ tổng</span>
                            <span>{totalKnown}/{allCards.length} thẻ đã thuộc</span>
                        </div>
                        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-green-400 to-emerald-500 rounded-full transition-all duration-500"
                                style={{ width: `${(totalKnown / allCards.length) * 100}%` }}
                            ></div>
                        </div>
                    </div>

                    {/* Action buttons */}
                    <div className="w-full space-y-3">
                        {unknownCount > 0 && (
                            <button
                                onClick={handleContinueUnknown}
                                className="w-full py-3.5 rounded-xl font-bold text-base bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2"
                            >
                                <RefreshCw className="w-5 h-5" />
                                Tiếp tục học {unknownCount} thẻ chưa thuộc
                            </button>
                        )}
                        <button
                            onClick={onComplete}
                            className={`w-full py-3 rounded-xl font-bold text-base transition-all flex items-center justify-center gap-2 ${allDone
                                ? 'bg-gradient-to-r from-yellow-400 to-orange-500 hover:from-yellow-500 hover:to-orange-600 text-white shadow-lg hover:shadow-xl'
                                : 'bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700'
                                }`}
                        >
                            {allDone ? (
                                <>
                                    <Trophy className="w-5 h-5" />
                                    Hoàn thành
                                </>
                            ) : 'Thoát'}
                        </button>
                    </div>

                    {/* Keyboard hint */}
                    <div className="text-center text-xs text-gray-400">
                        Vòng {round} | Tổng {allCards.length} thẻ
                    </div>
                </div>
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
                            className="p-2 rounded-xl bg-white/80 hover:bg-white dark:bg-slate-800/80 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-200 shadow-md backdrop-blur-sm transition-all border border-gray-200 dark:border-slate-700 hover:scale-105 flex items-center gap-1.5"
                            title="Trở lại"
                        >
                            <ArrowLeft className="w-5 h-5" />
                            <span className="text-sm font-medium">Trở lại</span>
                        </button>
                    </div>
                )}
                <div className="w-full flex flex-col justify-center items-center space-y-3 p-4 border-2 border-indigo-400/30 rounded-2xl">
                    {/* Progress bar */}
                    <div className="w-full space-y-1 flex-shrink-0">
                        <div className="flex justify-between items-center text-xs font-medium text-gray-500 dark:text-gray-400">
                            <span>Vòng {round}</span>
                            <span>{currentIndex + 1} / {currentDeck.length}</span>
                        </div>
                        <div className="h-1.5 w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                            <div className="h-full bg-indigo-500 progress-bar rounded-full" style={{ width: `${progress}%` }}></div>
                        </div>
                        <div className="flex justify-between text-[10px] text-gray-400">
                            <span className="text-green-500">{knownCards.length} thuộc</span>
                            <span className="text-red-400">{unknownCards.length} chưa thuộc</span>
                        </div>
                    </div>

                    {/* Flashcard Area */}
                    <div className="w-full relative group perspective flex-shrink-0 overflow-hidden">
                        <div className="perspective-1000 w-full mx-auto relative" style={{ minHeight: '360px' }}>
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
                                {/* Front side - Japanese with colored hiragana */}
                                <div className="flip-card-front backface-hidden absolute inset-0 w-full h-full">
                                    <div className="bg-slate-700 dark:bg-slate-800 rounded-2xl shadow-2xl p-6 flex flex-col items-center justify-center w-full h-full border-2 border-slate-600 dark:border-slate-700 hover:shadow-3xl transition-shadow overflow-hidden">
                                        <div className="text-center flex-1 flex flex-col justify-center w-full px-2">
                                            {/* We use FuriganaText to properly render both AI formats and new Auto-Furigana formats */}
                                            <div className="space-y-4">
                                                <h3 className="text-4xl md:text-5xl font-bold text-white leading-tight break-words font-japanese flex items-center justify-center">
                                                    <FuriganaText text={currentCard.frontWithFurigana || currentCard.front} forceHide={true} />
                                                </h3>
                                            </div>
                                        </div>
                                        <div className="absolute bottom-4 text-center text-xs text-gray-500">
                                            Nhấn để lật
                                        </div>
                                    </div>
                                </div>

                                {/* Back side - Vietnamese with Sino-Vietnamese */}
                                <div className="flip-card-back backface-hidden absolute inset-0 w-full h-full rotate-y-180">
                                    <div className="bg-slate-700 dark:bg-slate-800 rounded-2xl shadow-2xl p-5 w-full h-full border-2 border-slate-600 dark:border-slate-700 hover:shadow-3xl transition-shadow flex flex-col">
                                        {/* Speaker button */}
                                        <div className="flex justify-end mb-1 flex-shrink-0">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    speakJapanese(currentCard.front, currentCard.audioBase64, onSaveCardAudio ? (b64, vid) => onSaveCardAudio(currentCard.id, b64, vid) : null);
                                                }}
                                                className="p-2 rounded-full bg-slate-600 hover:bg-indigo-500 text-white transition-all hover:scale-110"
                                                title="Nghe phát âm"
                                            >
                                                <Volume2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                        {/* Layout: image left + text right */}
                                        <div className="flex-1 flex flex-row items-center justify-center gap-8 px-2 w-full">
                                            {currentCard.imageBase64 && (
                                                <div className="flex-shrink-0">
                                                    <img
                                                        src={currentCard.imageBase64}
                                                        alt={currentCard.front}
                                                        className="w-36 h-36 md:w-44 md:h-44 rounded-xl object-cover border-2 border-slate-500/40"
                                                    />
                                                </div>
                                            )}
                                            <div className={`flex flex-col gap-2 ${currentCard.imageBase64 ? 'text-center items-center flex-1 min-w-0' : 'text-center items-center w-full'}`}>
                                                {/* Vietnamese meaning */}
                                                <div className="text-3xl md:text-4xl font-bold text-white leading-snug break-words whitespace-pre-line">
                                                    {formatMultipleMeanings(currentCard.back)}
                                                </div>

                                                {/* Sino-Vietnamese */}
                                                {currentCard.sinoVietnamese && (
                                                    <p className="text-base font-medium text-yellow-300">
                                                        <span className="text-slate-400 font-normal">Hán Việt: </span>{currentCard.sinoVietnamese}
                                                    </p>
                                                )}
                                                {currentCard.pos && (
                                                    <p className="text-sm text-slate-400 mt-1">
                                                        <span className="inline-block px-2 py-0.5 bg-slate-600/60 rounded-md text-xs font-medium text-indigo-300">{POS_TYPES[currentCard.pos]?.label || currentCard.pos}</span>
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
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
        </div>
    );
};

export default FlashcardScreen;
