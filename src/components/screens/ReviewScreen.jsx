import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    Zap, RotateCw, MessageSquare, FileText, Repeat2, Send,
    ChevronRight, Check, X
} from 'lucide-react';
import { POS_TYPES, getPosLabel, getPosColor, getLevelColor } from '../../config/constants';
import { playAudio } from '../../utils/audio';
import {
    shuffleArray,
    getWordForMasking,
    maskWordInExample,
    buildAdjNaAcceptedAnswers
} from '../../utils/textProcessing';

// Helper function to detect mobile devices
const isMobileDevice = () => {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth <= 768;
};

const ReviewScreen = ({
    cards: initialCards,
    reviewMode,
    allCards,
    onUpdateCard,
    onCompleteReview,
    vocabCollectionPath
}) => {
    const [cards, setCards] = useState(initialCards);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [inputValue, setInputValue] = useState('');
    const [isRevealed, setIsRevealed] = useState(false);
    const [isLocked, setIsLocked] = useState(false);
    const [message, setMessage] = useState('');
    const [feedback, setFeedback] = useState(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isFlipped, setIsFlipped] = useState(false);
    const [slideDirection, setSlideDirection] = useState('');
    const [touchStart, setTouchStart] = useState(null);
    const [touchEnd, setTouchEnd] = useState(null);
    const [swipeOffset, setSwipeOffset] = useState(0);
    const [selectedAnswer, setSelectedAnswer] = useState(null);
    const [multipleChoiceOptions, setMultipleChoiceOptions] = useState([]);
    const [failedCards, setFailedCards] = useState(new Set());
    const inputRef = useRef(null);
    const isCompletingRef = useRef(false);
    const failedCardsRef = useRef(failedCards);
    const optionsRef = useRef({});

    // Update cards when initialCards change
    useEffect(() => {
        setCards(initialCards);
        setCurrentIndex(0);
        setFailedCards(new Set());
        failedCardsRef.current = new Set();
        isCompletingRef.current = false;
    }, [initialCards]);

    // Update ref when failedCards change
    useEffect(() => {
        failedCardsRef.current = failedCards;
    }, [failedCards]);

    // Get current card safely
    const currentCard = cards.length > 0 && currentIndex < cards.length ? cards[currentIndex] : null;
    const cardReviewType = currentCard ? (currentCard.reviewType || reviewMode) : null;
    const isMultipleChoice = cardReviewType === 'synonym' || cardReviewType === 'example';
    const currentCardId = currentCard?.id;

    // Auto focus logic
    useEffect(() => {
        if (cardReviewType === 'back' && reviewMode !== 'flashcard' && !isMultipleChoice && inputRef.current && !isRevealed && !isMobileDevice()) {
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
    }, [currentIndex]);

    // Normalize answer function
    const normalizeAnswer = useCallback((text) => {
        return text.replace(/（[^）]*）/g, '').replace(/\([^)]*\)/g, '').replace(/\s+/g, '').toLowerCase();
    }, []);

    // Move to previous card
    const moveToPreviousCard = useCallback(() => {
        if (currentIndex > 0 && !isProcessing) {
            if (reviewMode === 'flashcard') {
                setSlideDirection('right');
                setTimeout(() => {
                    setCurrentIndex(currentIndex - 1);
                    setInputValue('');
                    setIsRevealed(false);
                    setIsLocked(false);
                    setFeedback(null);
                    setMessage('');
                    setSlideDirection('left');
                    setTimeout(() => setSlideDirection(''), 300);
                }, 150);
            } else {
                setCurrentIndex(currentIndex - 1);
                setInputValue('');
                setIsRevealed(false);
                setIsLocked(false);
                setFeedback(null);
                setMessage('');
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
                setIsProcessing(false);
                isCompletingRef.current = false;
                return;
            }
        }
        onCompleteReview(currentFailedCards);
    }, [allCards, onCompleteReview]);

    // Keyboard event handlers for flashcard mode
    useEffect(() => {
        if (reviewMode !== 'flashcard') return;

        const handleKeyDown = (e) => {
            if ((e.key === ' ' || e.key === 'ArrowLeft' || e.key === 'ArrowRight') &&
                e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
                e.preventDefault();
            }

            if (e.key === ' ' && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
                setIsFlipped(prev => {
                    const newFlippedState = !prev;
                    if (newFlippedState && currentCard && currentCard.audioBase64) {
                        playAudio(currentCard.audioBase64);
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
                        setCurrentIndex(currentIndex + 1);
                        setSlideDirection('right');
                        setTimeout(() => setSlideDirection(''), 300);
                    }, 150);
                } else {
                    handleCompleteReview();
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [currentIndex, cards, reviewMode, handleCompleteReview, moveToPreviousCard, currentCard]);

    // Keyboard handlers for multiple choice
    useEffect(() => {
        if (!currentCard) return;

        const handleKeyDown = (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

            if (isMultipleChoice && !isRevealed && multipleChoiceOptions.length > 0 && !isProcessing) {
                const keyIndex = parseInt(e.key);
                if (keyIndex >= 1 && keyIndex <= 4 && keyIndex <= multipleChoiceOptions.length) {
                    e.preventDefault();
                    const selectedOption = multipleChoiceOptions[keyIndex - 1];
                    setSelectedAnswer(selectedOption);
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isMultipleChoice, isRevealed, multipleChoiceOptions, isProcessing, currentCard]);

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
                setCurrentIndex(currentIndex + 1);
                setSlideDirection('right');
                setTimeout(() => setSlideDirection(''), 300);
            }, 150);
        } else if (isRightSwipe && currentIndex > 0) {
            setSlideDirection('right');
            setTimeout(() => {
                setCurrentIndex(currentIndex - 1);
                setInputValue('');
                setIsRevealed(false);
                setIsLocked(false);
                setFeedback(null);
                setMessage('');
                setSlideDirection('left');
                setTimeout(() => setSlideDirection(''), 300);
            }, 150);
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
            const correctAnswer = currentCard.front;
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
                .map(card => card.front)
                .filter((front, index, self) => self.findIndex(f => normalizeAnswer(f) === normalizeAnswer(front)) === index);

            while (wrongOptions.length < 3) {
                wrongOptions.push('...');
            }

            const options = [correctAnswer, ...wrongOptions];
            optionsRef.current[currentCardId] = shuffleArray(options);
        }

        setMultipleChoiceOptions(optionsRef.current[currentCardId] || []);
    }, [currentCardId, isMultipleChoice, currentCard, allCards, cards, normalizeAnswer]);

    // Auto complete when cards are done
    useEffect(() => {
        if ((cards.length === 0 || currentIndex >= cards.length) && !isCompletingRef.current) {
            const timer = setTimeout(() => {
                handleCompleteReview();
            }, 150);
            return () => clearTimeout(timer);
        }
    }, [cards.length, currentIndex, handleCompleteReview, failedCards.size]);

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

        return meanings.map((meaning, index) => `${index + 1}. ${meaning}`).join('\n');
    };

    const getPrompt = () => {
        switch (cardReviewType) {
            case 'synonym':
                return { label: 'Từ đồng nghĩa', text: currentCard.synonym, image: currentCard.imageBase64, icon: MessageSquare, color: 'text-blue-600' };
            case 'example': {
                const wordToMask = getWordForMasking(currentCard.front);
                const maskedExample = maskWordInExample(wordToMask, currentCard.example, currentCard.pos);
                return { label: 'Điền từ còn thiếu', text: maskedExample, meaning: currentCard.exampleMeaning || null, image: currentCard.imageBase64, icon: FileText, color: 'text-purple-600' };
            }
            default:
                return { label: 'Ý nghĩa (Mặt sau)', text: formatMultipleMeanings(currentCard.back), image: currentCard.imageBase64, icon: Repeat2, color: 'text-emerald-600' };
        }
    };

    const promptInfo = getPrompt();

    // Check answer
    const checkAnswer = async () => {
        if (isProcessing) return;

        const userAnswer = normalizeAnswer(inputValue);
        const rawFront = currentCard.front;
        const kanjiPart = rawFront.split('（')[0].split('(')[0];
        const kanaPartMatch = rawFront.match(/（([^）]+)）/) || rawFront.match(/\(([^)]+)\)/);
        const kanaPart = kanaPartMatch ? kanaPartMatch[1] : '';

        const normalizedKanji = normalizeAnswer(kanjiPart);
        const normalizedKana = normalizeAnswer(kanaPart);
        const normalizedFull = normalizeAnswer(rawFront);

        let isCorrect = userAnswer === normalizedKanji || (kanaPart && userAnswer === normalizedKana) || userAnswer === normalizedFull;

        if (!isCorrect && currentCard.pos === 'adj_na') {
            const accepted = new Set([
                ...buildAdjNaAcceptedAnswers(normalizedKanji),
                ...(kanaPart ? buildAdjNaAcceptedAnswers(normalizedKana) : []),
                ...buildAdjNaAcceptedAnswers(normalizedFull),
            ]);
            isCorrect = accepted.has(userAnswer);
        }

        const cardKey = `${currentCard.id}-${cardReviewType}`;
        const hasFailedBefore = failedCards.has(cardKey);

        if (isCorrect) {
            if (hasFailedBefore) {
                setFailedCards(prev => {
                    const newSet = new Set(prev);
                    newSet.delete(cardKey);
                    return newSet;
                });
                setIsProcessing(true);
                setFeedback('correct');
                setMessage(`Chính xác! ${displayFront} - Đã hoàn thành!`);
                setIsRevealed(true);
                setIsLocked(false);
                playAudio(currentCard.audioBase64, currentCard.front);
                await new Promise(resolve => setTimeout(resolve, 1000));
                await moveToNextCard(true);
            } else {
                setIsProcessing(true);
                setFeedback('correct');
                setMessage(`Chính xác! ${displayFront}`);
                setIsRevealed(true);
                setIsLocked(false);
                playAudio(currentCard.audioBase64, currentCard.front);
                await new Promise(resolve => setTimeout(resolve, 1000));
                await moveToNextCard(true);
            }
        } else {
            setFailedCards(prev => new Set([...prev, cardKey]));
            setFeedback('incorrect');
            const nuanceText = currentCard.nuance ? ` (${currentCard.nuance})` : '';
            setMessage(`Đáp án đúng: ${displayFront}${nuanceText}. Hãy làm lại!`);
            setIsRevealed(true);
            setIsLocked(true);
            playAudio(currentCard.audioBase64, currentCard.front);

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

            await onUpdateCard(currentCard.id, false, cardReviewType);
        }
    };

    const moveToNextCard = async (shouldUpdateStreak) => {
        if (shouldUpdateStreak) {
            await onUpdateCard(currentCard.id, true, cardReviewType);

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
                    setIsProcessing(false);
                    setSlideDirection('right');
                    setTimeout(() => {
                        setSlideDirection('');
                        if (cardReviewType === 'back' && !isMultipleChoice && inputRef.current && !isMobileDevice()) {
                            setTimeout(() => inputRef.current?.focus(), 100);
                        }
                    }, 300);
                }, 150);
            } else {
                setCurrentIndex(nextIndex);
                setInputValue('');
                setIsRevealed(false);
                setIsLocked(false);
                setFeedback(null);
                setMessage('');
                setIsProcessing(false);
                if (cardReviewType === 'back' && !isMultipleChoice && inputRef.current && !isMobileDevice()) {
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

        if (cardReviewType === 'back' && reviewMode !== 'flashcard' && !isMultipleChoice) {
            if (feedback === 'correct') {
                setIsProcessing(true);
                moveToNextCard(true);
            } else if (feedback === 'incorrect' && isLocked) {
                const userAnswer = normalizeAnswer(inputValue);
                const rawFront = currentCard.front;
                const kanjiPart = rawFront.split('（')[0].split('(')[0];
                const kanaPartMatch = rawFront.match(/（([^）]+)）/) || rawFront.match(/\(([^)]+)\)/);
                const kanaPart = kanaPartMatch ? kanaPartMatch[1] : '';

                const normalizedKanji = normalizeAnswer(kanjiPart);
                const normalizedKana = normalizeAnswer(kanaPart);

                const isCorrect = userAnswer === normalizedKanji || (kanaPart && userAnswer === normalizedKana) || userAnswer === normalizeAnswer(rawFront);

                if (isCorrect) {
                    playAudio(currentCard.audioBase64, currentCard.front);
                    setIsProcessing(true);
                    moveToNextCard(false);
                } else {
                    setMessage(`Hãy nhập lại: "${displayFront}"`);
                }
            }
        } else {
            if (feedback === 'correct') {
                setIsProcessing(true);
                moveToNextCard(true);
            } else if (feedback === 'incorrect') {
                setIsProcessing(false);
            }
        }
    };

    const progress = Math.round(((currentIndex) / cards.length) * 100);

    return (
        <div className="w-full max-w-xl lg:max-w-2xl mx-auto h-full flex flex-col space-y-2 md:space-y-3">
            {/* Header & Progress */}
            <div className="space-y-2 md:space-y-4 flex-shrink-0">
                <div className="flex justify-between items-center text-xs md:text-sm font-medium text-gray-500 dark:text-gray-300">
                    <span className="flex items-center">
                        <Zap className="w-3 h-3 md:w-4 md:h-4 mr-0.5 md:mr-1 text-amber-500 dark:text-amber-400" />
                        <span className="dark:text-gray-200">{reviewMode.toUpperCase()} - {cardReviewType === 'back' && reviewMode !== 'flashcard' && !isMultipleChoice ? 'Tự luận' : 'Ôn tập nhanh'}</span>
                    </span>
                    <span>{currentIndex + 1} / {cards.length} {failedCards.size > 0 && <span className="text-red-500 dark:text-red-400">({failedCards.size} sai)</span>}</span>
                </div>
                <div className="h-1.5 md:h-2 w-full bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div className="h-full bg-indigo-500 dark:bg-indigo-400 progress-bar" style={{ width: `${progress}%` }}></div>
                </div>
            </div>

            {/* Flashcard Area */}
            <div className="relative group perspective flex-shrink-0 overflow-hidden">
                {reviewMode === 'flashcard' ? (
                    <div className="perspective-1000 w-full max-w-[240px] md:max-w-[280px] mx-auto relative" style={{ minHeight: '340px' }}>
                        <div
                            className={`flip-card-container transform-style-3d cursor-pointer relative card-slide ${isFlipped ? 'rotate-y-180' : ''} ${slideDirection === 'left' ? 'slide-out-left' : slideDirection === 'right' ? 'slide-out-right' : ''}`}
                            onClick={() => {
                                if (Math.abs(swipeOffset) < 10) {
                                    const newFlippedState = !isFlipped;
                                    setIsFlipped(newFlippedState);
                                    if (newFlippedState && currentCard && currentCard.audioBase64) {
                                        playAudio(currentCard.audioBase64);
                                    }
                                }
                            }}
                            onTouchStart={onTouchStart}
                            onTouchMove={onTouchMove}
                            onTouchEnd={onTouchEnd}
                            style={{
                                width: '100%',
                                height: '340px',
                                transform: swipeOffset ? `translateX(${swipeOffset}px)` : undefined,
                                transition: swipeOffset ? 'none' : (slideDirection ? 'transform 0.3s cubic-bezier(0.4, 0.0, 0.2, 1), opacity 0.3s ease' : 'transform 0.2s cubic-bezier(0.4, 0.0, 0.2, 1)'),
                                touchAction: 'pan-y',
                            }}
                        >
                            {/* Front side */}
                            <div className="flip-card-front backface-hidden absolute inset-0 w-full h-full">
                                <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl shadow-2xl p-6 flex flex-col items-center justify-center w-full h-full border-4 border-white hover:shadow-3xl transition-shadow overflow-hidden">
                                    <div className="text-center flex-1 flex flex-col justify-center w-full px-2">
                                        <p className="text-xs text-indigo-200 mb-3 font-medium uppercase tracking-wide">Từ vựng</p>
                                        <h3 className="text-2xl md:text-3xl lg:text-4xl font-bold text-white mb-4 leading-tight break-words">{currentCard.front}</h3>
                                        <div className="flex items-center justify-center gap-2 flex-wrap">
                                            {currentCard.level && (
                                                <span className="inline-block px-2 py-1 bg-white/20 backdrop-blur-sm text-white text-xs font-bold rounded-full">
                                                    {currentCard.level}
                                                </span>
                                            )}
                                            {currentCard.pos && (
                                                <span className="inline-block px-2 py-1 bg-white/20 backdrop-blur-sm text-white text-xs font-medium rounded-full">
                                                    {POS_TYPES[currentCard.pos]?.label || currentCard.pos}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="absolute bottom-4 right-4 text-white/30">
                                        <RotateCw className="w-4 h-4 animate-pulse" />
                                    </div>
                                </div>
                            </div>

                            {/* Back side */}
                            <div className="flip-card-back backface-hidden absolute inset-0 w-full h-full rotate-y-180">
                                <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl shadow-2xl p-6 w-full h-full border-4 border-white hover:shadow-3xl transition-shadow flex flex-col overflow-y-auto">
                                    <div className="flex-1 flex flex-col items-center justify-center text-center">
                                        <p className="text-xs text-emerald-200 mb-2 font-medium uppercase tracking-wide">Ý nghĩa</p>
                                        <div className="text-3xl md:text-4xl font-extrabold text-white leading-relaxed break-words px-2 whitespace-pre-line">
                                            {formatMultipleMeanings(currentCard.back)}
                                        </div>
                                    </div>

                                    <div className="text-center space-y-1.5 mt-2 pb-8">
                                        {currentCard.sinoVietnamese && (
                                            <p className="text-emerald-100 text-[10px] leading-relaxed">
                                                <span className="font-semibold">Hán Việt:</span> {currentCard.sinoVietnamese}
                                            </p>
                                        )}
                                        {currentCard.synonym && (
                                            <p className="text-emerald-100 text-[10px] leading-relaxed">
                                                <span className="font-semibold">Đồng nghĩa:</span> {currentCard.synonym}
                                            </p>
                                        )}
                                        {currentCard.example && (
                                            <div className="pt-1.5 border-t border-white/20">
                                                <p className="text-white/90 text-[10px] italic leading-relaxed">
                                                    "{currentCard.example}"
                                                </p>
                                                {currentCard.exampleMeaning && (
                                                    <p className="text-emerald-100 text-[9px] mt-1 leading-relaxed">
                                                        {currentCard.exampleMeaning}
                                                    </p>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    <div className="absolute bottom-4 right-4 text-white/30">
                                        <RotateCw className="w-4 h-4 animate-pulse" />
                                    </div>
                                </div>
                            </div>
                        </div>
                        <p className="text-center text-[10px] md:text-xs text-gray-500 mt-3 flex items-center justify-center gap-1">
                            <RotateCw className="w-3 h-3" />
                            Click vào card để lật | Space: Lật | ← →: Chuyển thẻ | Trượt trái/phải: Chuyển thẻ
                        </p>
                    </div>
                ) : (
                    <div className="w-full bg-white dark:bg-gray-800 rounded-xl md:rounded-3xl shadow-xl shadow-indigo-100/50 dark:shadow-indigo-900/20 border border-gray-100 dark:border-gray-700 p-4 md:p-8 min-h-[200px] md:min-h-[280px] max-h-[40vh] md:max-h-none flex flex-col items-center justify-center text-center transition-all hover:shadow-2xl hover:shadow-indigo-200/50 dark:hover:shadow-indigo-900/50 relative overflow-hidden">
                        <div className={`absolute top-0 left-0 w-full h-1 md:h-1.5 ${reviewMode === 'mixed' ? 'bg-gradient-to-r from-rose-400 to-orange-400 dark:from-rose-500 dark:to-orange-500' : 'bg-gradient-to-r from-indigo-400 to-cyan-400 dark:from-indigo-500 dark:to-cyan-500'}`}></div>

                        <div className="absolute top-2 md:top-6 right-2 md:right-6 flex flex-col gap-1 md:gap-2 items-end">
                            {currentCard.level && <span className={`text-[9px] md:text-[10px] px-1.5 md:px-2 py-0.5 md:py-1 rounded border font-bold ${getLevelColor(currentCard.level)}`}>{currentCard.level}</span>}
                            {currentCard.pos && <span className={`text-[9px] md:text-[10px] px-1.5 md:px-2 py-0.5 md:py-1 rounded border font-bold ${getPosColor(currentCard.pos)}`}>{getPosLabel(currentCard.pos)}</span>}
                        </div>

                        <div className="flex items-center gap-1.5 md:gap-2 mb-3 md:mb-6 opacity-80">
                            <promptInfo.icon className={`w-4 h-4 md:w-5 md:h-5 ${promptInfo.color}`} />
                            <span className="text-xs md:text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{promptInfo.label}</span>
                        </div>

                        {promptInfo.image && (
                            <div className="mb-3 md:mb-6 rounded-lg md:rounded-xl overflow-hidden shadow-sm border border-gray-100 dark:border-gray-700">
                                <img src={promptInfo.image} alt="Hint" className="h-20 md:h-32 object-cover" />
                            </div>
                        )}

                        <div className="text-xl md:text-3xl lg:text-4xl font-black text-gray-800 dark:text-gray-100 leading-relaxed mb-1 md:mb-2 px-2 whitespace-pre-line">
                            {promptInfo.text}
                        </div>

                        {!['synonym', 'example'].includes(cardReviewType) && (currentCard.sinoVietnamese || currentCard.synonymSinoVietnamese) && (
                            <span className="text-xs md:text-sm font-semibold text-pink-500 dark:text-pink-400 bg-pink-50 dark:bg-pink-900/30 px-2 md:px-3 py-0.5 md:py-1 rounded-full mt-1 md:mt-2">
                                {reviewMode === 'synonym' ? currentCard.synonymSinoVietnamese : currentCard.sinoVietnamese}
                            </span>
                        )}

                        {promptInfo.meaning && <p className="text-gray-600 dark:text-gray-400 mt-2 md:mt-4 italic text-xs md:text-base border-t border-gray-100 dark:border-gray-700 pt-2 md:pt-3 px-2 md:px-4 leading-relaxed">"{promptInfo.meaning}"</p>}
                    </div>
                )}
            </div>

            {/* Interaction Area */}
            <div className="space-y-2 md:space-y-4 flex-shrink-0 pb-4 md:pb-0">
                {/* Multiple Choice */}
                {isMultipleChoice && !isRevealed && multipleChoiceOptions.length > 0 && (
                    <div className="space-y-3 md:space-y-4">
                        <p className="text-sm md:text-base font-semibold text-gray-700 dark:text-gray-300 text-center">
                            {cardReviewType === 'synonym'
                                ? `Từ đồng nghĩa của "${promptInfo.text}" là gì?`
                                : `Điền từ còn thiếu trong câu: "${promptInfo.text}"`
                            }
                        </p>
                        <div className="grid grid-cols-2 gap-2 md:gap-3">
                            {multipleChoiceOptions.map((option, index) => {
                                const isSelected = selectedAnswer === option;
                                let buttonClass = "px-3 md:px-4 py-2.5 md:py-3 text-sm md:text-base font-bold rounded-lg md:rounded-xl transition-all border-2 flex items-center justify-center gap-2 ";

                                if (isSelected) {
                                    buttonClass += "bg-indigo-500 dark:bg-indigo-600 text-white border-indigo-600 dark:border-indigo-700 shadow-md hover:bg-indigo-600 dark:hover:bg-indigo-700";
                                } else {
                                    buttonClass += "bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 hover:border-indigo-300 dark:hover:border-indigo-500";
                                }

                                return (
                                    <button
                                        key={index}
                                        onClick={() => {
                                            if (!isRevealed && !isProcessing) {
                                                setSelectedAnswer(option);
                                            }
                                        }}
                                        disabled={isRevealed || isProcessing}
                                        className={buttonClass}
                                        title={`Phím ${index + 1}`}
                                    >
                                        <span className="text-xs md:text-sm font-bold bg-white/20 dark:bg-white/10 px-1.5 md:px-2 py-0.5 rounded">{index + 1}</span>
                                        <span>{option}</span>
                                    </button>
                                );
                            })}
                        </div>
                        {selectedAnswer && !isRevealed && (
                            <button
                                onClick={async () => {
                                    if (isProcessing) return;
                                    const isCorrect = selectedAnswer === currentCard.front;
                                    const cardKey = `${currentCard.id}-${cardReviewType}`;
                                    const hasFailedBefore = failedCards.has(cardKey);

                                    setIsProcessing(true);

                                    if (isCorrect) {
                                        if (hasFailedBefore) {
                                            setFailedCards(prev => {
                                                const newSet = new Set(prev);
                                                newSet.delete(cardKey);
                                                return newSet;
                                            });
                                            setFeedback('correct');
                                            setMessage(`Chính xác! ${displayFront} - Đã hoàn thành!`);
                                        } else {
                                            setFeedback('correct');
                                            setMessage(`Chính xác! ${displayFront}`);
                                        }
                                    } else {
                                        setFailedCards(prev => new Set([...prev, cardKey]));
                                        setFeedback('incorrect');
                                        setMessage(`Đáp án đúng: ${displayFront}`);
                                        playAudio(currentCard.audioBase64);

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

                                        await onUpdateCard(currentCard.id, false, cardReviewType);
                                    }

                                    setIsRevealed(true);
                                    playAudio(currentCard.audioBase64);
                                    await new Promise(resolve => setTimeout(resolve, 1000));
                                    await moveToNextCard(isCorrect);
                                }}
                                disabled={isProcessing}
                                className="w-full py-3 md:py-4 bg-indigo-600 dark:bg-indigo-500 text-white rounded-lg md:rounded-xl font-bold text-base md:text-lg shadow-lg hover:bg-indigo-700 dark:hover:bg-indigo-600 transition-all"
                            >
                                Xác nhận
                            </button>
                        )}
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
                                        setCurrentIndex(currentIndex + 1);
                                        setSlideDirection('right');
                                        setTimeout(() => setSlideDirection(''), 300);
                                    }, 150);
                                } else {
                                    handleCompleteReview();
                                }
                            }}
                            disabled={isProcessing}
                            className={`flex-1 px-4 md:px-6 py-2 md:py-3 text-sm md:text-base font-bold rounded-lg md:rounded-xl transition-all shadow-md ${isProcessing
                                ? 'bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-500 cursor-not-allowed'
                                : 'bg-gradient-to-r from-indigo-500 to-purple-600 dark:from-indigo-600 dark:to-purple-700 text-white hover:shadow-lg hover:scale-105'
                                }`}
                            title="Thẻ tiếp theo (→)"
                        >
                            {currentIndex < cards.length - 1 ? 'Thẻ tiếp theo →' : 'Hoàn thành'}
                        </button>
                    </div>
                )}

                {/* Typing Mode UI */}
                {cardReviewType === 'back' && reviewMode !== 'flashcard' && !isMultipleChoice && (
                    <div className="relative">
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
                            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); isRevealed ? handleNext() : checkAnswer(); } }}
                            onFocus={(e) => {
                                if (window.innerWidth <= 768) {
                                    setTimeout(() => {
                                        e.target.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
                                    }, 300);
                                }
                            }}
                            disabled={feedback === 'correct'}
                            className={`w-full pl-5 md:pl-7 pr-12 md:pr-16 py-3 md:py-5 text-lg md:text-2xl font-semibold rounded-xl md:rounded-2xl border-2 transition-all outline-none shadow-md touch-manipulation
                                ${feedback === 'correct'
                                    ? 'border-green-400 dark:border-green-600 bg-green-50 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                                    : feedback === 'incorrect'
                                        ? 'border-red-400 dark:border-red-600 bg-red-50 dark:bg-red-900/30 text-red-800 dark:text-red-300'
                                        : 'border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:border-indigo-500 dark:focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10 dark:focus:ring-indigo-500/20'}`}
                            placeholder="Nhập từ vựng tiếng Nhật..."
                        />
                        <div className="absolute right-3 md:right-4 top-1/2 -translate-y-1/2">
                            {!isRevealed && (
                                <button onClick={checkAnswer} disabled={!inputValue.trim()} className="p-2 md:p-3 bg-indigo-600 dark:bg-indigo-500 text-white rounded-xl md:rounded-2xl shadow-lg shadow-indigo-200 dark:shadow-indigo-900/50 hover:bg-indigo-700 dark:hover:bg-indigo-600 disabled:opacity-50 disabled:shadow-none transition-all">
                                    <Send className="w-4 h-4 md:w-6 md:h-6" />
                                </button>
                            )}
                        </div>
                    </div>
                )}

                {/* Feedback & Actions */}
                {reviewMode !== 'flashcard' && (
                    <div className="space-y-2 md:space-y-3">
                        <div className={`transition-all duration-300 ease-out overflow-hidden ${isRevealed ? 'max-h-[120px] md:max-h-40 opacity-100' : 'max-h-0 opacity-0'}`}>
                            <div className={`p-3 md:p-5 rounded-xl md:rounded-2xl border flex items-start gap-2 md:gap-4 overflow-y-auto max-h-[120px] md:max-h-40 ${feedback === 'correct' ? 'bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-800' : feedback === 'incorrect' ? 'bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-800' : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700'}`}>
                                {cardReviewType === 'back' && reviewMode !== 'flashcard' && !isMultipleChoice && (
                                    <div className={`p-1.5 md:p-2 rounded-full flex-shrink-0 ${feedback === 'correct' ? 'bg-green-200 dark:bg-green-800 text-green-700 dark:text-green-300' : 'bg-red-200 dark:bg-red-800 text-red-700 dark:text-red-300'}`}>
                                        {feedback === 'correct' ? <Check className="w-4 h-4 md:w-5 md:h-5" strokeWidth={3} /> : <X className="w-4 h-4 md:w-5 md:h-5" strokeWidth={3} />}
                                    </div>
                                )}
                                <div className="flex-1 min-w-0">
                                    <div>
                                        <p className={`font-bold text-base md:text-xl ${feedback === 'correct' ? 'text-green-800 dark:text-green-300' : 'text-red-800 dark:text-red-300'}`}>{message}</p>
                                        {feedback === 'incorrect' && cardReviewType === 'back' && reviewMode !== 'flashcard' && !isMultipleChoice && <p className="text-xs md:text-base text-red-600 dark:text-red-400 mt-0.5 md:mt-1">Gõ lại từ đúng để tiếp tục</p>}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {cardReviewType === 'back' && reviewMode !== 'flashcard' && !isMultipleChoice && (
                            <button
                                onClick={handleNext}
                                disabled={isProcessing || (feedback === 'incorrect' && normalizeAnswer(inputValue) !== normalizeAnswer(currentCard.front.split('（')[0].split('(')[0]) && normalizeAnswer(inputValue) !== normalizeAnswer((currentCard.front.match(/（([^）]+)）/) || currentCard.front.match(/\(([^)]+)\)/))?.[1] || ''))}
                                className={`w-full py-3 md:py-4 rounded-lg md:rounded-xl font-bold text-base md:text-lg shadow-lg transition-all flex items-center justify-center
                                ${feedback === 'correct'
                                        ? 'bg-green-500 dark:bg-green-600 text-white shadow-green-200 dark:shadow-green-900/50 hover:bg-green-600 dark:hover:bg-green-700'
                                        : 'bg-indigo-600 dark:bg-indigo-500 text-white shadow-indigo-200 dark:shadow-indigo-900/50 hover:bg-indigo-700 dark:hover:bg-indigo-600 disabled:bg-gray-300 dark:disabled:bg-gray-700 disabled:text-gray-500 dark:disabled:text-gray-500 disabled:shadow-none'}`}
                            >
                                {currentIndex === cards.length - 1 ? 'Hoàn thành' : 'Tiếp theo'}
                                <ChevronRight className="w-4 h-4 md:w-5 md:h-5 ml-1.5 md:ml-2" strokeWidth={3} />
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export const ReviewCompleteScreen = ({ onBack }) => (
    <div className="flex flex-col items-center justify-center p-10 text-center space-y-6 animate-fade-in">
        <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mb-2 shadow-inner">
            <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center shadow-lg shadow-green-200 animate-bounce">
                <Check className="w-8 h-8 text-white" strokeWidth={4} />
            </div>
        </div>
        <div>
            <h2 className="text-3xl font-black text-gray-800 mb-2">Tuyệt vời!</h2>
            <p className="text-gray-500 font-medium">Bạn đã hoàn thành phiên ôn tập này.</p>
        </div>
        <button onClick={onBack} className="px-8 py-3 bg-gray-900 text-white font-bold rounded-xl shadow-xl hover:bg-gray-800 hover:-translate-y-1 transition-all">
            Về Trang chủ
        </button>
    </div>
);

export default ReviewScreen;
