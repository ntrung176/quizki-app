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
import { useTargetLanguage } from '../../context/TargetLanguageContext';
import { isEnglishCard } from '../../utils/englishVocab';

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
    const { isEnglishMode } = useTargetLanguage();
    const navigate = useNavigate();

    // 1. Instant Summary Cache cho Kanji Stats
    const [kanjiSrsStats, setKanjiSrsStats] = useState(() => {
        try {
            const cached = localStorage.getItem('quizki_cached_kanji_srs_stats');
            if (cached) {
                const parsed = JSON.parse(cached);
                return { ...parsed, isInitialLoading: false };
            }
        } catch (_) {}
        return { total: null, learning: null, mastered: null, dueCount: null, isInitialLoading: true };
    });

    // 2. Instant Summary Cache cho Vocab Stats & Streak
    const [cachedVocabStats, setCachedVocabStats] = useState(() => {
        try {
            const cached = localStorage.getItem('quizki_cached_home_vocab_stats');
            return cached ? JSON.parse(cached) : null;
        } catch (_) {
            return null;
        }
    });

    const [cachedStreak, setCachedStreak] = useState(() => {
        try {
            const cached = localStorage.getItem('quizki_cached_user_streak');
            return cached !== null ? parseInt(cached, 10) : null;
        } catch (_) {
            return null;
        }
    });

    useEffect(() => {
        if (calculatedStreak > 0) {
            try {
                localStorage.setItem('quizki_cached_user_streak', String(calculatedStreak));
            } catch (_) {}
        }
    }, [calculatedStreak]);

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

                (kList || []).forEach(k => {
                    const data = (freshSrs && freshSrs[k.id]) ? freshSrs[k.id] : (k.srsData || null);
                    if (data) {
                        total++;
                        if (isKanjiMastered(data)) mastered++;
                        else learning++;
                        if (isSrsCardDue(data, now)) dueCount++;
                        if (data.lastReview) {
                            const dateStr = toDateStr(data.lastReview);
                            if (dateStr) actDates.push(dateStr);
                        }
                    }
                });

                setKanjiSrsStats({ total, learning, mastered, dueCount, isInitialLoading: false });
                setKanjiActivityDates(actDates);
                try {
                    localStorage.setItem('quizki_cached_kanji_srs_stats', JSON.stringify({ total, learning, mastered, dueCount }));
                } catch (_) {}
            });
        }).catch(err => {
            console.error('Error fetching kanji list in HomeScreen:', err);
        });

        return () => {
            isMounted = false;
            unsub();
        };
    }, [userId]);

    // Calculate stats with instant fallback cache
    const stats = useMemo(() => {
        const hasLoadedCards = allCards && allCards.length > 0;
        const currentStreak = calculatedStreak > 0 ? calculatedStreak : (cachedStreak ?? 0);

        if (!hasLoadedCards && cachedVocabStats) {
            return {
                dueCards: cachedVocabStats.dueCards ?? 0,
                newCards: cachedVocabStats.newCards ?? 0,
                masteredCards: cachedVocabStats.masteredCards ?? 0,
                streak: currentStreak,
                totalCards: cachedVocabStats.totalCards ?? 0,
                isInitialLoading: false
            };
        }

        if (!hasLoadedCards && !cachedVocabStats) {
            return {
                dueCards: null,
                newCards: null,
                masteredCards: null,
                streak: currentStreak,
                totalCards: null,
                isInitialLoading: true
            };
        }

        const langCards = allCards.filter(card => isEnglishCard(card, isEnglishMode) === isEnglishMode);
        const dueCards = langCards.filter(card => isVocabCardDue(card)).length;
        const newCards = langCards.filter(card => !card.srsEnabled).length;
        const masteredCards = langCards.filter(card => isVocabCardMastered(card)).length;
        const result = {
            dueCards,
            newCards,
            masteredCards,
            streak: currentStreak,
            totalCards: langCards.length,
            isInitialLoading: false
        };

        try {
            localStorage.setItem('quizki_cached_home_vocab_stats', JSON.stringify({
                dueCards,
                newCards,
                masteredCards,
                streak: currentStreak,
                totalCards: langCards.length
            }));
        } catch (_) {}

        return result;
    }, [allCards, calculatedStreak, cachedStreak, isEnglishMode, cachedVocabStats]);

