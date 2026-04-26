import React, { useState, useEffect, useRef } from 'react';
import { Headphones, ArrowLeft, Volume2, CheckCircle, XCircle } from 'lucide-react';
import { speakJapanese } from '../../utils/audio';
import { shuffleArray } from '../../utils/textProcessing';
import { playCorrectSound, playIncorrectSound, launchFireworks, playCompletionFanfare } from '../../utils/soundEffects';
import FuriganaText from '../ui/FuriganaText';

const StudyScreen = ({ studySessionData, setStudySessionData, allCards, onUpdateCard, onSaveCardAudio, onCompleteStudy, onBack }) => {
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [vocabInput, setVocabInput] = useState('');
    const [exampleInput, setExampleInput] = useState('');
    const [isRevealed, setIsRevealed] = useState(false);
    const [feedback, setFeedback] = useState(null); // { vocab: true/false, example: true/false }
    const [isProcessing, setIsProcessing] = useState(false);

    // Default mode dictation fallback
    const queue = studySessionData?.cards || [];
    const currentCard = queue[currentQuestionIndex];

    const vocabInputRef = useRef(null);

    // Initial load setup
    useEffect(() => {
        if (!currentCard && queue.length > 0) {
            setCurrentQuestionIndex(0);
        }
    }, [queue, currentCard]);

    // Reset inputs when moving to next card
    useEffect(() => {
        setVocabInput('');
        setExampleInput('');
        setIsRevealed(false);
        setFeedback(null);
        if (vocabInputRef.current) {
            setTimeout(() => vocabInputRef.current?.focus(), 100);
        }

        // Auto-play vocab audio initially if setting permits, for now just auto-play:
        if (currentCard && !isRevealed) {
            setTimeout(() => {
                speakJapanese(currentCard.front, currentCard.audioBase64, onSaveCardAudio ? (b64, vid) => onSaveCardAudio(currentCard.id, b64, vid) : null);
            }, 300);
        }
    }, [currentQuestionIndex, currentCard]);

    const normalizeText = (text) => {
        if (!text) return '';
        // Remove furigana parentheses, punctuation, spaces
        return text
            .replace(/（[^）]*）/g, '')
            .replace(/\([^)]*\)/g, '')
            .replace(/[。、！？\s]/g, '')
            .toLowerCase();
    };

    const handleCheckAnswer = async () => {
        if (isProcessing) return;
        setIsProcessing(true);

        const vocabCorrect = normalizeText(vocabInput) === normalizeText(currentCard.front) || normalizeText(vocabInput) === normalizeText(currentCard.reading);

        let exampleCorrect = true;
        if (currentCard.example) {
            exampleCorrect = normalizeText(exampleInput) === normalizeText(currentCard.example);
        }

        const completelyCorrect = vocabCorrect && exampleCorrect;

        setFeedback({ vocab: vocabCorrect, example: exampleCorrect, completelyCorrect });
        setIsRevealed(true);

        if (completelyCorrect) {
            playCorrectSound();
            // Also update SRS if needed? The user didn't mention SRS for Dictation, it could just be a practice mode.
            // But we can call onUpdateCard with a 'dictation' type if needed.
            // onUpdateCard(currentCard.id, completelyCorrect, 'back', 'dictation', 0);
        } else {
            playIncorrectSound();
        }

        setIsProcessing(false);
    };

    const handleNext = () => {
        if (currentQuestionIndex < queue.length - 1) {
            setCurrentQuestionIndex(currentQuestionIndex + 1);
        } else {
            launchFireworks();
            playCompletionFanfare();
            if (onCompleteStudy) onCompleteStudy();
        }
    };

    if (!currentCard) {
        return (
            <div className="flex flex-col items-center justify-center h-full">
                <p className="text-gray-500 mb-4">Không có thẻ nào để luyện nghe.</p>
                <button onClick={onBack} className="btn-primary">Trở lại</button>
            </div>
        );
    }

    const progress = ((currentQuestionIndex) / queue.length) * 100;

    return (
        <div className="relative w-full h-full flex flex-col justify-center">
            <div className="w-[800px] max-w-[95vw] mx-auto my-auto flex flex-col justify-center items-center space-y-3">
                {onBack && (
                    <div className="w-full flex justify-start mb-1">
                        <button
                            onClick={onBack}
                            className="p-2.5 flex items-center justify-center rounded-xl bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-300 shadow-md border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700 transition-all hover:scale-105"
                        >
                            <ArrowLeft className="w-5 h-5" />
                            <span className="text-sm font-medium ml-1">Trở lại</span>
                        </button>
                    </div>
                )}

                <div className="w-full flex flex-col justify-center items-center space-y-4 p-5 md:p-8 bg-white dark:bg-slate-900 border-2 border-indigo-400/30 rounded-3xl shadow-xl">
                    <div className="w-full space-y-2 flex-shrink-0">
                        <div className="flex justify-between items-center text-sm font-bold text-indigo-500 dark:text-indigo-400">
                            <span className="flex items-center gap-2">
                                <Headphones className="w-5 h-5" />
                                DICTATION
                            </span>
                            <span className="text-gray-500">{currentQuestionIndex + 1} / {queue.length}</span>
                        </div>
                        <div className="h-2 w-full bg-gray-100 dark:bg-slate-800 rounded-full overflow-hidden">
                            <div className="h-full bg-indigo-500 rounded-full transition-all duration-300" style={{ width: `${progress}%` }}></div>
                        </div>
                    </div>

                    <div className="w-full space-y-6 mt-4">
                        {/* Từ vựng */}
                        <div className="bg-slate-50 dark:bg-slate-800/50 p-4 md:p-6 rounded-2xl border border-gray-200 dark:border-slate-700">
                            <div className="flex items-center gap-4 mb-4">
                                <button
                                    onClick={() => speakJapanese(currentCard.front, currentCard.audioBase64, onSaveCardAudio ? (b64, vid) => onSaveCardAudio(currentCard.id, b64, vid) : null)}
                                    className="p-4 bg-indigo-100 hover:bg-indigo-200 dark:bg-indigo-900/50 dark:hover:bg-indigo-800/50 text-indigo-600 dark:text-indigo-400 rounded-full transition-all flex-shrink-0 shadow-sm"
                                >
                                    <Volume2 className="w-8 h-8" />
                                </button>
                                <div className="flex-1">
                                    <h3 className="text-sm font-bold text-gray-500 dark:text-gray-400 mb-2">từ vựng</h3>
                                    <input
                                        ref={vocabInputRef}
                                        type="text"
                                        value={vocabInput}
                                        onChange={e => setVocabInput(e.target.value)}
                                        disabled={isRevealed}
                                        placeholder="Nhập từ vựng nghe được..."
                                        className="w-full p-3 font-japanese text-lg bg-white dark:bg-slate-900 border-2 border-gray-200 dark:border-slate-700 rounded-xl focus:border-indigo-500 outline-none transition-colors"
                                        onKeyDown={e => e.key === 'Enter' && (!currentCard.example || exampleInput) && !isRevealed && handleCheckAnswer()}
                                    />
                                    {isRevealed && (
                                        <div className={`mt-3 p-3 rounded-xl border flex items-center gap-3 ${feedback?.vocab ? 'bg-green-50 border-green-200 text-green-700 dark:bg-green-900/20' : 'bg-red-50 border-red-200 text-red-700 dark:bg-red-900/20'}`}>
                                            {feedback?.vocab ? <CheckCircle className="w-5 h-5 flex-shrink-0" /> : <XCircle className="w-5 h-5 flex-shrink-0" />}
                                            <div className="font-japanese text-lg font-medium"><FuriganaText text={currentCard.frontWithFurigana || currentCard.front} /></div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Câu ví dụ */}
                        {currentCard.example && (
                            <div className="bg-slate-50 dark:bg-slate-800/50 p-4 md:p-6 rounded-2xl border border-gray-200 dark:border-slate-700">
                                <div className="flex items-center gap-4 mb-4">
                                    <button
                                        onClick={() => speakJapanese(currentCard.example)} // Uses default TTS for example, will cache if setup
                                        className="p-4 bg-teal-100 hover:bg-teal-200 dark:bg-teal-900/50 dark:hover:bg-teal-800/50 text-teal-600 dark:text-teal-400 rounded-full transition-all flex-shrink-0 shadow-sm"
                                    >
                                        <Volume2 className="w-8 h-8" />
                                    </button>
                                    <div className="flex-1">
                                        <h3 className="text-sm font-bold text-gray-500 dark:text-gray-400 mb-2">câu ví dụ</h3>
                                        <input
                                            type="text"
                                            value={exampleInput}
                                            onChange={e => setExampleInput(e.target.value)}
                                            disabled={isRevealed}
                                            placeholder="Nhập câu ví dụ nghe được..."
                                            className="w-full p-3 font-japanese text-lg bg-white dark:bg-slate-900 border-2 border-gray-200 dark:border-slate-700 rounded-xl focus:border-teal-500 outline-none transition-colors"
                                            onKeyDown={e => e.key === 'Enter' && vocabInput && !isRevealed && handleCheckAnswer()}
                                        />
                                        {isRevealed && (
                                            <div className={`mt-3 p-3 text-sm rounded-xl border flex flex-col gap-1 ${feedback?.example ? 'bg-green-50 border-green-200 text-green-700 dark:bg-green-900/20' : 'bg-red-50 border-red-200 text-red-700 dark:bg-red-900/20'}`}>
                                                <div className="flex items-center gap-2">
                                                    {feedback?.example ? <CheckCircle className="w-5 h-5 flex-shrink-0" /> : <XCircle className="w-5 h-5 flex-shrink-0" />}
                                                    <span className="font-japanese font-medium leading-relaxed">{currentCard.example}</span>
                                                </div>
                                                <div className="pl-7 text-xs opacity-80">{currentCard.exampleMeaning}</div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Meaning Revealed */}
                        {isRevealed && (
                            <div className="w-full p-4 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-slate-800 dark:to-indigo-900/20 rounded-xl border border-indigo-100 dark:border-indigo-800/50 text-center animate-fade-in">
                                <h4 className="text-xs uppercase font-bold text-indigo-400 mb-1">ý nghĩa</h4>
                                <p className="text-lg font-bold text-gray-800 dark:text-gray-200">{currentCard.sinoViet || currentCard.meaning}</p>
                                {currentCard.sinoViet && <p className="text-sm text-gray-500 mt-1">{currentCard.meaning}</p>}
                            </div>
                        )}

                        <div className="pt-4">
                            {!isRevealed ? (
                                <button
                                    onClick={handleCheckAnswer}
                                    disabled={!vocabInput.trim() || isProcessing}
                                    className="w-full py-4 rounded-xl font-bold text-lg shadow-lg transition-all flex items-center justify-center bg-indigo-600 text-white hover:bg-indigo-700 hover:shadow-indigo-500/30 disabled:bg-gray-300 disabled:text-gray-500 disabled:shadow-none"
                                >
                                    Kiểm tra
                                </button>
                            ) : (
                                <button
                                    onClick={handleNext}
                                    className="w-full py-4 rounded-xl font-bold text-lg shadow-lg transition-all flex items-center justify-center bg-indigo-600 text-white hover:bg-indigo-700 hover:shadow-indigo-500/30"
                                >
                                    {currentQuestionIndex < queue.length - 1 ? 'Tiếp tục →' : 'Hoàn thành 🎉'}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StudyScreen;
