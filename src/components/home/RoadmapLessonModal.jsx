import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { RotateCcw } from 'lucide-react';
import { playCorrectSound, playIncorrectSound, playCompletionFanfare } from '../../utils/soundEffects';
import { launchFanfare } from '../../utils/celebrations';
import { speakJapanese, speakKorean, speakEnglish } from '../../utils/audio';
import { saveRoadmapLessonComplete } from '../../data/roadmap';
import { addRoadmapLessonItemsToSrs } from '../../utils/roadmapSrsSync';

import RoadmapLessonHeader from './roadmapLesson/RoadmapLessonHeader';
import RoadmapLessonFooter from './roadmapLesson/RoadmapLessonFooter';
import RoadmapQuestionContent from './roadmapLesson/RoadmapQuestionContent';
import RoadmapLessonVictory from './roadmapLesson/RoadmapLessonVictory';

/**
 * Authentic Full-screen Duolingo-style Lesson Experience
 * Replaces old modal popup with a dedicated, immersive full-viewport learning screen.
 */
const RoadmapLessonModal = ({
    lesson,
    stage,
    targetLang = 'ja',
    onClose,
    onLessonCompleted,
    awardXP,
    userId,
    allCards = []
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
    const [srsSyncResult, setSrsSyncResult] = useState(null);
    const [isSyncingSrs, setIsSyncingSrs] = useState(false);

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
            const timer = setTimeout(() => playAudio(currentQ.audio), 350);
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
            playCorrectSound();
            const newMatched = new Set(matchedPairs);
            newMatched.add(leftItem.left);
            setMatchedPairs(newMatched);
            setSelectedLeft(null);
            setSelectedRight(null);

            if (newMatched.size === (currentQ.pairs?.length || 0)) {
                setAnswerStatus('correct');
                setCorrectCount(prev => prev + 1);
            }
        } else {
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
        if (answerStatus || currentQ?.type === 'matching' || selectedOption === null) return;

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

    // Skip current question
    const handleSkip = () => {
        if (answerStatus || currentQ?.type === 'matching') return;
        playIncorrectSound();
        setAnswerStatus('incorrect');
        setHearts(prev => Math.max(0, prev - 1));
    };

    // Proceed to next question or complete lesson
    const handleNextStep = () => {
        if (currentIdx + 1 < questions.length) {
            setCurrentIdx(prev => prev + 1);
        } else {
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

        // Auto-add & activate lesson's items to user's SRS Decks (Vocab, Kanji, Grammar)
        if (lesson?.items) {
            setIsSyncingSrs(true);
            addRoadmapLessonItemsToSrs({ lesson, userId, allCards })
                .then(res => setSrsSyncResult(res))
                .catch(err => console.warn('SRS auto-sync error:', err))
                .finally(() => setIsSyncingSrs(false));
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
                    playAudio(currentQ.options[num - 1]);
                }
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selectedOption, answerStatus, isFinished, showExitConfirm, currentIdx]);

    // Lock document.body scrolling while lesson is running
    useEffect(() => {
        if (typeof document === 'undefined') return;
        const originalOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = originalOverflow;
        };
    }, []);

    // Progress percentage for capsule bar
    const progressPercent = Math.round(((currentIdx + (answerStatus === 'correct' ? 1 : 0)) / Math.max(1, questions.length)) * 100);

    // Shuffled right pairs for matching question
    const shuffledRightPairs = useMemo(() => {
        if (!currentQ || currentQ.type !== 'matching' || !currentQ.pairs) return [];
        return [...currentQ.pairs].sort(() => 0.5 - Math.random());
    }, [currentIdx, currentQ]);

    const lessonScreenContent = (
        <div className="fixed inset-0 z-[999999] w-screen h-screen flex flex-col bg-white dark:bg-slate-950 text-slate-900 dark:text-white select-none overflow-hidden animate-in fade-in duration-200">
            {/* 1. TOP HEADER (Progress & Lives Bar) */}
            <RoadmapLessonHeader
                progressPercent={progressPercent}
                hearts={hearts}
                onCloseClick={() => {
                    if (currentIdx > 0 && !isFinished) {
                        setShowExitConfirm(true);
                    } else {
                        onClose();
                    }
                }}
            />

            {/* 2. MAIN CENTER CONTENT (Spacious Question Area) */}
            <main className="flex-1 w-full max-w-4xl mx-auto px-4 sm:px-8 py-4 sm:py-6 flex flex-col justify-center overflow-y-auto custom-scrollbar">
                {isFinished ? (
                    <RoadmapLessonVictory
                        lesson={lesson}
                        stage={stage}
                        correctCount={correctCount + (answerStatus === 'correct' ? 1 : 0)}
                        totalQuestions={questions.length}
                        srsSyncResult={srsSyncResult}
                        isSyncingSrs={isSyncingSrs}
                        onContinue={onClose}
                    />
                ) : hearts <= 0 ? (
                    /* Out of Hearts View */
                    <div className="text-center py-8 space-y-5 max-w-md mx-auto animate-in zoom-in-95 duration-200">
                        <div className="w-24 h-24 mx-auto rounded-3xl bg-rose-100 dark:bg-rose-950/60 text-rose-500 flex items-center justify-center text-5xl shadow-inner border-2 border-rose-200 dark:border-rose-900">
                            💔
                        </div>
                        <div className="space-y-1">
                            <h3 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
                                Hết Lượt Thử Thách!
                            </h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400">
                                Đừng nản lòng nhé! Ôn tập lại sẽ giúp bạn ghi nhớ sâu sắc kiến thức bài học hơn.
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={() => {
                                setHearts(5);
                                setCurrentIdx(0);
                                setCorrectCount(0);
                            }}
                            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-2xl font-black text-sm uppercase bg-emerald-500 hover:bg-emerald-400 border-b-4 border-emerald-700 text-white cursor-pointer active:translate-y-1 active:border-b-0 shadow-md shadow-emerald-500/20"
                        >
                            <RotateCcw className="w-4 h-4 stroke-[3]" />
                            <span>Thử Lại Từ Đầu</span>
                        </button>
                    </div>
                ) : (
                    /* Active Question View */
                    <RoadmapQuestionContent
                        currentQ={currentQ}
                        stage={stage}
                        lesson={lesson}
                        currentIdx={currentIdx}
                        totalQuestions={questions.length}
                        selectedOption={selectedOption}
                        answerStatus={answerStatus}
                        onSelectOption={(idx, opt) => {
                            setSelectedOption(idx);
                            playAudio(opt);
                        }}
                        playAudio={playAudio}
                        isPlayingAudio={isPlayingAudio}
                        matchedPairs={matchedPairs}
                        selectedLeft={selectedLeft}
                        selectedRight={selectedRight}
                        shuffledRightPairs={shuffledRightPairs}
                        mismatchShake={mismatchShake}
                        onSelectLeft={handleSelectLeft}
                        onSelectRight={handleSelectRight}
                    />
                )}
            </main>

            {/* 3. BOTTOM FOOTER BAR (Check / Skip / Continue) */}
            {!isFinished && hearts > 0 && (
                <RoadmapLessonFooter
                    answerStatus={answerStatus}
                    canCheck={selectedOption !== null}
                    isMatching={currentQ?.type === 'matching'}
                    explanation={currentQ?.explanation}
                    correctAnswerText={currentQ?.options?.[currentQ?.correctIndex]}
                    onSkip={handleSkip}
                    onCheck={handleCheckAnswer}
                    onNext={handleNextStep}
                />
            )}

            {/* 4. CONFIRM EXIT MODAL DIALOG */}
            {showExitConfirm && (
                <div className="fixed inset-0 z-[1000000] bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
                    <div className="bg-white dark:bg-slate-900 p-6 sm:p-7 rounded-3xl border-2 border-slate-200 dark:border-slate-800 max-w-sm w-full text-center space-y-4 shadow-2xl animate-in zoom-in-95">
                        <div className="w-16 h-16 mx-auto rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 flex items-center justify-center text-3xl">
                            ⚠️
                        </div>
                        <div className="space-y-1">
                            <h4 className="text-xl font-black text-slate-900 dark:text-white">
                                Dừng bài học lúc này?
                            </h4>
                            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                                Nếu thoát bây giờ, bạn sẽ bị mất tiến trình câu trả lời của bài học này đấy!
                            </p>
                        </div>
                        <div className="flex flex-col gap-2.5 pt-2">
                            <button
                                type="button"
                                onClick={() => setShowExitConfirm(false)}
                                className="w-full py-3.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 border-b-4 border-emerald-700 font-black text-sm uppercase tracking-wider text-white active:translate-y-1 active:border-b-0 cursor-pointer shadow-md"
                            >
                                TIẾP TỤC HỌC
                            </button>
                            <button
                                type="button"
                                onClick={onClose}
                                className="w-full py-3 rounded-2xl border-2 border-slate-200 dark:border-slate-800 font-bold text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 active:translate-y-0.5 cursor-pointer"
                            >
                                RỜI ĐI
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );

    if (typeof document !== 'undefined') {
        return createPortal(lessonScreenContent, document.body);
    }
    return lessonScreenContent;
};

export default RoadmapLessonModal;
