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
import BookVocabSyncChecker from '../ui/BookVocabSyncChecker';

const HomeScreen = ({
    displayName,
    totalCards,
    allCards = [],
    userId,
    vocabCollectionPath,
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
            card.srsEnabled === true && (
                !card.nextReview_back ||
                card.intervalIndex_back === -1 ||
                card.intervalIndex_back === undefined ||
                card.intervalIndex_back < 0 ||
                (card.nextReview_back instanceof Date ? card.nextReview_back.getTime() : new Date(card.nextReview_back).getTime()) <= Date.now()
            )
        ).length;
        const newCards = allCards.filter(card => !card.srsEnabled).length;
        const masteredCards = allCards.filter(card => card.srsEnabled === true && card.srsReps >= 5).length;

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

    // Quick action cards - using softer pastel colors and clean styling properties
    const quickActions = [
        {
            id: 'add',
            title: 'Thêm từ vựng',
            subtitle: 'Mở rộng vốn từ của bạn',
            icon: Sparkles,
            bgColor: 'bg-[#EEF7F6] dark:bg-teal-950/20 border-teal-100/50 dark:border-teal-900/30',
            textColor: 'text-[#1E4D4A] dark:text-teal-300',
            iconColor: 'text-[#2C7A7B] dark:text-teal-400',
            route: ROUTES.VOCAB_ADD,
        },
        {
            id: 'kanji',
            title: 'Học Kanji',
            subtitle: 'Chinh phục lộ trình chữ Hán',
            icon: Languages,
            bgColor: 'bg-[#EDF6F0] dark:bg-emerald-950/20 border-emerald-100/50 dark:border-emerald-900/30',
            textColor: 'text-[#1E4620] dark:text-emerald-300',
            iconColor: 'text-[#2F855A] dark:text-emerald-400',
            route: ROUTES.KANJI_STUDY,
        },
        {
            id: 'vocab-review',
            title: 'Ôn Tập Từ Vựng',
            subtitle: `${stats.dueCards} thẻ đang đến hạn ôn`,
            icon: BookOpen,
            bgColor: 'bg-[#E8F2FC] dark:bg-blue-950/20 border-blue-100/50 dark:border-blue-900/30',
            textColor: 'text-[#1A365D] dark:text-blue-300',
            iconColor: 'text-[#2B6CB0] dark:text-blue-400',
            route: ROUTES.VOCAB_REVIEW,
        },
        {
            id: 'kanji-review',
            title: 'Ôn Tập Kanji',
            subtitle: `${kanjiSrsStats.dueCount} kanji đang chờ ôn`,
            icon: Target,
            bgColor: 'bg-[#FDF6ED] dark:bg-amber-950/20 border-amber-100/50 dark:border-amber-900/30',
            textColor: 'text-[#744210] dark:text-amber-300',
            iconColor: 'text-[#D69E2E] dark:text-amber-400',
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
        '継続は力なり — Kế Tục Thị Lực Dã — Kiên trì là sức mạnh',
        '千里の道も一歩から — Thiên Lí Chi Lộ Thủy Ư Nhất Bộ — Đường dài vạn dẫm khởi đầu từ một bước',
        '七転び八起き — Thất Chuyển Bát Khởi — Bảy lần vấp ngã, tám lần đứng lên',
        '石の上にも三年 — Thạch Thượng Tam Niên — Ngồi trên đá ba năm cũng ấm (Kiên nhẫn sẽ thành công)',
        '努力は必ず報われる — Nỗ Lực Tất Báo — Nỗ lực nhất định sẽ được đền đáp',
        '一日一歩 — Nhất Nhật Nhất Bộ — Mỗi ngày tiến một bước',
        '夢を追いかけろ — Mộng Truy Cập — Hãy theo đuổi ước mơ',
        '失敗は成功のもと — Thất Bại Thị Thành Công Chi Bản — Thất bại là mẹ thành công',
        '自分を信じろ — Tự Thân Tín — Hãy tin tưởng vào bản thân',
        '一期一会 — Nhất Kỳ Nhất Hội — Đời người chỉ gặp một lần (Trân quý cơ duyên)',
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
        <div className="flex flex-col h-full max-h-[calc(100vh-80px)] max-w-7xl mx-auto gap-4 p-4 md:p-6 overflow-y-auto scrollbar-hide animate-fade-in">
            {/* Book Vocab Sync Notification */}
            <BookVocabSyncChecker
                userId={userId}
                appId={appId}
                allCards={allCards}
                vocabCollectionPath={vocabCollectionPath}
            />

            {/* Hero Section - Soft light-blue background card */}
            <div className="relative flex-shrink-0 overflow-hidden bg-[#E8F1FA] dark:bg-slate-900 border border-blue-100/50 dark:border-slate-800/60 rounded-2xl p-5 md:p-6 text-slate-800 dark:text-slate-200">
                {/* Decorative subtle background shapes */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-blue-200/20 dark:bg-slate-800/30 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-teal-200/10 dark:bg-slate-800/20 rounded-full blur-2xl translate-y-1/2 -translate-x-1/2"></div>

                <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-1.5 mb-1.5">
                            <Sparkles className="w-4 h-4 text-[#2E5B70] dark:text-sky-400" />
                            <span className="text-xs md:text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">{getGreeting()}</span>
                        </div>

                        <h1 className="text-2xl md:text-3xl font-extrabold text-slate-800 dark:text-white tracking-tight mb-2">
                            {displayName ? `${displayName}!` : 'Chào bạn!'}
                        </h1>

                        <p className="text-slate-600 dark:text-slate-300 text-sm font-medium italic leading-relaxed">
                            "{todayQuote}"
                        </p>
                    </div>

                    {/* Mini Stats Pills inside Hero banner */}
                    <div className="flex flex-wrap gap-2 md:flex-col md:items-end justify-start">
                        <div className="flex items-center gap-2 bg-white dark:bg-slate-800 border border-slate-200/50 dark:border-slate-700/50 rounded-xl px-4 py-2 shadow-sm">
                            <Flame className="w-4 h-4 text-orange-500" />
                            <span className="text-xs md:text-sm font-bold text-slate-700 dark:text-slate-200">{stats.streak} ngày streak</span>
                        </div>
                        <div className="flex items-center gap-2 bg-white dark:bg-slate-800 border border-slate-200/50 dark:border-slate-700/50 rounded-xl px-4 py-2 shadow-sm">
                            <Trophy className="w-4 h-4 text-amber-500" />
                            <span className="text-xs md:text-sm font-bold text-slate-700 dark:text-slate-200">{stats.masteredCards} từ thuộc</span>
                        </div>
                        <div className="flex items-center gap-2 bg-white dark:bg-slate-800 border border-slate-200/50 dark:border-slate-700/50 rounded-xl px-4 py-2 shadow-sm">
                            <Languages className="w-4 h-4 text-emerald-500" />
                            <span className="text-xs md:text-sm font-bold text-slate-700 dark:text-slate-200">{kanjiSrsStats.mastered} kanji thuộc</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Today's Summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 flex-shrink-0">
                {/* Card 1: Vocab Review */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-100 dark:border-slate-800/80 shadow-[0_2px_8px_rgba(0,0,0,0.02)] dark:shadow-none flex items-center gap-4">
                    <div className="w-12 h-12 bg-rose-50 dark:bg-rose-950/30 rounded-2xl flex items-center justify-center flex-shrink-0">
                        <Clock className="w-5 h-5 text-rose-500" />
                    </div>
                    <div>
                        <div className="text-2xl font-bold text-slate-800 dark:text-white leading-tight">{stats.dueCards}</div>
                        <div className="text-xs text-slate-400 dark:text-slate-500 font-medium">Từ vựng cần ôn</div>
                    </div>
                </div>

                {/* Card 2: Kanji Review */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-100 dark:border-slate-800/80 shadow-[0_2px_8px_rgba(0,0,0,0.02)] dark:shadow-none flex items-center gap-4">
                    <div className="w-12 h-12 bg-amber-50 dark:bg-amber-950/30 rounded-2xl flex items-center justify-center flex-shrink-0">
                        <Target className="w-5 h-5 text-amber-500" />
                    </div>
                    <div>
                        <div className="text-2xl font-bold text-slate-800 dark:text-white leading-tight">{kanjiSrsStats.dueCount}</div>
                        <div className="text-xs text-slate-400 dark:text-slate-500 font-medium">Kanji cần ôn</div>
                    </div>
                </div>

                {/* Card 3: Total Cards */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-100 dark:border-slate-800/80 shadow-[0_2px_8px_rgba(0,0,0,0.02)] dark:shadow-none flex items-center gap-4">
                    <div className="w-12 h-12 bg-sky-50 dark:bg-sky-950/30 rounded-2xl flex items-center justify-center flex-shrink-0">
                        <BookOpen className="w-5 h-5 text-sky-500" />
                    </div>
                    <div>
                        <div className="text-2xl font-bold text-slate-800 dark:text-white leading-tight">{stats.totalCards}</div>
                        <div className="text-xs text-slate-400 dark:text-slate-500 font-medium">Tổng từ vựng</div>
                    </div>
                </div>

                {/* Card 4: Total Kanji */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-100 dark:border-slate-800/80 shadow-[0_2px_8px_rgba(0,0,0,0.02)] dark:shadow-none flex items-center gap-4">
                    <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-950/30 rounded-2xl flex items-center justify-center flex-shrink-0">
                        <Languages className="w-5 h-5 text-emerald-500" />
                    </div>
                    <div>
                        <div className="text-2xl font-bold text-slate-800 dark:text-white leading-tight">{kanjiSrsStats.total}</div>
                        <div className="text-xs text-slate-400 dark:text-slate-500 font-medium">Tổng Kanji</div>
                    </div>
                </div>
            </div>

            {/* Quick Actions */}
            <div className="flex flex-col gap-2.5 flex-shrink-0">
                <h2 className="text-sm md:text-base font-bold text-slate-800 dark:text-white flex items-center gap-1.5 px-1">
                    <Zap className="w-4 h-4 md:w-5 md:h-5 text-amber-500 animate-pulse" />
                    Bắt đầu nhanh
                </h2>

                <div className="grid grid-cols-2 gap-4">
                    {quickActions.map((action) => (
                        <button
                            key={action.id}
                            onClick={() => navigate(action.route)}
                            className={`relative group ${action.bgColor} border rounded-2xl p-5 text-left transition-all duration-300 hover:shadow-md hover:scale-[1.01] overflow-hidden flex flex-col justify-between min-h-[110px] cursor-pointer`}
                        >
                            <div className="relative z-10 flex flex-col h-full justify-between">
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <action.icon className={`w-5 h-5 ${action.iconColor}`} />
                                        <h3 className={`font-bold text-sm md:text-base ${action.textColor}`}>{action.title}</h3>
                                    </div>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">{action.subtitle}</p>
                                </div>
                                <div className="flex items-center gap-1 mt-3 text-xs font-semibold opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                    <span className={action.textColor}>Học ngay</span>
                                    <ArrowRight className={`w-3.5 h-3.5 ${action.textColor} translate-x-0 group-hover:translate-x-1 transition-transform`} />
                                </div>
                            </div>
                        </button>
                    ))}
                </div>
            </div>

            {/* Tips */}
            <div className="bg-[#FFF9E6] dark:bg-amber-950/20 rounded-2xl p-4 border border-amber-200/50 dark:border-amber-900/30 flex-shrink-0 mx-1 mb-1">
                <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-amber-100 dark:bg-amber-900/30 rounded-xl flex items-center justify-center flex-shrink-0">
                        <Sparkles className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div>
                        <p className="text-xs text-amber-800 dark:text-amber-300 font-semibold mb-0.5">Mẹo học tập hôm nay</p>
                        <p className="text-xs text-amber-700/80 dark:text-amber-400/80 font-medium leading-relaxed">
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
