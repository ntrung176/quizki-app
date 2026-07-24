import React, { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, onSnapshot, query } from 'firebase/firestore'
import { db, appId } from '../../config/firebase';
import {
    BookOpen, Languages, Target, Flame, Trophy, Clock,
    ArrowRight, Sparkle, Zap, FolderPlus, ListPlus, X, Cpu, Radio, Activity, Repeat2, Lightbulb
} from 'lucide-react';
import { ROUTES } from '../../router';
import BookVocabSyncChecker from '../ui/BookVocabSyncChecker';
import StreakCelebration from '../ui/StreakCelebration';
import { isVocabCardDue, isSrsCardDue, isKanjiMastered, isVocabCardMastered, parseNextReviewMs } from '../../utils/srs';
import { getSharedKanjiList, subscribeKanjiSrs } from '../../utils/kanjiService';
import { useLanguage } from '../../context/LanguageContext';

// HomeScreen Component - Cyber-AI Futuristic Edition
const HomeScreen = ({
    displayName,
    totalCards,
    allCards = [],
    userId,
    vocabCollectionPath,
    dailyActivityLogs = [],
    isReviewActive = false,
    calculatedStreak = 0,
}) => {
    const { t } = useLanguage();
    const navigate = useNavigate();
    const [kanjiSrsStats, setKanjiSrsStats] = useState({ total: 0, learning: 0, mastered: 0, dueCount: 0 });
    const [kanjiActivityDates, setKanjiActivityDates] = useState([]);
    const [showAddOptions, setShowAddOptions] = useState(false);

    // Fetch kanji SRS stats + activity dates synchronized with Kanji module
    useEffect(() => {
        if (!userId) return;
        let isMounted = true;
        let unsub = () => {};

        getSharedKanjiList().then(kList => {
            if (!isMounted) return;
            const validKanjiIds = new Set((kList || []).map(k => k.id));

            unsub = subscribeKanjiSrs(userId, (freshSrs) => {
                if (!isMounted) return;
                let total = 0, learning = 0, mastered = 0, dueCount = 0;
                const now = Date.now();
                const actDates = [];
                const toDateStr = (ts) => {
                    if (!ts) return null;
                    const d = new Date(ts);
                    if (isNaN(d.getTime())) return null;
                    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                };

                Object.entries(freshSrs || {}).forEach(([id, data]) => {
                    if (validKanjiIds.size > 0 && !validKanjiIds.has(id)) return;
                    total++;
                    if (isKanjiMastered(data)) mastered++;
                    else learning++;
                    if (isSrsCardDue(data, now)) dueCount++;
                    const dateStr = toDateStr(data.lastReview);
                    if (dateStr) actDates.push(dateStr);
                });

                setKanjiSrsStats({ total, learning, mastered, dueCount });
                setKanjiActivityDates(actDates);
            });
        }).catch(err => {
            console.error('Error fetching kanji list in HomeScreen:', err);
        });

        return () => {
            isMounted = false;
            unsub();
        };
    }, [userId]);

    // Calculate stats
    const stats = useMemo(() => {
        const dueCards = allCards.filter(card => isVocabCardDue(card)).length;
        const newCards = allCards.filter(card => !card.srsEnabled).length;
        const masteredCards = allCards.filter(card => isVocabCardMastered(card)).length;
        return { dueCards, newCards, masteredCards, streak: calculatedStreak, totalCards };
    }, [allCards, totalCards, calculatedStreak]);

    // 6 Cyber Quick action cards arranged 3 top, 3 bottom
    const quickActions = useMemo(() => [
        // Row 1: Học & Thêm mới
        {
            id: 'add',
            title: t('home.addVocabTitle', 'Thêm Từ Vựng'),
            subtitle: t('home.addVocabSub', 'Mở rộng bộ từ vựng mới'),
            icon: FolderPlus,
            gradient: 'from-teal-600 via-teal-500 to-cyan-500',
            glow: 'shadow-teal-500/25 border border-teal-400/40',
            route: ROUTES.VOCAB_ADD,
        },
        {
            id: 'kanji-study',
            title: t('home.learnKanjiTitle', 'Học Kanji'),
            subtitle: t('home.learnKanjiSub', 'Chinh phục lộ trình chữ Hán'),
            icon: Languages,
            gradient: 'from-emerald-600 via-emerald-500 to-teal-500',
            glow: 'shadow-emerald-500/25 border border-emerald-400/40',
            route: ROUTES.KANJI_STUDY,
        },
        {
            id: 'grammar-study',
            title: t('home.learnGrammarTitle', 'Học Ngữ Pháp'),
            subtitle: t('home.learnGrammarSub', 'Sách giáo trình & bài học'),
            icon: BookOpen,
            gradient: 'from-sky-600 via-sky-500 to-blue-500',
            glow: 'shadow-sky-500/25 border border-sky-400/40',
            route: ROUTES.BOOKS || ROUTES.GRAMMAR_REVIEW,
        },
        // Row 2: Ôn tập
        {
            id: 'vocab-review',
            title: t('home.reviewVocabTitle', 'Ôn Tập Từ Vựng'),
            subtitle: `${stats.dueCards} ${t('home.cardsDueSubtitle', 'thẻ đang đến hạn ôn')}`,
            icon: Clock,
            gradient: 'from-indigo-600 via-indigo-500 to-violet-500',
            glow: 'shadow-indigo-500/25 border border-indigo-400/40',
            route: ROUTES.VOCAB_REVIEW,
        },
        {
            id: 'kanji-review',
            title: t('home.reviewKanjiTitle', 'Ôn Tập Kanji'),
            subtitle: `${kanjiSrsStats.dueCount} ${t('home.kanjiDueSubtitle', 'chữ kanji cần ôn tập')}`,
            icon: Target,
            gradient: 'from-amber-600 via-amber-500 to-orange-500',
            glow: 'shadow-amber-500/25 border border-amber-400/40',
            route: ROUTES.KANJI_REVIEW,
        },
        {
            id: 'grammar-review',
            title: t('home.reviewGrammarTitle', 'Ôn Tập Ngữ Pháp'),
            subtitle: t('home.reviewGrammarSub', 'Luyện tập bài tập mẫu câu'),
            icon: Repeat2,
            gradient: 'from-purple-600 via-purple-500 to-pink-500',
            glow: 'shadow-purple-500/25 border border-purple-400/40',
            route: ROUTES.GRAMMAR_REVIEW,
        },
    ], [t, stats.dueCards, kanjiSrsStats.dueCount]);

    // Greeting based on time
    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return t('home.goodMorning', 'Chào buổi sáng');
        if (hour < 18) return t('home.goodAfternoon', 'Chào buổi chiều');
        return t('home.goodEvening', 'Chào buổi tối');
    };

    // Motivational quotes
    const quotes = [
        '継続は力なり — Kế Tục Thị Lực Dã — Kiên trì là sức mạnh',
        '千里の道も一歩から — Đường dài vạn dẫm khởi đầu từ một bước',
        '七転び八起き — Bảy lần vấp ngã, tám lần đứng lên',
        '石の上にも三年 — Ngồi trên đá ba năm cũng ấm (Kiên nhẫn sẽ thành công)',
        '努力は必ず報われる — Nỗ lực nhất định sẽ được đền đáp',
        '一日一歩 — Mỗi ngày tiến một bước',
        '夢を追いかけろ — Hãy theo đuổi ước mơ',
        '失敗は成功のもと — Thất bại là mẹ thành công',
        '自分を信じろ — Hãy tin tưởng vào bản thân',
        '一期一会 — Đời người chỉ gặp một lần (Trân quý cơ duyên)',
    ];
    const todayQuote = quotes[new Date().getDate() % quotes.length];

    // Learning tips
    const learningTips = [
        'Học đều đặn mỗi ngày 15-30 phút hiệu quả hơn học dồn một lần. Hãy ôn tập ngay khi có thẻ đến hạn!',
        'Sử dụng phương pháp lặp lại ngắt quãng (SRS) giúp ghi nhớ lâu dài hơn 90% so với học thuộc lòng.',
        'Nghe nhạc hoặc podcast tiếng Nhật khi rảnh giúp làm quen với ngữ điệu và từ vựng mới.',
        'Viết tay từ vựng và Kanji giúp não bộ ghi nhớ sâu hơn so với chỉ nhìn và đọc.',
        'Học từ vựng theo chủ đề giúp liên kết các từ với nhau, dễ nhớ và sử dụng hơn.',
    ];
    const todayTip = learningTips[new Date().getDate() % learningTips.length];

    return (
        <div className="flex flex-col max-w-7xl mx-auto gap-6 p-4 md:p-6 animate-fade-in relative z-10 font-sans">
            {/* Book Vocab Sync Notification */}
            <BookVocabSyncChecker
                userId={userId}
                appId={appId}
                allCards={allCards}
                vocabCollectionPath={vocabCollectionPath}
            />

            {/* Sci-Fi Cyber HUD Hero Banner */}
            <div className="relative overflow-hidden bg-white dark:bg-slate-900 border border-slate-200 dark:border-cyan-500/30 rounded-3xl p-6 md:p-8 text-slate-800 dark:text-slate-100 shadow-xl relative group">
                <div className="absolute top-0 right-0 w-80 h-80 bg-cyan-500/10 dark:bg-cyan-500/15 rounded-full blur-3xl pointer-events-none"></div>
                <div className="absolute bottom-0 left-0 w-60 h-60 bg-indigo-500/10 dark:bg-indigo-600/15 rounded-full blur-3xl pointer-events-none"></div>
                
                <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                    <div className="space-y-3 max-w-2xl">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-50 dark:bg-cyan-950/60 border border-cyan-200 dark:border-cyan-800/60 text-cyan-700 dark:text-cyan-400 text-xs font-mono font-bold uppercase tracking-wider">
                                <Cpu className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400 animate-spin-slow" />
                                <span>NEURAL DASHBOARD • {getGreeting().toUpperCase()}</span>
                            </div>
                        </div>

                        <h1 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
                            {displayName ? `${displayName}!` : t('home.helloUser', 'Chào bạn!')}
                        </h1>

                        <div className="p-3 bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 rounded-2xl">
                            <p className="text-slate-700 dark:text-slate-300 text-xs md:text-sm font-medium italic leading-relaxed">
                                "{todayQuote}"
                            </p>
                        </div>
                    </div>

                    {/* Mini Stats Telemetry Pills */}
                    <div className="flex flex-wrap lg:flex-col gap-2.5 items-start lg:items-end justify-start font-mono">
                        <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2 shadow-sm">
                            <Flame className="w-4 h-4 text-orange-500" />
                            <span className="text-xs md:text-sm font-bold text-slate-800 dark:text-slate-200">{stats.streak} {t('home.dayStreak', 'ngày streak')}</span>
                        </div>
                        <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2 shadow-sm">
                            <Trophy className="w-4 h-4 text-amber-500" />
                            <span className="text-xs md:text-sm font-bold text-slate-800 dark:text-slate-200">{stats.masteredCards} {t('home.vocabMastered', 'từ thuộc')}</span>
                        </div>
                        <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2 shadow-sm">
                            <Languages className="w-4 h-4 text-emerald-500" />
                            <span className="text-xs md:text-sm font-bold text-slate-800 dark:text-slate-200">{kanjiSrsStats.mastered} {t('home.kanjiMastered', 'kanji thuộc')}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Today's Summary Telemetry Counters */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Card 1: Vocab Review */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl p-4.5 border border-slate-200 dark:border-slate-800 shadow-md flex items-center gap-4">
                    <div className="w-12 h-12 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 rounded-2xl flex items-center justify-center flex-shrink-0">
                        <Clock className="w-5 h-5 text-rose-600 dark:text-rose-400" />
                    </div>
                    <div>
                        <div className="text-2xl font-black text-slate-900 dark:text-white leading-tight font-mono">{stats.dueCards}</div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">{t('home.dueVocab', 'Từ vựng cần ôn')}</div>
                    </div>
                </div>

                {/* Card 2: Kanji Review */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl p-4.5 border border-slate-200 dark:border-slate-800 shadow-md flex items-center gap-4">
                    <div className="w-12 h-12 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-2xl flex items-center justify-center flex-shrink-0">
                        <Target className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div>
                        <div className="text-2xl font-black text-slate-900 dark:text-white leading-tight font-mono">{kanjiSrsStats.dueCount}</div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">{t('home.dueKanji', 'Kanji cần ôn')}</div>
                    </div>
                </div>

                {/* Card 3: Total Cards */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl p-4.5 border border-slate-200 dark:border-slate-800 shadow-md flex items-center gap-4">
                    <div className="w-12 h-12 bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800/60 rounded-2xl flex items-center justify-center flex-shrink-0">
                        <BookOpen className="w-5 h-5 text-sky-600 dark:text-sky-400" />
                    </div>
                    <div>
                        <div className="text-2xl font-black text-slate-900 dark:text-white leading-tight font-mono">{stats.totalCards}</div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">{t('home.totalVocab', 'Tổng từ vựng')}</div>
                    </div>
                </div>

                {/* Card 4: Total Kanji */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl p-4.5 border border-slate-200 dark:border-slate-800 shadow-md flex items-center gap-4">
                    <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-2xl flex items-center justify-center flex-shrink-0">
                        <Languages className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div>
                        <div className="text-2xl font-black text-slate-900 dark:text-white leading-tight font-mono">{kanjiSrsStats.total}</div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">{t('home.totalKanji', 'Tổng Kanji')}</div>
                    </div>
                </div>
            </div>

            {/* Quick Actions - 6 Buttons (3 top, 3 bottom) */}
            <div className="space-y-3">
                <h2 className="text-sm md:text-base font-bold text-slate-800 dark:text-white flex items-center gap-2 font-mono uppercase tracking-wider">
                    <Zap className="w-4 h-4 text-amber-500 animate-pulse" />
                    [NEURAL LAUNCHPAD] {t('home.quickLaunchpad', 'Bắt đầu nhanh')}
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {quickActions.map((action) => (
                        <button
                            key={action.id}
                            onClick={() => action.id === 'add' ? setShowAddOptions(true) : navigate(action.route)}
                            className={`relative group bg-gradient-to-br ${action.gradient} text-white rounded-2xl p-5 text-left transition-all duration-300 hover:scale-[1.03] active:scale-98 overflow-hidden min-h-[120px] cursor-pointer shadow-lg ${action.glow}`}
                        >
                            <div className="relative z-10 flex flex-col justify-between h-full">
                                <div className="p-2.5 rounded-xl bg-white/20 w-fit mb-2 group-hover:scale-110 transition-transform">
                                    <action.icon className="w-6 h-6 text-white" />
                                </div>
                                <div>
                                    <h3 className="font-black text-base text-white tracking-tight">
                                        {action.title}
                                    </h3>
                                    <p className="text-xs text-white/85 font-medium mt-0.5 line-clamp-1">
                                        {action.subtitle}
                                    </p>
                                </div>
                            </div>
                        </button>
                    ))}
                </div>
            </div>

            {/* Cyber-AI Learning Tip HUD Card */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-amber-500/30 rounded-3xl p-5 md:p-6 shadow-xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 dark:bg-amber-500/15 rounded-full blur-3xl pointer-events-none"></div>
                <div className="relative z-10 flex items-start gap-4">
                    <div className="w-11 h-11 bg-gradient-to-tr from-amber-500 to-orange-500 rounded-2xl flex items-center justify-center text-white shadow-md shadow-amber-500/25 border border-amber-400/40 shrink-0 group-hover:scale-105 transition-transform">
                        <Lightbulb className="w-6 h-6" />
                    </div>
                    <div className="space-y-1.5 min-w-0 flex-1">
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-[11px] font-mono font-bold uppercase tracking-wider">
                            <Sparkle className="w-3.5 h-3.5" />
                            <span>[NEURAL TIP ADVISOR] {t('home.dailyTipBadge', 'Mẹo học tập hôm nay')}</span>
                        </div>
                        <p className="text-slate-700 dark:text-slate-200 text-xs md:text-sm font-medium leading-relaxed font-sans">
                            {todayTip}
                        </p>
                    </div>
                </div>
            </div>

            {/* Modal Lựa chọn Thêm từ vựng */}
            {showAddOptions && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fade-in">
                    <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-md shadow-2xl border border-slate-200 dark:border-slate-800 p-6 relative">
                        <button
                            type="button"
                            onClick={() => setShowAddOptions(false)}
                            className="absolute right-4 top-4 p-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-300 rounded-xl transition-colors cursor-pointer"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        <h3 className="text-xl font-black text-slate-900 dark:text-white mb-1 pr-8">
                            {t('home.addModalTitle', 'Thêm từ vựng mới')}
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">
                            {t('home.addModalSub', 'Chọn phương thức thêm từ vựng phù hợp')}
                        </p>

                        <div className="space-y-3">
                            <button
                                type="button"
                                onClick={() => {
                                    setShowAddOptions(false);
                                    navigate(ROUTES.VOCAB_ADD);
                                }}
                                className="w-full flex items-center gap-4 p-4 text-left rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 hover:border-teal-500 transition-all cursor-pointer group"
                            >
                                <div className="w-12 h-12 rounded-xl bg-teal-500 text-white shrink-0 flex items-center justify-center shadow-md">
                                    <FolderPlus className="w-6 h-6" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h4 className="font-bold text-slate-800 dark:text-slate-100 group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors">
                                        {t('home.createFolderTitle', 'Tạo học phần mới')}
                                    </h4>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                                        {t('home.createFolderSub', 'Tạo học phần hoàn chỉnh với tên và từ vựng.')}
                                    </p>
                                </div>
                            </button>

                            <button
                                type="button"
                                onClick={() => {
                                    setShowAddOptions(false);
                                    navigate(ROUTES.VOCAB_QUICK_ADD);
                                }}
                                className="w-full flex items-center gap-4 p-4 text-left rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 hover:border-amber-500 transition-all cursor-pointer group"
                            >
                                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 text-white shrink-0 flex items-center justify-center shadow-md">
                                    <ListPlus className="w-6 h-6" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h4 className="font-bold text-slate-800 dark:text-slate-100 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                                        {t('home.quickAddTitle', 'Thêm nhanh từ vựng')}
                                    </h4>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                                        {t('home.quickAddSub', 'Nhập nhanh danh sách từ vựng từ bất kỳ đâu.')}
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
