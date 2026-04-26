import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Calendar, Clock, BookOpen, Users, MessageSquare, Headphones, Layers, Zap, Sparkles
} from 'lucide-react';
import { shuffleArray } from '../../utils/textProcessing';
import { ROUTES } from '../../router';
import { formatCountdown } from '../../utils/srs';
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

    // Cần ôn: thẻ ĐÃ CÓ SRS VÀ chưa hoàn thành (back hoặc example)
    const dueCards = allCards.filter(card => {
        if (card.intervalIndex_back === -1) return false; // Không tính thẻ mới
        const nextReview = card.nextReview_back;
        if (!nextReview || nextReview > Date.now()) return false; // Chưa đến hạn

        const backStreak = typeof card.correctStreak_back === 'number' ? card.correctStreak_back : 0;
        const exampleStreak = typeof card.correctStreak_example === 'number' ? card.correctStreak_example : 0;

        // Cần ôn nếu phần ý nghĩa hoặc ngữ cảnh chưa hoàn thành
        return backStreak < 1 || (card.example && card.example.trim() !== '' && exampleStreak < 1);
    }).length;

    // Mới thêm (chưa học lần nào, intervalIndex = -1)
    const newCards = allCards.filter(card => card.intervalIndex_back === -1).length;

    // Đếm số từ có synonym VÀ chưa hoàn thành phần đồng nghĩa (không phụ thuộc SRS due)
    const synonymCards = allCards.filter(card => {
        if (!card.synonym || card.synonym.trim() === '') return false;
        const synonymStreak = typeof card.correctStreak_synonym === 'number' ? card.correctStreak_synonym : 0;
        return synonymStreak < 1;
    }).length;

    // Thẻ cần "Học": thẻ MỚI VÀ chưa hoàn thành
    const learnCards = allCards.filter(card => {
        if (card.intervalIndex_back !== -1) return false; // Chỉ tính thẻ mới
        const backStreak = typeof card.correctStreak_back === 'number' ? card.correctStreak_back : 0;
        const exampleStreak = typeof card.correctStreak_example === 'number' ? card.correctStreak_example : 0;
        return backStreak < 1 || (card.example && card.example.trim() !== '' && exampleStreak < 1);
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

    // Check flashcard progress
    const getFlashcardProgress = () => {
        try {
            const saved = localStorage.getItem('flashcard_progress');
            if (saved) {
                const data = JSON.parse(saved);
                const noSrsCards = allCards.filter(c => c.intervalIndex_back === -1);
                const savedIds = new Set(data.cardIds || []);
                const currentIds = noSrsCards.map(c => c.id);
                if (currentIds.length > 0 && currentIds.length === savedIds.size && currentIds.every(id => savedIds.has(id))) {
                    return data;
                }
            }
        } catch (e) { /* ignore */ }
        return null;
    };

    // Check study progress
    const getStudyProgress = () => {
        try {
            const saved = localStorage.getItem('study_progress');
            if (saved) {
                const data = JSON.parse(saved);
                if (data.completedCardIds && data.completedCardIds.length > 0) {
                    return data;
                }
            }
        } catch (e) { /* ignore */ }
        return null;
    };

    const flashcardProgress = getFlashcardProgress();
    const studyProgress = getStudyProgress();

    const flashcardIsComplete = flashcardProgress?.isComplete || false;
    const flashcardInProgress = flashcardProgress && !flashcardProgress.isComplete && (flashcardProgress.currentIndex > 0 || flashcardProgress.knownCardIds?.length > 0 || flashcardProgress.unknownCardIds?.length > 0);
    const studyInProgress = studyProgress && studyProgress.completedCardIds?.length > 0;

    const handleStartReview = (mode, category = 'all') => {
        setReviewMode(mode);
        onStartReview(mode, category);
    };

    // Bắt đầu chế độ Dictation (Luyện nghe)
    const handleStartStudy = (forceReset = false) => {
        const validCards = allCards.filter(c => c.audioBase64 || c.example);
        if (validCards.length === 0) return;

        const shuffledCards = shuffleArray([...validCards]);

        setStudySessionData({
            cards: shuffledCards,
            currentIndex: 0,
            mode: 'dictation'
        });
        setView('STUDY');
    };

    // Bắt đầu flashcard (chỉ cho từ mới)
    const handleStartFlashcard = (forceReset = false) => {
        if (forceReset) {
            localStorage.removeItem('flashcard_progress');
        }
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
            {/* Banner Lộ trình & Ôn tập Từ vựng */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 p-6 md:p-8 shadow-2xl">
                <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48cGF0aCBkPSJNMzYgMzRjMC0yLjIgMS44LTQgNC00czQgMS44IDQgNC0xLjggNC00IDQtNC0xLjgtNC00eiIvPjwvZz48L2c+PC9zdmc+')] opacity-30"></div>
                <div className="relative flex flex-col md:flex-row items-center gap-6">
                    <div className="flex-1 text-center md:text-left">
                        <div className="flex items-center justify-center md:justify-start gap-2 mb-2">
                            <Sparkles className="w-5 h-5 text-blue-300" />
                            <span className="text-white/80 text-sm font-medium">Lộ trình học Từ vựng</span>
                        </div>
                        <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
                            Ôn tập Từ vựng
                        </h1>
                        <p className="text-white/70 text-sm">
                            Học đều đặn mỗi ngày • Tổng {allCards.length} thẻ
                        </p>
                    </div>
                    {/* Progress Ring */}
                    <div className="relative w-32 h-32 flex-shrink-0">
                        <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
                            <circle cx="60" cy="60" r="54" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="8" />
                            <circle cx="60" cy="60" r="54" fill="none" stroke="white" strokeWidth="8" strokeLinecap="round"
                                strokeDasharray={2 * Math.PI * 54} strokeDashoffset={2 * Math.PI * 54 - (Math.min(1, Math.max(0, allCards.length - newCards) / (allCards.length || 1))) * 2 * Math.PI * 54}
                                className="transition-all duration-1000 ease-out" />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className="text-2xl font-bold text-white">{Math.round((Math.max(0, allCards.length - newCards) / (allCards.length || 1)) * 100)}%</span>
                            <span className="text-[10px] text-white/60 uppercase tracking-wide font-medium">Đã học</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Ôn tập + Học */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Ôn tập / Lượt tiếp theo — chuyển đổi tự động */}
                {dueCards > 0 ? (
                    /* CÓ từ cần ôn → hiện nút ôn tập */
                    <div className="relative overflow-hidden bg-gradient-to-br from-orange-500 to-rose-500 rounded-2xl p-5 text-white shadow-xl">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2"></div>
                        <div className="relative">
                            <div className="flex items-center gap-2 mb-2">
                                <Calendar className="w-4 h-4 text-orange-100" />
                                <span className="font-bold text-sm">Ôn tập</span>
                            </div>
                            <div className="text-5xl font-bold mb-1">{dueCards}</div>
                            <p className="text-orange-100 text-sm mb-3">thẻ cần ôn tập</p>
                            <button
                                onClick={() => handleStartReview('mixed', 'old')}
                                className="relative z-10 w-full py-3 bg-white/20 hover:bg-white/30 rounded-xl text-sm font-bold transition-all border border-white/20 backdrop-blur-sm shadow-lg hover:shadow-xl hover:scale-[1.02]"
                            >
                                Ôn tập ngay
                            </button>
                        </div>
                    </div>
                ) : (
                    /* KHÔNG còn từ → hiện bộ đếm lượt tiếp theo */
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
                                    <p className="text-blue-100 text-sm">{isCountdown ? 'Đếm ngược...' : 'Nghỉ ngơi nhé...'}</p>
                                    {nextRoundCount > 0 && (
                                        <div className="mt-3 bg-white/15 rounded-xl px-3 py-1.5 inline-flex items-center gap-1.5">
                                            <span className="text-xs font-bold">✨ {nextRoundCount} thẻ sẽ đến hạn</span>
                                        </div>
                                    )}
                                </>
                            ) : (
                                <>
                                    <div className="text-4xl font-bold mb-1">✅</div>
                                    <p className="text-blue-100 text-sm">Đã ôn hết! Nghỉ ngơi thôi 😴</p>
                                </>
                            )}
                        </div>
                    </div>
                )}
                {/* Học (thẻ chưa có SRS) */}
                <div className="relative overflow-hidden bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-5 text-white shadow-xl">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2"></div>
                    <div className="relative">
                        <div className="flex items-center gap-2 mb-2">
                            <Zap className="w-4 h-4 text-emerald-100" />
                            <span className="font-bold text-sm">Học</span>
                        </div>
                        <div className="text-5xl font-bold mb-1">{learnCards}</div>
                        <p className="text-emerald-100 text-sm mb-3">từ vựng chưa học</p>
                        <button
                            onClick={() => handleStartReview('mixed', 'new')}
                            disabled={learnCards === 0}
                            className="w-full py-2.5 bg-white/20 hover:bg-white/30 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl text-sm font-bold transition-all border border-white/20 backdrop-blur-sm"
                        >
                            {learnCards > 0 ? 'Bắt đầu học' : 'Đã học hết 🎉'}
                        </button>
                    </div>
                </div>
            </div>

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
                        <div className="flex gap-2 mt-auto">
                            {flashcardIsComplete && (
                                <button
                                    onClick={() => handleStartFlashcard(true)}
                                    className="flex-1 py-2.5 rounded-xl font-bold text-sm transition-all bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:shadow-lg hover:scale-[1.02]"
                                >
                                    🔄 Reset & Học lại
                                </button>
                            )}
                            {!flashcardIsComplete && (
                                <button
                                    onClick={() => handleStartFlashcard(false)}
                                    disabled={newCards === 0}
                                    className={`flex-1 py-2.5 rounded-xl font-bold text-sm transition-all ${newCards > 0
                                        ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white hover:shadow-lg hover:shadow-cyan-500/20 hover:scale-[1.02]'
                                        : 'bg-gray-100 dark:bg-slate-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                                        }`}
                                >
                                    {flashcardInProgress ? '▶ Tiếp tục lật' : 'Lật Flashcard'}
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Dictation */}
                    <div className="bg-white dark:bg-slate-800/80 backdrop-blur-sm rounded-2xl p-5 border border-indigo-100 dark:border-indigo-900/50 shadow-sm hover:shadow-md transition-all duration-300 hover:scale-[1.01] flex flex-col relative overflow-hidden">
                        {/* Ribbon Đang phát triển */}
                        <div className="absolute top-3 right-[-35px] rotate-45 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[10px] font-bold py-1 px-10 shadow-sm border border-amber-400/50">
                            Đang phát triển
                        </div>

                        <div className="flex items-center gap-2 mb-2 pr-10">
                            <div className="w-8 h-8 rounded-xl bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center">
                                <Headphones className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                            </div>
                            <span className="font-bold text-sm text-gray-800 dark:text-white">DICTATION</span>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-3 flex-1 leading-relaxed pr-2">
                            Nghe từ vựng và câu ví dụ, sau đó gõ lại chính xác tiếng Nhật để luyện kỹ năng nghe. (Tính năng đang trong giai đoạn thử nghiệm)
                        </p>
                        <div className="flex gap-2 mt-auto">
                            <button
                                onClick={() => handleStartStudy()}
                                disabled={true}
                                className="w-full py-2.5 rounded-xl font-bold text-sm bg-gray-200 dark:bg-slate-700 text-gray-400 dark:text-gray-500 cursor-not-allowed"
                            >
                                Đang phát triển...
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Học nâng cao */}
            <div className="space-y-3">
                <h2 className="text-sm font-bold text-gray-700 dark:text-gray-200 flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-purple-100 dark:bg-purple-900/50 flex items-center justify-center text-[10px]">🎓</span>
                    Học nâng cao
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {/* Từ đồng nghĩa */}
                    <div className="bg-white dark:bg-slate-800/80 backdrop-blur-sm rounded-2xl p-5 border border-gray-100 dark:border-slate-700/50 shadow-sm hover:shadow-md transition-all duration-300 hover:scale-[1.01] flex flex-col">
                        <div className="flex items-center gap-2 mb-2">
                            <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center">
                                <Users className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                            </div>
                            <span className="font-bold text-sm text-gray-800 dark:text-white">Từ đồng nghĩa</span>
                            <span className="ml-auto text-xs px-2.5 py-0.5 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-full font-bold">
                                {synonymCards} từ
                            </span>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1 flex-1 leading-relaxed">
                            Mở rộng vốn từ đồng nghĩa. Không ảnh hưởng chu kì SRS chính.
                        </p>
                        <p className="text-[10px] text-purple-500 dark:text-purple-400 mb-3 italic">
                            Ưu tiên: từ dài hạn → từ mới
                        </p>
                        <button
                            onClick={() => handleStartReview('synonym')}
                            disabled={synonymCards === 0}
                            className={`w-full py-2.5 rounded-xl font-bold text-sm transition-all mt-auto ${synonymCards > 0
                                ? 'bg-gradient-to-r from-emerald-500 to-green-500 text-white hover:shadow-lg hover:scale-[1.02]'
                                : 'bg-gray-100 dark:bg-slate-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                                }`}
                        >
                            Luyện đồng nghĩa
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
