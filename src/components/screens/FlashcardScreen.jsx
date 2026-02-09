import React, { useState, useEffect, useCallback } from 'react';
import { RotateCw, ChevronLeft, ChevronRight, Volume2, Home } from 'lucide-react';
import { POS_TYPES } from '../../config/constants';
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
        setSwipeOffset(Math.max(-150, Math.min(150, diff)));
    };

    const onTouchEnd = () => {
        if (!touchStart || !touchEnd) {
            setSwipeOffset(0);
            return;
        }

        const distance = touchStart - touchEnd;
        if (distance > minSwipeDistance) {
            goToNext();
        } else if (distance < -minSwipeDistance) {
            goToPrevious();
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
        <div className="w-full max-w-2xl mx-auto flex flex-col items-center justify-center min-h-[70vh] p-4">
            {/* Header */}
            <div className="w-full flex items-center justify-between mb-6">
                <button
                    onClick={onComplete}
                    className="flex items-center gap-2 px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
                >
                    <Home className="w-5 h-5" />
                    <span className="text-sm font-medium">Trang chủ</span>
                </button>
                <div className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    {currentIndex + 1} / {cards.length}
                </div>
            </div>

            {/* Progress bar */}
            <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full mb-8 overflow-hidden">
                <div
                    className="h-full bg-gradient-to-r from-violet-500 to-purple-600 transition-all duration-300 rounded-full"
                    style={{ width: `${progress}%` }}
                />
            </div>

            {/* Flashcard */}
            <div
                className="w-full perspective-1000 cursor-pointer"
                style={{ height: '400px', maxWidth: '500px' }}
            >
                <div
                    className={`relative w-full h-full transform-style-3d transition-transform duration-500 ${isFlipped ? 'rotate-y-180' : ''}`}
                    onClick={() => Math.abs(swipeOffset) < 10 && handleFlip()}
                    onTouchStart={onTouchStart}
                    onTouchMove={onTouchMove}
                    onTouchEnd={onTouchEnd}
                    style={{
                        transform: swipeOffset ? `translateX(${swipeOffset}px) ${isFlipped ? 'rotateY(180deg)' : ''}` : undefined,
                        transition: swipeOffset ? 'none' : undefined,
                    }}
                >
                    {/* Front - Word */}
                    <div className={`absolute inset-0 backface-hidden rounded-3xl shadow-2xl overflow-hidden
                        ${slideDirection === 'left' ? 'animate-slide-out-left' : slideDirection === 'right' ? 'animate-slide-out-right' : ''}`}>
                        <div className="w-full h-full bg-gradient-to-br from-violet-500 via-purple-500 to-indigo-600 p-8 flex flex-col">
                            {/* Top badges */}
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-2">
                                    {currentCard.level && (
                                        <span className="px-3 py-1 bg-white/20 backdrop-blur-sm text-white text-xs font-bold rounded-full">
                                            {currentCard.level}
                                        </span>
                                    )}
                                    {currentCard.pos && (
                                        <span className="px-3 py-1 bg-white/20 backdrop-blur-sm text-white text-xs font-medium rounded-full">
                                            {POS_TYPES[currentCard.pos]?.label || currentCard.pos}
                                        </span>
                                    )}
                                </div>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        playAudio(currentCard.audioBase64, currentCard.front);
                                    }}
                                    className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
                                >
                                    <Volume2 className="w-5 h-5 text-white" />
                                </button>
                            </div>

                            {/* Main word */}
                            <div className="flex-1 flex flex-col items-center justify-center">
                                <p className="text-white/60 text-sm mb-4 uppercase tracking-widest">Từ vựng</p>
                                <h2 className="text-5xl md:text-6xl font-bold text-white text-center font-japanese leading-tight">
                                    {currentCard.front}
                                </h2>
                            </div>

                            {/* Flip hint */}
                            <div className="flex items-center justify-center gap-2 text-white/40 text-sm">
                                <RotateCw className="w-4 h-4" />
                                <span>Click hoặc nhấn Space để lật</span>
                            </div>
                        </div>
                    </div>

                    {/* Back - Meaning */}
                    <div className="absolute inset-0 backface-hidden rotate-y-180 rounded-3xl shadow-2xl overflow-hidden">
                        <div className="w-full h-full bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-600 p-8 flex flex-col overflow-y-auto">
                            {/* Top section */}
                            <div className="flex items-center justify-between mb-4">
                                <span className="text-white/60 text-sm uppercase tracking-widest">Ý nghĩa</span>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        playAudio(currentCard.audioBase64, currentCard.front);
                                    }}
                                    className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
                                >
                                    <Volume2 className="w-5 h-5 text-white" />
                                </button>
                            </div>

                            {/* Main meaning */}
                            <div className="flex-1 flex flex-col items-center justify-center">
                                <div className="text-3xl md:text-4xl font-bold text-white text-center leading-relaxed whitespace-pre-line">
                                    {formatMultipleMeanings(currentCard.back)}
                                </div>
                            </div>

                            {/* Additional info */}
                            <div className="space-y-3 mt-4 pt-4 border-t border-white/20">
                                {currentCard.sinoVietnamese && (
                                    <p className="text-white/80 text-sm text-center">
                                        <span className="font-semibold">Hán Việt:</span> {currentCard.sinoVietnamese}
                                    </p>
                                )}
                                {currentCard.synonym && (
                                    <p className="text-white/80 text-sm text-center">
                                        <span className="font-semibold">Đồng nghĩa:</span> {currentCard.synonym}
                                    </p>
                                )}
                                {currentCard.example && (
                                    <div className="text-center">
                                        <p className="text-white/90 text-sm italic">"{currentCard.example}"</p>
                                        {currentCard.exampleMeaning && (
                                            <p className="text-white/70 text-xs mt-1">{currentCard.exampleMeaning}</p>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Flip hint */}
                            <div className="flex items-center justify-center gap-2 text-white/40 text-sm mt-4">
                                <RotateCw className="w-4 h-4" />
                                <span>Click hoặc nhấn Space để lật</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Navigation buttons */}
            <div className="flex items-center justify-center gap-6 mt-8">
                <button
                    onClick={goToPrevious}
                    disabled={currentIndex === 0}
                    className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all
                        ${currentIndex === 0
                            ? 'bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
                            : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 shadow-lg hover:shadow-xl'}`}
                >
                    <ChevronLeft className="w-5 h-5" />
                    Trước
                </button>

                <button
                    onClick={goToNext}
                    className="flex items-center gap-2 px-6 py-3 rounded-xl font-medium bg-violet-500 hover:bg-violet-600 text-white shadow-lg hover:shadow-xl transition-all"
                >
                    {currentIndex === cards.length - 1 ? 'Hoàn thành' : 'Tiếp'}
                    <ChevronRight className="w-5 h-5" />
                </button>
            </div>

            {/* Instructions */}
            <p className="text-gray-500 dark:text-gray-400 text-xs text-center mt-6">
                ← → để chuyển thẻ • Space để lật • Vuốt trái/phải trên điện thoại
            </p>
        </div>
    );
};

export default FlashcardScreen;
