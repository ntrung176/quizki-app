import React from 'react';
import { useReviewData } from '../../hooks/useReviewData';
import ReviewHeader from '../review/ReviewHeader';
import FlashcardModeView from '../review/FlashcardModeView';
import ReviewQuestionCard from '../review/ReviewQuestionCard';
import ReviewInteractionArea from '../review/ReviewInteractionArea';
import ReviewSettingsModal from '../review/ReviewSettingsModal';
import { InternalCompleteModal, ReviewCompleteScreen } from '../review/ReviewCompleteView';

export { ReviewCompleteScreen };

const ReviewScreen = ({
    cards: initialCards,
    reviewMode,
    allCards,
    setId,
    onUpdateCard,
    onCompleteReview,
    vocabCollectionPath,
    onSaveCardAudio,
    onBack,
    awardXP
}) => {
    const reviewData = useReviewData({
        cards: initialCards,
        reviewMode,
        allCards,
        setId,
        onUpdateCard,
        onCompleteReview,
        onSaveCardAudio,
        onBack,
        awardXP
    });

    const {
        cards, currentIndex, setCurrentIndex, currentCard, cardReviewType,
        isMultipleChoice, displayFront, promptInfo, progress, inputValue, setInputValue,
        isRevealed, setIsRevealed, isLocked, setIsLocked, message, setMessage,
        feedback, setFeedback, isProcessing, setIsProcessing, isFlipped, setIsFlipped,
        isAnimatingFlip, setIsAnimatingFlip, slideDirection, setSlideDirection,
        cardSettings, setCardSettings, showSettingsMenu, setShowSettingsMenu,
        showNuancePopup, setShowNuancePopup, touchStart, touchEnd, swipeOffset,
        selectedAnswer, setSelectedAnswer, multipleChoiceOptions, setMultipleChoiceOptions,
        failedCards, setFailedCards, showComplete, setShowComplete, needsRetype, setNeedsRetype,
        hintCount, setHintCount, blurVietnamese, setBlurVietnamese, revealedMeanings, setRevealedMeanings,
        inputMode, setInputMode, inputRef, showSettings, setShowSettings, reviewAudioEnabled,
        setReviewAudioEnabled, exampleTestFormat, setExampleTestFormat, exampleFuriganaEnabled,
        setExampleFuriganaEnabled, exampleVietnameseEnabled, setExampleVietnameseEnabled,
        meaningFuriganaEnabled, setMeaningFuriganaEnabled, meaningHanvietEnabled,
        setMeaningHanvietEnabled, synonymFuriganaEnabled, setSynonymFuriganaEnabled,
        synonymVietnameseEnabled, setSynonymVietnameseEnabled, reviewTestFormat,
        setReviewTestFormat, isEnglishMode, handleFlip, onTouchStart, onTouchMove, onTouchEnd,
        moveToPreviousCard, handleCompleteReview, handleRestart, checkAnswer, moveToNextCard,
        handleNext, handleRetypeSubmit, handleMultipleChoiceClick
    } = reviewData;

    const [isFullscreen, setIsFullscreen] = React.useState(false);

    const toggleFullscreen = React.useCallback(() => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(() => {});
            setIsFullscreen(true);
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen().catch(() => {});
            }
            setIsFullscreen(false);
        }
    }, []);

    React.useEffect(() => {
        const handleFSChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };
        document.addEventListener('fullscreenchange', handleFSChange);
        return () => document.removeEventListener('fullscreenchange', handleFSChange);
    }, []);

    // Show completion screen
    if (showComplete) {
        return (
            <InternalCompleteModal
                handleRestart={handleRestart}
                onCompleteReview={onCompleteReview}
                onBack={onBack}
            />
        );
    }

    if (cards.length === 0 || currentIndex >= cards.length) {
        return null;
    }

    return (
        <div className={isFullscreen 
            ? "fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto w-screen h-screen" 
            : "relative w-full min-h-[calc(100vh-6rem)] flex flex-col items-center justify-center py-6 px-4"
        }>
            <div className="w-full max-w-3xl mx-auto flex flex-col justify-center items-center space-y-4 my-auto">
                {/* Header Section */}
                <ReviewHeader
                    onBack={onBack}
                    currentIndex={currentIndex}
                    totalCards={cards.length}
                    failedCount={failedCards.size}
                    reviewMode={reviewMode}
                    setShowSettings={setShowSettings}
                    progress={progress}
                    isFullscreen={isFullscreen}
                    toggleFullscreen={toggleFullscreen}
                />

                {/* Main Card Area */}
                <div className="w-full flex flex-col justify-center items-center space-y-4 p-5 border-2 border-indigo-400/30 dark:border-indigo-500/20 bg-white/60 dark:bg-slate-900/60 backdrop-blur-md rounded-3xl shadow-xl overflow-hidden">
                    <div className="w-full relative group perspective flex-shrink-0">
                        {reviewMode === 'flashcard' ? (
                            <FlashcardModeView
                                currentCard={currentCard}
                                cardSettings={cardSettings}
                                isFlipped={isFlipped}
                                setIsFlipped={setIsFlipped}
                                setIsAnimatingFlip={setIsAnimatingFlip}
                                slideDirection={slideDirection}
                                swipeOffset={swipeOffset}
                                onTouchStart={onTouchStart}
                                onTouchMove={onTouchMove}
                                onTouchEnd={onTouchEnd}
                                showNuancePopup={showNuancePopup}
                                setShowNuancePopup={setShowNuancePopup}
                                setShowSettingsMenu={setShowSettingsMenu}
                                onSaveCardAudio={onSaveCardAudio}
                            />
                        ) : (
                            <ReviewQuestionCard
                                currentCard={currentCard}
                                reviewMode={reviewMode}
                                cardReviewType={cardReviewType}
                                inputMode={inputMode}
                                setInputMode={setInputMode}
                                isMultipleChoice={isMultipleChoice}
                                promptInfo={promptInfo}
                                blurVietnamese={blurVietnamese}
                                setBlurVietnamese={setBlurVietnamese}
                                revealedMeanings={revealedMeanings}
                                setRevealedMeanings={setRevealedMeanings}
                                synonymFuriganaEnabled={synonymFuriganaEnabled}
                                synonymVietnameseEnabled={synonymVietnameseEnabled}
                                exampleFuriganaEnabled={exampleFuriganaEnabled}
                                exampleVietnameseEnabled={exampleVietnameseEnabled}
                                meaningFuriganaEnabled={meaningFuriganaEnabled}
                                meaningHanvietEnabled={meaningHanvietEnabled}
                                setInputValue={setInputValue}
                                setHintCount={setHintCount}
                                onSaveCardAudio={onSaveCardAudio}
                            />
                        )}
                    </div>

                    {/* Interaction Area */}
                    <ReviewInteractionArea
                        currentCard={currentCard}
                        reviewMode={reviewMode}
                        cardReviewType={cardReviewType}
                        isMultipleChoice={isMultipleChoice}
                        multipleChoiceOptions={multipleChoiceOptions}
                        selectedAnswer={selectedAnswer}
                        handleMultipleChoiceClick={handleMultipleChoiceClick}
                        feedback={feedback}
                        isRevealed={isRevealed}
                        isProcessing={isProcessing}
                        displayFront={displayFront}
                        cards={cards}
                        currentIndex={currentIndex}
                        moveToPreviousCard={moveToPreviousCard}
                        slideDirection={slideDirection}
                        setIsFlipped={setIsFlipped}
                        setIsAnimatingFlip={setIsAnimatingFlip}
                        setCurrentIndex={setCurrentIndex}
                        setSlideDirection={setSlideDirection}
                        handleCompleteReview={handleCompleteReview}
                        inputMode={inputMode}
                        hintCount={hintCount}
                        setHintCount={setHintCount}
                        inputRef={inputRef}
                        inputValue={inputValue}
                        setInputValue={setInputValue}
                        needsRetype={needsRetype}
                        handleRetypeSubmit={handleRetypeSubmit}
                        checkAnswer={checkAnswer}
                        handleNext={handleNext}
                        message={message}
                        synonymFuriganaEnabled={synonymFuriganaEnabled}
                        exampleFuriganaEnabled={exampleFuriganaEnabled}
                    />
                </div>
            </div>

            {/* Settings Modals */}
            <ReviewSettingsModal
                showSettings={showSettings}
                setShowSettings={setShowSettings}
                showSettingsMenu={showSettingsMenu}
                setShowSettingsMenu={setShowSettingsMenu}
                reviewMode={reviewMode}
                cardReviewType={cardReviewType}
                inputMode={inputMode}
                setInputMode={setInputMode}
                isEnglishMode={isEnglishMode}
                meaningFuriganaEnabled={meaningFuriganaEnabled}
                setMeaningFuriganaEnabled={setMeaningFuriganaEnabled}
                meaningHanvietEnabled={meaningHanvietEnabled}
                setMeaningHanvietEnabled={setMeaningHanvietEnabled}
                synonymFuriganaEnabled={synonymFuriganaEnabled}
                setSynonymFuriganaEnabled={setSynonymFuriganaEnabled}
                synonymVietnameseEnabled={synonymVietnameseEnabled}
                setSynonymVietnameseEnabled={setSynonymVietnameseEnabled}
                exampleTestFormat={exampleTestFormat}
                setExampleTestFormat={setExampleTestFormat}
                exampleFuriganaEnabled={exampleFuriganaEnabled}
                setExampleFuriganaEnabled={setExampleFuriganaEnabled}
                exampleVietnameseEnabled={exampleVietnameseEnabled}
                setExampleVietnameseEnabled={setExampleVietnameseEnabled}
                reviewTestFormat={reviewTestFormat}
                setReviewTestFormat={setReviewTestFormat}
                reviewAudioEnabled={reviewAudioEnabled}
                setReviewAudioEnabled={setReviewAudioEnabled}
                cardSettings={cardSettings}
                setCardSettings={setCardSettings}
                setInputValue={setInputValue}
                setHintCount={setHintCount}
            />
        </div>
    );
};

export default ReviewScreen;
