import React from 'react';
import { Eye, EyeOff, Volume2 } from 'lucide-react';
import FuriganaText from '../ui/FuriganaText';
import { getPosLabel } from '../../config/constants';
import { speakJapanese } from '../../utils/audio';
import { getWordForMasking, getReadingForMasking, maskWordInExample } from '../../utils/textProcessing';
import { formatMultipleMeanings } from './reviewHelpers';

const ReviewQuestionCard = ({
    currentCard,
    reviewMode,
    cardReviewType,
    inputMode,
    setInputMode,
    isMultipleChoice,
    promptInfo,
    blurVietnamese,
    setBlurVietnamese,
    revealedMeanings,
    setRevealedMeanings,
    synonymFuriganaEnabled,
    synonymVietnameseEnabled,
    exampleFuriganaEnabled,
    exampleVietnameseEnabled,
    meaningFuriganaEnabled,
    meaningHanvietEnabled,
    setInputValue,
    setHintCount,
    onSaveCardAudio
}) => {
    if (!currentCard) return null;

    // Compute dynamic length-based scale sizes
    const synLen = (currentCard.synonym || '').length;
    let synonymSize = 'text-2xl sm:text-3xl md:text-4xl';
    if (synLen > 24) synonymSize = 'text-base sm:text-lg md:text-xl';
    else if (synLen > 12) synonymSize = 'text-xl sm:text-2xl md:text-3xl';

    const frontLen = (currentCard.front || '').length;
    let frontWordSize = 'text-3xl sm:text-4xl md:text-5xl';
    if (frontLen > 18) frontWordSize = 'text-xl sm:text-2xl md:text-3xl';
    else if (frontLen > 9) frontWordSize = 'text-2xl sm:text-3xl md:text-4xl';

    const backStr = currentCard.back || '';
    const backLen = backStr.length;
    const backLines = backStr.split('\n').filter(Boolean).length;
    let meaningSize = 'text-xl sm:text-2xl md:text-3xl';
    if (backLen > 120 || backLines > 3) meaningSize = 'text-sm sm:text-base md:text-lg';
    else if (backLen > 60 || backLines > 2) meaningSize = 'text-base sm:text-lg md:text-xl';
    else if (backLen > 30) meaningSize = 'text-lg sm:text-xl md:text-2xl';

    const exJaLen = (promptInfo?.text || '').length;
    const exViLen = (promptInfo?.meaning || '').length;
    let exampleJaSize = 'text-lg sm:text-xl md:text-2xl';
    let exampleViSize = 'text-base sm:text-lg md:text-xl';
    if (exJaLen > 70 || exViLen > 100) {
        exampleJaSize = 'text-sm sm:text-base md:text-lg';
        exampleViSize = 'text-xs sm:text-sm md:text-base';
    } else if (exJaLen > 35 || exViLen > 50) {
        exampleJaSize = 'text-base sm:text-lg md:text-xl';
        exampleViSize = 'text-sm sm:text-base md:text-lg';
    }

    return (
        <div className="w-full bg-white dark:bg-slate-900 rounded-2xl shadow-xl p-4 sm:p-5 flex flex-col text-center relative border border-slate-200/80 dark:border-slate-800">
            {/* Header with mode label and toggle buttons */}
            <div className="w-full flex justify-between items-center mb-3 flex-shrink-0">
                <div className="flex items-center gap-2">
                    <span className="text-blue-500 text-xl">🔥</span>
                    <span className="text-slate-800 dark:text-slate-200 font-bold text-sm">
                        {reviewMode === 'meaning_input' ? (inputMode === 'reading' ? 'Nhập tiếng Nhật' : 'Nhập tiếng Việt') : (cardReviewType === 'back' ? (inputMode === 'reading' ? 'Cách đọc' : 'Ý nghĩa') : cardReviewType === 'synonym' ? 'Đồng nghĩa' : cardReviewType === 'dictation' ? 'Nghe chép' : 'Ngữ cảnh')}
                    </span>
                    {cardReviewType === 'example' && (
                        <button
                            onClick={(e) => { e.stopPropagation(); setBlurVietnamese(prev => !prev); setRevealedMeanings(new Set()); }}
                            className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium transition-all border cursor-pointer ${blurVietnamese
                                ? 'bg-amber-500/15 text-amber-600 dark:text-amber-300 border-amber-500/30 hover:bg-amber-500/25'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700'
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
                            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${inputMode === 'reading' ? 'bg-blue-600 text-white shadow-xs' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'}`}
                        >
                            Cách đọc
                        </button>
                        <button
                            onClick={() => { setInputMode('meaning'); setInputValue(''); setHintCount(0); }}
                            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${inputMode === 'meaning' ? 'bg-blue-600 text-white shadow-xs' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'}`}
                        >
                            Ý nghĩa
                        </button>
                    </div>
                )}
            </div>

            {/* Word display - scrollable content area */}
            <div className="flex-1 flex flex-col items-center justify-center w-full min-h-[220px] sm:min-h-[260px]">
                {/* Content area with image on left */}
                <div className="flex items-center gap-6 justify-center w-full">
                    {currentCard.imageBase64 && (
                        <div className="shrink-0">
                            <img
                                src={currentCard.imageBase64}
                                alt={currentCard.front}
                                className="w-28 h-28 sm:w-36 sm:h-36 md:w-44 md:h-44 rounded-xl object-cover border border-slate-200 dark:border-slate-700"
                            />
                        </div>
                    )}
                    <div className={currentCard.imageBase64 ? 'text-center flex-1 min-w-0' : 'text-center w-full'}>
                        {cardReviewType === 'synonym' ? (
                            <>
                                {/* Synonym mode: Show synonym from card */}
                                <div className={`font-bold text-slate-900 dark:text-white break-words font-japanese ${synonymSize}`}>
                                    <FuriganaText text={currentCard.synonym || 'Không có từ đồng nghĩa'} forceHide={!synonymFuriganaEnabled} />
                                </div>
                                {synonymVietnameseEnabled && currentCard.back && (
                                    <div className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1.5 italic">
                                        "{currentCard.back}"
                                    </div>
                                )}
                                <div className="text-xs sm:text-sm text-slate-400 dark:text-slate-500 mt-2">
                                    Tìm từ đồng nghĩa
                                </div>
                            </>
                        ) : cardReviewType === 'example' ? (
                            <>
                                {/* Example mode: Show example sentence with masked word */}
                                <div className={`font-bold text-slate-900 dark:text-white font-japanese break-words leading-relaxed ${exampleJaSize}`}>
                                    <FuriganaText text={promptInfo.text} forceHide={!exampleFuriganaEnabled} />
                                </div>
                                {exampleVietnameseEnabled && promptInfo.meaning && (
                                    <div
                                        className={`font-medium mt-2 italic break-words cursor-pointer transition-all duration-300 select-none ${exampleViSize} ${blurVietnamese && !revealedMeanings.has('main') ? 'blur-[6px] opacity-40 hover:opacity-60' : 'text-slate-500 dark:text-slate-400'}`}
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
                                        <div className="mt-2.5 pt-2.5 border-t border-slate-200 dark:border-slate-800 space-y-2 w-full max-h-40 overflow-y-auto no-scrollbar">
                                            {exampleLines.slice(1).map((ex, i) => (
                                                <div key={i} className="text-center">
                                                    <p className="text-slate-900 dark:text-white font-japanese break-words font-bold text-sm sm:text-base">
                                                        <FuriganaText text={(() => {
                                                            const wordToMask = getWordForMasking(currentCard.front);
                                                            const readingForMask = getReadingForMasking(currentCard.front);
                                                            return maskWordInExample(wordToMask, ex, currentCard.pos, readingForMask);
                                                        })()} forceHide={!exampleFuriganaEnabled} />
                                                    </p>
                                                    {exampleVietnameseEnabled && exampleMeaningLines[i + 1] && (
                                                        <p
                                                            className={`text-xs sm:text-sm font-medium italic mt-0.5 break-words cursor-pointer transition-all duration-300 select-none ${blurVietnamese && !revealedMeanings.has(`ex_${i}`) ? 'blur-[6px] opacity-40 hover:opacity-60' : 'text-slate-500 dark:text-slate-400'}`}
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
                                {/* Dictation mode: Show audio button */}
                                <div className="flex flex-col items-center gap-3">
                                    <button
                                        onClick={() => speakJapanese(currentCard, null, onSaveCardAudio ? (b64, vid) => onSaveCardAudio(currentCard.id, b64, vid) : null)}
                                        className="p-5 sm:p-6 bg-blue-50 hover:bg-blue-100 dark:bg-blue-500/20 dark:hover:bg-blue-500/30 text-blue-600 dark:text-blue-300 rounded-full transition-all shadow-md hover:scale-105 active:scale-95 border-2 border-blue-200 dark:border-blue-400/30 cursor-pointer"
                                        title="Phát âm thanh"
                                    >
                                        <Volume2 className="w-10 h-10 sm:w-12 sm:h-12" />
                                    </button>
                                    <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">Nghe và nhập lại từ vựng</p>
                                </div>
                            </>
                        ) : inputMode === 'reading' ? (
                            <>
                                {/* Reading mode: Show meaning, user inputs word */}
                                <div className={`font-extrabold text-slate-900 dark:text-white whitespace-pre-line break-words leading-snug ${meaningSize}`}>
                                    {formatMultipleMeanings(currentCard.back)}
                                </div>
                            </>
                        ) : (
                            <>
                                {/* Meaning mode: Show word only, user inputs meaning */}
                                <div className={`font-black text-slate-900 dark:text-white font-japanese break-words ${frontWordSize}`}>
                                    <FuriganaText text={currentCard.frontWithFurigana || currentCard.front} knownReading={currentCard.reading} forceHide={!meaningFuriganaEnabled} />
                                </div>
                            </>
                        )}

                        {/* Sino-Vietnamese hint & POS */}
                        <div className="flex flex-col items-center justify-center gap-1.5 mt-3 text-center">
                            {!['synonym', 'example', 'dictation'].includes(cardReviewType) && currentCard.sinoVietnamese && (reviewMode !== 'meaning_input' || meaningHanvietEnabled) && (
                                <p className="text-xs sm:text-sm md:text-base font-medium text-amber-600 dark:text-yellow-300">
                                    <span className="text-slate-400 dark:text-slate-500 font-normal">Hán Việt: </span>{currentCard.sinoVietnamese}
                                </p>
                            )}
                            {currentCard.pos && (
                                <p className="text-xs sm:text-sm">
                                    <span className="inline-block px-2 py-0.5 bg-teal-50 dark:bg-teal-950/40 border border-teal-200/60 dark:border-teal-800/60 rounded-md text-[11px] sm:text-xs font-medium text-teal-700 dark:text-teal-300">
                                        {getPosLabel(currentCard.pos)}
                                    </span>
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ReviewQuestionCard;
