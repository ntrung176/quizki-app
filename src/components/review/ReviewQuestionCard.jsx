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

    return (
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
                            className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium transition-all border cursor-pointer ${blurVietnamese
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
                            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer ${inputMode === 'reading' ? 'bg-orange-500 text-white' : 'bg-slate-700 text-gray-300 hover:bg-slate-600'}`}
                        >
                            Cách đọc
                        </button>
                        <button
                            onClick={() => { setInputMode('meaning'); setInputValue(''); setHintCount(0); }}
                            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer ${inputMode === 'meaning' ? 'bg-orange-500 text-white' : 'bg-slate-700 text-gray-300 hover:bg-slate-600'}`}
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
                    <div className={currentCard.imageBase64 ? 'text-center flex-1 min-w-0' : 'text-center'}>
                        {cardReviewType === 'synonym' ? (
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
                                {/* Dictation mode: Show audio button */}
                                <div className="flex flex-col items-center gap-4">
                                    <button
                                        onClick={() => speakJapanese(currentCard.front, currentCard.audioBase64, onSaveCardAudio ? (b64, vid) => onSaveCardAudio(currentCard.id, b64, vid) : null, currentCard.audioVoiceId)}
                                        className="p-6 bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 hover:text-indigo-200 rounded-full transition-all shadow-lg hover:shadow-indigo-500/20 hover:scale-110 active:scale-95 border-2 border-indigo-400/30 cursor-pointer"
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
    );
};

export default ReviewQuestionCard;
