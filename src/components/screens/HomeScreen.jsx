import React, { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, onSnapshot, query } from 'firebase/firestore'
import { db, appId } from '../../config/firebase';
import {
    BookOpen, Languages, Target, Flame, Trophy, Clock,
    ArrowRight, Sparkle, Zap, FolderPlus, ListPlus, X
} from 'lucide-react';
import { ROUTES } from '../../router';
import BookVocabSyncChecker from '../ui/BookVocabSyncChecker';
import StreakCelebration from '../ui/StreakCelebration';
import { isVocabCardDue, parseNextReviewMs } from '../../utils/srs';

const HomeScreen = ({
    displayName,
    totalCards,
    allCards = [],
    userId,
    vocabCollectionPath,
    dailyActivityLogs = [],
    calculatedStreak = 0,
    isActivityLogsLoaded = false,
}) => {
    const navigate = useNavigate();
    const [kanjiSrsStats, setKanjiSrsStats] = useState({ total: 0, learning: 0, mastered: 0, dueCount: 0 });
    const [kanjiActivityDates, setKanjiActivityDates] = useState([]);
    const [showAddOptions, setShowAddOptions] = useState(false);

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
                const reviewMs = parseNextReviewMs(data.nextReview);
                if (reviewMs > 0 && reviewMs <= now) dueCount++;
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
        const dueCards = allCards.filter(card => isVocabCardDue(card)).length;
        const newCards = allCards.filter(card => !card.srsEnabled).length;
        const masteredCards = allCards.filter(card => card.srsEnabled === true && card.srsReps >= 5).length;
        return { dueCards, newCards, masteredCards, streak: calculatedStreak, totalCards };
    }, [allCards, totalCards, calculatedStreak]);
    // Quick action cards - using softer pastel colors and clean styling properties
    const quickActions = [
        {
            id: 'add',
            title: 'Thêm từ vựng',
            subtitle: 'Mở rộng vốn từ của bạn',
            icon: ({ className }) => <span className={`inline-flex items-center justify-center font-bold text-xl select-none ${className}`}>あ</span>,
            bgColor: 'bg-teal-500 hover:bg-teal-600 dark:bg-teal-600 dark:hover:bg-teal-500 border-teal-600/30 dark:border-teal-500/30',
            textColor: 'text-white',
            iconColor: 'text-white',
            subTextColor: 'text-teal-50/80',
            route: ROUTES.VOCAB_ADD,
        },
        {
            id: 'kanji',
            title: 'Học Kanji',
            subtitle: 'Chinh phục lộ trình chữ Hán',
            icon: Languages,
            bgColor: 'bg-emerald-500 hover:bg-emerald-600 dark:bg-emerald-600 dark:hover:bg-emerald-500 border-emerald-600/30 dark:border-emerald-500/30',
            textColor: 'text-white',
            iconColor: 'text-white',
            subTextColor: 'text-emerald-50/80',
            route: ROUTES.KANJI_STUDY,
        },
        {
            id: 'vocab-review',
            title: 'Ôn Tập Từ Vựng',
            subtitle: `${stats.dueCards} thẻ đang đến hạn ôn`,
            icon: BookOpen,
            bgColor: 'bg-indigo-500 hover:bg-indigo-600 dark:bg-indigo-600 dark:hover:bg-indigo-500 border-indigo-600/30 dark:border-indigo-500/30',
            textColor: 'text-white',
            iconColor: 'text-white',
            subTextColor: 'text-indigo-50/80',
            route: ROUTES.VOCAB_REVIEW,
        },
        {
            id: 'kanji-review',
            title: 'Ôn Tập Kanji',
            subtitle: `${kanjiSrsStats.dueCount} kanji đang chờ ôn`,
            icon: Target,
            bgColor: 'bg-amber-500 hover:bg-amber-600 dark:bg-amber-600 dark:hover:bg-amber-500 border-amber-600/30 dark:border-amber-500/30',
            textColor: 'text-white',
            iconColor: 'text-white',
            subTextColor: 'text-amber-50/80',
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
        <div className="flex flex-col max-w-7xl mx-auto gap-4 p-4 md:p-6 animate-fade-in">
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
                            <Sparkle className="w-4 h-4 text-[#2E5B70] dark:text-sky-400" />
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
                            data-tour-id={`QUICK_ACTION_${action.id.toUpperCase()}`}
                            onClick={() => action.id === 'add' ? setShowAddOptions(true) : navigate(action.route)}
                            className={`relative group ${action.bgColor} border rounded-2xl p-6 text-center transition-all duration-300 hover:shadow-lg hover:scale-[1.02] active:scale-98 overflow-hidden flex flex-col items-center justify-center min-h-[130px] cursor-pointer`}
                        >
                            <div className="relative z-10 flex flex-col items-center justify-center w-full">
                                <div className="flex flex-col items-center justify-center gap-1.5 w-full">
                                    <div className="p-2 rounded-xl bg-white/10 mb-0.5 group-hover:scale-110 transition-transform duration-300">
                                        <action.icon className="w-6 h-6 text-white" />
                                    </div>
                                    <h3 className="font-extrabold text-base md:text-lg text-white tracking-tight leading-snug">
                                        {action.title}
                                    </h3>
                                    <p className={`text-xs ${action.subTextColor} font-semibold line-clamp-1`}>
                                        {action.subtitle}
                                    </p>
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
                        <Sparkle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div>
                        <p className="text-xs text-amber-800 dark:text-amber-300 font-semibold mb-0.5">Mẹo học tập hôm nay</p>
                        <p className="text-xs text-amber-700/80 dark:text-amber-400/80 font-medium leading-relaxed">
                            {todayTip}
                        </p>
                    </div>
                </div>
            </div>
            {/* Modal Lựa chọn Thêm từ vựng */}
            {showAddOptions && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white dark:bg-gray-800 rounded-3xl w-full max-w-md shadow-2xl border border-slate-100 dark:border-slate-700 overflow-hidden p-6 relative">
                        <button
                            type="button"
                            onClick={() => setShowAddOptions(false)}
                            className="absolute right-4 top-4 p-1.5 hover:bg-slate-100 dark:hover:bg-slate-755 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        <h3 className="text-xl font-extrabold text-slate-800 dark:text-white mb-2 pr-8">
                            Thêm từ vựng mới
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">
                            Chọn phương thức thêm từ vựng phù hợp với nhu cầu của bạn
                        </p>

                        <div className="space-y-4">
                            <button
                                type="button"
                                onClick={() => {
                                    setShowAddOptions(false);
                                    navigate(ROUTES.VOCAB_ADD);
                                }}
                                className="w-full flex items-center gap-4 p-4 text-left rounded-2xl border border-slate-100 hover:border-teal-200 dark:border-slate-700/60 dark:hover:border-teal-900/50 bg-slate-50/50 hover:bg-teal-50/10 dark:bg-slate-900/30 dark:hover:bg-teal-950/10 transition-all group"
                            >
                                <div className="w-12 h-12 rounded-xl bg-teal-500 hover:bg-teal-600 text-white shrink-0 flex items-center justify-center shadow-md">
                                    <FolderPlus className="w-6 h-6" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h4 className="font-bold text-slate-800 dark:text-slate-150 group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors">
                                        Tạo học phần mới
                                    </h4>
                                    <p className="text-[11px] text-slate-450 dark:text-slate-400 font-medium mt-0.5">
                                        Tạo học phần mới hoàn chỉnh với tên, mô tả và hình ảnh bìa.
                                    </p>
                                </div>
                            </button>

                            <button
                                type="button"
                                onClick={() => {
                                    setShowAddOptions(false);
                                    navigate(ROUTES.VOCAB_QUICK_ADD);
                                }}
                                className="w-full flex items-center gap-4 p-4 text-left rounded-2xl border border-slate-100 hover:border-amber-200 dark:border-slate-700/60 dark:hover:border-amber-900/50 bg-slate-50/50 hover:bg-amber-50/10 dark:bg-slate-900/30 dark:hover:bg-amber-950/10 transition-all group"
                            >
                                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 text-white shrink-0 flex items-center justify-center shadow-md">
                                    <ListPlus className="w-6 h-6" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h4 className="font-bold text-slate-800 dark:text-slate-150 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                                        Thêm nhanh từ vựng
                                    </h4>
                                    <p className="text-[11px] text-slate-450 dark:text-slate-400 font-medium mt-0.5">
                                        Nhập nhanh danh sách từ vựng và chọn lưu vào học phần cũ sau.
                                    </p>
                                </div>
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* Streak celebration popup */}
            <StreakCelebration 
                dailyActivityLogs={dailyActivityLogs}
                currentCalculatedStreak={calculatedStreak}
            />
        </div>
    );
};
export default HomeScreen;
