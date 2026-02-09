import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    BookOpen, Languages, Target, Flame, Trophy, Clock,
    ArrowRight, Sparkles, TrendingUp, Zap, Star, Calendar
} from 'lucide-react';
import { ROUTES } from '../../router';

const HomeScreen = ({
    displayName,
    totalCards,
    allCards = [],
}) => {
    const navigate = useNavigate();

    // Calculate stats
    const stats = useMemo(() => {
        const dueCards = allCards.filter(card =>
            card.nextReview_back && card.nextReview_back <= Date.now()
        ).length;
        const newCards = allCards.filter(card => card.intervalIndex_back === -1).length;
        const masteredCards = allCards.filter(card => card.intervalIndex_back >= 4).length;
        const streak = 7; // Mock streak - would come from user data

        return { dueCards, newCards, masteredCards, streak, totalCards };
    }, [allCards, totalCards]);

    // Quick action cards - using softer colors
    const quickActions = [
        {
            id: 'vocab',
            title: 'Ôn tập từ vựng',
            subtitle: `${stats.dueCards} thẻ cần ôn`,
            icon: BookOpen,
            color: 'from-sky-500 to-blue-600',
            shadowColor: 'shadow-sky-500/20',
            route: ROUTES.VOCABULARY,
            badge: stats.dueCards > 0 ? stats.dueCards : null,
        },
        {
            id: 'kanji',
            title: 'Học Kanji',
            subtitle: 'Chinh phục chữ Hán',
            icon: Languages,
            color: 'from-emerald-500 to-teal-600',
            shadowColor: 'shadow-emerald-500/20',
            route: ROUTES.KANJI_STUDY,
        },
        {
            id: 'test',
            title: 'Luyện thi JLPT',
            subtitle: 'Kiểm tra năng lực',
            icon: Target,
            color: 'from-amber-500 to-orange-500',
            shadowColor: 'shadow-amber-500/20',
            route: ROUTES.TEST,
        },
        {
            id: 'add',
            title: 'Thêm từ mới',
            subtitle: 'Mở rộng vốn từ',
            icon: Sparkles,
            color: 'from-cyan-500 to-teal-500',
            shadowColor: 'shadow-cyan-500/20',
            route: ROUTES.VOCABULARY_ADD,
        },
    ];

    // Get greeting based on time
    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return 'Chào buổi sáng';
        if (hour < 18) return 'Chào buổi chiều';
        return 'Chào buổi tối';
    };

    // Get motivational quote
    const quotes = [
        '継続は力なり - Kiên trì là sức mạnh',
        '千里の道も一歩から - Ngàn dặm bắt đầu từ một bước',
        '七転び八起き - Ngã bảy lần, đứng dậy tám lần',
        '石の上にも三年 - Kiên nhẫn sẽ thành công',
    ];
    const todayQuote = quotes[new Date().getDate() % quotes.length];

    return (
        <div className="space-y-4 max-w-4xl mx-auto">
            {/* Hero Section - Softer gradient */}
            <div className="relative overflow-hidden bg-gradient-to-br from-slate-700 via-slate-600 to-slate-500 rounded-2xl p-6 md:p-8 text-white">
                {/* Decorative elements */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full blur-2xl translate-y-1/2 -translate-x-1/2"></div>

                <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-2">
                        <Sparkles className="w-5 h-5 text-amber-300" />
                        <span className="text-sm font-medium text-white/80">{getGreeting()}</span>
                    </div>

                    <h1 className="text-2xl md:text-3xl font-bold mb-2">
                        {displayName ? `${displayName}!` : 'Bạn ơi!'}
                    </h1>

                    <p className="text-white/70 text-sm md:text-base mb-4 italic">
                        "{todayQuote}"
                    </p>

                    {/* Mini Stats */}
                    <div className="flex flex-wrap gap-4 mt-4">
                        <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2">
                            <Flame className="w-4 h-4 text-orange-400" />
                            <span className="text-sm font-medium">{stats.streak} ngày liên tiếp</span>
                        </div>
                        <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2">
                            <Trophy className="w-4 h-4 text-amber-400" />
                            <span className="text-sm font-medium">{stats.masteredCards} từ đã thuộc</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Today's Summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 text-center">
                    <div className="w-10 h-10 bg-red-50 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-2">
                        <Clock className="w-5 h-5 text-red-500" />
                    </div>
                    <div className="text-2xl font-bold text-gray-800 dark:text-white">{stats.dueCards}</div>
                    <div className="text-xs text-gray-500">Cần ôn hôm nay</div>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 text-center">
                    <div className="w-10 h-10 bg-emerald-50 dark:bg-emerald-900/20 rounded-full flex items-center justify-center mx-auto mb-2">
                        <Zap className="w-5 h-5 text-emerald-500" />
                    </div>
                    <div className="text-2xl font-bold text-gray-800 dark:text-white">{stats.newCards}</div>
                    <div className="text-xs text-gray-500">Từ mới chờ học</div>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 text-center">
                    <div className="w-10 h-10 bg-sky-50 dark:bg-sky-900/20 rounded-full flex items-center justify-center mx-auto mb-2">
                        <Star className="w-5 h-5 text-sky-500" />
                    </div>
                    <div className="text-2xl font-bold text-gray-800 dark:text-white">{stats.masteredCards}</div>
                    <div className="text-xs text-gray-500">Đã thành thạo</div>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 text-center">
                    <div className="w-10 h-10 bg-slate-100 dark:bg-slate-700/50 rounded-full flex items-center justify-center mx-auto mb-2">
                        <TrendingUp className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                    </div>
                    <div className="text-2xl font-bold text-gray-800 dark:text-white">{stats.totalCards}</div>
                    <div className="text-xs text-gray-500">Tổng số thẻ</div>
                </div>
            </div>

            {/* Quick Actions */}
            <div className="space-y-3">
                <h2 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
                    <Zap className="w-5 h-5 text-amber-500" />
                    Bắt đầu nhanh
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {quickActions.map((action) => (
                        <button
                            key={action.id}
                            onClick={() => navigate(action.route)}
                            className={`relative group bg-gradient-to-r ${action.color} rounded-xl p-5 text-white text-left shadow-md ${action.shadowColor} hover:scale-[1.02] transition-all duration-300 overflow-hidden`}
                        >
                            {/* Background decoration */}
                            <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full blur-xl translate-x-8 -translate-y-8 group-hover:translate-x-4 transition-transform"></div>

                            <div className="relative z-10 flex items-start justify-between">
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <action.icon className="w-5 h-5" />
                                        <h3 className="font-bold">{action.title}</h3>
                                    </div>
                                    <p className="text-sm text-white/80">{action.subtitle}</p>
                                </div>

                                <div className="flex items-center gap-2">
                                    {action.badge && (
                                        <span className="bg-white/20 backdrop-blur-sm px-2 py-1 rounded-full text-xs font-bold">
                                            {action.badge}
                                        </span>
                                    )}
                                    <ArrowRight className="w-5 h-5 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                                </div>
                            </div>
                        </button>
                    ))}
                </div>
            </div>

            {/* Learning Path */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700">
                <h2 className="text-lg font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-sky-500" />
                    Lộ trình học tập
                </h2>

                <div className="space-y-3">
                    {/* Vocabulary Progress */}
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-sky-50 dark:bg-sky-900/20 rounded-xl flex items-center justify-center">
                            <BookOpen className="w-6 h-6 text-sky-500" />
                        </div>
                        <div className="flex-1">
                            <div className="flex justify-between mb-1">
                                <span className="text-sm font-medium text-gray-800 dark:text-white">Từ vựng</span>
                                <span className="text-xs text-gray-500">{stats.masteredCards}/{stats.totalCards}</span>
                            </div>
                            <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-gradient-to-r from-sky-500 to-blue-500 rounded-full transition-all duration-500"
                                    style={{ width: `${stats.totalCards > 0 ? (stats.masteredCards / stats.totalCards * 100) : 0}%` }}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Kanji Progress */}
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl flex items-center justify-center">
                            <Languages className="w-6 h-6 text-emerald-500" />
                        </div>
                        <div className="flex-1">
                            <div className="flex justify-between mb-1">
                                <span className="text-sm font-medium text-gray-800 dark:text-white">Kanji N5</span>
                                <span className="text-xs text-gray-500">20/103</span>
                            </div>
                            <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full"
                                    style={{ width: '19%' }}
                                />
                            </div>
                        </div>
                    </div>

                    {/* JLPT Progress */}
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-amber-50 dark:bg-amber-900/20 rounded-xl flex items-center justify-center">
                            <Target className="w-6 h-6 text-amber-500" />
                        </div>
                        <div className="flex-1">
                            <div className="flex justify-between mb-1">
                                <span className="text-sm font-medium text-gray-800 dark:text-white">JLPT N5</span>
                                <span className="text-xs text-gray-500">Đang học</span>
                            </div>
                            <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-gradient-to-r from-amber-500 to-orange-400 rounded-full"
                                    style={{ width: '35%' }}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Tips */}
            <div className="bg-gradient-to-r from-slate-50 to-gray-50 dark:from-slate-800/50 dark:to-gray-800/50 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
                <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-slate-200 dark:bg-slate-700 rounded-full flex items-center justify-center flex-shrink-0">
                        <Sparkles className="w-5 h-5 text-slate-600 dark:text-slate-300" />
                    </div>
                    <div>
                        <h3 className="font-bold text-slate-700 dark:text-slate-200 mb-1">💡 Mẹo học tập</h3>
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                            Học đều đặn mỗi ngày 15-30 phút hiệu quả hơn học dồn một lần.
                            Hãy ôn tập ngay khi có thẻ đến hạn để tối ưu trí nhớ!
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default HomeScreen;
