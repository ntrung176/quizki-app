import React, { useState, useEffect } from 'react';
import FuriganaText from './FuriganaText';
import { fetchJotobaWordData, accentNumberToPitchParts } from '../../utils/pitchAccent';
import { POS_TYPES, getPosLabel } from '../../config/constants';
import { isLeechCard } from '../../utils/srs';
import { useTargetLanguage } from '../../context/TargetLanguageContext';
import { formatIPA, isEnglishCard as checkIsEnglishCard } from '../../utils/englishVocab';
import InlineMnemonicEditor from './InlineMnemonicEditor';

const getCardScaleStyles = (card, settings) => {
    if (!card) return {};
    const textLength = card.front ? card.front.length : 0;

    // Front side vocabulary font size: responsive auto-scaling based on text length
    let frontWordSize = "text-4xl sm:text-5xl md:text-6xl font-black";
    if (textLength > 20) {
        frontWordSize = "text-xl sm:text-2xl md:text-3xl font-extrabold";
    } else if (textLength > 12) {
        frontWordSize = "text-2xl sm:text-3xl md:text-4xl font-extrabold";
    } else if (textLength > 6) {
        frontWordSize = "text-3xl sm:text-4xl md:text-5xl font-extrabold";
    }

    const hasExample = card.example && settings?.back?.example;
    const exampleLines = hasExample ? card.example.split('\n').filter(e => e.trim()).length : 0;

    const showExamples = settings?.back?.example;

    // Default sizes (no examples or large mode)
    let wordSize = (card.front?.length || 0) > 6 || (card.reading?.length || 0) > 6 
        ? "text-2xl sm:text-3xl md:text-4xl font-extrabold leading-snug" 
        : "text-3xl sm:text-4xl md:text-5xl font-extrabold leading-snug";
    let meaningSize = (card.back?.length || 0) > 15 
        ? "text-lg sm:text-xl md:text-2xl font-bold mt-1" 
        : "text-xl sm:text-2xl md:text-3xl font-bold mt-1.5";
    let exampleBoxPadding = "p-3 sm:p-4.5";
    let exampleItemGap = "space-y-2";
    let exampleTitleSize = "text-[12px]";
    let exampleTextSize = "text-[15px] sm:text-[17px] md:text-[19px] leading-relaxed font-bold";
    let exampleMeaningSize = "text-[13px] sm:text-[14px] md:text-[15px] font-sans mt-1 leading-relaxed";
    let cardPadding = "p-4 sm:p-5 md:p-6";
    let titleSize = "text-lg sm:text-xl font-bold";

    if (showExamples && exampleLines > 0) {
        if (exampleLines >= 3 || (card.back?.length || 0) > 240) {
            // Small scale: 3 or more example sentences
            wordSize = "text-lg sm:text-xl md:text-2xl font-semibold leading-normal";
            meaningSize = "text-base sm:text-lg md:text-xl font-semibold mt-0.5";
            titleSize = "text-sm sm:text-base font-bold";
            exampleBoxPadding = "p-2.5 sm:p-3";
            exampleItemGap = "space-y-1.5";
            exampleTitleSize = "text-[9.5px]";
            exampleTextSize = "text-[12px] sm:text-[13px] md:text-[14px] leading-normal font-medium";
            exampleMeaningSize = "text-[10.5px] sm:text-[11px] md:text-[12px] font-sans mt-0.5 leading-normal";
            cardPadding = "p-3.5 sm:p-4";
        } else if (exampleLines === 2 || (card.back?.length || 0) > 150) {
            // Medium scale: 2 example sentences
            wordSize = "text-xl sm:text-2xl md:text-3xl font-bold leading-normal";
            meaningSize = "text-lg sm:text-xl md:text-2xl font-bold mt-1";
            titleSize = "text-base sm:text-lg font-bold";
            exampleBoxPadding = "p-3 sm:p-3.5";
            exampleItemGap = "space-y-1.5";
            exampleTitleSize = "text-[11px]";
            exampleTextSize = "text-[14px] sm:text-[15px] md:text-[16.5px] leading-relaxed font-semibold";
            exampleMeaningSize = "text-[12px] sm:text-[13px] md:text-[14px] font-sans mt-1 leading-snug";
            cardPadding = "p-4 sm:p-5";
        } else {
            // 1 example sentence: Large scale
            wordSize = "text-2xl sm:text-3xl md:text-4xl font-extrabold leading-snug";
            meaningSize = "text-xl sm:text-2xl md:text-3xl font-bold mt-1.5";
            titleSize = "text-lg sm:text-xl font-bold";
            exampleBoxPadding = "p-3.5 sm:p-4.5";
            exampleItemGap = "space-y-2";
            exampleTitleSize = "text-[12px]";
            exampleTextSize = "text-[15px] sm:text-[17px] md:text-[19px] leading-relaxed font-bold";
            exampleMeaningSize = "text-[13px] sm:text-[14px] md:text-[15px] font-sans mt-1 leading-relaxed";
            cardPadding = "p-4 sm:p-5 md:p-6";
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

const parseWordAndReading = (text) => {
    if (!text) return { word: '', reading: '' };
    const match = text.match(/^([^\s（\(\[）\)\]]+)[（\(\[]([\u3040-\u309F\u30A0-\u30FF\s]+)[）\)\]]$/);
    if (match) {
        return {
            word: match[1].trim(),
            reading: match[2].trim()
        };
    }
    const word = text.replace(/\s*[（(][^）)]*[）)]/g, '').trim();
    const parenMatch = text.match(/[（(]([^）)]+)[）)]/);
    const reading = parenMatch ? parenMatch[1].trim() : '';
    return { word, reading };
};

const hasKanji = (str) => /[\u4e00-\u9faf]/.test(str);

const Flashcard = ({
    card,
    cardSettings,
    isFlipped,
    onFlip,
    onSaveCardAudio,
    onEditMnemonic,
    onSaveMnemonic,
    onGeminiAssist,
    variant = 'default', // 'default' | 'emerald' | 'review'
    transitionEnabled = true,
    showFlipHint = true,
    hasCheckedTyping = false
}) => {
    const [pitchData, setPitchData] = useState(null);
    const [isEditingMnemonic, setIsEditingMnemonic] = useState(false);

    useEffect(() => {
        setIsEditingMnemonic(false);
    }, [card]);

    useEffect(() => {
        if (!card) return;
        
        const frontText = card.frontWithFurigana || card.front || '';
        const { word, reading } = parseWordAndReading(frontText);
        const hasLocalReading = card.reading || reading;
        const hasLocalPitch = card.pitch || (card.accent !== undefined && card.accent !== '' && card.accent !== null);
        
        if (hasLocalReading && hasLocalPitch) {
            setPitchData(null);
            return;
        }

        const cleanWord = frontText.split('（')[0].split('(')[0].replace(/\s*[（(][^）)]*[）)]/g, '').trim();
        if (isEnglishCard || !cleanWord) {
            setPitchData(null);
            return;
        }

        let isMounted = true;
        // Debounce pitch accent fetching to prevent thread lock when flipping cards rapidly
        const fetchTimer = setTimeout(() => {
            const fetchPitch = async () => {
                try {
                    const data = await fetchJotobaWordData(cleanWord);
                    if (isMounted) {
                        setPitchData(data);
                    }
                } catch (e) {
                    console.warn('Error fetching pitch in Flashcard:', e);
                    if (isMounted) setPitchData(null);
                }
            };
            fetchPitch();
        }, 250);

        return () => {
            isMounted = false;
            clearTimeout(fetchTimer);
        };
    }, [card]);

    const { targetLanguage, isEnglishMode } = useTargetLanguage();

    if (!card) return null;

    const scale = getCardScaleStyles(card, cardSettings);
    const isEnglishCard = checkIsEnglishCard(card, isEnglishMode);

    const isTypingMode = cardSettings?.reviewType === 'typing';
    const isTypingBlocked = isTypingMode && !hasCheckedTyping && !cardSettings?.hasCheckedTyping;

    const renderFrontContent = () => {
        let wordColorClass = "text-slate-800 dark:text-white";
        let hanvietColorClass = "text-slate-600 dark:text-slate-400";

        if (variant === 'review' || variant === 'emerald') {
            wordColorClass = "text-white";
            hanvietColorClass = "text-amber-200";
        }

        // Khi swapSides = true: Mặt trước là Nghĩa tiếng Việt (Prompt)
        if (cardSettings?.swapSides) {
            return (
                <div className="flex-1 flex flex-col items-center justify-center text-center space-y-3 sm:space-y-4 w-full my-auto px-2 py-2 overflow-y-auto no-scrollbar">
                    {isLeechCard(card) && (
                        <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950/80 border border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-[11px] font-bold shadow-sm animate-pulse mb-1">
                            <span>🩸 Thẻ khó thuộc (Quên {card.lapseCount || card.srsLapseCount || 3} lần)</span>
                        </div>
                    )}
                    {card.pos && (
                        <span className={variant === 'review' || variant === 'emerald' ? 
                            "inline-block px-2.5 py-0.5 bg-white/20 backdrop-blur-sm text-white text-xs font-semibold rounded-full font-sans mb-1" : 
                            "inline-block px-2.5 py-0.5 bg-slate-100 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800 rounded-full text-xs font-semibold text-slate-500 dark:text-slate-400 font-sans mb-1"
                        }>
                            {getPosLabel(card.pos)}
                        </span>
                    )}
                    <div className={`${scale.frontWordSize} font-bold ${wordColorClass} select-none leading-relaxed break-words overflow-wrap-anywhere max-w-full w-full text-center px-2`}>
                        {card.back}
                    </div>
                </div>
            );
        }

        // Khi swapSides = false: Mặt trước là Từ vựng tiếng Nhật (Prompt)
        return (
            <div className="flex-1 flex flex-col items-center justify-center text-center space-y-3 sm:space-y-4 w-full my-auto px-2 py-2 overflow-y-auto no-scrollbar">
                {isLeechCard(card) && (
                    <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950/80 border border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-[11px] font-bold shadow-sm animate-pulse mb-1">
                        <span>🩸 Thẻ khó thuộc (Quên {card.lapseCount || card.srsLapseCount || 3} lần)</span>
                    </div>
                )}
                {cardSettings.front.word && (
                    <div className={`${scale.frontWordSize} font-bold ${wordColorClass} select-none leading-relaxed break-words overflow-wrap-anywhere max-w-full w-full text-center px-2 flex flex-col items-center justify-center gap-2`}>
                        {isEnglishCard ? (
                            <>
                                <span>{card.front}</span>
                                {formatIPA(card.ipa, card.front) && (
                                    <span className="text-sm sm:text-base font-mono font-medium text-indigo-500 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-3 py-0.5 rounded-full border border-indigo-200/60 dark:border-indigo-800/60">
                                        {formatIPA(card.ipa, card.front)}
                                    </span>
                                )}
                            </>
                        ) : (
                            <FuriganaText text={card.frontWithFurigana || card.front} knownReading={card.reading} forceHide={!cardSettings.front.furigana} className="break-words whitespace-normal text-center" />
                        )}
                    </div>
                )}
                {!isEnglishCard && !cardSettings.front.word && cardSettings.front.furigana && (
                    <div className={`${scale.frontWordSize} font-bold ${wordColorClass} font-japanese select-none leading-relaxed break-words overflow-wrap-anywhere max-w-full w-full text-center px-2`}>
                        <FuriganaText text={card.frontWithFurigana || card.front} knownReading={card.reading} showReadingOnly={true} className="break-words whitespace-normal text-center" />
                    </div>
                )}
                {/* Ở chế độ typing: Không hiển thị Hán Việt ở mặt trước trước khi kiểm tra đáp án để tránh lộ nghĩa tiếng Việt */}
                {!isEnglishCard && cardSettings.front.hanviet && card.sinoVietnamese && (!isTypingMode || hasCheckedTyping) && (
                    <p className={`${hanvietColorClass} text-[15px] md:text-base font-bold break-words`}>
                        <span className={variant === 'review' || variant === 'emerald' ? "text-indigo-200 font-normal" : "text-slate-400 dark:text-slate-500 font-normal"}>Hán Việt: </span>{card.sinoVietnamese}
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
        let exampleBoxClass = "bg-slate-50/60 dark:bg-slate-900/40 border border-slate-200/70 dark:border-slate-800";
        let exampleTextClass = "text-slate-700 dark:text-slate-300";
        let exampleMeaningClass = `${scale.exampleMeaningSize} text-slate-500 dark:text-slate-400 font-sans mt-0.5`;
        let meaningColorClass = "text-slate-800 dark:text-white font-extrabold";

        if (variant === 'review' || variant === 'emerald') {
            wordColorClass = "text-white";
            readingColorClass = "text-white";
            hanvietColorClass = "text-yellow-300";
            exampleBoxClass = "bg-white/10 border border-white/20";
            exampleTextClass = "text-emerald-55 dark:text-emerald-100";
            exampleMeaningClass = `${scale.exampleMeaningSize} text-emerald-200 mt-0.5 font-sans`;
            meaningColorClass = "text-white";
        }

        const showReading = isTypingMode || cardSettings.back.reading;
        const showMeaning = isTypingMode || cardSettings.back.meaning;
        const showHanviet = isTypingMode || cardSettings.back.hanviet;
        const showSynonym = isTypingMode || cardSettings.back.synonym;
        // Ở chế độ typing: Không hiển thị sắc thái trên thẻ mà xem qua popup nút bóng đèn ở thanh công cụ trên cùng
        const showNuance = !isTypingMode && cardSettings.back.nuance === true;
        const showExample = isTypingMode || cardSettings.back.example;
        const showPitchAccent = isTypingMode || cardSettings.back.pitchAccent !== false;
        const showSynonymFurigana = isTypingMode || cardSettings.back.synonymFurigana !== false;
        const showExampleFurigana = isTypingMode || cardSettings.back.exampleFurigana !== false;
        const showExampleMeaning = isTypingMode || cardSettings.back.exampleMeaning !== false;

        const renderReadingWithPitchAccent = () => {
            const text = card.frontWithFurigana || card.front || '';
            const { word, reading } = parseWordAndReading(text);
            
            const jotobaReading = pitchData?.reading || null;
            const finalReading = reading || card.reading || jotobaReading || word;
            
            const cardPitchParts = card.pitch || (card.accent !== undefined && card.accent !== null && card.accent !== '' ? accentNumberToPitchParts(finalReading, card.accent) : null);
            const pitchParts = cardPitchParts || pitchData?.pitch || null;
            if (!finalReading) {
                return <FuriganaText text={text} showReadingOnly={true} className="break-words whitespace-normal text-center" />;
            }

            const readingChars = [...finalReading];
            
            const showPitchLines = showPitchAccent && pitchParts && pitchParts.length > 0;
            if (showPitchLines) {
                const charPitchMap = [];
                for (const pp of pitchParts) {
                    const partChars = [...pp.part];
                    for (const c of partChars) {
                        charPitchMap.push({ char: c, high: pp.high });
                    }
                }
                
                const lineColor = '#ef4444'; // Standard NHK Red

                return (
                    <span className="font-japanese inline-flex items-end gap-0 flex-wrap justify-center break-words max-w-full">
                        {readingChars.map((char, ci) => {
                            const pm = charPitchMap[ci];
                            const isHigh = pm ? pm.high : false;
                            const nextHigh = ci + 1 < charPitchMap.length ? charPitchMap[ci + 1]?.high : isHigh;
                            const showTransition = ci + 1 < charPitchMap.length && isHigh !== nextHigh;
                            
                            return (
                                <span key={ci} className="relative inline-block" style={{ marginRight: '0px' }}>
                                    <span
                                        className="block animate-fade-in"
                                        style={{
                                            borderTop: `2px solid ${isHigh ? lineColor : 'transparent'}`,
                                            borderBottom: `2px solid ${!isHigh ? lineColor : 'transparent'}`,
                                            paddingTop: '0px',
                                            paddingBottom: '0px',
                                            paddingLeft: '1.5px',
                                            paddingRight: '1.5px',
                                            lineHeight: '1.1',
                                        }}
                                    >
                                        <span className={readingColorClass}>{char}</span>
                                    </span>
                                    {showTransition && (
                                        <span 
                                            className="absolute -right-[1px] top-0 bottom-0 w-[2px]" 
                                            style={{ backgroundColor: lineColor }}
                                        />
                                    )}
                                </span>
                            );
                        })}
                    </span>
                );
            } else {
                return (
                    <span className={`font-japanese ${readingColorClass} break-words whitespace-normal`}>
                        {finalReading}
                    </span>
                );
            }
        };

        return (
            <div className={`flex-1 flex ${(card.imageUrl || card.imageBase64) && variant !== 'review' && variant !== 'emerald' ? 'flex-row' : 'flex-col md:flex-row'} items-center justify-center gap-3 md:gap-6 px-1 w-full h-full min-h-0`}>
                {(card.imageUrl || card.imageBase64) && (
                    <div className="flex-shrink-0">
                        <img
                             src={card.imageUrl || card.imageBase64}
                             alt={card.front}
                             className={`w-20 h-20 sm:w-28 sm:h-28 md:w-40 md:h-40 rounded-2xl object-cover shadow-sm ${variant === 'review' || variant === 'emerald' ? 'border-4 border-white/30 shadow-lg' : 'border border-gray-200 dark:border-slate-700'}`}
                        />
                    </div>
                )}
                <div className={`flex flex-col items-center justify-center text-center min-w-0 space-y-2 sm:space-y-2.5 w-full my-auto py-1 overflow-y-auto no-scrollbar max-h-full ${(card.imageUrl || card.imageBase64) && (variant === 'review' || variant === 'emerald') ? 'text-left min-w-0 flex-1' : ''}`}>
                    {/* Khi ở chế độ swapSides: Hiển thị lại từ vựng Kanji/Furigana ở mặt đáp án */}
                    {cardSettings?.swapSides && (
                        <div className={`${scale.wordSize || 'text-3xl font-extrabold'} font-bold ${wordColorClass} select-none leading-relaxed mb-0.5 flex items-center justify-center gap-2 flex-wrap max-w-full w-full text-center px-2 break-words`}>
                            {isEnglishCard ? (
                                <span>{card.front}</span>
                            ) : (
                                <FuriganaText text={card.frontWithFurigana || card.front} knownReading={card.reading} forceHide={false} className="break-words whitespace-normal text-center" />
                            )}
                        </div>
                    )}
                    {isEnglishCard ? (
                        (formatIPA(card.ipa, card.front) || card.pos) && (
                            <div className="flex items-center justify-center gap-2 flex-wrap mb-1">
                                {formatIPA(card.ipa, card.front) && (isTypingMode || cardSettings.back.ipa !== false) && (
                                    <span className="text-base sm:text-lg font-mono font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-3 py-0.5 rounded-full border border-indigo-200/60 dark:border-indigo-800/60">
                                        {formatIPA(card.ipa, card.front)}
                                    </span>
                                )}
                                {card.pos && (isTypingMode || cardSettings.back.pos !== false) && (
                                    <span className={variant === 'review' || variant === 'emerald' ? 
                                        "inline-block px-2.5 py-0.5 bg-white/20 backdrop-blur-sm text-white text-xs font-semibold rounded-full font-sans" : 
                                        "inline-block px-2.5 py-0.5 bg-slate-100 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800 rounded-full text-xs font-semibold text-slate-500 dark:text-slate-400 font-sans"
                                    }>
                                        {getPosLabel(card.pos)}
                                    </span>
                                )}
                            </div>
                        )
                    ) : (
                        showReading && (
                            <div className={`${scale.wordSize || 'text-3xl font-extrabold'} font-bold ${readingColorClass} font-japanese select-none leading-relaxed mb-0.5 flex items-center justify-center gap-2 flex-wrap max-w-full w-full text-center px-2 break-words`}>
                                {renderReadingWithPitchAccent()}
                                {card.pos && (
                                    <span className={variant === 'review' || variant === 'emerald' ? 
                                        "inline-block px-2 py-0.5 bg-white/20 backdrop-blur-sm text-white text-[10px] font-semibold rounded-full font-sans" : 
                                        "inline-block px-2 py-0.5 bg-slate-100 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800 rounded-full text-[10px] font-semibold text-slate-500 dark:text-slate-400 font-sans"
                                    }>
                                        {getPosLabel(card.pos)}
                                    </span>
                                )}
                            </div>
                        )
                    )}
                    {showMeaning && (
                        <div className={`${scale.meaningSize} font-bold ${meaningColorClass} break-words whitespace-pre-line leading-relaxed max-w-full px-2`}>
                            {card.back}
                        </div>
                    )}
                    {((showHanviet && (card.sinoVietnamese || card.ipa)) || (showSynonym && card.synonym)) && (
                        <div className="flex items-baseline justify-center gap-3 text-[13px] md:text-[14px] font-bold mt-0.5 flex-wrap">
                            {showHanviet && (card.sinoVietnamese || card.ipa) && (
                                <span className={`inline-flex items-baseline ${variant === 'review' || variant === 'emerald' ? 'text-yellow-300' : 'text-slate-700 dark:text-slate-300'}`}>
                                    <span className={variant === 'review' || variant === 'emerald' ? "text-emerald-100 font-normal mr-1" : "text-slate-400 dark:text-slate-500 font-normal mr-1"}>
                                        {card.ipa ? 'IPA:' : 'Hán Việt:'}
                                    </span>
                                    {card.ipa || card.sinoVietnamese}
                                </span>
                            )}
                            {showHanviet && card.sinoVietnamese && showSynonym && card.synonym && (
                                <span className={`inline-block ${variant === 'review' || variant === 'emerald' ? 'text-white/25' : 'text-slate-200 dark:text-slate-700'}`}>|</span>
                            )}
                            {showSynonym && card.synonym && (
                                <span className={`inline-flex items-baseline gap-1 ${variant === 'review' || variant === 'emerald' ? 'text-emerald-105' : 'text-slate-800 dark:text-slate-300'}`}>
                                    <span className={variant === 'review' || variant === 'emerald' ? "text-emerald-100 font-normal shrink-0" : "text-slate-400 dark:text-slate-500 font-normal shrink-0"}>Đồng nghĩa: </span>
                                    {isEnglishCard ? (
                                        <span className={`font-semibold ${variant === 'review' || variant === 'emerald' ? 'text-white' : 'text-slate-800 dark:text-slate-200'}`}>{card.synonym}</span>
                                    ) : (
                                        <FuriganaText text={card.synonym} forceHide={showSynonymFurigana === false} className={`font-japanese font-semibold ${variant === 'review' || variant === 'emerald' ? 'text-white' : 'text-slate-800 dark:text-slate-200'}`} />
                                    )}
                                </span>
                            )}
                        </div>
                    )}
                    {showNuance && card.nuance && (
                        <div className="text-xs text-amber-700 dark:text-amber-300 bg-amber-500/10 border border-amber-500/20 rounded-xl p-2 max-w-full text-left font-medium mt-1">
                            💡 <span className="font-bold">Sắc thái:</span> {card.nuance}
                        </div>
                    )}
                    {(() => {
                        const isLeech = isLeechCard(card) || card.isLeech || (card.srsLapseCount >= 3) || (card.lapseCount >= 3);
                        const hasCustomMnemonic = !!(card.userMnemonic || card.customMnemonic);

                        if (isEditingMnemonic) {
                            return (
                                <InlineMnemonicEditor
                                    initialText={card.userMnemonic || card.customMnemonic || card.mnemonic || ''}
                                    card={card}
                                    onSave={async (newText) => {
                                        card.userMnemonic = newText;
                                        card.customMnemonic = newText;
                                        card.mnemonic = newText;
                                        setIsEditingMnemonic(false);
                                        if (onSaveMnemonic) await onSaveMnemonic(card, newText);
                                        else if (onEditMnemonic) await onEditMnemonic(card, newText);
                                    }}
                                    onCancel={() => setIsEditingMnemonic(false)}
                                    onGeminiAssist={onGeminiAssist}
                                />
                            );
                        }

                        if (isLeech || hasCustomMnemonic) {
                            return (
                                <div className="w-full text-left mt-1.5">
                                    {(card.userMnemonic || card.customMnemonic || card.mnemonic) ? (
                                        <div className="text-xs text-amber-950 dark:text-amber-100 bg-amber-500/15 border border-amber-500/30 rounded-2xl p-2.5 max-w-full font-medium leading-relaxed flex items-start justify-between gap-2 shadow-sm">
                                            <div className="flex-1">
                                                <span className="font-bold text-amber-800 dark:text-amber-300 block mb-0.5">💡 Mẹo nhớ cá nhân:</span>
                                                <span className="whitespace-pre-line">{card.userMnemonic || card.customMnemonic || card.mnemonic}</span>
                                            </div>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); setIsEditingMnemonic(true); }}
                                                className="text-[11px] font-bold text-amber-700 dark:text-amber-300 underline hover:opacity-80 shrink-0 cursor-pointer"
                                            >
                                                Sửa
                                            </button>
                                        </div>
                                    ) : (
                                        <button
                                            onClick={(e) => { e.stopPropagation(); setIsEditingMnemonic(true); }}
                                            className="w-full py-1.5 px-3 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                                        >
                                            💡 + Thêm mẹo nhớ cá nhân
                                        </button>
                                    )}
                                </div>
                            );
                        }

                        return null;
                    })()}
                    {showExample && card.example && (
                        <div 
                            className={`mt-1.5 ${scale.exampleItemGap} text-left w-full max-w-full ${scale.exampleBoxPadding} ${exampleBoxClass} rounded-2xl overflow-y-auto flex-1 min-h-[60px] max-h-[150px] sm:max-h-[220px] no-scrollbar cursor-pointer`}
                            onTouchStart={(e) => e.stopPropagation()}
                            onTouchMove={(e) => e.stopPropagation()}
                            onTouchEnd={(e) => e.stopPropagation()}
                        >
                            {card.example.split('\n').map(e => e.trim()).filter(e => e).map((ex, idx) => {
                                const meaning = (card.exampleMeaning || '').split('\n')[idx]?.trim();
                                return (
                                    <div key={idx} className={`border-l-2 ${variant === 'review' || variant === 'emerald' ? 'border-white/30' : 'border-indigo-500/30'} pl-3`}>
                                        <div className={`${scale.exampleTextSize} ${exampleTextClass} ${isEnglishCard ? 'font-sans' : 'font-japanese'} leading-relaxed`}>
                                            {isEnglishCard ? ex : <FuriganaText text={ex} forceHide={showExampleFurigana === false} />}
                                        </div>
                                        {meaning && showExampleMeaning !== false && (
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

    if (variant === 'review' || variant === 'emerald') {
        frontCardClass = `absolute inset-0 backface-hidden bg-gradient-to-br from-indigo-500 to-sky-500 rounded-[32px] border-4 border-white shadow-2xl ${scale.cardPadding || 'p-4 sm:p-6'} flex flex-col items-center w-full h-full hover:shadow-3xl transition-shadow overflow-hidden`;
        backCardClass = `absolute inset-0 backface-hidden rotate-y-180 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-[32px] border-4 border-white shadow-2xl ${scale.cardPadding || 'p-4 sm:p-6'} flex flex-col items-center w-full h-full hover:shadow-3xl transition-shadow overflow-hidden`;
    } else {
        frontCardClass = `absolute inset-0 backface-hidden bg-white dark:bg-slate-800 rounded-[32px] border border-gray-200/80 dark:border-slate-700/80 shadow-lg shadow-gray-150/30 dark:shadow-none ${scale.cardPadding || 'p-4 sm:p-6'} flex flex-col items-center text-center overflow-hidden w-full h-full transition-shadow hover:shadow-xl`;
        backCardClass = `absolute inset-0 backface-hidden rotate-y-180 bg-white dark:bg-slate-800 rounded-[32px] border border-gray-200/80 dark:border-slate-700/80 shadow-lg shadow-gray-150/30 dark:shadow-none ${scale.cardPadding || 'p-4 sm:p-6'} flex flex-col items-center text-center overflow-hidden w-full h-full transition-shadow hover:shadow-xl`;
    }

    return (
        <div className={`perspective-1000 w-full mx-auto relative select-none ${isTypingBlocked ? 'cursor-default' : 'cursor-pointer'}`}>
            <div
                className={`w-full transform-style-preserve-3d card-slide ${isFlipped ? 'rotate-y-180' : ''}`}
                onClick={(e) => {
                    e.stopPropagation();
                    // Khi ở chế độ typing thì chỉ chặn lật khi người dùng chưa kiểm tra đáp án
                    if (isTypingBlocked) {
                        return;
                    }
                    if (onFlip) {
                        onFlip();
                    }
                }}
                style={{
                    width: '100%',
                    height: '390px',
                    transition: transitionEnabled ? 'transform 0.4s cubic-bezier(0.4, 0.0, 0.2, 1)' : 'none',
                }}
            >
                {/* Front Side */}
                <div className={frontCardClass}>
                    <div className="flex flex-col items-center justify-center min-h-full w-full relative h-full my-auto">
                        {renderFrontContent()}
                    </div>
                </div>

                {/* Back Side */}
                <div className={backCardClass}>
                    <div className="flex flex-col items-center justify-center min-h-full w-full relative h-full my-auto">
                        {renderBackContent()}
                    </div>
                </div>
            </div>

            {/* Hint text OUTSIDE flashcard - Evenly spaced between flashcard and bottom buttons */}
            {showFlipHint && !isTypingMode && (
                <div className="w-full text-center py-2 pointer-events-none z-20 flex justify-center">
                    <span className={`px-3.5 py-1 rounded-full text-xs font-semibold shadow-sm tracking-wide ${
                        variant === 'review' 
                            ? 'bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border border-indigo-300/40 dark:border-indigo-800/40 backdrop-blur-sm' 
                            : 'bg-slate-100/90 dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 text-slate-600 dark:text-slate-400'
                    }`}>
                        Nhấn để lật thẻ
                    </span>
                </div>
            )}
        </div>
    );
};

export default Flashcard;
