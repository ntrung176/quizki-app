import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { X, Volume2, CheckCircle2, RotateCcw, Zap, Trophy, Play, ArrowRight, Award, BookOpen } from 'lucide-react';
import { speakKorean } from '../../utils/audio';
import { playCorrectSound, playIncorrectSound } from '../../utils/soundEffects';
import { launchFanfare } from '../../utils/celebrations';
import { shuffleArray } from '../../utils/textProcessing';
import { HANGUL_DICTIONARY } from '../../data/hangulData';

const HangulQuizModal = ({
    isOpen,
    onClose,
    hangulList = [],
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

    // Memory match game state
    const [cards, setCards] = useState([]);
    const [flippedIndices, setFlippedIndices] = useState([]);
    const [matchedPairs, setMatchedPairs] = useState([]);

    // Typing mode state
    const [typedText, setTypedText] = useState('');
    const [typingFeedback, setTypingFeedback] = useState(null);

    // Generate questions for Speed Quiz
    const initSpeedQuiz = useCallback(() => {
        const pool = hangulList.length >= 4 ? hangulList : Object.values(HANGUL_DICTIONARY);
        const shuffled = shuffleArray([...pool]).slice(0, 10);
        const generated = shuffled.map(q => {
            const wrongOptions = pool
                .filter(p => p.id !== q.id)
                .sort(() => 0.5 - Math.random())
                .slice(0, 3)
                .map(p => p.romaji);

            const options = shuffleArray([q.romaji, ...wrongOptions]);
            return {
                ...q,
                options,
                correct: q.romaji
            };
        });

        setQuestions(generated);
        setQuizIndex(0);
        setScore(0);
        setStreak(0);
        setSelectedOption(null);
        setIsAnswered(false);
        setIsQuizCompleted(false);
    }, [hangulList]);

    // Generate Memory Match Pairs (Hangul ↔ Romaji)
    const initMemoryMatch = useCallback(() => {
        const pool = hangulList.length >= 6 ? hangulList : Object.values(HANGUL_DICTIONARY);
        const selected = shuffleArray([...pool]).slice(0, 6);

        const cardPairs = [];
        selected.forEach((item, idx) => {
            cardPairs.push({
                id: `hangul_${idx}`,
                pairId: idx,
                display: item.char,
                type: 'hangul',
                audio: item.char
            });
            cardPairs.push({
                id: `romaji_${idx}`,
                pairId: idx,
                display: `/${item.romaji}/`,
                type: 'romaji',
                audio: item.char
            });
        });

        setCards(shuffleArray(cardPairs));
        setFlippedIndices([]);
        setMatchedPairs([]);
        setIsQuizCompleted(false);
    }, [hangulList]);

    // Initializer based on active mode
    useEffect(() => {
        if (!isOpen) return;
        if (gameMode === 'speed_quiz' || gameMode === 'typing') {
            initSpeedQuiz();
        } else if (gameMode === 'memory_match') {
            initMemoryMatch();
        }
    }, [isOpen, gameMode, initSpeedQuiz, initMemoryMatch]);

    if (!isOpen) return null;

    const currentQ = questions[quizIndex];

    // Handle Option Selection in Speed Quiz
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

        speakKorean(currentQ.char);

        setTimeout(() => {
            if (quizIndex + 1 < questions.length) {
                setQuizIndex(prev => prev + 1);
                setSelectedOption(null);
                setIsAnswered(false);
            } else {
                setIsQuizCompleted(true);
                launchFanfare();
                if (awardXP) awardXP(30);
            }
        }, 1100);
    };

    // Handle Memory Match Card Click
    const handleCardClick = (idx) => {
        if (flippedIndices.length === 2 || flippedIndices.includes(idx) || matchedPairs.includes(cards[idx].pairId)) {
            return;
        }

        const newFlipped = [...flippedIndices, idx];
        setFlippedIndices(newFlipped);

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
                            if (awardXP) awardXP(40);
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

    return (
        <div className="fixed inset-0 z-[110] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fade-in">
            <div
                onClick={(e) => e.stopPropagation()}
                className="relative w-full max-w-xl bg-white dark:bg-slate-900 border-2 border-cyan-400/30 dark:border-cyan-500/20 rounded-3xl shadow-2xl overflow-hidden flex flex-col my-auto transition-all"
            >
                {/* Header */}
                <div className="bg-gradient-to-r from-cyan-600 via-sky-600 to-blue-600 p-4 sm:p-5 text-white flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                        <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-xl shadow-inner font-sans font-black">
                            가
                        </div>
                        <div>
                            <h3 className="text-base sm:text-lg font-black tracking-tight">
                                Luyện Phản Xạ Bảng Chữ Hangul
                            </h3>
                            <p className="text-[11px] text-sky-100 font-medium">
                                Nâng cao tốc độ nhận diện phụ âm và nguyên âm tiếng Hàn
                            </p>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        className="p-2 rounded-2xl bg-white/20 hover:bg-white/30 text-white transition-all hover:scale-105 active:scale-95 shadow-md cursor-pointer"
                        title="Đóng game"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Game Mode Selector Bar */}
                <div className="flex items-center border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 p-1.5 gap-1.5">
                    <button
                        type="button"
                        onClick={() => { setGameMode('speed_quiz'); setIsQuizCompleted(false); }}
                        className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                            gameMode === 'speed_quiz'
                                ? 'bg-white dark:bg-slate-800 text-cyan-600 dark:text-cyan-400 shadow-sm'
                                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50'
                        }`}
                    >
                        <Zap className="w-3.5 h-3.5" />
                        <span>Trắc nghiệm 4 đáp án</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => { setGameMode('memory_match'); setIsQuizCompleted(false); }}
                        className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                            gameMode === 'memory_match'
                                ? 'bg-white dark:bg-slate-800 text-amber-600 dark:text-amber-400 shadow-sm'
                                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50'
                        }`}
                    >
                        <BookOpen className="w-3.5 h-3.5" />
                        <span>Ghép cặp thẻ nhớ</span>
                    </button>
                </div>

                {/* Main Game Screen */}
                <div className="p-5 sm:p-6 min-h-[340px] flex flex-col justify-center items-center">
                    {isQuizCompleted ? (
                        /* COMPLETION VIEW */
                        <div className="text-center space-y-5 py-4 animate-fade-in w-full max-w-sm">
                            <div className="text-6xl animate-bounce">🏆</div>
                            <div>
                                <h3 className="text-2xl font-black text-slate-800 dark:text-white">
                                    Hoàn thành xuất sắc!
                                </h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">
                                    Bạn đã rèn luyện phản xạ với các ký tự bảng chữ cái tiếng Hàn.
                                </p>
                            </div>

                            <div className="p-4 rounded-2xl bg-cyan-50 dark:bg-cyan-950/30 border border-cyan-200 dark:border-cyan-800/60 flex items-center justify-around">
                                <div className="text-center">
                                    <span className="text-xs font-bold text-slate-400 uppercase block">Điểm số</span>
                                    <span className="text-2xl font-black text-cyan-600 dark:text-cyan-400 font-mono">{score}</span>
                                </div>
                                <div className="h-8 w-px bg-slate-200 dark:bg-slate-800" />
                                <div className="text-center">
                                    <span className="text-xs font-bold text-slate-400 uppercase block">Thưởng XP</span>
                                    <span className="text-2xl font-black text-amber-500 font-mono">+40 XP</span>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 pt-2">
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (gameMode === 'speed_quiz') initSpeedQuiz();
                                        else initMemoryMatch();
                                    }}
                                    className="flex-1 py-3 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
                                >
                                    <RotateCcw className="w-4 h-4" />
                                    <span>Chơi lại</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-sm shadow-lg shadow-cyan-500/25 transition-all cursor-pointer"
                                >
                                    <span>Hoàn tất</span>
                                </button>
                            </div>
                        </div>
                    ) : gameMode === 'speed_quiz' && currentQ ? (
                        /* SPEED QUIZ 4-OPTIONS VIEW */
                        <div className="w-full space-y-6 animate-fade-in">
                            {/* Progress & Score bar */}
                            <div className="flex items-center justify-between text-xs font-bold text-slate-500">
                                <span>Câu {quizIndex + 1} / {questions.length}</span>
                                <div className="flex items-center gap-3">
                                    <span className="text-amber-500 flex items-center gap-1">
                                        🔥 Chuỗi: {streak}
                                    </span>
                                    <span className="text-cyan-600 dark:text-cyan-400">
                                        Điểm: {score}
                                    </span>
                                </div>
                            </div>

                            {/* Question Character Prompt */}
                            <div className="flex flex-col items-center justify-center p-8 rounded-3xl bg-slate-50 dark:bg-slate-800/60 border-2 border-cyan-200/60 dark:border-cyan-500/20 shadow-inner text-center relative group">
                                <span className="text-6xl sm:text-7xl font-black text-slate-900 dark:text-white font-sans select-none animate-pulse">
                                    {currentQ.char}
                                </span>
                                <button
                                    type="button"
                                    onClick={() => speakKorean(currentQ.char)}
                                    className="mt-3 p-2 rounded-full bg-white dark:bg-slate-700 text-cyan-600 dark:text-cyan-400 shadow-md hover:scale-110 active:scale-95 transition-all cursor-pointer"
                                    title="Nghe phát âm"
                                >
                                    <Volume2 className="w-4 h-4" />
                                </button>
                            </div>

                            {/* 4 Options Grid */}
                            <div className="grid grid-cols-2 gap-3">
                                {currentQ.options.map((opt, idx) => {
                                    const isSelected = selectedOption === opt;
                                    const isCorrect = opt === currentQ.correct;

                                    let btnStyle = 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:border-cyan-400 hover:shadow-md';

                                    if (isAnswered) {
                                        if (isCorrect) {
                                            btnStyle = 'bg-emerald-500 text-white border-emerald-600 shadow-lg shadow-emerald-500/30 scale-[1.02]';
                                        } else if (isSelected) {
                                            btnStyle = 'bg-rose-500 text-white border-rose-600 shadow-lg shadow-rose-500/30';
                                        } else {
                                            btnStyle = 'bg-slate-100 dark:bg-slate-800/40 text-slate-400 border-transparent opacity-50';
                                        }
                                    }

                                    return (
                                        <button
                                            key={idx}
                                            type="button"
                                            onClick={() => handleSelectOption(opt)}
                                            disabled={isAnswered}
                                            className={`p-4 rounded-2xl border-2 font-mono text-xl sm:text-2xl font-black transition-all cursor-pointer flex items-center justify-center select-none active:scale-95 ${btnStyle}`}
                                        >
                                            /{opt}/
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    ) : gameMode === 'memory_match' ? (
                        /* MEMORY MATCH PAIR FLIP GAME */
                        <div className="w-full space-y-4 animate-fade-in">
                            <div className="flex items-center justify-between text-xs font-bold text-slate-500 px-1">
                                <span>Tìm các cặp Hangul ↔ Phiên âm tương ứng</span>
                                <span className="text-emerald-500 font-bold">
                                    Đã ghép: {matchedPairs.length} / {cards.length / 2}
                                </span>
                            </div>

                            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5 sm:gap-3">
                                {cards.map((card, idx) => {
                                    const isFlipped = flippedIndices.includes(idx);
                                    const isMatched = matchedPairs.includes(card.pairId);

                                    return (
                                        <div
                                            key={card.id}
                                            onClick={() => handleCardClick(idx)}
                                            className={`h-24 sm:h-28 rounded-2xl border-2 flex items-center justify-center text-xl sm:text-2xl font-black transition-all duration-300 cursor-pointer select-none ${
                                                isMatched
                                                    ? 'bg-emerald-500 text-white border-emerald-600 opacity-60 pointer-events-none scale-95'
                                                    : isFlipped
                                                        ? 'bg-gradient-to-br from-cyan-600 to-blue-600 text-white border-cyan-500 shadow-lg scale-105'
                                                        : 'bg-slate-100 dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700 hover:border-cyan-400 hover:bg-slate-200 dark:hover:bg-slate-750'
                                            }`}
                                        >
                                            {isFlipped || isMatched ? (
                                                <span className={card.type === 'hangul' ? 'font-sans text-3xl' : 'font-mono text-lg'}>
                                                    {card.display}
                                                </span>
                                            ) : (
                                                <span className="text-lg opacity-40 font-mono font-bold">?</span>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ) : null}
                </div>
            </div>
        </div>
    );
};

export default HangulQuizModal;
