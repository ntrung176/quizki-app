import React from 'react';
import { Lightbulb, Volume2, Settings } from 'lucide-react';
import Flashcard from '../ui/Flashcard';
import { speakJapanese } from '../../utils/audio';

const FlashcardModeView = ({
    currentCard,
    cardSettings,
    isFlipped,
    setIsFlipped,
    setIsAnimatingFlip,
    slideDirection,
    swipeOffset,
    onTouchStart,
    onTouchMove,
    onTouchEnd,
    showNuancePopup,
    setShowNuancePopup,
    setShowSettingsMenu,
    onSaveCardAudio
}) => {
    if (!currentCard) return null;

    return (
        <div className="perspective-1000 w-full mx-auto relative">
            <div
                className={`cursor-pointer relative card-slide ${slideDirection === 'left' ? 'slide-out-left' : slideDirection === 'right' ? 'slide-out-right' : ''}`}
                onTouchStart={onTouchStart}
                onTouchMove={onTouchMove}
                onTouchEnd={onTouchEnd}
                style={{
                    width: '100%',
                    transform: swipeOffset ? `translateX(${swipeOffset}px)` : undefined,
                    transition: swipeOffset ? 'none' : (slideDirection ? 'transform 0.12s cubic-bezier(0.4, 0.0, 0.2, 1), opacity 0.12s ease' : 'transform 0.2s cubic-bezier(0.4, 0.0, 0.2, 1)'),
                    touchAction: 'pan-y',
                }}
            >
                <Flashcard
                    card={currentCard}
                    cardSettings={cardSettings}
                    isFlipped={isFlipped}
                    onFlip={() => {
                        setIsAnimatingFlip(true);
                        const newFlippedState = !isFlipped;
                        setIsFlipped(newFlippedState);
                        if (newFlippedState && currentCard && cardSettings?.autoPlayAudio !== false && cardSettings?.audioEnabled !== false) {
                            const cardText = currentCard.front || currentCard.vocabulary || currentCard.word || currentCard.kanji || currentCard.term || '';
                            if (cardText) {
                                speakJapanese(cardText, currentCard.audioBase64 || currentCard.audioUrl || null, onSaveCardAudio ? (b64, vid) => onSaveCardAudio(currentCard.id, b64, vid) : null, currentCard.audioVoiceId);
                            }
                        }
                    }}
                    variant="review"
                    transitionEnabled={true}
                />
            </div>

            {/* Top Right Action Buttons Header */}
            <div className="absolute top-3.5 right-3.5 flex items-center gap-1.5 z-30">
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        setShowNuancePopup(prev => !prev);
                    }}
                    className={`p-2 rounded-full transition-all hover:scale-105 active:scale-95 shadow-sm border cursor-pointer ${
                        currentCard.nuance 
                            ? 'bg-amber-500/30 hover:bg-amber-500/40 text-amber-300 border-amber-500/40' 
                            : 'bg-white/20 hover:bg-white/35 text-white border-white/20'
                    }`}
                    title="Sắc thái từ vựng"
                >
                    <Lightbulb className="w-4 h-4" />
                </button>
                {cardSettings.audioEnabled !== false && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            if (currentCard) {
                                const cardText = currentCard.front || currentCard.vocabulary || currentCard.word || currentCard.kanji || currentCard.term || '';
                                if (cardText) {
                                    speakJapanese(cardText, currentCard.audioBase64 || currentCard.audioUrl || null, onSaveCardAudio ? (b64, vid) => onSaveCardAudio(currentCard.id, b64, vid) : null, currentCard.audioVoiceId);
                                }
                            }
                        }}
                        className="p-2 bg-white/20 hover:bg-white/35 text-white rounded-full transition-all hover:scale-105 active:scale-95 shadow-sm border border-white/20 cursor-pointer"
                        title="Phát âm"
                    >
                        <Volume2 className="w-4 h-4" />
                    </button>
                )}
                <button
                    onClick={(e) => { e.stopPropagation(); setShowSettingsMenu(true); }}
                    className="p-2 bg-white/20 hover:bg-white/35 text-white rounded-full transition-all hover:scale-105 active:scale-95 shadow-sm border border-white/20 cursor-pointer"
                    title="Cấu hình hiển thị"
                >
                    <Settings className="w-4 h-4" />
                </button>
            </div>

            {/* Nuance Text Box */}
            {showNuancePopup && (
                <div 
                    onClick={(e) => e.stopPropagation()} 
                    className="absolute top-16 right-4 left-4 z-40 bg-amber-50/95 dark:bg-amber-950/95 border-2 border-amber-200 dark:border-amber-900/60 rounded-2xl p-4 shadow-xl animate-fade-in text-slate-850 dark:text-slate-200"
                >
                    <div className="flex items-center justify-between border-b border-amber-200/50 dark:border-amber-900/40 pb-2 mb-2">
                        <div className="flex items-center gap-1.5 text-amber-700 dark:text-amber-400 font-extrabold text-sm">
                            <Lightbulb className="w-4 h-4 fill-amber-300 animate-pulse" />
                            <span>Sắc thái từ vựng</span>
                        </div>
                        <button 
                            onClick={(e) => { e.stopPropagation(); setShowNuancePopup(false); }}
                            className="text-amber-600 hover:text-amber-800 dark:text-amber-400 dark:hover:text-amber-305 text-xs font-bold px-2 py-1 hover:bg-amber-100/50 dark:hover:bg-amber-900/30 rounded-lg transition-colors cursor-pointer"
                        >
                            Đóng
                        </button>
                    </div>
                    <p className="text-xs md:text-sm leading-relaxed whitespace-pre-wrap font-semibold">
                        {currentCard.nuance || "Chưa có thông tin sắc thái cho từ vựng này."}
                    </p>
                </div>
            )}
        </div>
    );
};

export default FlashcardModeView;
