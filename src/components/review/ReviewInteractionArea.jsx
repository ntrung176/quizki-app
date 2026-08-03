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
            {isMultipleChoice && (!isRevealed || feedback === 'incorrect') && multipleChoiceOptions.length > 0 && (
                <div className="space-y-3">
                    <p className="text-base md:text-lg font-bold text-gray-600 dark:text-gray-300 text-center mb-1">
                        {cardReviewType === 'synonym'
                            ? <span>Từ đồng nghĩa của "<FuriganaText text={currentCard.synonym} forceHide={!synonymFuriganaEnabled} />" là gì?</span>
                            : `Điền từ còn thiếu`
                        }
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                        {multipleChoiceOptions.map((option, index) => {
                            const isSelected = selectedAnswer === option;
                            let buttonClass = "px-3 py-4 text-base md:text-xl font-extrabold rounded-xl transition-all border-2 text-left flex items-center gap-3 ";

                            if (feedback && isSelected && feedback === 'correct') {
                                buttonClass += "bg-emerald-500 text-white border-emerald-600 shadow-md";
                            } else if (feedback && isSelected && feedback === 'incorrect') {
                                buttonClass += "bg-red-500 text-white border-red-600 shadow-md";
                            } else if (feedback && option === (currentCard.frontWithFurigana || currentCard.front)) {
                                buttonClass += "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-emerald-500";
                            } else if (isSelected) {
                                buttonClass += "bg-indigo-500 text-white border-indigo-600 shadow-md";
                            } else {
                                buttonClass += "bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 hover:border-indigo-400";
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
                                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-white/20 text-xs font-bold flex-shrink-0 select-none">{index + 1}</span>
                                    <span className="font-japanese"><FuriganaText text={option} forceHide={cardReviewType === 'synonym' ? !synonymFuriganaEnabled : (cardReviewType === 'example' ? !exampleFuriganaEnabled : false)} /></span>
                                </div>
                            );
                        })}
                    </div>
                    <p className="text-[10px] text-gray-400 dark:text-gray-500 text-center mt-1 opacity-70">⌨️ Nhấn phím 1-4 để chọn nhanh</p>
                </div>
            )}

            {/* Flashcard Mode Navigation */}
            {reviewMode === 'flashcard' && (
                <div className="space-y-2 w-full">
                    <div className="flex gap-2 md:gap-4">
                        <button
                            onClick={moveToPreviousCard}
                            disabled={isProcessing || currentIndex === 0}
                            className={`px-3 md:px-4 py-2 md:py-3 text-sm md:text-base font-bold rounded-lg md:rounded-xl transition-all shadow-md cursor-pointer ${isProcessing || currentIndex === 0
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
                            className={`flex-1 px-4 md:px-6 py-2 md:py-3 text-sm md:text-base font-bold rounded-lg md:rounded-xl transition-all shadow-md cursor-pointer ${isProcessing
                                ? 'bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-500 cursor-not-allowed'
                                : 'bg-gradient-to-r from-indigo-500 to-sky-500 dark:from-indigo-600 dark:to-sky-600 text-white hover:shadow-lg hover:scale-105'
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
                <div className="space-y-3">
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
                                        className={`inline-block w-7 h-9 leading-9 text-center text-base font-bold border-b-2 font-japanese ${idx < hintCount && idx < maxHint
                                            ? 'text-cyan-300 border-cyan-400'
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
                        className={`w-full px-6 py-4.5 text-xl md:text-2xl rounded-2xl border-2 transition-all outline-none shadow-lg focus:ring-4 focus:ring-indigo-500/20
                    ${(inputMode === 'reading' || cardReviewType === 'dictation' || cardReviewType === 'example') ? 'font-japanese font-bold' : 'font-semibold'}
                    ${needsRetype
                                ? 'border-orange-400 bg-orange-50 dark:bg-orange-900/20 text-orange-900 dark:text-orange-100 focus:border-orange-500 focus:ring-orange-500/20'
                                : feedback === 'correct'
                                    ? 'border-green-400 bg-green-50 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                                    : feedback === 'incorrect'
                                        ? 'border-red-400 bg-red-50 dark:bg-red-900/30 text-red-800 dark:text-red-300'
                                        : 'border-gray-300 dark:border-gray-600 bg-gray-800 text-white focus:border-indigo-500'}`}
                        placeholder={needsRetype ? 'Nhập lại đáp án đúng để tiếp tục...' : (cardReviewType === 'example' ? 'Nhập từ còn thiếu bằng tiếng Nhật...' : (cardReviewType === 'dictation' ? 'Nhập từ vựng bạn nghe được...' : (inputMode === 'reading' ? 'Nhập từ vựng tiếng Nhật...' : 'Nhập ý nghĩa tiếng Việt...')))}
                    />

                    {/* Hint button and Check button row */}
                    {needsRetype ? (
                        <div className="flex flex-col gap-2">
                            <p className="text-xs font-bold text-orange-500 dark:text-orange-400 text-center">✏️ Nhập lại đáp án đúng để tiếp tục</p>
                            <button
                                onClick={handleRetypeSubmit}
                                disabled={!inputValue.trim() || isProcessing}
                                className="w-full flex items-center justify-center gap-2 px-6 py-4.5 text-lg md:text-xl bg-orange-500 hover:bg-orange-600 text-white rounded-2xl font-bold shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.98] cursor-pointer"
                            >
                                <Check className="w-5 h-5" />
                                <span>Xác nhận đáp án đúng</span>
                            </button>
                            <p className="text-[10px] text-gray-400 dark:text-gray-500 text-center opacity-70">⌨️ Nhấn Enter để xác nhận nhanh</p>
                        </div>
                    ) : !isRevealed && (
                        <div className="flex gap-3">
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
                                    className="flex items-center gap-2 px-5 py-4.5 text-base md:text-lg bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-650 text-gray-700 dark:text-gray-200 rounded-2xl font-semibold hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer"
                                >
                                    <Lightbulb className="w-5 h-5" />
                                    <span>Gợi ý ({hintCount}/{(() => {
                                        const hiraganaMatch = currentCard.front.match(/[（(]([^）)]+)[）)]/);
                                        const reading = hiraganaMatch ? hiraganaMatch[1] : currentCard.front.split('（')[0].split('(')[0];
                                        return Math.ceil(reading.length / 2);
                                    })()})</span>
                                </button>
                            )}
                            <div className="flex-1 flex flex-col gap-1.5">
                                <button
                                    onClick={checkAnswer}
                                    disabled={!inputValue.trim() || isProcessing}
                                    className="w-full flex items-center justify-center gap-2 px-6 py-4.5 text-lg md:text-xl bg-orange-500 hover:bg-orange-600 text-white rounded-2xl font-bold shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.98] cursor-pointer"
                                >
                                    <Check className="w-5 h-5" />
                                    <span>Kiểm tra</span>
                                </button>
                                <p className="text-[10px] text-gray-400 dark:text-gray-500 text-center opacity-70">⌨️ Nhấn Enter để kiểm tra nhanh</p>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Feedback & Actions */}
            {reviewMode !== 'flashcard' && (
                <div className="space-y-2 md:space-y-3">
                    <div className={`transition-all duration-300 ease-out overflow-hidden ${isRevealed ? 'max-h-[120px] md:max-h-40 opacity-100' : 'max-h-0 opacity-0'}`}>
                        <div className={`p-3 md:p-5 rounded-xl md:rounded-2xl border flex items-start gap-2 md:gap-4 overflow-y-auto max-h-[120px] md:max-h-40 ${feedback === 'correct' ? 'bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-800' : feedback === 'incorrect' ? 'bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-800' : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700'}`}>
                            {(cardReviewType === 'back' || cardReviewType === 'dictation' || cardReviewType === 'example') && reviewMode !== 'flashcard' && !isMultipleChoice && (
                                <div className={`p-1.5 md:p-2 rounded-full flex-shrink-0 ${feedback === 'correct' ? 'bg-green-200 dark:bg-green-800 text-green-700 dark:text-green-300' : 'bg-red-200 dark:bg-red-800 text-red-700 dark:text-red-300'}`}>
                                    {feedback === 'correct' ? <Check className="w-4 h-4 md:w-5 md:h-5" strokeWidth={3} /> : <X className="w-4 h-4 md:w-5 md:h-5" strokeWidth={3} />}
                                </div>
                            )}
                            <div className="flex-1 min-w-0">
                                {feedback === 'incorrect' ? (
                                    <div className="space-y-1 text-sm md:text-base">
                                        <p className="font-extrabold text-base md:text-lg text-red-800 dark:text-red-300">✗ Chưa đúng!</p>
                                        <div className="space-y-1 border-t border-red-200/50 dark:border-red-800/40 pt-1.5 mt-1">
                                            <p className="text-red-800 dark:text-red-300">
                                                Từ vựng: <span className="font-japanese font-bold text-base md:text-lg"><FuriganaText text={currentCard.frontWithFurigana || currentCard.front} /></span>
                                                {currentCard.sinoVietnamese && <span className="text-yellow-600 dark:text-yellow-400 font-medium ml-1">({currentCard.sinoVietnamese})</span>}
                                            </p>
                                            <p className="text-red-800 dark:text-red-300">
                                                Ý nghĩa: <span className="font-semibold">{currentCard.back}</span>
                                            </p>
                                            {currentCard.synonym && cardReviewType === 'synonym' && (
                                                <p className="text-red-800 dark:text-red-300">
                                                    Đồng nghĩa đúng: <span className="font-japanese font-semibold"><FuriganaText text={currentCard.synonym} /></span>
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                ) : (
                                    <div>
                                        <p className={`font-extrabold text-lg md:text-2xl ${feedback === 'correct' ? 'text-green-800 dark:text-green-300' : 'text-red-800 dark:text-red-300'}`}>{message}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {feedback === 'incorrect' && !needsRetype && (
                        <button
                            onClick={handleNext}
                            disabled={isProcessing}
                            className="w-full mt-3 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition-all shadow-md active:scale-95 cursor-pointer"
                        >
                            Tiếp tục
                        </button>
                    )}
                </div>
            )}
        </div>
    );
};

export default ReviewInteractionArea;
