import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Calendar, Clock, BookOpen, Users, MessageSquare, GraduationCap, Layers, Plus, Zap
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
    const getNextReviewInfo = () => {
        const futureCards = allCards
            .filter(card =>
                card.intervalIndex_back >= 0 && // Chỉ thẻ đã học (không phải thẻ mới)
                card.nextReview_back && card.nextReview_back > Date.now()
            )
            .sort((a, b) => a.nextReview_back - b.nextReview_back);

        if (futureCards.length === 0) return null;

        const nextTimestamp = futureCards[0].nextReview_back;
        // Đếm tất cả thẻ đến hạn trong cùng lượt (cùng phút)
        const nextMinute = new Date(nextTimestamp);
        nextMinute.setSeconds(59, 999);
        const nextRoundCount = futureCards.filter(c => c.nextReview_back <= nextMinute.getTime()).length;

        return { timestamp: nextTimestamp, count: nextRoundCount };
    };

    const [nextRoundCount, setNextRoundCount] = useState(0);

    // Live countdown timer - cập nhật mỗi giây khi < 24h
    useEffect(() => {
        const updateCountdown = () => {
            const info = getNextReviewInfo();
            if (!info) {
                setCountdownText(null);
                setIsCountdown(false);
                setNextRoundCount(0);
                return;
            }

            const result = formatCountdown(info.timestamp);
            if (!result) {
                // Đã đến hạn
                setCountdownText(null);
                setIsCountdown(false);
                setNextRoundCount(0);
                return;
            }

            setCountdownText(result.text);
            setIsCountdown(result.isCountdown);
            setNextRoundCount(info.count);
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
        <div className="space-y-5 max-w-4xl mx-auto pb-8">
            {/* Header - matches KanjiReviewScreen gradient style */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-500 p-6 md:p-8 shadow-2xl">
                <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48cGF0aCBkPSJNMzYgMzRjMC0yLjIgMS44LTQgNC00czQgMS44IDQgNC0xLjggNC00IDQtNC0xLjgtNC00eiIvPjwvZz48L2c+PC9zdmc+')] opacity-30"></div>
                <div className="relative flex flex-col md:flex-row items-center justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <BookOpen className="w-5 h-5 text-yellow-300" />
                            <span className="text-white/80 text-sm font-medium">Ôn tập từ vựng</span>
                        </div>
                        <h1 className="text-3xl md:text-4xl font-bold text-white mb-1">
                            {dueCards > 0 ? `${dueCards} thẻ cần ôn` : 'Tuyệt vời! 🎉'}
                        </h1>
                        <p className="text-white/60 text-sm">
                            {dueCards > 0 ? 'Hãy hoàn thành bài ôn tập hôm nay' : 'Bạn đã hoàn thành ôn tập'}
                        </p>
                    </div>
                    <button
                        onClick={() => handleStartReview('mixed')}
                        disabled={dueCards === 0}
                        className="flex items-center gap-2 px-7 py-3.5 bg-white/20 hover:bg-white/30 disabled:opacity-40 disabled:cursor-not-allowed rounded-2xl text-white font-bold transition-all duration-300 hover:scale-105 hover:shadow-lg border border-white/20 backdrop-blur-sm"
                    >
                        <Zap className="w-5 h-5" />
                        {dueCards > 0 ? 'Ôn tập ngay' : 'Đã xong'}
                    </button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-3 gap-3">
                {[
                    { icon: Calendar, label: 'Đã học', value: learnedCards, color: 'text-emerald-600 dark:text-emerald-400', iconBg: 'bg-emerald-100 dark:bg-emerald-900/40' },
                    { icon: GraduationCap, label: 'Tổng từ vựng', value: totalCards, color: 'text-cyan-600 dark:text-cyan-400', iconBg: 'bg-cyan-100 dark:bg-cyan-900/40' },
                    { icon: BookOpen, label: 'Đã thuộc', value: masteredCards, color: 'text-orange-600 dark:text-orange-400', iconBg: 'bg-orange-100 dark:bg-orange-900/40' },
                ].map((s, i) => (
                    <div key={i} className="bg-white dark:bg-slate-800/80 backdrop-blur-sm rounded-2xl p-4 border border-gray-100 dark:border-slate-700/50 shadow-sm hover:shadow-md transition-all duration-300 text-center group hover:scale-[1.02]">
                        <div className={`w-10 h-10 rounded-xl ${s.iconBg} flex items-center justify-center mx-auto mb-2.5`}>
                            <s.icon className={`w-5 h-5 ${s.color}`} />
                        </div>
                        <div className="text-2xl font-bold text-gray-900 dark:text-white">{s.value}</div>
                        <div className="text-[10px] md:text-xs text-gray-500 dark:text-gray-400 mt-0.5">{s.label}</div>
                    </div>
                ))}
            </div>

            {/* Tổng quan SRS */}
            <div className="bg-white dark:bg-slate-800/80 backdrop-blur-sm rounded-2xl p-5 border border-gray-100 dark:border-slate-700/50 shadow-sm">
                <h3 className="text-sm font-bold text-gray-700 dark:text-gray-200 mb-4 flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-sky-100 dark:bg-sky-900/50 flex items-center justify-center text-[10px]">📊</span>
                    Tổng quan SRS
                </h3>
                <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                    {[
                        { label: 'Cần ôn', value: dueCards, color: 'text-red-500' },
                        { label: 'Mới thêm', value: newCards, color: 'text-emerald-500' },
                        { label: 'Đang học', value: learningCards, color: 'text-amber-500' },
                        { label: 'Ngắn hạn', value: shortTermCards, color: 'text-blue-500' },
                        { label: 'Dài hạn', value: masteredCards, color: 'text-green-600' },
                        { label: 'Đã học', value: learnedCards, color: 'text-indigo-500' },
                    ].map((item, i) => (
                        <div key={i} className="p-3 bg-gray-50 dark:bg-slate-700/50 rounded-xl text-center hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors">
                            <div className={`text-xl md:text-2xl font-bold ${item.color}`}>{item.value}</div>
                            <div className="text-[10px] text-gray-500 dark:text-gray-400 mt-1">{item.label}</div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Hôm nay + Lượt tiếp theo */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Hôm nay */}
                <div className="relative overflow-hidden bg-gradient-to-br from-orange-500 to-rose-500 rounded-2xl p-5 text-white shadow-xl">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2"></div>
                    <div className="relative">
                        <div className="flex items-center gap-2 mb-2">
                            <Calendar className="w-4 h-4 text-orange-100" />
                            <span className="font-bold text-sm">Hôm nay</span>
                        </div>
                        <div className="text-5xl font-bold mb-1">{dueCards}</div>
                        <p className="text-orange-100 text-sm mb-4">thẻ cần ôn tập</p>
                        <button
                            onClick={() => handleStartReview('mixed')}
                            disabled={dueCards === 0}
                            className="w-full py-2.5 bg-white/20 hover:bg-white/30 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl text-sm font-bold transition-all border border-white/20 backdrop-blur-sm"
                        >
                            {dueCards > 0 ? 'Ôn tập tất cả' : 'Nghỉ ngơi 😴'}
                        </button>
                    </div>
                </div>

                {/* Lượt tiếp theo */}
                <div className="relative overflow-hidden bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl p-5 text-white shadow-xl">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2"></div>
                    <div className="relative">
                        <div className="flex items-center gap-2 mb-2">
                            <Clock className="w-4 h-4 text-blue-100" />
                            <span className="font-bold text-sm">Lượt tiếp theo</span>
                        </div>
                        {countdownText ? (
                            <>
                                <div className={`font-bold mb-1 ${isCountdown ? 'text-3xl font-mono tracking-wider' : 'text-4xl'}`}>
                                    {countdownText}
                                </div>
                                <p className="text-blue-100 text-sm">{isCountdown ? 'Đếm ngược...' : 'Nghỉ ngơi...'}</p>
                                {nextRoundCount > 0 && (
                                    <div className="mt-3 bg-white/15 rounded-xl px-3 py-1.5 inline-flex items-center gap-1.5">
                                        <span className="text-xs font-bold">✨ {nextRoundCount} thẻ sẽ đến hạn</span>
                                    </div>
                                )}
                            </>
                        ) : (
                            <>
                                <div className="text-4xl font-bold mb-1">∞</div>
                                <p className="text-blue-100 text-sm">Không có thẻ đang chờ</p>
                            </>
                        )}
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

                const distribution = [
                    { label: 'Dễ', count: easy, percent: (easy / total) * 100, color: 'from-emerald-400 to-green-500' },
                    { label: 'Trung bình', count: normal, percent: (normal / total) * 100, color: 'from-gray-400 to-gray-500' },
                    { label: 'Khó', count: hard, percent: (hard / total) * 100, color: 'from-amber-400 to-yellow-500' },
                    { label: 'Rất khó', count: veryHard, percent: (veryHard / total) * 100, color: 'from-red-400 to-rose-500' },
                ];

                return (
                    <div className="bg-white dark:bg-slate-800/80 backdrop-blur-sm rounded-2xl p-5 border border-gray-100 dark:border-slate-700/50 shadow-sm">
                        <h3 className="text-sm font-bold text-gray-700 dark:text-gray-200 mb-4 flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-violet-100 dark:bg-violet-900/50 flex items-center justify-center text-[10px]">🧠</span>
                            Phân bố độ khó
                        </h3>
                        <div className="space-y-3.5">
                            {distribution.map((item, index) => (
                                <div key={index}>
                                    <div className="flex justify-between text-sm mb-1.5">
                                        <span className="text-gray-600 dark:text-gray-400 font-medium">{item.label}</span>
                                        <span className="text-gray-800 dark:text-gray-200 font-bold">{item.count} <span className="text-gray-400 font-normal text-xs">({item.percent.toFixed(0)}%)</span></span>
                                    </div>
                                    <div className="h-2 bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden">
                                        <div className={`h-full bg-gradient-to-r ${item.color} rounded-full transition-all duration-700 ease-out`}
                                            style={{ width: `${Math.max(item.percent, 0.5)}%` }} />
                                    </div>
                                </div>
                            ))}
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
                const firstTimeCorrect = allCards.filter(c => (c.correctCount || 0) >= 1 && (c.incorrectCount || 0) === 0).length;
                const cardsWithAttempts = allCards.filter(c => (c.correctCount || 0) + (c.incorrectCount || 0) > 0).length;

                return (
                    <div className="bg-white dark:bg-slate-800/80 backdrop-blur-sm rounded-2xl p-5 border border-gray-100 dark:border-slate-700/50 shadow-sm">
                        <h3 className="text-sm font-bold text-gray-700 dark:text-gray-200 mb-4 flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-[10px]">🎯</span>
                            Chỉ số chính xác
                        </h3>
                        <div className="grid grid-cols-4 gap-2 mb-3">
                            {[
                                { label: 'Đúng', value: totalCorrect, color: 'text-emerald-500' },
                                { label: 'Sai', value: totalIncorrect, color: 'text-red-500' },
                                { label: 'Tỉ lệ', value: `${accuracyPercent}%`, color: 'text-indigo-500' },
                                { label: 'Đúng lần 1', value: `${firstTimeCorrect}/${cardsWithAttempts}`, color: 'text-amber-500' },
                            ].map((item, i) => (
                                <div key={i} className="p-2.5 bg-gray-50 dark:bg-slate-700/50 rounded-xl text-center">
                                    <div className={`text-lg font-bold ${item.color}`}>{item.value}</div>
                                    <div className="text-[8px] text-gray-500 dark:text-gray-400 mt-0.5">{item.label}</div>
                                </div>
                            ))}
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] w-8 text-emerald-500 font-medium">✓</span>
                            <div className="flex-1 h-2.5 bg-red-100 dark:bg-red-900/30 rounded-full overflow-hidden">
                                <div className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 rounded-full transition-all duration-700 ease-out" style={{ width: `${accuracyPercent}%` }} />
                            </div>
                            <span className="text-[10px] w-8 text-red-500 font-medium text-right">✗</span>
                        </div>
                    </div>
                );
            })()}

            {/* Chế độ học */}
            <div className="space-y-3">
                <h2 className="text-sm font-bold text-gray-700 dark:text-gray-200 flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-cyan-100 dark:bg-cyan-900/50 flex items-center justify-center text-[10px]">📖</span>
                    Chế độ học
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {/* Flashcard */}
                    <div className="bg-white dark:bg-slate-800/80 backdrop-blur-sm rounded-2xl p-5 border border-gray-100 dark:border-slate-700/50 shadow-sm hover:shadow-md transition-all duration-300 hover:scale-[1.01] flex flex-col">
                        <div className="flex items-center gap-2 mb-2">
                            <div className="w-8 h-8 rounded-xl bg-cyan-100 dark:bg-cyan-900/40 flex items-center justify-center">
                                <Layers className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                            </div>
                            <span className="font-bold text-sm text-gray-800 dark:text-white">Flashcard</span>
                            <span className="ml-auto text-xs px-2.5 py-0.5 bg-cyan-50 dark:bg-cyan-900/30 text-cyan-600 dark:text-cyan-400 rounded-full font-bold">
                                {newCards} từ mới
                            </span>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-3 flex-1 leading-relaxed">
                            Lật thẻ flashcard để học từ vựng mới. Xem mặt trước và lật để kiểm tra nghĩa.
                        </p>
                        <button
                            onClick={handleStartFlashcard}
                            disabled={newCards === 0}
                            className={`w-full py-2.5 rounded-xl font-bold text-sm transition-all mt-auto ${newCards > 0
                                ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white hover:shadow-lg hover:shadow-cyan-500/20 hover:scale-[1.02]'
                                : 'bg-gray-100 dark:bg-slate-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                                }`}
                        >
                            Lật Flashcard
                        </button>
                    </div>

                    {/* Học từ mới */}
                    <div className="bg-white dark:bg-slate-800/80 backdrop-blur-sm rounded-2xl p-5 border border-gray-100 dark:border-slate-700/50 shadow-sm hover:shadow-md transition-all duration-300 hover:scale-[1.01] flex flex-col">
                        <div className="flex items-center gap-2 mb-2">
                            <div className="w-8 h-8 rounded-xl bg-teal-100 dark:bg-teal-900/40 flex items-center justify-center">
                                <GraduationCap className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                            </div>
                            <span className="font-bold text-sm text-gray-800 dark:text-white">Học từ mới</span>
                            <span className="ml-auto text-xs px-2.5 py-0.5 bg-teal-50 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400 rounded-full font-bold">
                                {newCards} từ
                            </span>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-3 flex-1 leading-relaxed">
                            Học từ vựng mới bằng trắc nghiệm 4 đáp án. Giao diện giống chế độ kiểm tra.
                        </p>
                        <button
                            onClick={handleStartStudy}
                            disabled={newCards === 0}
                            className={`w-full py-2.5 rounded-xl font-bold text-sm transition-all mt-auto ${newCards > 0
                                ? 'bg-gradient-to-r from-teal-500 to-emerald-500 text-white hover:shadow-lg hover:shadow-teal-500/20 hover:scale-[1.02]'
                                : 'bg-gray-100 dark:bg-slate-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                                }`}
                        >
                            Bắt đầu học
                        </button>
                    </div>
                </div>
            </div>

            {/* Chọn chế độ ôn tập */}
            <div className="space-y-3">
                <h2 className="text-sm font-bold text-gray-700 dark:text-gray-200 flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center text-[10px]">⚡</span>
                    Chọn chế độ ôn tập
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {[
                        { icon: BookOpen, label: 'Ý nghĩa', count: dueCards, mode: 'back', gradient: 'from-sky-500 to-blue-500', iconBg: 'bg-sky-100 dark:bg-sky-900/40', iconColor: 'text-sky-600 dark:text-sky-400', badgeBg: 'bg-sky-50 dark:bg-sky-900/30', badgeText: 'text-sky-600 dark:text-sky-400', desc: 'Xem từ và nhớ lại ý nghĩa' },
                        { icon: Users, label: 'Đồng nghĩa', count: synonymCards, mode: 'synonym', gradient: 'from-emerald-500 to-green-500', iconBg: 'bg-emerald-100 dark:bg-emerald-900/40', iconColor: 'text-emerald-600 dark:text-emerald-400', badgeBg: 'bg-emerald-50 dark:bg-emerald-900/30', badgeText: 'text-emerald-600 dark:text-emerald-400', desc: 'Mở rộng vốn từ đồng nghĩa' },
                        { icon: MessageSquare, label: 'Ngữ cảnh', count: exampleCards, mode: 'example', gradient: 'from-amber-500 to-orange-500', iconBg: 'bg-amber-100 dark:bg-amber-900/40', iconColor: 'text-amber-600 dark:text-amber-400', badgeBg: 'bg-amber-50 dark:bg-amber-900/30', badgeText: 'text-amber-600 dark:text-amber-400', desc: 'Hiểu cách sử dụng trong câu' },
                    ].map((item, i) => (
                        <div key={i} className="bg-white dark:bg-slate-800/80 backdrop-blur-sm rounded-2xl p-5 border border-gray-100 dark:border-slate-700/50 shadow-sm hover:shadow-md transition-all duration-300 hover:scale-[1.01] flex flex-col">
                            <div className="flex items-center gap-2 mb-2">
                                <div className={`w-8 h-8 rounded-xl ${item.iconBg} flex items-center justify-center`}>
                                    <item.icon className={`w-4 h-4 ${item.iconColor}`} />
                                </div>
                                <span className="font-bold text-sm text-gray-800 dark:text-white">{item.label}</span>
                                <span className={`ml-auto text-xs px-2.5 py-0.5 ${item.badgeBg} ${item.badgeText} rounded-full font-bold`}>
                                    {item.count} từ
                                </span>
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-3 flex-1 leading-relaxed">
                                {item.desc}
                            </p>
                            <button
                                onClick={() => handleStartReview(item.mode)}
                                disabled={item.count === 0}
                                className={`w-full py-2.5 rounded-xl font-bold text-sm transition-all mt-auto ${item.count > 0
                                    ? `bg-gradient-to-r ${item.gradient} text-white hover:shadow-lg hover:scale-[1.02]`
                                    : 'bg-gray-100 dark:bg-slate-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                                    }`}
                            >
                                Bắt đầu {item.label}
                            </button>
                        </div>
                    ))}
                </div>
            </div>

            {/* Onboarding Tour */}
            <OnboardingTour section="vocabReview" />
        </div>
    );
};

export default SRSVocabScreen;
