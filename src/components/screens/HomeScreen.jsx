import React from 'react';
import {
    Calendar, Clock, BookOpen, Users, MessageSquare
} from 'lucide-react';

const HomeScreen = ({
    displayName,
    dueCounts,
    totalCards,
    allCards,
    setReviewMode,
    onStartReview,
}) => {
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

    return (
        <div className="space-y-6">
            {/* Header - Thống kê học tập */}
            <div className="space-y-2">
                <h1 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-gray-100">
                    Thống kê học tập
                </h1>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                    Theo dõi tiến độ và kế hoạch ôn tập của bạn,
                    theo các báo cáo 21 ngày ôn tập kiến thức sẽ được nạp vào trí nhớ dài hạn
                </p>
            </div>

            {/* Tổng quan (thẻ) */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 md:p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
                <h3 className="text-sm font-bold text-gray-600 dark:text-gray-300 mb-4">
                    Tổng quan (thẻ)
                </h3>
                <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
                    <div className="text-center">
                        <div className="text-2xl md:text-3xl font-bold text-red-500">{dueCards}</div>
                        <div className="text-[10px] md:text-xs text-gray-500 dark:text-gray-400">Cần ôn</div>
                    </div>
                    <div className="text-center">
                        <div className="text-2xl md:text-3xl font-bold text-emerald-500">{newCards}</div>
                        <div className="text-[10px] md:text-xs text-gray-500 dark:text-gray-400">Mới thêm</div>
                    </div>
                    <div className="text-center">
                        <div className="text-2xl md:text-3xl font-bold text-amber-500">{learningCards}</div>
                        <div className="text-[10px] md:text-xs text-gray-500 dark:text-gray-400">Đang học</div>
                    </div>
                    <div className="text-center">
                        <div className="text-2xl md:text-3xl font-bold text-blue-500">{shortTermCards}</div>
                        <div className="text-[10px] md:text-xs text-gray-500 dark:text-gray-400">Ngắn hạn</div>
                    </div>
                    <div className="text-center">
                        <div className="text-2xl md:text-3xl font-bold text-green-600">{masteredCards}</div>
                        <div className="text-[10px] md:text-xs text-gray-500 dark:text-gray-400">Dài hạn</div>
                    </div>
                    <div className="text-center">
                        <div className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-white">{learnedCards}</div>
                        <div className="text-[10px] md:text-xs text-gray-500 dark:text-gray-400">Đã học</div>
                    </div>
                </div>
            </div>

            {/* Cards: Hôm nay + Lượt tiếp theo */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Hôm nay - màu cam */}
                <div className="bg-gradient-to-br from-orange-400 to-orange-500 rounded-2xl p-6 text-white shadow-lg">
                    <div className="flex items-center gap-2 mb-4">
                        <Calendar className="w-5 h-5" />
                        <span className="font-bold">Hôm nay</span>
                    </div>
                    <div className="text-5xl md:text-6xl font-bold mb-2">{dueCards}</div>
                    <p className="text-orange-100 mb-6">thẻ cần ôn tập</p>
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
                <div className="bg-gradient-to-br from-blue-400 to-blue-500 rounded-2xl p-6 text-white shadow-lg">
                    <div className="flex items-center gap-2 mb-4">
                        <Clock className="w-5 h-5" />
                        <span className="font-bold">Lượt tiếp theo</span>
                    </div>
                    {nextReviewTime ? (
                        <>
                            <p className="text-blue-100 mb-1">Sau khi hoàn thành {dueCards} thẻ, bạn có</p>
                            <div className="text-5xl md:text-6xl font-bold mb-2 italic">{nextReviewTime}</div>
                            <p className="text-blue-100">nghỉ ngơi cho đến lượt ôn tập tiếp theo</p>
                        </>
                    ) : (
                        <>
                            <div className="text-3xl md:text-4xl font-bold mb-2">Không có</div>
                            <p className="text-blue-100">thẻ nào đang chờ ôn tập</p>
                        </>
                    )}
                </div>
            </div>

            {/* Chọn chế độ ôn tập */}
            <div className="space-y-4">
                <h2 className="text-lg md:text-xl font-bold text-gray-800 dark:text-gray-100">
                    Chọn chế độ ôn tập
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Ý nghĩa */}
                    <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-200 dark:border-gray-700 shadow-sm">
                        <div className="flex items-center gap-2 mb-3">
                            <BookOpen className="w-5 h-5 text-indigo-500" />
                            <span className="font-bold text-gray-800 dark:text-white">Ý nghĩa</span>
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                            Xem từ vựng và nhớ lại ý nghĩa. Chế độ cơ bản nhất để học từ mới.
                        </p>
                        <button
                            onClick={() => handleStartReview('back')}
                            disabled={dueCards === 0}
                            className={`w-full py-2.5 rounded-xl font-bold transition-all ${dueCards > 0
                                ? 'bg-indigo-500 hover:bg-indigo-600 text-white'
                                : 'bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
                                }`}
                        >
                            Bắt đầu Ý nghĩa
                        </button>
                    </div>

                    {/* Đồng nghĩa */}
                    <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-200 dark:border-gray-700 shadow-sm">
                        <div className="flex items-center gap-2 mb-3">
                            <Users className="w-5 h-5 text-emerald-500" />
                            <span className="font-bold text-gray-800 dark:text-white">Đồng nghĩa</span>
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                            Ôn tập từ đồng nghĩa để mở rộng vốn từ và diễn đạt đa dạng hơn.
                        </p>
                        <button
                            onClick={() => handleStartReview('synonym')}
                            disabled={dueCards === 0}
                            className={`w-full py-2.5 rounded-xl font-bold transition-all ${dueCards > 0
                                ? 'bg-emerald-500 hover:bg-emerald-600 text-white'
                                : 'bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
                                }`}
                        >
                            Bắt đầu Đồng nghĩa
                        </button>
                    </div>

                    {/* Ngữ cảnh */}
                    <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-200 dark:border-gray-700 shadow-sm">
                        <div className="flex items-center gap-2 mb-3">
                            <MessageSquare className="w-5 h-5 text-amber-500" />
                            <span className="font-bold text-gray-800 dark:text-white">Ngữ cảnh</span>
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                            Học từ qua ví dụ thực tế. Hiểu cách sử dụng từ trong câu.
                        </p>
                        <button
                            onClick={() => handleStartReview('example')}
                            disabled={dueCards === 0}
                            className={`w-full py-2.5 rounded-xl font-bold transition-all ${dueCards > 0
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

export default HomeScreen;
