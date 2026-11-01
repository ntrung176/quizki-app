import React, { useMemo, useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
    BookOpen, Languages, FolderPlus, MessageSquare, FileCheck
} from 'lucide-react';
import { ROUTES } from '../../router';
import { appId } from '../../config/firebase';
import BookVocabSyncChecker from '../ui/BookVocabSyncChecker';
import StreakCelebration from '../ui/StreakCelebration';
import SrsModeSelectModal from '../srs/SrsModeSelectModal';
import { isVocabCardDue, isKanjiMastered, isVocabCardMastered, getLearnAheadLimitMs } from '../../utils/srs';
import { subscribeKanjiSrs, computeKanjiSrsStats } from '../../utils/kanjiService';
import { subscribeGrammarSrs, computeGrammarSrsStats } from '../../utils/grammarService';
import { useLanguage } from '../../context/LanguageContext';
import { useTargetLanguage } from '../../context/TargetLanguageContext';
import { isEnglishCard } from '../../utils/englishVocab';
import { isKoreanCard } from '../../languages/ko';

// Modular Home Screen Components
import HomeSrsBentoGrid from '../home/HomeSrsBentoGrid';
import HomeLearningRoadmap from '../home/HomeLearningRoadmap';
import HomeDailyQuests from '../home/HomeDailyQuests';
import HomeQuickLaunchpad from '../home/HomeQuickLaunchpad';
import HomeAddVocabModal from '../home/HomeAddVocabModal';
import HomeTelemetryBar from '../home/HomeTelemetryBar';
import LandingScreen from '../landing/LandingScreen';

const KanaHomeIcon = () => (
    <span className="flex items-center justify-center font-japanese font-black text-sm leading-none select-none text-rose-500 shrink-0">
        あ
    </span>
);

const getCachedJson = (key) => {
    if (!key || typeof window === 'undefined' || !window.localStorage) return null;
    try {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : null;
    } catch (_) {
        return null;
    }
};

/**
 * HomeScreen Component - Modern Pro-Study Dashboard Edition
 * Combines Linear-inspired Bento Grid with WaniKani SRS progress & Duolingo daily habit hooks
 */
