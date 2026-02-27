import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    Zap, RotateCw, MessageSquare, FileText, Repeat2, Send,
    ChevronRight, Check, X, Lightbulb
} from 'lucide-react';
import { POS_TYPES, getPosLabel, getPosColor, getLevelColor } from '../../config/constants';
import { playAudio, speakJapanese } from '../../utils/audio';
import {
    shuffleArray,
    getWordForMasking,
    getReadingForMasking,
    maskWordInExample,
    buildAdjNaAcceptedAnswers
} from '../../utils/textProcessing';
import { flashCorrect, launchConfetti, launchFanfare, launchSparkles, celebrateCorrectAnswer } from '../../utils/celebrations';
import { playCorrectSound, playIncorrectSound, launchFireworks } from '../../utils/soundEffects';
import FuriganaText from '../ui/FuriganaText';

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
    vocabCollectionPath,
    onSaveCardAudio
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
    const [hintCount, setHintCount] = useState(0); // Number of characters revealed as hint
    const [inputMode, setInputMode] = useState('reading'); // 'reading' = show meaning, input word | 'meaning' = show word, input meaning
    const inputRef = useRef(null);
    const isCompletingRef = useRef(false);
    const failedCardsRef = useRef(failedCards);
    const optionsRef = useRef({});
    const cardShownTimeRef = useRef(Date.now()); // Track thời gian hiển thị card

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
        setHintCount(0); // Reset hint when changing card
        cardShownTimeRef.current = Date.now(); // Reset timer khi đổi card
    }, [currentIndex]);

    // Helper: tính thời gian phản hồi (ms)
    const getResponseTime = () => Date.now() - cardShownTimeRef.current;

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
                    if (newFlippedState && currentCard) {
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

    // Keyboard shortcuts for multiple choice (1-2-3-4)
    useEffect(() => {
        if (!isMultipleChoice || isRevealed || isProcessing || feedback || multipleChoiceOptions.length === 0) return;

        const handleMCKeyDown = (e) => {
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
                const readingForMask = getReadingForMasking(currentCard.front);
                // Use first example line if multiple examples exist
                const exampleLines = (currentCard.example || '').split('\n').filter(e => e.trim());
                const exampleMeaningLines = (currentCard.exampleMeaning || '').split('\n').filter(e => e.trim());
                const firstExample = exampleLines[0] || currentCard.example;
                const firstExampleMeaning = exampleMeaningLines[0] || currentCard.exampleMeaning || null;
                const maskedExample = maskWordInExample(wordToMask, firstExample, currentCard.pos, readingForMask);
                return { label: 'Điền từ còn thiếu', text: maskedExample, meaning: firstExampleMeaning, image: currentCard.imageBase64, icon: FileText, color: 'text-purple-600' };
            }
            default:
                return { label: 'Ý nghĩa (Mặt sau)', text: formatMultipleMeanings(currentCard.back), image: currentCard.imageBase64, icon: Repeat2, color: 'text-emerald-600' };
        }
    };

    const promptInfo = getPrompt();

    // Check answer
    const checkAnswer = async () => {
        if (isProcessing) return;

        console.log('checkAnswer - inputMode:', inputMode, '| inputValue:', inputValue);

        const userAnswer = normalizeAnswer(inputValue);
        let isCorrect = false;

        if (inputMode === 'reading') {
            // Mode: Hiện nghĩa, nhập từ vựng
            const rawFront = currentCard.front;
            const kanjiPart = rawFront.split('（')[0].split('(')[0];
            const kanaPartMatch = rawFront.match(/（([^）]+)）/) || rawFront.match(/\(([^)]+)\)/);
            const kanaPart = kanaPartMatch ? kanaPartMatch[1] : '';

            const normalizedKanji = normalizeAnswer(kanjiPart);
            const normalizedKana = normalizeAnswer(kanaPart);
            const normalizedFull = normalizeAnswer(rawFront);

            isCorrect = userAnswer === normalizedKanji || (kanaPart && userAnswer === normalizedKana) || userAnswer === normalizedFull;

            if (!isCorrect && currentCard.pos === 'adj_na') {
                const accepted = new Set([
                    ...buildAdjNaAcceptedAnswers(normalizedKanji),
                    ...(kanaPart ? buildAdjNaAcceptedAnswers(normalizedKana) : []),
                    ...buildAdjNaAcceptedAnswers(normalizedFull),
                ]);
                isCorrect = accepted.has(userAnswer);
            }
        } else {
            // Mode: Hiện từ vựng, nhập nghĩa - chỉ cần đúng 1 trong các nghĩa
            // Normalize for Vietnamese: lowercase, trim, but keep spaces between words
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
                flashCorrect();
                playCorrectSound();
                celebrateCorrectAnswer();
                speakJapanese(currentCard.front, currentCard.audioBase64, onSaveCardAudio ? (b64, vid) => onSaveCardAudio(currentCard.id, b64, vid) : null);
                await new Promise(resolve => setTimeout(resolve, 1000));
                await moveToNextCard(true);
            } else {
                setIsProcessing(true);
                setFeedback('correct');
                setMessage(`Chính xác! ${displayFront}`);
                setIsRevealed(true);
                setIsLocked(false);
                flashCorrect();
                playCorrectSound();
                celebrateCorrectAnswer();
                speakJapanese(currentCard.front, currentCard.audioBase64, onSaveCardAudio ? (b64, vid) => onSaveCardAudio(currentCard.id, b64, vid) : null);
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
            playIncorrectSound();
            speakJapanese(currentCard.front, currentCard.audioBase64, onSaveCardAudio ? (b64, vid) => onSaveCardAudio(currentCard.id, b64, vid) : null);

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

            await onUpdateCard(currentCard.id, false, cardReviewType, 'review', getResponseTime());
        }
    };

    const moveToNextCard = async (shouldUpdateStreak) => {
        if (shouldUpdateStreak) {
            await onUpdateCard(currentCard.id, true, cardReviewType, 'review', getResponseTime());

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
                    speakJapanese(currentCard.front, currentCard.audioBase64, onSaveCardAudio ? (b64, vid) => onSaveCardAudio(currentCard.id, b64, vid) : null);
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
        <div className="w-[600px] max-w-[95vw] mx-auto my-auto flex flex-col justify-center items-center space-y-3 p-4 border-2 border-indigo-400/30 rounded-2xl">
            {/* Progress bar */}
            <div className="w-full space-y-1 flex-shrink-0">
                <div className="flex justify-between items-center text-xs font-medium text-gray-500 dark:text-gray-400">
                    <span>{currentIndex + 1} / {cards.length}</span>
                    {failedCards.size > 0 && <span className="text-red-500">({failedCards.size} sai)</span>}
                </div>
                <div className="h-1.5 w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div className="h-full bg-indigo-500 progress-bar rounded-full" style={{ width: `${progress}%` }}></div>
                </div>
            </div>

            {/* Flashcard Area */}
            <div className="w-full relative group perspective flex-shrink-0 overflow-hidden">
                {reviewMode === 'flashcard' ? (
                    <div className="perspective-1000 w-full max-w-[220px] md:max-w-[260px] mx-auto relative" style={{ minHeight: '300px' }}>
                        <div
                            className={`flip-card-container transform-style-3d cursor-pointer relative card-slide ${isFlipped ? 'rotate-y-180' : ''} ${slideDirection === 'left' ? 'slide-out-left' : slideDirection === 'right' ? 'slide-out-right' : ''}`}
                            onClick={() => {
                                if (Math.abs(swipeOffset) < 10) {
                                    const newFlippedState = !isFlipped;
                                    setIsFlipped(newFlippedState);
                                    if (newFlippedState && currentCard) {
                                        speakJapanese(currentCard.front, currentCard.audioBase64, onSaveCardAudio ? (b64, vid) => onSaveCardAudio(currentCard.id, b64, vid) : null);
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
                                        <h3 className="text-2xl md:text-3xl lg:text-4xl font-bold text-white mb-4 leading-tight break-words font-japanese">{currentCard.front}</h3>
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
                                        {/* Image display */}
                                        {currentCard.imageBase64 && (
                                            <div className="mb-2">
                                                <img
                                                    src={currentCard.imageBase64}
                                                    alt={currentCard.front}
                                                    className="max-h-16 max-w-full rounded-lg object-contain border border-white/20"
                                                />
                                            </div>
                                        )}
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
                                                <p className="text-white/90 text-[10px] italic leading-relaxed whitespace-pre-line">
                                                    "<FuriganaText text={currentCard.example} />"
                                                </p>
                                                {currentCard.exampleMeaning && (
                                                    <p className="text-emerald-100 text-[9px] mt-1 leading-relaxed whitespace-pre-line">
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
                    <div className="w-full bg-slate-800 dark:bg-slate-900 rounded-2xl shadow-xl p-6 flex flex-col items-center justify-center text-center relative overflow-hidden h-[280px] border-2 border-indigo-500/50">
                        {/* Header with mode label and toggle buttons */}
                        <div className="w-full flex justify-between items-center absolute top-4 left-0 px-4">
                            <div className="flex items-center gap-2">
                                <span className="text-orange-500 text-xl">🔥</span>
                                <span className="text-white font-bold text-sm">
                                    {cardReviewType === 'back' ? (inputMode === 'reading' ? 'Cách đọc' : 'Ý nghĩa') : cardReviewType === 'synonym' ? 'Đồng nghĩa' : 'Ngữ cảnh'}
                                </span>
                            </div>
                            {/* Only show toggle buttons for back mode */}
                            {cardReviewType === 'back' && !isMultipleChoice && (
                                <div className="flex gap-2">
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

                        {/* Word display - changes based on inputMode and cardReviewType */}
                        <div className="py-4">
                            {/* Image display for cards with images */}
                            {currentCard.imageBase64 && (
                                <div className="flex justify-center mb-3">
                                    <img
                                        src={currentCard.imageBase64}
                                        alt={currentCard.front}
                                        className="max-h-16 max-w-[50%] rounded-lg object-contain border border-slate-500/30 opacity-80"
                                    />
                                </div>
                            )}
                            {cardReviewType === 'synonym' ? (
                                <>
                                    {/* Synonym mode: Show synonym from card */}
                                    <div className="text-2xl md:text-3xl font-bold text-white leading-relaxed line-clamp-3 font-japanese">
                                        {currentCard.synonym || 'Không có từ đồng nghĩa'}
                                    </div>
                                    <div className="text-sm text-gray-400 mt-2">
                                        Tìm từ đồng nghĩa
                                    </div>
                                </>
                            ) : cardReviewType === 'example' ? (
                                <>
                                    {/* Example mode: Show example sentence with masked word */}
                                    <div className="text-lg md:text-xl font-medium text-white leading-relaxed line-clamp-4 font-japanese">
                                        <FuriganaText text={promptInfo.text} />
                                    </div>
                                    {promptInfo.meaning && (
                                        <div className="text-sm text-gray-400 mt-2 italic">
                                            "{promptInfo.meaning}"
                                        </div>
                                    )}
                                </>
                            ) : inputMode === 'reading' ? (
                                <>
                                    {/* Reading mode: Show meaning, user inputs word */}
                                    <div className="text-2xl md:text-3xl font-bold text-white leading-relaxed whitespace-pre-line">
                                        {formatMultipleMeanings(currentCard.back)}
                                    </div>
                                </>
                            ) : (
                                <>
                                    {/* Meaning mode: Show word only, user inputs meaning */}
                                    <div className="text-4xl md:text-5xl font-black text-white leading-relaxed font-japanese">
                                        {currentCard.front.split('（')[0].split('(')[0]}
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Sino-Vietnamese hint */}
                        {!['synonym', 'example'].includes(cardReviewType) && currentCard.sinoVietnamese && (
                            <span className="text-sm font-semibold text-pink-400 bg-pink-900/30 px-3 py-1 rounded-full">
                                {currentCard.sinoVietnamese}
                            </span>
                        )}
                    </div>
                )}
            </div>

            {/* Interaction Area */}
            <div className="w-full space-y-2 flex-shrink-0">
                {/* Multiple Choice */}
                {isMultipleChoice && !isRevealed && multipleChoiceOptions.length > 0 && (
                    <div className="space-y-3">
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-300 text-center">
                            {cardReviewType === 'synonym'
                                ? `Từ đồng nghĩa của "${promptInfo.text}" là gì?`
                                : `Điền từ còn thiếu`
                            }
                        </p>
                        <div className="grid grid-cols-2 gap-2">
                            {multipleChoiceOptions.map((option, index) => {
                                const isSelected = selectedAnswer === option;
                                let buttonClass = "px-3 py-3 text-sm font-bold rounded-xl transition-all border-2 text-center ";

                                if (feedback && isSelected && feedback === 'correct') {
                                    buttonClass += "bg-emerald-500 text-white border-emerald-600 shadow-md";
                                } else if (feedback && isSelected && feedback === 'incorrect') {
                                    buttonClass += "bg-red-500 text-white border-red-600 shadow-md";
                                } else if (feedback && option === currentCard.front) {
                                    // Highlight đáp án đúng khi sai
                                    buttonClass += "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-emerald-500";
                                } else if (isSelected) {
                                    buttonClass += "bg-indigo-500 text-white border-indigo-600 shadow-md";
                                } else {
                                    buttonClass += "bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 hover:border-indigo-400";
                                }

                                return (
                                    <button
                                        key={index}
                                        data-mc-option={index}
                                        onClick={async () => {
                                            if (isRevealed || isProcessing || feedback) return;
                                            setSelectedAnswer(option);

                                            // Auto-submit ngay khi click
                                            const isCorrect = option === currentCard.front;
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
                                                flashCorrect();
                                                playCorrectSound();
                                                celebrateCorrectAnswer();
                                            } else {
                                                setFailedCards(prev => new Set([...prev, cardKey]));
                                                setFeedback('incorrect');
                                                setMessage(`Đáp án đúng: ${displayFront}`);
                                                playIncorrectSound();

                                                setCards(prevCards => {
                                                    return prevCards.map(card => {
                                                        if (card.id === currentCard.id) {
                                                            const updatedCard = { ...card };
                                                            if (cardReviewType === 'synonym') {
                                                                updatedCard.correctStreak_synonym = 0;
                                                            } else if (cardReviewType === 'example') {
                                                                updatedCard.correctStreak_example = 0;
                                                            }
                                                            return updatedCard;
                                                        }
                                                        return card;
                                                    });
                                                });

                                                await onUpdateCard(currentCard.id, false, cardReviewType, 'review', getResponseTime());
                                            }

                                            setIsRevealed(true);
                                            speakJapanese(currentCard.front, currentCard.audioBase64, onSaveCardAudio ? (b64, vid) => onSaveCardAudio(currentCard.id, b64, vid) : null);
                                            await new Promise(resolve => setTimeout(resolve, 1000));
                                            await moveToNextCard(isCorrect);
                                        }}
                                        disabled={isRevealed || isProcessing || !!feedback}
                                        className={buttonClass}
                                    >
                                        <span className="font-japanese">{option}</span>
                                    </button>
                                );
                            })}
                        </div>
                        <p className="text-[10px] text-gray-400 dark:text-gray-500 text-center mt-1 opacity-70">⌨️ Dùng phím bàn phím để chọn nhanh</p>
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
                    <div className="space-y-3">
                        {/* Hint Display - Only for reading mode */}
                        {!isRevealed && inputMode === 'reading' && (
                            <div className="flex justify-center gap-1.5">
                                {currentCard.front.split('（')[0].split('(')[0].split('').map((char, idx) => (
                                    <span
                                        key={idx}
                                        className={`inline-block w-7 h-9 leading-9 text-center text-base font-bold border-b-2 ${idx < hintCount
                                            ? 'text-gray-800 dark:text-gray-200 border-indigo-500'
                                            : 'text-gray-400 dark:text-gray-500 border-gray-300 dark:border-gray-600'
                                            }`}
                                    >
                                        {idx < hintCount ? char : '_'}
                                    </span>
                                ))}
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
                            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); isRevealed ? handleNext() : checkAnswer(); } }}
                            onFocus={(e) => {
                                if (window.innerWidth <= 768) {
                                    setTimeout(() => {
                                        e.target.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
                                    }, 300);
                                }
                            }}
                            disabled={feedback === 'correct'}
                            className={`w-full px-5 py-3 text-lg font-semibold rounded-xl border-2 transition-all outline-none shadow-md
                                ${feedback === 'correct'
                                    ? 'border-green-400 bg-green-50 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                                    : feedback === 'incorrect'
                                        ? 'border-red-400 bg-red-50 dark:bg-red-900/30 text-red-800 dark:text-red-300'
                                        : 'border-gray-300 dark:border-gray-600 bg-gray-800 text-white focus:border-indigo-500'}`}
                            placeholder={inputMode === 'reading' ? 'Nhập từ vựng tiếng Nhật...' : 'Nhập ý nghĩa tiếng Việt...'}
                        />

                        {/* Hint button and Check button row */}
                        {!isRevealed && (
                            <div className="flex gap-3">
                                {inputMode === 'reading' && (
                                    <button
                                        onClick={() => {
                                            const answer = currentCard.front.split('（')[0].split('(')[0];
                                            if (hintCount < answer.length) {
                                                setHintCount(prev => prev + 1);
                                            }
                                        }}
                                        disabled={hintCount >= currentCard.front.split('（')[0].split('(')[0].length}
                                        className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl font-medium hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                    >
                                        <Lightbulb className="w-4 h-4" />
                                        <span>Gợi ý ({hintCount}/{currentCard.front.split('（')[0].split('(')[0].length})</span>
                                    </button>
                                )}
                                <button
                                    onClick={checkAnswer}
                                    disabled={!inputValue.trim() || isProcessing}
                                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-bold shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                >
                                    <Check className="w-4 h-4" />
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

                    </div>
                )}
            </div>
        </div>
    );
};

export const ReviewCompleteScreen = ({ onBack, allCards }) => {
    const [cycleText, setCycleText] = useState('⏳ Đang tính toán chu kì...');
    const [showCycle, setShowCycle] = useState(false);

    useEffect(() => {
        launchFanfare();
        launchFireworks();
        // Không gọi playCompletionFanfare() vì launchFanfare() đã phát âm thanh rồi

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

        return () => clearTimeout(timer);
    }, []);

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
                    <button onClick={onBack} className="px-8 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-500 dark:to-purple-500 text-white font-bold rounded-xl shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all">
                        Quay lại Ôn tập
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ReviewScreen;