const StatNumber = ({ value, isLoading = false, fallback = 0, className = "text-xl sm:text-3xl font-black text-slate-900 dark:text-white leading-none font-mono" }) => {
    if (isLoading && (value === null || value === undefined)) {
        return (
            <div className="h-6 sm:h-8 w-12 sm:w-16 bg-slate-200 dark:bg-slate-800/80 rounded-lg animate-pulse my-0.5" />
        );
    }
    return (
        <div className={`${className} transition-opacity duration-300`}>
            {value ?? fallback}
        </div>
    );
};

// Quick action cards adjusted for English vs Japanese mode
    const quickActions = useMemo(() => {
        const vocabDueSubtitle = stats.isInitialLoading && stats.dueCards === null 
            ? 'Đang cập nhật...' 
            : `${stats.dueCards ?? 0} ${t('home.cardsDueSubtitle', 'thẻ đang đến hạn ôn')}`;
            
        const kanjiDueSubtitle = kanjiSrsStats.isInitialLoading && kanjiSrsStats.dueCount === null
            ? 'Đang cập nhật...'
            : `${kanjiSrsStats.dueCount ?? 0} ${t('home.kanjiDueSubtitle', 'chữ kanji cần ôn tập')}`;

        if (isEnglishMode) {
            return [
                {
                    id: 'add',
                    title: t('home.addVocabTitle', 'Thêm Từ Vựng'),
                    subtitle: 'Mở rộng bộ từ vựng Tiếng Anh mới',
                    icon: FolderPlus,
                    gradient: 'from-teal-600 via-teal-500 to-cyan-500',
                    glow: 'shadow-teal-500/25 border border-teal-400/40',
                    route: ROUTES.VOCAB_ADD,
                },
                {
                    id: 'vocab-review',
                    title: t('home.reviewVocabTitle', 'Ôn Tập Từ Vựng'),
                    subtitle: vocabDueSubtitle,
                    icon: Clock,
                    gradient: 'from-indigo-600 via-indigo-500 to-violet-500',
                    glow: 'shadow-indigo-500/25 border border-indigo-400/40',
                    route: ROUTES.VOCAB_REVIEW,
                },
                {
                    id: 'ielts-test',
                    title: 'Luyện Thi IELTS / TOEIC',
                    subtitle: 'Luyện tập bộ đề & kiểm tra trình độ',
                    icon: Trophy,
                    gradient: 'from-amber-600 via-amber-500 to-orange-500',
                    glow: 'shadow-amber-500/25 border border-amber-400/40',
                    route: ROUTES.JLPT_TEST,
                },
            ];
        }

        return [
            // Row 1: Học & Thêm mới (Tiếng Nhật)
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
            // Row 2: Ôn tập (Tiếng Nhật)
            {
                id: 'vocab-review',
                title: t('home.reviewVocabTitle', 'Ôn Tập Từ Vựng'),
                subtitle: vocabDueSubtitle,
                icon: Clock,
                gradient: 'from-indigo-600 via-indigo-500 to-violet-500',
                glow: 'shadow-indigo-500/25 border border-indigo-400/40',
                route: ROUTES.VOCAB_REVIEW,
            },
            {
                id: 'kanji-review',
                title: t('home.reviewKanjiTitle', 'Ôn Tập Kanji'),
                subtitle: kanjiDueSubtitle,
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
        ];
    }, [t, stats.dueCards, stats.isInitialLoading, kanjiSrsStats.dueCount, kanjiSrsStats.isInitialLoading, isEnglishMode]);

    // Greeting based on time
    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return t('home.goodMorning', 'Chào buổi sáng');
        if (hour < 18) return t('home.goodAfternoon', 'Chào buổi chiều');
        return t('home.goodEvening', 'Chào buổi tối');
    };

    // Motivational quotes (English vs Japanese)
    const quotes = isEnglishMode ? [
        'Every day is a new step forward.',
        'Consistency is the key to mastery.',
        'Learn something new every day.',
        'Practice makes perfect.',
        'Small daily improvements lead to long term results.',
        'Believe in yourself and keep pushing forward.',
        'Success is the sum of small efforts repeated day in and day out.',
    ] : [
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
    const learningTips = isEnglishMode ? [
        'Study 15-30 minutes every day for best retention. Review cards as soon as they are due!',
        'Using Spaced Repetition (SRS) helps you remember words 90% longer than cramming.',
        'Listen to English podcasts or songs during your free time to get used to English intonation.',
        'Writing down vocabulary helps your brain memorize deeper than just reading.',
        'Learn vocabulary in context or topics to easily remember and use them in conversation.',
    ] : [
        'Học đều đặn mỗi ngày 15-30 phút hiệu quả hơn học dồn một lần. Hãy ôn tập ngay khi có thẻ đến hạn!',
        'Sử dụng phương pháp lặp lại ngắt quãng (SRS) giúp ghi nhớ lâu dài hơn 90% so với học thuộc lòng.',
        'Nghe nhạc hoặc podcast tiếng Nhật khi rảnh giúp làm quen với ngữ điệu và từ vựng mới.',
        'Viết tay từ vựng và Kanji giúp não bộ ghi nhớ sâu hơn so với chỉ nhìn và đọc.',
        'Học từ vựng theo chủ đề giúp liên kết các từ với nhau, dễ nhớ và sử dụng hơn.',
    ];
    const todayTip = learningTips[new Date().getDate() % learningTips.length];

    return (
        <div className="flex flex-col max-w-7xl mx-auto gap-4 sm:gap-6 p-3 sm:p-5 md:p-8 animate-fade-in relative z-10 font-sans selection:bg-cyan-500/20">
            {/* Book Vocab Sync Notification */}
            <BookVocabSyncChecker
                userId={userId}
                appId={appId}
                allCards={allCards}
                vocabCollectionPath={vocabCollectionPath}
            />

            {/* Anti-Slop Bento Hero Header */}
            <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 border border-slate-800/80 rounded-3xl p-5 sm:p-8 text-white shadow-2xl group">
                <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none group-hover:bg-cyan-500/15 transition-all duration-700"></div>
                <div className="absolute bottom-0 left-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none group-hover:bg-indigo-500/15 transition-all duration-700"></div>
                
                <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                    <div className="space-y-3.5 max-w-2xl">
                        <div className="flex flex-wrap items-center gap-2.5">
                            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-mono font-semibold uppercase tracking-wider backdrop-blur-md">
                                <Sparkle className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
                                <span>QUIZKI AI DASHBOARD • {getGreeting().toUpperCase()}</span>
                            </span>
                        </div>

                        <h1 className="text-2xl sm:text-4xl md:text-5xl font-black text-white tracking-tight leading-tight">
                            {displayName ? `${displayName}!` : t('home.helloUser', 'Chào bạn!')}
                        </h1>

                        <div className="p-3.5 sm:p-4 bg-slate-950/60 backdrop-blur-md border border-slate-800/80 rounded-2xl shadow-inner">
                            <p className="text-slate-300 text-xs sm:text-sm font-medium italic leading-relaxed">
                                "{todayQuote}"
                            </p>
                        </div>
                    </div>

                    {/* Telemetry Stats Pills */}
                    <div className="flex flex-wrap items-center gap-2.5 font-mono">
                        <div className="flex items-center gap-2 bg-slate-950/80 border border-slate-800 rounded-2xl px-4 py-2.5 shadow-lg text-xs sm:text-sm font-bold backdrop-blur-md hover:border-orange-500/40 transition-colors">
                            <Flame className="w-4 h-4 text-orange-500 shrink-0 animate-bounce" />
                            <span className="text-slate-200">{stats.streak ?? 0} {t('home.dayStreak', 'ngày streak')}</span>
                        </div>
                        <div className="flex items-center gap-2 bg-slate-950/80 border border-slate-800 rounded-2xl px-4 py-2.5 shadow-lg text-xs sm:text-sm font-bold backdrop-blur-md hover:border-amber-500/40 transition-colors">
                            <Trophy className="w-4 h-4 text-amber-400 shrink-0" />
                            <span className="text-slate-200 flex items-center gap-1">
                                {stats.isInitialLoading && stats.masteredCards === null ? (
                                    <span className="inline-block h-3.5 w-6 bg-slate-800 rounded animate-pulse" />
                                ) : (
                                    stats.masteredCards ?? 0
                                )}{' '}
                                <span>{t('home.vocabMastered', 'từ thuộc')}</span>
                            </span>
                        </div>
                        {!isEnglishMode && (
                            <div className="flex items-center gap-2 bg-slate-950/80 border border-slate-800 rounded-2xl px-4 py-2.5 shadow-lg text-xs sm:text-sm font-bold backdrop-blur-md hover:border-emerald-500/40 transition-colors">
                                <Languages className="w-4 h-4 text-emerald-400 shrink-0" />
                                <span className="text-slate-200 flex items-center gap-1">
                                    {kanjiSrsStats.isInitialLoading && kanjiSrsStats.mastered === null ? (
                                        <span className="inline-block h-3.5 w-8 bg-slate-800 rounded animate-pulse" />
                                    ) : (
                                        kanjiSrsStats.mastered ?? 0
                                    )}{' '}
                                    <span>{t('home.kanjiMastered', 'kanji thuộc')}</span>
                                </span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* SRS Telemetry Bento Counters */}
            <div className={`grid grid-cols-2 ${isEnglishMode ? 'lg:grid-cols-3' : 'lg:grid-cols-4'} gap-3 sm:gap-4`}>
                {/* Card 1: Vocab Review */}
                <div 
                    onClick={() => navigate(ROUTES.VOCAB_REVIEW, (stats.dueCards ?? 0) > 0 ? { state: { autoStart: true } } : undefined)}
                    className="group bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border border-slate-200 dark:border-slate-800/80 shadow-md flex items-center justify-between gap-3 cursor-pointer select-none hover:scale-[1.02] active:scale-98 transition-all hover:border-rose-500/40 hover:shadow-rose-500/10"
                >
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-center justify-center shrink-0 group-hover:bg-rose-500/20 transition-colors">
                            <Clock className="w-5 h-5 text-rose-500" />
                        </div>
                        <div className="min-w-0">
                            <StatNumber value={stats.dueCards} isLoading={stats.isInitialLoading} />
                            <div className="text-xs text-slate-500 dark:text-slate-400 font-medium truncate mt-1">{t('home.dueVocab', 'Từ vựng cần ôn')}</div>
                        </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-400 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all shrink-0 hidden sm:block" />
                </div>

                {/* Card 2: Kanji Review / New Cards */}
                {!isEnglishMode ? (
                    <div 
                        onClick={() => navigate(ROUTES.KANJI_REVIEW, (kanjiSrsStats.dueCount ?? 0) > 0 ? { state: { autoStart: true } } : undefined)}
                        className="group bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border border-slate-200 dark:border-slate-800/80 shadow-md flex items-center justify-between gap-3 cursor-pointer select-none hover:scale-[1.02] active:scale-98 transition-all hover:border-amber-500/40 hover:shadow-amber-500/10"
                    >
                        <div className="flex items-center gap-3 min-w-0">
                            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-center justify-center shrink-0 group-hover:bg-amber-500/20 transition-colors">
                                <Target className="w-5 h-5 text-amber-500" />
                            </div>
                            <div className="min-w-0">
                                <StatNumber value={kanjiSrsStats.dueCount} isLoading={kanjiSrsStats.isInitialLoading} />
                                <div className="text-xs text-slate-500 dark:text-slate-400 font-medium truncate mt-1">{t('home.dueKanji', 'Kanji cần ôn')}</div>
                            </div>
                        </div>
                        <ArrowRight className="w-4 h-4 text-slate-400 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all shrink-0 hidden sm:block" />
                    </div>
                ) : (
                    <div 
                        onClick={() => navigate(ROUTES.VOCAB_REVIEW, (stats.dueCards ?? 0) > 0 ? { state: { autoStart: true } } : undefined)}
                        className="group bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border border-slate-200 dark:border-slate-800/80 shadow-md flex items-center justify-between gap-3 cursor-pointer select-none hover:scale-[1.02] active:scale-98 transition-all hover:border-amber-500/40 hover:shadow-amber-500/10"
                    >
                        <div className="flex items-center gap-3 min-w-0">
                            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-center justify-center shrink-0 group-hover:bg-amber-500/20 transition-colors">
                                <Sparkle className="w-5 h-5 text-amber-500" />
                            </div>
                            <div className="min-w-0">
                                <StatNumber value={stats.newCards} isLoading={stats.isInitialLoading} />
                                <div className="text-xs text-slate-500 dark:text-slate-400 font-medium truncate mt-1">Từ vựng mới</div>
                            </div>
                        </div>
                        <ArrowRight className="w-4 h-4 text-slate-400 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all shrink-0 hidden sm:block" />
                    </div>
                )}

                {/* Card 3: Total Cards */}
                <div 
                    onClick={() => navigate(ROUTES.VOCAB_REVIEW)}
                    className="group bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border border-slate-200 dark:border-slate-800/80 shadow-md flex items-center justify-between gap-3 cursor-pointer select-none hover:scale-[1.02] active:scale-98 transition-all hover:border-sky-500/40 hover:shadow-sky-500/10"
                >
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-sky-500/10 border border-sky-500/20 rounded-2xl flex items-center justify-center shrink-0 group-hover:bg-sky-500/20 transition-colors">
                            <BookOpen className="w-5 h-5 text-sky-500" />
                        </div>
                        <div className="min-w-0">
                            <StatNumber value={stats.totalCards} isLoading={stats.isInitialLoading} />
                            <div className="text-xs text-slate-500 dark:text-slate-400 font-medium truncate mt-1">{t('home.totalVocab', 'Tổng từ vựng')}</div>
                        </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-400 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all shrink-0 hidden sm:block" />
                </div>

                {/* Card 4: Total Kanji */}
                {!isEnglishMode && (
                    <div 
                        onClick={() => navigate(ROUTES.KANJI_REVIEW)}
                        className="group bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border border-slate-200 dark:border-slate-800/80 shadow-md flex items-center justify-between gap-3 cursor-pointer select-none hover:scale-[1.02] active:scale-98 transition-all hover:border-emerald-500/40 hover:shadow-emerald-500/10"
                    >
                        <div className="flex items-center gap-3 min-w-0">
                            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center justify-center shrink-0 group-hover:bg-emerald-500/20 transition-colors">
                                <Languages className="w-5 h-5 text-emerald-500" />
                            </div>
                            <div className="min-w-0">
                                <StatNumber value={kanjiSrsStats.total} isLoading={kanjiSrsStats.isInitialLoading} />
                                <div className="text-xs text-slate-500 dark:text-slate-400 font-medium truncate mt-1">{t('home.totalKanji', 'Tổng Kanji')}</div>
                            </div>
                        </div>
                        <ArrowRight className="w-4 h-4 text-slate-400 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all shrink-0 hidden sm:block" />
                    </div>
                )}
            </div>

            {/* Quick Actions Hub */}
            <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                    <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white flex items-center gap-2 font-mono uppercase tracking-wider">
                        <Zap className="w-4 h-4 text-amber-500 animate-pulse" />
                        <span>{t('home.quickLaunchpad', 'Bắt đầu nhanh')}</span>
                    </h2>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                    {quickActions.map((action) => (
                        <button
                            key={action.id}
                            onClick={() => {
                                if (action.id === 'add') {
                                    setShowAddOptions(true);
                                } else {
                                    const isDueAvailable = action.id === 'vocab-review' ? stats.dueCards > 0 : (action.id === 'kanji-review' ? kanjiSrsStats.dueCount > 0 : true);
                                    navigate(action.route, isDueAvailable ? { state: { autoStart: true } } : undefined);
                                }
                            }}
                            className={`relative group isolate bg-gradient-to-br ${action.gradient} text-white rounded-2xl p-5 text-left transition-all duration-300 hover:scale-[1.02] active:scale-98 overflow-hidden min-h-[110px] cursor-pointer shadow-lg select-none border border-white/10 ${action.glow}`}
                        >
                            <div className="relative z-10 flex flex-col justify-between h-full">
                                <div className="flex items-center justify-between">
                                    <div className="p-2.5 rounded-xl bg-white/20 group-hover:scale-110 transition-transform">
                                        <action.icon className="w-5 h-5 text-white" />
                                    </div>
                                    <ArrowRight className="w-5 h-5 text-white/70 group-hover:translate-x-1 group-hover:text-white transition-all" />
                                </div>
                                <div className="mt-3">
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

            {/* Modal Lựa chọn Thêm từ vựng */}
            {showAddOptions && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in font-sans">
                    <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-md shadow-2xl border border-slate-200 dark:border-slate-800 p-6 relative">
                        <button
                            type="button"
                            onClick={() => setShowAddOptions(false)}
                            className="absolute right-4 top-4 w-10 h-10 p-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-300 rounded-xl transition-colors cursor-pointer flex items-center justify-center select-none active:scale-95"
                            title="Đóng cửa sổ"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        <h3 className="text-xl font-black text-slate-900 dark:text-white mb-1 pr-10">
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
                                className="w-full flex items-center gap-4 p-4 min-h-[72px] text-left rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 hover:border-teal-500 transition-all cursor-pointer group select-none active:scale-[0.98]"
                            >
                                <div className="w-12 h-12 rounded-xl bg-teal-500 text-white shrink-0 flex items-center justify-center shadow-md">
                                    <FolderPlus className="w-6 h-6" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h4 className="font-bold text-slate-800 dark:text-slate-100 text-sm group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors">
                                        {t('home.createFolderTitle', 'Tạo học phần mới')}
                                    </h4>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5 leading-snug">
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
                                className="w-full flex items-center gap-4 p-4 min-h-[72px] text-left rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 hover:border-amber-500 transition-all cursor-pointer group select-none active:scale-[0.98]"
                            >
                                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 text-white shrink-0 flex items-center justify-center shadow-md">
                                    <ListPlus className="w-6 h-6" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h4 className="font-bold text-slate-800 dark:text-slate-100 text-sm group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                                        {t('home.quickAddTitle', 'Thêm nhanh từ vựng')}
                                    </h4>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5 leading-snug">
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