const HomeScreen = ({
    displayName,
    totalCards,
    allCards = [],
    userId,
    vocabCollectionPath,
    dailyActivityLogs = [],
    isReviewActive = false,
    calculatedStreak = 0,
    awardXP,
}) => {
    const { t, language } = useLanguage();
    const { isJapaneseMode, isEnglishMode, isKoreanMode, targetLanguage } = useTargetLanguage();
    const navigate = useNavigate();
    const location = useLocation();
    const [isRoadmapHighlighted, setIsRoadmapHighlighted] = useState(false);

    // Auto-scroll and highlight roadmap if arriving with focusRoadmap state
    useEffect(() => {
        if (location.state?.focusRoadmap) {
            setIsRoadmapHighlighted(true);
            setTimeout(() => {
                const el = document.getElementById('home-learning-roadmap');
                if (el) {
                    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }, 300);
            const timer = setTimeout(() => setIsRoadmapHighlighted(false), 3500);
            return () => clearTimeout(timer);
        }
    }, [location.state]);

    // 1. Instant Summary Cache for Kanji Stats (0ms first paint)
    const [kanjiSrsStats, setKanjiSrsStats] = useState(() => {
        const cached = getCachedJson(userId ? `quizki_cached_kanji_srs_stats_${userId}` : null)
            || getCachedJson('quizki_cached_kanji_srs_stats');
        if (cached && typeof cached.total === 'number') {
            return { ...cached, isInitialLoading: false };
        }
        if (userId) {
            const rawSrs = getCachedJson(`quizki_cached_kanji_srs_${userId}`);
            if (rawSrs) {
                const computed = computeKanjiSrsStats(rawSrs);
                return { ...computed, isInitialLoading: false };
            }
        }
        return { total: null, learning: null, mastered: null, dueCount: null, isInitialLoading: true };
    });

    // 2. Instant Summary Cache for Vocab Stats & Streak (0ms first paint)
    const [cachedVocabStats, setCachedVocabStats] = useState(() => {
        const cached = getCachedJson(userId ? `quizki_cached_home_vocab_stats_${userId}` : null)
            || getCachedJson('quizki_cached_home_vocab_stats');
        if (cached && typeof cached.totalCards === 'number') {
            return cached;
        }
        return null;
    });

    // 3. Instant Summary Cache for Grammar Stats (0ms first paint)
    const [grammarSrsStats, setGrammarSrsStats] = useState(() => {
        const cached = getCachedJson(userId ? `quizki_cached_grammar_srs_stats_${userId}` : null)
            || getCachedJson('quizki_cached_grammar_srs_stats');
        if (cached && typeof cached.total === 'number') {
            return { ...cached, isInitialLoading: false };
        }
        if (userId) {
            const rawSrs = getCachedJson(`quizki_cached_grammar_srs_${userId}`);
            if (rawSrs) {
                const computed = computeGrammarSrsStats(rawSrs);
                return { ...computed, isInitialLoading: false };
            }
        }
        return { total: null, learning: null, mastered: null, dueCount: null, isInitialLoading: true };
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
            } catch (_) { }
        }
    }, [calculatedStreak]);

    // Keep cached vocab stats permanently in sync whenever allCards updates
    useEffect(() => {
        if (!allCards || allCards.length === 0 || !userId) return;
        const langCards = allCards.filter(card => {
            if (isEnglishMode) return isEnglishCard(card, true);
            if (isKoreanMode) return isKoreanCard(card, true);
            return !isEnglishCard(card, false) && !isKoreanCard(card, false);
        });
        const threshold = Date.now() + getLearnAheadLimitMs();
        const dueCards = langCards.filter(card => isVocabCardDue(card, threshold)).length;
        const newCards = langCards.filter(card => !card.srsEnabled).length;
        const masteredCards = langCards.filter(card => isVocabCardMastered(card)).length;
        const currentStreak = calculatedStreak > 0 ? calculatedStreak : (cachedStreak ?? 0);
        const payload = {
            dueCards,
            newCards,
            masteredCards,
            streak: currentStreak,
            totalCards: langCards.length
        };
        setCachedVocabStats(payload);
        try {
            localStorage.setItem(`quizki_cached_home_vocab_stats_${userId}`, JSON.stringify(payload));
            localStorage.setItem('quizki_cached_home_vocab_stats', JSON.stringify(payload));
        } catch (_) { }
    }, [allCards, userId, isEnglishMode, isKoreanMode, calculatedStreak, cachedStreak]);

    const [homeTick, setHomeTick] = useState(Date.now());
    useEffect(() => {
        const handleSrsUpdate = () => {
            setHomeTick(Date.now());
            if (userId) {
                try {
                    const rawKanji = localStorage.getItem(`quizki_cached_kanji_srs_${userId}`);
                    if (rawKanji) {
                        const computed = computeKanjiSrsStats(JSON.parse(rawKanji));
                        setKanjiSrsStats({ ...computed, isInitialLoading: false });
                    }
                } catch (_) { }
                try {
                    const rawGrammar = localStorage.getItem(`quizki_cached_grammar_srs_${userId}`);
                    if (rawGrammar) {
                        const computed = computeGrammarSrsStats(JSON.parse(rawGrammar));
                        setGrammarSrsStats({ ...computed, isInitialLoading: false });
                    }
                } catch (_) { }
            }
        };
        const handleLogoutReset = () => {
            setCachedStreak(0);
            setCachedVocabStats({ dueCards: 0, newCards: 0, masteredCards: 0, streak: 0, totalCards: 0 });
            setKanjiSrsStats({ total: 0, dueCount: 0, mastered: 0, learning: 0, isInitialLoading: false });
            setGrammarSrsStats({ total: 0, dueCount: 0, mastered: 0, learning: 0, isInitialLoading: false });
            setHomeTick(Date.now());
        };
        window.addEventListener('srs-updated', handleSrsUpdate);
        window.addEventListener('quizki-user-logged-out', handleLogoutReset);
        return () => {
            window.removeEventListener('srs-updated', handleSrsUpdate);
            window.removeEventListener('quizki-user-logged-out', handleLogoutReset);
        };
    }, [userId]);

    const [showAddOptions, setShowAddOptions] = useState(false);

    // SRS Mode Select Modal Configuration directly on Home Screen
    const [modeModalConfig, setModeModalConfig] = useState({
        isOpen: false,
        type: null,
        title: '',
        cardCount: 0,
        route: '',
        hasDue: false,
    });

    // Real-time subscriptions for Kanji & Grammar
    useEffect(() => {
        if (!userId) {
            setKanjiSrsStats({ total: 0, learning: 0, mastered: 0, dueCount: 0, isInitialLoading: false });
            return;
        }
        let isMounted = true;
        const unsub = subscribeKanjiSrs(userId, (freshSrs) => {
            if (!isMounted) return;
            const computed = computeKanjiSrsStats(freshSrs);
            setKanjiSrsStats({ ...computed, isInitialLoading: false });
            try {
                const serialized = JSON.stringify(computed);
                localStorage.setItem(`quizki_cached_kanji_srs_stats_${userId}`, serialized);
                localStorage.setItem('quizki_cached_kanji_srs_stats', serialized);
            } catch (_) { }
        });
        return () => {
            isMounted = false;
            unsub();
        };
    }, [userId, homeTick]);

    useEffect(() => {
        if (!userId) {
            setGrammarSrsStats({ total: 0, learning: 0, mastered: 0, dueCount: 0, isInitialLoading: false });
            return;
        }
        let isMounted = true;
        const unsub = subscribeGrammarSrs(userId, (freshSrs) => {
            if (!isMounted) return;
            const computed = computeGrammarSrsStats(freshSrs);
            setGrammarSrsStats({ ...computed, isInitialLoading: false });
            try {
                const serialized = JSON.stringify(computed);
                localStorage.setItem(`quizki_cached_grammar_srs_stats_${userId}`, serialized);
                localStorage.setItem('quizki_cached_grammar_srs_stats', serialized);
            } catch (_) { }
        });
        return () => {
            isMounted = false;
            unsub();
        };
    }, [userId, homeTick]);

    // Calculate vocab stats with instant fallback cache
    const stats = useMemo(() => {
        if (!userId) {
            return {
                dueCards: 0,
                newCards: 0,
                masteredCards: 0,
                streak: 0,
                totalCards: 0,
                isInitialLoading: false
            };
        }

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

        const langCards = allCards.filter(card => {
            if (isEnglishMode) return isEnglishCard(card, true);
            if (isKoreanMode) return isKoreanCard(card, true);
            return !isEnglishCard(card, false) && !isKoreanCard(card, false);
        });
        const threshold = Date.now() + getLearnAheadLimitMs();
        const dueCards = langCards.filter(card => isVocabCardDue(card, threshold)).length;
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
        } catch (_) { }

        return result;
    }, [userId, allCards, calculatedStreak, cachedStreak, isEnglishMode, isKoreanMode, cachedVocabStats, homeTick]);

    const handleTriggerReview = (type) => {
        if (type === 'vocab') {
            const dueCount = stats.dueCards ?? 0;
            setModeModalConfig({
                isOpen: true,
                type: 'vocab',
                title: t('home.selectVocabMode', 'Chọn chế độ ôn tập Từ vựng'),
                cardCount: dueCount,
                route: ROUTES.VOCAB_REVIEW,
                hasDue: dueCount > 0,
            });
        } else if (type === 'kanji') {
            const dueCount = kanjiSrsStats.dueCount ?? 0;
            setModeModalConfig({
                isOpen: true,
                type: 'kanji',
                title: t('home.selectKanjiMode', 'Chọn chế độ ôn tập Kanji'),
                cardCount: dueCount,
                route: ROUTES.KANJI_REVIEW,
                hasDue: dueCount > 0,
            });
        } else if (type === 'grammar') {
            const dueCount = grammarSrsStats.dueCount ?? 0;
            setModeModalConfig({
                isOpen: true,
                type: 'grammar',
                title: t('home.selectGrammarMode', 'Chọn chế độ ôn tập Ngữ pháp'),
                cardCount: dueCount,
                route: ROUTES.GRAMMAR_REVIEW,
                hasDue: dueCount > 0,
            });
        }
    };

    const handleSelectSrsMode = (mode) => {
        const { type, route, hasDue } = modeModalConfig;
        setModeModalConfig(prev => ({ ...prev, isOpen: false }));

        if (type === 'vocab') {
            try {
                const saved = localStorage.getItem('quizki_flashcard_settings_v2');
                const parsed = saved ? JSON.parse(saved) : {};
                localStorage.setItem('quizki_flashcard_settings_v2', JSON.stringify({
                    ...parsed,
                    reviewType: mode
                }));
            } catch (_) { }
        } else if (type === 'kanji') {
            try {
                localStorage.setItem('quizki_kanji_review_type', mode);
            } catch (_) { }
        } else if (type === 'grammar') {
            try {
                const saved = localStorage.getItem('quizki_grammar_flashcard_settings_v1');
                const parsed = saved ? JSON.parse(saved) : {};
                localStorage.setItem('quizki_grammar_flashcard_settings_v1', JSON.stringify({
                    ...parsed,
                    reviewType: mode
                }));
            } catch (_) { }
        }

        navigate(route, hasDue ? { state: { autoStart: true, reviewType: mode } } : { state: { reviewType: mode } });
    };

    // Quick action cards adjusted for target language
    const quickActions = useMemo(() => {
        if (isEnglishMode) {
            return [
                {
                    id: 'vocab-review',
                    title: t('home.englishReviewVocabTitle', 'Ôn Tập Từ Vựng'),
                    subtitle: t('home.englishReviewVocabSub', 'Ôn luyện từ vựng tiếng Anh theo thuật toán lặp lại ngắt quãng SRS'),
                    badge: 'Spaced Repetition',
                    badgeClass: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20',
                    icon: BookOpen,
                    iconBg: 'bg-gradient-to-br from-rose-500 to-pink-600 shadow-rose-500/25',
                    glowBg: 'bg-rose-500',
                    route: ROUTES.VOCAB_REVIEW,
                },
                {
                    id: 'add',
                    title: t('home.addVocabTitle', 'Thêm Từ Vựng'),
                    subtitle: t('home.addVocabLaunchpadSub', 'Tạo bộ từ vựng mới hoặc nhập nhanh danh sách từ vựng'),
                    badge: 'Oxford & IELTS',
                    badgeClass: 'bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20',
                    icon: FolderPlus,
                    iconBg: 'bg-gradient-to-br from-teal-500 to-cyan-600 shadow-teal-500/25',
                    glowBg: 'bg-teal-500',
                    route: ROUTES.VOCAB_ADD,
                },
            ];
        }

        if (isKoreanMode) {
            return [
                {
                    id: 'vocab-review',
                    title: t('home.koreanReviewVocabTitle', 'Ôn Tập Từ Vựng'),
                    subtitle: t('home.koreanReviewVocabSub', 'Ôn luyện từ vựng tiếng Hàn theo thuật toán lặp lại ngắt quãng SRS'),
                    badge: 'Spaced Repetition',
                    badgeClass: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20',
                    icon: BookOpen,
                    iconBg: 'bg-gradient-to-br from-rose-500 to-pink-600 shadow-rose-500/25',
                    glowBg: 'bg-rose-500',
                    route: ROUTES.VOCAB_REVIEW,
                },
                {
                    id: 'add',
                    title: t('home.addVocabTitle', 'Thêm Từ Vựng'),
                    subtitle: t('home.addVocabLaunchpadSub', 'Tạo bộ từ vựng mới hoặc nhập nhanh danh sách từ vựng'),
                    badge: t('home.koreanVocabBadge', 'Kho từ tiếng Hàn & TOPIK'),
                    badgeClass: 'bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20',
                    icon: FolderPlus,
                    iconBg: 'bg-gradient-to-br from-teal-500 to-cyan-600 shadow-teal-500/25',
                    glowBg: 'bg-teal-500',
                    route: ROUTES.VOCAB_ADD,
                },
            ];
        }

        // Japanese Mode (4 focused cards for balanced elegance)
        return [
            {
                id: 'kana-study',
                title: t('home.kanaTitle', 'Bảng Chữ Kana'),
                subtitle: t('home.kanaSub', 'Luyện 46 chữ Hiragana, Katakana & tập viết nét'),
                badge: 'Hiragana & Katakana',
                badgeClass: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20',
                icon: KanaHomeIcon,
                iconBg: 'bg-gradient-to-br from-rose-500 to-pink-600 shadow-rose-500/25',
                glowBg: 'bg-rose-500',
                route: ROUTES.KANA,
            },
            {
                id: 'kaiwa-ai',
                title: t('home.kaiwaTitle', 'Phòng Kaiwa AI'),
                subtitle: t('home.kaiwaSub', 'Luyện đối thoại giọng nói 1-1 theo tình huống thực tế'),
                badge: 'Voice AI 1-1',
                badgeClass: 'bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20',
                icon: MessageSquare,
                iconBg: 'bg-gradient-to-br from-teal-500 to-emerald-600 shadow-teal-500/25',
                glowBg: 'bg-teal-500',
                route: ROUTES.JLPT_KAIWA,
            },
            {
                id: 'jlpt-test',
                title: t('home.jlptTestTitle', 'Luyện Đề JLPT'),
                subtitle: t('home.jlptTestSub', 'Bộ đề thi trắc nghiệm chuẩn kỳ thi JLPT N5 đến N1'),
                badge: t('home.jlptTestBadge', 'Thi thử bấm giờ'),
                badgeClass: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20',
                icon: FileCheck,
                iconBg: 'bg-gradient-to-br from-amber-500 to-orange-600 shadow-amber-500/25',
                glowBg: 'bg-amber-500',
                route: ROUTES.JLPT_TEST,
            },
            {
                id: 'add',
                title: t('home.addVocabTitle', 'Thêm Từ Vựng'),
                subtitle: t('home.addVocabSub', 'Tạo học phần mới hoặc nhập nhanh danh sách từ vựng'),
                badge: t('home.addVocabBadge', 'Mở rộng kho từ'),
                badgeClass: 'bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20',
                icon: FolderPlus,
                iconBg: 'bg-gradient-to-br from-teal-500 to-cyan-600 shadow-teal-500/25',
                glowBg: 'bg-teal-500',
                route: ROUTES.VOCAB_ADD,
            },
        ];
    }, [t, isKoreanMode, isEnglishMode]);

    // Motivational quotes
    const isUiEnglish = language === 'en';
    const quotes = isEnglishMode ? [
        'Every day is a new step forward.',
        'Consistency is the key to mastery.',
        'Learn something new every day.',
        'Practice makes perfect.',
        'Small daily improvements lead to long term results.',
        'Believe in yourself and keep pushing forward.',
        'Success is the sum of small efforts repeated day in and day out.',
    ] : isUiEnglish ? [
        '継続は力なり — Keizoku wa chikara nari — Perseverance is strength',
        '千里の道も一歩から — A journey of a thousand miles begins with a single step',
        '七転び八起き — Fall down seven times, stand up eight',
        '石の上にも三年 — Three years on a rock (Patience leads to success)',
        '努力は必ず報われる — Hard work always pays off',
        '一日一歩 — One step every day',
        '夢を追いかけろ — Chase your dreams',
        '失敗は成功のもと — Failure is the mother of success',
        '自分を信じろ — Believe in yourself',
        '一期一会 — Once-in-a-lifetime encounter (Treasure every moment)',
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

    const effectiveDisplayName = useMemo(() => {
        if (!userId) return '';
        if (displayName) return displayName;
        try {
            const cached = localStorage.getItem('quizki_cached_user_profile');
            if (cached) {
                const parsed = JSON.parse(cached);
                if (parsed?.displayName) return parsed.displayName;
            }
        } catch (_) { }
        return '';
    }, [displayName, userId]);

    // Sum of all due cards
    const totalDue = (stats?.dueCards ?? 0) + (isJapaneseMode ? (kanjiSrsStats?.dueCount ?? 0) + (grammarSrsStats?.dueCount ?? 0) : 0);

    const handleActionClick = (action) => {
        if (action.id === 'add') {
            setShowAddOptions(true);
        } else if (action.id === 'vocab-review') {
            handleTriggerReview('vocab');
        } else if (action.id === 'kanji-review') {
            handleTriggerReview('kanji');
        } else if (action.id === 'grammar-review') {
            handleTriggerReview('grammar');
        } else if (action.route) {
            navigate(action.route);
        }
    };

    // If user is not signed in and has not entered guest mode, show the public showcase landing page
    const isGuest = !userId && (
        location.state?.isGuest ||
        (typeof window !== 'undefined' && (
            localStorage.getItem('quizki_guest_mode') === 'true' ||
            !!localStorage.getItem('quizki_user_roadmap')
        ))
    );

    if (!userId && !isGuest) {
        return <LandingScreen />;
    }

    const totalMastered = (stats?.masteredCards ?? 0) + (isJapaneseMode ? (kanjiSrsStats?.mastered ?? 0) + (grammarSrsStats?.mastered ?? 0) : 0);

    return (
        <div className="flex flex-col max-w-7xl mx-auto gap-6 p-3 sm:p-5 md:p-8 animate-fade-in relative z-10 font-sans selection:bg-emerald-500/20">
            {/* Duolingo-styled Guest Conversion Banner */}
            {!userId && (
                <div className="p-4 sm:p-5 rounded-3xl bg-emerald-50 dark:bg-emerald-950/40 border-2 border-emerald-400 dark:border-emerald-700 shadow-md flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-3.5 min-w-0">
                        <div className="w-11 h-11 rounded-2xl bg-emerald-500 text-white flex items-center justify-center font-black text-xl shrink-0 shadow-xs">
                            💡
                        </div>
                        <div className="min-w-0">
                            <h4 className="font-black text-sm sm:text-base text-slate-900 dark:text-white">
                                Bạn đang học ở chế độ Khách (Guest)
                            </h4>
                            <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                                Tạo hồ sơ hoặc đăng nhập để lưu vĩnh viễn tiến trình học tập và bảng xếp hạng!
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2.5 w-full sm:w-auto shrink-0">
                        <button
                            type="button"
                            onClick={() => navigate(`${ROUTES.LOGIN}?mode=login`)}
                            className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer select-none active:translate-y-0.5"
                        >
                            Đăng nhập
                        </button>
                        <button
                            type="button"
                            onClick={() => navigate(`${ROUTES.LOGIN}?mode=register`)}
                            className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider text-white bg-emerald-500 hover:bg-emerald-400 border-b-4 border-emerald-700 active:translate-y-0.5 active:border-b-0 transition-all cursor-pointer shadow-md select-none"
                        >
                            Tạo hồ sơ
                        </button>
                    </div>
                </div>
            )}

            {/* Book Vocab Sync Notification */}
            <BookVocabSyncChecker
                userId={userId}
                appId={appId}
                allCards={allCards}
                vocabCollectionPath={vocabCollectionPath}
            />

            {/* Duolingo-styled 2-Column Responsive Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 relative">
                {/* LEFT / CENTER COLUMN: Primary Focus & Study Pillars (8 cols) */}
                <div className="lg:col-span-8 space-y-6">
                    {/* Welcome Greeting */}
                    <div className="flex items-center justify-between">
                        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                            {effectiveDisplayName ? `${effectiveDisplayName}!` : t('home.helloUser', 'Chào bạn!')} 👋
                        </h1>
                    </div>

                    {/* 2. Unified Study Pillars (Vocab, Kanji, Grammar) */}
                    <HomeSrsBentoGrid
                        stats={stats}
                        kanjiSrsStats={kanjiSrsStats}
                        grammarSrsStats={grammarSrsStats}
                        isJapaneseMode={isJapaneseMode}
                        onTriggerReview={handleTriggerReview}
                    />

                    {/* 3. Personalized Learning Roadmap */}
                    <HomeLearningRoadmap
                        isHighlighted={isRoadmapHighlighted}
                        awardXP={awardXP}
                        userId={userId}
                        allCards={allCards}
                    />
                </div>

                {/* RIGHT COLUMN: Telemetry, Habit Loop & Shortcuts (4 cols - Fixed & Sticky like Duolingo) */}
                <div className="lg:col-span-4 space-y-5 lg:sticky lg:top-4 self-start lg:max-h-[calc(100vh-2rem)] lg:overflow-y-auto custom-scrollbar">
                    {/* 1. Telemetry Bar (Flame Streak, Mastered Cards, Target Language) */}
                    <HomeTelemetryBar
                        streak={stats.streak ?? 0}
                        totalMastered={totalMastered}
                        targetLanguage={targetLanguage}
                    />

                    {/* 2. Daily Quests (Duolingo Right Sidebar Style) */}
                    <HomeDailyQuests
                        userId={userId}
                        totalDue={totalDue}
                        dailyActivityLogs={dailyActivityLogs}
                        isJapaneseMode={isJapaneseMode}
                    />

                    {/* 3. Quick Launchpad */}
                    <HomeQuickLaunchpad
                        actions={quickActions}
                        onActionClick={handleActionClick}
                    />
                </div>
            </div>

            {/* Add Vocab Modal */}
            <HomeAddVocabModal
                isOpen={showAddOptions}
                onClose={() => setShowAddOptions(false)}
            />

            {/* Streak celebration popup */}
            <StreakCelebration
                dailyActivityLogs={dailyActivityLogs}
                currentCalculatedStreak={calculatedStreak}
            />

            {/* SRS Mode Selection Modal directly on Home Screen */}
            <SrsModeSelectModal
                isOpen={modeModalConfig.isOpen}
                onClose={() => setModeModalConfig(prev => ({ ...prev, isOpen: false }))}
                title={modeModalConfig.title}
                cardCount={modeModalConfig.cardCount}
                onSelectMode={handleSelectSrsMode}
            />
        </div>
    );
};

export default HomeScreen;
