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

const stripFuriAndSpaces = (str = '') => String(str)
    .replace(/\[[^\]]*\]/g, '')
    .replace(/[（(][ぁ-んァ-ヶー・]+[）)]/g, '')
    .replace(/[\s　。、．，!！?？「」『』・]/g, '')
    .toLowerCase()
    .trim();

/**
 * Authentic Full-screen Duolingo-style Lesson Experience
 * Supports Choice, Audio Choice, Reading JLPT, Matching Pairs, Word Bank Sentence Builder, Typing,
 * Combo Streak, and Re-queuing missed questions + Automatic SRS Sync on completion.
 */
const RoadmapLessonModal = ({
    lesson,
    stage,
    targetLang = 'ja',
    onClose,
    onLessonCompleted,
    awardXP,
    userId,
    allCards = [],
    folders = [],
    unlockStageOnPass = null
}) => {
    if (!lesson) return null;

    const initialQuestions = useMemo(() => lesson.questions || [], [lesson]);
    const [queue, setQueue] = useState(() => initialQuestions);
    const [currentIdx, setCurrentIdx] = useState(0);
    const [hearts, setHearts] = useState(5);
    const [combo, setCombo] = useState(0);
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

    // Word bank state
    const [selectedTokenIds, setSelectedTokenIds] = useState([]);

    // Typing state
    const [typedAnswer, setTypedAnswer] = useState('');

    useEffect(() => {
        setQueue(initialQuestions);
        setCurrentIdx(0);
        setHearts(5);
        setCombo(0);
        setCorrectCount(0);
        setIsFinished(false);
    }, [initialQuestions]);

    const currentQ = queue[currentIdx] || null;

    // Reset interaction state ONLY when advancing question index or starting a new lesson (never when re-queuing wrong items into `queue`)
    useEffect(() => {
        setSelectedOption(null);
        setAnswerStatus(null);
        setMatchedPairs(new Set());
        setSelectedLeft(null);
        setSelectedRight(null);
        setSelectedTokenIds([]);
        setTypedAnswer('');
    }, [currentIdx, initialQuestions]);

    // Shuffled word bank tokens for current word_bank question
    const bankTokens = useMemo(() => {
        if (!currentQ || currentQ.type !== 'word_bank') return [];
        const raw = [...(currentQ.chips || []), ...(currentQ.traps || [])];
        return raw
            .map((text, idx) => ({ id: `tok_${currentIdx}_${idx}`, text }))
            .sort(() => 0.5 - Math.random());
    }, [currentIdx, currentQ]);

    // Shuffled right pairs for matching question
    const shuffledRightPairs = useMemo(() => {
        if (!currentQ || currentQ.type !== 'matching' || !currentQ.pairs) return [];
        return [...currentQ.pairs].sort(() => 0.5 - Math.random());
    }, [currentIdx, currentQ]);

    const playAudio = (textToPlay) => {
        const raw = textToPlay || currentQ?.audio || currentQ?.character;
        if (!raw) return;
        const text = String(raw).replace(/\[[^\]]*\]/g, '').trim();
        if (!text) return;
        setIsPlayingAudio(true);
        setTimeout(() => setIsPlayingAudio(false), 900);

        try {
            if (targetLang === 'ko' || targetLang === 'korean') speakKorean(text);
            else if (targetLang === 'en' || targetLang === 'english') speakEnglish(text);
            else speakJapanese(text);
        } catch (e) {
            console.warn('Audio playback error:', e);
        }
    };

    useEffect(() => {
        if (currentQ?.type === 'audio_choice' && currentQ?.audio) {
            const timer = setTimeout(() => playAudio(currentQ.audio), 350);
            return () => clearTimeout(timer);
        }
    }, [currentIdx, currentQ]);

    const handleSelectLeft = (item) => {
        if (matchedPairs.has(item.left) || answerStatus) return;
        playAudio(item.left.split('(')[0]);
        setSelectedLeft(item);
        if (selectedRight) checkMatchingPair(item, selectedRight);
    };

    const handleSelectRight = (item) => {
        if (matchedPairs.has(item.left) || answerStatus) return;
        setSelectedRight(item);
        if (selectedLeft) checkMatchingPair(selectedLeft, item);
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
                setCombo((c) => c + 1);
                if (!currentQ._isRetry) setCorrectCount((prev) => prev + 1);
            }
        } else {
            playIncorrectSound();
            setCombo(0);
            setMismatchShake(true);
            setTimeout(() => {
                setMismatchShake(false);
                setSelectedLeft(null);
                setSelectedRight(null);
            }, 600);
        }
    };

    const requeueIfNeeded = () => {
        if (currentQ && !currentQ._isRetry) {
            setQueue((prev) => [...prev, { ...currentQ, _isRetry: true }]);
        }
    };

    const canCheck = useMemo(() => {
        if (!currentQ || answerStatus || currentQ.type === 'matching') return false;
        if (currentQ.type === 'word_bank') return selectedTokenIds.length > 0;
        if (currentQ.type === 'typing') return typedAnswer.trim().length > 0;
        return selectedOption !== null;
    }, [currentQ, answerStatus, selectedTokenIds, typedAnswer, selectedOption]);

    const handleCheckAnswer = () => {
        if (!canCheck || !currentQ) return;

        let isCorrect = false;
        if (currentQ.type === 'word_bank') {
            const tokenMap = new Map(bankTokens.map((t) => [t.id, t.text]));
            const assembled = stripFuriAndSpaces(selectedTokenIds.map((id) => tokenMap.get(id) || '').join(''));
            const targetNorm = stripFuriAndSpaces(currentQ.target || (currentQ.chips || []).join(''));
            isCorrect = assembled === targetNorm;
        } else if (currentQ.type === 'typing') {
            const userNorm = stripFuriAndSpaces(typedAnswer);
            const acceptList = Array.isArray(currentQ.accept) ? currentQ.accept : [currentQ.hint];
            isCorrect = acceptList.some((acc) => stripFuriAndSpaces(acc) === userNorm);
        } else {
            isCorrect = selectedOption === currentQ.correctIndex;
        }

        if (isCorrect) {
            playCorrectSound();
            setAnswerStatus('correct');
            setCombo((c) => c + 1);
            if (!currentQ._isRetry) setCorrectCount((prev) => prev + 1);
            if (currentQ.type === 'word_bank' && currentQ.audio) playAudio(currentQ.audio);
        } else {
            playIncorrectSound();
            setAnswerStatus('incorrect');
            setCombo(0);
            setHearts((prev) => Math.max(0, prev - 1));
            requeueIfNeeded();
        }
    };

    const handleSkip = () => {
        if (answerStatus || currentQ?.type === 'matching') return;
        playIncorrectSound();
        setAnswerStatus('incorrect');
        setCombo(0);
        setHearts((prev) => Math.max(0, prev - 1));
        requeueIfNeeded();
    };

    const handleNextStep = () => {
        if (currentIdx + 1 < queue.length) {
            setCurrentIdx((prev) => prev + 1);
        } else {
            finishLesson();
        }
    };

    const finishLesson = () => {
        setIsFinished(true);
        playCompletionFanfare();
        launchFanfare();

        const baseTotal = Math.max(1, initialQuestions.length);
        const scorePercent = Math.min(100, Math.round((correctCount / baseTotal) * 100));
        const stars = scorePercent >= 90 ? 3 : scorePercent >= 60 ? 2 : 1;

        saveRoadmapLessonComplete(lesson.id, scorePercent, stars, targetLang, {
            userId,
            unlockStageNum: unlockStageOnPass
        });

        if (awardXP && lesson.xp) {
            awardXP(lesson.xp);
        }

        if (lesson?.items) {
            setIsSyncingSrs(true);
            addRoadmapLessonItemsToSrs({ lesson, userId, allCards, folders })
                .then((res) => setSrsSyncResult(res))
                .catch((err) => console.warn('SRS auto-sync error:', err))
                .finally(() => setIsSyncingSrs(false));
        }

        if (onLessonCompleted) {
            onLessonCompleted(lesson.id, scorePercent, stars);
        }
    };

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (isFinished) {
                if (e.key === 'Enter') onClose();
                return;
            }
            if (showExitConfirm) return;

            if (e.key === 'Enter') {
                e.preventDefault();
                if (answerStatus) handleNextStep();
                else if (canCheck) handleCheckAnswer();
            } else if (!answerStatus && currentQ?.options && currentQ.type !== 'typing' && currentQ.type !== 'word_bank') {
                const num = parseInt(e.key, 10);
                if (num >= 1 && num <= currentQ.options.length) {
                    setSelectedOption(num - 1);
                    playAudio(currentQ.options[num - 1]);
                }
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [canCheck, answerStatus, isFinished, showExitConfirm, currentIdx, selectedOption, typedAnswer, selectedTokenIds]);

    useEffect(() => {
        if (typeof document === 'undefined') return;
        const originalOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = originalOverflow; };
    }, []);

    const progressPercent = Math.round(((currentIdx + (answerStatus === 'correct' ? 1 : 0)) / Math.max(1, queue.length)) * 100);

    const correctAnswerText = useMemo(() => {
        if (!currentQ) return '';
        if (currentQ.type === 'word_bank') return currentQ.target || (currentQ.chips || []).join('');
        if (currentQ.type === 'typing') return currentQ.hint || currentQ.accept?.[0] || '';
        return currentQ.options?.[currentQ.correctIndex] || '';
    }, [currentQ]);

    const lessonScreenContent = (
        <div className="fixed inset-0 z-[999999] w-screen h-[100dvh] flex flex-col bg-white dark:bg-slate-950 text-slate-900 dark:text-white select-none overflow-hidden animate-in fade-in duration-200">
            <RoadmapLessonHeader
                progressPercent={progressPercent}
                hearts={hearts}
                combo={combo}
                onCloseClick={() => {
                    if (currentIdx > 0 && !isFinished) setShowExitConfirm(true);
                    else onClose();
                }}
            />

            <div className="flex-1 min-h-0 w-full overflow-y-auto custom-scrollbar">
                <div className="min-h-full w-full max-w-4xl mx-auto px-4 sm:px-8 py-4 sm:py-6 flex flex-col justify-center">
                {isFinished ? (
                    <RoadmapLessonVictory
                        lesson={lesson}
                        correctCount={correctCount}
                        totalQuestions={initialQuestions.length}
                        srsSyncResult={srsSyncResult}
                        isSyncingSrs={isSyncingSrs}
                        onContinue={onClose}
                    />
                ) : hearts <= 0 ? (
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
                                setCombo(0);
                                setQueue(initialQuestions);
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
                    <RoadmapQuestionContent
                        currentQ={currentQ}
                        stage={stage}
                        lesson={lesson}
                        currentIdx={currentIdx}
                        totalQuestions={queue.length}
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
                        bankTokens={bankTokens}
                        selectedTokenIds={selectedTokenIds}
                        onAddToken={(tok) => {
                            playAudio(tok.text);
                            setSelectedTokenIds((prev) => [...prev, tok.id]);
                        }}
                        onRemoveToken={(tokId) => setSelectedTokenIds((prev) => prev.filter((id) => id !== tokId))}
                        onClearTokens={() => setSelectedTokenIds([])}
                        typedAnswer={typedAnswer}
                        onChangeTypedAnswer={setTypedAnswer}
                        onSubmitTyping={handleCheckAnswer}
                    />
                )}
                </div>
            </div>

            {!isFinished && hearts > 0 && (
                <RoadmapLessonFooter
                    answerStatus={answerStatus}
                    canCheck={canCheck}
                    isMatching={currentQ?.type === 'matching'}
                    explanation={currentQ?.explanation}
                    correctAnswerText={correctAnswerText}
                    onSkip={handleSkip}
                    onCheck={handleCheckAnswer}
                    onNext={handleNextStep}
                />
            )}

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
                                Nếu thoát bây giờ, tiến trình câu trả lời của bài học này sẽ không được lưu!
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
