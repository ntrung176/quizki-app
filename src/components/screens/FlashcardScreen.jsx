import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { RotateCcw, Check, X, Undo2, RefreshCw, Volume2, ArrowLeft, ChevronRight, Zap, Layers, Settings, Lightbulb, Maximize2, Minimize2 } from 'lucide-react'
import { speakJapanese, preloadAudio } from '../../utils/audio'
import { playCompletionFanfare, playFlipSound } from '../../utils/soundEffects';
import { getAuth } from 'firebase/auth';
import { saveStudyProgress, resetStudyProgress } from '../../utils/studyProgressService';
import FuriganaText from '../ui/FuriganaText';
import Flashcard from '../ui/Flashcard';
import { useTargetLanguage } from '../../context/TargetLanguageContext';
import { useLanguage } from '../../context/LanguageContext';
import VocabCardSettingsModal from '../srs/VocabCardSettingsModal';
import UnifiedStudyCompleteModal from '../review/UnifiedStudyCompleteModal';
const FlashcardScreen = ({ cards: initialCards, setId, isCustomSubset = false, onComplete, onUpdateCard, onSaveCardAudio, onBack }) => {
    const { isEnglishMode, isKoreanMode } = useTargetLanguage();
    const { t, language } = useLanguage();
    // Load saved progress from localStorage
    const getSavedProgress = () => {
        if (isCustomSubset) return null;
        try {
            const key = setId ? `study_progress_${setId}_flashcard` : 'flashcard_progress';
            const saved = localStorage.getItem(key);
            if (saved) {
                const data = JSON.parse(saved);
                if (data && (data.cardIds || data.currentDeckIds)) {
                    // Safety check: Does saved progress match initialCards?
                    const savedIds = data.cardIds || [];
                    if (initialCards && initialCards.length > 0 && savedIds.length > 0) {
                        if (savedIds.length !== initialCards.length) {
                            return null;
                        }
                    }
                    return data;
                }
            }
        } catch (e) { /* ignore */ }
        return null;
    };
    const savedProgress = getSavedProgress();
    const [allCards, setAllCards] = useState(initialCards);

    // Xác định các thẻ mới được thêm vào học phần (chưa có trong tiến độ cũ)
    const trackedCardIds = new Set([
        ...(savedProgress?.knownCardIds || []),
        ...(savedProgress?.unknownCardIds || []),
        ...(savedProgress?.currentDeckIds || [])
    ]);
    const newlyAddedCards = initialCards.filter(c => !trackedCardIds.has(c.id));

    const [currentDeck, setCurrentDeck] = useState(() => {
        if (savedProgress && savedProgress.currentDeckIds) {
            // Restore deck order
            const deckMap = new Map(initialCards.map(c => [c.id, c]));
            const restored = savedProgress.currentDeckIds.map(id => deckMap.get(id)).filter(Boolean);
            if (newlyAddedCards.length > 0) {
                return [...restored, ...newlyAddedCards];
            }
            if (restored.length > 0) {
                return restored;
            }
        }
        return initialCards;
    });
    const [currentIndex, setCurrentIndex] = useState(() => {
        const idx = savedProgress?.currentIndex || 0;
        return (idx >= 0 && idx < (initialCards?.length || 1)) ? idx : 0;
    });
    const [isFlipped, setIsFlipped] = useState(false);
    const [isAnimatingFlip, setIsAnimatingFlip] = useState(true);
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
    const [isComplete, setIsComplete] = useState(() => {
        if (isCustomSubset) return false;
        if (newlyAddedCards.length > 0) return false;
        return savedProgress?.isComplete || false;
    });
    const [round, setRound] = useState(savedProgress?.round || 1);

    const [isFullscreen, setIsFullscreen] = useState(false);

    const toggleFullscreen = useCallback(() => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(() => { });
            setIsFullscreen(true);
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen().catch(() => { });
            }
            setIsFullscreen(false);
        }
    }, []);

    useEffect(() => {
        const handleFSChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };
        document.addEventListener('fullscreenchange', handleFSChange);
        return () => document.removeEventListener('fullscreenchange', handleFSChange);
    }, []);
    // Card Settings State (stored in localStorage with v2 version to apply new defaults)
    const [cardSettings, setCardSettings] = useState(() => {
        const defaultSettings = {
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
                example: false,
                word: false,
                furigana: false,
                reading: false,
                exampleFurigana: true,
                exampleMeaning: true,
                synonymFurigana: true,
                image: true
            },
            swapSides: false,
            autoPlayAudio: true,
            audioEnabled: true
        };
        try {
            const saved = localStorage.getItem('quizki_flashcard_settings_v2');
            if (saved) {
                const parsed = JSON.parse(saved);
                return {
                    ...defaultSettings,
                    ...parsed,
                    front: { ...defaultSettings.front, ...parsed.front },
                    back: { ...defaultSettings.back, ...parsed.back },
                    autoPlayAudio: parsed.autoPlayAudio !== undefined ? parsed.autoPlayAudio : true,
                    audioEnabled: parsed.audioEnabled !== undefined ? parsed.audioEnabled : true
                };
            }
        } catch (e) { }
        return defaultSettings;
    });
    const [showSettingsMenu, setShowSettingsMenu] = useState(false);
    const [showNuancePopup, setShowNuancePopup] = useState(false);
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
        if (isCustomSubset || !setId || (isComplete && unknownCards.length === 0)) return;
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
        if (setId) {
            const userId = getAuth().currentUser?.uid;
            saveStudyProgress(userId, setId, 'flashcard', progressData);
        }
    }, [currentIndex, knownCards, unknownCards, isComplete, round, currentDeck, setId, isCustomSubset]);
    const currentCard = currentDeck[currentIndex];
    const progress = currentDeck.length > 0 ? Math.round(((currentIndex) / currentDeck.length) * 100) : 100;
    // Reset flip when changing card
    useEffect(() => {
        setIsFlipped(false);
        setSlideDirection('');
        setSwipeOffset(0);
        setButtonPressed(null);
        setShowNuancePopup(false);
        cardShownTimeRef.current = Date.now(); // Reset timer khi đổi card
    }, [currentIndex, round]);

    // Preload adjacent cards' base64 images and audio for seamless transitions and instant playback
    useEffect(() => {
        if (!currentDeck || currentDeck.length === 0) return;
        const indicesToPreload = [currentIndex, currentIndex + 1, currentIndex + 2];
        indicesToPreload.forEach(idx => {
            if (idx >= 0 && idx < currentDeck.length) {
                const card = currentDeck[idx];
                if (card) {
                    if (card.imageBase64) {
                        const img = new Image();
                        img.src = card.imageBase64;
                        if (typeof img.decode === 'function') {
                            img.decode().catch(() => { });
                        }
                    }
                    preloadAudio(card).catch(() => {});
                }
            }
        });
    }, [currentIndex, currentDeck]);
    // Auto-exit when all cards are completed in Flashcards
    useEffect(() => {
        if (isComplete && unknownCards.length === 0) {
            playCompletionFanfare();
            const timer = setTimeout(() => {
                if (onComplete) onComplete();
                else if (onBack) onBack();
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [isComplete, unknownCards.length, onComplete, onBack]);

    // Sync or recover deck when initialCards changes
    useEffect(() => {
        setAllCards(initialCards);
        if (isCustomSubset) {
            setCurrentDeck(initialCards);
            setCurrentIndex(0);
            setIsComplete(false);
            setKnownCards([]);
            setUnknownCards([]);
            setRound(1);
        } else if (initialCards && initialCards.length > 0 && currentDeck.length === 0) {
            setCurrentDeck(initialCards);
            setCurrentIndex(0);
        }
    }, [initialCards, isCustomSubset]);
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
        playFlipSound();
        if (currentCard && cardSettings.autoPlayAudio && cardSettings.audioEnabled !== false) {
            // Chỉ phát âm thanh khi lật từ mặt trước sang mặt sau (newFlippedState === true)
            if (newFlippedState) {
                speakJapanese(currentCard, null, onSaveCardAudio ? (b64, vid) => onSaveCardAudio(currentCard.id, b64, vid) : null);
            }
        }
    }, [isFlipped, currentCard, cardSettings.autoPlayAudio, cardSettings.audioEnabled, onSaveCardAudio]);
    // Mark card as known
    const handleKnown = useCallback(() => {
        if (!isFlipped || !currentCard || buttonPressed) return;
        setButtonPressed('known');
        // Save to history for undo (including previous masteryState)
        setHistory(prev => [...prev, {
            card: currentCard,
            action: 'known',
            index: currentIndex,
            round,
            previousMasteryState: currentCard.masteryState || 'not_learned',
        }]);
        setKnownCards(prev => [...prev, currentCard]);
        const currentMastery = currentCard.masteryState || 'not_learned';
        const nextMastery = currentMastery === 'not_learned' ? 'learning' : 'memorized';
        setCurrentDeck(prev => prev.map(c => c.id === currentCard.id ? { ...c, masteryState: nextMastery } : c));
        // Cập nhật SRS: flashcard_known (nhớ) - chỉ khi chưa từng trả lời sai trong phiên học này
        if (onUpdateCard && currentCard.id && !sessionWrongCardIdsRef.current.has(currentCard.id)) {
            onUpdateCard(currentCard.id, true, 'back', 'flashcard_known', Date.now() - cardShownTimeRef.current);
        }
        setTimeout(() => {
            setSlideDirection('left');
            setTimeout(() => {
                setIsFlipped(false);
                setIsAnimatingFlip(false);
                if (currentIndex < currentDeck.length - 1) {
                    setCurrentIndex(currentIndex + 1);
                } else {
                    // Deck finished
                    checkCompletion();
                }
                setSlideDirection('right');
                setTimeout(() => {
                    setSlideDirection('');
                    setTimeout(() => {
                        setIsAnimatingFlip(true);
                    }, 110);
                }, 20);
            }, 70);
        }, 300);
    }, [isFlipped, currentCard, currentIndex, currentDeck.length, buttonPressed, onUpdateCard]);
    // Mark card as unknown
    const handleUnknown = useCallback(() => {
        if (!isFlipped || !currentCard || buttonPressed) return;
        setButtonPressed('unknown');
        // Thêm vào danh sách sai trong phiên học
        sessionWrongCardIdsRef.current.add(currentCard.id);
        // Save to history for undo (including previous masteryState)
        setHistory(prev => [...prev, {
            card: currentCard,
            action: 'unknown',
            index: currentIndex,
            round,
            previousMasteryState: currentCard.masteryState || 'not_learned',
        }]);
        setUnknownCards(prev => [...prev, currentCard]);
        const currentMastery = currentCard.masteryState || 'not_learned';
        const nextMastery = currentMastery === 'memorized' ? 'learning' : 'not_learned';
        setCurrentDeck(prev => prev.map(c => c.id === currentCard.id ? { ...c, masteryState: nextMastery } : c));
        // Cập nhật SRS: flashcard_unknown (chưa nhớ)
        if (onUpdateCard && currentCard.id) {
            onUpdateCard(currentCard.id, false, 'back', 'flashcard_unknown', Date.now() - cardShownTimeRef.current);
        }
        setTimeout(() => {
            setSlideDirection('left');
            setTimeout(() => {
                setIsFlipped(false);
                setIsAnimatingFlip(false);
                if (currentIndex < currentDeck.length - 1) {
                    setCurrentIndex(currentIndex + 1);
                } else {
                    // Deck finished
                    checkCompletion();
                }
                setSlideDirection('right');
                setTimeout(() => {
                    setSlideDirection('');
                    setTimeout(() => {
                        setIsAnimatingFlip(true);
                    }, 110);
                }, 20);
            }, 70);
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
        if (setId && !isCustomSubset) {
            const userId = getAuth().currentUser?.uid;
            resetStudyProgress(userId, setId, 'flashcard');
        }
    }, [initialCards, setId, isCustomSubset]);
    // Undo last action and revert card's mastery state
    const handleUndo = useCallback(() => {
        if (history.length === 0) return;
        const lastAction = history[history.length - 1];
        setHistory(prev => prev.slice(0, -1));
        // Remove card from known/unknown list
        if (lastAction.action === 'known') {
            setKnownCards(prev => prev.filter(c => c.id !== lastAction.card.id));
        } else {
            setUnknownCards(prev => prev.filter(c => c.id !== lastAction.card.id));
            if (sessionWrongCardIdsRef.current) {
                sessionWrongCardIdsRef.current.delete(lastAction.card.id);
            }
        }

        // Revert card's mastery state back to original state
        if (onUpdateCard && lastAction.card?.id && lastAction.previousMasteryState !== undefined) {
            setCurrentDeck(prev => prev.map(c => c.id === lastAction.card.id ? { ...c, masteryState: lastAction.previousMasteryState } : c));
            onUpdateCard(lastAction.card.id, 'all', { masteryState: lastAction.previousMasteryState });
        }

        // If we were in completion screen, go back
        if (isComplete) {
            setIsComplete(false);
        }

        setIsAnimatingFlip(false);
        setSlideDirection('right');
        setTimeout(() => {
            setIsFlipped(false);
            setCurrentIndex(lastAction.index);
            setButtonPressed(null);
            setSlideDirection('left');
            setTimeout(() => {
                setSlideDirection('');
                setTimeout(() => {
                    setIsAnimatingFlip(true);
                }, 110);
            }, 20);
        }, 70);
    }, [history, isComplete, onUpdateCard]);
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
            } else if (e.key === 'Enter') {
                if (isComplete) {
                    e.preventDefault();
                    if (unknownCards.length === 0) {
                        if (onComplete) onComplete();
                        else if (onBack) onBack();
                    } else {
                        handleContinueUnknown();
                    }
                }
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleFlip, handleKnown, handleUnknown, handleUndo, handleContinueUnknown, isComplete, isFlipped, unknownCards, onComplete, onBack]);
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
        if (allDone) {
            return (
                <UnifiedStudyCompleteModal
                    totalCards={allCards.length}
                    title={t('studyModes.excellent')}
                    subtitle={<>{language === 'vi' ? <>Bạn đã thuộc hết tất cả <span className="font-bold text-emerald-600 dark:text-emerald-400">{allCards.length}</span> thẻ!</> : <>You have mastered all <span className="font-bold text-emerald-600 dark:text-emerald-400">{allCards.length}</span> cards!</>}</>}
                    onRestart={handleRestart}
                    onComplete={onComplete}
                    onBack={onBack}
                />
            );
        }

        return (
            <div className={isFullscreen
                ? "fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto w-screen h-screen"
                : "relative w-full flex-1 min-h-0 flex flex-col items-center justify-center px-3 sm:px-4 py-2 sm:py-3.5 overflow-y-auto"
            }>
                {/* Back Button */}
                {onBack && (
                    <button
                        onClick={onBack}
                        className="absolute top-2 left-2 z-50 p-2 rounded-xl bg-white/80 hover:bg-white dark:bg-slate-800/80 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-200 shadow-md backdrop-blur-sm transition-all border border-gray-200 dark:border-slate-700 hover:scale-105"
                        title={t('common.back')}
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                )}
                <div className="w-[600px] max-w-[95vw] mx-auto my-auto flex flex-col justify-center items-center space-y-6 p-6 sm:p-8 bg-white dark:bg-slate-900 border-2 border-blue-400/30 rounded-3xl shadow-xl animate-fade-in">
                    <div className="text-6xl mb-2">🎉</div>
                    <div>
                        <h2 className="text-3xl font-black text-gray-800 dark:text-white mb-2">{t('studyModes.roundCompleted', { round })}</h2>
                        <p className="text-gray-500 dark:text-gray-400 text-lg">
                            {t('studyModes.roundCompletedSub')}
                        </p>
                    </div>
                    <div className="w-full max-w-xs bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-2xl p-5 border border-blue-200/60 dark:border-blue-800/60 shadow-lg">
                        <div className="flex items-center justify-center gap-2 text-blue-700 dark:text-blue-300 font-bold text-lg">
                            <Layers className="w-5 h-5" />
                            <span>{t('studyModes.mastered')}: {totalKnown} / {allCards.length}</span>
                        </div>
                    </div>
                    <div className="flex flex-col gap-3 w-full max-w-xs pt-2">
                        {unknownCount > 0 && (
                            <button
                                onClick={handleContinueUnknown}
                                className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 active:translate-y-0.5 active:border-b-0 border-b-4 border-emerald-700 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
                            >
                                <RefreshCw className="w-4 h-4" /> {t('studyModes.continueCards', { count: unknownCount })}
                            </button>
                        )}
                        <button
                            onClick={onComplete}
                            className="w-full py-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 active:translate-y-0.5 active:border-b-2 border-b-4 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs uppercase tracking-wider rounded-2xl transition-all flex items-center justify-center gap-2 cursor-pointer"
                        >
                            {t('common.exit')} <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // ============ NO CARD ============
    if (!currentCard) {
        if (initialCards && initialCards.length > 0) {
            return (
                <div className="flex flex-col items-center justify-center h-full p-8 text-center space-y-4">
                    <p className="text-gray-500">{t('studyModes.preparingCards')}</p>
                    <button
                        onClick={() => {
                            setCurrentDeck(initialCards);
                            setCurrentIndex(0);
                            setIsComplete(false);
                        }}
                        className="px-4 py-2 bg-blue-500 text-white font-bold rounded-xl shadow cursor-pointer hover:bg-blue-600"
                    >
                        {t('studyModes.reloadCards')}
                    </button>
                </div>
            );
        }
        return (
            <div className="flex items-center justify-center h-full">
                <p className="text-gray-500">{t('studyModes.noCardsToShow')}</p>
            </div>
        );
    }
    return (
        <div className={isFullscreen
            ? "fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto w-screen h-screen"
            : "relative w-full flex-1 min-h-0 flex flex-col items-center justify-center px-3 sm:px-4 py-2 sm:py-3.5 overflow-y-auto"
        }>
            <div className="w-full max-w-3xl mx-auto my-auto flex flex-col justify-center items-center space-y-3 sm:space-y-4">
                {/* Back Button - outside frame */}
                {onBack && (
                    <div className="w-full flex justify-start mb-1">
                        <button
                            onClick={onBack}
                            className="px-3.5 py-2 flex items-center gap-1.5 justify-center rounded-2xl bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 shadow-xs border-2 border-b-4 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 active:translate-y-0.5 active:border-b-2 font-bold transition-all cursor-pointer select-none"
                            title={t('common.back')}
                        >
                            <ArrowLeft className="w-4 h-4" />
                            <span className="text-xs sm:text-sm font-bold">{t('common.back')}</span>
                        </button>
                    </div>
                )}
                <div className="w-full flex flex-col justify-center items-center space-y-4">
                    {/* Progress bar */}
                    <div className="w-full space-y-2 flex-shrink-0">
                        <div className="flex justify-between items-center text-xs font-bold text-slate-600 dark:text-slate-400">
                            <span className="bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 px-2.5 py-0.5 rounded-full font-mono font-black text-xs">{t('studyModes.round', { round })}</span>
                            <span className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 px-2.5 py-0.5 rounded-full font-mono font-black text-xs">{currentIndex + 1} / {currentDeck.length}</span>
                        </div>
                        <div className="h-3.5 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden p-0.5 border border-slate-300/40 dark:border-slate-700">
                            <div className="h-full bg-emerald-500 rounded-full transition-all duration-500 ease-out shadow-xs" style={{ width: `${progress}%` }}></div>
                        </div>
                        <div className="flex justify-between items-center text-[11px] font-bold mt-1">
                            <div className="flex gap-1.5">
                                <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 rounded-full">{knownCards.length} {t('studyModes.mastered')}</span>
                                <span className="px-2.5 py-0.5 bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-200 dark:border-rose-800 rounded-full">{unknownCards.length} {t('studyModes.stillLearning')}</span>
                            </div>

                            {/* Top Right Action Buttons Header OUTSIDE Flashcard (Nuance, Speaker, Settings, Fullscreen) */}
                            <div className="flex items-center gap-1.5 z-30">
                                <button
                                    type="button"
                                    onClick={toggleFullscreen}
                                    className="p-1.5 bg-white/90 dark:bg-slate-800/90 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-300 rounded-full transition-all hover:scale-105 active:scale-95 shadow-sm border border-slate-200 dark:border-slate-700 cursor-pointer"
                                    title={isFullscreen ? t('common.exitFullscreen') : t('common.fullscreen')}
                                >
                                    {isFullscreen ? <Minimize2 className="w-4 h-4 text-blue-400" /> : <Maximize2 className="w-4 h-4" />}
                                </button>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setShowNuancePopup(prev => !prev);
                                    }}
                                    className={`p-1.5 rounded-full transition-all hover:scale-105 active:scale-95 shadow-sm border ${currentCard.nuance
                                            ? 'bg-amber-100 dark:bg-amber-950/60 border-amber-300 dark:border-amber-800 text-amber-700 dark:text-amber-300'
                                            : 'bg-white/90 dark:bg-slate-800/90 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'
                                        }`}
                                    title={t('vocab.nuance')}
                                >
                                    <Lightbulb className="w-4 h-4" />
                                </button>
                                {cardSettings.audioEnabled !== false && (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            speakJapanese(currentCard, null, onSaveCardAudio ? (b64, vid) => onSaveCardAudio(currentCard.id, b64, vid) : null);
                                        }}
                                        className="p-1.5 bg-white/90 dark:bg-slate-800/90 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-300 rounded-full transition-all hover:scale-105 active:scale-95 shadow-sm border border-slate-200 dark:border-slate-700"
                                        title={t('common.pronounce')}
                                    >
                                        <Volume2 className="w-4 h-4" />
                                    </button>
                                )}
                                <button
                                    onClick={(e) => { e.stopPropagation(); setShowSettingsMenu(true); }}
                                    className="p-1.5 bg-white/90 dark:bg-slate-800/90 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-300 rounded-full transition-all hover:scale-105 active:scale-95 shadow-sm border border-slate-200 dark:border-slate-700"
                                    title={t('common.cardSettings')}
                                >
                                    <Settings className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </div>
                    {/* Flashcard Area */}
                    <div className="w-full relative group perspective flex-shrink-0">
                        <div className="perspective-1000 w-full mx-auto relative">
                            <div
                                className={`cursor-pointer relative card-slide ${slideDirection === 'left' ? 'slide-out-left' : slideDirection === 'right' ? 'slide-out-right' : ''}`}
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
                                    transform: swipeOffset ? `translateX(${swipeOffset}px)` : undefined,
                                    transition: swipeOffset ? 'none' : (slideDirection ? 'transform 0.12s cubic-bezier(0.4, 0.0, 0.2, 1), opacity 0.12s ease' : 'transform 0.4s cubic-bezier(0.4, 0.0, 0.2, 1)'),
                                    touchAction: 'pan-y',
                                }}
                            >
                                <Flashcard
                                    key={currentCard.id}
                                    card={currentCard}
                                    cardSettings={{ ...cardSettings, reviewType: 'flashcard' }}
                                    isFlipped={isFlipped}
                                    onFlip={handleFlip}
                                    onSaveCardAudio={onSaveCardAudio}
                                    onSaveMnemonic={async (c, newText) => {
                                        if (onUpdateCard && c) {
                                            await onUpdateCard(c.id, { userMnemonic: newText, mnemonic: newText, customMnemonic: newText });
                                        }
                                    }}
                                    transitionEnabled={isAnimatingFlip}
                                />
                            </div>

                            {/* Nuance Text Box */}
                            {showNuancePopup && (
                                <div
                                    onClick={(e) => e.stopPropagation()}
                                    className="absolute top-16 right-4 left-4 z-40 bg-amber-50/95 dark:bg-amber-950/95 border-2 border-amber-200 dark:border-amber-900/60 rounded-2xl p-4 shadow-xl animate-fade-in text-slate-850 dark:text-slate-200"
                                >
                                    <div className="flex items-center justify-between border-b border-amber-200/50 dark:border-amber-900/40 pb-2 mb-2">
                                        <div className="flex items-center gap-1.5 text-amber-700 dark:text-amber-400 font-extrabold text-sm">
                                            <Lightbulb className="w-4 h-4 fill-amber-300 animate-pulse" />
                                            <span>{t('vocab.nuance')}</span>
                                        </div>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); setShowNuancePopup(false); }}
                                            className="text-amber-600 hover:text-amber-800 dark:text-amber-400 dark:hover:text-amber-300 text-xs font-bold px-2 py-1 hover:bg-amber-100/50 dark:hover:bg-amber-900/30 rounded-lg transition-colors"
                                        >
                                            {t('common.close')}
                                        </button>
                                    </div>
                                    <p className="text-xs md:text-sm leading-relaxed whitespace-pre-wrap font-semibold">
                                        {currentCard.nuance || t('vocab.noNuanceInfo')}
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Action buttons - Know / Don't Know / Undo */}
                    <div className="flex items-center justify-center gap-2.5 sm:gap-3 w-full mt-2 sm:mt-3">
                        {/* Don't know button */}
                        <button
                            onClick={handleUnknown}
                            disabled={!isFlipped || !!buttonPressed}
                            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl font-bold text-sm sm:text-base transition-all ${!isFlipped || buttonPressed
                                ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed border-2 border-slate-200 dark:border-slate-800'
                                : buttonPressed === 'unknown'
                                    ? 'bg-rose-600 text-white translate-y-0.5 border-b-0'
                                    : 'bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-400 border-2 border-b-4 border-rose-200 dark:border-rose-800 active:translate-y-0.5 active:border-b-2 cursor-pointer select-none'
                                }`}
                        >
                            <X className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.5]" />
                            <span>{t('studyModes.stillLearning')}</span>
                        </button>
                        {/* Known button */}
                        <button
                            onClick={handleKnown}
                            disabled={!isFlipped || !!buttonPressed}
                            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl font-black text-sm sm:text-base uppercase tracking-wider transition-all ${!isFlipped || buttonPressed
                                ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed border-2 border-slate-200 dark:border-slate-800'
                                : buttonPressed === 'known'
                                    ? 'bg-emerald-600 text-white translate-y-0.5 border-b-0'
                                    : 'bg-emerald-500 hover:bg-emerald-400 text-white border-b-4 border-emerald-700 active:translate-y-0.5 active:border-b-0 shadow-xs cursor-pointer select-none'
                                }`}
                        >
                            <Check className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.5]" />
                            <span>{t('studyModes.mastered')}</span>
                        </button>
                        {/* Undo button */}
                        <button
                            onClick={handleUndo}
                            disabled={history.length === 0}
                            className={`p-2.5 sm:p-3 rounded-xl transition-all ${history.length === 0
                                ? 'bg-slate-100 dark:bg-slate-800 text-slate-300 dark:text-slate-600 cursor-not-allowed border border-slate-200/40 dark:border-slate-800'
                                : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:scale-105 active:scale-95 shadow-xs cursor-pointer'
                                }`}
                            title={t('common.undoShortcut')}
                        >
                            <Undo2 className="w-4 h-4 sm:w-5 sm:h-5" />
                        </button>
                    </div>
                    {/* Keyboard hint */}
                    <p className="text-center text-[10px] md:text-xs text-gray-500 mt-1 flex items-center justify-center gap-1">
                        {t('studyModes.shortcutsHelp')}
                    </p>
                </div>
            </div>
            {/* Flashcard Settings Modal */}
            <VocabCardSettingsModal
                isOpen={showSettingsMenu}
                onClose={() => setShowSettingsMenu(false)}
                cardSettings={cardSettings}
                setCardSettings={setCardSettings}
                isKoreanMode={isKoreanMode}
                isEnglishMode={isEnglishMode}
            />
        </div>
    );
};
export default FlashcardScreen;
