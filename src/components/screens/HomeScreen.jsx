import React, { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, onSnapshot, query } from 'firebase/firestore'
import { db, appId } from '../../config/firebase';
import {
    BookOpen, Languages, Target, Flame, Trophy, Clock,
    ArrowRight, Zap, FolderPlus, ListPlus, X, Cpu, Radio, Activity, Repeat2, Lightbulb,
    MessageSquare, Film, FileCheck
} from 'lucide-react';

const KanaHomeIcon = ({ className = 'w-6 h-6' }) => (
    <span className={`${className} flex items-center justify-center font-japanese font-black text-xl leading-none select-none text-current shrink-0`}>
        あ
    </span>
);

const HangulHomeIcon = ({ className = 'w-6 h-6' }) => (
    <span className={`${className} flex items-center justify-center font-sans font-black text-xl leading-none select-none text-current shrink-0`}>
        가
    </span>
);

const IpaHomeIcon = ({ className = 'w-6 h-6' }) => (
    <span className={`${className} flex items-center justify-center font-serif font-black text-base leading-none select-none text-current shrink-0 tracking-tighter`}>
        /ə/
    </span>
);
import { ROUTES } from '../../router';
import BookVocabSyncChecker from '../ui/BookVocabSyncChecker';
import StreakCelebration from '../ui/StreakCelebration';
import { isVocabCardDue, isSrsCardDue, isKanjiMastered, isVocabCardMastered, parseNextReviewMs } from '../../utils/srs';
import { getSharedKanjiList, subscribeKanjiSrs } from '../../utils/kanjiService';
import { getSharedGrammarPointsList, subscribeGrammarSrs } from '../../utils/grammarService';
import { useLanguage } from '../../context/LanguageContext';
import { useTargetLanguage } from '../../context/TargetLanguageContext';
import { isEnglishCard } from '../../utils/englishVocab';
import SrsModeSelectModal from '../srs/SrsModeSelectModal';

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
    const { isJapaneseMode, isEnglishMode, isKoreanMode, targetLanguage } = useTargetLanguage();
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

    // 3. Instant Summary Cache cho Grammar Stats
    const [grammarSrsStats, setGrammarSrsStats] = useState(() => {
        try {
            const cached = localStorage.getItem('quizki_cached_grammar_srs_stats');
            if (cached) {
                const parsed = JSON.parse(cached);
                return { ...parsed, isInitialLoading: false };
            }
        } catch (_) {}
        return { total: null, dueCount: null, isInitialLoading: true };
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

    // SRS Mode Select Modal Configuration directly on Home Screen
    const [modeModalConfig, setModeModalConfig] = useState({
        isOpen: false,
        type: null, // 'vocab' | 'kanji' | 'grammar'
        title: '',
        cardCount: 0,
        route: '',
        hasDue: false,
    });

    const handleTriggerReview = (type) => {
        if (type === 'vocab') {
            const dueCount = stats.dueCards ?? 0;
            setModeModalConfig({
                isOpen: true,
                type: 'vocab',
                title: 'Chọn chế độ ôn tập Từ vựng',
                cardCount: dueCount,
                route: ROUTES.VOCAB_REVIEW,
                hasDue: dueCount > 0,
            });
        } else if (type === 'kanji') {
            const dueCount = kanjiSrsStats.dueCount ?? 0;
            setModeModalConfig({
                isOpen: true,
                type: 'kanji',
                title: 'Chọn chế độ ôn tập Kanji',
                cardCount: dueCount,
                route: ROUTES.KANJI_REVIEW,
                hasDue: dueCount > 0,
            });
        } else if (type === 'grammar') {
            const dueCount = grammarSrsStats.dueCount ?? 0;
            setModeModalConfig({
                isOpen: true,
                type: 'grammar',
                title: 'Chọn chế độ ôn tập Ngữ pháp',
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
            } catch (_) {}
        } else if (type === 'kanji') {
            try {
                localStorage.setItem('quizki_kanji_review_type', mode);
            } catch (_) {}
        } else if (type === 'grammar') {
            try {
                const saved = localStorage.getItem('quizki_grammar_flashcard_settings_v1');
                const parsed = saved ? JSON.parse(saved) : {};
                localStorage.setItem('quizki_grammar_flashcard_settings_v1', JSON.stringify({
                    ...parsed,
                    reviewType: mode
                }));
            } catch (_) {}
        }

        navigate(route, hasDue ? { state: { autoStart: true, reviewType: mode } } : { state: { reviewType: mode } });
    };

    // Fetch kanji SRS stats + activity dates synchronized with Kanji module (deferred for instant 0ms first paint)
    useEffect(() => {
        if (!userId) return;
        let isMounted = true;
        let unsub = () => {};

        const timer = setTimeout(() => {
            getSharedKanjiList().then(kList => {
                if (!isMounted) return;
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
        }, 300);

        return () => {
            isMounted = false;
            clearTimeout(timer);
            unsub();
        };
    }, [userId]);

    // Fetch grammar SRS stats synchronized with Grammar module (deferred for instant 0ms first paint)
    useEffect(() => {
        if (!userId) return;
        let isMounted = true;
        let unsub = () => {};

        const timer = setTimeout(() => {
            getSharedGrammarPointsList().then(gList => {
                if (!isMounted) return;
                unsub = subscribeGrammarSrs(userId, (freshSrs) => {
                    if (!isMounted) return;
                    let total = 0, dueCount = 0;
                    const now = Date.now();
                    (gList || []).forEach(g => {
                        const data = freshSrs && freshSrs[g.id];
                        if (data) {
                            total++;
                            if (isSrsCardDue(data, now)) dueCount++;
                        }
                    });
                    setGrammarSrsStats({ total, dueCount, isInitialLoading: false });
                    try {
                        localStorage.setItem('quizki_cached_grammar_srs_stats', JSON.stringify({ total, dueCount }));
                    } catch (_) {}
                });
            }).catch(err => {
                console.error('Error fetching grammar list in HomeScreen:', err);
            });
        }, 400);

        return () => {
            isMounted = false;
            clearTimeout(timer);
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

    // Quick action cards adjusted for Japanese, Korean and English modes (Bento 6-card system)
    const quickActions = useMemo(() => {
        if (isKoreanMode) {
            return [
                {
                    id: 'hangul-study',
                    title: 'Bảng Chữ Hangul',
                    subtitle: 'Luyện 40 nguyên âm, phụ âm & ghép vần chuẩn Seoul',
                    badge: '40 ký tự & Batchim',
                    badgeClass: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20',
                    icon: HangulHomeIcon,
                    iconBg: 'bg-gradient-to-br from-cyan-500 to-sky-600 shadow-cyan-500/25',
                    glowBg: 'bg-cyan-500',
                    route: ROUTES.HANGUL,
                },
                {
                    id: 'add',
                    title: t('home.addVocabTitle', 'Thêm Từ Vựng'),
                    subtitle: 'Tạo học phần mới hoặc nhập nhanh danh sách từ vựng',
                    badge: 'Kho từ tiếng Hàn',
                    badgeClass: 'bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20',
                    icon: FolderPlus,
                    iconBg: 'bg-gradient-to-br from-teal-500 to-cyan-600 shadow-teal-500/25',
                    glowBg: 'bg-teal-500',
                    route: ROUTES.VOCAB_ADD,
                },
                {
                    id: 'korean-kaiwa',
                    title: 'Luyện Nói AI (말하기)',
                    subtitle: 'Phản xạ giao tiếp tiếng Hàn với trợ lý giọng nói AI',
                    badge: 'Voice AI 1-1',
                    badgeClass: 'bg-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-500/20',
                    icon: MessageSquare,
                    iconBg: 'bg-gradient-to-br from-violet-500 to-purple-600 shadow-violet-500/25',
                    glowBg: 'bg-violet-500',
                    route: ROUTES.JLPT_KAIWA,
                },
                {
                    id: 'grammar-study',
                    title: t('home.learnGrammarTitle', 'Học Ngữ Pháp'),
                    subtitle: 'Mẫu câu tiếng Hàn, cấu trúc ngữ pháp & hội thoại',
                    badge: 'Sơ cấp & Trung cấp',
                    badgeClass: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20',
                    icon: BookOpen,
                    iconBg: 'bg-gradient-to-br from-sky-500 to-blue-600 shadow-sky-500/25',
                    glowBg: 'bg-sky-500',
                    route: ROUTES.GRAMMAR_REVIEW,
                },
                {
                    id: 'kdrama-video',
                    title: 'Video K-Drama',
                    subtitle: 'Luyện nghe nói tự nhiên qua trích đoạn video phim ảnh',
                    badge: 'Shadowing & Sub',
                    badgeClass: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20',
                    icon: Film,
                    iconBg: 'bg-gradient-to-br from-rose-500 to-pink-600 shadow-rose-500/25',
                    glowBg: 'bg-rose-500',
                    route: ROUTES.VIDEO_KAIWA,
                },
                {
                    id: 'topik-test',
                    title: 'Luyện Thi TOPIK',
                    subtitle: 'Luyện tập bộ đề & thi thử chuẩn format TOPIK I & II',
                    badge: 'TOPIK I & II',
                    badgeClass: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20',
                    icon: Trophy,
                    iconBg: 'bg-gradient-to-br from-amber-500 to-orange-600 shadow-amber-500/25',
                    glowBg: 'bg-amber-500',
                    route: ROUTES.JLPT_TEST,
                },
            ];
        }

        if (isEnglishMode) {
            return [
                {
                    id: 'ipa-study',
                    title: 'Bảng Phiên Âm IPA',
                    subtitle: 'Luyện 44 âm chuẩn Oxford & các cặp âm tối thiểu',
                    badge: '44 âm Oxford',
                    badgeClass: 'bg-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-500/20',
                    icon: IpaHomeIcon,
                    iconBg: 'bg-gradient-to-br from-violet-500 to-indigo-600 shadow-violet-500/25',
                    glowBg: 'bg-violet-500',
                    route: ROUTES.IPA,
                },
                {
                    id: 'add',
                    title: t('home.addVocabTitle', 'Thêm Từ Vựng'),
                    subtitle: 'Tạo bộ từ vựng mới hoặc nhập nhanh danh sách',
                    badge: 'Oxford & IELTS',
                    badgeClass: 'bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20',
                    icon: FolderPlus,
                    iconBg: 'bg-gradient-to-br from-teal-500 to-cyan-600 shadow-teal-500/25',
                    glowBg: 'bg-teal-500',
                    route: ROUTES.VOCAB_ADD,
                },
                {
                    id: 'speaking-ai',
                    title: 'Phòng Speaking AI',
                    subtitle: 'Luyện phát âm & hội thoại tiếng Anh tương tác thực tế',
                    badge: 'Voice AI 1-1',
                    badgeClass: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20',
                    icon: MessageSquare,
                    iconBg: 'bg-gradient-to-br from-purple-500 to-fuchsia-600 shadow-purple-500/25',
                    glowBg: 'bg-purple-500',
                    route: ROUTES.JLPT_KAIWA,
                },
                {
                    id: 'grammar-study',
                    title: t('home.learnGrammarTitle', 'Học Ngữ Pháp'),
                    subtitle: 'Ngữ pháp tiếng Anh thực hành, collocations & ví dụ',
                    badge: 'Cấu trúc & Mẫu câu',
                    badgeClass: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20',
                    icon: BookOpen,
                    iconBg: 'bg-gradient-to-br from-sky-500 to-blue-600 shadow-sky-500/25',
                    glowBg: 'bg-sky-500',
                    route: ROUTES.GRAMMAR_REVIEW,
                },
                {
                    id: 'video-shadowing',
                    title: 'Video Shadowing',
                    subtitle: 'Luyện nghe nói qua video YouTube, TED & phim ảnh',
                    badge: 'Shadowing & Sub',
                    badgeClass: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20',
                    icon: Film,
                    iconBg: 'bg-gradient-to-br from-rose-500 to-pink-600 shadow-rose-500/25',
                    glowBg: 'bg-rose-500',
                    route: ROUTES.VIDEO_KAIWA,
                },
                {
                    id: 'ielts-test',
                    title: 'Luyện Thi IELTS / TOEIC',
                    subtitle: 'Bộ đề thi trắc nghiệm bấm giờ & rèn phản xạ',
                    badge: 'Mock Test',
                    badgeClass: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20',
                    icon: Trophy,
                    iconBg: 'bg-gradient-to-br from-amber-500 to-orange-600 shadow-amber-500/25',
                    glowBg: 'bg-amber-500',
                    route: ROUTES.JLPT_TEST,
                },
            ];
        }

        // Japanese Mode (6 balanced cards)
        return [
            {
                id: 'kana-study',
                title: 'Bảng Chữ Kana',
                subtitle: 'Luyện 46 chữ Hiragana, Katakana & tập viết nét',
                badge: 'Hiragana & Katakana',
                badgeClass: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20',
                icon: KanaHomeIcon,
                iconBg: 'bg-gradient-to-br from-rose-500 to-pink-600 shadow-rose-500/25',
                glowBg: 'bg-rose-500',
                route: ROUTES.KANA,
            },
            {
                id: 'add',
                title: t('home.addVocabTitle', 'Thêm Từ Vựng'),
                subtitle: 'Tạo học phần mới hoặc nhập nhanh danh sách từ vựng',
                badge: 'Mở rộng kho từ',
                badgeClass: 'bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20',
                icon: FolderPlus,
                iconBg: 'bg-gradient-to-br from-teal-500 to-cyan-600 shadow-teal-500/25',
                glowBg: 'bg-teal-500',
                route: ROUTES.VOCAB_ADD,
            },
            {
                id: 'kanji-study',
                title: t('home.learnKanjiTitle', 'Thư viện Kanji'),
                subtitle: 'Chinh phục 2136 chữ Hán theo lộ trình N5 đến N1',
                badge: '2136 chữ Hán',
                badgeClass: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20',
                icon: Languages,
                iconBg: 'bg-gradient-to-br from-emerald-500 to-teal-600 shadow-emerald-500/25',
                glowBg: 'bg-emerald-500',
                route: ROUTES.KANJI_REVIEW,
            },
            {
                id: 'grammar-study',
                title: t('home.learnGrammarTitle', 'Học Ngữ Pháp'),
                subtitle: 'Giáo trình Minna, Shinkanzen & mẫu câu ứng dụng',
                badge: 'Giáo trình N5-N1',
                badgeClass: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20',
                icon: BookOpen,
                iconBg: 'bg-gradient-to-br from-sky-500 to-blue-600 shadow-sky-500/25',
                glowBg: 'bg-sky-500',
                route: ROUTES.GRAMMAR_REVIEW,
            },
            {
                id: 'kaiwa-ai',
                title: 'Phòng Kaiwa AI',
                subtitle: 'Luyện đối thoại giọng nói 1-1 theo tình huống thực tế',
                badge: 'Voice AI 1-1',
                badgeClass: 'bg-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-500/20',
                icon: MessageSquare,
                iconBg: 'bg-gradient-to-br from-violet-500 to-purple-600 shadow-violet-500/25',
                glowBg: 'bg-violet-500',
                route: ROUTES.JLPT_KAIWA,
            },
            {
                id: 'jlpt-test',
                title: 'Luyện Đề JLPT',
                subtitle: 'Bộ đề thi trắc nghiệm chuẩn kỳ thi JLPT N5 đến N1',
                badge: 'Thi thử bấm giờ',
                badgeClass: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20',
                icon: FileCheck,
                iconBg: 'bg-gradient-to-br from-amber-500 to-orange-600 shadow-amber-500/25',
                glowBg: 'bg-amber-500',
                route: ROUTES.JLPT_TEST,
            },
        ];
    }, [t, isKoreanMode, isEnglishMode]);

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

    const effectiveDisplayName = useMemo(() => {
        if (displayName) return displayName;
        try {
            const cached = localStorage.getItem('quizki_cached_user_profile');
            if (cached) {
                const parsed = JSON.parse(cached);
                if (parsed?.displayName) return parsed.displayName;
            }
        } catch (_) {}
        return '';
    }, [displayName]);

    return (
        <div className="flex flex-col max-w-7xl mx-auto gap-4 sm:gap-6 p-3 sm:p-5 md:p-8 animate-fade-in relative z-10 font-sans selection:bg-cyan-500/20">
            {/* Book Vocab Sync Notification */}
            <BookVocabSyncChecker
                userId={userId}
                appId={appId}
                allCards={allCards}
                vocabCollectionPath={vocabCollectionPath}
            />

            {/* Unified Hero Header */}
            <div className="relative overflow-hidden bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl sm:rounded-3xl p-4 sm:p-5 md:p-6 text-slate-900 dark:text-white shadow-sm dark:shadow-xl group">
                <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/5 dark:bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-500/5 dark:bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
                
                <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 sm:gap-6">
                    <div className="space-y-2 max-w-2xl flex-1">
                        <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
                            {effectiveDisplayName ? `${effectiveDisplayName}!` : t('home.helloUser', 'Chào bạn!')}
                        </h1>

                        <div className="p-3 bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800/80 rounded-xl shadow-2xs">
                            <p className="text-slate-600 dark:text-slate-300 text-xs sm:text-sm font-medium italic leading-relaxed">
                                "{todayQuote}"
                            </p>
                        </div>
                    </div>

                    {/* Telemetry Stats Pills */}
                    <div className="flex flex-wrap items-center gap-2 font-mono">
                        <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200/90 dark:border-slate-700/70 rounded-xl px-3.5 py-2 text-xs sm:text-sm font-bold shadow-xs">
                            <Flame className="w-4 h-4 text-orange-500 shrink-0" />
                            <span className="text-slate-700 dark:text-slate-200">{stats.streak ?? 0} {t('home.dayStreak', 'ngày streak')}</span>
                        </div>
                        <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200/90 dark:border-slate-700/70 rounded-xl px-3.5 py-2 text-xs sm:text-sm font-bold shadow-xs">
                            <Trophy className="w-4 h-4 text-amber-500 shrink-0" />
                            <span className="text-slate-700 dark:text-slate-200 flex items-center gap-1">
                                {stats.isInitialLoading && stats.masteredCards === null ? (
                                    <span className="inline-block h-3.5 w-6 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
                                ) : (
                                    stats.masteredCards ?? 0
                                )}{' '}
                                <span>{t('home.vocabMastered', 'từ thuộc')}</span>
                            </span>
                        </div>
                        {!isEnglishMode && (
                            <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200/90 dark:border-slate-700/70 rounded-xl px-3.5 py-2 text-xs sm:text-sm font-bold shadow-xs">
                                <Languages className="w-4 h-4 text-emerald-500 shrink-0" />
                                <span className="text-slate-700 dark:text-slate-200 flex items-center gap-1">
                                    {kanjiSrsStats.isInitialLoading && kanjiSrsStats.mastered === null ? (
                                        <span className="inline-block h-3.5 w-8 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
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
            <div className={`grid grid-cols-2 ${!isJapaneseMode ? 'lg:grid-cols-3' : 'lg:grid-cols-4'} gap-3 sm:gap-4`}>
                {/* Card 1: Vocab Review */}
                <div 
                    onClick={() => handleTriggerReview('vocab')}
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
                {isJapaneseMode ? (
                    <div 
                        onClick={() => handleTriggerReview('kanji')}
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
                        onClick={() => handleTriggerReview('vocab')}
                        className="group bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border border-slate-200 dark:border-slate-800/80 shadow-md flex items-center justify-between gap-3 cursor-pointer select-none hover:scale-[1.02] active:scale-98 transition-all hover:border-amber-500/40 hover:shadow-amber-500/10"
                    >
                        <div className="flex items-center gap-3 min-w-0">
                            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-center justify-center shrink-0 group-hover:bg-amber-500/20 transition-colors">
                                <Zap className="w-5 h-5 text-amber-500" />
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
                {isJapaneseMode && (
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
            <div className="space-y-3.5 pt-2">
                <div className="flex items-center justify-between">
                    <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white flex items-center gap-2 font-mono uppercase tracking-wider">
                        <Zap className="w-4 h-4 text-amber-500 animate-pulse" />
                        <span>{t('home.quickLaunchpad', 'Bắt đầu nhanh')}</span>
                    </h2>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
                    {quickActions.map((action) => (
                        <button
                            key={action.id}
                            type="button"
                            onClick={() => {
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
                            }}
                            className="group relative flex flex-col justify-between p-4.5 sm:p-5 rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800/90 shadow-xs hover:shadow-xl hover:-translate-y-1 hover:border-slate-300 dark:hover:border-slate-700 transition-all duration-300 text-left overflow-hidden select-none cursor-pointer"
                        >
                            {/* Ambient glow in background on hover */}
                            <div className={`absolute -right-8 -top-8 w-32 h-32 rounded-full blur-2xl opacity-0 group-hover:opacity-20 dark:group-hover:opacity-30 transition-opacity duration-500 pointer-events-none ${action.glowBg || 'bg-indigo-500'}`} />
                            
                            {/* Top Row: Icon badge + Tag + Arrow */}
                            <div className="relative z-10 flex items-center justify-between gap-2 w-full mb-3.5">
                                <div className="flex items-center gap-2.5 min-w-0">
                                    <div className={`w-11 h-11 rounded-2xl flex items-center justify-center text-white shrink-0 shadow-md ${action.iconBg} group-hover:scale-105 transition-transform duration-300`}>
                                        <action.icon className="w-5 h-5 text-white" />
                                    </div>
                                    {action.badge && (
                                        <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider truncate ${action.badgeClass || 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700/60'}`}>
                                            {action.badge}
                                        </span>
                                    )}
                                </div>

                                <div className="w-8 h-8 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-center text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white group-hover:border-slate-300 dark:group-hover:border-slate-600 transition-all shrink-0">
                                    <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform duration-300" />
                                </div>
                            </div>

                            {/* Bottom: Title & Subtitle */}
                            <div className="relative z-10 space-y-1">
                                <h3 className="font-bold text-base sm:text-lg text-slate-900 dark:text-white tracking-tight group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                                    {action.title}
                                </h3>
                                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium leading-relaxed line-clamp-2">
                                    {action.subtitle}
                                </p>
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
