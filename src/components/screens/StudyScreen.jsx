import React, { useState, useEffect, useRef } from 'react';
import { GraduationCap } from 'lucide-react';
import { playAudio } from '../../utils/audio';
import { shuffleArray, buildAdjNaAcceptedAnswers } from '../../utils/textProcessing';

// Helper function to detect mobile devices
const isMobileDevice = () => {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth <= 768;
};

const StudyScreen = ({ studySessionData, setStudySessionData, allCards, onUpdateCard, onCompleteStudy }) => {
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [selectedAnswer, setSelectedAnswer] = useState(null);
    const [inputValue, setInputValue] = useState('');
    const [isRevealed, setIsRevealed] = useState(false);
    const [feedback, setFeedback] = useState(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [completedCards, setCompletedCards] = useState(new Set());
    const [multipleChoiceOptions, setMultipleChoiceOptions] = useState([]);
    const inputRef = useRef(null);
    const optionsRef = useRef({});

    const currentBatch = studySessionData.currentBatch || [];
    const currentPhase = studySessionData.currentPhase || 'multipleChoice';
    const currentCard = currentBatch[currentQuestionIndex];
    const currentCardId = currentCard?.id;

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

    // Early return if no card
    if (!currentCard) {
        return <div className="flex items-center justify-center h-full">
            <p className="text-gray-500">Không có từ vựng nào để học.</p>
        </div>;
    }

    // Reset when changing phase
    useEffect(() => {
        if (currentPhase === 'typing') {
            setInputValue('');
            setIsRevealed(false);
            setFeedback(null);
            if (inputRef.current && !isMobileDevice()) {
                setTimeout(() => inputRef.current?.focus(), 100);
            }
        }
    }, [currentPhase, currentQuestionIndex]);

    // Reset completedCards when starting new batch
    useEffect(() => {
        if (currentPhase === 'multipleChoice' && currentQuestionIndex === 0 && studySessionData.batchIndex > 0) {
            // Keep completedCards from previous batches
        }
    }, [currentPhase, currentQuestionIndex, studySessionData.batchIndex]);

    const normalizeAnswer = (text) => text.replace(/（[^）]*）/g, '').replace(/\([^)]*\)/g, '').replace(/\s+/g, '').toLowerCase();

    // Generate multiple choice options
    useEffect(() => {
        if (!currentCard || currentPhase !== 'multipleChoice') {
            setMultipleChoiceOptions([]);
            return;
        }

        if (!optionsRef.current[currentCardId]) {
            const correctAnswer = currentCard.front;
            const currentPos = currentCard.pos;

            const allValidCards = allCards
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
            optionsRef.current[currentCardId] = shuffleArray([...options]);
        }

        setMultipleChoiceOptions(optionsRef.current[currentCardId] || []);
    }, [currentCardId, currentPhase, currentCard, allCards]);

    // Handle multiple choice answer
    const handleMultipleChoiceAnswer = async (selectedOption) => {
        if (isProcessing || isRevealed) return;

        setIsProcessing(true);
        setSelectedAnswer(selectedOption);
        const isCorrect = normalizeAnswer(selectedOption) === normalizeAnswer(currentCard.front);
        setFeedback(isCorrect ? 'correct' : 'incorrect');
        setIsRevealed(true);

        playAudio(currentCard.audioBase64, currentCard.front);

        await onUpdateCard(currentCard.id, isCorrect, 'back');

        if (isCorrect) {
            setStudySessionData(prev => ({
                ...prev,
                learning: prev.learning.filter(c => c.id !== currentCard.id),
                reviewing: [...prev.reviewing.filter(c => c.id !== currentCard.id), currentCard]
            }));
        } else {
            setStudySessionData(prev => ({
                ...prev,
                learning: [...prev.learning.filter(c => c.id !== currentCard.id), currentCard]
            }));
        }

        setTimeout(() => {
            setIsProcessing(false);
            if (currentQuestionIndex < currentBatch.length - 1) {
                setCurrentQuestionIndex(currentQuestionIndex + 1);
                setSelectedAnswer(null);
                setIsRevealed(false);
                setFeedback(null);
            } else {
                setStudySessionData(prev => ({
                    ...prev,
                    currentPhase: 'typing'
                }));
                setCurrentQuestionIndex(0);
                setSelectedAnswer(null);
                setIsRevealed(false);
                setFeedback(null);
            }
        }, 1500);
    };

    // Handle typing answer
    const handleTypingAnswer = async () => {
        if (isProcessing || !inputValue.trim()) return;

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

        setIsProcessing(true);
        setFeedback(isCorrect ? 'correct' : 'incorrect');
        setIsRevealed(true);
        playAudio(currentCard.audioBase64, currentCard.front);

        await onUpdateCard(currentCard.id, isCorrect, 'back');

        if (isCorrect) {
            setStudySessionData(prev => ({
                ...prev,
                learning: prev.learning.filter(c => c.id !== currentCard.id),
                reviewing: [...prev.reviewing.filter(c => c.id !== currentCard.id), currentCard]
            }));
            setCompletedCards(prev => new Set([...prev, currentCard.id]));
        } else {
            setStudySessionData(prev => ({
                ...prev,
                learning: [...prev.learning.filter(c => c.id !== currentCard.id), currentCard]
            }));
        }

        setTimeout(() => {
            setIsProcessing(false);

            if (currentQuestionIndex < currentBatch.length - 1) {
                setCurrentQuestionIndex(currentQuestionIndex + 1);
                setInputValue('');
                setIsRevealed(false);
                setFeedback(null);
            } else {
                createNextBatch();
            }
        }, 1500);
    };

    // Function to create next batch
    const createNextBatch = () => {
        const remainingNoSrs = studySessionData.allNoSrsCards.filter(card =>
            !completedCards.has(card.id)
        );

        const learning = studySessionData.learning.filter(card =>
            remainingNoSrs.some(c => c.id === card.id)
        );
        const newCards = remainingNoSrs.filter(card =>
            !learning.some(c => c.id === card.id) &&
            !studySessionData.reviewing.some(c => c.id === card.id)
        );
        const reviewing = studySessionData.reviewing.filter(card =>
            remainingNoSrs.some(c => c.id === card.id) &&
            !learning.some(c => c.id === card.id)
        );

        if (remainingNoSrs.length === 0 && studySessionData.learning.length > 0) {
            const learningIds = new Set(studySessionData.learning.map(c => c.id));
            setCompletedCards(prev => {
                const newSet = new Set(prev);
                learningIds.forEach(id => newSet.delete(id));
                return newSet;
            });

            const nextBatch = shuffleArray([...studySessionData.learning]).slice(0, Math.min(5, studySessionData.learning.length));

            setStudySessionData(prev => ({
                ...prev,
                currentBatch: nextBatch,
                currentPhase: 'multipleChoice',
                batchIndex: prev.batchIndex + 1
            }));
            setCurrentQuestionIndex(0);
            setInputValue('');
            setIsRevealed(false);
            setFeedback(null);
            return;
        }

        if (remainingNoSrs.length === 0) {
            onCompleteStudy();
            return;
        }

        const nextBatch = [];
        if (learning.length > 0) {
            nextBatch.push(...shuffleArray(learning).slice(0, Math.min(5, learning.length)));
        }
        if (nextBatch.length < 5 && newCards.length > 0) {
            const shuffledNew = shuffleArray(newCards);
            nextBatch.push(...shuffledNew.slice(0, Math.min(5 - nextBatch.length, shuffledNew.length)));
        }
        if (nextBatch.length < 5 && reviewing.length > 0) {
            const shuffledReviewing = shuffleArray(reviewing);
            nextBatch.push(...shuffledReviewing.slice(0, Math.min(5 - nextBatch.length, shuffledReviewing.length)));
        }

        if (nextBatch.length === 0) {
            onCompleteStudy();
        } else {
            setStudySessionData(prev => ({
                ...prev,
                currentBatch: nextBatch,
                currentPhase: 'multipleChoice',
                batchIndex: prev.batchIndex + 1
            }));
            setCurrentQuestionIndex(0);
            setInputValue('');
            setIsRevealed(false);
            setFeedback(null);
        }
    };

    if (!currentCard) {
        onCompleteStudy();
        return null;
    }

    const progress = currentPhase === 'multipleChoice'
        ? ((currentQuestionIndex + 1) / currentBatch.length) * 50
        : 50 + ((currentQuestionIndex + 1) / currentBatch.length) * 50;

    const remainingCards = studySessionData.allNoSrsCards.filter(card => !completedCards.has(card.id)).length;
    const totalCards = studySessionData.allNoSrsCards.length;

    return (
        <div className="w-full max-w-xl lg:max-w-2xl mx-auto h-full flex flex-col space-y-2 md:space-y-3">
            {/* Header & Progress */}
            <div className="space-y-2 md:space-y-4 flex-shrink-0">
                <div className="flex justify-between items-center text-xs md:text-sm font-medium text-gray-500 dark:text-gray-400">
                    <span className="flex items-center">
                        <GraduationCap className="w-3 h-3 md:w-4 md:h-4 mr-0.5 md:mr-1 text-teal-500 dark:text-teal-400" />
                        Học - {currentPhase === 'multipleChoice' ? 'Trắc nghiệm' : 'Tự luận'} - Batch {studySessionData.batchIndex + 1}
                    </span>
                    <span>{currentQuestionIndex + 1} / {currentBatch.length} <span className="text-teal-600 dark:text-teal-400">(Còn {remainingCards}/{totalCards})</span></span>
                </div>
                <div className="h-1.5 md:h-2 w-full bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div className="h-full bg-teal-500 dark:bg-teal-400 progress-bar" style={{ width: `${progress}%` }}></div>
                </div>
            </div>

            {/* Question Area */}
            <div className="flex-1 flex flex-col items-center justify-center space-y-4 md:space-y-6">
                {currentPhase === 'multipleChoice' ? (
                    <div className="w-full bg-white dark:bg-gray-800 rounded-xl md:rounded-3xl shadow-xl border border-gray-100 dark:border-gray-700 p-4 md:p-8 space-y-4 md:space-y-6">
                        <div className="text-center">
                            <div className="text-2xl md:text-4xl font-extrabold text-gray-800 dark:text-gray-100 mb-4 leading-relaxed whitespace-pre-line">
                                {formatMultipleMeanings(currentCard.back)}
                            </div>
                            <p className="text-sm md:text-base text-gray-500 dark:text-gray-400">Chọn từ vựng tiếng Nhật đúng:</p>
                        </div>

                        <div className="grid grid-cols-1 gap-2 md:gap-3">
                            {multipleChoiceOptions.map((option, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => handleMultipleChoiceAnswer(option)}
                                    disabled={isProcessing || isRevealed}
                                    className={`p-3 md:p-4 rounded-lg md:rounded-xl font-bold text-sm md:text-base transition-all text-left border-2
                                        ${selectedAnswer === option
                                            ? feedback === 'correct'
                                                ? 'bg-green-500 dark:bg-green-600 text-white shadow-lg border-green-600 dark:border-green-700'
                                                : 'bg-red-500 dark:bg-red-600 text-white shadow-lg border-red-600 dark:border-red-700'
                                            : isRevealed && normalizeAnswer(option) === normalizeAnswer(currentCard.front)
                                                ? 'bg-green-500 dark:bg-green-600 text-white shadow-lg border-green-600 dark:border-green-700'
                                                : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 border-gray-300 dark:border-gray-600'
                                        }
                                        ${isProcessing || isRevealed ? 'cursor-not-allowed' : 'cursor-pointer hover:scale-105'}
                                    `}
                                >
                                    <span className="font-japanese">{option}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="w-full bg-white dark:bg-gray-800 rounded-xl md:rounded-3xl shadow-xl border border-gray-100 dark:border-gray-700 p-4 md:p-8 space-y-4 md:space-y-6">
                        <div className="text-center">
                            <h3 className="text-xl md:text-2xl font-bold text-gray-700 dark:text-gray-300 mb-2">Từ vựng tiếng Nhật là gì?</h3>
                            <div className="text-3xl md:text-5xl font-extrabold text-gray-800 dark:text-gray-100 mb-4 leading-relaxed whitespace-pre-line">
                                {formatMultipleMeanings(currentCard.back)}
                            </div>
                        </div>

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
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !isRevealed) {
                                        handleTypingAnswer();
                                    }
                                }}
                                onFocus={(e) => {
                                    if (window.innerWidth <= 768) {
                                        setTimeout(() => {
                                            e.target.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
                                        }, 300);
                                    }
                                }}
                                disabled={isRevealed || isProcessing}
                                className={`w-full px-4 md:px-6 py-3 md:py-4 text-lg md:text-2xl font-semibold rounded-xl md:rounded-2xl border-2 transition-all outline-none shadow-md text-center touch-manipulation
                                    ${feedback === 'correct'
                                        ? 'border-green-400 dark:border-green-600 bg-green-50 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                                        : feedback === 'incorrect'
                                            ? 'border-red-400 dark:border-red-600 bg-red-50 dark:bg-red-900/30 text-red-800 dark:text-red-300'
                                            : 'border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:border-teal-500 dark:focus:border-teal-400 focus:ring-4 focus:ring-teal-500/10 dark:focus:ring-teal-500/20'
                                    }
                                `}
                                placeholder="Nhập từ vựng tiếng Nhật..."
                            />
                        </div>

                        {isRevealed && (
                            <div className={`p-4 md:p-5 rounded-xl md:rounded-2xl border ${feedback === 'correct' ? 'bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-800' : 'bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-800'
                                }`}>
                                <p className={`font-bold text-base md:text-xl text-center ${feedback === 'correct' ? 'text-green-800 dark:text-green-300' : 'text-red-800 dark:text-red-300'
                                    }`}>
                                    {feedback === 'correct' ? '✓ Chính xác!' : <>✗ Đáp án đúng: <span className="font-japanese">{currentCard.front}</span></>}
                                </p>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Actions */}
            <div className="space-y-2 md:space-y-4 flex-shrink-0 pb-4 md:pb-0">
                {currentPhase === 'typing' && !isRevealed && (
                    <button
                        onClick={handleTypingAnswer}
                        disabled={isProcessing || !inputValue.trim()}
                        className="w-full py-3 md:py-4 rounded-lg md:rounded-xl font-bold text-base md:text-lg shadow-lg transition-all flex items-center justify-center bg-teal-600 text-white hover:bg-teal-700 disabled:bg-gray-300 disabled:text-gray-500 disabled:shadow-none"
                    >
                        Kiểm tra
                    </button>
                )}

                {currentPhase === 'typing' && isRevealed && (
                    <button
                        onClick={async () => {
                            if (isProcessing) return;

                            setIsProcessing(true);

                            if (currentQuestionIndex < currentBatch.length - 1) {
                                setCurrentQuestionIndex(currentQuestionIndex + 1);
                                setInputValue('');
                                setIsRevealed(false);
                                setFeedback(null);
                                setIsProcessing(false);
                            } else {
                                createNextBatch();
                                setIsProcessing(false);
                            }
                        }}
                        disabled={isProcessing}
                        className="w-full py-3 md:py-4 rounded-lg md:rounded-xl font-bold text-base md:text-lg shadow-lg transition-all flex items-center justify-center bg-teal-600 text-white hover:bg-teal-700 disabled:bg-gray-300 disabled:text-gray-500"
                    >
                        {currentQuestionIndex < currentBatch.length - 1 ? 'Tiếp theo →' : 'Batch tiếp theo →'}
                    </button>
                )}
            </div>
        </div>
    );
};

export default StudyScreen;
