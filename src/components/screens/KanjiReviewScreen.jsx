import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Clock, Target, Flame } from 'lucide-react';
import { db } from '../../config/firebase';
import { collection, getDocs } from 'firebase/firestore';
import { ROUTES } from '../../router';

const KanjiReviewScreen = () => {
    const navigate = useNavigate();
    const [kanjiList, setKanjiList] = useState([]);
    const [loading, setLoading] = useState(true);

    // Mock data for demonstration
    const [reviewStats] = useState({
        dueToday: 10,
        newCards: 0,
        learning: 1,
        shortTerm: 10,
        longTerm: 0,
        totalReviewed: 11,
    });

    const [nextReviewHours] = useState(21);

    // Load kanji from Firebase
    useEffect(() => {
        const loadKanji = async () => {
            try {
                const kanjiSnap = await getDocs(collection(db, 'kanji'));
                const kanjiData = kanjiSnap.docs.map(d => ({ id: d.id, ...d.data() }));
                setKanjiList(kanjiData);
            } catch (e) {
                console.error('Error loading kanji:', e);
            } finally {
                setLoading(false);
            }
        };
        loadKanji();
    }, []);

    // Card distribution stats
    const cardDistribution = useMemo(() => {
        return [
            { label: 'Thẻ mới', count: 0, percent: 0, color: 'bg-gray-500' },
            { label: 'Đang học', count: 1, percent: 9.1, color: 'bg-yellow-500' },
            { label: 'Mới thuộc (ngắn hạn)', count: 10, percent: 90.9, color: 'bg-orange-500' },
            { label: 'Đã thuộc (dài hạn)', count: 0, percent: 0, color: 'bg-green-500' },
        ];
    }, []);

    // Generate activity heatmap data (365 days)
    const activityData = useMemo(() => {
        const days = [];
        const today = new Date();
        for (let i = 364; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            const level = i < 3 ? Math.floor(Math.random() * 4) : 0;
            days.push({ date, level });
        }
        return days;
    }, []);

    const handleStartReview = () => {
        navigate(ROUTES.KANJI_LIST);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[300px]">
                <div className="animate-spin w-8 h-8 border-4 border-sky-500 border-t-transparent rounded-full"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-5xl mx-auto">
            {/* Header */}
            <div className="space-y-1">
                <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Thống kê học tập Kanji</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">Theo dõi tiến độ ôn tập và phân bố thẻ</p>
            </div>

            {/* Overview Stats */}
            <div className="bg-gray-800 rounded-xl p-5 border border-gray-700">
                <h3 className="text-sm font-medium text-gray-400 mb-4 flex items-center gap-2">
                    <Target className="w-4 h-4" />
                    Tổng quan (thẻ)
                </h3>
                <div className="grid grid-cols-3 md:grid-cols-6 gap-4 text-center">
                    <div className="p-3 bg-gray-700/50 rounded-lg">
                        <div className="text-2xl font-bold text-cyan-400">{reviewStats.dueToday}</div>
                        <div className="text-xs text-gray-500 mt-1">Cần ôn</div>
                    </div>
                    <div className="p-3 bg-gray-700/50 rounded-lg">
                        <div className="text-2xl font-bold text-emerald-400">{reviewStats.newCards}</div>
                        <div className="text-xs text-gray-500 mt-1">Mới thêm</div>
                    </div>
                    <div className="p-3 bg-gray-700/50 rounded-lg">
                        <div className="text-2xl font-bold text-gray-300">{reviewStats.learning}</div>
                        <div className="text-xs text-gray-500 mt-1">Đang học</div>
                    </div>
                    <div className="p-3 bg-gray-700/50 rounded-lg">
                        <div className="text-2xl font-bold text-gray-300">{reviewStats.shortTerm}</div>
                        <div className="text-xs text-gray-500 mt-1">Ngắn hạn</div>
                    </div>
                    <div className="p-3 bg-gray-700/50 rounded-lg">
                        <div className="text-2xl font-bold text-emerald-400">{reviewStats.longTerm}</div>
                        <div className="text-xs text-gray-500 mt-1">Dài hạn</div>
                    </div>
                    <div className="p-3 bg-gray-700/50 rounded-lg">
                        <div className="text-2xl font-bold text-gray-300">{reviewStats.totalReviewed}</div>
                        <div className="text-xs text-gray-500 mt-1">Tổng đã học</div>
                    </div>
                </div>
            </div>

            {/* Today & Next Review Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gradient-to-br from-orange-400 to-orange-500 rounded-xl p-6 text-white shadow-lg">
                    <div className="flex items-center gap-2 mb-2">
                        <Calendar className="w-5 h-5" />
                        <span className="font-bold">Hôm nay</span>
                    </div>
                    <div className="text-5xl font-bold mb-2">{reviewStats.dueToday}</div>
                    <p className="text-orange-100 mb-4">thẻ cần ôn tập</p>
                    <button
                        onClick={handleStartReview}
                        className="w-full py-3 bg-white/20 hover:bg-white/30 rounded-xl text-base font-bold transition-colors border border-white/30"
                    >
                        Ôn tập ngay
                    </button>
                </div>

                <div className="bg-gradient-to-br from-blue-400 to-blue-500 rounded-xl p-6 text-white shadow-lg">
                    <div className="flex items-center gap-2 mb-2">
                        <Clock className="w-5 h-5" />
                        <span className="font-bold">Lượt tiếp theo</span>
                    </div>
                    <p className="text-blue-100 text-sm mb-1">Sau khi hoàn thành {reviewStats.dueToday} thẻ, bạn có</p>
                    <div className="text-5xl font-bold mb-2">{nextReviewHours} giờ</div>
                    <p className="text-blue-100">nghỉ ngơi cho đến lượt ôn tập tiếp theo</p>
                </div>
            </div>

            {/* Activity Heatmap */}
            <div className="bg-gray-800 rounded-xl p-5 border border-gray-700">
                <h3 className="text-sm font-medium text-gray-300 mb-4 flex items-center gap-2">
                    <Flame className="w-4 h-4 text-orange-400" />
                    {reviewStats.totalReviewed} lượt ôn tập trong 365 ngày qua
                </h3>

                <div className="overflow-x-auto">
                    <div className="flex gap-1 min-w-max">
                        {Array.from({ length: 52 }).map((_, weekIndex) => (
                            <div key={weekIndex} className="flex flex-col gap-1">
                                {Array.from({ length: 7 }).map((_, dayIndex) => {
                                    const dataIndex = weekIndex * 7 + dayIndex;
                                    const activity = activityData[dataIndex];
                                    const level = activity?.level || 0;
                                    const colors = ['bg-gray-700', 'bg-emerald-900', 'bg-emerald-700', 'bg-emerald-500', 'bg-emerald-400'];
                                    return (
                                        <div
                                            key={dayIndex}
                                            className={`w-3 h-3 rounded-sm ${colors[level]}`}
                                            title={activity?.date?.toLocaleDateString()}
                                        />
                                    );
                                })}
                            </div>
                        ))}
                    </div>
                </div>

                <div className="flex items-center justify-end gap-2 mt-4 text-xs text-gray-500">
                    <span>Ít</span>
                    <div className="flex gap-1">
                        {['bg-gray-700', 'bg-emerald-900', 'bg-emerald-700', 'bg-emerald-500', 'bg-emerald-400'].map((c, i) => (
                            <div key={i} className={`w-3 h-3 rounded-sm ${c}`}></div>
                        ))}
                    </div>
                    <span>Nhiều</span>
                </div>
            </div>

            {/* Card Distribution */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-5">Phân bố thẻ</h3>
                <div className="space-y-5">
                    {cardDistribution.map((item, index) => (
                        <div key={index}>
                            <div className="flex justify-between text-sm mb-2">
                                <span className="text-gray-600 dark:text-gray-400">
                                    {item.label} ({item.count})
                                </span>
                                <span className="text-gray-500 font-medium">{item.percent.toFixed(1)}%</span>
                            </div>
                            <div className="h-2.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                <div
                                    className={`h-full ${item.color} rounded-full transition-all duration-500`}
                                    style={{ width: `${item.percent}%` }}
                                />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default KanjiReviewScreen;
