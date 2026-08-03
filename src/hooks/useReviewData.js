import { useState, useEffect, useRef, useCallback } from 'react';
import { getAuth } from 'firebase/auth';
import { MessageSquare, FileText, Headphones, Repeat2 } from 'lucide-react';
import { speakJapanese } from '../utils/audio';
import {
    shuffleArray,
    getWordForMasking,
    getReadingForMasking,
    maskWordInExample,
    isMobileDevice
} from '../utils/textProcessing';
import { flashCorrect, launchFanfare, celebrateCorrectAnswer } from '../utils/celebrations';
import { playCorrectSound, playIncorrectSound } from '../utils/soundEffects';
import { saveStudyProgress } from '../utils/studyProgressService';
import { useTargetLanguage } from '../context/TargetLanguageContext';
import { DEFAULT_CARD_SETTINGS, formatMultipleMeanings } from '../components/review/reviewHelpers';

export const useReviewData = ({
    cards: initialCards,
    reviewMode,
    allCards,
    setId,
    onUpdateCard,
    onCompleteReview,
    onSaveCardAudio,
    onBack,
    awardXP
}) => {
    const { isEnglishMode } = useTargetLanguage();

    // Load saved progress from localStorage
    const getSavedProgress = () => {
        if (!setId || !reviewMode) return null;
        try {
            const key = `study_progress_${setId}_${reviewMode}`;
            const saved = localStorage.getItem(key);
            if (saved) {
                const data = JSON.parse(saved);
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

    // Card Settings State
    const [cardSettings, setCardSettings] = useState(() => {
        try {
            const saved = localStorage.getItem('quizki_flashcard_settings_v2');
            if (saved) {
                const parsed = JSON.parse(saved);
                return {
                    ...DEFAULT_CARD_SETTINGS,
                    ...parsed,
                    front: { ...DEFAULT_CARD_SETTINGS.front, ...parsed.front },
                    back: { ...DEFAULT_CARD_SETTINGS.back, ...parsed.back },
                    autoPlayAudio: parsed.autoPlayAudio !== undefined ? parsed.autoPlayAudio : true,
                    audioEnabled: parsed.audioEnabled !== undefined ? parsed.audioEnabled : true
                };
            }
        } catch (e) { }
        return DEFAULT_CARD_SETTINGS;
    });

    const [showSettingsMenu, setShowSettingsMenu] = useState(false);
    const [showNuancePopup, setShowNuancePopup] = useState(false);

    useEffect(() => {
        localStorage.setItem('quizki_flashcard_settings_v2', JSON.stringify(cardSettings));
    }, [cardSettings]);

    useEffect(() => {
        setShowNuancePopup(false);
    }, [currentIndex, reviewMode]);

    // Preload adjacent cards' base64 images
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
    const [needsRetype, setNeedsRetype] = useState(false);
    const [hintCount, setHintCount] = useState(0);
    const [blurVietnamese, setBlurVietnamese] = useState(false);
    const [revealedMeanings, setRevealedMeanings] = useState(new Set());
    const [inputMode, setInputMode] = useState(() => {
        if (reviewMode === 'meaning_input') {
            const savedLang = localStorage.getItem('meaning_input_lang') || 'vi';
            return savedLang === 'vi' ? 'meaning' : 'reading';
        }
        return 'reading';
    });

    const inputRef = useRef(null);
    const isCompletingRef = useRef(false);
    const isProcessingRef = useRef(false);
    const handleNextRef = useRef(null);
    const failedCardsRef = useRef(failedCards);
    const sessionWrongCardIdsRef = useRef(new Set());
    const optionsRef = useRef({});
    const cardShownTimeRef = useRef(Date.now());
    const isMountedRef = useRef(true);
    const audioAbortRef = useRef(false);

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

    useEffect(() => {
        const saved = getSavedProgress();
        if (saved) return;
        setCards(initialCards);
        setCurrentIndex(0);
        setFailedCards(new Set());
        failedCardsRef.current = new Set();
        isCompletingRef.current = false;
    }, [initialCards]);

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

    useEffect(() => {
        failedCardsRef.current = failedCards;
    }, [failedCards]);

    const currentCard = cards.length > 0 && currentIndex < cards.length ? cards[currentIndex] : null;
    const _rawReviewType = currentCard ? (currentCard.reviewType || reviewMode) : null;
    const KNOWN_REVIEW_TYPES = ['back', 'synonym', 'example', 'dictation', 'flashcard'];
    const cardReviewType = _rawReviewType && KNOWN_REVIEW_TYPES.includes(_rawReviewType) ? _rawReviewType : (_rawReviewType ? 'back' : null);
    const isMultipleChoice = (cardReviewType === 'synonym' || (cardReviewType === 'example' && exampleTestFormat === 'multipleChoice') || (cardReviewType === 'back' && reviewTestFormat === 'multipleChoice')) && cardReviewType !== 'dictation';
    const currentCardId = currentCard?.id;

    useEffect(() => {
        if ((cardReviewType === 'back' || cardReviewType === 'dictation' || cardReviewType === 'example') && reviewMode !== 'flashcard' && !isMultipleChoice && inputRef.current && !isMobileDevice()) {
            const timer = setTimeout(() => {
                inputRef.current?.focus();
            }, reviewMode === 'flashcard' ? 450 : 100);
            return () => clearTimeout(timer);
        }
    }, [currentIndex, isRevealed, cardReviewType, reviewMode, isMultipleChoice]);

    useEffect(() => {
        if (cards.length > 0 && currentIndex >= cards.length) {
            setCurrentIndex(cards.length - 1);
        }
    }, [cards.length]);

    useEffect(() => {
        setIsFlipped(false);
        setSlideDirection('');
        setSelectedAnswer(null);
        setMultipleChoiceOptions([]);
        setSwipeOffset(0);
        setHintCount(0);
        setRevealedMeanings(new Set());
        cardShownTimeRef.current = Date.now();

        const currentKeys = Object.keys(optionsRef.current);
        if (currentKeys.length > 10) {
            optionsRef.current = {};
        }

        let timeoutId;
        const card = cards[currentIndex];
        if (card && (card.reviewType === 'dictation' || reviewMode === 'dictation')) {
            if (reviewAudioEnabled) {
                timeoutId = setTimeout(() => {
                    speakJapanese(card.front, card.audioBase64, onSaveCardAudio ? (b64, vid) => onSaveCardAudio(card.id, b64, vid) : null, card.audioVoiceId);
                }, 300);
            }
        }

        return () => {
            if (timeoutId) clearTimeout(timeoutId);
        };
    }, [currentIndex, reviewAudioEnabled]);

    const getResponseTime = () => Date.now() - cardShownTimeRef.current;

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
                isProcessingRef.current = false;
                isCompletingRef.current = false;
                return;
            }
        }
        setShowComplete(true);
    }, [allCards]);

    // Keyboard handlers for flashcards
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
                        speakJapanese(currentCard.front, currentCard.audioBase64, onSaveCardAudio ? (b64, vid) => onSaveCardAudio(currentCard.id, b64, vid) : null, currentCard.audioVoiceId);
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
    }, [currentIndex, cards, reviewMode, handleCompleteReview, moveToPreviousCard, currentCard, cardSettings]);

    // MC shortcuts (1-4)
    useEffect(() => {
        if (!isMultipleChoice || isRevealed || isProcessing || feedback || multipleChoiceOptions.length === 0) return;

        const handleMCKeyDown = (e) => {
            if (e.repeat) return;
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
            const keyNum = parseInt(e.key);
            if (keyNum >= 1 && keyNum <= multipleChoiceOptions.length) {
                e.preventDefault();
                const buttons = document.querySelectorAll('[data-mc-option]');
                if (buttons[keyNum - 1]) buttons[keyNum - 1].click();
            }
        };

        window.addEventListener('keydown', handleMCKeyDown);
        return () => window.removeEventListener('keydown', handleMCKeyDown);
    }, [isMultipleChoice, isRevealed, isProcessing, feedback, multipleChoiceOptions]);

    const handleFlip = useCallback(() => {
        const newFlippedState = !isFlipped;
        setIsFlipped(newFlippedState);
        if (currentCard && cardSettings.autoPlayAudio && cardSettings.audioEnabled !== false) {
            if (newFlippedState) {
                speakJapanese(currentCard.front, currentCard.audioBase64, onSaveCardAudio ? (b64, vid) => onSaveCardAudio(currentCard.id, b64, vid) : null, currentCard.audioVoiceId);
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

    // Generate MC Options
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
                    self.findIndex(f => normalizeAnswer(f) === normalizeAnswer(front)) === index
                    && normalizeAnswer(front) !== normalizeAnswer(correctAnswer)
                );

            while (wrongOptions.length < 3) {
                wrongOptions.push(`(Lựa chọn ${wrongOptions.length + 1})`);
            }

            const options = [correctAnswer, ...wrongOptions];
            const shuffledOptions = shuffleArray(options);
            optionsRef.current[currentCardId] = shuffledOptions;
        }

        setMultipleChoiceOptions(optionsRef.current[currentCardId] || []);
    }, [currentCardId, isMultipleChoice, currentCard, allCards, cards, normalizeAnswer, reviewTestFormat]);

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

    useEffect(() => {
        if (showComplete) {
            launchFanfare();
        }
    }, [showComplete]);

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

    const displayFront = currentCard?.front || '';

    const getPrompt = () => {
        if (!currentCard) return { label: '', text: '', image: null, icon: Repeat2, color: 'text-emerald-600' };
        switch (cardReviewType) {
            case 'synonym':
                return { label: 'Từ đồng nghĩa', text: currentCard.synonym, image: currentCard.imageBase64, icon: MessageSquare, color: 'text-blue-600' };
            case 'example': {
                const wordToMask = getWordForMasking(currentCard.front);
                const readingForMask = getReadingForMasking(currentCard.front);
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

    const checkAnswer = async () => {
        if (isProcessingRef.current) return;
        isProcessingRef.current = true;

        const userAnswer = normalizeAnswer(inputValue);
        let isCorrect = false;

        if (inputMode === 'reading' || cardReviewType === 'dictation' || cardReviewType === 'example') {
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
            const normalizeVietnamese = (text) => text.toLowerCase().trim().replace(/\s+/g, ' ');
            const userAnswerNormalized = normalizeVietnamese(inputValue);

            const rawMeanings = currentCard.back.split(/[,;，；\n]/);
            const meanings = rawMeanings.map(m => normalizeVietnamese(m.replace(/^\d+\.\s*/, '').trim())).filter(m => m.length > 0);

            isCorrect = meanings.some(meaning => {
                if (!meaning) return false;
                if (userAnswerNormalized === meaning) return true;
                if (userAnswerNormalized.includes(meaning)) return true;
                if (userAnswerNormalized.length >= 3 && meaning.includes(userAnswerNormalized)) return true;
                return false;
            });

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
                if (awardXP) awardXP(15);
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

                if (reviewAudioEnabled) {
                    speakJapanese(currentCard.front, currentCard.audioBase64,
                        onSaveCardAudio && isMountedRef.current ? (b64, vid) => {
                            if (isMountedRef.current && !audioAbortRef.current && onSaveCardAudio) {
                                onSaveCardAudio(currentCard.id, b64, vid).catch(e => {
                                    console.warn('⚠️ Failed to persist audio:', e.message);
                                });
                            }
                        } : null,
                        currentCard.audioVoiceId
                    ).catch(e => console.warn('⚠️ Audio playback error (continuing):', e.message));
                }

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
                if ((cardReviewType === 'back' || cardReviewType === 'dictation' || cardReviewType === 'example') && !isMultipleChoice) {
                    setInputValue('');
                    setNeedsRetype(true);
                }
                playIncorrectSound();

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
                                } : null,
                                currentCard.audioVoiceId
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
            const action = reviewMode === 'synonym' ? 'synonym_practice' : 'review';
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
    handleNextRef.current = handleNext;

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
            await moveToNextCard(false);
        } else {
            setFeedback('incorrect');
            setMessage(`Chưa đúng! Hãy nhập: ${(inputMode === 'reading' || cardReviewType === 'dictation' || cardReviewType === 'example') ? displayFront : currentCard.back}`);
            setInputValue('');
            playIncorrectSound();
            isProcessingRef.current = false;
        }
    };

    const handleMultipleChoiceClick = async (option) => {
        if (isRevealed || isProcessing || feedback) return;
        setSelectedAnswer(option);

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
                if (reviewAudioEnabled) {
                    speakJapanese(currentCard.front, currentCard.audioBase64, onSaveCardAudio ? (b64, vid) => onSaveCardAudio(currentCard.id, b64, vid) : null, currentCard.audioVoiceId)
                        .catch(e => console.warn('⚠️ Audio error:', e.message));
                }
                await new Promise(resolve => setTimeout(resolve, 700));
                await moveToNextCard(true);
            } else {
                if (reviewAudioEnabled) {
                    setTimeout(() => {
                        speakJapanese(currentCard.front, currentCard.audioBase64, onSaveCardAudio ? (b64, vid) => onSaveCardAudio(currentCard.id, b64, vid) : null, currentCard.audioVoiceId)
                            .catch(e => console.warn('⚠️ Audio error:', e.message));
                    }, 500);
                }
                isProcessingRef.current = false;
                setIsProcessing(false);
            }
        } catch (error) {
            console.error('Error in MC handler:', error);
            setIsProcessing(false);
            setIsRevealed(false);
            setFeedback(null);
            setSelectedAnswer(null);
        }
    };

    const progress = Math.round(((currentIndex) / (cards.length || 1)) * 100);

    return {
        cards, setCards, currentIndex, setCurrentIndex, currentCard, cardReviewType,
        isMultipleChoice, displayFront, promptInfo, progress, inputValue, setInputValue,
        isRevealed, setIsRevealed, isLocked, setIsLocked, message, setMessage,
        feedback, setFeedback, isProcessing, setIsProcessing, isFlipped, setIsFlipped,
        isAnimatingFlip, setIsAnimatingFlip, slideDirection, setSlideDirection,
        cardSettings, setCardSettings, showSettingsMenu, setShowSettingsMenu,
        showNuancePopup, setShowNuancePopup, touchStart, touchEnd, swipeOffset,
        selectedAnswer, setSelectedAnswer, multipleChoiceOptions, setMultipleChoiceOptions,
        failedCards, setFailedCards, showComplete, setShowComplete, needsRetype, setNeedsRetype,
        hintCount, setHintCount, blurVietnamese, setBlurVietnamese, revealedMeanings, setRevealedMeanings,
        inputMode, setInputMode, inputRef, showSettings, setShowSettings, reviewAudioEnabled,
        setReviewAudioEnabled, exampleTestFormat, setExampleTestFormat, exampleFuriganaEnabled,
        setExampleFuriganaEnabled, exampleVietnameseEnabled, setExampleVietnameseEnabled,
        meaningFuriganaEnabled, setMeaningFuriganaEnabled, meaningHanvietEnabled,
        setMeaningHanvietEnabled, synonymFuriganaEnabled, setSynonymFuriganaEnabled,
        synonymVietnameseEnabled, setSynonymVietnameseEnabled, reviewTestFormat,
        setReviewTestFormat, isEnglishMode, handleFlip, onTouchStart, onTouchMove, onTouchEnd,
        moveToPreviousCard, handleCompleteReview, handleRestart, checkAnswer, moveToNextCard,
        handleNext, handleRetypeSubmit, handleMultipleChoiceClick
    };
};
