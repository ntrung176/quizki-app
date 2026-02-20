import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Calendar, Clock, BookOpen, Users, MessageSquare, GraduationCap, Layers, Plus
} from 'lucide-react';
import { shuffleArray } from '../../utils/textProcessing';
import { ROUTES } from '../../router';
import { formatCountdown, getDifficultyLabel, DEFAULT_EASE } from '../../utils/srs';
import { SRS_INTERVALS, MASTERED_THRESHOLD } from '../../config/constants';
import OnboardingTour from '../ui/OnboardingTour';

const SRSVocabScreen = ({
    displayName,
    dueCounts,
    totalCards,
    allCards,
    studySessionData,
    setStudySessionData,
    setReviewMode,
    onStartReview,
    setView,
    onNavigate,
    setFlashcardCards,
}) => {
    const navigate = useNavigate();
    const [countdownText, setCountdownText] = useState(null);
    const [isCountdown, setIsCountdown] = useState(false);

    // Cần ôn (thẻ đến hạn HOẶC thẻ mới) VÀ chưa hoàn thành ý nghĩa (streak_back < 1)
    const dueCards = allCards.filter(card => {
        const backStreak = typeof card.correctStreak_back === 'number' ? card.correctStreak_back : 0;
        if (backStreak >= 1) return false; // Đã hoàn thành phần ý nghĩa rồi
        // Thẻ mới (chưa có SRS) luôn cần ôn
        if (card.intervalIndex_back === -1) return true;
        // Thẻ đã có SRS: kiểm tra nextReview
        const nextReview = card.nextReview_back;
        return nextReview && nextReview <= Date.now();
    }).length;

    // Helper: lấy actual interval (backward compatible)
    const getEffectiveInterval = (card) => {
        if (typeof card.currentInterval_back === 'number' && card.currentInterval_back > 0) {
            return card.currentInterval_back;
        }
        // Backward compatibility: suy ra từ intervalIndex nếu chưa có currentInterval_back
        if (card.intervalIndex_back >= 0 && card.intervalIndex_back < SRS_INTERVALS.length) {
            return SRS_INTERVALS[card.intervalIndex_back];
        }
        return 0;
    };

    // Mới thêm (chưa học lần nào, intervalIndex = -1)
    const newCards = allCards.filter(card => card.intervalIndex_back === -1).length;

    // Đang học (intervalIndex = 0 hoặc 1, learning phase)
    const learningCards = allCards.filter(card => card.intervalIndex_back === 0 || card.intervalIndex_back === 1).length;

    // Ngắn hạn (graduated nhưng chưa mastered: index >= 2 && actual interval < 30 ngày)
    const shortTermCards = allCards.filter(card =>
        card.intervalIndex_back >= 2 && getEffectiveInterval(card) < MASTERED_THRESHOLD
    ).length;

    // Đã thuộc (actual interval >= 30 ngày)
    const masteredCards = allCards.filter(card =>
        getEffectiveInterval(card) >= MASTERED_THRESHOLD
    ).length;

    // Tổng đã học qua (không còn là thẻ mới)
    const learnedCards = allCards.filter(card => card.intervalIndex_back >= 0).length;

    // Đếm số từ có synonym VÀ chưa hoàn thành phần đồng nghĩa (streak < 1)
    const synonymCards = allCards.filter(card => {
        if (!card.synonym || card.synonym.trim() === '') return false;
        const synonymStreak = typeof card.correctStreak_synonym === 'number' ? card.correctStreak_synonym : 0;
        if (synonymStreak >= 1) return false; // Đã hoàn thành
        return card.intervalIndex_back === -1 ||
            (card.nextReview_back && card.nextReview_back <= Date.now());
    }).length;

    // Đếm số từ có example VÀ chưa hoàn thành phần ngữ cảnh (streak < 1)
    const exampleCards = allCards.filter(card => {
        if (!card.example || card.example.trim() === '') return false;
        const exampleStreak = typeof card.correctStreak_example === 'number' ? card.correctStreak_example : 0;
        if (exampleStreak >= 1) return false; // Đã hoàn thành
        return card.intervalIndex_back === -1 ||
            (card.nextReview_back && card.nextReview_back <= Date.now());
    }).length;

    // Tìm thời gian ôn tập tiếp theo (CHỈ từ thẻ đã học, KHÔNG tính thẻ mới)
    const getNextReviewTimestamp = () => {
        const futureCards = allCards
            .filter(card =>
                card.intervalIndex_back >= 0 && // Chỉ thẻ đã học (không phải thẻ mới)
                card.nextReview_back && card.nextReview_back > Date.now()
            )
            .sort((a, b) => a.nextReview_back - b.nextReview_back);

        if (futureCards.length === 0) return null;
        return futureCards[0].nextReview_back;
    };

    // Live countdown timer - cập nhật mỗi giây khi < 24h
    useEffect(() => {
        const updateCountdown = () => {
            const nextTimestamp = getNextReviewTimestamp();
            if (!nextTimestamp) {
                setCountdownText(null);
                setIsCountdown(false);
                return;
            }

            const result = formatCountdown(nextTimestamp);
            if (!result) {
                // Đã đến hạn
                setCountdownText(null);
                setIsCountdown(false);
                return;
            }

            setCountdownText(result.text);
            setIsCountdown(result.isCountdown);
        };

        updateCountdown();

        // Cập nhật mỗi giây
        const interval = setInterval(updateCountdown, 1000);
        return () => clearInterval(interval);
    }, [allCards]);

    const handleStartReview = (mode) => {
        setReviewMode(mode);
        onStartReview(mode, 'all');
    };

    // Bắt đầu học từ mới (từ chưa có SRS)
    const handleStartStudy = () => {
        const noSrsCards = allCards.filter(c => c.intervalIndex_back === -1);
        if (noSrsCards.length === 0) return;

        const shuffledCards = shuffleArray([...noSrsCards]);
        const firstBatch = shuffledCards.slice(0, Math.min(5, shuffledCards.length));

        setStudySessionData({
            learning: [],
            new: shuffledCards,
            reviewing: [],
            currentBatch: firstBatch,
            currentPhase: 'multipleChoice',
            batchIndex: 0,
            allNoSrsCards: shuffledCards
        });
        setView('STUDY');
    };

    // Bắt đầu flashcard (chỉ cho từ mới)
    const handleStartFlashcard = () => {
        console.log('handleStartFlashcard called', { newCards, allCardsLength: allCards.length });
        if (newCards === 0) {
            console.log('No new cards, returning');
            return;
        }
        const noSrsCards = allCards.filter(c => c.intervalIndex_back === -1);
        console.log('noSrsCards found:', noSrsCards.length);
        const shuffledCards = shuffleArray([...noSrsCards]);
        console.log('Setting flashcardCards:', shuffledCards.length);
        setFlashcardCards(shuffledCards);
        console.log('Navigating to FLASHCARD route');
        navigate(ROUTES.FLASHCARD);
    };

    return (
        <div className="space-y-4">
            {/* Header - Thống kê học tập */}
            <div className="space-y-1">
                <h1 className="text-xl md:text-2xl font-bold text-gray-800 dark:text-gray-100">
                    Thống kê học tập
                </h1>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                    Theo dõi tiến độ và kế hoạch ôn tập của bạn,
                    theo các báo cáo 21 ngày ôn tập kiến thức sẽ được nạp vào trí nhớ dài hạn
                </p>
            </div>

            {/* Tổng quan (thẻ) */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-3 md:p-4 border border-gray-200 dark:border-gray-700 shadow-sm">
                <h3 className="text-xs font-bold text-gray-600 dark:text-gray-300 mb-3 flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-sky-100 dark:bg-sky-900/50 flex items-center justify-center text-[10px]">📊</span>
                    Tổng quan (thẻ)
                </h3>
                <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                    <div className="text-center p-2 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800/30">
                        <div className="text-xl md:text-2xl font-bold text-red-500">{dueCards}</div>
                        <div className="text-[9px] md:text-[10px] font-medium text-red-600 dark:text-red-400">🔴 Cần ôn</div>
                    </div>
                    <div className="text-center p-2 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800/30">
                        <div className="text-xl md:text-2xl font-bold text-emerald-500">{newCards}</div>
                        <div className="text-[9px] md:text-[10px] font-medium text-emerald-600 dark:text-emerald-400">🟢 Mới thêm</div>
                    </div>
                    <div className="text-center p-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800/30">
                        <div className="text-xl md:text-2xl font-bold text-amber-500">{learningCards}</div>
                        <div className="text-[9px] md:text-[10px] font-medium text-amber-600 dark:text-amber-400">🟡 Đang học</div>
                    </div>
                    <div className="text-center p-2 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/30">
                        <div className="text-xl md:text-2xl font-bold text-blue-500">{shortTermCards}</div>
                        <div className="text-[9px] md:text-[10px] font-medium text-blue-600 dark:text-blue-400">🔵 Ngắn hạn</div>
                    </div>
                    <div className="text-center p-2 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800/30">
                        <div className="text-xl md:text-2xl font-bold text-green-600">{masteredCards}</div>
                        <div className="text-[9px] md:text-[10px] font-medium text-green-600 dark:text-green-400">💚 Dài hạn</div>
                    </div>
                    <div className="text-center p-2 rounded-lg bg-gray-100 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600">
                        <div className="text-xl md:text-2xl font-bold text-gray-800 dark:text-white">{learnedCards}</div>
                        <div className="text-[9px] md:text-[10px] font-medium text-gray-600 dark:text-gray-300">📚 Đã học</div>
                    </div>
                </div>
            </div>

            {/* Phân bố độ khó */}
            {learnedCards > 0 && (() => {
                const cardsWithEase = allCards.filter(c => c.intervalIndex_back >= 0);
                const easy = cardsWithEase.filter(c => (c.easeFactor || DEFAULT_EASE) >= 2.5).length;
                const normal = cardsWithEase.filter(c => {
                    const e = c.easeFactor || DEFAULT_EASE;
                    return e >= 2.0 && e < 2.5;
                }).length;
                const hard = cardsWithEase.filter(c => {
                    const e = c.easeFactor || DEFAULT_EASE;
                    return e >= 1.5 && e < 2.0;
                }).length;
                const veryHard = cardsWithEase.filter(c => (c.easeFactor || DEFAULT_EASE) < 1.5).length;
                const total = cardsWithEase.length || 1;

                return (
                    <div className="bg-white dark:bg-gray-800 rounded-xl p-3 md:p-4 border border-gray-200 dark:border-gray-700 shadow-sm">
                        <h3 className="text-xs font-bold text-gray-600 dark:text-gray-300 mb-3 flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-violet-100 dark:bg-violet-900/50 flex items-center justify-center text-[10px]">🧠</span>
                            Phân bố độ khó
                        </h3>
                        <div className="space-y-1.5">
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] w-14 text-emerald-600 dark:text-emerald-400 font-medium">🟢 Dễ</span>
                                <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                    <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${(easy / total) * 100}%` }} />
                                </div>
                                <span className="text-[10px] text-gray-500 w-8 text-right">{easy}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] w-14 text-gray-500 font-medium">⚪ T.bình</span>
                                <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                    <div className="h-full bg-gray-400 rounded-full transition-all" style={{ width: `${(normal / total) * 100}%` }} />
                                </div>
                                <span className="text-[10px] text-gray-500 w-8 text-right">{normal}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] w-14 text-orange-500 font-medium">🟡 Khó</span>
                                <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                    <div className="h-full bg-orange-500 rounded-full transition-all" style={{ width: `${(hard / total) * 100}%` }} />
                                </div>
                                <span className="text-[10px] text-gray-500 w-8 text-right">{hard}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] w-14 text-red-500 font-medium">🔴 R.khó</span>
                                <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                    <div className="h-full bg-red-500 rounded-full transition-all" style={{ width: `${(veryHard / total) * 100}%` }} />
                                </div>
                                <span className="text-[10px] text-gray-500 w-8 text-right">{veryHard}</span>
                            </div>
                        </div>
                    </div>
                );
            })()}

            {/* Chỉ số chính xác */}
            {(() => {
                const totalCorrect = allCards.reduce((sum, c) => sum + (c.correctCount || 0), 0);
                const totalIncorrect = allCards.reduce((sum, c) => sum + (c.incorrectCount || 0), 0);
                const totalAttempts = totalCorrect + totalIncorrect;
                if (totalAttempts === 0) return null;
                const accuracyPercent = Math.round((totalCorrect / totalAttempts) * 100);
                // Từ đúng lần đầu: correctCount >= 1 && incorrectCount === 0
                const firstTimeCorrect = allCards.filter(c => (c.correctCount || 0) >= 1 && (c.incorrectCount || 0) === 0).length;
                const cardsWithAttempts = allCards.filter(c => (c.correctCount || 0) + (c.incorrectCount || 0) > 0).length;

                return (
                    <div className="bg-white dark:bg-gray-800 rounded-xl p-3 md:p-4 border border-gray-200 dark:border-gray-700 shadow-sm">
                        <h3 className="text-xs font-bold text-gray-600 dark:text-gray-300 mb-3 flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-[10px]">🎯</span>
                            Chỉ số chính xác
                        </h3>
                        <div className="grid grid-cols-4 gap-2 mb-3">
                            <div className="text-center p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-900/20">
                                <div className="text-lg font-bold text-emerald-500">{totalCorrect}</div>
                                <div className="text-[8px] text-emerald-600 dark:text-emerald-400">Đúng</div>
                            </div>
                            <div className="text-center p-1.5 rounded-lg bg-red-50 dark:bg-red-900/20">
                                <div className="text-lg font-bold text-red-500">{totalIncorrect}</div>
                                <div className="text-[8px] text-red-600 dark:text-red-400">Sai</div>
                            </div>
                            <div className="text-center p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-900/20">
                                <div className="text-lg font-bold text-indigo-500">{accuracyPercent}%</div>
                                <div className="text-[8px] text-indigo-600 dark:text-indigo-400">Tỉ lệ</div>
                            </div>
                            <div className="text-center p-1.5 rounded-lg bg-amber-50 dark:bg-amber-900/20">
                                <div className="text-lg font-bold text-amber-500">{firstTimeCorrect}/{cardsWithAttempts}</div>
                                <div className="text-[8px] text-amber-600 dark:text-amber-400">Đúng lần 1</div>
                            </div>
                        </div>
                        {/* Accuracy bar */}
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] w-8 text-emerald-500 font-medium">✓</span>
                            <div className="flex-1 h-3 bg-red-200 dark:bg-red-900/30 rounded-full overflow-hidden">
                                <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${accuracyPercent}%` }} />
                            </div>
                            <span className="text-[10px] w-8 text-red-500 font-medium text-right">✗</span>
                        </div>
                    </div>
                );
            })()}

            {/* Cards: Hôm nay + Lượt tiếp theo */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Hôm nay - màu cam */}
                <div className="bg-gradient-to-br from-orange-400 to-orange-500 rounded-xl p-4 text-white shadow-lg">
                    <div className="flex items-center gap-2 mb-2">
                        <Calendar className="w-4 h-4" />
                        <span className="font-bold text-sm">Hôm nay</span>
                    </div>
                    <div className="text-4xl md:text-5xl font-bold mb-1">{dueCards}</div>
                    <p className="text-orange-100 text-sm mb-4">thẻ cần ôn tập</p>
                    <button
                        onClick={() => handleStartReview('mixed')}
                        disabled={dueCards === 0}
                        className={`w-full py-3 rounded-xl font-bold transition-all ${dueCards > 0
                            ? 'bg-white text-orange-500 hover:bg-orange-50'
                            : 'bg-white/30 text-white/70 cursor-not-allowed'
                            }`}
                    >
                        Ôn tập tất cả
                    </button>
                </div>

                {/* Lượt tiếp theo - màu xanh + countdown */}
                <div className="bg-gradient-to-br from-blue-400 to-blue-500 rounded-xl p-4 text-white shadow-lg">
                    <div className="flex items-center gap-2 mb-2">
                        <Clock className="w-4 h-4" />
                        <span className="font-bold text-sm">Lượt tiếp theo</span>
                    </div>
                    {countdownText ? (
                        <>
                            <p className="text-blue-100 text-xs mb-1">Sau khi hoàn thành {dueCards} thẻ, bạn có</p>
                            <div className={`font-bold mb-1 ${isCountdown
                                ? 'text-3xl md:text-4xl font-mono tracking-wider'
                                : 'text-4xl md:text-5xl italic'
                                }`}>
                                {countdownText}
                            </div>
                            <p className="text-blue-100 text-xs">
                                {isCountdown ? 'đếm ngược đến lượt ôn tập tiếp theo' : 'nghỉ ngơi cho đến lượt ôn tập tiếp theo'}
                            </p>
                        </>
                    ) : (
                        <>
                            <div className="text-2xl md:text-3xl font-bold mb-1">Không có</div>
                            <p className="text-blue-100 text-xs">thẻ nào đang chờ ôn tập</p>
                        </>
                    )}
                </div>
            </div>

            {/* Chế độ học */}
            <div className="space-y-3">
                <h2 className="text-base md:text-lg font-bold text-gray-800 dark:text-gray-100">
                    Chế độ học
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {/* Flashcard - bên trái */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 shadow-sm flex flex-col">
                        <div className="flex items-center gap-2 mb-2">
                            <Layers className="w-4 h-4 text-cyan-500" />
                            <span className="font-bold text-sm text-gray-800 dark:text-white">Flashcard</span>
                            <span className="ml-auto text-xs px-2 py-0.5 bg-cyan-100 dark:bg-cyan-900/50 text-cyan-600 dark:text-cyan-400 rounded-full font-medium">
                                {newCards} từ mới
                            </span>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-3 flex-1">
                            Lật thẻ flashcard để học từ vựng mới. Xem mặt trước và lật để kiểm tra nghĩa.
                        </p>
                        <button
                            onClick={handleStartFlashcard}
                            disabled={newCards === 0}
                            className={`w-full py-2.5 rounded-xl font-bold transition-all mt-auto ${newCards > 0
                                ? 'bg-cyan-500 hover:bg-cyan-600 text-white'
                                : 'bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
                                }`}
                        >
                            Lật Flashcard
                        </button>
                    </div>

                    {/* Học từ mới - bên phải */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 shadow-sm flex flex-col">
                        <div className="flex items-center gap-2 mb-2">
                            <GraduationCap className="w-4 h-4 text-teal-500" />
                            <span className="font-bold text-sm text-gray-800 dark:text-white">Học từ mới</span>
                            <span className="ml-auto text-xs px-2 py-0.5 bg-teal-100 dark:bg-teal-900/50 text-teal-600 dark:text-teal-400 rounded-full font-medium">
                                {newCards} từ
                            </span>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-3 flex-1">
                            Học từ vựng mới bằng trắc nghiệm 4 đáp án. Giao diện giống chế độ kiểm tra.
                        </p>
                        <button
                            onClick={handleStartStudy}
                            disabled={newCards === 0}
                            className={`w-full py-2.5 rounded-xl font-bold transition-all mt-auto ${newCards > 0
                                ? 'bg-teal-500 hover:bg-teal-600 text-white'
                                : 'bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
                                }`}
                        >
                            Bắt đầu học
                        </button>
                    </div>
                </div>
            </div>

            {/* Chọn chế độ ôn tập */}
            <div className="space-y-3">
                <h2 className="text-base md:text-lg font-bold text-gray-800 dark:text-gray-100">
                    Chọn chế độ ôn tập
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {/* Ý nghĩa */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 shadow-sm flex flex-col">
                        <div className="flex items-center gap-2 mb-2">
                            <BookOpen className="w-4 h-4 text-sky-500" />
                            <span className="font-bold text-sm text-gray-800 dark:text-white">Ý nghĩa</span>
                            <span className="ml-auto text-xs px-2 py-0.5 bg-sky-100 dark:bg-sky-900/50 text-sky-600 dark:text-sky-400 rounded-full font-medium">
                                {dueCards} từ
                            </span>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-3 flex-1">
                            Xem từ vựng và nhớ lại ý nghĩa. Chế độ cơ bản nhất để ôn tập.
                        </p>
                        <button
                            onClick={() => handleStartReview('back')}
                            disabled={dueCards === 0}
                            className={`w-full py-2.5 rounded-xl font-bold transition-all mt-auto ${dueCards > 0
                                ? 'bg-sky-500 hover:bg-sky-600 text-white'
                                : 'bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
                                }`}
                        >
                            Bắt đầu Ý nghĩa
                        </button>
                    </div>

                    {/* Đồng nghĩa */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 shadow-sm flex flex-col">
                        <div className="flex items-center gap-2 mb-2">
                            <Users className="w-4 h-4 text-emerald-500" />
                            <span className="font-bold text-sm text-gray-800 dark:text-white">Đồng nghĩa</span>
                            <span className="ml-auto text-xs px-2 py-0.5 bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 rounded-full font-medium">
                                {synonymCards} từ
                            </span>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-3 flex-1">
                            Ôn tập từ đồng nghĩa để mở rộng vốn từ và diễn đạt đa dạng hơn.
                        </p>
                        <button
                            onClick={() => handleStartReview('synonym')}
                            disabled={synonymCards === 0}
                            className={`w-full py-2.5 rounded-xl font-bold transition-all mt-auto ${synonymCards > 0
                                ? 'bg-emerald-500 hover:bg-emerald-600 text-white'
                                : 'bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
                                }`}
                        >
                            Bắt đầu Đồng nghĩa
                        </button>
                    </div>

                    {/* Ngữ cảnh */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 shadow-sm flex flex-col">
                        <div className="flex items-center gap-2 mb-2">
                            <MessageSquare className="w-4 h-4 text-amber-500" />
                            <span className="font-bold text-sm text-gray-800 dark:text-white">Ngữ cảnh</span>
                            <span className="ml-auto text-xs px-2 py-0.5 bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-400 rounded-full font-medium">
                                {exampleCards} từ
                            </span>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-3 flex-1">
                            Ôn tập từ qua ví dụ thực tế. Hiểu cách sử dụng từ trong câu.
                        </p>
                        <button
                            onClick={() => handleStartReview('example')}
                            disabled={exampleCards === 0}
                            className={`w-full py-2.5 rounded-xl font-bold transition-all mt-auto ${exampleCards > 0
                                ? 'bg-amber-500 hover:bg-amber-600 text-white'
                                : 'bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
                                }`}
                        >
                            Bắt đầu Ngữ cảnh
                        </button>
                    </div>
                </div>
            </div>

            {/* Onboarding Tour */}
            <OnboardingTour section="vocabReview" />
        </div>
    );
};

export default SRSVocabScreen;
