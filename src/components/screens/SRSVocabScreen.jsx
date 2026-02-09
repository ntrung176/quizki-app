import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Calendar, Clock, BookOpen, Users, MessageSquare, GraduationCap, Layers, Plus
} from 'lucide-react';
import { shuffleArray } from '../../utils/textProcessing';
import { ROUTES } from '../../router';

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
    // Tính toán các số liệu thống kê
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Cần ôn (thẻ đến hạn)
    const dueCards = allCards.filter(card => {
        const nextReview = card.nextReview_back;
        return nextReview && nextReview <= Date.now();
    }).length;

    // Mới thêm (chưa học lần nào, intervalIndex = -1)
    const newCards = allCards.filter(card => card.intervalIndex_back === -1).length;

    // Đang học (intervalIndex = 0, mới học lần đầu)
    const learningCards = allCards.filter(card => card.intervalIndex_back === 0).length;

    // Mới thuộc (ngắn hạn, intervalIndex từ 1-3)
    const shortTermCards = allCards.filter(card =>
        card.intervalIndex_back >= 1 && card.intervalIndex_back <= 3
    ).length;

    // Đã thuộc (dài hạn, intervalIndex >= 4)
    const masteredCards = allCards.filter(card => card.intervalIndex_back >= 4).length;

    // Tổng đã học qua (không còn là thẻ mới)
    const learnedCards = allCards.filter(card => card.intervalIndex_back >= 0).length;

    // Đếm số từ có synonym (cho chế độ Đồng nghĩa)
    const synonymCards = allCards.filter(card =>
        card.synonym && card.synonym.trim() !== '' &&
        card.nextReview_back && card.nextReview_back <= Date.now()
    ).length;

    // Đếm số từ có example (cho chế độ Ngữ cảnh)
    const exampleCards = allCards.filter(card =>
        card.example && card.example.trim() !== '' &&
        card.nextReview_back && card.nextReview_back <= Date.now()
    ).length;

    // Tính thời gian đến lượt ôn tập tiếp theo
    const getNextReviewTime = () => {
        const futureCards = allCards
            .filter(card => card.nextReview_back && card.nextReview_back > Date.now())
            .sort((a, b) => a.nextReview_back - b.nextReview_back);

        if (futureCards.length === 0) return null;

        const nextTime = futureCards[0].nextReview_back;
        const diff = nextTime - Date.now();

        const hours = Math.floor(diff / (1000 * 60 * 60));
        const days = Math.floor(hours / 24);

        if (days >= 1) {
            return `${days} ngày`;
        } else if (hours >= 1) {
            return `${hours} giờ`;
        } else {
            const minutes = Math.floor(diff / (1000 * 60));
            return `${minutes} phút`;
        }
    };

    const nextReviewTime = getNextReviewTime();

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

                {/* Lượt tiếp theo - màu xanh */}
                <div className="bg-gradient-to-br from-blue-400 to-blue-500 rounded-xl p-4 text-white shadow-lg">
                    <div className="flex items-center gap-2 mb-2">
                        <Clock className="w-4 h-4" />
                        <span className="font-bold text-sm">Lượt tiếp theo</span>
                    </div>
                    {nextReviewTime ? (
                        <>
                            <p className="text-blue-100 text-xs mb-1">Sau khi hoàn thành {dueCards} thẻ, bạn có</p>
                            <div className="text-4xl md:text-5xl font-bold mb-1 italic">{nextReviewTime}</div>
                            <p className="text-blue-100 text-xs">nghỉ ngơi cho đến lượt ôn tập tiếp theo</p>
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
        </div>
    );
};

export default SRSVocabScreen;
