import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { X, Volume2, CheckCircle2, RotateCcw, Zap, Trophy, Play, ArrowRight, Award, BookOpen, Ear } from 'lucide-react';
import { speakEnglish } from '../../utils/audio';
import { playCorrectSound, playIncorrectSound } from '../../utils/soundEffects';
import { launchFanfare } from '../../utils/celebrations';
import { shuffleArray } from '../../utils/textProcessing';
import { IPA_DICTIONARY } from '../../data/ipaData';

const IpaQuizModal = ({
    isOpen,
    onClose,
    ipaList = [],
    awardXP
}) => {
    const [gameMode, setGameMode] = useState('listening_quiz'); // 'listening_quiz' | 'symbol_match'
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

    // Generate questions for Listening / Symbol Quiz
    const initListeningQuiz = useCallback(() => {
        const pool = ipaList.length >= 4 ? ipaList : Object.values(IPA_DICTIONARY);
        const shuffled = shuffleArray([...pool]).slice(0, 10);
        const generated = shuffled.map(q => {
            const wrongOptions = pool
                .filter(p => p.id !== q.id)
                .sort(() => 0.5 - Math.random())
                .slice(0, 3)
                .map(p => p.char);

            const options = shuffleArray([q.char, ...wrongOptions]);
            return {
                ...q,
                options,
                correct: q.char
            };
        });

        setQuestions(generated);
        setQuizIndex(0);
        setScore(0);
        setStreak(0);
        setSelectedOption(null);
        setIsAnswered(false);
        setIsQuizCompleted(false);

        // Auto play audio for first question
        if (generated[0]) {
            setTimeout(() => speakEnglish(generated[0].keyWord), 300);
        }
    }, [ipaList]);

    // Generate Symbol Match Pairs (IPA Symbol ↔ Key Word)
    const initSymbolMatch = useCallback(() => {
        const pool = ipaList.length >= 6 ? ipaList : Object.values(IPA_DICTIONARY);
        const selected = shuffleArray([...pool]).slice(0, 6);

        const cardPairs = [];
        selected.forEach((item, idx) => {
            cardPairs.push({
                id: `symbol_${idx}`,
                pairId: idx,
                display: `/${item.char}/`,
                type: 'symbol',
                audio: item.keyWord
            });
            cardPairs.push({
                id: `word_${idx}`,
                pairId: idx,
                display: item.keyWord,
                type: 'word',
                audio: item.keyWord
            });
        });

        setCards(shuffleArray(cardPairs));
        setFlippedIndices([]);
        setMatchedPairs([]);
        setIsQuizCompleted(false);
    }, [ipaList]);

    // Initializer
    useEffect(() => {
        if (!isOpen) return;
        if (gameMode === 'listening_quiz') {
            initListeningQuiz();
        } else if (gameMode === 'symbol_match') {
            initSymbolMatch();
        }
    }, [isOpen, gameMode, initListeningQuiz, initSymbolMatch]);

    if (!isOpen) return null;

    const currentQ = questions[quizIndex];

    // Handle Option Selection
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

        speakEnglish(currentQ.keyWord);

        setTimeout(() => {
            if (quizIndex + 1 < questions.length) {
                const nextQ = questions[quizIndex + 1];
                setQuizIndex(prev => prev + 1);
                setSelectedOption(null);
                setIsAnswered(false);
                if (nextQ) {
                    setTimeout(() => speakEnglish(nextQ.keyWord), 200);
                }
            } else {
                setIsQuizCompleted(true);
                launchFanfare();
                if (awardXP) awardXP(30);
            }
        }, 1200);
    };

    // Handle Match Click
    const handleCardClick = (idx) => {
        if (flippedIndices.length === 2 || flippedIndices.includes(idx) || matchedPairs.includes(cards[idx].pairId)) {
            return;
        }

        const newFlipped = [...flippedIndices, idx];
        setFlippedIndices(newFlipped);
        speakEnglish(cards[idx].audio);

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
                className="relative w-full max-w-xl bg-white dark:bg-slate-900 border-2 border-violet-400/30 dark:border-violet-500/20 rounded-3xl shadow-2xl overflow-hidden flex flex-col my-auto transition-all"
            >
                {/* Header */}
                <div className="bg-gradient-to-r from-violet-700 via-purple-600 to-indigo-600 p-4 sm:p-5 text-white flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                        <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-xl shadow-inner font-serif font-black">
                            /ə/
                        </div>
                        <div>
                            <h3 className="text-base sm:text-lg font-black tracking-tight">
                                Luyện Phản Xạ Ngữ Âm IPA
                            </h3>
                            <p className="text-[11px] text-purple-100 font-medium">
                                Rèn luyện tai nghe và nhận diện chính xác 44 ký tự phiên âm quốc tế
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
                        onClick={() => { setGameMode('listening_quiz'); setIsQuizCompleted(false); }}
                        className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                            gameMode === 'listening_quiz'
                                ? 'bg-white dark:bg-slate-800 text-violet-600 dark:text-violet-400 shadow-sm'
                                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50'
                        }`}
                    >
                        <Ear className="w-3.5 h-3.5" />
                        <span>Nghe âm đoán ký tự</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => { setGameMode('symbol_match'); setIsQuizCompleted(false); }}
                        className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                            gameMode === 'symbol_match'
                                ? 'bg-white dark:bg-slate-800 text-amber-600 dark:text-amber-400 shadow-sm'
                                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50'
                        }`}
                    >
                        <BookOpen className="w-3.5 h-3.5" />
                        <span>Ghép âm ↔ Từ vựng</span>
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
                                    Bạn đã nâng cao độ nhạy bén với hệ thống ngữ âm tiếng Anh chuẩn IPA.
                                </p>
                            </div>

                            <div className="p-4 rounded-2xl bg-violet-50 dark:bg-violet-950/30 border border-violet-200 dark:border-violet-800/60 flex items-center justify-around">
                                <div className="text-center">
                                    <span className="text-xs font-bold text-slate-400 uppercase block">Điểm số</span>
                                    <span className="text-2xl font-black text-violet-600 dark:text-violet-400 font-mono">{score}</span>
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
                                        if (gameMode === 'listening_quiz') initListeningQuiz();
                                        else initSymbolMatch();
                                    }}
                                    className="flex-1 py-3 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
                                >
                                    <RotateCcw className="w-4 h-4" />
                                    <span>Chơi lại</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold text-sm shadow-lg shadow-violet-500/25 transition-all cursor-pointer"
                                >
                                    <span>Hoàn tất</span>
                                </button>
                            </div>
                        </div>
                    ) : gameMode === 'listening_quiz' && currentQ ? (
                        /* LISTENING QUIZ 4-OPTIONS VIEW */
                        <div className="w-full space-y-6 animate-fade-in">
                            {/* Progress & Score bar */}
                            <div className="flex items-center justify-between text-xs font-bold text-slate-500">
                                <span>Câu {quizIndex + 1} / {questions.length}</span>
                                <div className="flex items-center gap-3">
                                    <span className="text-amber-500 flex items-center gap-1">
                                        🔥 Chuỗi: {streak}
                                    </span>
                                    <span className="text-violet-600 dark:text-violet-400">
                                        Điểm: {score}
                                    </span>
                                </div>
                            </div>

                            {/* Listening Prompt Card */}
                            <div className="flex flex-col items-center justify-center p-8 rounded-3xl bg-violet-50/50 dark:bg-violet-950/20 border-2 border-violet-200/60 dark:border-violet-500/20 shadow-inner text-center relative group">
                                <div className="w-20 h-20 rounded-full bg-violet-600 text-white flex items-center justify-center shadow-xl shadow-violet-600/30 animate-pulse">
                                    <Volume2 className="w-9 h-9" />
                                </div>
                                <div className="mt-3">
                                    <button
                                        type="button"
                                        onClick={() => speakEnglish(currentQ.keyWord)}
                                        className="px-4 py-1.5 rounded-full bg-white dark:bg-slate-800 text-violet-600 dark:text-violet-400 font-bold text-xs shadow-md hover:scale-105 active:scale-95 transition-all cursor-pointer border border-violet-200 dark:border-violet-700"
                                    >
                                        🔊 Bấm để nghe lại từ phát âm
                                    </button>
                                </div>
                                <span className="text-xs text-slate-400 font-medium mt-2">
                                    Từ khóa: <em>"{currentQ.keyWord}"</em> ({currentQ.keyWordMeaning})
                                </span>
                            </div>

                            {/* 4 Options Grid */}
                            <div className="grid grid-cols-2 gap-3">
                                {currentQ.options.map((opt, idx) => {
                                    const isSelected = selectedOption === opt;
                                    const isCorrect = opt === currentQ.correct;

                                    let btnStyle = 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:border-violet-400 hover:shadow-md';

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
                                            className={`p-4 rounded-2xl border-2 font-serif text-2xl font-black transition-all cursor-pointer flex items-center justify-center select-none active:scale-95 ${btnStyle}`}
                                        >
                                            /{opt}/
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    ) : gameMode === 'symbol_match' ? (
                        /* MEMORY MATCH PAIR FLIP GAME */
                        <div className="w-full space-y-4 animate-fade-in">
                            <div className="flex items-center justify-between text-xs font-bold text-slate-500 px-1">
                                <span>Tìm các cặp Ký tự IPA ↔ Từ vựng tương ứng</span>
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
                                            className={`h-24 sm:h-28 rounded-2xl border-2 flex items-center justify-center text-lg sm:text-xl font-black transition-all duration-300 cursor-pointer select-none ${
                                                isMatched
                                                    ? 'bg-emerald-500 text-white border-emerald-600 opacity-60 pointer-events-none scale-95'
                                                    : isFlipped
                                                        ? 'bg-gradient-to-br from-violet-600 to-indigo-600 text-white border-violet-500 shadow-lg scale-105'
                                                        : 'bg-slate-100 dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700 hover:border-violet-400 hover:bg-slate-200 dark:hover:bg-slate-750'
                                            }`}
                                        >
                                            {isFlipped || isMatched ? (
                                                <span className={card.type === 'symbol' ? 'font-serif text-2xl' : 'font-sans text-base'}>
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

export default IpaQuizModal;
