import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { X, Volume2, CheckCircle2, RotateCcw, Zap, Trophy, Play, ArrowRight, Award, BookOpen } from 'lucide-react';
import { speakJapanese } from '../../utils/audio';
import { playCorrectSound, playIncorrectSound } from '../../utils/soundEffects';
import { launchFanfare } from '../../utils/celebrations';
import { shuffleArray } from '../../utils/textProcessing';
import { KANA_DICTIONARY } from '../../data/kanaData';

const KanaQuizModal = ({
    isOpen,
    onClose,
    targetType = 'hiragana', // 'hiragana' | 'katakana' | 'mixed'
    kanaList = [],
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
        const pool = kanaList.length >= 4 ? kanaList : Object.keys(KANA_DICTIONARY).map(k => {
            const item = KANA_DICTIONARY[k];
            return {
                id: k,
                char: targetType === 'katakana' ? item.kata : item.hira,
                romaji: item.romaji,
                type: targetType
            };
        });

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
    }, [kanaList, targetType]);

    // Generate cards for Memory Match (Match Hiragana with Katakana or Kana with Romaji)
    const initMemoryMatch = useCallback(() => {
        const pool = kanaList.length >= 6 ? kanaList : Object.keys(KANA_DICTIONARY).slice(0, 10).map(k => ({
            id: k,
            char: KANA_DICTIONARY[k].hira,
            otherChar: KANA_DICTIONARY[k].kata,
            romaji: KANA_DICTIONARY[k].romaji
        }));

        const selected = shuffleArray([...pool]).slice(0, 6);
        const gameCards = [];

        selected.forEach((item, index) => {
            gameCards.push({
                uniqueId: `hira-${item.id}`,
                pairId: item.id,
                content: targetType === 'katakana' ? item.romaji : item.char,
                sub: targetType === 'katakana' ? 'Romaji' : 'Hiragana'
            });
            gameCards.push({
                uniqueId: `kata-${item.id}`,
                pairId: item.id,
                content: targetType === 'hiragana' ? item.romaji : (item.otherChar || item.kata),
                sub: targetType === 'hiragana' ? 'Romaji' : 'Katakana'
            });
        });

        setCards(shuffleArray(gameCards));
        setFlippedIndices([]);
        setMatchedPairs([]);
        setIsQuizCompleted(false);
    }, [kanaList, targetType]);

    useEffect(() => {
        if (isOpen) {
            if (gameMode === 'speed_quiz' || gameMode === 'typing') {
                initSpeedQuiz();
            } else if (gameMode === 'memory_match') {
                initMemoryMatch();
            }
        }
    }, [isOpen, gameMode, initSpeedQuiz, initMemoryMatch]);

    if (!isOpen) return null;

    const currentQ = questions[quizIndex] || null;

    // Handle Speed Quiz Option Select
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

        speakJapanese(currentQ.char);

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
        }, 1200);
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

    // Handle Typing Submit
    const handleTypingSubmit = (e) => {
        e.preventDefault();
        if (!typedText.trim() || !currentQ || isAnswered) return;

        const isCorrect = typedText.trim().toLowerCase() === currentQ.correct.toLowerCase();
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

        speakJapanese(currentQ.char);

        setTimeout(() => {
            if (quizIndex + 1 < questions.length) {
                setQuizIndex(prev => prev + 1);
                setTypedText('');
                setTypingFeedback(null);
                setIsAnswered(false);
            } else {
                setIsQuizCompleted(true);
                launchFanfare();
                if (awardXP) awardXP(50);
            }
        }, 1200);
    };

    return (
        <div className="fixed inset-0 z-[110] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fade-in">
            <div
                onClick={(e) => e.stopPropagation()}
                className="relative w-full max-w-xl bg-white dark:bg-slate-900 border-2 border-indigo-400/30 dark:border-indigo-500/20 rounded-3xl shadow-2xl overflow-hidden flex flex-col my-auto transition-all"
            >
                {/* Header */}
                <div className="bg-gradient-to-r from-indigo-600 via-indigo-500 to-sky-500 p-4 sm:p-5 text-white flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                        <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-xl shadow-inner">
                            🎮
                        </div>
                        <div>
                            <h3 className="text-base sm:text-lg font-black tracking-tight">
                                Luyện Phản Xạ Bảng Chữ Cái
                            </h3>
                            <p className="text-[11px] text-indigo-100 font-medium">
                                Nâng cao tốc độ nhận diện Hiragana & Katakana
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
                                ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm'
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
                    <button
                        type="button"
                        onClick={() => { setGameMode('typing'); setIsQuizCompleted(false); }}
                        className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                            gameMode === 'typing'
                                ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-sm'
                                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50'
                        }`}
                    >
                        <Play className="w-3.5 h-3.5" />
                        <span>Gõ phản xạ</span>
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
                                    Xuất Sắc!
                                </h3>
                                <p className="text-sm text-slate-600 dark:text-slate-300 font-medium mt-1">
                                    Bạn đã hoàn thành phiên luyện tập bảng chữ Kana!
                                </p>
                            </div>

                            <div className="p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200/60 dark:border-indigo-800/60 flex items-center justify-around">
                                <div className="text-center">
                                    <span className="text-xs text-slate-500 font-bold block">Tổng điểm</span>
                                    <span className="text-2xl font-black text-indigo-600 dark:text-indigo-400">{score} pts</span>
                                </div>
                                <div className="h-8 w-px bg-indigo-200 dark:bg-indigo-800" />
                                <div className="text-center">
                                    <span className="text-xs text-slate-500 font-bold block">Thưởng XP</span>
                                    <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">+40 XP</span>
                                </div>
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (gameMode === 'memory_match') initMemoryMatch();
                                        else initSpeedQuiz();
                                    }}
                                    className="flex-1 py-3 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 font-bold text-slate-700 dark:text-slate-200 text-sm flex items-center justify-center gap-2 transition-all cursor-pointer"
                                >
                                    <RotateCcw className="w-4 h-4" />
                                    <span>Chơi lại</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-indigo-600 to-sky-500 hover:from-indigo-500 hover:to-sky-400 text-white font-bold text-sm shadow-lg shadow-indigo-500/25 transition-all cursor-pointer"
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
                                    <span className="text-indigo-600 dark:text-indigo-400">
                                        Điểm: {score}
                                    </span>
                                </div>
                            </div>

                            {/* Question Character Prompt */}
                            <div className="flex flex-col items-center justify-center p-8 rounded-3xl bg-slate-50 dark:bg-slate-800/60 border-2 border-indigo-200/60 dark:border-indigo-500/20 shadow-inner text-center relative group">
                                <span className="text-6xl sm:text-7xl font-black text-slate-900 dark:text-white font-japanese select-none animate-pulse">
                                    {currentQ.char}
                                </span>
                                <button
                                    type="button"
                                    onClick={() => speakJapanese(currentQ.char)}
                                    className="mt-3 p-2 rounded-full bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-md hover:scale-110 active:scale-95 transition-all cursor-pointer"
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

                                    let btnStyle = 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:border-indigo-400 hover:shadow-md';

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
                                <span>Tìm các cặp Hiragana ↔ Katakana tương ứng</span>
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
                                            key={card.uniqueId}
                                            onClick={() => handleCardClick(idx)}
                                            className={`h-24 rounded-2xl flex flex-col items-center justify-center p-2 border-2 transition-all duration-300 cursor-pointer select-none ${
                                                isMatched
                                                    ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-600 dark:text-emerald-400 opacity-60 scale-95'
                                                    : isFlipped
                                                        ? 'bg-indigo-600 text-white border-indigo-700 shadow-lg scale-105'
                                                        : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-indigo-400 text-slate-800 dark:text-slate-200 hover:scale-102'
                                            }`}
                                        >
                                            {isFlipped || isMatched ? (
                                                <>
                                                    <span className="text-2xl sm:text-3xl font-black font-japanese">
                                                        {card.content}
                                                    </span>
                                                    <span className="text-[9px] font-sans font-bold uppercase opacity-80 mt-1">
                                                        {card.sub}
                                                    </span>
                                                </>
                                            ) : (
                                                <span className="text-2xl text-slate-400 font-bold opacity-60">❓</span>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ) : gameMode === 'typing' && currentQ ? (
                        /* TYPING ATTACK MODE */
                        <div className="w-full space-y-6 animate-fade-in max-w-sm text-center">
                            <div className="flex items-center justify-between text-xs font-bold text-slate-500">
                                <span>Câu {quizIndex + 1} / {questions.length}</span>
                                <span className="text-indigo-600 dark:text-indigo-400">Điểm: {score}</span>
                            </div>

                            <div className="p-8 rounded-3xl bg-slate-50 dark:bg-slate-800/60 border-2 border-indigo-200/60 dark:border-indigo-500/20 shadow-inner">
                                <span className="text-7xl font-black text-slate-900 dark:text-white font-japanese block animate-bounce">
                                    {currentQ.char}
                                </span>
                                <span className="text-xs text-slate-400 font-medium mt-2 block">
                                    Gõ phiên âm Romaji của ký tự này
                                </span>
                            </div>

                            <form onSubmit={handleTypingSubmit} className="space-y-3">
                                <input
                                    type="text"
                                    autoFocus
                                    value={typedText}
                                    onChange={(e) => setTypedText(e.target.value)}
                                    placeholder="Nhập romaji (VD: ka, shi, a)..."
                                    disabled={isAnswered}
                                    className={`w-full p-4 rounded-2xl border-2 text-center text-xl font-mono font-bold outline-none transition-all ${
                                        typingFeedback === 'correct'
                                            ? 'bg-emerald-50 border-emerald-500 text-emerald-700'
                                            : typingFeedback === 'wrong'
                                                ? 'bg-rose-50 border-rose-500 text-rose-700'
                                                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:border-indigo-500 text-slate-900 dark:text-white'
                                    }`}
                                />
                                <button
                                    type="submit"
                                    disabled={isAnswered || !typedText.trim()}
                                    className="w-full py-3.5 bg-gradient-to-r from-indigo-600 to-sky-500 hover:from-indigo-500 hover:to-sky-400 disabled:opacity-50 text-white font-bold text-sm rounded-2xl shadow-md transition-all cursor-pointer"
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
