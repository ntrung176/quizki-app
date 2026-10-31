import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
    X, Volume2, CheckCircle2, XCircle, Award, Sparkles,
    ArrowRight, RotateCcw, Heart, Flame, ShieldAlert
} from 'lucide-react';
import { playCorrectSound, playIncorrectSound, playCompletionFanfare } from '../../utils/soundEffects';
import { launchFanfare } from '../../utils/celebrations';
import { speakJapanese, speakKorean, speakEnglish } from '../../utils/audio';
import { saveRoadmapLessonComplete } from '../../data/roadmap';

/**
 * Duolingo-style Interactive Bite-Sized Lesson Player Modal
 */
const RoadmapLessonModal = ({
    lesson,
    stage,
    targetLang = 'ja',
    onClose,
    onLessonCompleted,
    awardXP
}) => {
    if (!lesson) return null;

    const questions = useMemo(() => lesson.questions || [], [lesson]);
    const [currentIdx, setCurrentIdx] = useState(0);
    const [hearts, setHearts] = useState(5);
    const [selectedOption, setSelectedOption] = useState(null);
    const [answerStatus, setAnswerStatus] = useState(null); // null | 'correct' | 'incorrect'
    const [isFinished, setIsFinished] = useState(false);
    const [showExitConfirm, setShowExitConfirm] = useState(false);
    const [correctCount, setCorrectCount] = useState(0);
    const [isPlayingAudio, setIsPlayingAudio] = useState(false);

    // Matching question state
    const [matchedPairs, setMatchedPairs] = useState(new Set());
    const [selectedLeft, setSelectedLeft] = useState(null);
    const [selectedRight, setSelectedRight] = useState(null);
    const [mismatchShake, setMismatchShake] = useState(false);

    const currentQ = questions[currentIdx] || null;

    // Helper: Play speech
    const playAudio = (textToPlay) => {
        const text = textToPlay || currentQ?.audio || currentQ?.character;
        if (!text) return;
        setIsPlayingAudio(true);
        setTimeout(() => setIsPlayingAudio(false), 900);

        try {
            if (targetLang === 'ko' || targetLang === 'korean') {
                speakKorean(text);
            } else if (targetLang === 'en' || targetLang === 'english') {
                speakEnglish(text);
            } else {
                speakJapanese(text);
            }
        } catch (e) {
            console.warn('Audio playback error:', e);
        }
    };

    // Auto-play audio on question load for audio_choice
    useEffect(() => {
        if (currentQ?.type === 'audio_choice' && currentQ?.audio) {
            const timer = setTimeout(() => playAudio(currentQ.audio), 300);
            return () => clearTimeout(timer);
        }
    }, [currentIdx, currentQ]);

    // Reset interaction state on question change
    useEffect(() => {
        setSelectedOption(null);
        setAnswerStatus(null);
        setMatchedPairs(new Set());
        setSelectedLeft(null);
        setSelectedRight(null);
    }, [currentIdx]);

    // Handle pair selection for matching questions
    const handleSelectLeft = (item) => {
        if (matchedPairs.has(item.left) || answerStatus) return;
        playAudio(item.left);
        setSelectedLeft(item);
        if (selectedRight) {
            checkMatchingPair(item, selectedRight);
        }
    };

    const handleSelectRight = (item) => {
        if (matchedPairs.has(item.left) || answerStatus) return;
        setSelectedRight(item);
        if (selectedLeft) {
            checkMatchingPair(selectedLeft, item);
        }
    };

    const checkMatchingPair = (leftItem, rightItem) => {
        if (leftItem.left === rightItem.left) {
            // Correct pair match
            playCorrectSound();
            const newMatched = new Set(matchedPairs);
            newMatched.add(leftItem.left);
            setMatchedPairs(newMatched);
            setSelectedLeft(null);
            setSelectedRight(null);

            // If all matched, auto mark question as correct
            if (newMatched.size === (currentQ.pairs?.length || 0)) {
                setAnswerStatus('correct');
                setCorrectCount(prev => prev + 1);
            }
        } else {
            // Mismatch
            playIncorrectSound();
            setMismatchShake(true);
            setTimeout(() => {
                setMismatchShake(false);
                setSelectedLeft(null);
                setSelectedRight(null);
            }, 600);
        }
    };

    // Check single choice answer
    const handleCheckAnswer = () => {
        if (answerStatus) return;
        if (currentQ.type === 'matching') {
            // For matching, completed once all pairs are matched
            return;
        }

        if (selectedOption === null) return;

        const isCorrect = selectedOption === currentQ.correctIndex;
        if (isCorrect) {
            playCorrectSound();
            setAnswerStatus('correct');
            setCorrectCount(prev => prev + 1);
        } else {
            playIncorrectSound();
            setAnswerStatus('incorrect');
            setHearts(prev => Math.max(0, prev - 1));
        }
    };

    // Proceed to next question or complete lesson
    const handleNextStep = () => {
        if (currentIdx + 1 < questions.length) {
            setCurrentIdx(prev => prev + 1);
        } else {
            // Lesson Finished!
            finishLesson();
        }
    };

    const finishLesson = () => {
        setIsFinished(true);
        playCompletionFanfare();
        launchFanfare();

        const scorePercent = Math.round(((correctCount + (answerStatus === 'correct' ? 1 : 0)) / questions.length) * 100);
        const stars = scorePercent >= 90 ? 3 : scorePercent >= 60 ? 2 : 1;

        // Save progress to localStorage
        saveRoadmapLessonComplete(lesson.id, scorePercent, stars, targetLang);

        // Award XP
        if (awardXP && lesson.xp) {
            awardXP(lesson.xp);
        }

        if (onLessonCompleted) {
            onLessonCompleted(lesson.id, scorePercent, stars);
        }
    };

    // Keyboard shortcuts (Enter to check/continue, 1-4 to select option)
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (isFinished) {
                if (e.key === 'Enter') onClose();
                return;
            }
            if (showExitConfirm) return;

            if (e.key === 'Enter') {
                e.preventDefault();
                if (answerStatus) {
                    handleNextStep();
                } else if (selectedOption !== null && currentQ?.type !== 'matching') {
                    handleCheckAnswer();
                }
            } else if (!answerStatus && currentQ?.options) {
                const num = parseInt(e.key, 10);
                if (num >= 1 && num <= currentQ.options.length) {
                    setSelectedOption(num - 1);
                }
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selectedOption, answerStatus, isFinished, showExitConfirm, currentIdx]);

    // Progress percentage
    const progressPercent = Math.round(((currentIdx + (answerStatus === 'correct' ? 1 : 0)) / Math.max(1, questions.length)) * 100);

    // Shuffled right pairs for matching question
    const shuffledRightPairs = useMemo(() => {
        if (!currentQ || currentQ.type !== 'matching' || !currentQ.pairs) return [];
        return [...currentQ.pairs].sort(() => 0.5 - Math.random());
    }, [currentIdx, currentQ]);

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/75 backdrop-blur-md p-3 sm:p-4 animate-in fade-in duration-200">
            {/* Main Modal Card */}
            <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border-2 border-slate-200 dark:border-slate-800 flex flex-col max-h-[92vh] overflow-hidden">
                
                {/* 1. TOP HEADER: Duolingo Progress & Lives Bar */}
                <div className="flex items-center justify-between gap-4 px-4 sm:px-6 py-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
                    <button
                        onClick={() => {
                            if (currentIdx > 0 && !isFinished) {
                                setShowExitConfirm(true);
                            } else {
                                onClose();
                            }
                        }}
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
                        title="Đóng bài học"
                    >
                        <X className="w-5 h-5 stroke-[2.5]" />
                    </button>

                    {/* Duolingo Capsule Progress Bar */}
                    <div className="flex-1 max-w-md">
                        <div className="w-full bg-slate-100 dark:bg-slate-800 h-4 rounded-full overflow-hidden p-0.5 border border-slate-200 dark:border-slate-700">
                            <div
                                className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-400 ease-out relative"
                                style={{ width: `${Math.min(100, Math.max(5, progressPercent))}%` }}
                            >
                                <div className="absolute top-0.5 left-1 right-1 h-1 bg-white/40 rounded-full pointer-events-none" />
                            </div>
                        </div>
                    </div>

                    {/* Hearts Counter */}
                    <div className="flex items-center gap-1.5 px-3 py-1 bg-rose-50 dark:bg-rose-950/40 rounded-xl border border-rose-200 dark:border-rose-900/60 shrink-0 select-none">
                        <Heart className="w-4 h-4 text-rose-500 fill-rose-500 animate-pulse" />
                        <span className="font-black text-xs text-rose-600 dark:text-rose-400">
                            {hearts}
                        </span>
                    </div>
                </div>

                {/* 2. BODY CONTENT */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-6 flex flex-col justify-center">
                    {/* A. Finished View */}
                    {isFinished ? (
                        <div className="text-center py-6 sm:py-10 space-y-5 animate-in zoom-in-95 duration-300">
                            <div className="w-24 h-24 mx-auto rounded-3xl bg-gradient-to-br from-amber-400 to-amber-600 text-white flex items-center justify-center text-5xl shadow-xl shadow-amber-500/30 animate-bounce">
                                🏆
                            </div>
                            <div className="space-y-1">
                                <span className="text-xs font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
                                    XUẤT SẮC HOÀN THÀNH
                                </span>
                                <h3 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
                                    {lesson.title}
                                </h3>
                                <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                                    Bạn đã làm chủ nội dung này và mở khóa bài học kế tiếp trên lộ trình!
                                </p>
                            </div>

                            {/* Stats Bento */}
                            <div className="grid grid-cols-3 gap-3 max-w-sm mx-auto pt-2">
                                <div className="p-3 bg-amber-50 dark:bg-amber-950/30 rounded-2xl border border-amber-200 dark:border-amber-900/60">
                                    <div className="text-xs text-amber-600 font-bold">Điểm số</div>
                                    <div className="text-lg font-black text-amber-700 dark:text-amber-300 mt-0.5">
                                        {Math.round((correctCount / questions.length) * 100)}%
                                    </div>
                                </div>
                                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-2xl border border-emerald-200 dark:border-emerald-900/60">
                                    <div className="text-xs text-emerald-600 font-bold">Kinh nghiệm</div>
                                    <div className="text-lg font-black text-emerald-700 dark:text-emerald-300 mt-0.5">
                                        +{lesson.xp || 25} XP
                                    </div>
                                </div>
                                <div className="p-3 bg-sky-50 dark:bg-sky-950/30 rounded-2xl border border-sky-200 dark:border-sky-900/60">
                                    <div className="text-xs text-sky-600 font-bold">Đánh giá</div>
                                    <div className="text-lg font-black text-sky-700 dark:text-sky-300 mt-0.5">
                                        ⭐⭐⭐
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : hearts <= 0 ? (
                        /* B. Out of Hearts View */
                        <div className="text-center py-8 space-y-4 animate-in zoom-in-95 duration-200">
                            <div className="w-20 h-20 mx-auto rounded-3xl bg-rose-100 dark:bg-rose-950/50 text-rose-600 flex items-center justify-center text-4xl shadow-inner">
                                💔
                            </div>
                            <h3 className="text-2xl font-black text-slate-900 dark:text-white">
                                Hết Lượt Thử Thách!
                            </h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                                Đừng nản lòng nhé! Ôn lại bài học này giúp bạn khắc sâu kiến thức hơn.
                            </p>
                            <button
                                onClick={() => {
                                    setHearts(5);
                                    setCurrentIdx(0);
                                    setCorrectCount(0);
                                }}
                                className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl font-black text-sm uppercase bg-emerald-500 hover:bg-emerald-400 border-b-4 border-emerald-700 text-white cursor-pointer active:translate-y-0.5 active:border-b-2"
                            >
                                <RotateCcw className="w-4 h-4 stroke-[3]" />
                                <span>Thử Lại Từ Đầu</span>
                            </button>
                        </div>
                    ) : (
                        /* C. Active Question View */
                        <div className="space-y-6">
                            {/* Question Title & Prompt */}
                            <div className="space-y-2">
                                <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
                                    CÂU HỎI {currentIdx + 1} / {questions.length}
                                </span>
                                <h3 className="text-lg sm:text-xl font-black text-slate-800 dark:text-slate-100 leading-snug">
                                    {currentQ.prompt}
                                </h3>
                            </div>

                            {/* Character Spotlight / Audio Banner */}
                            {(currentQ.character || currentQ.audio) && (
                                <div className="flex items-center justify-center gap-3 py-4 sm:py-6 bg-slate-50 dark:bg-slate-850/60 rounded-3xl border-2 border-slate-200/80 dark:border-slate-800">
                                    {currentQ.character && (
                                        <div className="font-japanese font-black text-3xl sm:text-4xl text-slate-800 dark:text-white tracking-wide">
                                            {currentQ.character}
                                        </div>
                                    )}
                                    {currentQ.audio && (
                                        <button
                                            onClick={() => playAudio(currentQ.audio)}
                                            className={`p-3 rounded-2xl border-2 border-b-4 transition-all cursor-pointer ${
                                                isPlayingAudio
                                                    ? 'bg-sky-500 border-sky-700 text-white scale-105'
                                                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-sky-500 hover:bg-sky-50 active:translate-y-0.5 active:border-b-2'
                                            }`}
                                            title="Nghe phát âm"
                                        >
                                            <Volume2 className="w-5 h-5 stroke-[2.5]" />
                                        </button>
                                    )}
                                </div>
                            )}

                            {/* Question Type: Choice & Audio Choice */}
                            {(currentQ.type === 'choice' || currentQ.type === 'audio_choice') && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {currentQ.options?.map((opt, idx) => {
                                        const isSelected = selectedOption === idx;
                                        let btnStyle = 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-sky-400 text-slate-800 dark:text-slate-100';

                                        if (answerStatus) {
                                            if (idx === currentQ.correctIndex) {
                                                btnStyle = 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-b-emerald-700';
                                            } else if (isSelected && idx !== currentQ.correctIndex) {
                                                btnStyle = 'border-rose-500 bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border-b-rose-700';
                                            }
                                        } else if (isSelected) {
                                            btnStyle = 'border-sky-500 bg-sky-50 dark:bg-sky-950/50 text-sky-700 dark:text-sky-300 border-b-sky-700 ring-2 ring-sky-400/30';
                                        }

                                        return (
                                            <button
                                                key={idx}
                                                disabled={!!answerStatus}
                                                onClick={() => {
                                                    setSelectedOption(idx);
                                                    playAudio(opt);
                                                }}
                                                className={`p-4 rounded-2xl border-2 border-b-4 font-bold text-left transition-all flex items-center justify-between gap-3 cursor-pointer select-none active:translate-y-0.5 active:border-b-2 ${btnStyle}`}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <span className="w-6 h-6 rounded-lg bg-slate-100 dark:bg-slate-700/60 text-slate-500 dark:text-slate-400 text-xs font-black flex items-center justify-center shrink-0">
                                                        {idx + 1}
                                                    </span>
                                                    <span className="text-sm sm:text-base leading-snug">
                                                        {opt}
                                                    </span>
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            )}

                            {/* Question Type: Matching Pairs */}
                            {currentQ.type === 'matching' && (
                                <div className="space-y-3">
                                    <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold">
                                        Chạm vào một từ vựng bên trái, sau đó chạm vào nghĩa tương ứng bên phải để ghép cặp.
                                    </p>
                                    <div className={`grid grid-cols-2 gap-3 ${mismatchShake ? 'animate-shake' : ''}`}>
                                        {/* Left column */}
                                        <div className="space-y-2.5">
                                            {currentQ.pairs?.map((pair, idx) => {
                                                const isMatched = matchedPairs.has(pair.left);
                                                const isSelected = selectedLeft?.left === pair.left;
                                                return (
                                                    <button
                                                        key={`left-${idx}`}
                                                        disabled={isMatched || !!answerStatus}
                                                        onClick={() => handleSelectLeft(pair)}
                                                        className={`w-full p-3 rounded-2xl border-2 border-b-4 font-bold text-left text-sm transition-all cursor-pointer select-none ${
                                                            isMatched
                                                                ? 'opacity-40 border-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 line-through'
                                                                : isSelected
                                                                ? 'border-sky-500 bg-sky-50 dark:bg-sky-950/40 text-sky-700 ring-2 ring-sky-400/30'
                                                                : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white hover:border-slate-300'
                                                        }`}
                                                    >
                                                        {pair.left}
                                                    </button>
                                                );
                                            })}
                                        </div>

                                        {/* Right column */}
                                        <div className="space-y-2.5">
                                            {shuffledRightPairs.map((pair, idx) => {
                                                const isMatched = matchedPairs.has(pair.left);
                                                const isSelected = selectedRight?.left === pair.left;
                                                return (
                                                    <button
                                                        key={`right-${idx}`}
                                                        disabled={isMatched || !!answerStatus}
                                                        onClick={() => handleSelectRight(pair)}
                                                        className={`w-full p-3 rounded-2xl border-2 border-b-4 font-bold text-left text-sm transition-all cursor-pointer select-none ${
                                                            isMatched
                                                                ? 'opacity-40 border-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 line-through'
                                                                : isSelected
                                                                ? 'border-sky-500 bg-sky-50 dark:bg-sky-950/40 text-sky-700 ring-2 ring-sky-400/30'
                                                                : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white hover:border-slate-300'
                                                        }`}
                                                    >
                                                        {pair.right}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* 3. BOTTOM ACTION BAR (Duolingo Style Instant Feedback) */}
                <div className={`p-4 sm:p-5 border-t transition-all ${
                    answerStatus === 'correct'
                        ? 'bg-emerald-50 dark:bg-emerald-950/80 border-emerald-300 dark:border-emerald-800'
                        : answerStatus === 'incorrect'
                        ? 'bg-rose-50 dark:bg-rose-950/80 border-rose-300 dark:border-rose-800'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                }`}>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        {/* Feedback text on answer check */}
                        {answerStatus === 'correct' ? (
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-md">
                                    <CheckCircle2 className="w-6 h-6" />
                                </div>
                                <div>
                                    <h4 className="text-base font-black text-emerald-700 dark:text-emerald-300">
                                        Chính xác! Xuất sắc! 🎉
                                    </h4>
                                    {currentQ?.explanation && (
                                        <p className="text-xs text-emerald-600/90 dark:text-emerald-400 mt-0.5 line-clamp-1">
                                            {currentQ.explanation}
                                        </p>
                                    )}
                                </div>
                            </div>
                        ) : answerStatus === 'incorrect' ? (
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-rose-500 text-white flex items-center justify-center shrink-0 shadow-md">
                                    <XCircle className="w-6 h-6" />
                                </div>
                                <div>
                                    <h4 className="text-base font-black text-rose-700 dark:text-rose-300">
                                        Chưa chính xác!
                                    </h4>
                                    <p className="text-xs text-rose-600/90 dark:text-rose-400 mt-0.5">
                                        Đáp án đúng: <span className="font-bold underline">{currentQ.options?.[currentQ.correctIndex] || 'Đáp án mẫu'}</span>
                                    </p>
                                </div>
                            </div>
                        ) : isFinished ? (
                            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300 text-sm font-bold">
                                <Sparkles className="w-4 h-4 text-amber-500" />
                                <span>Bài học đã được lưu vào tiến trình của bạn!</span>
                            </div>
                        ) : (
                            <div className="text-xs text-slate-400 hidden sm:block">
                                Nhấn <kbd className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded border text-[10px] font-mono">Enter ↵</kbd> để kiểm tra đáp án
                            </div>
                        )}

                        {/* Action CTA Button */}
                        <div className="flex items-center gap-2 w-full sm:w-auto">
                            {isFinished ? (
                                <button
                                    onClick={onClose}
                                    className="w-full sm:w-auto px-8 py-3 rounded-2xl font-black text-sm uppercase tracking-wider bg-emerald-500 hover:bg-emerald-400 border-b-4 border-emerald-700 text-white cursor-pointer active:translate-y-0.5 active:border-b-2 shadow-lg shadow-emerald-500/20"
                                >
                                    Tiếp Tục Lộ Trình ➔
                                </button>
                            ) : answerStatus ? (
                                <button
                                    onClick={handleNextStep}
                                    className={`w-full sm:w-auto px-8 py-3 rounded-2xl font-black text-sm uppercase tracking-wider text-white cursor-pointer active:translate-y-0.5 active:border-b-2 shadow-md ${
                                        answerStatus === 'correct'
                                            ? 'bg-emerald-500 hover:bg-emerald-400 border-b-4 border-emerald-700'
                                            : 'bg-rose-500 hover:bg-rose-400 border-b-4 border-rose-700'
                                    }`}
                                >
                                    Tiếp Tục ➔
                                </button>
                            ) : currentQ?.type !== 'matching' ? (
                                <button
                                    disabled={selectedOption === null}
                                    onClick={handleCheckAnswer}
                                    className={`w-full sm:w-auto px-8 py-3 rounded-2xl font-black text-sm uppercase tracking-wider transition-all select-none active:translate-y-0.5 active:border-b-2 ${
                                        selectedOption !== null
                                            ? 'bg-emerald-500 hover:bg-emerald-400 border-b-4 border-emerald-700 text-white cursor-pointer shadow-md'
                                            : 'bg-slate-200 dark:bg-slate-800 text-slate-400 border-b-4 border-slate-300 dark:border-slate-700 cursor-not-allowed'
                                    }`}
                                >
                                    Kiểm Tra
                                </button>
                            ) : null}
                        </div>
                    </div>
                </div>

                {/* Confirm Exit Modal Dialog */}
                {showExitConfirm && (
                    <div className="absolute inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
                        <div className="bg-white dark:bg-slate-850 p-6 rounded-3xl border-2 border-slate-200 dark:border-slate-700 max-w-sm w-full text-center space-y-4 shadow-2xl animate-in zoom-in-95">
                            <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-100 dark:bg-amber-950/50 text-amber-600 flex items-center justify-center text-2xl">
                                ⚠️
                            </div>
                            <div>
                                <h4 className="text-lg font-black text-slate-900 dark:text-white">
                                    Dừng bài học lúc này?
                                </h4>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                    Nếu thoát bây giờ, bạn sẽ bị mất tiến trình câu trả lời của bài này đấy!
                                </p>
                            </div>
                            <div className="flex items-center gap-2 pt-2">
                                <button
                                    onClick={() => setShowExitConfirm(false)}
                                    className="flex-1 py-2.5 rounded-xl border-2 border-b-4 border-slate-200 dark:border-slate-700 font-bold text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 active:translate-y-0.5 cursor-pointer"
                                >
                                    Học Tiếp
                                </button>
                                <button
                                    onClick={onClose}
                                    className="flex-1 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-400 border-b-4 border-rose-700 font-bold text-xs text-white active:translate-y-0.5 cursor-pointer"
                                >
                                    Thoát Ra
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default RoadmapLessonModal;

