import React, { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { playAudio } from '../../utils/audio';

const FlashcardScreen = ({ cards: initialCards, onComplete }) => {
    const [cards] = useState(initialCards);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isFlipped, setIsFlipped] = useState(false);
    const [slideDirection, setSlideDirection] = useState('');
    const [touchStart, setTouchStart] = useState(null);
    const [touchEnd, setTouchEnd] = useState(null);
    const [swipeOffset, setSwipeOffset] = useState(0);

    const currentCard = cards[currentIndex];
    const progress = Math.round(((currentIndex + 1) / cards.length) * 100);

    // Reset flip when changing card
    useEffect(() => {
        setIsFlipped(false);
        setSlideDirection('');
        setSwipeOffset(0);
    }, [currentIndex]);

    // Format multiple meanings
    const formatMultipleMeanings = (text) => {
        if (!text) return text;
        const meanings = text.split(/[;；\n]/).map(m => m.trim()).filter(m => m);
        if (meanings.length <= 1) return text;
        return meanings.map((m, i) => `${i + 1}. ${m}`).join('\n');
    };

    // Navigation functions
    const goToPrevious = useCallback(() => {
        if (currentIndex > 0) {
            setSlideDirection('right');
            setTimeout(() => {
                setCurrentIndex(currentIndex - 1);
                setSlideDirection('left');
                setTimeout(() => setSlideDirection(''), 300);
            }, 150);
        }
    }, [currentIndex]);

    const goToNext = useCallback(() => {
        if (currentIndex < cards.length - 1) {
            setSlideDirection('left');
            setTimeout(() => {
                setCurrentIndex(currentIndex + 1);
                setSlideDirection('right');
                setTimeout(() => setSlideDirection(''), 300);
            }, 150);
        } else {
            onComplete();
        }
    }, [currentIndex, cards.length, onComplete]);

    const handleFlip = () => {
        const newFlippedState = !isFlipped;
        setIsFlipped(newFlippedState);
        if (newFlippedState && currentCard?.audioBase64) {
            playAudio(currentCard.audioBase64);
        }
    };

    // Keyboard controls
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

            if (e.key === ' ') {
                e.preventDefault();
                handleFlip();
            } else if (e.key === 'ArrowLeft') {
                e.preventDefault();
                goToPrevious();
            } else if (e.key === 'ArrowRight') {
                e.preventDefault();
                goToNext();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [goToPrevious, goToNext, isFlipped]);

    // Touch/Swipe handlers
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
        if (!touchStart) {
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
                setSlideDirection('left');
                setTimeout(() => setSlideDirection(''), 300);
            }, 150);
        } else if (currentIndex >= cards.length - 1 && isLeftSwipe) {
            onComplete();
        }

        setTouchStart(null);
        setTouchEnd(null);
        setSwipeOffset(0);
    };

    if (!currentCard) {
        return (
            <div className="flex items-center justify-center h-full">
                <p className="text-gray-500">Không có thẻ nào để hiển thị.</p>
            </div>
        );
    }

    return (
        <div className="w-[600px] max-w-[95vw] mx-auto my-auto flex flex-col justify-center items-center space-y-3 p-4 border-2 border-indigo-400/30 rounded-2xl">
            {/* Progress bar */}
            <div className="w-full space-y-1 flex-shrink-0">
                <div className="flex justify-center items-center text-xs font-medium text-gray-500 dark:text-gray-400">
                    <span>{currentIndex + 1} / {cards.length}</span>
                </div>
                <div className="h-1.5 w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div className="h-full bg-indigo-500 progress-bar rounded-full" style={{ width: `${progress}%` }}></div>
                </div>
            </div>

            {/* Flashcard Area - Minimal Design */}
            <div className="w-full relative group perspective flex-shrink-0 overflow-hidden">
                <div className="perspective-1000 w-full mx-auto relative" style={{ minHeight: '300px' }}>
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
                            height: '400px',
                            transform: swipeOffset ? `translateX(${swipeOffset}px)` : undefined,
                            transition: swipeOffset ? 'none' : (slideDirection ? 'transform 0.3s cubic-bezier(0.4, 0.0, 0.2, 1), opacity 0.3s ease' : 'transform 0.4s cubic-bezier(0.4, 0.0, 0.2, 1)'),
                            touchAction: 'pan-y',
                        }}
                    >
                        {/* Front side - Japanese with colored hiragana */}
                        <div className="flip-card-front backface-hidden absolute inset-0 w-full h-full">
                            <div className="bg-slate-700 dark:bg-slate-800 rounded-2xl shadow-2xl p-6 flex flex-col items-center justify-center w-full h-full border-2 border-slate-600 dark:border-slate-700 hover:shadow-3xl transition-shadow overflow-hidden">
                                <div className="text-center flex-1 flex flex-col justify-center w-full px-2">
                                    {(() => {
                                        // Parse front to separate kanji and hiragana
                                        const kanjiMatch = currentCard.front.match(/^([^（(]+)/);
                                        const hiraganaMatch = currentCard.front.match(/[（(]([^）)]+)[）)]/);
                                        const kanji = kanjiMatch ? kanjiMatch[1] : currentCard.front;
                                        const hiragana = hiraganaMatch ? hiraganaMatch[1] : null;

                                        return (
                                            <div className="space-y-2">
                                                <h3 className="text-3xl md:text-4xl font-bold text-white leading-tight break-words font-japanese">
                                                    {kanji}
                                                </h3>
                                                {hiragana && (
                                                    <p className="text-xl md:text-2xl font-medium text-cyan-300 leading-tight font-japanese">
                                                        {hiragana}
                                                    </p>
                                                )}
                                            </div>
                                        );
                                    })()}
                                </div>
                            </div>
                        </div>

                        {/* Back side - Vietnamese with Sino-Vietnamese */}
                        <div className="flip-card-back backface-hidden absolute inset-0 w-full h-full rotate-y-180">
                            <div className="bg-slate-700 dark:bg-slate-800 rounded-2xl shadow-2xl p-6 w-full h-full border-2 border-slate-600 dark:border-slate-700 hover:shadow-3xl transition-shadow flex flex-col overflow-y-auto">
                                <div className="flex-1 flex flex-col items-center justify-center text-center space-y-4">
                                    {/* Vietnamese meaning */}
                                    <div className="text-2xl md:text-3xl font-bold text-white leading-relaxed break-words px-2 whitespace-pre-line">
                                        {formatMultipleMeanings(currentCard.back)}
                                    </div>

                                    {/* Sino-Vietnamese */}
                                    {currentCard.sinoVietnamese && (
                                        <div className="pt-3 border-t border-slate-600">
                                            <p className="text-sm text-slate-400 mb-1">Âm Hán Việt</p>
                                            <p className="text-lg md:text-xl font-medium text-yellow-300">
                                                {currentCard.sinoVietnamese}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                    <p className="text-center text-[10px] md:text-xs text-gray-500 mt-3 flex items-center justify-center gap-1">
                        Click để lật | Space: Lật | ← →: Chuyển thẻ | Trượt trái/phải: Chuyển thẻ
                    </p>
                </div>
            </div>

            {/* Navigation buttons */}
            <div className="flex items-center justify-center gap-4 mt-2 flex-shrink-0">
                <button
                    onClick={goToPrevious}
                    disabled={currentIndex === 0}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all text-sm
                        ${currentIndex === 0
                            ? 'bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
                            : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 shadow-md hover:shadow-lg'}`}
                >
                    <ChevronLeft className="w-4 h-4" />
                    Trước
                </button>

                <button
                    onClick={goToNext}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl font-medium bg-indigo-500 hover:bg-indigo-600 text-white shadow-md hover:shadow-lg transition-all text-sm"
                >
                    {currentIndex === cards.length - 1 ? 'Hoàn thành' : 'Tiếp'}
                    <ChevronRight className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
};

export default FlashcardScreen;
