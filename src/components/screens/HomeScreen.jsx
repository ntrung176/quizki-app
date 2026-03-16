import React, { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, getDocs, onSnapshot, query } from 'firebase/firestore';
import { db, appId } from '../../config/firebase';
import {
    BookOpen, Languages, Target, Flame, Trophy, Clock,
    ArrowRight, Sparkles, Zap
} from 'lucide-react';
import { ROUTES } from '../../router';
import OnboardingTour from '../ui/OnboardingTour';

const HomeScreen = ({
    displayName,
    totalCards,
    allCards = [],
    userId,
}) => {
    const navigate = useNavigate();
    const [kanjiSrsStats, setKanjiSrsStats] = useState({ total: 0, learning: 0, mastered: 0, dueCount: 0 });
    const [kanjiActivityDates, setKanjiActivityDates] = useState([]);

    // Fetch kanji SRS stats + activity dates
    useEffect(() => {
        if (!userId || !db) return;
        const q = query(collection(db, `artifacts/${appId}/users/${userId}/kanjiSRS`));
        const unsub = onSnapshot(q, (snap) => {
            let total = 0, learning = 0, mastered = 0, dueCount = 0;
            const now = Date.now();
            const actDates = [];
            const toDateStr = (ts) => {
                if (!ts) return null;
                const d = new Date(ts);
                if (isNaN(d.getTime())) return null;
                return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
            };
            snap.docs.forEach(d => {
                total++;
                const data = d.data();
                if (data.reps >= 5) mastered++;
                else learning++;
                if (data.nextReview && data.nextReview <= now) dueCount++;
                // Collect kanji review dates for streak calculation
                const dateStr = toDateStr(data.lastReview);
                if (dateStr) actDates.push(dateStr);
            });
            setKanjiSrsStats({ total, learning, mastered, dueCount });
            setKanjiActivityDates(actDates);
        }, () => { });
        return () => unsub();
    }, [userId]);

    // Calculate stats
    const stats = useMemo(() => {
        const dueCards = allCards.filter(card =>
            card.nextReview_back && card.nextReview_back <= Date.now()
        ).length;
        const newCards = allCards.filter(card => card.intervalIndex_back === -1).length;
        const masteredCards = allCards.filter(card => card.intervalIndex_back >= 4).length;

        // Tính streak thực tế dựa trên ngày hoạt động (tạo từ, ôn tập từ vựng)
        const activityDates = new Set();
        const toDateStr = (d) => {
            if (!d) return null;
            const date = d instanceof Date ? d : new Date(d);
            if (isNaN(date.getTime())) return null;
            return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
        };

        allCards.forEach(card => {
            // Ngày tạo từ vựng
            const created = toDateStr(card.createdAt);
            if (created) activityDates.add(created);

            // Ngày ôn tập từ vựng
            const reviewed = toDateStr(card.lastReviewed);
            if (reviewed) activityDates.add(reviewed);
        });

        // Thêm ngày ôn tập Kanji từ kanjiSrsActivityDates (được tính bên dưới)
        if (kanjiActivityDates.length > 0) {
            kanjiActivityDates.forEach(d => activityDates.add(d));
        }

        // Đếm streak: đếm ngược từ hôm nay, mỗi ngày liên tiếp có hoạt động → +1
        let streak = 0;
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        for (let i = 0; i < 365; i++) {
            const checkDate = new Date(today);
            checkDate.setDate(checkDate.getDate() - i);
            const dateStr = toDateStr(checkDate);
            if (activityDates.has(dateStr)) {
                streak++;
            } else {
                // Nếu hôm nay chưa hoạt động, cho phép bỏ qua hôm nay (streak vẫn tính từ hôm qua)
                if (i === 0) continue;
                break;
            }
        }

        return { dueCards, newCards, masteredCards, streak, totalCards };
    }, [allCards, totalCards, kanjiActivityDates]);

    // Quick action cards - using softer colors
    const quickActions = [
        {
            id: 'add',
            title: 'Thêm từ vựng',
            subtitle: 'Mở rộng vốn từ',
            icon: Sparkles,
            color: 'from-cyan-500 to-teal-500',
            shadowColor: 'shadow-cyan-500/20',
            route: ROUTES.VOCAB_ADD,
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
            id: 'vocab-review',
            title: 'Ôn Tập Từ Vựng',
            subtitle: `${stats.dueCards} thẻ cần ôn`,
            icon: BookOpen,
            color: 'from-sky-500 to-blue-600',
            shadowColor: 'shadow-sky-500/20',
            route: ROUTES.VOCAB_REVIEW,
        },
        {
            id: 'kanji-review',
            title: 'Ôn Tập Kanji',
            subtitle: `${kanjiSrsStats.dueCount} kanji cần ôn`,
            icon: Target,
            color: 'from-amber-500 to-orange-500',
            shadowColor: 'shadow-amber-500/20',
            route: ROUTES.KANJI_REVIEW,
        },
    ];

    // Get greeting based on time
    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return 'Chào buổi sáng';
        if (hour < 18) return 'Chào buổi chiều';
        return 'Chào buổi tối';
    };

    // Get motivational quote - 30 quotes rotating daily
    const quotes = [
        '継続は力なり - Kiên trì là sức mạnh',
        '千里の道も一歩から - Ngàn dặm bắt đầu từ một bước',
        '七転び八起き - Ngã bảy lần, đứng dậy tám lần',
        '石の上にも三年 - Kiên nhẫn sẽ thành công',
        '努力は必ず報われる - Nỗ lực sẽ được đền đáp',
        '一日一歩 - Mỗi ngày một bước tiến',
        '夢を追いかけろ - Hãy theo đuổi ước mơ',
        '失敗は成功のもと - Thất bại là mẹ thành công',
        '今日できることを明日に延ばすな - Việc hôm nay chớ để ngày mai',
        '自分を信じろ - Hãy tin vào chính mình',
        '諦めなければ夢は叶う - Đừng bỏ cuộc, ước mơ sẽ thành hiện thực',
        '小さな積み重ねが大きな力になる - Tích tiểu thành đại',
        '今この瞬間を大切に - Trân trọng từng khoảnh khắc',
        '挑戦することが成長への道 - Thử thách là con đường trưởng thành',
        '学ぶことに終わりはない - Học tập không có điểm dừng',
        '一歩一歩前へ進め - Từng bước tiến về phía trước',
        '困難は人を強くする - Khó khăn khiến con người mạnh mẽ hơn',
        '笑顔で頑張ろう - Hãy cố gắng với nụ cười',
        '可能性は無限大 - Khả năng là vô hạn',
        '今日の努力、明日の成果 - Nỗ lực hôm nay, thành quả ngày mai',
        '勉強は未来への投資 - Học tập là đầu tư cho tương lai',
        '毎日少しずつ上手になる - Mỗi ngày giỏi hơn một chút',
        '言葉は世界への扉 - Ngôn ngữ là cánh cửa đến thế giới',
        '夢は逃げない - Ước mơ không bỏ chạy',
        '自分のペースで進もう - Tiến bước theo nhịp điệu của riêng mình',
        '今日も頑張れ - Hôm nay cũng cố lên nhé',
        '成功は準備と機会の出会いだ - Thành công là sự giao thoa của chuẩn bị và cơ hội',
        '知識は力なり - Kiến thức là sức mạnh',
        '練習は裏切らない - Luyện tập không bao giờ phản bội',
        '一期一会 - Mỗi cuộc gặp gỡ là duy nhất',
    ];
    const todayQuote = quotes[new Date().getDate() % quotes.length];

    // Learning tips - 15 tips rotating daily
    const learningTips = [
        'Học đều đặn mỗi ngày 15-30 phút hiệu quả hơn học dồn một lần. Hãy ôn tập ngay khi có thẻ đến hạn!',
        'Sử dụng phương pháp lặp lại ngắt quãng (SRS) giúp ghi nhớ lâu dài hơn 90% so với học thuộc lòng.',
        'Nghe nhạc hoặc podcast tiếng Nhật khi rảnh giúp làm quen với ngữ điệu và từ vựng mới.',
        'Viết tay từ vựng và Kanji giúp não bộ ghi nhớ sâu hơn so với chỉ nhìn và đọc.',
        'Học từ vựng theo chủ đề giúp liên kết các từ với nhau, dễ nhớ và sử dụng hơn.',
        'Đặt mục tiêu nhỏ mỗi ngày: 10 từ mới hoặc 5 Kanji. Tích lũy dần sẽ tạo nên kết quả lớn!',
        'Xem anime hoặc drama có phụ đề tiếng Nhật để học cách người bản xứ sử dụng ngôn ngữ.',
        'Nói to khi học giúp cải thiện phát âm và ghi nhớ tốt hơn. Đừng ngại luyện tập một mình!',
        'Ôn tập vào buổi sáng sớm hoặc trước khi ngủ là thời điểm não bộ ghi nhớ tốt nhất.',
        'Tạo câu ví dụ với từ mới giúp hiểu cách dùng từ trong ngữ cảnh thực tế.',
        'Sử dụng flashcard hai mặt: một mặt tiếng Nhật, một mặt tiếng Việt để luyện cả hai chiều.',
        'Học cùng bạn bè hoặc nhóm học tập giúp duy trì động lực và có người sửa lỗi.',
        'Đừng sợ mắc lỗi! Mỗi lỗi sai là một cơ hội học hỏi và cải thiện.',
        'Nghỉ ngơi đủ giấc giúp não bộ củng cố kiến thức đã học trong ngày.',
        'Thưởng cho bản thân khi đạt mục tiêu nhỏ để duy trì động lực học tập dài hạn.',
    ];
    const todayTip = learningTips[new Date().getDate() % learningTips.length];



    return (
        <div className="flex flex-col h-full max-h-[calc(100vh-80px)] max-w-7xl mx-auto gap-3 md:gap-4 pb-4 overflow-y-auto overflow-x-hidden">
            {/* Hero Section - Beautiful teal gradient */}
            <div className="relative flex-shrink-0 overflow-hidden bg-gradient-to-br from-teal-600 via-cyan-600 to-sky-600 rounded-2xl p-4 md:p-6 text-white pb-6 md:pb-8">
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
                        <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2">
                            <Languages className="w-4 h-4 text-emerald-400" />
                            <span className="text-sm font-medium">{kanjiSrsStats.mastered} kanji đã thuộc</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Today's Summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3 flex-shrink-0">
                <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 text-center">
                    <div className="w-10 h-10 bg-red-50 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-2">
                        <Clock className="w-5 h-5 text-red-500" />
                    </div>
                    <div className="text-2xl font-bold text-gray-800 dark:text-white">{stats.dueCards}</div>
                    <div className="text-xs text-gray-500">Từ vựng cần ôn</div>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 text-center">
                    <div className="w-10 h-10 bg-amber-50 dark:bg-amber-900/20 rounded-full flex items-center justify-center mx-auto mb-2">
                        <Target className="w-5 h-5 text-amber-500" />
                    </div>
                    <div className="text-2xl font-bold text-gray-800 dark:text-white">{kanjiSrsStats.dueCount}</div>
                    <div className="text-xs text-gray-500">Kanji cần ôn</div>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 text-center">
                    <div className="w-10 h-10 bg-sky-50 dark:bg-sky-900/20 rounded-full flex items-center justify-center mx-auto mb-2">
                        <BookOpen className="w-5 h-5 text-sky-500" />
                    </div>
                    <div className="text-2xl font-bold text-gray-800 dark:text-white">{stats.totalCards}</div>
                    <div className="text-xs text-gray-500">Tổng từ vựng</div>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 text-center">
                    <div className="w-10 h-10 bg-emerald-50 dark:bg-emerald-900/20 rounded-full flex items-center justify-center mx-auto mb-2">
                        <Languages className="w-5 h-5 text-emerald-500" />
                    </div>
                    <div className="text-2xl font-bold text-gray-800 dark:text-white">{kanjiSrsStats.total}</div>
                    <div className="text-xs text-gray-500">Tổng Kanji</div>
                </div>
            </div>

            {/* Quick Actions */}
            <div className="flex flex-col gap-2 flex-shrink-0">
                <h2 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
                    <Zap className="w-5 h-5 text-amber-500" />
                    Bắt đầu nhanh
                </h2>

                <div className="grid grid-cols-2 gap-2 md:gap-3">
                    {quickActions.map((action) => (
                        <button
                            key={action.id}
                            onClick={() => navigate(action.route)}
                            className={`relative group bg-gradient-to-r ${action.color} rounded-xl p-3 md:p-5 text-white text-left shadow-md ${action.shadowColor} hover:scale-[1.02] transition-all duration-300 overflow-hidden flex flex-col justify-center min-h-[80px]`}
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




            {/* Tips */}
            <div className="bg-gradient-to-r from-slate-50 to-gray-50 dark:from-slate-800/50 dark:to-gray-800/50 rounded-xl p-3 md:p-4 border border-slate-200 dark:border-slate-700 flex-shrink-0">
                <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-slate-200 dark:bg-slate-700 rounded-full flex items-center justify-center flex-shrink-0">
                        <Sparkles className="w-5 h-5 text-slate-600 dark:text-slate-300" />
                    </div>
                    <div>
                        <h3 className="font-bold text-slate-700 dark:text-slate-200 mb-1">💡 Mẹo học tập</h3>
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                            {todayTip}
                        </p>
                    </div>
                </div>
            </div>

            {/* Onboarding Tour for new users */}
            <OnboardingTour section="home" />
        </div>
    );
};

export default HomeScreen;
