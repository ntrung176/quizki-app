import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Zap, RotateCcw, MessageSquare, FileText, Repeat2, ChevronRight, Check, X, Lightbulb, ArrowLeft, Eye, EyeOff, Settings, Volume2, Headphones } from 'lucide-react'
import { POS_TYPES, getPosLabel } from '../../config/constants'
import { speakJapanese } from '../../utils/audio'
import {
    shuffleArray,
    getWordForMasking,
    getReadingForMasking,
    maskWordInExample,
    buildAdjNaAcceptedAnswers,
    isMobileDevice
} from '../../utils/textProcessing';
import { flashCorrect, launchFanfare, celebrateCorrectAnswer } from '../../utils/celebrations'
import { playCorrectSound, playIncorrectSound } from '../../utils/soundEffects';
import { getAuth } from 'firebase/auth';
import { saveStudyProgress, resetStudyProgress } from '../../utils/studyProgressService';
import FuriganaText from '../ui/FuriganaText';
import Flashcard from '../ui/Flashcard';

const ReviewScreen = ({
    cards: initialCards,
    reviewMode,
    allCards,
    setId,
    onUpdateCard,
    onCompleteReview,
    vocabCollectionPath,
    onSaveCardAudio,
    onBack
}) => {
    // Load saved progress from localStorage
    const getSavedProgress = () => {
        if (!setId || !reviewMode) return null;
        try {
            const key = `study_progress_${setId}_${reviewMode}`;
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

    const [cards, setCards] = useState(() => {
        if (savedProgress) {
            if (savedProgress.cardIdsList) {
                const pool = allCards || initialCards;
                const cardMap = new Map(pool.map(c => [c.id, c]));
                return savedProgress.cardIdsList.map(item => {
                    const id = typeof item === 'string' ? item : (item && item.id ? item.id : null);
                    const card = cardMap.get(id);
                    if (card) {
                        return typeof item === 'string' ? card : { ...card, ...item };
                    }
                    return null;
                }).filter(Boolean);
            }
            if (savedProgress.cards) {
                return savedProgress.cards;
            }
        }
        return initialCards;
    });
    const [currentIndex, setCurrentIndex] = useState(savedProgress?.currentIndex || 0);
    const [inputValue, setInputValue] = useState('');
    const [isRevealed, setIsRevealed] = useState(false);
    const [isLocked, setIsLocked] = useState(false);
    const [message, setMessage] = useState('');
    const [feedback, setFeedback] = useState(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isFlipped, setIsFlipped] = useState(false);
    const [isAnimatingFlip, setIsAnimatingFlip] = useState(true);
    const [slideDirection, setSlideDirection] = useState('');

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
                synonymFurigana: true
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

    useEffect(() => {
        setShowNuancePopup(false);
    }, [currentIndex, reviewMode]);

    // Preload adjacent cards' base64 images for seamless transitions
    useEffect(() => {
        if (!cards || cards.length === 0) return;
        const indicesToPreload = [currentIndex - 1, currentIndex + 1, currentIndex + 2];
        indicesToPreload.forEach(idx => {
            if (idx >= 0 && idx < cards.length) {
                const card = cards[idx];
                if (card && card.imageBase64) {
                    const img = new Image();
                    img.src = card.imageBase64;
                    if (typeof img.decode === 'function') {
                        img.decode().catch(() => {});
                    }
                }
            }
        });
    }, [currentIndex, cards]);
    const [touchStart, setTouchStart] = useState(null);
    const [touchEnd, setTouchEnd] = useState(null);
    const [swipeOffset, setSwipeOffset] = useState(0);
    const [selectedAnswer, setSelectedAnswer] = useState(null);
    const [multipleChoiceOptions, setMultipleChoiceOptions] = useState([]);
    const [failedCards, setFailedCards] = useState(() => {
        if (savedProgress?.failedCardsList) {
            return new Set(savedProgress.failedCardsList);
        }
        return new Set();
    });
    const [showComplete, setShowComplete] = useState(false);
    const [needsRetype, setNeedsRetype] = useState(false); // After wrong: must retype correct answer
    const [hintCount, setHintCount] = useState(0); // Number of characters revealed as hint
    const [blurVietnamese, setBlurVietnamese] = useState(false); // Blur Vietnamese text in example mode
    const [revealedMeanings, setRevealedMeanings] = useState(new Set()); // Track which meanings are revealed
    const [inputMode, setInputMode] = useState(() => {
        if (reviewMode === 'meaning_input') {
            const savedLang = localStorage.getItem('meaning_input_lang') || 'vi';
            return savedLang === 'vi' ? 'meaning' : 'reading';
        }
        return 'reading';
    });
    const inputRef = useRef(null);
    const isCompletingRef = useRef(false);
    const isProcessingRef = useRef(false); // Sync guard to prevent double-submit
    const handleNextRef = useRef(null); // Ref to handleNext, allows useEffect before early-return
    const failedCardsRef = useRef(failedCards);
    const sessionWrongCardIdsRef = useRef(new Set());
    const optionsRef = useRef({});
    const cardShownTimeRef = useRef(Date.now()); // Track thời gian hiển thị card
    const isMountedRef = useRef(true); // Track if component is still mounted
    const audioAbortRef = useRef(false); // Abort in-flight TTS requests

    const [showSettings, setShowSettings] = useState(false);
    const [reviewAudioEnabled, setReviewAudioEnabled] = useState(() => {
        return localStorage.getItem('review_audio_enabled') !== 'false';
    });
    const [exampleTestFormat, setExampleTestFormat] = useState(() => {
        return localStorage.getItem('example_test_format') || 'multipleChoice';
    });
    const [exampleFuriganaEnabled, setExampleFuriganaEnabled] = useState(() => {
        return localStorage.getItem('example_furigana_enabled') !== 'false';
    });
    const [exampleVietnameseEnabled, setExampleVietnameseEnabled] = useState(() => {
        return localStorage.getItem('example_vietnamese_enabled') !== 'false';
    });
    const [meaningFuriganaEnabled, setMeaningFuriganaEnabled] = useState(() => {
        return localStorage.getItem('meaning_furigana_enabled') !== 'false';
    });
    const [meaningHanvietEnabled, setMeaningHanvietEnabled] = useState(() => {
        return localStorage.getItem('meaning_hanviet_enabled') !== 'false';
    });
    const [synonymFuriganaEnabled, setSynonymFuriganaEnabled] = useState(() => {
        return localStorage.getItem('synonym_furigana_enabled') !== 'false';
    });
    const [synonymVietnameseEnabled, setSynonymVietnameseEnabled] = useState(() => {
        return localStorage.getItem('synonym_vietnamese_enabled') !== 'false';
    });
    const [reviewTestFormat, setReviewTestFormat] = useState(() => {
        if (reviewMode === 'meaning_input' || reviewMode === 'dictation') {
            return 'written';
        }
        return localStorage.getItem('review_test_format') || 'multipleChoice';
    });

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            isMountedRef.current = false;
            audioAbortRef.current = true;
        };
    }, []);

    useEffect(() => {
        if (reviewMode === 'meaning_input') {
            const savedLang = localStorage.getItem('meaning_input_lang') || 'vi';
            setInputMode(savedLang === 'vi' ? 'meaning' : 'reading');
            setReviewTestFormat('written');
        } else if (reviewMode === 'dictation') {
            setReviewTestFormat('written');
        }
    }, [reviewMode]);

    // Update cards when initialCards change
    useEffect(() => {
        const saved = getSavedProgress();
        if (saved) return; // Do not overwrite if we restored saved progress
        setCards(initialCards);
        setCurrentIndex(0);
        setFailedCards(new Set());
        failedCardsRef.current = new Set();
        isCompletingRef.current = false;
    }, [initialCards]);

    // Save progress to localStorage whenever state changes
    useEffect(() => {
        if (!setId || !reviewMode || showComplete) return;
        const progressData = {
            cardIds: initialCards.map(c => c.id),
            cardIdsList: (cards || []).map(c => ({ id: c.id, reviewType: c.reviewType })),
            currentIndex,
            failedCardsList: Array.from(failedCards),
            timestamp: Date.now(),
        };
        const key = `study_progress_${setId}_${reviewMode}`;
        localStorage.setItem(key, JSON.stringify(progressData));
        if (setId && reviewMode) {
            const userId = getAuth().currentUser?.uid;
            saveStudyProgress(userId, setId, reviewMode, progressData);
        }
    }, [currentIndex, cards, failedCards, setId, reviewMode, initialCards, showComplete]);

    // Update ref when failedCards change
    useEffect(() => {
        failedCardsRef.current = failedCards;
    }, [failedCards]);

    // Get current card safely
    const currentCard = cards.length > 0 && currentIndex < cards.length ? cards[currentIndex] : null;
    // Normalize cardReviewType: fall back to reviewMode, then to 'back' for any unrecognized type
    const _rawReviewType = currentCard ? (currentCard.reviewType || reviewMode) : null;
    const KNOWN_REVIEW_TYPES = ['back', 'synonym', 'example', 'dictation', 'flashcard'];
    const cardReviewType = _rawReviewType && KNOWN_REVIEW_TYPES.includes(_rawReviewType) ? _rawReviewType : (_rawReviewType ? 'back' : null);
    const isMultipleChoice = (cardReviewType === 'synonym' || (cardReviewType === 'example' && exampleTestFormat === 'multipleChoice') || (cardReviewType === 'back' && reviewTestFormat === 'multipleChoice')) && cardReviewType !== 'dictation';
    const currentCardId = currentCard?.id;

    // Auto focus logic
    useEffect(() => {
        if ((cardReviewType === 'back' || cardReviewType === 'dictation' || cardReviewType === 'example') && reviewMode !== 'flashcard' && !isMultipleChoice && inputRef.current && !isRevealed && !isMobileDevice()) {
            const timer = setTimeout(() => {
                inputRef.current?.focus();
            }, reviewMode === 'flashcard' ? 450 : 100);
            return () => clearTimeout(timer);
        }
    }, [currentIndex, isRevealed, cardReviewType, reviewMode, isMultipleChoice]);

    // Prevent out of bounds index
    useEffect(() => {
        if (cards.length > 0 && currentIndex >= cards.length) {
            setCurrentIndex(cards.length - 1);
        }
    }, [cards.length]);

    // Reset flip state when changing card
    useEffect(() => {
        setIsFlipped(false);
        setSlideDirection('');
        setSelectedAnswer(null);
        setMultipleChoiceOptions([]);
        setSwipeOffset(0);
        setHintCount(0); // Reset hint when changing card
        setRevealedMeanings(new Set()); // Reset revealed meanings when changing card
        cardShownTimeRef.current = Date.now(); // Reset timer khi đổi card

        // Cleanup stale MC options cache for cards we've moved past
        // Keep current + adjacent cards, clear the rest to avoid memory leak
        const currentKeys = Object.keys(optionsRef.current);
        if (currentKeys.length > 10) {
            optionsRef.current = {};
        }

        let timeoutId;
        // Auto-play audio for dictation mode (both when card has reviewType === 'dictation' or reviewMode === 'dictation')
        const card = cards[currentIndex];
        if (card && (card.reviewType === 'dictation' || reviewMode === 'dictation')) {
            if (reviewAudioEnabled) {
                timeoutId = setTimeout(() => {
                    speakJapanese(card.front, card.audioBase64, onSaveCardAudio ? (b64, vid) => onSaveCardAudio(card.id, b64, vid) : null);
                }, 300);
            }
        }

        return () => {
            if (timeoutId) clearTimeout(timeoutId);
        };
    }, [currentIndex, reviewAudioEnabled]);

    // Helper: tính thời gian phản hồi (ms)
    const getResponseTime = () => Date.now() - cardShownTimeRef.current;

    // Normalize answer function
    const normalizeAnswer = useCallback((text) => {
        return text.replace(/（[^）]*）/g, '').replace(/\([^)]*\)/g, '').replace(/\s+/g, '').toLowerCase();
    }, []);

    const toHiragana = useCallback((str) => {
        if (!str) return '';
        return str.replace(/[\u30A1-\u30F6]/g, (match) => {
            const chr = match.charCodeAt(0) - 0x60;
            return String.fromCharCode(chr);
        });
    }, []);

    // Move to previous card
    const moveToPreviousCard = useCallback(() => {
        if (currentIndex > 0 && !isProcessing) {
            if (reviewMode === 'flashcard') {
                setSlideDirection('right');
                setTimeout(() => {
                    setIsFlipped(false);
                    setIsAnimatingFlip(false);
                    setCurrentIndex(currentIndex - 1);
                    setInputValue('');
                    setIsRevealed(false);
                    setIsLocked(false);
                    setFeedback(null);
                    setMessage('');
                    setNeedsRetype(false);
                    setSlideDirection('left');
                    setTimeout(() => {
                        setSlideDirection('');
                        setTimeout(() => {
                            setIsAnimatingFlip(true);
                        }, 110);
                    }, 20);
                }, 70);
            } else {
                setCurrentIndex(currentIndex - 1);
                setInputValue('');
                setIsRevealed(false);
                setIsLocked(false);
                setFeedback(null);
                setMessage('');
                setNeedsRetype(false);
            }
        }
    }, [currentIndex, isProcessing, reviewMode]);

    // Handle complete review
    const handleCompleteReview = useCallback(() => {
        if (isCompletingRef.current) return;
        isCompletingRef.current = true;

        const currentFailedCards = failedCardsRef.current;

        if (currentFailedCards.size > 0) {
            const failedCardsList = [];
            currentFailedCards.forEach(cardKey => {
                const [cardId, reviewType] = cardKey.split('-');
                const card = allCards.find(c => c.id === cardId);
                if (card) {
                    failedCardsList.push({ ...card, reviewType });
                }
            });

            if (failedCardsList.length > 0) {
                const shuffledFailedCards = shuffleArray(failedCardsList);
                setCards(shuffledFailedCards);
                setCurrentIndex(0);
                setInputValue('');
                setIsRevealed(false);
                setIsLocked(false);
                setFeedback(null);
                setMessage('');
                setNeedsRetype(false);
                setIsProcessing(false);
                isProcessingRef.current = false; // Reset sync guard for next round
                isCompletingRef.current = false;
                return;
            }
        }
        // Hiển thị màn hình hoàn thành nội bộ thay vì delegate ra AppRoutes
        setShowComplete(true);
    }, [allCards]);

    // Keyboard event handlers for flashcard mode
    useEffect(() => {
        if (reviewMode !== 'flashcard') return;

        const handleKeyDown = (e) => {
            if (e.repeat) return;
            if ((e.key === ' ' || e.key === 'ArrowLeft' || e.key === 'ArrowRight') &&
                e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
                e.preventDefault();
            }

            if (e.key === ' ' && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
                setIsFlipped(prev => {
                    const newFlippedState = !prev;
                    if (newFlippedState && currentCard && cardSettings.autoPlayAudio) {
                        speakJapanese(currentCard.front, currentCard.audioBase64, onSaveCardAudio ? (b64, vid) => onSaveCardAudio(currentCard.id, b64, vid) : null);
                    }
                    return newFlippedState;
                });
            }
            else if (e.key === 'ArrowLeft' && currentIndex > 0 && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
                moveToPreviousCard();
            }
            else if (e.key === 'ArrowRight' && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
                if (currentIndex < cards.length - 1) {
                    setSlideDirection('left');
                    setTimeout(() => {
                        setIsFlipped(false);
                        setIsAnimatingFlip(false);
                        setCurrentIndex(currentIndex + 1);
                        setSlideDirection('right');
                        setTimeout(() => {
                            setSlideDirection('');
                            setTimeout(() => {
                                setIsAnimatingFlip(true);
                            }, 110);
                        }, 20);
                    }, 70);
                } else {
                    handleCompleteReview();
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [currentIndex, cards, reviewMode, handleCompleteReview, moveToPreviousCard, currentCard]);

    // Keyboard shortcuts for multiple choice (1-2-3-4)
    useEffect(() => {
        if (!isMultipleChoice || isRevealed || isProcessing || feedback || multipleChoiceOptions.length === 0) return;

        const handleMCKeyDown = (e) => {
            if (e.repeat) return;
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
            const keyNum = parseInt(e.key);
            if (keyNum >= 1 && keyNum <= multipleChoiceOptions.length) {
                e.preventDefault();
                const option = multipleChoiceOptions[keyNum - 1];
                if (option) {
                    // Simulate click on the option button
                    const buttons = document.querySelectorAll('[data-mc-option]');
                    if (buttons[keyNum - 1]) buttons[keyNum - 1].click();
                }
            }
        };

        window.addEventListener('keydown', handleMCKeyDown);
        return () => window.removeEventListener('keydown', handleMCKeyDown);
    }, [isMultipleChoice, isRevealed, isProcessing, feedback, multipleChoiceOptions]);

    const handleFlip = useCallback(() => {
        const newFlippedState = !isFlipped;
        setIsFlipped(newFlippedState);
        if (currentCard && cardSettings.autoPlayAudio && cardSettings.audioEnabled !== false) {
            // Chỉ phát âm thanh khi lật từ mặt trước sang mặt sau (newFlippedState === true)
            if (newFlippedState) {
                speakJapanese(currentCard.front, currentCard.audioBase64, onSaveCardAudio ? (b64, vid) => onSaveCardAudio(currentCard.id, b64, vid) : null);
            }
        }
    }, [isFlipped, currentCard, cardSettings.autoPlayAudio, cardSettings.audioEnabled, onSaveCardAudio]);

    // Swipe handlers
    const minSwipeDistance = 50;

    const onTouchStart = (e) => {
        if (reviewMode !== 'flashcard') return;
        setTouchEnd(null);
        setTouchStart(e.targetTouches[0].clientX);
    };

    const onTouchMove = (e) => {
        if (reviewMode !== 'flashcard' || !touchStart) return;
        const currentTouch = e.targetTouches[0].clientX;
        setTouchEnd(currentTouch);
        const diff = currentTouch - touchStart;
        const maxOffset = 200;
        setSwipeOffset(Math.max(-maxOffset, Math.min(maxOffset, diff)));
    };

    const onTouchEnd = () => {
        if (reviewMode !== 'flashcard' || !touchStart) {
            setTouchStart(null);
            setTouchEnd(null);
            setSwipeOffset(0);
            return;
        }

        if (!touchEnd) {
            setTouchStart(null);
            setTouchEnd(null);
            setSwipeOffset(0);
            return;
        }

        const distance = touchStart - touchEnd;
        const isLeftSwipe = distance > minSwipeDistance;
        const isRightSwipe = distance < -minSwipeDistance;

        if (isLeftSwipe && currentIndex < cards.length - 1) {
            setSlideDirection('left');
            setTimeout(() => {
                setIsFlipped(false);
                setIsAnimatingFlip(false);
                setCurrentIndex(currentIndex + 1);
                setSlideDirection('right');
                setTimeout(() => {
                    setSlideDirection('');
                    setTimeout(() => {
                        setIsAnimatingFlip(true);
                    }, 110);
                }, 20);
            }, 70);
        } else if (isRightSwipe && currentIndex > 0) {
            setSlideDirection('right');
            setTimeout(() => {
                setIsFlipped(false);
                setIsAnimatingFlip(false);
                setCurrentIndex(currentIndex - 1);
                setInputValue('');
                setIsRevealed(false);
                setIsLocked(false);
                setFeedback(null);
                setMessage('');
                setSlideDirection('left');
                setTimeout(() => {
                    setSlideDirection('');
                    setTimeout(() => {
                        setIsAnimatingFlip(true);
                    }, 110);
                }, 20);
            }, 70);
        } else if (currentIndex >= cards.length - 1 && isLeftSwipe) {
            handleCompleteReview();
        }

        setTouchStart(null);
        setTouchEnd(null);
        setSwipeOffset(0);
    };

    // Generate multiple choice options
    useEffect(() => {
        if (!currentCard || !isMultipleChoice) {
            setMultipleChoiceOptions([]);
            return;
        }

        if (!optionsRef.current[currentCardId]) {
            const correctAnswer = currentCard.frontWithFurigana || currentCard.front;
            const currentPos = currentCard.pos;

            const allValidCards = (allCards || cards)
                .filter(card =>
                    card.id !== currentCard.id &&
                    card.front &&
                    card.front.trim() !== '' &&
                    normalizeAnswer(card.front) !== normalizeAnswer(correctAnswer)
                );

            const samePosCards = currentPos
                ? allValidCards.filter(card => card.pos === currentPos)
                : [];

            const correctLength = correctAnswer.length;
            const similarLengthCards = allValidCards.filter(card =>
                Math.abs(card.front.length - correctLength) <= 2
            );

            let candidates = [];

            if (samePosCards.length > 0) {
                candidates.push(...samePosCards.slice(0, 3));
            }

            if (candidates.length < 3) {
                const remaining = similarLengthCards.filter(card =>
                    !candidates.find(c => c.id === card.id)
                );
                candidates.push(...remaining.slice(0, 3 - candidates.length));
            }

            if (candidates.length < 3) {
                const remaining = allValidCards.filter(card =>
                    !candidates.find(c => c.id === card.id)
                );
                candidates.push(...remaining.slice(0, 3 - candidates.length));
            }

            const shuffledCandidates = shuffleArray(candidates);
            const wrongOptions = shuffledCandidates
                .slice(0, 3)
                .map(card => card.frontWithFurigana || card.front)
                .filter((front, index, self) =>
                    // Deduplicate by normalized form
                    self.findIndex(f => normalizeAnswer(f) === normalizeAnswer(front)) === index
                    // Also exclude options that are too similar to the correct answer
                    && normalizeAnswer(front) !== normalizeAnswer(correctAnswer)
                );

            // Only pad with '...' if we have fewer than 3 real wrong options
            // and only if there really aren't enough cards in the collection
            const realWrongCount = wrongOptions.length;
            while (wrongOptions.length < 3) {
                wrongOptions.push(`(Lựa chọn ${wrongOptions.length + 1})`);
            }

            const options = [correctAnswer, ...wrongOptions];
            const shuffledOptions = shuffleArray(options);

            // If we had to pad, at least make sure it's clear these are placeholders
            optionsRef.current[currentCardId] = shuffledOptions;
        }

        setMultipleChoiceOptions(optionsRef.current[currentCardId] || []);
    }, [currentCardId, isMultipleChoice, currentCard, allCards, cards, normalizeAnswer, reviewTestFormat]);

    // Auto complete when cards are done
    useEffect(() => {
        if ((cards.length === 0 || currentIndex >= cards.length) && !isCompletingRef.current && !showComplete) {
            const timer = setTimeout(() => {
                handleCompleteReview();
            }, 150);
            return () => clearTimeout(timer);
        }
    }, [cards.length, currentIndex, handleCompleteReview, failedCards.size, showComplete]);

    const handleRestart = () => {
        setCards(initialCards);
        setCurrentIndex(0);
        setFailedCards(new Set());
        failedCardsRef.current = new Set();
        sessionWrongCardIdsRef.current = new Set();
        setInputValue('');
        setIsRevealed(false);
        setIsLocked(false);
        setFeedback(null);
        setMessage('');
        setShowComplete(false);
    };

    // Launch fanfare on completion
    useEffect(() => {
        if (showComplete) {
            launchFanfare();
        }
    }, [showComplete]);

    // Keyboard shortcut: Enter to advance (outside input), 1-4 for MC — must be before any early return
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.repeat) return;
            if (e.key === 'Enter' && isRevealed && !isProcessing) {
                if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
                    e.preventDefault();
                    handleNextRef.current?.();
                    return;
                }
            }
            if (!isMultipleChoice || isRevealed || isProcessing || feedback) return;
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
            const key = parseInt(e.key);
            if (key >= 1 && key <= 4 && multipleChoiceOptions[key - 1]) {
                e.preventDefault();
                const btn = document.querySelector(`[data-mc-option="${key - 1}"]`);
                if (btn) btn.click();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isMultipleChoice, isRevealed, isProcessing, feedback, multipleChoiceOptions]);

    // Keyboard shortcut: Enter to finish when review is done
    useEffect(() => {
        const handleCompleteKeyDown = (e) => {
            if (showComplete && e.key === 'Enter') {
                e.preventDefault();
                if (onCompleteReview) {
                    onCompleteReview(null);
                } else if (onBack) {
                    onBack();
                }
            }
        };
        window.addEventListener('keydown', handleCompleteKeyDown);
        return () => window.removeEventListener('keydown', handleCompleteKeyDown);
    }, [showComplete, onCompleteReview, onBack]);

    // Màn hình hoàn thành nội bộ
    if (showComplete) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm animate-fade-in">
                <div className="flex flex-col items-center justify-center text-center space-y-6 p-8 max-w-sm w-full bg-white dark:bg-slate-900 border-2 border-indigo-400/30 rounded-3xl shadow-xl">
                    <div className="text-6xl mb-2">🎉</div>
                    <div>
                        <h2 className="text-3xl font-black text-gray-800 dark:text-white mb-2">Xuất sắc!</h2>
                        <p className="text-gray-500 dark:text-gray-400 text-lg">
                            Bạn đã hoàn thành phiên ôn tập này.
                        </p>
                    </div>
                    <div className="w-full max-w-xs bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-2xl p-5 border border-indigo-200/60 dark:border-indigo-800/60 shadow-lg">
                        <div className="flex items-center justify-center gap-2 text-indigo-700 dark:text-indigo-300 font-bold text-lg">
                            <Zap className="w-5 h-5" />
                            <span>Hoàn thành 100%</span>
                        </div>
                    </div>
                    <div className="flex gap-3 w-full max-w-xs pt-2">
                        <button
                            onClick={handleRestart}
                            className="flex-1 py-3 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 font-bold rounded-xl hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-all flex items-center justify-center gap-1 cursor-pointer"
                        >
                            <RotateCcw className="w-4 h-4" /> Ôn lại
                        </button>
                        <button
                            onClick={() => {
                                if (onCompleteReview) onCompleteReview(null);
                                else if (onBack) onBack();
                            }}
                            className="flex-1 py-3 bg-gradient-to-r from-indigo-600 to-sky-500 text-white font-bold rounded-xl shadow-md transition-all hover:-translate-y-0.5 flex items-center justify-center gap-1 cursor-pointer"
                        >
                            Xong <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    if (cards.length === 0 || currentIndex >= cards.length) {
        return null;
    }

    const displayFront = currentCard.front;

    // Helper function to split text ignoring parentheses
    const splitIgnoringParentheses = (text, delimiter) => {
        const result = [];
        let currentPart = '';
        let depth = 0;

        for (let i = 0; i < text.length; i++) {
            const char = text[i];
            if (char === '(' || char === '（') {
                depth++;
                currentPart += char;
            } else if (char === ')' || char === '）') {
                depth--;
                currentPart += char;
            } else if (char === delimiter && depth === 0) {
                result.push(currentPart.trim());
                currentPart = '';
            } else {
                currentPart += char;
            }
        }

        if (currentPart.trim()) {
            result.push(currentPart.trim());
        }

        return result;
    };

    // Format multiple meanings
    const formatMultipleMeanings = (text) => {
        if (!text) return text;

        const numberSymbols = ['➀', '➁', '➂', '➃', '➄', '➅', '➆', '➇', '➈', '➉'];
        let meanings = [];

        const numberedMatches = [];
        let depth = 0;

        for (let i = 0; i < text.length; i++) {
            const char = text[i];
            if (char === '(' || char === '（') {
                depth++;
            } else if (char === ')' || char === '）') {
                depth--;
            } else if (depth === 0 && /^\d+\.\s/.test(text.substring(i))) {
                const match = text.substring(i).match(/^(\d+\.\s+)/);
                if (match) {
                    numberedMatches.push({ start: i, number: parseInt(match[1]) });
                }
            }
        }

        if (numberedMatches.length >= 2) {
            for (let i = 0; i < numberedMatches.length; i++) {
                const start = numberedMatches[i].start;
                const end = i < numberedMatches.length - 1 ? numberedMatches[i + 1].start : text.length;
                const part = text.substring(start, end).trim();
                if (part) {
                    meanings.push(part);
                }
            }
        }

        if (meanings.length <= 1) {
            if (text.includes('\n')) {
                meanings = text.split('\n').map(m => m.trim()).filter(m => m);
            } else if (text.includes(';')) {
                meanings = splitIgnoringParentheses(text, ';')
                    .map(m => m.replace(/\s+/g, ' ').trim())
                    .filter(m => m);
            } else {
                meanings = [text];
            }
        }

        if (meanings.length <= 1) {
            return text;
        }

        return meanings.map((meaning, index) => {
            const symbol = numberSymbols[index] || `${index + 1}.`;
            return `${symbol} ${meaning}`;
        }).join('\n');
    };

    const getPrompt = () => {
        switch (cardReviewType) {
            case 'synonym':
                return { label: 'Từ đồng nghĩa', text: currentCard.synonym, image: currentCard.imageBase64, icon: MessageSquare, color: 'text-blue-600' };
            case 'example': {
                const wordToMask = getWordForMasking(currentCard.front);
                const readingForMask = getReadingForMasking(currentCard.front);
                // Use first example line if multiple examples exist
                const exampleLines = (currentCard.example || '').split('\n').filter(e => e.trim());
                const exampleMeaningLines = (currentCard.exampleMeaning || '').split('\n').filter(e => e.trim());
                const firstExample = exampleLines[0] || currentCard.example;
                const firstExampleMeaning = exampleMeaningLines[0] || currentCard.exampleMeaning || null;
                const maskedExample = maskWordInExample(wordToMask, firstExample, currentCard.pos, readingForMask);
                return { label: 'Điền từ còn thiếu', text: maskedExample, meaning: firstExampleMeaning, image: currentCard.imageBase64, icon: FileText, color: 'text-sky-600' };
            }
            case 'dictation':
                return { label: 'Nghe chép', text: null, image: null, icon: Headphones, color: 'text-indigo-600' };
            default:
                return { label: 'Ý nghĩa (Mặt sau)', text: formatMultipleMeanings(currentCard.back), image: currentCard.imageBase64, icon: Repeat2, color: 'text-emerald-600' };
        }
    };

    const promptInfo = getPrompt();

    // Check answer
    const checkAnswer = async () => {
        if (isProcessingRef.current) return;
        isProcessingRef.current = true;

        const userAnswer = normalizeAnswer(inputValue);
        let isCorrect = false;

        if (inputMode === 'reading' || cardReviewType === 'dictation' || cardReviewType === 'example') {
            // Mode: Hiện nghĩa, nhập từ vựng HOẶC Dictation: nghe, nhập từ vựng
            const rawFront = currentCard.front;
            const kanjiPart = rawFront.split('（')[0].split('(')[0];
            const kanaPartMatch = rawFront.match(/（([^）]+)）/) || rawFront.match(/\(([^)]+)\)/);
            const kanaPart = kanaPartMatch ? kanaPartMatch[1] : '';

            const normalizedKanji = toHiragana(normalizeAnswer(kanjiPart));
            const normalizedKana = toHiragana(normalizeAnswer(kanaPart));
            const normalizedFull = toHiragana(normalizeAnswer(rawFront));
            const normalizedUser = toHiragana(userAnswer);

            isCorrect = normalizedUser === normalizedKanji || (kanaPart && normalizedUser === normalizedKana) || normalizedUser === normalizedFull;

            if (!isCorrect && currentCard.pos === 'adj_na') {
                const buildAdjNa = (val) => {
                    if (!val) return [];
                    if (val.endsWith('な')) {
                        return [val, val.slice(0, -1)];
                    } else {
                        return [val, val + 'な'];
                    }
                };
                const accepted = new Set([
                    ...buildAdjNa(normalizedKanji),
                    ...(kanaPart ? buildAdjNa(normalizedKana) : []),
                    ...buildAdjNa(normalizedFull),
                ]);
                isCorrect = accepted.has(normalizedUser);
            }
        } else {
            // Mode: Hiện từ vựng, nhập nghĩa - chấp nhận đúng 1 trong các nghĩa
            // Chấp nhận cả kanji và furigana cho đáp án nghĩa
            const normalizeVietnamese = (text) => text.toLowerCase().trim().replace(/\s+/g, ' ');
            const userAnswerNormalized = normalizeVietnamese(inputValue);

            // Split meanings by common delimiters
            const rawMeanings = currentCard.back.split(/[,;，；\n]/);
            const meanings = rawMeanings.map(m => normalizeVietnamese(m.replace(/^\d+\.\s*/, '').trim())).filter(m => m.length > 0);

            isCorrect = meanings.some(meaning => {
                if (!meaning) return false;
                // Exact match
                if (userAnswerNormalized === meaning) return true;
                // User's answer contains one of the meanings
                if (userAnswerNormalized.includes(meaning)) return true;
                // One of the meanings contains user's answer (at least 3 chars)
                if (userAnswerNormalized.length >= 3 && meaning.includes(userAnswerNormalized)) return true;
                return false;
            });

            // Fallback: chấp nhận kanji hoặc furigana của từ vựng như đáp án
            if (!isCorrect) {
                const rawFront = currentCard.front;
                const kanjiPart = rawFront.split('（')[0].split('(')[0];
                const kanaPartMatch = rawFront.match(/（([^）]+)）/) || rawFront.match(/\(([^)]+)\)/);
                const kanaPart = kanaPartMatch ? kanaPartMatch[1] : '';
                const normalizedKanji = toHiragana(normalizeAnswer(kanjiPart));
                const normalizedKana = toHiragana(normalizeAnswer(kanaPart));
                const normalizedUser = toHiragana(userAnswer);
                isCorrect = normalizedUser === normalizedKanji || (kanaPart && normalizedUser === normalizedKana);
            }
        }

        const cardKey = `${currentCard.id}-${cardReviewType}`;
        const hasFailedBefore = failedCards.has(cardKey);

        try {
            if (isCorrect) {
                // Shared handler for correct answer (first try or after prior failure)
                if (hasFailedBefore) {
                    failedCardsRef.current.delete(cardKey);
                    setFailedCards(new Set(failedCardsRef.current));
                }
                setIsProcessing(true);
                setFeedback('correct');
                setMessage(hasFailedBefore ? `Chính xác! ${displayFront} - Đã hoàn thành!` : `Chính xác! ${displayFront}`);
                setIsRevealed(true);
                setIsLocked(false);
                flashCorrect();
                playCorrectSound();
                celebrateCorrectAnswer();

                // Fire-and-forget audio — do NOT await so auto-advance is not blocked
                if (reviewAudioEnabled) {
                    speakJapanese(currentCard.front, currentCard.audioBase64,
                        onSaveCardAudio && isMountedRef.current ? (b64, vid) => {
                            if (isMountedRef.current && !audioAbortRef.current && onSaveCardAudio) {
                                onSaveCardAudio(currentCard.id, b64, vid).catch(e => {
                                    console.warn('⚠️ Failed to persist audio:', e.message);
                                });
                            }
                        } : null
                    ).catch(e => console.warn('⚠️ Audio playback error (continuing):', e.message));
                }

                // Auto-advance after short fixed delay regardless of audio
                await new Promise(resolve => setTimeout(resolve, 700));
                await moveToNextCard(true);
            } else {
                sessionWrongCardIdsRef.current.add(currentCard.id);
                failedCardsRef.current.add(cardKey);
                setFailedCards(new Set(failedCardsRef.current));
                setFeedback('incorrect');
                const correctAns = (inputMode === 'reading' || cardReviewType === 'dictation' || cardReviewType === 'example') ? displayFront : currentCard.back;
                const nuanceText = currentCard.nuance ? ` (${currentCard.nuance})` : '';
                setMessage(`Đáp án đúng: ${correctAns}${nuanceText}`);
                setIsRevealed(true);
                setIsLocked(true);
                // Clear input and require user to retype correct answer for typing modes
                if ((cardReviewType === 'back' || cardReviewType === 'dictation' || cardReviewType === 'example') && !isMultipleChoice) {
                    setInputValue('');
                    setNeedsRetype(true);
                }
                playIncorrectSound();

                // Speak with safe error handling, delayed by 500ms to avoid overlapping incorrect sound
                if (reviewAudioEnabled) {
                    setTimeout(() => {
                        if (isMountedRef.current && !audioAbortRef.current) {
                            speakJapanese(currentCard.front, currentCard.audioBase64,
                                onSaveCardAudio && isMountedRef.current ? (b64, vid) => {
                                    if (isMountedRef.current && !audioAbortRef.current && onSaveCardAudio) {
                                        onSaveCardAudio(currentCard.id, b64, vid).catch(e => {
                                            console.warn('⚠️ Failed to persist audio:', e.message);
                                        });
                                    }
                                } : null
                            ).catch(e => {
                                console.warn('⚠️ Audio playback error:', e.message);
                            });
                        }
                    }, 500);
                }

                setCards(prevCards => {
                    return prevCards.map(card => {
                        if (card.id === currentCard.id) {
                            const updatedCard = { ...card };
                            if (cardReviewType === 'back') {
                                updatedCard.correctStreak_back = 0;
                            } else if (cardReviewType === 'synonym') {
                                updatedCard.correctStreak_synonym = 0;
                            } else if (cardReviewType === 'example') {
                                updatedCard.correctStreak_example = 0;
                            } else if (cardReviewType === 'dictation') {
                                updatedCard.correctStreak_dictation = 0;
                            }
                            return updatedCard;
                        }
                        return card;
                    });
                });

                try {
                    const action = reviewMode === 'synonym' ? 'synonym_practice' : 'review';
                    await onUpdateCard(currentCard.id, false, cardReviewType, action, getResponseTime());
                } catch (error) {
                    console.error('Error updating card:', error);
                }
                // Release processing guard so user can retype
                isProcessingRef.current = false;
            }
        } catch (error) {
            console.error('Error in checkAnswer:', error);
            isProcessingRef.current = false;
            setIsProcessing(false);
            setFeedback(null);
            setIsRevealed(false);
            setIsLocked(false);
        }
    };

    const moveToNextCard = async (shouldUpdateStreak) => {
        if (shouldUpdateStreak && !sessionWrongCardIdsRef.current.has(currentCard.id)) {
            // For synonym mode: use 'synonym_practice' action so main SRS is NOT affected
            const action = reviewMode === 'synonym' ? 'synonym_practice' : 'review';
            // Fire-and-forget: don't await to avoid blocking UI transition
            onUpdateCard(currentCard.id, true, cardReviewType, action, getResponseTime()).catch(error => {
                console.error('Error updating card:', error);
            });

            setCards(prevCards => {
                return prevCards.map(card => {
                    if (card.id === currentCard.id) {
                        const updatedCard = { ...card };
                        if (cardReviewType === 'back') {
                            updatedCard.correctStreak_back = (card.correctStreak_back || 0) + 1;
                        } else if (cardReviewType === 'synonym') {
                            updatedCard.correctStreak_synonym = (card.correctStreak_synonym || 0) + 1;
                        } else if (cardReviewType === 'example') {
                            updatedCard.correctStreak_example = (card.correctStreak_example || 0) + 1;
                        } else if (cardReviewType === 'dictation') {
                            updatedCard.correctStreak_dictation = (card.correctStreak_dictation || 0) + 1;
                        }
                        return updatedCard;
                    }
                    return card;
                });
            });
        }

        const nextIndex = currentIndex + 1;
        if (nextIndex < cards.length) {
            if (reviewMode === 'flashcard') {
                setSlideDirection('left');
                setTimeout(() => {
                    setCurrentIndex(nextIndex);
                    setInputValue('');
                    setIsRevealed(false);
                    setIsLocked(false);
                    setFeedback(null);
                    setMessage('');
                    setNeedsRetype(false);
                    setIsProcessing(false);
                    isProcessingRef.current = false;
                    setSlideDirection('right');
                    setTimeout(() => {
                        setSlideDirection('');
                        if (cardReviewType === 'back' && !isMultipleChoice && inputRef.current && !isMobileDevice()) {
                            setTimeout(() => inputRef.current?.focus(), 100);
                        }
                    }, 110);
                }, 70);
            } else {
                setCurrentIndex(nextIndex);
                setInputValue('');
                setIsRevealed(false);
                setIsLocked(false);
                setFeedback(null);
                setMessage('');
                setNeedsRetype(false);
                setIsProcessing(false);
                isProcessingRef.current = false;
                if ((cardReviewType === 'back' || cardReviewType === 'dictation' || cardReviewType === 'example') && !isMultipleChoice && inputRef.current && !isMobileDevice()) {
                    setTimeout(() => inputRef.current?.focus(), 100);
                }
            }
        } else {
            await new Promise(resolve => setTimeout(resolve, 100));
            handleCompleteReview();
        }
    };

    const handleNext = () => {
        if (isProcessing) return;
        setIsProcessing(true);
        if (feedback === 'correct') {
            moveToNextCard(true);
        } else if (feedback === 'incorrect' && !needsRetype) {
            moveToNextCard(false);
        } else {
            setIsProcessing(false);
        }
    };
    // Keep ref in sync so the early-hoisted useEffect can call it
    handleNextRef.current = handleNext;

    // Handle retype submission: check if user typed the correct answer
    const handleRetypeSubmit = async () => {
        if (!needsRetype || isProcessingRef.current) return;
        isProcessingRef.current = true;
        const retypeAns = normalizeAnswer(inputValue);
        let isRetypeCorrect = false;

        if (inputMode === 'reading' || cardReviewType === 'dictation' || cardReviewType === 'example') {
            const rawFront = currentCard.front;
            const kanjiPart = rawFront.split('（')[0].split('(')[0];
            const kanaPartMatch = rawFront.match(/（([^）]+)）/) || rawFront.match(/\(([^)]+)\)/);
            const kanaPart = kanaPartMatch ? kanaPartMatch[1] : '';
            const normalizedKanji = toHiragana(normalizeAnswer(kanjiPart));
            const normalizedKana = toHiragana(normalizeAnswer(kanaPart));
            const normalizedFull = toHiragana(normalizeAnswer(rawFront));
            const normalizedRetype = toHiragana(retypeAns);
            isRetypeCorrect = normalizedRetype === normalizedKanji || (kanaPart && normalizedRetype === normalizedKana) || normalizedRetype === normalizedFull;

            if (!isRetypeCorrect && currentCard.pos === 'adj_na') {
                const buildAdjNa = (val) => {
                    if (!val) return [];
                    if (val.endsWith('な')) {
                        return [val, val.slice(0, -1)];
                    } else {
                        return [val, val + 'な'];
                    }
                };
                const accepted = new Set([
                    ...buildAdjNa(normalizedKanji),
                    ...(kanaPart ? buildAdjNa(normalizedKana) : []),
                    ...buildAdjNa(normalizedFull),
                ]);
                isRetypeCorrect = accepted.has(normalizedRetype);
            }
        } else {
            const normalizeVietnamese = (text) => text.toLowerCase().trim().replace(/\s+/g, ' ');
            const userAnswerNorm = normalizeVietnamese(inputValue);
            const rawMeanings = currentCard.back.split(/[,;，；\n]/);
            const meanings = rawMeanings.map(m => normalizeVietnamese(m.replace(/^\d+\.\s*/, '').trim())).filter(m => m.length > 0);
            isRetypeCorrect = meanings.some(meaning => {
                if (!meaning) return false;
                if (userAnswerNorm === meaning) return true;
                if (userAnswerNorm.includes(meaning)) return true;
                if (userAnswerNorm.length >= 3 && meaning.includes(userAnswerNorm)) return true;
                return false;
            });
        }

        if (isRetypeCorrect) {
            setNeedsRetype(false);
            setFeedback('correct');
            setMessage('Đúng rồi! Tiếp tục nào...');
            flashCorrect();
            playCorrectSound();
            setIsProcessing(true);
            await new Promise(resolve => setTimeout(resolve, 700));
            await moveToNextCard(false); // Don't update streak since first answer was wrong
        } else {
            setFeedback('incorrect');
            setMessage(`Chưa đúng! Hãy nhập: ${(inputMode === 'reading' || cardReviewType === 'dictation' || cardReviewType === 'example') ? displayFront : currentCard.back}`);
            setInputValue('');
            playIncorrectSound();
            isProcessingRef.current = false; // Release so user can try again
        }
    };

    const progress = Math.round(((currentIndex) / cards.length) * 100);

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
                <div className="w-full flex flex-col justify-center items-center space-y-3 p-4 border-2 border-indigo-400/30 rounded-2xl overflow-hidden">
                    {/* Progress bar + Settings */}
                    <div className="w-full space-y-1 flex-shrink-0">
                        <div className="flex justify-between items-center text-xs font-medium text-gray-500 dark:text-gray-400">
                            <span>{currentIndex + 1} / {cards.length}</span>
                            <div className="flex items-center gap-2">
                                {failedCards.size > 0 && <span className="text-red-500">({failedCards.size} sai)</span>}
                                {reviewMode !== 'dictation' && reviewMode !== 'flashcard' && (
                                    <button onClick={() => setShowSettings(true)} className="p-1 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-700 transition-all" title="Cài đặt">
                                        <Settings className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                        </div>
                        <div className="h-1.5 w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                            <div className="h-full bg-indigo-500 progress-bar rounded-full" style={{ width: `${progress}%` }}></div>
                        </div>
                    </div>

                    {/* Flashcard Area */}
                    <div className="w-full relative group perspective flex-shrink-0">
                        {reviewMode === 'flashcard' ? (
                            <div className="perspective-1000 w-full max-w-[700px] mx-auto relative" style={{ minHeight: '480px' }}>
                                <div
                                    className={`relative card-slide ${slideDirection === 'left' ? 'slide-out-left' : slideDirection === 'right' ? 'slide-out-right' : ''}`}
                                    onTouchStart={onTouchStart}
                                    onTouchMove={onTouchMove}
                                    onTouchEnd={onTouchEnd}
                                    style={{
                                        width: '105%',
                                        minHeight: '480px',
                                        height: 'auto',
                                        transform: swipeOffset ? `translateX(${swipeOffset}px)` : undefined,
                                        transition: swipeOffset ? 'none' : (slideDirection ? 'transform 0.12s cubic-bezier(0.4, 0.0, 0.2, 1), opacity 0.12s ease' : 'transform 0.2s cubic-bezier(0.4, 0.0, 0.2, 1)'),
                                        touchAction: 'pan-y',
                                    }}
                                >
                                    <Flashcard
                                        card={currentCard}
                                        cardSettings={cardSettings}
                                        isFlipped={isFlipped}
                                        onFlip={() => {
                                            setIsAnimatingFlip(true);
                                            const newFlippedState = !isFlipped;
                                            setIsFlipped(newFlippedState);
                                            if (newFlippedState && currentCard) {
                                                speakJapanese(currentCard.front, currentCard.audioBase64, onSaveCardAudio ? (b64, vid) => onSaveCardAudio(currentCard.id, b64, vid) : null);
                                            }
                                        }}
                                        variant="review"
                                        transitionEnabled={isAnimatingFlip}
                                    />
                                </div>

                                {/* Nuance Button - OUTSIDE the flipping container */}
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setShowNuancePopup(prev => !prev);
                                    }}
                                    className={`absolute top-6 right-[120px] p-2 backdrop-blur-sm rounded-full transition-all hover:scale-110 z-30 shadow-md border ${
                                        currentCard.nuance 
                                            ? 'bg-amber-500/30 hover:bg-amber-500/40 text-amber-300 border-amber-500/40' 
                                            : 'bg-white/20 hover:bg-white/35 text-white border-white/20'
                                    }`}
                                    title="Sắc thái từ vựng"
                                >
                                    <Lightbulb className="w-4 h-4" />
                                </button>

                                {/* Nuance Text Box */}
                                {showNuancePopup && (
                                    <div 
                                        onClick={(e) => e.stopPropagation()} 
                                        className="absolute top-20 right-6 left-6 z-40 bg-amber-50/95 dark:bg-amber-950/95 border-2 border-amber-200 dark:border-amber-900/60 rounded-2xl p-4 shadow-xl animate-fade-in text-slate-850 dark:text-slate-200"
                                    >
                                        <div className="flex items-center justify-between border-b border-amber-200/50 dark:border-amber-900/40 pb-2 mb-2">
                                            <div className="flex items-center gap-1.5 text-amber-700 dark:text-amber-400 font-extrabold text-sm">
                                                <Lightbulb className="w-4 h-4 fill-amber-300 animate-pulse" />
                                                <span>Sắc thái từ vựng</span>
                                            </div>
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); setShowNuancePopup(false); }}
                                                className="text-amber-600 hover:text-amber-800 dark:text-amber-400 dark:hover:text-amber-305 text-xs font-bold px-2 py-1 hover:bg-amber-100/50 dark:hover:bg-amber-900/30 rounded-lg transition-colors"
                                            >
                                                Đóng
                                            </button>
                                        </div>
                                        <p className="text-xs md:text-sm leading-relaxed whitespace-pre-wrap font-semibold">
                                            {currentCard.nuance || "Chưa có thông tin sắc thái cho từ vựng này."}
                                        </p>
                                    </div>
                                )}

                                {/* Speaker Button - OUTSIDE the flipping container */}
                                {cardSettings.audioEnabled !== false && (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            speakJapanese(currentCard.front, currentCard.audioBase64, onSaveCardAudio ? (b64, vid) => onSaveCardAudio(currentCard.id, b64, vid) : null);
                                        }}
                                        className="absolute top-6 right-18 p-2 bg-white/20 hover:bg-white/35 backdrop-blur-sm text-white rounded-full transition-all hover:scale-110 z-30 shadow-md border border-white/20"
                                        title="Phát âm"
                                    >
                                        <Volume2 className="w-4 h-4" />
                                    </button>
                                )}

                                {/* Settings Button - OUTSIDE the flipping container */}
                                <button
                                    onClick={(e) => { e.stopPropagation(); setShowSettingsMenu(true); }}
                                    className="absolute top-6 right-6 p-2 bg-white/20 hover:bg-white/35 backdrop-blur-sm text-white rounded-full transition-all hover:scale-110 z-30 shadow-md border border-white/20"
                                    title="Cấu hình hiển thị"
                                >
                                    <Settings className="w-4 h-4" />
                                </button>
                            </div>
                        ) : (
                            <div className="w-full bg-slate-800 dark:bg-slate-900 rounded-2xl shadow-xl p-5 flex flex-col text-center relative border-2 border-indigo-500/50">
                                {/* Header with mode label and toggle buttons */}
                                <div className="w-full flex justify-between items-center mb-3 flex-shrink-0">
                                    <div className="flex items-center gap-2">
                                        <span className="text-orange-500 text-xl">🔥</span>
                                        <span className="text-white font-bold text-sm">
                                            {reviewMode === 'meaning_input' ? (inputMode === 'reading' ? 'Nhập tiếng Nhật' : 'Nhập tiếng Việt') : (cardReviewType === 'back' ? (inputMode === 'reading' ? 'Cách đọc' : 'Ý nghĩa') : cardReviewType === 'synonym' ? 'Đồng nghĩa' : cardReviewType === 'dictation' ? 'Nghe chép' : 'Ngữ cảnh')}
                                        </span>
                                        {cardReviewType === 'example' && (
                                            <button
                                                onClick={(e) => { e.stopPropagation(); setBlurVietnamese(prev => !prev); setRevealedMeanings(new Set()); }}
                                                className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium transition-all border ${blurVietnamese
                                                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30'
                                                    : 'bg-slate-700/50 text-slate-400 border-slate-600/50 hover:bg-slate-600/50'
                                                    }`}
                                                title={blurVietnamese ? 'Tắt ẩn tiếng Việt' : 'Ẩn tiếng Việt để luyện đọc'}
                                            >
                                                {blurVietnamese ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                                                {blurVietnamese ? 'Hiện VN' : 'Ẩn VN'}
                                            </button>
                                        )}
                                    </div>
                                    {/* Only show toggle buttons for back mode and not meaning_input */}
                                    {cardReviewType === 'back' && reviewMode !== 'meaning_input' && !isMultipleChoice && (
                                        <div className="flex gap-1">
                                            <button
                                                onClick={() => { setInputMode('reading'); setInputValue(''); setHintCount(0); }}
                                                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${inputMode === 'reading' ? 'bg-orange-500 text-white' : 'bg-slate-700 text-gray-300 hover:bg-slate-600'}`}
                                            >
                                                Cách đọc
                                            </button>
                                            <button
                                                onClick={() => { setInputMode('meaning'); setInputValue(''); setHintCount(0); }}
                                                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${inputMode === 'meaning' ? 'bg-orange-500 text-white' : 'bg-slate-700 text-gray-300 hover:bg-slate-600'}`}
                                            >
                                                Ý nghĩa
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {/* Word display - scrollable content area */}
                                <div className="flex-1 flex flex-col items-center justify-center w-full min-h-[280px]">
                                    {/* Content area with image on left */}
                                    <div className={`flex items-center gap-8 ${currentCard.imageBase64 ? 'justify-center' : 'justify-center'}`}>
                                        {currentCard.imageBase64 && (
                                            <div className="shrink-0">
                                                <img
                                                    src={currentCard.imageBase64}
                                                    alt={currentCard.front}
                                                    className="w-36 h-36 md:w-44 md:h-44 rounded-xl object-cover border border-slate-500/30"
                                                />
                                            </div>
                                        )}
                                        <div className={currentCard.imageBase64 ? 'text-center flex-1 min-w-0' : 'text-center'}>{cardReviewType === 'synonym' ? (
                                            <>
                                                {/* Synonym mode: Show synonym from card */}
                                                <div className="quiz-question-text-lg font-bold text-white break-words font-japanese text-auto-fit">
                                                    <FuriganaText text={currentCard.synonym || 'Không có từ đồng nghĩa'} forceHide={!synonymFuriganaEnabled} />
                                                </div>
                                                {synonymVietnameseEnabled && currentCard.back && (
                                                    <div className="text-sm text-gray-400 mt-1 italic">
                                                        "{currentCard.back}"
                                                    </div>
                                                )}
                                                <div className="text-sm text-gray-400 mt-2">
                                                    Tìm từ đồng nghĩa
                                                </div>
                                            </>
                                        ) : cardReviewType === 'example' ? (
                                            <>
                                                {/* Example mode: Show example sentence with masked word */}
                                                <div className="quiz-example-text font-bold text-lg md:text-xl text-white font-japanese break-words text-auto-fit">
                                                    <FuriganaText text={promptInfo.text} forceHide={!exampleFuriganaEnabled} />
                                                </div>
                                                {exampleVietnameseEnabled && promptInfo.meaning && (
                                                    <div
                                                        className={`text-lg md:text-xl font-medium mt-2 italic break-words cursor-pointer transition-all duration-300 select-none ${blurVietnamese && !revealedMeanings.has('main') ? 'blur-[6px] opacity-40 hover:opacity-60' : 'text-gray-400'}`}
                                                        onClick={(e) => { e.stopPropagation(); if (blurVietnamese) { setRevealedMeanings(prev => { const next = new Set(prev); next.has('main') ? next.delete('main') : next.add('main'); return next; }); } }}
                                                        title={blurVietnamese ? (revealedMeanings.has('main') ? 'Click để ẩn lại' : 'Click để hiện nghĩa') : ''}
                                                    >
                                                        "{promptInfo.meaning.replace(/^"|"$/g, '')}"
                                                    </div>
                                                )}
                                                {/* Show ALL additional examples if card has multiple */}
                                                {(() => {
                                                    const exampleLines = (currentCard.example || '').split('\n').filter(e => e.trim());
                                                    const exampleMeaningLines = (currentCard.exampleMeaning || '').split('\n').filter(e => e.trim());
                                                    if (exampleLines.length <= 1) return null;
                                                    return (
                                                        <div className="mt-3 pt-3 border-t border-white/20 space-y-2 w-full">
                                                             {exampleLines.slice(1).map((ex, i) => (
                                                                <div key={i} className="text-center">
                                                                    <p className="quiz-example-text text-white font-japanese break-words font-bold text-lg md:text-xl text-auto-fit">
                                                                        <FuriganaText text={(() => {
                                                                            const wordToMask = getWordForMasking(currentCard.front);
                                                                            const readingForMask = getReadingForMasking(currentCard.front);
                                                                            return maskWordInExample(wordToMask, ex, currentCard.pos, readingForMask);
                                                                        })()} forceHide={!exampleFuriganaEnabled} />
                                                                    </p>
                                                                    {exampleVietnameseEnabled && exampleMeaningLines[i + 1] && (
                                                                        <p
                                                                            className={`text-lg md:text-xl font-medium italic mt-1 break-words cursor-pointer transition-all duration-300 select-none ${blurVietnamese && !revealedMeanings.has(`ex_${i}`) ? 'blur-[6px] opacity-40 hover:opacity-60' : 'text-gray-400'}`}
                                                                            onClick={(e) => { e.stopPropagation(); if (blurVietnamese) { setRevealedMeanings(prev => { const next = new Set(prev); next.has(`ex_${i}`) ? next.delete(`ex_${i}`) : next.add(`ex_${i}`); return next; }); } }}
                                                                        >
                                                                            "{exampleMeaningLines[i + 1].replace(/^"|"$/g, '')}"
                                                                        </p>
                                                                    )}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    );
                                                })()}
                                            </>
                                        ) : cardReviewType === 'dictation' ? (
                                            <>
                                                {/* Dictation mode: Show audio button, user listens and types */}
                                                <div className="flex flex-col items-center gap-4">
                                                    <button
                                                        onClick={() => speakJapanese(currentCard.front, currentCard.audioBase64, onSaveCardAudio ? (b64, vid) => onSaveCardAudio(currentCard.id, b64, vid) : null)}
                                                        className="p-6 bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 hover:text-indigo-200 rounded-full transition-all shadow-lg hover:shadow-indigo-500/20 hover:scale-110 active:scale-95 border-2 border-indigo-400/30"
                                                        title="Phát âm thanh"
                                                    >
                                                        <Volume2 className="w-12 h-12" />
                                                    </button>
                                                    <p className="text-sm text-gray-400">Nghe và nhập lại từ vựng</p>
                                                </div>
                                            </>
                                        ) : inputMode === 'reading' ? (
                                            <>
                                                {/* Reading mode: Show meaning, user inputs word */}
                                                <div className="quiz-question-text-lg font-extrabold text-xl md:text-2xl text-white whitespace-pre-line break-words text-auto-fit">
                                                    {formatMultipleMeanings(currentCard.back)}
                                                </div>
                                            </>
                                        ) : (
                                            <>
                                                {/* Meaning mode: Show word only, user inputs meaning */}
                                                <div className="quiz-question-text-xl font-black text-white font-japanese text-auto-fit">
                                                    <FuriganaText text={currentCard.frontWithFurigana || currentCard.front} forceHide={!meaningFuriganaEnabled} />
                                                </div>
                                            </>
                                        )}

                                            {/* Sino-Vietnamese hint & POS */}
                                            <div className="flex flex-col items-center justify-center gap-2 mt-4 text-center">
                                                {!['synonym', 'example', 'dictation'].includes(cardReviewType) && currentCard.sinoVietnamese && (reviewMode !== 'meaning_input' || meaningHanvietEnabled) && (
                                                    <p className="text-base font-medium text-yellow-300">
                                                        <span className="text-slate-400 font-normal">Hán Việt: </span>{currentCard.sinoVietnamese}
                                                    </p>
                                                )}
                                                {currentCard.pos && (
                                                    <p className="text-sm">
                                                        <span className="inline-block px-2 py-0.5 bg-slate-600/60 rounded-md text-xs font-medium text-teal-300">
                                                            {getPosLabel(currentCard.pos)}
                                                        </span>
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Interaction Area */}
                    <div className="w-full space-y-2 flex-shrink-0">
                        {/* Multiple Choice */}
                        {isMultipleChoice && !isRevealed && multipleChoiceOptions.length > 0 && (
                            <div className="space-y-3">
                                <p className="text-base md:text-lg font-bold text-gray-600 dark:text-gray-300 text-center mb-1">
                                    {cardReviewType === 'synonym'
                                        ? <span>Từ đồng nghĩa của "<FuriganaText text={promptInfo.text} forceHide={!synonymFuriganaEnabled} />" là gì?</span>
                                        : `Điền từ còn thiếu`
                                    }
                                </p>
                                <div className="grid grid-cols-2 gap-2">
                                    {multipleChoiceOptions.map((option, index) => {
                                        const isSelected = selectedAnswer === option;
                                        let buttonClass = "px-3 py-4 text-base md:text-xl font-extrabold rounded-xl transition-all border-2 text-left flex items-center gap-3 ";

                                        if (feedback && isSelected && feedback === 'correct') {
                                            buttonClass += "bg-emerald-500 text-white border-emerald-600 shadow-md";
                                        } else if (feedback && isSelected && feedback === 'incorrect') {
                                            buttonClass += "bg-red-500 text-white border-red-600 shadow-md";
                                        } else if (feedback && option === (currentCard.frontWithFurigana || currentCard.front)) {
                                            // Highlight đáp án đúng khi sai
                                            buttonClass += "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-emerald-500";
                                        } else if (isSelected) {
                                            buttonClass += "bg-indigo-500 text-white border-indigo-600 shadow-md";
                                        } else {
                                            buttonClass += "bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 hover:border-indigo-400";
                                        }

                                        if (isRevealed || isProcessing || !!feedback) {
                                            buttonClass += " cursor-default";
                                        } else {
                                            buttonClass += " cursor-pointer";
                                        }

                                        return (
                                            <div
                                                key={index}
                                                data-mc-option={index}
                                                onClick={async () => {
                                                    if (isRevealed || isProcessing || feedback) return;
                                                    setSelectedAnswer(option);

                                                    // Auto-submit ngay khi click
                                                    const isCorrect = option === (currentCard.frontWithFurigana || currentCard.front);
                                                    const cardKey = `${currentCard.id}-${cardReviewType}`;
                                                    const hasFailedBefore = failedCards.has(cardKey);

                                                    setIsProcessing(true);

                                                    try {
                                                        if (isCorrect) {
                                                            if (hasFailedBefore) {
                                                                failedCardsRef.current.delete(cardKey);
                                                                setFailedCards(new Set(failedCardsRef.current));
                                                                setFeedback('correct');
                                                                setMessage(`Chính xác! ${displayFront} - Đã hoàn thành!`);
                                                            } else {
                                                                setFeedback('correct');
                                                                setMessage(`Chính xác! ${displayFront}`);
                                                            }
                                                            flashCorrect();
                                                            playCorrectSound();
                                                            celebrateCorrectAnswer();
                                                        } else {
                                                            sessionWrongCardIdsRef.current.add(currentCard.id);
                                                            failedCardsRef.current.add(cardKey);
                                                            setFailedCards(new Set(failedCardsRef.current));
                                                            setFeedback('incorrect');
                                                            setMessage(`Đáp án đúng: ${displayFront}`);
                                                            playIncorrectSound();

                                                            setCards(prevCards => {
                                                                return prevCards.map(card => {
                                                                    if (card.id === currentCard.id) {
                                                                        const updatedCard = { ...card };
                                                                        if (cardReviewType === 'back') {
                                                                            updatedCard.correctStreak_back = 0;
                                                                        } else if (cardReviewType === 'synonym') {
                                                                            updatedCard.correctStreak_synonym = 0;
                                                                        } else if (cardReviewType === 'example') {
                                                                            updatedCard.correctStreak_example = 0;
                                                                        }
                                                                        return updatedCard;
                                                                    }
                                                                    return card;
                                                                });
                                                            });

                                                            try {
                                                                const action = reviewMode === 'synonym' ? 'synonym_practice' : 'review';
                                                                await onUpdateCard(currentCard.id, false, cardReviewType, action, getResponseTime());
                                                            } catch (error) {
                                                                console.error('Error updating card:', error);
                                                            }
                                                        }

                                                        setIsRevealed(true);
                                                        if (isCorrect) {
                                                            // Fire-and-forget audio, then auto-advance
                                                            if (reviewAudioEnabled) {
                                                                speakJapanese(currentCard.front, currentCard.audioBase64, onSaveCardAudio ? (b64, vid) => onSaveCardAudio(currentCard.id, b64, vid) : null)
                                                                    .catch(e => console.warn('⚠️ Audio error:', e.message));
                                                            }
                                                            await new Promise(resolve => setTimeout(resolve, 700));
                                                            await moveToNextCard(true);
                                                        } else {
                                                            // Fire-and-forget audio for incorrect answer
                                                            if (reviewAudioEnabled) {
                                                                setTimeout(() => {
                                                                    speakJapanese(currentCard.front, currentCard.audioBase64, onSaveCardAudio ? (b64, vid) => onSaveCardAudio(currentCard.id, b64, vid) : null)
                                                                        .catch(e => console.warn('⚠️ Audio error:', e.message));
                                                                }, 500);
                                                            }
                                                            isProcessingRef.current = false;
                                                            setIsProcessing(false);
                                                        }
                                                    } catch (error) {
                                                        console.error('Error in MC handler:', error);
                                                        // Reset state to allow retry
                                                        setIsProcessing(false);
                                                        setIsRevealed(false);
                                                        setFeedback(null);
                                                        setSelectedAnswer(null);
                                                    }
                                                }}
                                                className={buttonClass}
                                            >
                                                <span className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-white/20 text-xs font-bold flex-shrink-0 select-none">{index + 1}</span>
                                                <span className="font-japanese"><FuriganaText text={option} forceHide={cardReviewType === 'synonym' ? !synonymFuriganaEnabled : (cardReviewType === 'example' ? !exampleFuriganaEnabled : false)} /></span>
                                            </div>
                                        );
                                    })}
                                </div>
                                <p className="text-[10px] text-gray-400 dark:text-gray-500 text-center mt-1 opacity-70">⌨️ Nhấn phím 1-4 để chọn nhanh</p>
                            </div>
                        )}

                        {/* Flashcard Mode Navigation */}
                        {reviewMode === 'flashcard' && (
                            <div className="flex gap-2 md:gap-4">
                                <button
                                    onClick={moveToPreviousCard}
                                    disabled={isProcessing || currentIndex === 0}
                                    className={`px-3 md:px-4 py-2 md:py-3 text-sm md:text-base font-bold rounded-lg md:rounded-xl transition-all shadow-md ${isProcessing || currentIndex === 0
                                        ? 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                                        : 'bg-gray-500 dark:bg-gray-600 text-white hover:bg-gray-600 dark:hover:bg-gray-700 hover:shadow-lg hover:scale-105'
                                        }`}
                                    title="Thẻ trước (←)"
                                >
                                    ←
                                </button>
                                <button
                                    onClick={() => {
                                        if (currentIndex < cards.length - 1) {
                                            setSlideDirection('left');
                                            setTimeout(() => {
                                                setIsFlipped(false);
                                                setIsAnimatingFlip(false);
                                                setCurrentIndex(currentIndex + 1);
                                                setSlideDirection('right');
                                                setTimeout(() => {
                                                    setSlideDirection('');
                                                    setTimeout(() => {
                                                        setIsAnimatingFlip(true);
                                                    }, 110);
                                                }, 20);
                                            }, 70);
                                        } else {
                                            handleCompleteReview();
                                        }
                                    }}
                                    disabled={isProcessing}
                                    className={`flex-1 px-4 md:px-6 py-2 md:py-3 text-sm md:text-base font-bold rounded-lg md:rounded-xl transition-all shadow-md ${isProcessing
                                        ? 'bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-500 cursor-not-allowed'
                                        : 'bg-gradient-to-r from-indigo-500 to-sky-500 dark:from-indigo-600 dark:to-sky-600 text-white hover:shadow-lg hover:scale-105'
                                        }`}
                                    title="Thẻ tiếp theo (→)"
                                >
                                    {currentIndex < cards.length - 1 ? 'Thẻ tiếp theo →' : 'Hoàn thành'}
                                </button>
                            </div>
                        )}

                        {/* Typing Mode UI */}
                        {(cardReviewType === 'back' || cardReviewType === 'dictation' || cardReviewType === 'example') && reviewMode !== 'flashcard' && !isMultipleChoice && (
                            <div className="space-y-3">
                                {/* Hint Display - Only for reading mode (back), show hiragana */}
                                {!isRevealed && inputMode === 'reading' && cardReviewType === 'back' && (
                                    <div className="flex justify-center gap-1.5">
                                        {(() => {
                                            // Extract hiragana reading for hint
                                            const hiraganaMatch = currentCard.front.match(/[（(]([^）)]+)[）)]/);
                                            const reading = hiraganaMatch ? hiraganaMatch[1] : currentCard.front.split('（')[0].split('(')[0];
                                            const maxHint = Math.ceil(reading.length / 2); // Max half the characters
                                            return reading.split('').map((char, idx) => (
                                                <span
                                                    key={idx}
                                                    className={`inline-block w-7 h-9 leading-9 text-center text-base font-bold border-b-2 font-japanese ${idx < hintCount && idx < maxHint
                                                        ? 'text-cyan-300 border-cyan-400'
                                                        : 'text-gray-400 dark:text-gray-500 border-gray-300 dark:border-gray-600'
                                                        }`}
                                                >
                                                    {idx < hintCount && idx < maxHint ? char : '_'}
                                                </span>
                                            ));
                                        })()}
                                    </div>
                                )}

                                {/* Input Section */}
                                <input
                                    ref={inputRef}
                                    type="text"
                                    inputMode="text"
                                    autoComplete="off"
                                    autoCapitalize="off"
                                    autoCorrect="off"
                                    spellCheck="false"
                                    value={inputValue}
                                    onChange={(e) => setInputValue(e.target.value)}
                                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); needsRetype ? handleRetypeSubmit() : (isRevealed ? handleNext() : checkAnswer()); } }}
                                    onFocus={(e) => {
                                        if (window.innerWidth <= 768) {
                                            setTimeout(() => {
                                                e.target.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
                                            }, 300);
                                        }
                                    }}
                                    disabled={feedback === 'correct' && !needsRetype}
                                    className={`w-full px-6 py-4.5 text-xl md:text-2xl rounded-2xl border-2 transition-all outline-none shadow-lg focus:ring-4 focus:ring-indigo-500/20
                                ${(inputMode === 'reading' || cardReviewType === 'dictation' || cardReviewType === 'example') ? 'font-japanese font-bold' : 'font-semibold'}
                                ${needsRetype
                                            ? 'border-orange-400 bg-orange-50 dark:bg-orange-900/20 text-orange-900 dark:text-orange-100 focus:border-orange-500 focus:ring-orange-500/20'
                                            : feedback === 'correct'
                                                ? 'border-green-400 bg-green-50 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                                                : feedback === 'incorrect'
                                                    ? 'border-red-400 bg-red-50 dark:bg-red-900/30 text-red-800 dark:text-red-300'
                                                    : 'border-gray-300 dark:border-gray-600 bg-gray-800 text-white focus:border-indigo-500'}`}
                                    placeholder={needsRetype ? 'Nhập lại đáp án đúng để tiếp tục...' : (cardReviewType === 'example' ? 'Nhập từ còn thiếu bằng tiếng Nhật...' : (cardReviewType === 'dictation' ? 'Nhập từ vựng bạn nghe được...' : (inputMode === 'reading' ? 'Nhập từ vựng tiếng Nhật...' : 'Nhập ý nghĩa tiếng Việt...')))}
                                />

                                {/* Hint button and Check button row */}
                                {needsRetype ? (
                                    <div className="flex flex-col gap-2">
                                        <p className="text-xs font-bold text-orange-500 dark:text-orange-400 text-center">✏️ Nhập lại đáp án đúng để tiếp tục</p>
                                        <button
                                            onClick={handleRetypeSubmit}
                                            disabled={!inputValue.trim() || isProcessing}
                                            className="w-full flex items-center justify-center gap-2 px-6 py-4.5 text-lg md:text-xl bg-orange-500 hover:bg-orange-600 text-white rounded-2xl font-bold shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.98]"
                                        >
                                            <Check className="w-5 h-5" />
                                            <span>Xác nhận đáp án đúng</span>
                                        </button>
                                    </div>
                                ) : !isRevealed && (
                                    <div className="flex gap-3">
                                        {/* Hint button - Only for reading mode (back) */}
                                        {inputMode === 'reading' && cardReviewType === 'back' && (
                                            <button
                                                onClick={() => {
                                                    const hiraganaMatch = currentCard.front.match(/[（(]([^）)]+)[）)]/);
                                                    const reading = hiraganaMatch ? hiraganaMatch[1] : currentCard.front.split('（')[0].split('(')[0];
                                                    const maxHint = Math.ceil(reading.length / 2);
                                                    if (hintCount < maxHint) {
                                                        setHintCount(prev => prev + 1);
                                                    }
                                                }}
                                                disabled={(() => {
                                                    const hiraganaMatch = currentCard.front.match(/[（(]([^）)]+)[）)]/);
                                                    const reading = hiraganaMatch ? hiraganaMatch[1] : currentCard.front.split('（')[0].split('(')[0];
                                                    const maxHint = Math.ceil(reading.length / 2);
                                                    return hintCount >= maxHint;
                                                })()}
                                                className="flex items-center gap-2 px-5 py-4.5 text-base md:text-lg bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-650 text-gray-700 dark:text-gray-200 rounded-2xl font-semibold hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                            >
                                                <Lightbulb className="w-5 h-5" />
                                                <span>Gợi ý ({hintCount}/{(() => {
                                                    const hiraganaMatch = currentCard.front.match(/[（(]([^）)]+)[）)]/);
                                                    const reading = hiraganaMatch ? hiraganaMatch[1] : currentCard.front.split('（')[0].split('(')[0];
                                                    return Math.ceil(reading.length / 2);
                                                })()})</span>
                                            </button>
                                        )}
                                        <button
                                            onClick={checkAnswer}
                                            disabled={!inputValue.trim() || isProcessing}
                                            className="flex-1 flex items-center justify-center gap-2 px-6 py-4.5 text-lg md:text-xl bg-orange-500 hover:bg-orange-600 text-white rounded-2xl font-bold shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.98]"
                                        >
                                            <Check className="w-5 h-5" />
                                            <span>Kiểm tra</span>
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Feedback & Actions */}
                        {reviewMode !== 'flashcard' && (
                            <div className="space-y-2 md:space-y-3">
                                <div className={`transition-all duration-300 ease-out overflow-hidden ${isRevealed ? 'max-h-[120px] md:max-h-40 opacity-100' : 'max-h-0 opacity-0'}`}>
                                    <div className={`p-3 md:p-5 rounded-xl md:rounded-2xl border flex items-start gap-2 md:gap-4 overflow-y-auto max-h-[120px] md:max-h-40 ${feedback === 'correct' ? 'bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-800' : feedback === 'incorrect' ? 'bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-800' : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700'}`}>
                                        {(cardReviewType === 'back' || cardReviewType === 'dictation' || cardReviewType === 'example') && reviewMode !== 'flashcard' && !isMultipleChoice && (
                                            <div className={`p-1.5 md:p-2 rounded-full flex-shrink-0 ${feedback === 'correct' ? 'bg-green-200 dark:bg-green-800 text-green-700 dark:text-green-300' : 'bg-red-200 dark:bg-red-800 text-red-700 dark:text-red-300'}`}>
                                                {feedback === 'correct' ? <Check className="w-4 h-4 md:w-5 md:h-5" strokeWidth={3} /> : <X className="w-4 h-4 md:w-5 md:h-5" strokeWidth={3} />}
                                            </div>
                                        )}
                                        <div className="flex-1 min-w-0">
                                            {feedback === 'incorrect' ? (
                                                <div className="space-y-1 text-sm md:text-base">
                                                    <p className="font-extrabold text-base md:text-lg text-red-800 dark:text-red-300">✗ Chưa đúng!</p>
                                                    <div className="space-y-1 border-t border-red-200/50 dark:border-red-800/40 pt-1.5 mt-1">
                                                        <p className="text-red-800 dark:text-red-300">
                                                            Từ vựng: <span className="font-japanese font-bold text-base md:text-lg"><FuriganaText text={currentCard.frontWithFurigana || currentCard.front} /></span>
                                                            {currentCard.sinoVietnamese && <span className="text-yellow-600 dark:text-yellow-400 font-medium ml-1">({currentCard.sinoVietnamese})</span>}
                                                        </p>
                                                        <p className="text-red-800 dark:text-red-300">
                                                            Ý nghĩa: <span className="font-semibold">{currentCard.back}</span>
                                                        </p>
                                                        {currentCard.synonym && cardReviewType === 'synonym' && (
                                                            <p className="text-red-800 dark:text-red-300">
                                                                Đồng nghĩa đúng: <span className="font-japanese font-semibold"><FuriganaText text={currentCard.synonym} /></span>
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                            ) : (
                                                <div>
                                                    <p className={`font-extrabold text-lg md:text-2xl ${feedback === 'correct' ? 'text-green-800 dark:text-green-300' : 'text-red-800 dark:text-red-300'}`}>{message}</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {feedback === 'incorrect' && !needsRetype && (
                                        <button
                                            onClick={handleNext}
                                            disabled={isProcessing}
                                            className="w-full mt-3 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition-all shadow-md active:scale-95"
                                        >
                                            Bỏ qua → Câu tiếp theo
                                        </button>
                                    )}
                                </div>

                            </div>
                        )}
                    </div>
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

                        {/* Test format / Language direction / Toggle options depending on active mode */}
                        {reviewMode === 'meaning_input' && (
                            <div className="space-y-4">
                                <div>
                                    <label className="text-sm font-bold text-gray-600 dark:text-gray-300 block mb-3">Ngôn ngữ câu trả lời</label>
                                    <div className="grid grid-cols-2 gap-3">
                                        <button
                                            onClick={() => {
                                                setInputMode('meaning');
                                                localStorage.setItem('meaning_input_lang', 'vi');
                                                setInputValue('');
                                                setHintCount(0);
                                            }}
                                            className={`py-3 rounded-xl text-sm font-bold transition-all border-2 ${inputMode === 'meaning'
                                                ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-300 border-indigo-400'
                                                : 'bg-gray-50 dark:bg-slate-700 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-slate-650 hover:border-gray-300 dark:hover:border-slate-500'
                                                }`}
                                        >
                                            🇻🇳 Tiếng Việt
                                        </button>
                                        <button
                                            onClick={() => {
                                                setInputMode('reading');
                                                localStorage.setItem('meaning_input_lang', 'ja');
                                                setInputValue('');
                                                setHintCount(0);
                                            }}
                                            className={`py-3 rounded-xl text-sm font-bold transition-all border-2 ${inputMode === 'reading'
                                                ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-300 border-indigo-400'
                                                : 'bg-gray-50 dark:bg-slate-700 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-slate-650 hover:border-gray-300 dark:hover:border-slate-500'
                                                }`}
                                        >
                                            🇯🇵 Tiếng Nhật
                                        </button>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between border-t border-gray-100 dark:border-slate-700 pt-3">
                                    <span className="text-sm font-bold text-gray-600 dark:text-gray-300">Bật Furigana</span>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={meaningFuriganaEnabled}
                                            onChange={(e) => {
                                                setMeaningFuriganaEnabled(e.target.checked);
                                                localStorage.setItem('meaning_furigana_enabled', e.target.checked);
                                            }}
                                            className="sr-only peer"
                                        />
                                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-650 peer-checked:bg-indigo-600"></div>
                                    </label>
                                </div>

                                <div className="flex items-center justify-between border-t border-gray-100 dark:border-slate-700 pt-3">
                                    <span className="text-sm font-bold text-gray-600 dark:text-gray-300">Hiện âm Hán Việt</span>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={meaningHanvietEnabled}
                                            onChange={(e) => {
                                                setMeaningHanvietEnabled(e.target.checked);
                                                localStorage.setItem('meaning_hanviet_enabled', e.target.checked);
                                            }}
                                            className="sr-only peer"
                                        />
                                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-650 peer-checked:bg-indigo-600"></div>
                                    </label>
                                </div>
                            </div>
                        )}

                        {cardReviewType === 'synonym' && (
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
                        )}

                        {cardReviewType === 'example' && (
                            <div className="space-y-4">
                                <div>
                                    <label className="text-sm font-bold text-gray-600 dark:text-gray-300 block mb-3">Hình thức kiểm tra</label>
                                    <div className="grid grid-cols-2 gap-3">
                                        <button
                                            onClick={() => {
                                                setExampleTestFormat('multipleChoice');
                                                localStorage.setItem('example_test_format', 'multipleChoice');
                                            }}
                                            className={`py-3 rounded-xl text-sm font-bold transition-all border-2 ${exampleTestFormat === 'multipleChoice'
                                                ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-300 border-indigo-400'
                                                : 'bg-gray-50 dark:bg-slate-700 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-slate-650 hover:border-gray-300 dark:hover:border-slate-500'
                                                }`}
                                        >
                                            📝 Trắc nghiệm
                                        </button>
                                        <button
                                            onClick={() => {
                                                setExampleTestFormat('written');
                                                localStorage.setItem('example_test_format', 'written');
                                            }}
                                            className={`py-3 rounded-xl text-sm font-bold transition-all border-2 ${exampleTestFormat === 'written'
                                                ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-300 border-indigo-400'
                                                : 'bg-gray-50 dark:bg-slate-700 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-slate-650 hover:border-gray-300 dark:hover:border-slate-500'
                                                }`}
                                        >
                                            ✏️ Tự luận
                                        </button>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between border-t border-gray-100 dark:border-slate-700 pt-3">
                                    <span className="text-sm font-bold text-gray-600 dark:text-gray-300">Bật Furigana</span>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={exampleFuriganaEnabled}
                                            onChange={(e) => {
                                                setExampleFuriganaEnabled(e.target.checked);
                                                localStorage.setItem('example_furigana_enabled', e.target.checked);
                                            }}
                                            className="sr-only peer"
                                        />
                                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-650 peer-checked:bg-indigo-600"></div>
                                    </label>
                                </div>

                                <div className="flex items-center justify-between border-t border-gray-100 dark:border-slate-700 pt-3">
                                    <span className="text-sm font-bold text-gray-600 dark:text-gray-300">Hiện câu tiếng Việt</span>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={exampleVietnameseEnabled}
                                            onChange={(e) => {
                                                setExampleVietnameseEnabled(e.target.checked);
                                                localStorage.setItem('example_vietnamese_enabled', e.target.checked);
                                            }}
                                            className="sr-only peer"
                                        />
                                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-650 peer-checked:bg-indigo-600"></div>
                                    </label>
                                </div>
                            </div>
                        )}

                        {!['synonym', 'example'].includes(cardReviewType) && reviewMode !== 'meaning_input' && (
                            <div>
                                <label className="text-sm font-bold text-gray-600 dark:text-gray-300 block mb-3">Hình thức kiểm tra ý nghĩa</label>
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        onClick={() => { setReviewTestFormat('multipleChoice'); localStorage.setItem('review_test_format', 'multipleChoice'); }}
                                        className={`py-3 rounded-xl text-sm font-bold transition-all border-2 ${reviewTestFormat === 'multipleChoice'
                                            ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-300 border-indigo-400'
                                            : 'bg-gray-50 dark:bg-slate-700 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-slate-650 hover:border-gray-300 dark:hover:border-slate-500'
                                            }`}
                                    >
                                        📝 Trắc nghiệm
                                    </button>
                                    <button
                                        onClick={() => { setReviewTestFormat('written'); localStorage.setItem('review_test_format', 'written'); }}
                                        className={`py-3 rounded-xl text-sm font-bold transition-all border-2 ${reviewTestFormat === 'written'
                                            ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-300 border-indigo-400'
                                            : 'bg-gray-50 dark:bg-slate-700 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-slate-650 hover:border-gray-300 dark:hover:border-slate-500'
                                            }`}
                                    >
                                        ✏️ Tự luận
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Global audio toggle */}
                        <div className="flex items-center justify-between border-t border-gray-100 dark:border-slate-700 pt-3">
                            <span className="text-sm font-bold text-gray-600 dark:text-gray-300">Phát âm thanh từ vựng</span>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={reviewAudioEnabled}
                                    onChange={(e) => {
                                        setReviewAudioEnabled(e.target.checked);
                                        localStorage.setItem('review_audio_enabled', String(e.target.checked));
                                    }}
                                    className="sr-only peer"
                                />
                                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-650 peer-checked:bg-indigo-600"></div>
                            </label>
                        </div>

                        {/* Close button */}
                        <button
                            onClick={() => setShowSettings(false)}
                            className="w-full py-2.5 bg-indigo-500 hover:bg-indigo-600 text-white font-bold rounded-xl transition-all text-sm mt-2"
                        >
                            Xong
                        </button>
                    </div>
                </div>,
                document.body
            )}

            {/* Flashcard Settings Modal */}
            {showSettingsMenu && createPortal(
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" onClick={() => setShowSettingsMenu(false)}>
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"></div>
                    <div className="relative bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-sm p-6 space-y-4 border border-gray-200 dark:border-slate-700/80 animate-fade-in text-slate-850 dark:text-slate-200" onClick={e => e.stopPropagation()}>
                        <h4 className="font-extrabold text-lg border-b border-gray-150 dark:border-slate-700 pb-2.5 mb-3">Cấu hình thẻ ghi nhớ</h4>
                        <div className="space-y-4 text-xs font-semibold text-slate-600 dark:text-slate-300">
                            <div className="flex items-center justify-between border-b border-gray-150/40 dark:border-slate-700 pb-3 mb-2">
                                <span className="text-indigo-650 dark:text-indigo-400 font-bold">Đổi mặt trước/mặt sau</span>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input type="checkbox" checked={cardSettings.swapSides} onChange={(e) => setCardSettings(prev => ({ ...prev, swapSides: e.target.checked }))} className="sr-only peer" />
                                    <div className="w-9 h-5 bg-gray-200 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                                </label>
                            </div>
                            <div className="flex items-center justify-between border-b border-gray-150/40 dark:border-slate-700 pb-3 mb-2">
                                <span className="text-indigo-650 dark:text-indigo-400 font-bold">Phát âm thanh từ vựng</span>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input type="checkbox" checked={cardSettings.audioEnabled !== false} onChange={(e) => setCardSettings(prev => ({ ...prev, audioEnabled: e.target.checked }))} className="sr-only peer" />
                                    <div className="w-9 h-5 bg-gray-200 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                                </label>
                            </div>
                            <div className="flex items-center justify-between border-b border-gray-150/40 dark:border-slate-700 pb-3 mb-2">
                                <span className="text-indigo-650 dark:text-indigo-400 font-bold">Tự động phát âm thanh khi lật</span>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input type="checkbox" checked={cardSettings.autoPlayAudio} onChange={(e) => setCardSettings(prev => ({ ...prev, autoPlayAudio: e.target.checked }))} className="sr-only peer" />
                                    <div className="w-9 h-5 bg-gray-200 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                                </label>
                            </div>
                            <div>
                                <p className="text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2 text-[10px]">Mặt tiếng Nhật hiển thị:</p>
                                <div className="space-y-2.5 pl-1 text-[13px]">
                                    <label className="flex items-center gap-2.5 cursor-pointer"><input type="checkbox" checked={cardSettings.front.word} onChange={(e) => setCardSettings(prev => ({ ...prev, front: { ...prev.front, word: e.target.checked } }))} className="rounded border-gray-300 dark:border-slate-650 text-indigo-650 dark:text-indigo-400 focus:ring-indigo-550 w-4 h-4" /><span>Chữ Hán / Từ vựng</span></label>
                                    <label className="flex items-center gap-2.5 cursor-pointer"><input type="checkbox" checked={cardSettings.front.furigana} onChange={(e) => setCardSettings(prev => ({ ...prev, front: { ...prev.front, furigana: e.target.checked } }))} className="rounded border-gray-300 dark:border-slate-650 text-indigo-650 dark:text-indigo-400 focus:ring-indigo-550 w-4 h-4" /><span>Phiên âm Furigana</span></label>
                                    <label className="flex items-center gap-2.5 cursor-pointer"><input type="checkbox" checked={cardSettings.front.hanviet} onChange={(e) => setCardSettings(prev => ({ ...prev, front: { ...prev.front, hanviet: e.target.checked } }))} className="rounded border-gray-300 dark:border-slate-650 text-indigo-650 dark:text-indigo-400 focus:ring-indigo-550 w-4 h-4" /><span>Âm Hán Việt</span></label>
                                </div>
                            </div>
                            <div>
                                <p className="text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2 text-[10px]">Mặt nghĩa dịch hiển thị:</p>
                                <div className="space-y-2.5 pl-1 text-[13px]">
                                    <label className="flex items-center gap-2.5 cursor-pointer"><input type="checkbox" checked={cardSettings.back.meaning} onChange={(e) => setCardSettings(prev => ({ ...prev, back: { ...prev.back, meaning: e.target.checked } }))} className="rounded border-gray-300 dark:border-slate-650 text-indigo-650 dark:text-indigo-400 focus:ring-indigo-550 w-4 h-4" /><span>Nghĩa tiếng Việt</span></label>
                                    <label className="flex items-center gap-2.5 cursor-pointer"><input type="checkbox" checked={cardSettings.back.reading} onChange={(e) => setCardSettings(prev => ({ ...prev, back: { ...prev.back, reading: e.target.checked } }))} className="rounded border-gray-300 dark:border-slate-650 text-indigo-650 dark:text-indigo-400 focus:ring-indigo-550 w-4 h-4" /><span>Cách đọc (Hiragana)</span></label>
                                    <label className="flex items-center gap-2.5 cursor-pointer"><input type="checkbox" checked={cardSettings.back.hanviet} onChange={(e) => setCardSettings(prev => ({ ...prev, back: { ...prev.back, hanviet: e.target.checked } }))} className="rounded border-gray-300 dark:border-slate-650 text-indigo-650 dark:text-indigo-400 focus:ring-indigo-550 w-4 h-4" /><span>Âm Hán Việt</span></label>
                                    <label className="flex items-center gap-2.5 cursor-pointer"><input type="checkbox" checked={cardSettings.back.synonym} onChange={(e) => setCardSettings(prev => ({ ...prev, back: { ...prev.back, synonym: e.target.checked } }))} className="rounded border-gray-300 dark:border-slate-650 text-indigo-650 dark:text-indigo-400 focus:ring-indigo-550 w-4 h-4" /><span>Đồng nghĩa</span></label>
                                    {cardSettings.back.synonym && (
                                        <div className="pl-6 space-y-2 border-l border-gray-200 dark:border-slate-700 mt-1">
                                            <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={cardSettings.back.synonymFurigana !== false} onChange={(e) => setCardSettings(prev => ({ ...prev, back: { ...prev.back, synonymFurigana: e.target.checked } }))} className="rounded border-gray-300 dark:border-slate-650 text-indigo-650 dark:text-indigo-400 focus:ring-indigo-550 w-4 h-4" /><span className="text-gray-500 dark:text-gray-400">Furigana đồng nghĩa</span></label>
                                        </div>
                                    )}
                                    <label className="flex items-center gap-2.5 cursor-pointer"><input type="checkbox" checked={cardSettings.back.example} onChange={(e) => setCardSettings(prev => ({ ...prev, back: { ...prev.back, example: e.target.checked } }))} className="rounded border-gray-300 dark:border-slate-650 text-indigo-650 dark:text-indigo-400 focus:ring-indigo-550 w-4 h-4" /><span>Ví dụ</span></label>
                                    {cardSettings.back.example && (
                                        <div className="pl-6 space-y-2 border-l border-gray-200 dark:border-slate-700 mt-1">
                                            <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={cardSettings.back.exampleFurigana !== false} onChange={(e) => setCardSettings(prev => ({ ...prev, back: { ...prev.back, exampleFurigana: e.target.checked } }))} className="rounded border-gray-300 dark:border-slate-650 text-indigo-650 dark:text-indigo-400 focus:ring-indigo-550 w-4 h-4" /><span className="text-gray-500 dark:text-gray-400">Furigana ví dụ</span></label>
                                            <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={cardSettings.back.exampleMeaning !== false} onChange={(e) => setCardSettings(prev => ({ ...prev, back: { ...prev.back, exampleMeaning: e.target.checked } }))} className="rounded border-gray-300 dark:border-slate-650 text-indigo-650 dark:text-indigo-400 focus:ring-indigo-550 w-4 h-4" /><span className="text-gray-500 dark:text-gray-400">Dịch câu ví dụ</span></label>
                                        </div>
                                    )}
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

export const ReviewCompleteScreen = ({ onBack, allCards }) => {
    const [cycleText, setCycleText] = useState('⏳ Đang tính toán chu kì...');
    const [showCycle, setShowCycle] = useState(false);

    useEffect(() => {
        launchFanfare();

        // Hiển thị thời gian ôn tập tiếp theo sau 1.5 giây
        const timer = setTimeout(() => {
            if (allCards && allCards.length > 0) {
                const now = Date.now();
                const futureCards = allCards
                    .filter(c => c.intervalIndex_back >= 0 && c.nextReview_back && c.nextReview_back > now)
                    .sort((a, b) => a.nextReview_back - b.nextReview_back);

                if (futureCards.length > 0) {
                    const nextTime = futureCards[0].nextReview_back;
                    const diffMs = nextTime - now;
                    const diffMin = Math.floor(diffMs / 60000);
                    const diffHour = Math.floor(diffMin / 60);
                    const diffDay = Math.floor(diffHour / 24);

                    let timeText;
                    if (diffDay >= 1) {
                        timeText = `${diffDay} ngày`;
                    } else if (diffHour >= 1) {
                        timeText = `${diffHour} giờ ${diffMin % 60} phút`;
                    } else {
                        timeText = `${diffMin} phút`;
                    }
                    setCycleText(`✅ Bạn sẽ ôn tập lại sau ${timeText}. Hẹn gặp lại! 👋`);
                } else {
                    setCycleText('✅ Không còn thẻ nào đang chờ ôn tập.');
                }
            } else {
                setCycleText('✅ Hoàn thành!');
            }
            setShowCycle(true);
        }, 1500);

        // Tự động thoát sau 3 giây (3000ms)
        const exitTimer = setTimeout(() => {
            onBack();
        }, 3000);

        return () => {
            clearTimeout(timer);
            clearTimeout(exitTimer);
        };
    }, [allCards, onBack]);

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                onBack();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onBack]);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm animate-fade-in">
            <div className="flex flex-col items-center justify-center text-center space-y-6 p-6 max-w-md">
                <div className="w-28 h-28 bg-gradient-to-br from-emerald-100 to-green-200 dark:from-emerald-900/30 dark:to-green-900/30 rounded-full flex items-center justify-center mb-2 shadow-inner">
                    <div className="w-20 h-20 bg-gradient-to-br from-emerald-400 to-green-500 rounded-full flex items-center justify-center shadow-lg shadow-green-200 dark:shadow-green-900/50 animate-bounce">
                        <Check className="w-10 h-10 text-white" strokeWidth={4} />
                    </div>
                </div>
                <div>
                    <h2 className="text-4xl font-black text-gray-800 dark:text-gray-100 mb-3">🎊 Tuyệt vời! 🎊</h2>
                    <p className="text-gray-500 dark:text-gray-400 font-medium text-lg">Bạn đã hoàn thành phiên ôn tập này.</p>
                    <div className={`mt-3 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-500 ${showCycle
                        ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-700'
                        : 'bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 animate-pulse'
                        }`}>
                        {cycleText}
                    </div>
                </div>
                <div className="flex gap-3">
                    <button onClick={onBack} className="px-8 py-3 bg-gradient-to-r from-indigo-600 to-sky-500 dark:from-indigo-500 dark:to-sky-500 text-white font-bold rounded-xl shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all">
                        Quay lại Ôn tập
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ReviewScreen;
