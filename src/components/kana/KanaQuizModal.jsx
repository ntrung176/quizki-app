import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { 
    X, Volume2, CheckCircle2, Zap, Play, 
    BookOpen, AlertCircle 
} from 'lucide-react';
import { speakJapanese } from '../../utils/audio';
import { playCorrectSound, playIncorrectSound } from '../../utils/soundEffects';
import { launchFanfare } from '../../utils/celebrations';
import { 
    getUserLearnedPool, 
    generateSpeedQuizQuestions, 
    generateMemoryMatchCards 
} from './kanaQuizHelper';
import KanaQuizCompletionView from './KanaQuizCompletionView';

const KanaQuizModal = ({
    isOpen,
    onClose,
    targetType = 'hiragana', // 'hiragana' | 'katakana'
    kanaList = [],
    masteredList = [],
    awardXP
}) => {
    const [gameMode, setGameMode] = useState('speed_quiz'); // 'speed_quiz' | 'memory_match' | 'typing'
    const [quizIndex, setQuizIndex] = useState(0);
    const [score, setScore] = useState(0);
    const [streak, setStreak] = useState(0);
    const [questions, setQuestions] = useState([]);
    const [selectedOption, setSelectedOption] = useState(null);
    const [isAnswered, setIsAnswered] = useState(false);
    const [isQuizCompleted, setIsQuizCompleted] = useState(false);

    // Memory match state
    const [cards, setCards] = useState([]);
    const [flippedIndices, setFlippedIndices] = useState([]);
    const [matchedPairs, setMatchedPairs] = useState([]);

    // Typing state
    const [typedText, setTypedText] = useState('');
    const [typingFeedback, setTypingFeedback] = useState(null);

    // Filter user learned pool vs fallback pool
    const { pool, isCustomMastered, masteredCount } = useMemo(() => {
        return getUserLearnedPool(targetType, masteredList, kanaList);
    }, [targetType, masteredList, kanaList]);

    // Initialize Speed Quiz Questions
    const initSpeedQuiz = useCallback(() => {
        const generated = generateSpeedQuizQuestions(pool, targetType, 10);
        setQuestions(generated);
        setQuizIndex(0);
        setScore(0);
        setStreak(0);
        setSelectedOption(null);
        setIsAnswered(false);
        setIsQuizCompleted(false);

        // Auto-play audio for the first question if it's a listening question
        if (generated[0]?.autoPlayAudio && generated[0]?.audioChar) {
            setTimeout(() => speakJapanese(generated[0].audioChar), 300);
        }
    }, [pool, targetType]);

    // Initialize Memory Match Cards
    const initMemoryMatch = useCallback(() => {
        const gameCards = generateMemoryMatchCards(pool, targetType, 6);
        setCards(gameCards);
        setFlippedIndices([]);
        setMatchedPairs([]);
        setIsQuizCompleted(false);
    }, [pool, targetType]);

    // Typing mode initialization
    const initTyping = useCallback(() => {
        const generated = generateSpeedQuizQuestions(pool, targetType, 10).filter(q => q.type === 'char_to_romaji' || q.type === 'listening_kana');
        setQuestions(generated.length >= 5 ? generated : generateSpeedQuizQuestions(pool, targetType, 10));
        setQuizIndex(0);
        setScore(0);
        setStreak(0);
        setTypedText('');
        setTypingFeedback(null);
        setIsAnswered(false);
        setIsQuizCompleted(false);
    }, [pool, targetType]);

    useEffect(() => {
        if (isOpen) {
            if (gameMode === 'speed_quiz') initSpeedQuiz();
            else if (gameMode === 'memory_match') initMemoryMatch();
            else if (gameMode === 'typing') initTyping();
        }
    }, [isOpen, gameMode, initSpeedQuiz, initMemoryMatch, initTyping]);

    if (!isOpen) return null;

    const currentQ = questions[quizIndex] || null;

    // Auto play audio when question advances (for listening questions)
    const handleNextQuestion = (nextIndex) => {
        setQuizIndex(nextIndex);
        setSelectedOption(null);
        setIsAnswered(false);
        setTypedText('');
        setTypingFeedback(null);

        const nextQ = questions[nextIndex];
        if (nextQ?.autoPlayAudio && nextQ?.audioChar) {
            setTimeout(() => speakJapanese(nextQ.audioChar), 250);
        }
    };

    // Handle Option Select
    const handleSelectOption = (opt) => {
        if (isAnswered || !currentQ) return;

        setSelectedOption(opt);
        setIsAnswered(true);

        const isCorrect = opt === currentQ.correct;
        if (isCorrect) {
            playCorrectSound();
            setScore(prev => prev + 10);
            setStreak(prev => prev + 1);
        } else {
            playIncorrectSound();
            setStreak(0);
        }

        if (currentQ.audioChar) {
            speakJapanese(currentQ.audioChar);
        }

        setTimeout(() => {
            if (quizIndex + 1 < questions.length) {
                handleNextQuestion(quizIndex + 1);
            } else {
                setIsQuizCompleted(true);
                launchFanfare();
                if (awardXP) awardXP(40);
            }
        }, 1200);
    };

    // Handle Memory Match Flip
    const handleCardClick = (idx) => {
        if (flippedIndices.length === 2 || flippedIndices.includes(idx) || matchedPairs.includes(cards[idx].pairId)) {
            return;
        }

        const newFlipped = [...flippedIndices, idx];
        setFlippedIndices(newFlipped);

        if (cards[idx]?.audioChar) {
            speakJapanese(cards[idx].audioChar);
        }

        if (newFlipped.length === 2) {
            const [firstIdx, secondIdx] = newFlipped;
            const firstCard = cards[firstIdx];
            const secondCard = cards[secondIdx];

            if (firstCard.pairId === secondCard.pairId) {
                playCorrectSound();
                setMatchedPairs(prev => {
                    const updated = [...prev, firstCard.pairId];
                    if (updated.length === cards.length / 2) {
                        setTimeout(() => {
                            setIsQuizCompleted(true);
                            launchFanfare();
                            if (awardXP) awardXP(45);
                        }, 500);
                    }
                    return updated;
                });
                setFlippedIndices([]);
            } else {
                playIncorrectSound();
                setTimeout(() => {
                    setFlippedIndices([]);
                }, 900);
            }
        }
    };

    // Handle Typing Submit
    const handleTypingSubmit = (e) => {
        e.preventDefault();
        if (!typedText.trim() || !currentQ || isAnswered) return;

        const expected = (currentQ.romaji || currentQ.correct || '').trim().toLowerCase();
        const userInput = typedText.trim().toLowerCase();
        const isCorrect = userInput === expected;

        setIsAnswered(true);

        if (isCorrect) {
            playCorrectSound();
            setTypingFeedback('correct');
            setScore(prev => prev + 15);
            setStreak(prev => prev + 1);
        } else {
            playIncorrectSound();
            setTypingFeedback('wrong');
            setStreak(0);
        }

        if (currentQ.audioChar) {
            speakJapanese(currentQ.audioChar);
        }

        setTimeout(() => {
            if (quizIndex + 1 < questions.length) {
                handleNextQuestion(quizIndex + 1);
            } else {
                setIsQuizCompleted(true);
                launchFanfare();
                if (awardXP) awardXP(50);
            }
        }, 1200);
    };

    return (
        <div className="fixed inset-0 z-[110] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fade-in font-sans">
            <div
                onClick={(e) => e.stopPropagation()}
                className="relative w-full max-w-xl bg-white dark:bg-slate-900 border-2 border-emerald-500/20 rounded-3xl shadow-2xl overflow-hidden flex flex-col my-auto transition-all"
            >
                {/* Header Strip */}
                <div className="bg-emerald-500 dark:bg-emerald-600 border-b-4 border-emerald-700 p-3.5 sm:p-4 text-white flex items-center justify-between">
                    <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center text-lg shadow-inner shrink-0">
                            ⚡
                        </div>
                        <div className="min-w-0">
                            <h3 className="text-sm sm:text-base font-black tracking-tight truncate">
                                Luyện Phản Xạ Bảng Chữ Cái
                            </h3>
                            <p className="text-[11px] text-emerald-100 font-medium truncate">
                                {targetType === 'hiragana' ? 'Bảng chữ mềm Hiragana' : 'Bảng chữ cứng Katakana'}
                            </p>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        className="p-1.5 sm:p-2 rounded-xl bg-white/20 hover:bg-white/30 text-white transition-all hover:scale-105 active:scale-95 shadow-xs cursor-pointer shrink-0"
                        title="Đóng"
                    >
                        <X className="w-4 h-4 sm:w-5 sm:h-5" />
                    </button>
                </div>

                {/* Sub-Header: Learned Status Pill */}
                <div className="px-3.5 sm:px-4 py-2 bg-slate-50 dark:bg-slate-950/70 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2 text-xs">
                    {isCustomMastered ? (
                        <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 font-bold truncate">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                            <span className="truncate">Luyện tập từ <strong>{masteredCount} chữ</strong> bạn đã đánh dấu thuộc (✓)</span>
                        </div>
                    ) : (
                        <div className="flex items-center gap-1.5 text-amber-700 dark:text-amber-400 font-medium truncate">
                            <AlertCircle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                            <span className="truncate">Đã thuộc {masteredCount} chữ. Đang bổ sung chữ mẫu để đủ bộ câu hỏi.</span>
                        </div>
                    )}

                    <span className="text-[10px] font-mono font-bold text-slate-400 shrink-0">
                        {pool.length} ký tự trong kho
                    </span>
                </div>

                {/* Game Mode Selector Bar */}
                <div className="flex items-center border-b-2 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2 gap-1.5 sm:gap-2">
                    <button
                        type="button"
                        onClick={() => { setGameMode('speed_quiz'); setIsQuizCompleted(false); }}
                        className={`flex-1 py-2 sm:py-2.5 rounded-xl text-[11px] sm:text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5 select-none ${
                            gameMode === 'speed_quiz'
                                ? 'bg-sky-500 text-white border-b-4 border-sky-700 active:translate-y-0.5 active:border-b-0 shadow-xs'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700'
                        }`}
                    >
                        <Zap className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">4 Đáp án</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => { setGameMode('memory_match'); setIsQuizCompleted(false); }}
                        className={`flex-1 py-2 sm:py-2.5 rounded-xl text-[11px] sm:text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5 select-none ${
                            gameMode === 'memory_match'
                                ? 'bg-amber-500 text-white border-b-4 border-amber-700 active:translate-y-0.5 active:border-b-0 shadow-xs'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700'
                        }`}
                    >
                        <BookOpen className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">Ghép thẻ</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => { setGameMode('typing'); setIsQuizCompleted(false); }}
                        className={`flex-1 py-2 sm:py-2.5 rounded-xl text-[11px] sm:text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5 select-none ${
                            gameMode === 'typing'
                                ? 'bg-emerald-500 text-white border-b-4 border-emerald-700 active:translate-y-0.5 active:border-b-0 shadow-xs'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700'
                        }`}
                    >
                        <Play className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">Gõ phản xạ</span>
                    </button>
                </div>

                {/* Main Game Screen */}
                <div className="p-4 sm:p-5 min-h-[320px] flex flex-col justify-center items-center">
                    {isQuizCompleted ? (
                        <KanaQuizCompletionView
                            score={score}
                            onRetry={() => {
                                if (gameMode === 'memory_match') initMemoryMatch();
                                else if (gameMode === 'typing') initTyping();
                                else initSpeedQuiz();
                            }}
                            onClose={onClose}
                        />
                    ) : gameMode === 'speed_quiz' && currentQ ? (
                        /* SPEED QUIZ 4-OPTIONS VIEW */
                        <div className="w-full space-y-4 animate-fade-in">
                            {/* Question Header & Stats Bar */}
                            <div className="flex items-center justify-between text-xs font-bold text-slate-500">
                                <div className="flex items-center gap-2">
                                    <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[11px] font-black">
                                        {currentQ.badge || 'Câu hỏi'}
                                    </span>
                                    <span>Câu {quizIndex + 1} / {questions.length}</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="text-amber-500 flex items-center gap-1 font-bold">
                                        🔥 {streak}
                                    </span>
                                    <span className="text-sky-600 dark:text-sky-400 font-bold">
                                        {score} pts
                                    </span>
                                </div>
                            </div>

                            {/* Question Prompt Title */}
                            <div className="text-center space-y-0.5">
                                <h4 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                                    {currentQ.title}
                                </h4>
                                <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400">
                                    {currentQ.subtitle}
                                </p>
                            </div>

                            {/* Question Main Display Card */}
                            <div className="flex flex-col items-center justify-center p-5 sm:p-6 rounded-2xl sm:rounded-3xl bg-slate-50 dark:bg-slate-800/60 border-2 border-slate-200 dark:border-slate-700 shadow-inner text-center relative group min-h-[110px]">
                                {currentQ.isAudioPrompt ? (
                                    <button
                                        type="button"
                                        onClick={() => speakJapanese(currentQ.audioChar)}
                                        className="px-5 py-3 rounded-2xl bg-sky-500 hover:bg-sky-400 text-white font-black text-sm flex items-center gap-2 border-b-4 border-sky-700 active:translate-y-0.5 active:border-b-0 cursor-pointer shadow-sm transition"
                                    >
                                        <Volume2 className="w-5 h-5 animate-pulse" />
                                        <span>Bấm nghe lại âm thanh</span>
                                    </button>
                                ) : (
                                    <>
                                        <span className={`font-black text-slate-900 dark:text-white font-japanese select-none ${
                                            currentQ.display.length > 2 
                                                ? 'text-2xl sm:text-3xl' 
                                                : 'text-4xl sm:text-5xl'
                                        }`}>
                                            {currentQ.display}
                                        </span>
                                        {currentQ.audioChar && (
                                            <button
                                                type="button"
                                                onClick={() => speakJapanese(currentQ.audioChar)}
                                                className="mt-2 p-1.5 rounded-full bg-white dark:bg-slate-700 text-sky-500 dark:text-sky-400 shadow-xs hover:scale-110 active:scale-95 transition-all cursor-pointer"
                                                title="Nghe phát âm"
                                            >
                                                <Volume2 className="w-3.5 h-3.5" />
                                            </button>
                                        )}
                                    </>
                                )}
                            </div>

                            {/* 4 Options Grid */}
                            <div className="grid grid-cols-2 gap-2 sm:gap-2.5">
                                {currentQ.options.map((opt, idx) => {
                                    const isSelected = selectedOption === opt;
                                    const isCorrect = opt === currentQ.correct;

                                    let btnStyle = 'bg-white dark:bg-slate-800 border-2 border-b-4 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:border-emerald-400 active:translate-y-0.5 active:border-b-2 shadow-xs';

                                    if (isAnswered) {
                                        if (isCorrect) {
                                            btnStyle = 'bg-emerald-500 text-white border-b-4 border-emerald-700 shadow-md scale-[1.02]';
                                        } else if (isSelected) {
                                            btnStyle = 'bg-rose-500 text-white border-b-4 border-rose-700 shadow-md';
                                        } else {
                                            btnStyle = 'bg-slate-100 dark:bg-slate-800/40 text-slate-400 border border-slate-200 dark:border-slate-800 opacity-40';
                                        }
                                    }

                                    return (
                                        <button
                                            key={idx}
                                            type="button"
                                            onClick={() => handleSelectOption(opt)}
                                            disabled={isAnswered}
                                            className={`p-3 sm:p-3.5 rounded-xl font-black transition-all cursor-pointer flex items-center justify-center select-none text-center ${btnStyle} ${
                                                opt.length > 4 
                                                    ? 'text-xs sm:text-sm font-sans' 
                                                    : 'text-lg sm:text-xl font-japanese'
                                            }`}
                                        >
                                            {currentQ.type === 'char_to_romaji' ? `/${opt}/` : opt}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    ) : gameMode === 'memory_match' ? (
                        /* MEMORY MATCH PAIR FLIP GAME */
                        <div className="w-full space-y-3.5 animate-fade-in">
                            <div className="flex items-center justify-between text-xs font-bold text-slate-500 px-1">
                                <span>Ghép cặp Hiragana ↔ Katakana / Romaji</span>
                                <span className="text-emerald-500 font-bold">
                                    Đã ghép: {matchedPairs.length} / {cards.length / 2}
                                </span>
                            </div>

                            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 sm:gap-2.5">
                                {cards.map((card, idx) => {
                                    const isFlipped = flippedIndices.includes(idx);
                                    const isMatched = matchedPairs.includes(card.pairId);

                                    return (
                                        <div
                                            key={card.uniqueId}
                                            onClick={() => handleCardClick(idx)}
                                            className={`h-20 sm:h-22 rounded-xl flex flex-col items-center justify-center p-1.5 border-2 transition-all duration-200 cursor-pointer select-none active:translate-y-0.5 ${
                                                isMatched
                                                    ? 'bg-emerald-50 dark:bg-emerald-950/40 border-b-4 border-emerald-500 text-emerald-600 dark:text-emerald-400 opacity-60 scale-95'
                                                    : isFlipped
                                                        ? 'bg-emerald-500 text-white border-b-4 border-emerald-700 shadow-md scale-102'
                                                        : 'bg-white dark:bg-slate-800 border-b-4 border-slate-300 dark:border-slate-700 hover:border-emerald-400 text-slate-800 dark:text-slate-200 hover:scale-101'
                                            }`}
                                        >
                                            {isFlipped || isMatched ? (
                                                <>
                                                    <span className="text-xl sm:text-2xl font-black font-japanese">
                                                        {card.content}
                                                    </span>
                                                    <span className="text-[8px] sm:text-[9px] font-sans font-black uppercase opacity-85 mt-0.5">
                                                        {card.sub}
                                                    </span>
                                                </>
                                            ) : (
                                                <span className="text-xl text-slate-400 font-bold opacity-50">❓</span>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ) : gameMode === 'typing' && currentQ ? (
                        /* TYPING REFLEX MODE */
                        <div className="w-full space-y-4 animate-fade-in max-w-sm text-center">
                            <div className="flex items-center justify-between text-xs font-bold text-slate-500">
                                <span>Câu {quizIndex + 1} / {questions.length}</span>
                                <span className="text-sky-600 dark:text-sky-400 font-bold">{score} pts</span>
                            </div>

                            <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border-2 border-slate-200 dark:border-slate-700 shadow-inner">
                                <span className="text-5xl sm:text-6xl font-black text-slate-900 dark:text-white font-japanese block animate-bounce">
                                    {currentQ.kanaChar || currentQ.display}
                                </span>
                                <span className="text-xs text-slate-400 font-medium mt-1.5 block">
                                    Gõ phiên âm Romaji của ký tự này
                                </span>
                            </div>

                            <form onSubmit={handleTypingSubmit} className="space-y-2.5">
                                <input
                                    type="text"
                                    autoFocus
                                    value={typedText}
                                    onChange={(e) => setTypedText(e.target.value)}
                                    placeholder="Nhập romaji (VD: ka, shi, a)..."
                                    disabled={isAnswered}
                                    className={`w-full p-3 rounded-xl border-2 text-center text-lg font-mono font-bold outline-none transition-all ${
                                        typingFeedback === 'correct'
                                            ? 'bg-emerald-50 border-emerald-500 text-emerald-700'
                                            : typingFeedback === 'wrong'
                                                ? 'bg-rose-50 border-rose-500 text-rose-700'
                                                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:border-emerald-500 text-slate-900 dark:text-white'
                                    }`}
                                />
                                <button
                                    type="submit"
                                    disabled={isAnswered || !typedText.trim()}
                                    className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 border-b-4 border-emerald-700 active:translate-y-0.5 active:border-b-0 disabled:opacity-40 text-white font-black uppercase tracking-wider text-xs rounded-xl transition-all cursor-pointer select-none"
                                >
                                    Kiểm tra đáp án
                                </button>
                            </form>
                        </div>
                    ) : null}
                </div>
            </div>
        </div>
    );
};

export default KanaQuizModal;
