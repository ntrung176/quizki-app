import React, { useState, useEffect } from 'react';
import FuriganaText from './FuriganaText';
import { speakJapanese } from '../../utils/audio';
import { POS_TYPES } from '../../config/constants';

const getCardScaleStyles = (card, settings) => {
    if (!card) return {};
    const textLength = card.front ? card.front.length : 0;
    
    // Front side vocabulary font size: much larger, with auto-scaling to prevent wrapping
    let frontWordSize = "text-5xl md:text-6xl font-black";
    if (textLength > 12) {
        frontWordSize = "text-3xl md:text-4xl font-extrabold";
    } else if (textLength > 6) {
        frontWordSize = "text-4xl md:text-5xl font-extrabold";
    }

    const hasExample = card.example && settings?.back?.example;
    const exampleLines = hasExample ? card.example.split('\n').filter(e => e.trim()).length : 0;

    const showExamples = settings?.back?.example;

    // Default sizes (no examples or large mode)
    let wordSize = "text-3xl md:text-4xl font-extrabold leading-snug";
    let meaningSize = "text-2xl md:text-3xl font-bold mt-2";
    let exampleBoxPadding = "p-5";
    let exampleItemGap = "space-y-2.5";
    let exampleTitleSize = "text-[13px]";
    let exampleTextSize = "text-[18px] md:text-[20px] leading-relaxed font-bold";
    let exampleMeaningSize = "text-[15px] md:text-[16px] font-sans mt-1.5 leading-relaxed";
    let cardPadding = "p-6 pb-12";
    let titleSize = "text-xl font-bold";

    if (showExamples && exampleLines > 0) {
        if (exampleLines >= 3 || (card.back?.length || 0) > 240) {
            // Small scale: 3 or more example sentences
            wordSize = "text-xl md:text-2xl font-semibold leading-normal";
            meaningSize = "text-lg md:text-xl font-semibold mt-1";
            titleSize = "text-base font-bold";
            exampleBoxPadding = "p-2.5";
            exampleItemGap = "space-y-1.5";
            exampleTitleSize = "text-[9.5px]";
            exampleTextSize = "text-[13px] md:text-[14px] leading-normal font-medium";
            exampleMeaningSize = "text-[11px] md:text-[12px] font-sans mt-0.5 leading-normal";
            cardPadding = "p-4 pb-12";
        } else if (exampleLines === 2 || (card.back?.length || 0) > 150) {
            // Medium scale: 2 example sentences
            wordSize = "text-2xl md:text-3xl font-bold leading-normal";
            meaningSize = "text-xl md:text-2xl font-bold mt-1.5";
            titleSize = "text-lg font-bold";
            exampleBoxPadding = "p-3.5";
            exampleItemGap = "space-y-2";
            exampleTitleSize = "text-[11.5px]";
            exampleTextSize = "text-[15px] md:text-[16.5px] leading-relaxed font-semibold";
            exampleMeaningSize = "text-[13px] md:text-[14px] font-sans mt-1 leading-snug";
            cardPadding = "p-5 pb-12";
        } else {
            // 1 example sentence: Large scale
            wordSize = "text-3xl md:text-4xl font-extrabold leading-snug";
            meaningSize = "text-2xl md:text-3xl font-bold mt-2";
            titleSize = "text-xl font-bold";
            exampleBoxPadding = "p-5";
            exampleItemGap = "space-y-2.5";
            exampleTitleSize = "text-[13px]";
            exampleTextSize = "text-[18px] md:text-[20px] leading-relaxed font-bold";
            exampleMeaningSize = "text-[15px] md:text-[16px] font-sans mt-1.5 leading-relaxed";
            cardPadding = "p-6 pb-12";
        }
    } else {
        // If there are no examples, let's keep word and meaning sizes large (default)
        wordSize = "text-3xl md:text-4xl font-extrabold leading-snug";
        meaningSize = "text-2xl md:text-3xl font-bold mt-2";
    }

    return {
        wordSize,
        frontWordSize,
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

const Flashcard = ({
    card,
    cardSettings,
    isFlipped,
    onFlip,
    slideDirection = '',
    onSwipeLeft,
    onSwipeRight,
    onSaveCardAudio,
    variant = 'default', // 'default' | 'emerald' | 'review'
    transitionEnabled = true
}) => {
    const [touchStart, setTouchStart] = useState(null);
    const [touchEnd, setTouchEnd] = useState(null);
    const [swipeOffset, setSwipeOffset] = useState(0);
    const minSwipeDistance = 50;

    // Reset swipe state when card changes
    useEffect(() => {
        setTouchStart(null);
        setTouchEnd(null);
        setSwipeOffset(0);
    }, [card]);

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

        if (isLeftSwipe && onSwipeLeft) {
            onSwipeLeft();
        } else if (isRightSwipe && onSwipeRight) {
            onSwipeRight();
        }

        setTouchStart(null);
        setTouchEnd(null);
        setSwipeOffset(0);
    };

    if (!card) return null;

    const scale = getCardScaleStyles(card, cardSettings);

    const renderFrontContent = () => {
        let wordColorClass = "text-slate-800 dark:text-white";
        let hanvietColorClass = "text-slate-600 dark:text-slate-400";

        if (variant === 'review') {
            wordColorClass = "text-white";
            hanvietColorClass = "text-amber-200";
        }

        return (
            <div className="flex-1 flex flex-col items-center justify-center text-center space-y-4 w-full">
                {cardSettings.front.word && (
                    <div className={`${scale.frontWordSize} font-bold ${wordColorClass} font-japanese select-none leading-relaxed`}>
                        <FuriganaText text={card.frontWithFurigana || card.front} forceHide={!cardSettings.front.furigana} />
                    </div>
                )}
                {cardSettings.front.hanviet && card.sinoVietnamese && (
                    <p className={`${hanvietColorClass} text-[15px] md:text-base font-bold`}>
                        <span className={variant === 'review' ? "text-indigo-200 font-normal" : "text-slate-400 dark:text-slate-500 font-normal"}>Hán Việt: </span>{card.sinoVietnamese}
                    </p>
                )}
            </div>
        );
    };

    const renderBackContent = () => {
        // Render variant-based back styles
        let wordColorClass = "text-slate-800 dark:text-white";
        let readingColorClass = "text-slate-800 dark:text-white";
        let hanvietColorClass = "text-slate-600 dark:text-slate-400";
        let exampleBoxClass = "bg-slate-50/50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800";
        let exampleTextClass = "text-slate-700 dark:text-slate-300";
        let exampleMeaningClass = `${scale.exampleMeaningSize} text-slate-500 dark:text-slate-400 font-sans mt-0.5`;
        let meaningColorClass = "text-slate-800 dark:text-white font-extrabold";

        if (variant === 'review') {
            wordColorClass = "text-white";
            readingColorClass = "text-white";
            hanvietColorClass = "text-yellow-300";
            exampleBoxClass = "bg-white/10 border border-white/20";
            exampleTextClass = "text-emerald-55 dark:text-emerald-100";
            exampleMeaningClass = `${scale.exampleMeaningSize} text-emerald-200 mt-0.5 font-sans`;
            meaningColorClass = "text-white";
        }



        return (
            <div className={`flex-1 flex ${card.imageBase64 && variant !== 'review' ? 'flex-row' : 'flex-col md:flex-row'} items-center justify-center gap-4 md:gap-8 px-2 w-full h-full min-h-0`}>
                {card.imageBase64 && (
                    <div className="flex-shrink-0">
                        <img
                            src={card.imageBase64}
                            alt={card.front}
                            className={`w-24 h-24 sm:w-32 sm:h-32 md:w-44 md:h-44 rounded-2xl object-cover shadow-sm ${variant === 'review' ? 'border-4 border-white/30 shadow-lg' : 'border border-gray-200 dark:border-slate-700'}`}
                        />
                    </div>
                )}
                <div className={`flex flex-col items-center justify-center text-center min-w-0 space-y-1 w-full h-full py-1.5 ${card.imageBase64 && variant === 'review' ? 'text-left min-w-0 flex-1' : ''}`}>
                    {cardSettings.back.reading && (
                        <div className={`${scale.wordSize || 'text-3xl font-extrabold'} font-bold ${readingColorClass} font-japanese select-none leading-relaxed mb-0.5 flex items-center justify-center gap-2 flex-wrap`}>
                            <FuriganaText text={card.frontWithFurigana || card.front || ''} showReadingOnly={true} />
                            {card.pos && (
                                <span className={variant === 'review' ? 
                                    "inline-block px-2 py-0.5 bg-white/20 backdrop-blur-sm text-white text-[10px] font-semibold rounded-full font-sans" : 
                                    "inline-block px-2 py-0.5 bg-slate-50 dark:bg-slate-900/60 border border-slate-200/40 dark:border-slate-800 rounded-full text-[10px] font-semibold text-slate-500 dark:text-slate-400 font-sans"
                                }>
                                    {POS_TYPES[card.pos]?.label || card.pos}
                                </span>
                            )}
                        </div>
                    )}
                    {!cardSettings.back.reading && card.pos && (
                        <div className="text-center mb-0.5">
                            <span className={variant === 'review' ? 
                                "inline-block px-2 py-0.5 bg-white/20 backdrop-blur-sm text-white text-[10px] font-semibold rounded-full font-sans" : 
                                "inline-block px-2 py-0.5 bg-slate-50 dark:bg-slate-900/60 border border-slate-200/40 dark:border-slate-800 rounded-full text-[10px] font-semibold text-slate-500 dark:text-slate-400 font-sans"
                            }>
                                {POS_TYPES[card.pos]?.label || card.pos}
                            </span>
                        </div>
                    )}
                    {cardSettings.back.meaning && (
                        <div className={`${scale.meaningSize} font-bold ${meaningColorClass} break-words whitespace-pre-line leading-relaxed max-w-full`}>
                            {card.back}
                        </div>
                    )}
                    {((cardSettings.back.hanviet && card.sinoVietnamese) || (cardSettings.back.synonym && card.synonym)) && (
                        <div className="flex items-center justify-center gap-4 text-[14px] md:text-[15px] font-bold mt-1 flex-wrap">
                            {cardSettings.back.hanviet && card.sinoVietnamese && (
                                <span className={variant === 'review' ? 'text-yellow-300' : 'text-slate-700 dark:text-slate-300'}>
                                    <span className={variant === 'review' ? "text-emerald-100 font-normal" : "text-slate-400 dark:text-slate-500 font-normal"}>Hán Việt: </span>{card.sinoVietnamese}
                                </span>
                            )}
                            {cardSettings.back.hanviet && card.sinoVietnamese && cardSettings.back.synonym && card.synonym && (
                                <span className={variant === 'review' ? 'text-white/25' : 'text-slate-200 dark:text-slate-700'}>|</span>
                            )}
                            {cardSettings.back.synonym && card.synonym && (
                                <span className={variant === 'review' ? 'text-emerald-105' : 'text-slate-800 dark:text-slate-300'}>
                                    <span className={variant === 'review' ? "text-emerald-100 font-normal" : "text-slate-400 dark:text-slate-500 font-normal"}>Đồng nghĩa: </span>
                                    <FuriganaText text={card.synonym} className={`font-japanese font-semibold ${variant === 'review' ? 'text-white' : 'text-slate-800 dark:text-slate-200'}`} />
                                </span>
                            )}
                        </div>
                    )}
                    {cardSettings.back.example && card.example && (
                        <div 
                            className={`mt-1.5 ${scale.exampleItemGap} text-left w-full max-w-full ${scale.exampleBoxPadding} ${exampleBoxClass} rounded-2xl overflow-y-auto flex-1 min-h-[60px] max-h-[160px] no-scrollbar`}
                            onClick={(e) => e.stopPropagation()}
                            onTouchStart={(e) => e.stopPropagation()}
                            onTouchMove={(e) => e.stopPropagation()}
                            onTouchEnd={(e) => e.stopPropagation()}
                        >
                            {card.example.split('\n').map(e => e.trim()).filter(e => e).map((ex, idx) => {
                                const meaning = (card.exampleMeaning || '').split('\n')[idx]?.trim();
                                return (
                                    <div key={idx} className={`border-l-2 ${variant === 'review' ? 'border-white/30' : 'border-indigo-500/30'} pl-3`}>
                                        <div className={`${scale.exampleTextSize} ${exampleTextClass} font-japanese leading-relaxed`}>
                                            <FuriganaText text={ex} />
                                        </div>
                                        {meaning && (
                                            <p className={exampleMeaningClass}>{meaning}</p>
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

    let frontCardClass = "";
    let backCardClass = "";

    if (variant === 'review') {
        frontCardClass = `absolute inset-0 backface-hidden bg-gradient-to-br from-indigo-500 to-purple-600 rounded-[32px] border-4 border-white shadow-2xl ${scale.cardPadding || 'p-6'} flex flex-col items-center w-full h-full hover:shadow-3xl transition-shadow relative overflow-hidden`;
        backCardClass = `absolute inset-0 backface-hidden rotate-y-180 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-[32px] border-4 border-white shadow-2xl ${scale.cardPadding || 'p-6'} flex flex-col items-center w-full h-full hover:shadow-3xl transition-shadow relative overflow-hidden`;
    } else {
        frontCardClass = `absolute inset-0 backface-hidden bg-white dark:bg-slate-800 rounded-[32px] border border-gray-200/80 dark:border-slate-700/80 shadow-lg shadow-gray-150/30 dark:shadow-none ${scale.cardPadding || 'p-6'} flex flex-col items-center text-center overflow-hidden w-full h-full transition-shadow hover:shadow-xl`;
        backCardClass = `absolute inset-0 backface-hidden rotate-y-180 bg-white dark:bg-slate-800 rounded-[32px] border border-gray-200/80 dark:border-slate-700/80 shadow-lg shadow-gray-150/30 dark:shadow-none ${scale.cardPadding || 'p-6'} flex flex-col items-center text-center overflow-hidden w-full h-full transition-shadow hover:shadow-xl`;
    }

    return (
        <div className="perspective-1000 w-full mx-auto relative select-none" style={{ height: '460px' }}>
            <div
                key={card?.id}
                className={`w-full transform-style-preserve-3d card-slide ${isFlipped ? 'rotate-y-180' : ''} ${slideDirection === 'left' ? 'slide-out-left' : slideDirection === 'right' ? 'slide-out-right' : ''}`}
                onClick={(e) => {
                    e.stopPropagation();
                    if (Math.abs(swipeOffset) < 10 && onFlip) {
                        onFlip();
                    }
                }}
                onTouchStart={onTouchStart}
                onTouchMove={onTouchMove}
                onTouchEnd={onTouchEnd}
                style={{
                    width: '100%',
                    height: '460px',
                    transform: swipeOffset ? `translateX(${swipeOffset}px)` : undefined,
                    transition: swipeOffset ? 'none' : (slideDirection ? 'transform 0.3s cubic-bezier(0.4, 0.0, 0.2, 1), opacity 0.3s ease' : (transitionEnabled ? 'transform 0.4s cubic-bezier(0.4, 0.0, 0.2, 1)' : 'none')),
                    touchAction: 'pan-y',
                }}
            >
                {/* Front Side */}
                <div className={frontCardClass}>
                    <div className="flex flex-col items-center justify-center min-h-full w-full py-4 pb-14 relative">
                        {!cardSettings.swapSides ? renderFrontContent() : renderBackContent()}
                    </div>
                    <div className="absolute bottom-4 left-0 right-0 text-center pointer-events-none">
                        <span className={`px-3.5 py-1.5 rounded-full text-xs font-semibold shadow-sm tracking-wide ${variant === 'review' ? 'bg-white/20 text-white' : 'bg-slate-50 border border-slate-200/40 dark:border-slate-800 text-slate-500 dark:text-slate-400 dark:bg-slate-900/60'}`}>
                            Nhấn để lật thẻ
                        </span>
                    </div>
                </div>

                {/* Back Side */}
                <div className={backCardClass}>
                    <div className="flex flex-col items-center justify-center min-h-full w-full py-4 pb-14 relative">
                        {!cardSettings.swapSides ? renderBackContent() : renderFrontContent()}
                    </div>
                    <div className="absolute bottom-4 left-0 right-0 text-center pointer-events-none">
                        <span className={`px-3.5 py-1.5 rounded-full text-xs font-semibold shadow-sm tracking-wide ${variant === 'review' ? 'bg-white/20 text-white' : 'bg-slate-50 border border-slate-200/40 dark:border-slate-800 text-slate-500 dark:text-slate-400 dark:bg-slate-900/60'}`}>
                            Nhấn để lật thẻ
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Flashcard;
