import React from 'react';
import { Check, X, Lightbulb } from 'lucide-react';
import FuriganaText from '../ui/FuriganaText';

const ReviewInteractionArea = ({
    currentCard,
    reviewMode,
    cardReviewType,
    isMultipleChoice,
    multipleChoiceOptions,
    selectedAnswer,
    handleMultipleChoiceClick,
    feedback,
    isRevealed,
    isProcessing,
    displayFront,
    cards,
    currentIndex,
    moveToPreviousCard,
    slideDirection,
    setIsFlipped,
    setIsAnimatingFlip,
    setCurrentIndex,
    setSlideDirection,
    handleCompleteReview,
    inputMode,
    hintCount,
    setHintCount,
    inputRef,
    inputValue,
    setInputValue,
    needsRetype,
    handleRetypeSubmit,
    checkAnswer,
    handleNext,
    message,
    synonymFuriganaEnabled,
    exampleFuriganaEnabled
}) => {
    return (
        <div className="w-full space-y-2 flex-shrink-0">
            {/* Multiple Choice Options */}
            {isMultipleChoice && (!isRevealed || feedback === 'incorrect') && multipleChoiceOptions.length > 0 && (() => {
                const maxOptLen = Math.max(...multipleChoiceOptions.map(o => (typeof o === 'string' ? o : (o?.front || '')).length || 0), 0);
                let optionTextSize = 'text-base sm:text-lg md:text-xl';
                let optionPadding = 'px-3 py-3.5 sm:py-4';
                if (maxOptLen > 22) {
                    optionTextSize = 'text-xs sm:text-sm';
                    optionPadding = 'px-2.5 py-2 sm:py-2.5';
                } else if (maxOptLen > 11) {
                    optionTextSize = 'text-sm sm:text-base';
                    optionPadding = 'px-3 py-2.5 sm:py-3';
                }

                return (
                    <div className="space-y-2.5">
                        <p className="text-sm sm:text-base font-bold text-gray-600 dark:text-gray-300 text-center mb-1">
                            {cardReviewType === 'synonym'
                                ? <span>Từ đồng nghĩa của "<FuriganaText text={currentCard.synonym} forceHide={!synonymFuriganaEnabled} />" là gì?</span>
                                : `Điền từ còn thiếu`
                            }
                        </p>
                        <div className="grid grid-cols-2 gap-2">
                            {multipleChoiceOptions.map((option, index) => {
                                const isSelected = selectedAnswer === option;
                                let buttonClass = `${optionPadding} ${optionTextSize} font-extrabold rounded-xl transition-all border-2 text-left flex items-center gap-2.5 `;

                                if (feedback && isSelected && feedback === 'correct') {
                                    buttonClass += "bg-emerald-500 text-white border-emerald-600 shadow-md";
                                } else if (feedback && isSelected && feedback === 'incorrect') {
                                    buttonClass += "bg-rose-500 text-white border-rose-600 shadow-md";
                                } else if (feedback && (option === (currentCard.frontWithFurigana || currentCard.front) || option === `${(currentCard.frontWithFurigana || currentCard.front || '').split('（')[0].trim()}（${(currentCard.reading || '').trim()}）`)) {
                                    buttonClass += "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-500";
                                } else if (isSelected) {
                                    buttonClass += "bg-blue-600 text-white border-blue-700 shadow-md";
                                } else {
                                    buttonClass += "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-blue-50/60 dark:hover:bg-blue-950/30 hover:border-blue-400";
                                }

                                if (isRevealed || isProcessing || !!feedback) {
                                    buttonClass += " cursor-default";
                                } else {
                                    buttonClass += " cursor-pointer";
                                }

                                return (
                                    <div
                                        key={index}
                                        data-mc-option={index}
                                        onClick={() => handleMultipleChoiceClick(option)}
                                        className={buttonClass}
                                    >
                                        <span className="inline-flex items-center justify-center w-5 h-5 sm:w-6 sm:h-6 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] sm:text-xs font-bold flex-shrink-0 select-none border border-slate-200/60 dark:border-slate-700">{index + 1}</span>
                                        <span className="font-japanese truncate-lines-2 break-words"><FuriganaText text={option} forceHide={cardReviewType === 'synonym' ? !synonymFuriganaEnabled : (cardReviewType === 'example' ? !exampleFuriganaEnabled : false)} /></span>
                                    </div>
                                );
                            })}
                        </div>
                        <p className="text-[10px] text-gray-400 dark:text-gray-500 text-center mt-0.5 opacity-70">⌨️ Nhấn phím 1-4 để chọn nhanh</p>
                    </div>
                );
            })()}

            {/* Flashcard Mode Navigation */}
            {reviewMode === 'flashcard' && (
                <div className="space-y-2 w-full">
                    <div className="flex gap-2 md:gap-4">
                        <button
                            onClick={moveToPreviousCard}
                            disabled={isProcessing || currentIndex === 0}
                            className={`px-3 md:px-4 py-2 md:py-3 text-sm md:text-base font-bold rounded-xl transition-all shadow-sm cursor-pointer ${isProcessing || currentIndex === 0
                                ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed'
                                : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 active:scale-95'
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
                            }}
                            disabled={isProcessing}
                            className={`flex-1 px-4 md:px-6 py-2 md:py-3 text-sm md:text-base font-bold rounded-xl transition-all shadow-md cursor-pointer ${isProcessing
                                ? 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                                : 'bg-blue-600 hover:bg-blue-700 text-white active:scale-95'
                                }`}
                            title="Thẻ tiếp theo (→)"
                        >
                            {currentIndex < cards.length - 1 ? 'Thẻ tiếp theo →' : 'Hoàn thành'}
                        </button>
                    </div>
                    <p className="text-[10px] text-gray-400 dark:text-gray-500 text-center opacity-70">
                        ⌨️ Phím tắt: Space (Lật thẻ) | ← (Trước) | → (Tiếp theo)
                    </p>
                </div>
            )}

            {/* Typing Mode UI */}
            {(cardReviewType === 'back' || cardReviewType === 'dictation' || cardReviewType === 'example') && reviewMode !== 'flashcard' && !isMultipleChoice && (
                <div className="space-y-2.5">
                    {/* Hint Display */}
                    {!isRevealed && inputMode === 'reading' && cardReviewType === 'back' && (
                        <div className="flex justify-center gap-1.5">
                            {(() => {
                                const hiraganaMatch = currentCard.front.match(/[（(]([^）)]+)[）)]/);
                                const reading = hiraganaMatch ? hiraganaMatch[1] : currentCard.front.split('（')[0].split('(')[0];
                                const maxHint = Math.ceil(reading.length / 2);
                                return reading.split('').map((char, idx) => (
                                    <span
                                        key={idx}
                                        className={`inline-block w-6 h-7 leading-7 text-center text-sm font-bold border-b-2 font-japanese ${idx < hintCount && idx < maxHint
                                            ? 'text-blue-600 dark:text-cyan-300 border-blue-500 dark:border-cyan-400'
                                            : 'text-gray-400 dark:text-gray-500 border-gray-300 dark:border-gray-600'
                                            }`}
                                    >
                                        {idx < hintCount && idx < maxHint ? char : '_'}
                                    </span>
                                ));
                            })()}
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
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); needsRetype ? handleRetypeSubmit() : (isRevealed ? handleNext() : checkAnswer()); } }}
                        onFocus={(e) => {
                            if (window.innerWidth <= 768) {
                                setTimeout(() => {
                                    e.target.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
                                }, 300);
                            }
                        }}
                        disabled={feedback === 'correct' && !needsRetype}
                        className={`w-full px-4 sm:px-5 py-3 text-base sm:text-lg rounded-xl border-2 transition-all outline-none shadow-sm focus:ring-4 focus:ring-blue-500/15
                    ${(inputMode === 'reading' || cardReviewType === 'dictation' || cardReviewType === 'example') ? 'font-japanese font-bold' : 'font-semibold'}
                    ${needsRetype
                                ? 'border-rose-400 bg-rose-50/50 dark:bg-rose-950/30 text-rose-900 dark:text-rose-100 focus:border-rose-500'
                                : feedback === 'correct'
                                    ? 'border-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-100'
                                    : feedback === 'incorrect'
                                        ? 'border-rose-400 bg-rose-50/50 dark:bg-rose-950/30 text-rose-900 dark:text-rose-100'
                                        : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-850 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:border-blue-500 dark:focus:border-blue-400'}`}
                        placeholder={needsRetype ? 'Nhập lại đáp án đúng để tiếp tục...' : (cardReviewType === 'example' ? 'Nhập từ còn thiếu bằng tiếng Nhật...' : (cardReviewType === 'dictation' ? 'Nhập từ vựng bạn nghe được...' : (inputMode === 'reading' ? 'Nhập từ vựng tiếng Nhật...' : 'Nhập ý nghĩa tiếng Việt...')))}
                    />

                    {/* Hint button and Check button row */}
                    {needsRetype ? (
                        <div className="flex flex-col gap-1.5">
                            <p className="text-xs font-bold text-rose-600 dark:text-rose-400 text-center">✏️ Nhập lại đáp án đúng để tiếp tục</p>
                            <button
                                onClick={handleRetypeSubmit}
                                disabled={!inputValue.trim() || isProcessing}
                                className="w-full h-11 flex items-center justify-center gap-2 px-5 text-sm sm:text-base bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-md disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-[0.98] cursor-pointer"
                            >
                                <Check className="w-4 h-4" />
                                <span>Xác nhận đáp án đúng</span>
                            </button>
                            <p className="text-[10px] text-gray-400 dark:text-gray-500 text-center opacity-70">⌨️ Nhấn Enter để xác nhận nhanh</p>
                        </div>
                    ) : !isRevealed && (
                        <div className="space-y-1">
                            <div className="flex items-center gap-2">
                                {inputMode === 'reading' && cardReviewType === 'back' && (
                                    <button
                                        onClick={() => {
                                            const hiraganaMatch = currentCard.front.match(/[（(]([^）)]+)[）)]/);
                                            const reading = hiraganaMatch ? hiraganaMatch[1] : currentCard.front.split('（')[0].split('(')[0];
                                            const maxHint = Math.ceil(reading.length / 2);
                                            if (hintCount < maxHint) {
                                                setHintCount(prev => prev + 1);
                                            }
                                        }}
                                        disabled={(() => {
                                            const hiraganaMatch = currentCard.front.match(/[（(]([^）)]+)[）)]/);
                                            const reading = hiraganaMatch ? hiraganaMatch[1] : currentCard.front.split('（')[0].split('(')[0];
                                            const maxHint = Math.ceil(reading.length / 2);
                                            return hintCount >= maxHint;
                                        })()}
                                        className="h-11 px-3 sm:px-4 flex items-center justify-center gap-1.5 text-xs sm:text-sm bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700 rounded-xl font-medium disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-95 cursor-pointer whitespace-nowrap shadow-sm"
                                        title="Hiển thị thêm chữ cái gợi ý"
                                    >
                                        <Lightbulb className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400 flex-shrink-0" />
                                        <span>Gợi ý ({hintCount}/{(() => {
                                            const hiraganaMatch = currentCard.front.match(/[（(]([^）)]+)[）)]/);
                                            const reading = hiraganaMatch ? hiraganaMatch[1] : currentCard.front.split('（')[0].split('(')[0];
                                            return Math.ceil(reading.length / 2);
                                        })()})</span>
                                    </button>
                                )}
                                <button
                                    onClick={checkAnswer}
                                    disabled={!inputValue.trim() || isProcessing}
                                    className="flex-1 h-11 flex items-center justify-center gap-2 px-5 text-sm sm:text-base bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-md disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-[0.98] cursor-pointer"
                                >
                                    <Check className="w-4 h-4" />
                                    <span>Kiểm tra</span>
                                </button>
                            </div>
                            <p className="text-[10px] text-gray-400 dark:text-gray-500 text-center opacity-70">⌨️ Nhấn Enter để kiểm tra nhanh</p>
                        </div>
                    )}
                </div>
            )}

            {/* Feedback & Actions */}
            {reviewMode !== 'flashcard' && isRevealed && (
                <div className="w-full animate-fade-in mt-1">
                    {feedback === 'incorrect' ? (
                        <div className="w-full py-2 sm:py-2.5 px-3 sm:px-4 rounded-xl sm:rounded-2xl border flex items-center justify-between gap-2 shadow-sm bg-rose-50/90 dark:bg-rose-950/40 border-rose-200/80 dark:border-rose-800/60 text-rose-800 dark:text-rose-200">
                            {/* Trạng thái Chưa đúng */}
                            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                                <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-rose-500/20 flex items-center justify-center shrink-0">
                                    <X className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-rose-600 dark:text-rose-400 stroke-[2.5]" />
                                </div>
                                <span className="font-extrabold text-xs sm:text-sm text-rose-700 dark:text-rose-300 whitespace-nowrap">Chưa đúng</span>
                            </div>

                            {/* So sánh Bạn gõ / đã chọn vs Đáp án đúng trên 1 dòng */}
                            <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-1 max-w-[55%] sm:max-w-[62%] text-xs sm:text-sm overflow-hidden">
                                {(inputValue || selectedAnswer) && (
                                    <div className="flex items-center gap-1 min-w-0 shrink">
                                        <span className="text-rose-700/80 dark:text-rose-300/80 font-medium text-[11px] sm:text-xs shrink-0">
                                            {inputValue ? 'Bạn gõ:' : 'Đã chọn:'}
                                        </span>
                                        <span className="font-bold font-japanese truncate px-1.5 py-0.5 rounded bg-rose-500/15 text-rose-700 dark:text-rose-300 line-through border border-rose-500/25 max-w-[90px] sm:max-w-[130px]" title={inputValue || selectedAnswer}>
                                            {inputValue || selectedAnswer}
                                        </span>
                                        <span className="text-slate-400 dark:text-slate-500 shrink-0 font-bold text-xs mx-0.5">→</span>
                                    </div>
                                )}
                                <div className="flex items-center gap-1 min-w-0 shrink">
                                    <span className="text-slate-400 dark:text-slate-500 font-medium text-[11px] sm:text-xs shrink-0">
                                        {cardReviewType === 'synonym' ? 'Đồng nghĩa:' : 'Đáp án:'}
                                    </span>
                                    <span className="font-bold font-japanese truncate px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-800 dark:text-emerald-200 border border-emerald-500/20 max-w-[110px] sm:max-w-[160px]">
                                        {cardReviewType === 'synonym' ? (
                                            <FuriganaText text={currentCard.synonym} forceHide={!synonymFuriganaEnabled} />
                                        ) : (
                                            <FuriganaText text={currentCard.frontWithFurigana || currentCard.front} knownReading={currentCard.reading} />
                                        )}
                                    </span>
                                </div>
                            </div>

                            {/* Nút Tiếp tục */}
                            {!needsRetype && (
                                <button
                                    onClick={handleNext}
                                    disabled={isProcessing}
                                    className="px-3 sm:px-4 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold text-xs sm:text-sm shadow-sm transition-all active:scale-95 flex items-center gap-1 shrink-0 ml-auto cursor-pointer"
                                >
                                    <span>Tiếp tục</span>
                                    <span className="hidden sm:inline opacity-75 font-normal text-[10px]">(Enter)</span>
                                    <span className="text-xs">→</span>
                                </button>
                            )}
                        </div>
                    ) : (
                        <div className="w-full py-2 sm:py-2.5 px-3 sm:px-4 rounded-xl sm:rounded-2xl border flex items-center justify-between gap-2 shadow-sm bg-emerald-50/90 dark:bg-emerald-950/40 border-emerald-200/80 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-200">
                            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                                <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
                                    <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-600 dark:text-emerald-400 stroke-[2.5]" />
                                </div>
                                <span className="font-extrabold text-xs sm:text-sm text-emerald-700 dark:text-emerald-300 whitespace-nowrap">Chính xác!</span>
                            </div>
                            <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-1 max-w-[55%] sm:max-w-[65%] text-xs sm:text-sm overflow-hidden">
                                {(inputValue || selectedAnswer) && (
                                    <div className="flex items-center gap-1 min-w-0 shrink">
                                        <span className="text-emerald-700/80 dark:text-emerald-300/80 font-medium text-[11px] sm:text-xs shrink-0">
                                            {inputValue ? 'Bạn gõ:' : 'Đã chọn:'}
                                        </span>
                                        <span className="font-bold font-japanese truncate px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-800 dark:text-emerald-200 border border-emerald-500/20 max-w-[90px] sm:max-w-[130px]" title={inputValue || selectedAnswer}>
                                            {inputValue || selectedAnswer}
                                        </span>
                                        <span className="text-slate-400 dark:text-slate-500 shrink-0 font-bold text-xs mx-0.5">→</span>
                                    </div>
                                )}
                                <div className="text-xs sm:text-sm font-semibold truncate text-emerald-800 dark:text-emerald-200">
                                    {message}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default ReviewInteractionArea;
