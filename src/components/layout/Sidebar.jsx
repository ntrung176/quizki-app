import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth, db, appId } from '../../config/firebase';
import { collection, query, onSnapshot, doc, orderBy, limit } from 'firebase/firestore';
import { ROUTES } from '../../router';
import { getLevelFromXp } from '../../utils/scoring';
import {
    Home, BookOpen, LogOut, LogIn, Sun, Moon, ChevronRight, ChevronLeft, X,
    List, Repeat2, FileCheck, Languages, Shield, Crown, Bell,
    MessageSquare, HelpCircle, Trophy, Cpu, Zap, Activity, Bot, Timer, Globe, Film,
    FileText, GitBranch, MoreHorizontal, Layers, Settings, Library, LayoutGrid, TrendingUp, Bookmark, Search,
    Palette
} from 'lucide-react';
import { SafeAvatarImage } from '../ui';
import QuizKiLogo from '../ui/QuizKiLogo';
import LanguageSelector from '../ui/LanguageSelector';
import TargetLanguageSelector from '../ui/TargetLanguageSelector';
import IosLanguageWheelModal from '../ui/IosLanguageWheelModal';
import FloatingFocusWidget from '../ui/FloatingFocusWidget';
import { isVocabCardDue, isSrsCardDue, getLearnAheadLimitMs } from '../../utils/srs';
import { isEnglishCard } from '../../utils/englishVocab';
import { getSharedKanjiList, subscribeKanjiSrs } from '../../utils/kanjiService';
import { getSharedGrammarPointsList, subscribeGrammarSrs } from '../../utils/grammarService';

import { useLanguage } from '../../context/LanguageContext';
import { useTargetLanguage } from '../../context/TargetLanguageContext';
import { useFocus } from '../../context/FocusContext';
import { useChatUnreadCount } from '../../hooks/useChatUnreadCount';

const renderTextWithClickableLinks = (text) => {
    if (!text || typeof text !== 'string') return text;
    const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+)/g;
    const parts = text.split(urlRegex);

    return parts.map((part, i) => {
        if (part.match(urlRegex)) {
            const href = part.startsWith('www.') ? `https://${part}` : part;
            return (
                <a
                    key={i}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="text-cyan-600 dark:text-cyan-400 font-bold underline hover:text-cyan-500 break-all transition-colors cursor-pointer"
                >
                    {part} 🔗
                </a>
            );
        }
        return part;
    });
};

// Sidebar Component - Restored Exact Original Menus with Chatbox & Help Buttons Integrated at Bottom
// Custom Japanese Kana 'あ' icon for Sidebar navigation
const KanaMenuIcon = ({ className = 'w-4.5 h-4.5' }) => (
    <span className={`${className} flex items-center justify-center font-japanese font-black text-sm leading-none select-none text-current shrink-0`}>
        あ
    </span>
);

// Custom Korean Hangul '가' icon for Sidebar navigation
const HangulMenuIcon = ({ className = 'w-4.5 h-4.5' }) => (
    <span className={`${className} flex items-center justify-center font-sans font-black text-sm leading-none select-none text-current shrink-0`}>
        가
    </span>
);

// Custom English IPA '/ə/' icon for Sidebar navigation
const IpaMenuIcon = ({ className = 'w-4.5 h-4.5' }) => (
    <span className={`${className} flex items-center justify-center font-serif font-black text-xs leading-none select-none text-current shrink-0 tracking-tighter`}>
        /ə/
    </span>
);

// Colorful Signature Themes for Navigation Items (Strictly Duolingo Palette: Sky, Rose, Emerald, Amber, Cyan, Teal - Zero Purple)
const MENU_ICON_THEMES = {
    HOME: {
        color: 'text-sky-500 dark:text-sky-400',
        bg: 'bg-sky-50 dark:bg-sky-950/70 border-sky-200/80 dark:border-sky-800/60'
    },
    KANA_STUDY: {
        color: 'text-rose-500 dark:text-rose-400',
        bg: 'bg-rose-50 dark:bg-rose-950/70 border-rose-200/80 dark:border-rose-800/60'
    },
    HANGUL_STUDY: {
        color: 'text-rose-500 dark:text-rose-400',
        bg: 'bg-rose-50 dark:bg-rose-950/70 border-rose-200/80 dark:border-rose-800/60'
    },
    IPA_STUDY: {
        color: 'text-cyan-500 dark:text-cyan-400',
        bg: 'bg-cyan-50 dark:bg-cyan-950/70 border-cyan-200/80 dark:border-cyan-800/60'
    },
    VOCAB_LIST: {
        color: 'text-emerald-500 dark:text-emerald-400',
        bg: 'bg-emerald-50 dark:bg-emerald-950/70 border-emerald-200/80 dark:border-emerald-800/60'
    },
    KANJI_STUDY: {
        color: 'text-amber-500 dark:text-amber-400',
        bg: 'bg-amber-50 dark:bg-amber-950/70 border-amber-200/80 dark:border-amber-800/60'
    },
    DICTIONARY: {
        color: 'text-cyan-500 dark:text-cyan-400',
        bg: 'bg-cyan-50 dark:bg-cyan-950/70 border-cyan-200/80 dark:border-cyan-800/60'
    },
    GRAMMAR: {
        color: 'text-teal-500 dark:text-teal-400',
        bg: 'bg-teal-50 dark:bg-teal-950/70 border-teal-200/80 dark:border-teal-800/60'
    },
    VIDEO_KAIWA: {
        color: 'text-rose-500 dark:text-rose-400',
        bg: 'bg-rose-50 dark:bg-rose-950/70 border-rose-200/80 dark:border-rose-800/60'
    },
    JLPT_KAIWA: {
        color: 'text-sky-500 dark:text-sky-400',
        bg: 'bg-sky-50 dark:bg-sky-950/70 border-sky-200/80 dark:border-sky-800/60'
    },
    JLPT_TEST: {
        color: 'text-orange-500 dark:text-orange-400',
        bg: 'bg-orange-50 dark:bg-orange-950/70 border-orange-200/80 dark:border-orange-800/60'
    },
    HUB: {
        color: 'text-amber-500 dark:text-amber-400',
        bg: 'bg-amber-50 dark:bg-amber-950/70 border-amber-200/80 dark:border-amber-800/60'
    },
    ADMIN: {
        color: 'text-emerald-600 dark:text-emerald-400',
        bg: 'bg-emerald-50 dark:bg-emerald-950/70 border-emerald-200/80 dark:border-emerald-800/60'
    }
};

const Sidebar = ({
    isDarkMode,
    setIsDarkMode,
    displayName,
    isAdmin,
    userId,
    allCards = [],
    isPremium: isPremiumProp = undefined,
    avatar,
    profile,
    onTriggerTour,
    isReviewActive = false,
    isRealExamActive = false
}) => {
    const navigate = useNavigate();
    const location = useLocation();
    const { t } = useLanguage();
    const { targetLanguage, isJapaneseMode, isEnglishMode, isKoreanMode, activeTargetConfig } = useTargetLanguage();
    const {
        status: focusStatus,
        secondsLeft: focusSecondsLeft,
        targetMinutes: targetFocusMinutes,
        setIsModalOpen: setIsFocusModalOpen,
        formatTime: formatFocusTime
    } = useFocus();

    const unreadChatCount = useChatUnreadCount(userId, isAdmin);

    const isPremium = useMemo(() => {
        if (isPremiumProp === true) return true;
        if (!profile) return false;
        const isPremiumUser = (profile.unlockedSpecializedPackages && (
            profile.unlockedSpecializedPackages.includes('premium') ||
            profile.unlockedSpecializedPackages.includes('premium_1m') ||
            profile.unlockedSpecializedPackages.includes('premium_1y') ||
            profile.unlockedSpecializedPackages.includes('premium_3y') ||
            profile.unlockedSpecializedPackages.includes('vocab_zen') ||
            profile.unlockedSpecializedPackages.includes('grammar_zen') ||
            profile.unlockedSpecializedPackages.includes('kanji_zen') ||
            profile.unlockedSpecializedPackages.includes('jlpt_prep')
        )) || false;

        return (
            profile.isPremiumUnlocked === true ||
            profile.isPremium === true ||
            isPremiumUser ||
            (profile.premiumExpiresAt && (() => {
                try {
                    const exp = profile.premiumExpiresAt.toDate ? profile.premiumExpiresAt.toDate() : new Date(profile.premiumExpiresAt);
                    return exp > new Date();
                } catch (e) {
                    return false;
                }
            })())
        ) || false;
    }, [isPremiumProp, profile]);

    const xpDetails = React.useMemo(() => {
        const xp = Math.max(
            Number(profile?.xp || 0),
            Number(profile?.score || 0),
            Number(profile?.totalXp || 0)
        );
        return getLevelFromXp(xp);
    }, [profile?.xp, profile?.score, profile?.totalXp]);

    // Avatar display helper
    const renderAvatar = () => {
        const isPhotoUrl = (v) => typeof v === 'string' && (v.startsWith('data:image/') || v.startsWith('http://') || v.startsWith('https://'));

        const AVATAR_EMOJIS = {
            fox: '🦊', cat: '🐱', dog: '🐶', rabbit: '🐰', bear: '🐻', panda: '🐼', koala: '🐨', tiger: '🐯', lion: '🦁', cow: '🐮',
            pig: '🐷', mouse: '🐭', hamster: '🐹', penguin: '🐧', chicken: '🐔', duck: '🦆', owl: '🦉', eagle: '🦅', parrot: '🦜', flamingo: '🦩',
            frog: '🐸', turtle: '🐢', snake: '🐍', dragon: '🐉', whale: '🐳', dolphin: '🐬', octopus: '🐙', fish: '🐠', shark: '🦈', butterfly: '🦋',
            bee: '🐝', ladybug: '🐞', snail: '🐌', monkey: '🐵', gorilla: '🦍', horse: '🐴', unicorn: '🦄', zebra: '🦓', giraffe: '🦒', elephant: '🐘',
            rhino: '🦏', hippo: '🦛', camel: '🐫', deer: '🦌', wolf: '🐺', bat: '🦇', raccoon: '🦝', sloth: '🦥', hedgehog: '🦔', shrimp: '🦐',
        };

        const activeName = displayName || profile?.displayName || auth?.currentUser?.displayName || (auth?.currentUser?.email ? auth.currentUser.email.split('@')[0] : '');
        const activeAvatar = avatar || profile?.avatar || profile?.photoURL || auth?.currentUser?.photoURL;

        const fallbackChar = (
            <span className="text-lg select-none font-bold">
                {activeName ? activeName.charAt(0).toUpperCase() : '👤'}
            </span>
        );

        if (isPhotoUrl(activeAvatar)) {
            return (
                <SafeAvatarImage
                    src={activeAvatar}
                    alt="Avatar"
                    fallback={fallbackChar}
                />
            );
        }

        const emoji = AVATAR_EMOJIS[activeAvatar];
        if (emoji) {
            return <span className="text-lg select-none">{emoji}</span>;
        }

        return fallbackChar;
    };

    const [isCollapsed, setIsCollapsed] = useState(() => {
        try {
            return localStorage.getItem('quizki_sidebar_collapsed') === 'true';
        } catch (e) {
            return false;
        }
    });

    useEffect(() => {
        try {
            localStorage.setItem('quizki_sidebar_collapsed', String(isCollapsed));
            window.dispatchEvent(new CustomEvent('sidebar-collapse-toggle', { detail: isCollapsed }));
        } catch (e) { }
    }, [isCollapsed]);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const lastMobileToggleRef = useRef(0);

    const handleMobileToggle = useCallback((e) => {
        if (e) {
            if (typeof e.preventDefault === 'function') e.preventDefault();
            if (typeof e.stopPropagation === 'function') e.stopPropagation();
        }
        const now = Date.now();
        if (now - lastMobileToggleRef.current < 400) return;
        lastMobileToggleRef.current = now;
        setIsMobileMenuOpen(prev => !prev);
    }, []);

    // Notifications state
    const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
    const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
    const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
    const profileRef = useRef(null);
    const moreMenuRef = useRef(null);
    const [kanjiDueCount, setKanjiDueCount] = useState(() => {
        try {
            const cached = localStorage.getItem('quizki_cached_kanji_srs_stats');
            if (cached) {
                const parsed = JSON.parse(cached);
                return parsed.dueCount || 0;
            }
        } catch (_) { }
        return 0;
    });
    const [grammarDueCount, setGrammarDueCount] = useState(() => {
        try {
            const cached = localStorage.getItem('quizki_cached_grammar_srs_stats');
            if (cached) {
                const parsed = JSON.parse(cached);
                return parsed.dueCount || 0;
            }
        } catch (_) { }
        return 0;
    });
    const [globalNotifications, setGlobalNotifications] = useState([]);
    const [readNotificationIds, setReadNotificationIds] = useState(() => {
        try {
            return JSON.parse(localStorage.getItem('quizki_read_notifications') || '[]');
        } catch (e) {
            return [];
        }
    });
    const popoverRef = useRef(null);

    // Save read notifications to localStorage
    useEffect(() => {
        localStorage.setItem('quizki_read_notifications', JSON.stringify(readNotificationIds));
    }, [readNotificationIds]);

    // Close mobile menu and more popover on route change
    useEffect(() => {
        setIsMobileMenuOpen(false);
        setIsMoreMenuOpen(false);
    }, [location.pathname]);

    // Lock body scroll when mobile menu is open
    useEffect(() => {
        if (isMobileMenuOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [isMobileMenuOpen]);

    // Close notifications, profile, and more popovers when clicking outside
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (
                popoverRef.current &&
                !popoverRef.current.contains(e.target) &&
                !e.target.closest('[data-notif-trigger]')
            ) {
                setIsNotificationsOpen(false);
            }
            if (profileRef.current && !profileRef.current.contains(e.target)) {
                setIsProfileMenuOpen(false);
            }
            if (moreMenuRef.current && !moreMenuRef.current.contains(e.target)) {
                setIsMoreMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // 3-second ticker + real-time srs-updated event listener
    const [sidebarTick, setSidebarTick] = useState(Date.now());
    const kanjiListRef = useRef([]);
    const kanjiSrsRef = useRef({});
    const grammarListRef = useRef([]);
    const grammarSrsRef = useRef({});

    const updateKanjiCount = useCallback(() => {
        if (!userId) {
            setKanjiDueCount(0);
            return;
        }
        const now = Date.now();
        const threshold = now + getLearnAheadLimitMs();
        const dueCount = (kanjiListRef.current || []).filter(k => {
            const srs = kanjiSrsRef.current[k.id];
            if (!srs) return false;
            return isSrsCardDue(srs, threshold);
        }).length;
        setKanjiDueCount(dueCount);
    }, [userId]);

    const updateGrammarCount = useCallback(() => {
        if (!userId) {
            setGrammarDueCount(0);
            return;
        }
        const now = Date.now();
        const threshold = now + getLearnAheadLimitMs();
        const dueCount = (grammarListRef.current || []).filter(g => {
            const srs = grammarSrsRef.current[g.id];
            if (!srs) return false;
            return isSrsCardDue(srs, threshold);
        }).length;
        setGrammarDueCount(dueCount);
    }, [userId]);

    useEffect(() => {
        const handleSrsUpdate = () => {
            setSidebarTick(Date.now());
            updateKanjiCount();
            updateGrammarCount();
        };
        window.addEventListener('srs-updated', handleSrsUpdate);
        const intervalId = setInterval(handleSrsUpdate, 30000);
        return () => {
            window.removeEventListener('srs-updated', handleSrsUpdate);
            clearInterval(intervalId);
        };
    }, [updateKanjiCount, updateGrammarCount]);

    // Listen to Kanji SRS due count synchronized with Kanji module (deferred to prevent main thread blocking)
    useEffect(() => {
        if (!userId) return;
        let isMounted = true;
        let unsub = () => { };

        const timer = setTimeout(() => {
            getSharedKanjiList().then(kList => {
                if (!isMounted) return;
                kanjiListRef.current = kList || [];

                unsub = subscribeKanjiSrs(userId, (freshSrs) => {
                    if (!isMounted) return;
                    kanjiSrsRef.current = freshSrs || {};
                    updateKanjiCount();
                });
            }).catch(err => {
                console.error('Error fetching kanji list in Sidebar:', err);
            });
        }, 500);

        return () => {
            isMounted = false;
            clearTimeout(timer);
            unsub();
        };
    }, [userId, updateKanjiCount]);

    // Listen to Grammar SRS due count synchronized with Grammar module (deferred)
    useEffect(() => {
        if (!userId) return;
        let isMounted = true;
        let unsub = () => { };

        const timer = setTimeout(() => {
            getSharedGrammarPointsList().then(gList => {
                if (!isMounted) return;
                grammarListRef.current = gList || [];

                unsub = subscribeGrammarSrs(userId, (freshSrs) => {
                    if (!isMounted) return;
                    grammarSrsRef.current = freshSrs || {};
                    updateGrammarCount();
                });
            }).catch(err => {
                console.error('Error fetching grammar list in Sidebar:', err);
            });
        }, 600);

        return () => {
            isMounted = false;
            clearTimeout(timer);
            unsub();
        };
    }, [userId, updateGrammarCount]);

    // Listen to Global Notifications
    useEffect(() => {
        if (!userId || !db) return;
        const q = query(collection(db, `artifacts/${appId}/globalNotifications`), orderBy('createdAt', 'desc'), limit(20));
        const unsub = onSnapshot(q, (snap) => {
            const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setGlobalNotifications(list);
        }, (err) => {
            console.warn('Sidebar notifications listener error:', err);
        });
        return () => unsub();
    }, [userId]);

    // Calculate due SRS vocab count filtered by active target language & ticker
    const dueVocabCount = useMemo(() => {
        const now = sidebarTick;
        const threshold = now + getLearnAheadLimitMs();
        return (allCards || []).filter(card => {
            if (card.srsEnabled === false) return false;
            const lang = card.targetLanguage || (isEnglishCard(card, isEnglishMode) ? 'en' : 'ja');
            if (lang !== targetLanguage) return false;
            return isVocabCardDue(card, threshold);
        }).length;
    }, [allCards, targetLanguage, isEnglishMode, sidebarTick]);
    const [lastSeenDueCount, setLastSeenDueCount] = useState(() => {
        try {
            return parseInt(localStorage.getItem('quizki_last_seen_due_count') || '0');
        } catch (e) {
            return 0;
        }
    });

    // Sync lastSeenDueCount when notifications popover is opened
    useEffect(() => {
        if (isNotificationsOpen) {
            const currentDue = dueVocabCount + kanjiDueCount + grammarDueCount;
            setLastSeenDueCount(currentDue);
            localStorage.setItem('quizki_last_seen_due_count', String(currentDue));
        }
    }, [isNotificationsOpen, dueVocabCount, kanjiDueCount, grammarDueCount]);

    const hasUnread = (dueVocabCount + kanjiDueCount + grammarDueCount) > lastSeenDueCount || globalNotifications.some(n => !readNotificationIds.includes(n.id));

    const markAllAsRead = () => {
        const allIds = globalNotifications.map(n => n.id);
        setReadNotificationIds(allIds);
    };

    // Logout handler
    const handleLogout = async () => {
        try {
            document.body.style.overflow = '';
            document.body.style.pointerEvents = '';
            setIsMobileMenuOpen(false);
            await signOut(auth);
            navigate(ROUTES.HOME);
        } catch (error) {
            console.error('Logout error:', error);
        }
    };

    // Dynamic Menu Items with i18n Translation Support
    const menuItems = React.useMemo(() => {
        const groupStudy = t('nav.groupStudy', 'Học tập');
        const groupPracticeAi = t('nav.groupPractice', 'Luyện tập');
        const groupCommunity = t('nav.groupCommunity', 'Cộng đồng');

        const items = [
            { id: 'HOME', icon: Home, label: t('nav.home', 'Trang chủ'), route: ROUTES.HOME, group: groupStudy },
        ];

        // 1. Chế độ Tiếng Anh & Tiếng Hàn: Khóa hết các menu khác, chỉ để Từ vựng và Trang chủ (+ Quản trị nếu là Admin)
        if (isEnglishMode || isKoreanMode) {
            items.push({ id: 'VOCAB_LIST', icon: BookOpen, label: t('nav.vocab', 'Từ vựng'), route: ROUTES.VOCAB_REVIEW, group: groupStudy });
            if (isAdmin) {
                items.push({ id: 'ADMIN', icon: Shield, label: t('nav.admin', 'Quản trị'), route: ROUTES.ADMIN, group: groupCommunity });
            }
            return items;
        }

        // 2. Nhập môn bảng chữ cái theo từng ngôn ngữ (Tiếng Nhật & Tiếng Hàn)
        if (isJapaneseMode) {
            items.push({ id: 'KANA_STUDY', icon: KanaMenuIcon, label: t('nav.kanaShort', 'Kana'), route: ROUTES.KANA, group: groupStudy });
        } else if (isKoreanMode) {
            items.push({ id: 'HANGUL_STUDY', icon: HangulMenuIcon, label: t('nav.hangulShort', 'Hangul'), route: ROUTES.HANGUL, group: groupStudy });
        }

        // 3. Từ vựng theo ngôn ngữ
        const vocabLabel = isKoreanMode 
            ? t('nav.vocab', 'Từ vựng') 
            : t('nav.vocab', 'Từ vựng');

        items.push(
            { id: 'VOCAB_LIST', icon: BookOpen, label: vocabLabel, route: ROUTES.VOCAB_REVIEW, group: groupStudy },
        );

        // 4. Kanji menu is only relevant for Japanese learning
        if (isJapaneseMode) {
            items.push({ id: 'KANJI_STUDY', icon: Languages, label: t('nav.kanjiShort', 'Kanji'), route: ROUTES.KANJI_REVIEW, group: groupStudy });
            items.push({
                id: 'DICTIONARY',
                icon: Search,
                label: t('nav.dictionary', 'Từ điển'),
                onClick: () => window.dispatchEvent(new CustomEvent('quizki-open-dictionary')),
                group: groupStudy
            });
        }

        const kaiwaLabel = isKoreanMode 
            ? t('nav.koreanSpeakingShort', 'Luyện nói') 
            : t('nav.kaiwaShort', 'Kaiwa');

        const testLabel = isKoreanMode 
            ? t('nav.topikTestShort', 'Thi TOPIK') 
            : t('nav.jlptTestShort', 'Luyện đề');

        items.push(
            { id: 'GRAMMAR', icon: Repeat2, label: t('nav.grammar', 'Ngữ pháp'), route: ROUTES.GRAMMAR_REVIEW, group: groupStudy },
            { id: 'VIDEO_KAIWA', icon: Film, label: isKoreanMode ? t('nav.videoKdramaShort', 'Video') : t('nav.videoKaiwaShort', 'Video'), route: ROUTES.VIDEO_KAIWA, group: groupPracticeAi },
            { id: 'JLPT_KAIWA', icon: MessageSquare, label: kaiwaLabel, route: ROUTES.JLPT_KAIWA, group: groupPracticeAi },
            { id: 'JLPT_TEST', icon: FileCheck, label: testLabel, route: ROUTES.JLPT_TEST, group: groupPracticeAi },
            { id: 'HUB', icon: Trophy, label: t('nav.leaderboardShort', 'Vinh danh'), route: ROUTES.HUB, group: groupCommunity },
        );

        if (isAdmin) {
            items.push({ id: 'ADMIN', icon: Shield, label: t('nav.admin', 'Quản trị'), route: ROUTES.ADMIN, group: groupCommunity });
        }
        return items;
    }, [t, dueVocabCount, kanjiDueCount, grammarDueCount, isAdmin, isJapaneseMode, isEnglishMode, isKoreanMode]);

    const isMenuActive = (item) => {
        const path = location.pathname;
        if (item.id === 'HOME') return path === '/' || path === '/home';
        if (item.id === 'KANA_STUDY') return path.includes('/kana') || path === ROUTES.KANA;
        if (item.id === 'HANGUL_STUDY') return path.includes('/hangul') || path === ROUTES.HANGUL;
        if (item.id === 'IPA_STUDY') return path.includes('/ipa') || path === ROUTES.IPA;
        if (item.id === 'VOCAB_LIST') return path.includes('/vocab') || path.includes('/books');
        if (item.id === 'KANJI_STUDY') return path.includes('/kanji');
        if (item.id === 'GRAMMAR') return path.includes('/grammar');
        if (item.id === 'VIDEO_KAIWA') return path.includes('/kaiwa/video') || path === ROUTES.VIDEO_KAIWA;
        if (item.id === 'JLPT_TEST') return path.includes('/jlpt/test') || path.includes('/jlpt/admin');
        if (item.id === 'JLPT_KAIWA') return (path.includes('/jlpt/kaiwa') || path === '/kaiwa') && !path.includes('/kaiwa/video');
        if (item.id === 'HUB') return path.includes('/hub') || path.includes('/stats');
        if (item.id === 'ADMIN') return path.includes('/admin');
        return path.startsWith(item.route);
    };

    const mobileHeaderTitle = useMemo(() => {
        const path = location.pathname;
        if (path === '/' || path === '/home') return t('nav.home', 'Trang chủ');
        if (path.includes('/vocab') || path.includes('/books')) return t('nav.vocab', 'Từ vựng');
        if (path.includes('/grammar')) return t('nav.grammar', 'Ngữ pháp');
        if (path.includes('/jlpt/test')) return isEnglishMode ? t('nav.examPrep', 'Luyện thi') : isKoreanMode ? t('nav.topikTest', 'Lộ trình TOPIK') : t('nav.jlptTest', 'Ôn thi JLPT');
        if (path.includes('/kanji/study') || path.includes('/kanji/lesson')) return t('nav.learnKanji', 'Học Kanji');
        if (path.includes('/kanji')) return t('nav.kanji', 'Kanji');
        if (path.includes('/kaiwa/video')) return t('nav.videoKaiwa', 'Video Shadowing');
        if (path.includes('/jlpt/kaiwa') || path.includes('/kaiwa')) return isEnglishMode ? t('nav.speakingAi', 'Speaking AI') : t('nav.kaiwa', 'Kitsu trợ lý');
        if (path.includes('/kana') || path.includes('/hangul') || path.includes('/ipa')) return t('nav.kana', 'Bảng chữ');
        if (path.includes('/hub')) return t('nav.leaderboard', 'Bảng vinh danh');
        if (path.includes('/settings') || path.includes('/account')) return t('nav.settings', 'Cài đặt');
        if (path.includes('/upgrade')) return t('common.upgrade', 'Nâng cấp');
        if (path.includes('/admin')) return t('nav.admin', 'Quản trị');
        return 'QuizKi';
    }, [location.pathname, t, isEnglishMode, isKoreanMode]);

    const mobileHeaderSubtitle = useMemo(() => {
        return 'QUIZKI';
    }, []);

    const bottomNavTabs = useMemo(() => {
        const path = location.pathname;
        const isHomeActive = path === '/' || path === '/home';
        const isVocabActive = path.includes('/vocab') || path.includes('/books');
        const isKanjiActive = path.includes('/kanji');
        const isGrammarActive = path.includes('/grammar');
        const isMoreActive = isMobileMenuOpen;

        if (isEnglishMode || isKoreanMode) {
            return [
                {
                    id: 'home',
                    label: t('nav.home', 'Trang chủ'),
                    icon: Home,
                    route: ROUTES.HOME,
                    isActive: isHomeActive && !isMobileMenuOpen,
                    badge: 0,
                    onClick: () => setIsMobileMenuOpen(false)
                },
                {
                    id: 'vocab',
                    label: t('nav.vocab', 'Từ vựng'),
                    icon: BookOpen,
                    route: ROUTES.VOCAB_REVIEW,
                    isActive: isVocabActive && !isMobileMenuOpen,
                    badge: dueVocabCount,
                    onClick: () => setIsMobileMenuOpen(false)
                },
                {
                    id: 'more',
                    label: t('nav.more', 'Thêm'),
                    icon: MoreHorizontal,
                    isActive: isMoreActive,
                    badge: (unreadChatCount > 0 ? unreadChatCount : 0),
                    onClick: (e) => {
                        e.preventDefault();
                        handleMobileToggle();
                    }
                }
            ];
        }

        return [
            {
                id: 'home',
                label: t('nav.home', 'Trang chủ'),
                icon: Home,
                route: ROUTES.HOME,
                isActive: isHomeActive && !isMobileMenuOpen,
                badge: 0,
                onClick: () => setIsMobileMenuOpen(false)
            },
            {
                id: 'vocab',
                label: t('nav.vocab', 'Từ vựng'),
                icon: BookOpen,
                route: ROUTES.VOCAB_REVIEW,
                isActive: isVocabActive && !isMobileMenuOpen,
                badge: dueVocabCount,
                onClick: () => setIsMobileMenuOpen(false)
            },
            {
                id: 'kanji',
                label: isJapaneseMode ? t('nav.kanji', 'Kanji') : isKoreanMode ? t('nav.hanja', 'Hán Hàn') : t('nav.rootWords', 'Từ gốc'),
                icon: Languages,
                route: ROUTES.KANJI_REVIEW,
                isActive: isKanjiActive && !isMobileMenuOpen,
                badge: kanjiDueCount,
                onClick: () => setIsMobileMenuOpen(false)
            },
            {
                id: 'grammar',
                label: t('nav.grammar', 'Ngữ pháp'),
                icon: FileText,
                route: ROUTES.GRAMMAR_REVIEW,
                isActive: isGrammarActive && !isMobileMenuOpen,
                badge: grammarDueCount,
                onClick: () => setIsMobileMenuOpen(false)
            },
            {
                id: 'more',
                label: t('nav.more', 'Thêm'),
                icon: MoreHorizontal,
                isActive: isMoreActive,
                badge: (unreadChatCount > 0 ? unreadChatCount : 0),
                onClick: (e) => {
                    e.preventDefault();
                    handleMobileToggle();
                }
            }
        ];
    }, [location.pathname, isMobileMenuOpen, dueVocabCount, grammarDueCount, kanjiDueCount, unreadChatCount, isJapaneseMode, isEnglishMode, isKoreanMode, handleMobileToggle, t]);

    const studyMenuItems = useMemo(() => {
        if (isEnglishMode || isKoreanMode) {
            return [];
        }

        const items = [];

        // 1. Bảng chữ cái theo ngôn ngữ
        if (isJapaneseMode) {
            items.push({
                id: 'kana',
                label: t('nav.kana', 'Bảng chữ Kana'),
                icon: KanaMenuIcon,
                route: ROUTES.KANA,
                badge: null,
            });
            // 2. Lộ trình Hán tự
            items.push({
                id: 'kanji_study',
                label: t('nav.kanjiStudy', 'Lộ trình Hán tự'),
                icon: Languages,
                route: ROUTES.KANJI_STUDY,
                badge: null,
            });
            // 3. Sổ tay Ngữ pháp
            items.push({
                id: 'grammar_cheatsheets',
                label: t('nav.grammarCheatsheets', 'Sổ tay Ngữ pháp'),
                icon: Bookmark,
                route: ROUTES.GRAMMAR_CHEATSHEETS,
                badge: null,
            });
            // 4. Từ điển Offline
            items.push({
                id: 'dictionary',
                label: t('nav.dictionary', 'Từ điển'),
                icon: Search,
                onClick: () => {
                    setIsMobileMenuOpen(false);
                    window.dispatchEvent(new CustomEvent('quizki-open-dictionary'));
                },
                badge: 'Offline',
            });
        } else if (isKoreanMode) {
            items.push({
                id: 'hangul',
                label: t('nav.hangul', 'Bảng chữ Hangul'),
                icon: HangulMenuIcon,
                route: ROUTES.HANGUL,
                badge: null,
            });
        }

        // 3. Giáo trình & Sách
        items.push({
            id: 'books',
            label: t('nav.textbooks', 'Giáo trình & Sách'),
            icon: Library,
            route: ROUTES.BOOKS,
            badge: null,
        });

        // 4. Video Kaiwa / Shadowing
        items.push({
            id: 'video',
            label: isKoreanMode ? t('nav.videoKdrama', 'Video K-Drama') : t('nav.videoKaiwa', 'Video Kaiwa'),
            icon: Film,
            route: ROUTES.VIDEO_KAIWA,
            badge: null,
        });

        // 5. Phòng Kaiwa AI / Speaking AI
        items.push({
            id: 'kaiwa_ai',
            label: isKoreanMode ? t('nav.koreanSpeaking', 'Luyện nói AI') : t('nav.kaiwa', 'Phòng Kaiwa AI'),
            icon: Bot,
            route: ROUTES.JLPT_KAIWA,
            badge: null,
        });

        // 6. Luyện đề thi JLPT / TOPIK / IELTS
        items.push({
            id: 'jlpt_test',
            label: isKoreanMode ? t('nav.topikTest', 'Luyện thi TOPIK') : t('nav.jlptTest', 'Luyện đề JLPT'),
            icon: FileCheck,
            route: ROUTES.JLPT_TEST,
            badge: null,
        });

        // 7. Bảng vinh danh & Tiến độ
        items.push({
            id: 'hub',
            label: t('nav.leaderboard', 'Bảng vinh danh'),
            icon: Trophy,
            route: ROUTES.HUB,
            badge: null,
        });

        return items;
    }, [isEnglishMode, isJapaneseMode, isKoreanMode, t]);

    const toolMenuItems = useMemo(() => {
        const items = [
            {
                id: 'focus_timer',
                label: t('nav.focusTimer', 'Đồng hồ tập trung'),
                icon: Timer,
                onClick: () => {
                    setIsMobileMenuOpen(false);
                    setIsFocusModalOpen(true);
                },
                badge: (focusStatus === 'focusing' || focusStatus === 'break') ? t('nav.running', 'Đang chạy') : null,
            },
            {
                id: 'admin_chat',
                label: t('nav.chatAdmin', 'Chat với Admin'),
                icon: MessageSquare,
                onClick: () => {
                    setIsMobileMenuOpen(false);
                    window.dispatchEvent(new CustomEvent('open-admin-chat'));
                },
                badge: unreadChatCount > 0 ? unreadChatCount : null,
            },
            {
                id: 'settings',
                label: t('nav.settings', 'Cài đặt hệ thống'),
                icon: Settings,
                route: ROUTES.SETTINGS,
                badge: null,
            },
            {
                id: 'help_tour',
                label: t('nav.userGuide', 'Hướng dẫn sử dụng'),
                icon: HelpCircle,
                onClick: () => {
                    setIsMobileMenuOpen(false);
                    if (onTriggerTour) onTriggerTour();
                    else navigate(ROUTES.HELP);
                },
                badge: null,
            },
            {
                id: 'theme_toggle',
                label: isDarkMode ? t('nav.lightMode', 'Chế độ Sáng') : t('nav.darkMode', 'Chế độ Tối'),
                icon: isDarkMode ? Sun : Moon,
                onClick: () => setIsDarkMode(prev => !prev),
                badge: null,
            },
        ];

        // Admin Management
        if (isAdmin) {
            items.push({
                id: 'admin_panel',
                label: t('nav.adminPanel', 'Quản trị hệ thống'),
                icon: Shield,
                route: ROUTES.ADMIN,
                badge: null,
            });
            items.push({
                id: 'jlpt_admin',
                label: t('nav.examManager', 'Quản lý đề thi'),
                icon: FileCheck,
                route: ROUTES.JLPT_ADMIN,
                badge: null,
            });
        }

        return items;
    }, [focusStatus, unreadChatCount, isDarkMode, isAdmin, onTriggerTour, navigate, setIsDarkMode, setIsFocusModalOpen]);

    const NotificationsPopover = ({ isMobile = false }) => {
        if (!isNotificationsOpen) return null;
        return (
            <div
                ref={popoverRef}
                className={`absolute z-50 w-80 bg-white dark:bg-slate-900 border border-slate-200 dark:border-cyan-500/40 rounded-2xl shadow-2xl p-4 text-left ${isMobile
                    ? 'right-0 top-12 max-h-[80vh] overflow-y-auto'
                    : 'left-4 top-16 max-h-[70vh] overflow-y-auto'
                    }`}
            >
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2 mb-3">
                    <span className="font-bold text-sm text-slate-800 dark:text-white flex items-center gap-1.5 font-mono">
                        <Bell className="w-4 h-4 text-cyan-600 dark:text-cyan-400 font-bold" />
                        {t('nav.yourNotifications', 'Thông báo của bạn')}
                    </span>
                    {globalNotifications.some(n => !readNotificationIds.includes(n.id)) && (
                        <button
                            onClick={markAllAsRead}
                            className="text-xs font-semibold text-cyan-600 dark:text-cyan-400 hover:underline cursor-pointer"
                        >
                            {t('nav.markAllAsRead', 'Đọc tất cả')}
                        </button>
                    )}
                </div>
                <div className="space-y-3">
                    {/* Due Vocab */}
                    {dueVocabCount > 0 && (
                        <button
                            onClick={() => {
                                setIsNotificationsOpen(false);
                                setIsMobileMenuOpen(false);
                                navigate(ROUTES.VOCAB_REVIEW);
                            }}
                            className="w-full p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/50 flex items-start gap-3 hover:scale-[1.01] transition-transform text-left cursor-pointer"
                        >
                            <div className="w-8 h-8 rounded-lg bg-rose-100 dark:bg-rose-900/60 flex items-center justify-center flex-shrink-0">
                                <BookOpen className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                            </div>
                            <div>
                                <h4 className="font-bold text-xs text-rose-800 dark:text-rose-300">{t('nav.vocabDueNotif', 'Từ vựng đến hạn ôn tập')}</h4>
                                <p className="text-[11px] text-rose-700/80 dark:text-rose-400/80 mt-0.5 font-mono">{(t('nav.vocabDueNotifDesc', 'Bạn có {count} từ vựng cần ôn tập ngay.') || '').replace('{count}', dueVocabCount)}</p>
                            </div>
                        </button>
                    )}
                    {/* Due Kanji */}
                    {kanjiDueCount > 0 && (
                        <button
                            onClick={() => {
                                setIsNotificationsOpen(false);
                                setIsMobileMenuOpen(false);
                                navigate(ROUTES.KANJI_REVIEW);
                            }}
                            className="w-full p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/50 flex items-start gap-3 hover:scale-[1.01] transition-transform text-left cursor-pointer"
                        >
                            <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/60 flex items-center justify-center flex-shrink-0">
                                <Languages className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                            </div>
                            <div>
                                <h4 className="font-bold text-xs text-amber-800 dark:text-amber-300">{t('nav.kanjiDueNotif', 'Kanji đến hạn ôn tập')}</h4>
                                <p className="text-[11px] text-amber-700/80 dark:text-amber-400/80 mt-0.5 font-mono">{(t('nav.kanjiDueNotifDesc', 'Bạn có {count} chữ Kanji cần ôn tập.') || '').replace('{count}', kanjiDueCount)}</p>
                            </div>
                        </button>
                    )}
                    {/* Due Grammar */}
                    {grammarDueCount > 0 && (
                        <button
                            onClick={() => {
                                setIsNotificationsOpen(false);
                                setIsMobileMenuOpen(false);
                                navigate(ROUTES.GRAMMAR_REVIEW);
                            }}
                            className="w-full p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/50 flex items-start gap-3 hover:scale-[1.01] transition-transform text-left cursor-pointer"
                        >
                            <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/60 flex items-center justify-center flex-shrink-0">
                                <Repeat2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                            </div>
                            <div>
                                <h4 className="font-bold text-xs text-emerald-800 dark:text-emerald-300">{t('nav.grammarDueNotif', 'Ngữ pháp đến hạn ôn tập')}</h4>
                                <p className="text-[11px] text-emerald-700/80 dark:text-emerald-400/80 mt-0.5 font-mono">{(t('nav.grammarDueNotifDesc', 'Bạn có {count} mẫu ngữ pháp cần ôn tập.') || '').replace('{count}', grammarDueCount)}</p>
                            </div>
                        </button>
                    )}
                    {/* Global System Notifications */}
                    {globalNotifications.map(notif => {
                        const isRead = readNotificationIds.includes(notif.id);
                        return (
                            <div
                                key={notif.id}
                                className={`p-3 rounded-xl border flex items-start gap-3 transition-all ${isRead
                                        ? 'bg-slate-50/50 dark:bg-slate-900/40 border-slate-100 dark:border-slate-800/60 opacity-80'
                                        : 'bg-cyan-50/60 dark:bg-cyan-950/40 border-cyan-200/60 dark:border-cyan-800/50'
                                    }`}
                            >
                                <div className="w-8 h-8 rounded-lg bg-cyan-100 dark:bg-cyan-900/60 flex items-center justify-center flex-shrink-0 mt-0.5">
                                    <Bell className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h4 className="font-bold text-xs text-slate-800 dark:text-slate-200">{notif.title}</h4>
                                    <div className="text-[11px] text-slate-600 dark:text-slate-350 mt-0.5 whitespace-pre-wrap leading-relaxed">
                                        {renderTextWithClickableLinks(notif.message)}
                                    </div>
                                    {notif.link && (
                                        <a
                                            href={notif.link.startsWith('http') ? notif.link : `https://${notif.link}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-1 mt-1.5 text-[10px] font-bold text-cyan-600 dark:text-cyan-400 hover:underline cursor-pointer"
                                        >
                                            {t('nav.openLink', '🔗 Mở liên kết ↗')}
                                        </a>
                                    )}
                                </div>
                            </div>
                        );
                    })}

                    {globalNotifications.length === 0 && dueVocabCount === 0 && kanjiDueCount === 0 && grammarDueCount === 0 && (
                        <p className="text-xs text-slate-400 text-center py-4 font-mono">{t('nav.noNewNotifications', 'Không có thông báo mới')}</p>
                    )}
                </div>
            </div>
        );
    };

    return (
        <>
            {/* Top Fixed Mobile Header Bar */}
            {!isReviewActive && !isRealExamActive && (
                <header className="lg:hidden fixed top-0 left-0 right-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800/80 px-3.5 pb-2 pt-[max(0.625rem,env(safe-area-inset-top))] flex items-center justify-between shadow-xs">
                    {/* Left Logo / Torii Avatar */}
                    <Link
                        to={ROUTES.HOME}
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200/90 dark:border-slate-700/90 flex items-center justify-center shadow-xs active:scale-95 transition-transform shrink-0"
                        title={t('nav.home', 'Trang chủ')}
                    >
                        <div className="w-6.5 h-6.5 rounded-full bg-gradient-to-tr from-emerald-500 via-teal-600 to-cyan-500 flex items-center justify-center text-white shadow-xs">
                            <BookOpen className="w-3.5 h-3.5" />
                        </div>
                    </Link>

                    {/* Center Title */}
                    <div className="flex flex-col items-center justify-center text-center min-w-0 px-2 flex-1">
                        <span className="text-[10px] font-black tracking-widest text-slate-400 dark:text-slate-500 uppercase font-mono leading-none">
                            {mobileHeaderSubtitle}
                        </span>
                        <span className="text-base font-extrabold text-slate-900 dark:text-white leading-tight mt-0.5 truncate max-w-[200px]">
                            {mobileHeaderTitle}
                        </span>
                    </div>

                    {/* Right Actions: Notifications Bell & Avatar */}
                    <div className="flex items-center space-x-2 shrink-0">
                        <div className="relative">
                            <button
                                data-notif-trigger="true"
                                type="button"
                                onClick={() => setIsNotificationsOpen(prev => !prev)}
                                className="w-9 h-9 rounded-full bg-slate-100/90 dark:bg-slate-800/90 text-slate-600 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700/80 flex items-center justify-center cursor-pointer active:scale-95 transition-all hover:border-emerald-500/50"
                                title={t('nav.notifications', 'Thông báo')}
                            >
                                <Bell className="w-4 h-4" />
                                {hasUnread && (
                                    <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full animate-ping" />
                                )}
                            </button>
                            <NotificationsPopover isMobile={true} />
                        </div>

                        {userId || auth?.currentUser ? (
                            <Link
                                to={ROUTES.SETTINGS}
                                onClick={() => setIsMobileMenuOpen(false)}
                                className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-[9px] font-bold text-slate-700 dark:text-slate-300 overflow-hidden shadow-xs active:scale-95 transition-transform shrink-0"
                                title={t('nav.personalSettings', 'Trang cá nhân & Cài đặt')}
                            >
                                {renderAvatar()}
                            </Link>
                        ) : (
                            <Link
                                to={ROUTES.LOGIN}
                                onClick={() => setIsMobileMenuOpen(false)}
                                className="px-2.5 py-1.5 rounded-full bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold text-xs shadow-xs active:scale-95 transition-transform shrink-0 flex items-center gap-1"
                                title={t('nav.login', 'Đăng nhập')}
                            >
                                <LogIn className="w-3.5 h-3.5" />
                                <span>{t('nav.login', 'Đăng nhập')}</span>
                            </Link>
                        )}
                    </div>
                </header>
            )}

            {/* Mobile Bottom Navigation Bar - Fixed at bottom matching iOS native proportion */}
            {!isReviewActive && !isRealExamActive && (
                <nav 
                    className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-white/98 dark:bg-slate-900/98 backdrop-blur-md border-t border-slate-200/80 dark:border-slate-800/80 shadow-[0_-2px_12px_rgba(0,0,0,0.04)] dark:shadow-[0_-4px_20px_rgba(0,0,0,0.3)] transition-colors select-none"
                    style={{
                        paddingTop: '6px',
                        paddingBottom: 'max(8px, env(safe-area-inset-bottom, 8px))'
                    }}
                >
                    <div className="grid grid-cols-5 items-center max-w-lg mx-auto px-1">
                        {bottomNavTabs.map((tab) => {
                            const TabIcon = tab.icon;
                            return (
                                <Link
                                    key={tab.id}
                                    to={tab.route || '#'}
                                    onClick={tab.onClick}
                                    className="flex flex-col items-center justify-center group active:scale-95 transition-transform"
                                >
                                    <div className={`relative w-12 sm:w-13 h-7 rounded-full flex items-center justify-center transition-all duration-200 ${
                                        tab.isActive
                                            ? 'bg-[#e6f4ea] dark:bg-emerald-950/80 text-[#137333] dark:text-emerald-400 shadow-xs'
                                            : 'text-slate-500 dark:text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-300'
                                    }`}>
                                        <TabIcon className={`w-4.5 h-4.5 ${tab.isActive ? 'stroke-[2.2]' : 'stroke-[1.8]'}`} />
                                        {tab.badge > 0 && (
                                            <span className="absolute -top-1.5 -right-2 min-w-[16px] h-3.5 px-1 bg-rose-500 text-white text-[9px] font-mono font-black rounded-full flex items-center justify-center shadow-xs">
                                                {tab.badge > 999 ? '999+' : tab.badge}
                                            </span>
                                        )}
                                    </div>
                                    <span className={`text-[10.5px] mt-0.5 leading-tight tracking-tight transition-colors ${
                                        tab.isActive
                                            ? 'font-bold text-slate-900 dark:text-white'
                                            : 'font-medium text-slate-600 dark:text-slate-400'
                                    }`}>
                                        {tab.label}
                                    </span>
                                </Link>
                            );
                        })}
                    </div>
                </nav>
            )}

            {/* "Khám phá QUIZKI" Bottom Sheet Modal (Toggled by "Thêm" Bottom Nav Tab) */}
            {isMobileMenuOpen && (
                <div className="lg:hidden fixed inset-0 z-50 flex flex-col justify-end">
                    {/* Backdrop */}
                    <div
                        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity animate-fade-in"
                        onClick={() => setIsMobileMenuOpen(false)}
                    />

                    {/* Bottom Sheet Container */}
                    <div className="relative z-10 bg-white dark:bg-slate-900 rounded-t-[28px] max-h-[88vh] flex flex-col overflow-hidden shadow-2xl border-t border-slate-200/80 dark:border-slate-800 animate-slide-up">
                        {/* Drag Pill Handle */}
                        <div className="pt-3 pb-1 flex justify-center shrink-0">
                            <div className="w-10 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full" />
                        </div>

                        {/* Header: Title & Close Button */}
                        <div className="px-5 py-2.5 flex items-start justify-between shrink-0">
                            <div>
                                <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                                    {t('nav.exploreTitle', 'Khám phá QUIZKI')}
                                </h2>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-snug">
                                    {t('nav.exploreSub', 'Toàn bộ không gian học tập của bạn, được sắp xếp gọn trong một nơi.')}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsMobileMenuOpen(false)}
                                className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center transition-colors shrink-0 ml-3 mt-0.5 cursor-pointer shadow-2xs"
                                title={t('common.close', 'Đóng')}
                            >
                                <X className="w-4.5 h-4.5" />
                            </button>
                        </div>

                        {/* Scrollable Content Body */}
                        <div className="px-4 pt-2 pb-6 space-y-3.5 overflow-y-auto flex-1 overscroll-contain">
                            {/* Group 1: Study & Features */}
                            <div className="space-y-2">
                                <div className="flex items-center gap-1.5 px-1 text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider font-mono">
                                    <span>{t('nav.studyGroupHeader', '📚 HỌC PHẦN & TÍNH NĂNG')}</span>
                                </div>
                                <div className="grid grid-cols-2 gap-2.5">
                                    {studyMenuItems.map((item) => {
                                        const ItemIcon = item.icon;
                                        const isCurrentActive = item.route ? isMenuActive({ id: item.id.toUpperCase(), route: item.route }) : false;
                                        const content = (
                                            <>
                                                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                                                    isCurrentActive
                                                        ? 'bg-emerald-500 text-white shadow-xs'
                                                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 group-hover:bg-emerald-100 dark:group-hover:bg-emerald-950/60 group-hover:text-emerald-600 dark:group-hover:text-emerald-400'
                                                }`}>
                                                    <ItemIcon className="w-4.5 h-4.5" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <span className={`text-xs font-bold block truncate ${
                                                        isCurrentActive
                                                            ? 'text-emerald-700 dark:text-emerald-400'
                                                            : 'text-slate-800 dark:text-slate-200 group-hover:text-emerald-600 dark:group-hover:text-emerald-400'
                                                    }`}>
                                                        {item.label}
                                                    </span>
                                                </div>
                                                {item.badge && (
                                                    <span className="px-1.5 py-0.5 rounded-full text-[9px] font-mono font-black bg-rose-500 text-white shadow-xs shrink-0">
                                                        {item.badge}
                                                    </span>
                                                )}
                                            </>
                                        );

                                        const cardClass = `flex items-center gap-3 p-3 rounded-2xl border transition-all active:scale-[0.98] cursor-pointer group shadow-2xs text-left ${
                                            isCurrentActive
                                                ? 'bg-emerald-50/90 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-500/50'
                                                : 'bg-white dark:bg-slate-800/80 border-slate-200/90 dark:border-slate-750 hover:border-emerald-400 dark:hover:border-emerald-500/50'
                                        }`;

                                        if (item.route) {
                                            return (
                                                <Link
                                                    key={item.id}
                                                    to={item.route}
                                                    onClick={() => setIsMobileMenuOpen(false)}
                                                    className={cardClass}
                                                >
                                                    {content}
                                                </Link>
                                            );
                                        }

                                        return (
                                            <button
                                                key={item.id}
                                                type="button"
                                                onClick={item.onClick}
                                                className={cardClass}
                                            >
                                                {content}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Group 2: Tools & Utilities */}
                            <div className="space-y-2 pt-1.5">
                                <div className="flex items-center gap-1.5 px-1 text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider font-mono">
                                    <span>{t('nav.toolsGroupHeader', '🛠️ CÔNG CỤ & TIỆN ÍCH')}</span>
                                </div>
                                <div className="grid grid-cols-2 gap-2.5">
                                    {toolMenuItems.map((item) => {
                                        const ItemIcon = item.icon;
                                        const isCurrentActive = item.route ? isMenuActive({ id: item.id.toUpperCase(), route: item.route }) : false;
                                        const content = (
                                            <>
                                                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                                                    isCurrentActive
                                                        ? 'bg-emerald-500 text-white shadow-xs'
                                                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 group-hover:bg-emerald-100 dark:group-hover:bg-emerald-950/60 group-hover:text-emerald-600 dark:group-hover:text-emerald-400'
                                                }`}>
                                                    <ItemIcon className="w-4.5 h-4.5" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <span className={`text-xs font-bold block truncate ${
                                                        isCurrentActive
                                                            ? 'text-emerald-700 dark:text-emerald-400'
                                                            : 'text-slate-800 dark:text-slate-200 group-hover:text-emerald-600 dark:group-hover:text-emerald-400'
                                                    }`}>
                                                        {item.label}
                                                    </span>
                                                </div>
                                                {item.badge && (
                                                    <span className="px-1.5 py-0.5 rounded-full text-[9px] font-mono font-black bg-rose-500 text-white shadow-xs shrink-0">
                                                        {item.badge}
                                                    </span>
                                                )}
                                            </>
                                        );

                                        const cardClass = `flex items-center gap-3 p-3 rounded-2xl border transition-all active:scale-[0.98] cursor-pointer group shadow-2xs text-left ${
                                            isCurrentActive
                                                ? 'bg-emerald-50/90 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-500/50'
                                                : 'bg-white dark:bg-slate-800/80 border-slate-200/90 dark:border-slate-750 hover:border-emerald-400 dark:hover:border-emerald-500/50'
                                        }`;

                                        if (item.route) {
                                            return (
                                                <Link
                                                    key={item.id}
                                                    to={item.route}
                                                    onClick={() => setIsMobileMenuOpen(false)}
                                                    className={cardClass}
                                                >
                                                    {content}
                                                </Link>
                                            );
                                        }

                                        return (
                                            <button
                                                key={item.id}
                                                type="button"
                                                onClick={item.onClick}
                                                className={cardClass}
                                            >
                                                {content}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* User Profile Capsule (if logged in) */}
                            {(userId || auth?.currentUser) && (
                                <Link
                                    to={ROUTES.SETTINGS}
                                    onClick={() => setIsMobileMenuOpen(false)}
                                    className="p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 hover:border-emerald-400 dark:hover:border-emerald-500/50 rounded-2xl flex items-center gap-3 shadow-2xs active:scale-[0.99] transition-all cursor-pointer group"
                                >
                                    <div className="w-9 h-9 rounded-full bg-white dark:bg-slate-800 border border-emerald-500/40 flex items-center justify-center text-xs font-bold shrink-0 overflow-hidden shadow-inner group-hover:scale-105 transition-transform">
                                        {renderAvatar()}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-1.5">
                                            <span className="font-extrabold text-sm text-slate-800 dark:text-white truncate">
                                                {displayName || profile?.displayName || auth?.currentUser?.displayName || (auth?.currentUser?.email ? auth.currentUser.email.split('@')[0] : t('nav.learner', 'Người học'))}
                                            </span>
                                            {isPremium ? (
                                                <span className="bg-amber-500/15 text-amber-600 dark:text-amber-400 text-[9px] font-mono font-black px-1.5 py-0.5 rounded border border-amber-500/30">PREMIUM</span>
                                            ) : (
                                                <span className="bg-slate-200/60 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[9px] font-mono font-bold px-1.5 py-0.5 rounded">FREE</span>
                                            )}
                                        </div>
                                        <p className="text-[10px] text-slate-400 font-mono mt-0.5">LV {xpDetails.level}</p>
                                    </div>
                                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-500 shrink-0 transition-colors" />
                                </Link>
                            )}

                            {/* 2-Column Language Selectors */}
                            <div className="grid grid-cols-2 gap-2 pt-0.5">
                                <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-800/80 p-2 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
                                    <span className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 pl-1">🎯 {t('nav.targetLangLabel', 'HỌC')}</span>
                                    <TargetLanguageSelector isAdmin={isAdmin} />
                                </div>
                                <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-800/80 p-2 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
                                    <span className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 pl-1">🌐 {t('nav.uiLangLabel', 'NGÔN NGỮ')}</span>
                                    <LanguageSelector compact={true} />
                                </div>
                            </div>

                            {/* Upgrade Button */}
                            <Link
                                to={ROUTES.UPGRADE}
                                onClick={() => setIsMobileMenuOpen(false)}
                                className="w-full flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-extrabold text-xs shadow-sm active:scale-98 transition-transform"
                            >
                                <Crown className="w-4 h-4 fill-white" />
                                <span>{t('common.upgradeShort', 'Nâng cấp')}</span>
                            </Link>

                            {/* Logout or Login Button */}
                            {userId ? (
                                <button
                                    onClick={handleLogout}
                                    className="w-full flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-200 dark:border-rose-800/80 text-xs font-extrabold cursor-pointer hover:bg-rose-100 dark:hover:bg-rose-900/60 transition-colors"
                                >
                                    <LogOut className="w-3.5 h-3.5" />
                                    <span>{t('common.logout', 'Đăng xuất')}</span>
                                </button>
                            ) : (
                                <Link
                                    to={ROUTES.LOGIN}
                                    onClick={() => setIsMobileMenuOpen(false)}
                                    className="w-full flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 border-b-2 border-emerald-700 active:translate-y-0.5 text-white text-xs font-black uppercase tracking-wider shadow-sm transition-all"
                                >
                                    <LogIn className="w-3.5 h-3.5 stroke-[2.5]" />
                                    <span>{t('common.login', 'Đăng nhập')}</span>
                                </Link>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Desktop Cyber-AI Futuristic Sidebar */}
            <aside className={`hidden lg:flex flex-col fixed left-0 top-0 bottom-0 z-40 transition-[width] duration-200 ease-out ${isCollapsed ? 'w-20' : 'w-44'} bg-white dark:bg-slate-900 border-r-2 border-slate-200 dark:border-slate-800 shadow-xl select-none`}>
                {/* Brand Logo Header */}
                <div className={`p-2 border-b-2 border-slate-200 dark:border-slate-800 flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
                    <Link
                        to={ROUTES.HOME}
                        className="flex items-center min-w-0 group cursor-pointer"
                    >
                        <QuizKiLogo size="sm" showSubtitle={false} showAiBadge={false} isIconOnly={isCollapsed} />
                    </Link>

                    {!isCollapsed && (
                        <div className="flex items-center gap-1 shrink-0">
                            {userId && (
                                <div className="relative">
                                    <button
                                        data-notif-trigger="true"
                                        type="button"
                                        onClick={() => setIsNotificationsOpen(prev => !prev)}
                                        className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-emerald-400 active:scale-95 transition-all relative cursor-pointer flex items-center justify-center"
                                        title={t('nav.notifications', 'Thông báo')}
                                    >
                                        <Bell className="w-3.5 h-3.5" />
                                        {hasUnread && (
                                            <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 bg-rose-500 rounded-full animate-ping"></span>
                                        )}
                                    </button>
                                    <NotificationsPopover isMobile={false} />
                                </div>
                            )}
                            <button
                                onClick={() => setIsCollapsed(true)}
                                className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-slate-700 dark:hover:text-white hover:border-slate-300 dark:hover:border-slate-600 active:scale-95 transition-all flex items-center justify-center cursor-pointer"
                                title={t('nav.collapseSidebar', 'Thu gọn Sidebar')}
                            >
                                <ChevronLeft className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    )}
                </div>

                {/* Guest Login CTA (Clean dedicated row below logo, never overlapping) */}
                {!isCollapsed && !userId && (
                    <div className="p-2 border-b-2 border-slate-200 dark:border-slate-800">
                        <Link
                            to={ROUTES.LOGIN}
                            className="w-full py-2.5 px-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 border-2 border-emerald-600 border-b-4 border-b-emerald-700 active:translate-y-0.5 active:border-b-2 text-white font-black text-xs uppercase tracking-wide flex items-center justify-center gap-2 shadow-xs transition-all select-none cursor-pointer"
                        >
                            <LogIn className="w-4 h-4 stroke-[2.5]" />
                            <span>{t('common.login', 'Đăng nhập')}</span>
                        </Link>
                    </div>
                )}

                {/* Collapsed Login Action (when not logged in) */}
                {isCollapsed && !userId && (
                    <div className="p-2 border-b-2 border-slate-200 dark:border-slate-800 flex justify-center">
                        <Link
                            to={ROUTES.LOGIN}
                            className="w-10 h-10 rounded-2xl bg-emerald-500 hover:bg-emerald-400 border-2 border-emerald-600 border-b-4 border-b-emerald-700 flex items-center justify-center text-white shadow-xs active:translate-y-0.5 active:border-b-2 transition-all cursor-pointer"
                            title={t('common.login', 'Đăng nhập')}
                        >
                            <LogIn className="w-4 h-4 stroke-[2.5]" />
                        </Link>
                    </div>
                )}

                {/* User Profile Capsule (Only if logged in) */}
                {!isCollapsed && userId && (
                    <div className="p-2 border-b-2 border-slate-200 dark:border-slate-800 relative" ref={profileRef}>
                        <div
                            onClick={() => setIsProfileMenuOpen(prev => !prev)}
                            className="flex items-center gap-2.5 bg-slate-50 dark:bg-slate-800/60 border-2 border-b-4 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 rounded-2xl p-2 active:translate-y-0.5 active:border-b-2 transition-all w-full cursor-pointer group min-w-0 shadow-2xs"
                            title={t('nav.profile', 'Tài khoản cá nhân')}
                        >
                            {/* Avatar with Premium ring accent */}
                            <div className={`w-9 h-9 rounded-full bg-white dark:bg-slate-800 border-2 flex items-center justify-center text-[10px] font-bold text-slate-700 dark:text-slate-300 overflow-hidden shadow-xs group-hover:scale-105 transition-transform shrink-0 ${
                                isPremium 
                                    ? 'border-amber-400 dark:border-amber-500 ring-2 ring-amber-400/20' 
                                    : 'border-slate-300 dark:border-slate-600'
                            }`}>
                                {renderAvatar()}
                            </div>

                            {/* Level & Premium Info */}
                            <div className="flex flex-col min-w-0 flex-1 justify-center gap-1">
                                {isPremium ? (
                                    <span className="text-[9.5px] font-mono font-black uppercase tracking-wider text-amber-500 dark:text-amber-400 flex items-center gap-1">
                                        <Crown className="w-3 h-3 fill-amber-500 text-amber-500 shrink-0" />
                                        <span>{t('nav.premiumAccount', 'PREMIUM')}</span>
                                    </span>
                                ) : (
                                    <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                                        {t('nav.freeAccount', 'FREE')}
                                    </span>
                                )}
                                <div className="flex items-center">
                                    <span className="inline-flex items-center gap-1 bg-emerald-500 text-white text-[8.5px] font-mono font-black px-2 py-0.5 rounded-full shadow-2xs leading-none">
                                        <Zap className="w-2.5 h-2.5 fill-white text-white shrink-0" />
                                        <span>LV {xpDetails.level}</span>
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Profile Quick Dropdown */}
                        {isProfileMenuOpen && (
                            <div className="absolute left-2.5 right-2.5 top-full mt-1.5 bg-white dark:bg-slate-900 border-2 border-b-4 border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl z-50 p-1.5 space-y-1 animate-fade-in">
                                <Link
                                    to={ROUTES.SETTINGS}
                                    onClick={() => setIsProfileMenuOpen(false)}
                                    className="flex items-center gap-2 px-2.5 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                >
                                    <span>⚙️ {t('nav.personalSettings', 'Cài đặt cá nhân')}</span>
                                </Link>
                                <button
                                    onClick={() => {
                                        setIsProfileMenuOpen(false);
                                        handleLogout();
                                    }}
                                    className="w-full flex items-center gap-2 px-2.5 py-2 rounded-xl text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors cursor-pointer"
                                >
                                    <LogOut className="w-4 h-4 text-rose-500 shrink-0" />
                                    <span>{t('common.logout', 'Đăng xuất')}</span>
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {/* Grouped Navigation Menu */}
                <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto custom-scrollbar">
                    {menuItems.map((item, idx) => {
                        const isFirstInGroup = idx === 0 || menuItems[idx - 1].group !== item.group;
                        const active = isMenuActive(item);
                        const IconComponent = item.icon;
                        const theme = MENU_ICON_THEMES[item.id] || {
                            color: 'text-slate-600 dark:text-slate-300',
                            bg: 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                        };

                        return (
                            <React.Fragment key={item.id}>
                                {!isCollapsed && isFirstInGroup && (
                                    <div className="pt-2 pb-0.5 px-2 text-[9.5px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 select-none">
                                        {item.group}
                                    </div>
                                )}
                                <div className="relative group">
                                    <Link
                                        to={item.disabled ? '#' : (item.route || '#')}
                                        onClick={(e) => {
                                            if (item.disabled) e.preventDefault();
                                            if (item.onClick) {
                                                e.preventDefault();
                                                item.onClick();
                                            }
                                        }}
                                        className={`w-full flex items-center ${isCollapsed ? 'justify-center p-2' : 'justify-between px-2.5 py-1.5'} rounded-2xl transition-all duration-150 relative select-none ${
                                            item.disabled
                                                ? 'cursor-not-allowed opacity-40 text-slate-400'
                                                : active
                                                    ? 'bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400 border-2 border-b-4 border-sky-400 dark:border-sky-500 font-black shadow-xs active:translate-y-0.5 active:border-b-2'
                                                    : 'border-2 border-b-4 border-transparent hover:border-slate-200 dark:hover:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white font-bold active:translate-y-0.5 active:border-b-2'
                                        }`}
                                        title={isCollapsed ? item.label : undefined}
                                    >
                                        <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'space-x-2.5'} min-w-0`}>
                                            {/* Colorful App Icon Badge */}
                                            <div className={`w-7 h-7 rounded-xl border flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 shadow-2xs ${
                                                active
                                                    ? 'bg-sky-500 text-white border-sky-600 shadow-xs'
                                                    : `${theme.bg} ${theme.color}`
                                            }`}>
                                                <IconComponent className={`w-4 h-4 shrink-0 ${active ? 'text-white stroke-[2.3]' : 'stroke-[2.2]'}`} />
                                            </div>

                                            {!isCollapsed && (
                                                <span className={`text-[11.5px] tracking-tight truncate ${active ? 'font-black text-sky-600 dark:text-sky-400' : 'font-extrabold text-slate-700 dark:text-slate-200'}`}>
                                                    {item.label}
                                                </span>
                                            )}
                                        </div>

                                        {!isCollapsed && item.badge > 0 && (
                                            <span className="min-w-[17px] px-1.5 py-0.2 rounded-full text-[9.5px] font-black font-mono bg-rose-500 text-white border-b-2 border-rose-700 shadow-xs flex items-center justify-center shrink-0">
                                                {item.badge}
                                            </span>
                                        )}
                                    </Link>
                                </div>
                            </React.Fragment>
                        );
                    })}
                </nav>

                {/* Streamlined Bottom Duolingo Controls */}
                <div className="p-1.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/70 relative select-none" ref={moreMenuRef}>
                    {/* More / Utilities Floating Popover */}
                    {isMoreMenuOpen && (
                        <div className="absolute left-1.5 w-56 bottom-full mb-2 bg-white dark:bg-slate-900 border-2 border-b-4 border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-2 z-50 space-y-1.5 animate-slide-up">
                            <div className="px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 font-mono">
                                {t('nav.utilities', 'TIỆN ÍCH & CÀI ĐẶT')}
                            </div>

                            {/* Chat Admin */}
                            <button
                                onClick={() => {
                                    setIsMoreMenuOpen(false);
                                    window.dispatchEvent(new CustomEvent('open-admin-chat'));
                                }}
                                className="w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-left cursor-pointer group relative"
                            >
                                <div className="flex items-center gap-2.5 min-w-0">
                                    <div className="w-7 h-7 rounded-lg bg-sky-100 dark:bg-sky-950/60 flex items-center justify-center text-sky-500 dark:text-sky-400 shrink-0">
                                        <MessageSquare className="w-4 h-4" />
                                    </div>
                                    <span className="truncate block font-bold">{t('nav.chatAdmin', 'Chat với Admin')}</span>
                                </div>
                                {unreadChatCount > 0 && (
                                    <span className="bg-rose-500 text-white text-[9px] font-mono font-black rounded-full min-w-[16px] h-4 px-1 flex items-center justify-center shadow-xs animate-bounce shrink-0">
                                        {unreadChatCount > 99 ? '99+' : unreadChatCount}
                                    </span>
                                )}
                            </button>

                            {/* Dual Language Selector Card (Target Language & UI Language) */}
                            <div className="p-2 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-750 space-y-2">
                                <div className="flex items-center justify-between gap-1.5">
                                    <div className="flex items-center gap-1.5 min-w-0">
                                        <span className="text-xs">🎯</span>
                                        <span className="text-[11px] font-extrabold text-slate-600 dark:text-slate-300">
                                            {t('nav.targetLangLabel', 'Học')}
                                        </span>
                                    </div>
                                    <TargetLanguageSelector isAdmin={isAdmin} />
                                </div>
                                <div className="flex items-center justify-between gap-1.5 pt-1.5 border-t border-slate-200/60 dark:border-slate-700/60">
                                    <div className="flex items-center gap-1.5 min-w-0">
                                        <span className="text-xs">🌐</span>
                                        <span className="text-[11px] font-extrabold text-slate-600 dark:text-slate-300">
                                            {t('nav.uiLangLabel', 'Giao diện')}
                                        </span>
                                    </div>
                                    <LanguageSelector compact={true} />
                                </div>
                            </div>

                            {/* Focus Session Pomodoro Timer */}
                            <button
                                onClick={() => {
                                    setIsMoreMenuOpen(false);
                                    setIsFocusModalOpen(true);
                                }}
                                className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-left cursor-pointer group"
                            >
                                <div className="w-7 h-7 rounded-lg bg-amber-100 dark:bg-amber-950/60 flex items-center justify-center text-amber-500 dark:text-amber-400 shrink-0">
                                    <Timer className="w-4 h-4" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <span className="truncate block font-bold">{t('nav.focusTimer', 'Đồng hồ tập trung')}</span>
                                </div>
                                {(focusStatus === 'focusing' || focusStatus === 'break') && (
                                    <span className="w-2 h-2 bg-emerald-500 rounded-full animate-ping shrink-0" />
                                )}
                            </button>

                            {/* Dark Mode Toggle */}
                            <button
                                onClick={() => {
                                    setIsDarkMode(prev => !prev);
                                }}
                                className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-left cursor-pointer group"
                            >
                                <div className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 shrink-0">
                                    {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600 dark:text-slate-300" />}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <span className="truncate block font-bold">{isDarkMode ? t('nav.lightMode', 'Chế độ Sáng') : t('nav.darkMode', 'Chế độ Tối')}</span>
                                </div>
                            </button>

                            {/* Background Theme Switcher */}
                            <button
                                onClick={() => {
                                    setIsMoreMenuOpen(false);
                                    window.dispatchEvent(new CustomEvent('quizki-open-background-picker'));
                                }}
                                className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-left cursor-pointer group"
                            >
                                <div className="w-7 h-7 rounded-lg bg-rose-100 dark:bg-rose-950/60 flex items-center justify-center text-rose-500 dark:text-rose-400 shrink-0">
                                    <Palette className="w-4 h-4" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <span className="truncate block font-bold">{t('settings.general.bgThemeTitle', 'Đổi hình nền')}</span>
                                </div>
                            </button>

                            {/* Help Tour */}
                            <button
                                onClick={() => {
                                    setIsMoreMenuOpen(false);
                                    if (onTriggerTour) onTriggerTour();
                                    else navigate(ROUTES.HELP);
                                }}
                                className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-left cursor-pointer group"
                            >
                                <div className="w-7 h-7 rounded-lg bg-sky-100 dark:bg-sky-950/60 flex items-center justify-center text-sky-500 dark:text-sky-400 shrink-0">
                                    <HelpCircle className="w-4 h-4" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <span className="truncate block font-bold">{t('nav.userGuide', 'Hướng dẫn')}</span>
                                </div>
                            </button>

                            {/* Settings */}
                            <Link
                                to={ROUTES.SETTINGS}
                                onClick={() => setIsMoreMenuOpen(false)}
                                className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-left group"
                            >
                                <div className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-400 shrink-0">
                                    <Settings className="w-4 h-4" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <span className="truncate block font-bold">{t('nav.settings', 'Cài đặt')}</span>
                                </div>
                            </Link>
                        </div>
                    )}

                    {!isCollapsed ? (
                        <div className="space-y-1.5">
                            {/* Upgrade Premium CTA Button */}
                            <Link
                                to={ROUTES.UPGRADE}
                                className="w-full h-8 px-2 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-white font-black text-xs shadow-xs active:translate-y-0.5 border-b-2 border-amber-600 flex items-center justify-center gap-1.5 select-none transition-all cursor-pointer"
                            >
                                <Crown className="w-3.5 h-3.5 fill-white text-white shrink-0" />
                                <span className="truncate">{t('common.upgradeShort', 'Nâng cấp')}</span>
                            </Link>

                            {/* Centered Tiện ích Button */}
                            <button
                                onClick={() => setIsMoreMenuOpen(prev => !prev)}
                                className={`w-full h-8.5 px-3 rounded-xl border-2 border-b-4 flex items-center justify-center gap-2 cursor-pointer transition-all active:translate-y-0.5 active:border-b-2 shadow-2xs font-black text-xs select-none relative ${
                                    isMoreMenuOpen
                                        ? 'bg-sky-50 dark:bg-sky-950/60 border-sky-400 dark:border-sky-500 text-sky-600 dark:text-sky-400'
                                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-750 hover:border-slate-300 dark:hover:border-slate-600 text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white'
                                }`}
                                title={t('nav.utilities', 'Tiện ích & Cài đặt')}
                            >
                                <MoreHorizontal className="w-4 h-4 text-slate-500 dark:text-slate-400 shrink-0" />
                                <span>{t('nav.utilities', 'Tiện ích')}</span>

                                {/* Status Indicators: Placed in top right without disturbing centering */}
                                <div className="absolute right-2 flex items-center gap-1">
                                    {(focusStatus === 'focusing' || focusStatus === 'break') && (
                                        <span className="w-2 h-2 bg-emerald-500 rounded-full animate-ping" title={t('nav.focusTimer', 'Đồng hồ tập trung đang chạy')} />
                                    )}
                                    {unreadChatCount > 0 && (
                                        <span className="bg-rose-500 text-white text-[8px] font-mono font-black rounded-full min-w-[15px] h-3.5 px-0.5 flex items-center justify-center shadow-xs animate-bounce">
                                            {unreadChatCount > 99 ? '99+' : unreadChatCount}
                                        </span>
                                    )}
                                </div>
                            </button>
                        </div>
                    ) : (
                        /* Collapsed Mode Controls */
                        <div className="space-y-1.5">
                            <button
                                onClick={() => setIsMoreMenuOpen(prev => !prev)}
                                className={`w-full h-9 rounded-2xl border-2 border-b-4 flex items-center justify-center relative cursor-pointer transition-all active:translate-y-0.5 active:border-b-2 shadow-2xs ${
                                    isMoreMenuOpen
                                        ? 'bg-sky-50 dark:bg-sky-950/60 border-sky-400 dark:border-sky-500 text-sky-600 dark:text-sky-400'
                                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-750 hover:border-slate-300 dark:hover:border-slate-600 text-slate-600 dark:text-slate-300'
                                }`}
                                title={t('nav.utilities', 'Tiện ích')}
                            >
                                <MoreHorizontal className="w-4 h-4 stroke-[2.5]" />
                                {unreadChatCount > 0 && (
                                    <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[8px] font-mono font-black rounded-full min-w-[14px] h-3.5 px-0.5 flex items-center justify-center shadow-xs animate-bounce">
                                        {unreadChatCount > 99 ? '99+' : unreadChatCount}
                                    </span>
                                )}
                            </button>

                            <button
                                onClick={() => setIsCollapsed(false)}
                                className="w-full h-9 rounded-2xl bg-white dark:bg-slate-900 border-2 border-b-4 border-slate-200 dark:border-slate-750 text-slate-600 hover:text-sky-600 dark:text-slate-300 dark:hover:text-sky-400 hover:border-sky-300 active:translate-y-0.5 active:border-b-2 transition-all flex items-center justify-center cursor-pointer shadow-2xs"
                                title={t('nav.expandSidebar', 'Mở rộng Sidebar')}
                            >
                                <ChevronRight className="w-4 h-4 stroke-[2.5]" />
                            </button>
                        </div>
                    )}
                </div>
            </aside>
            {/* Floating Pomodoro Focus Live Timer Badge */}
            <FloatingFocusWidget />
        </>
    );
};

export default Sidebar;
