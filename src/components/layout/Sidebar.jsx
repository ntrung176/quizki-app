import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth, db, appId } from '../../config/firebase';
import { collection, query, onSnapshot, doc, orderBy, limit } from 'firebase/firestore';
import { ROUTES } from '../../router';
import { getLevelFromXp, getLevelTitle } from '../../utils/scoring';
import {
    Home, BookOpen, LogOut, Sun, Moon, ChevronRight, ChevronLeft, X,
    List, Repeat2, FileCheck, Languages, Shield, Crown, Bell,
    MessageSquare, HelpCircle, Trophy, Cpu, Zap, Activity, Bot, Timer, Globe, Film,
    FileText, GitBranch, MoreHorizontal, Layers, Settings, Library, LayoutGrid, TrendingUp
} from 'lucide-react'
import { SafeAvatarImage } from '../ui';
import LanguageSelector from '../ui/LanguageSelector';
import TargetLanguageSelector from '../ui/TargetLanguageSelector';
import IosLanguageWheelModal from '../ui/IosLanguageWheelModal';
import FloatingFocusWidget from '../ui/FloatingFocusWidget';
import { isVocabCardDue, isSrsCardDue } from '../../utils/srs';
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
    onTriggerTour
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
    const [isLangWheelModalOpen, setIsLangWheelModalOpen] = useState(false);
    const profileRef = useRef(null);
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

    // Close mobile menu on route change
    useEffect(() => {
        setIsMobileMenuOpen(false);
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

    // Close notifications popover when clicking outside
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (popoverRef.current && !popoverRef.current.contains(e.target)) {
                setIsNotificationsOpen(false);
            }
            if (profileRef.current && !profileRef.current.contains(e.target)) {
                setIsProfileMenuOpen(false);
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
        const now = Date.now();
        const dueCount = (kanjiListRef.current || []).filter(k => {
            const srs = kanjiSrsRef.current[k.id] || kanjiSrsRef.current[k.character];
            if (!srs) return false;
            return isSrsCardDue(srs, now);
        }).length;
        setKanjiDueCount(dueCount);
    }, []);

    const updateGrammarCount = useCallback(() => {
        const now = Date.now();
        const dueCount = (grammarListRef.current || []).filter(g => {
            const srs = grammarSrsRef.current[g.id];
            if (!srs) return false;
            return isSrsCardDue(srs, now);
        }).length;
        setGrammarDueCount(dueCount);
    }, []);

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
        return (allCards || []).filter(card => {
            if (card.srsEnabled === false) return false;
            const lang = card.targetLanguage || (isEnglishCard(card, isEnglishMode) ? 'en' : 'ja');
            if (lang !== targetLanguage) return false;
            return isVocabCardDue(card, now);
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
            navigate(ROUTES.LOGIN);
        } catch (error) {
            console.error('Logout error:', error);
        }
    };

    // Dynamic Menu Items with i18n Translation Support
    const menuItems = React.useMemo(() => {
        const items = [
            { id: 'HOME', icon: Home, label: t('nav.home', 'Trang chủ'), route: ROUTES.HOME, group: 'Học tập' },
        ];

        // 1. Nhập môn bảng chữ cái theo từng ngôn ngữ
        if (isJapaneseMode) {
            items.push({ id: 'KANA_STUDY', icon: KanaMenuIcon, label: 'Bảng chữ Kana', route: ROUTES.KANA, group: 'Học tập' });
        } else if (isKoreanMode) {
            items.push({ id: 'HANGUL_STUDY', icon: HangulMenuIcon, label: 'Bảng chữ Hangul', route: ROUTES.HANGUL, group: 'Học tập' });
        } else if (isEnglishMode) {
            items.push({ id: 'IPA_STUDY', icon: IpaMenuIcon, label: 'Bảng phiên âm IPA', route: ROUTES.IPA, group: 'Học tập' });
        }

        // 2. Từ vựng theo ngôn ngữ
        const vocabLabel = isEnglishMode 
            ? 'Từ vựng' 
            : isKoreanMode 
                ? 'Từ vựng' 
                : t('nav.vocab', 'Từ vựng');

        items.push(
            { id: 'VOCAB_LIST', icon: BookOpen, label: vocabLabel, route: ROUTES.VOCAB_REVIEW, group: 'Học tập' },
        );

        // 3. Kanji menu is only relevant for Japanese learning
        if (isJapaneseMode) {
            items.push({ id: 'KANJI_STUDY', icon: Languages, label: t('nav.kanji', 'Thư viện Kanji'), route: ROUTES.KANJI_REVIEW, group: 'Học tập' });
        }

        const kaiwaLabel = isEnglishMode 
            ? 'Phòng Speaking AI' 
            : isKoreanMode 
                ? 'Luyện nói AI (말하기)' 
                : t('nav.kaiwa', 'Phòng Kaiwa AI');

        const testLabel = isEnglishMode 
            ? 'Luyện thi IELTS / TOEIC' 
            : isKoreanMode 
                ? 'Luyện thi TOPIK' 
                : t('nav.jlptTest', 'Luyện đề JLPT');

        items.push(
            { id: 'GRAMMAR', icon: Repeat2, label: t('nav.grammar', 'Ngữ pháp'), route: ROUTES.GRAMMAR_REVIEW, group: 'Học tập' },
            { id: 'VIDEO_KAIWA', icon: Film, label: isEnglishMode ? 'Video Shadowing' : isKoreanMode ? 'Video K-Drama' : 'Video Kaiwa', route: ROUTES.VIDEO_KAIWA, group: 'Luyện tập & AI' },
            { id: 'JLPT_KAIWA', icon: MessageSquare, label: kaiwaLabel, route: ROUTES.JLPT_KAIWA, group: 'Luyện tập & AI' },
            { id: 'JLPT_TEST', icon: FileCheck, label: testLabel, route: ROUTES.JLPT_TEST, group: 'Luyện tập & AI' },
            { id: 'HUB', icon: Trophy, label: t('nav.leaderboard', 'Bảng vinh danh'), route: ROUTES.HUB, group: 'Cộng đồng' },
        );

        if (isAdmin) {
            items.push({ id: 'ADMIN', icon: Shield, label: 'Quản trị', route: ROUTES.ADMIN, group: 'Cộng đồng' });
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
        if (path === '/' || path === '/home') return 'Trang chủ';
        if (path.includes('/vocab') || path.includes('/books')) return t('nav.vocab', 'Từ vựng');
        if (path.includes('/grammar')) return t('nav.grammar', 'Ngữ pháp');
        if (path.includes('/jlpt/test')) return isEnglishMode ? 'Luyện thi' : isKoreanMode ? 'Lộ trình TOPIK' : 'Ôn thi JLPT';
        if (path.includes('/kanji/study') || path.includes('/kanji/lesson')) return 'Học Kanji';
        if (path.includes('/kanji')) return 'Kanji';
        if (path.includes('/kaiwa/video')) return 'Video Shadowing';
        if (path.includes('/jlpt/kaiwa') || path.includes('/kaiwa')) return isEnglishMode ? 'Speaking AI' : 'Kitsu trợ lý';
        if (path.includes('/kana') || path.includes('/hangul') || path.includes('/ipa')) return 'Bảng chữ';
        if (path.includes('/hub')) return 'Bảng vinh danh';
        if (path.includes('/settings') || path.includes('/account')) return 'Cài đặt';
        if (path.includes('/upgrade')) return 'Nâng cấp';
        if (path.includes('/admin')) return 'Quản trị';
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

        return [
            {
                id: 'home',
                label: 'Trang chủ',
                icon: Home,
                route: ROUTES.HOME,
                isActive: isHomeActive && !isMobileMenuOpen,
                badge: 0,
                onClick: () => setIsMobileMenuOpen(false)
            },
            {
                id: 'vocab',
                label: 'Từ vựng',
                icon: BookOpen,
                route: ROUTES.VOCAB_REVIEW,
                isActive: isVocabActive && !isMobileMenuOpen,
                badge: dueVocabCount,
                onClick: () => setIsMobileMenuOpen(false)
            },
            {
                id: 'kanji',
                label: isJapaneseMode ? 'Kanji' : isKoreanMode ? 'Hán Hàn' : 'Từ gốc',
                icon: Languages,
                route: ROUTES.KANJI_REVIEW,
                isActive: isKanjiActive && !isMobileMenuOpen,
                badge: kanjiDueCount,
                onClick: () => setIsMobileMenuOpen(false)
            },
            {
                id: 'grammar',
                label: 'Ngữ pháp',
                icon: FileText,
                route: ROUTES.GRAMMAR_REVIEW,
                isActive: isGrammarActive && !isMobileMenuOpen,
                badge: grammarDueCount,
                onClick: () => setIsMobileMenuOpen(false)
            },
            {
                id: 'more',
                label: 'Thêm',
                icon: MoreHorizontal,
                isActive: isMoreActive,
                badge: (unreadChatCount > 0 ? unreadChatCount : 0),
                onClick: (e) => {
                    e.preventDefault();
                    handleMobileToggle();
                }
            }
        ];
    }, [location.pathname, isMobileMenuOpen, dueVocabCount, grammarDueCount, kanjiDueCount, unreadChatCount, isJapaneseMode, isKoreanMode, handleMobileToggle]);

    const studyMenuItems = useMemo(() => {
        const items = [];

        // 1. Bảng chữ cái theo ngôn ngữ
        if (isJapaneseMode) {
            items.push({
                id: 'kana',
                label: 'Bảng chữ Kana',
                icon: KanaMenuIcon,
                route: ROUTES.KANA,
                badge: null,
            });
            // 2. Lộ trình Hán tự
            items.push({
                id: 'kanji_study',
                label: 'Lộ trình Hán tự',
                icon: Languages,
                route: ROUTES.KANJI_STUDY,
                badge: null,
            });
        } else if (isKoreanMode) {
            items.push({
                id: 'hangul',
                label: 'Bảng chữ Hangul',
                icon: HangulMenuIcon,
                route: ROUTES.HANGUL,
                badge: null,
            });
        } else if (isEnglishMode) {
            items.push({
                id: 'ipa',
                label: 'Bảng phiên âm IPA',
                icon: IpaMenuIcon,
                route: ROUTES.IPA,
                badge: null,
            });
        }

        // 3. Giáo trình & Sách
        items.push({
            id: 'books',
            label: isEnglishMode ? 'Sách & Từ vựng' : 'Giáo trình & Sách',
            icon: Library,
            route: ROUTES.BOOKS,
            badge: null,
        });

        // 4. Video Kaiwa / Shadowing
        items.push({
            id: 'video',
            label: isEnglishMode ? 'Video Shadowing' : isKoreanMode ? 'Video K-Drama' : 'Video Kaiwa',
            icon: Film,
            route: ROUTES.VIDEO_KAIWA,
            badge: null,
        });

        // 5. Phòng Kaiwa AI / Speaking AI
        items.push({
            id: 'kaiwa_ai',
            label: isEnglishMode ? 'Phòng Speaking AI' : isKoreanMode ? 'Luyện nói AI' : 'Phòng Kaiwa AI',
            icon: Bot,
            route: ROUTES.JLPT_KAIWA,
            badge: null,
        });

        // 6. Luyện đề thi JLPT / TOPIK / IELTS
        items.push({
            id: 'jlpt_test',
            label: isEnglishMode ? 'Luyện thi IELTS/TOEIC' : isKoreanMode ? 'Luyện thi TOPIK' : 'Luyện đề JLPT',
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
                label: 'Đồng hồ tập trung',
                icon: Timer,
                onClick: () => {
                    setIsMobileMenuOpen(false);
                    setIsFocusModalOpen(true);
                },
                badge: (focusStatus === 'focusing' || focusStatus === 'break') ? 'Đang chạy' : null,
            },
            {
                id: 'admin_chat',
                label: 'Chat với Admin',
                icon: MessageSquare,
                onClick: () => {
                    setIsMobileMenuOpen(false);
                    window.dispatchEvent(new CustomEvent('open-admin-chat'));
                },
                badge: unreadChatCount > 0 ? unreadChatCount : null,
            },
            {
                id: 'settings',
                label: 'Cài đặt hệ thống',
                icon: Settings,
                route: ROUTES.SETTINGS,
                badge: null,
            },
            {
                id: 'help_tour',
                label: 'Hướng dẫn sử dụng',
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
                label: isDarkMode ? 'Chế độ Sáng' : 'Chế độ Tối',
                icon: isDarkMode ? Sun : Moon,
                onClick: () => setIsDarkMode(prev => !prev),
                badge: null,
            },
        ];

        // Admin Management
        if (isAdmin) {
            items.push({
                id: 'admin_panel',
                label: 'Quản trị hệ thống',
                icon: Shield,
                route: ROUTES.ADMIN,
                badge: null,
            });
            items.push({
                id: 'jlpt_admin',
                label: 'Quản lý đề thi',
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
                        Thông báo của bạn
                    </span>
                    {globalNotifications.some(n => !readNotificationIds.includes(n.id)) && (
                        <button
                            onClick={markAllAsRead}
                            className="text-xs font-semibold text-cyan-600 dark:text-cyan-400 hover:underline cursor-pointer"
                        >
                            Đọc tất cả
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
                                <h4 className="font-bold text-xs text-rose-800 dark:text-rose-300">Từ vựng đến hạn ôn tập</h4>
                                <p className="text-[11px] text-rose-700/80 dark:text-rose-400/80 mt-0.5 font-mono">Bạn có {dueVocabCount} từ vựng cần ôn tập ngay.</p>
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
                                <h4 className="font-bold text-xs text-amber-800 dark:text-amber-300">Kanji đến hạn ôn tập</h4>
                                <p className="text-[11px] text-amber-700/80 dark:text-amber-400/80 mt-0.5 font-mono">Bạn có {kanjiDueCount} chữ Kanji cần ôn tập.</p>
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
                                <h4 className="font-bold text-xs text-emerald-800 dark:text-emerald-300">Ngữ pháp đến hạn ôn tập</h4>
                                <p className="text-[11px] text-emerald-700/80 dark:text-emerald-400/80 mt-0.5 font-mono">Bạn có {grammarDueCount} mẫu ngữ pháp cần ôn tập.</p>
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
                                            🔗 Mở liên kết ↗
                                        </a>
                                    )}
                                </div>
                            </div>
                        );
                    })}

                    {globalNotifications.length === 0 && dueVocabCount === 0 && kanjiDueCount === 0 && grammarDueCount === 0 && (
                        <p className="text-xs text-slate-400 text-center py-4 font-mono">Không có thông báo mới</p>
                    )}
                </div>
            </div>
        );
    };

    return (
        <>
            {/* Top Fixed Mobile Header Bar */}
            <header className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800/80 px-3.5 pb-2 pt-[max(0.625rem,env(safe-area-inset-top))] flex items-center justify-between shadow-xs">
                {/* Left Logo / Torii Avatar */}
                <Link
                    to={ROUTES.HOME}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200/90 dark:border-slate-700/90 flex items-center justify-center shadow-xs active:scale-95 transition-transform shrink-0"
                    title="Trang chủ"
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
                            type="button"
                            onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                            className="w-9 h-9 rounded-full bg-slate-100/90 dark:bg-slate-800/90 text-slate-600 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700/80 flex items-center justify-center cursor-pointer active:scale-95 transition-all hover:border-emerald-500/50"
                            title="Thông báo"
                        >
                            <Bell className="w-4 h-4" />
                            {hasUnread && (
                                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full animate-ping" />
                            )}
                        </button>
                        <NotificationsPopover isMobile={true} />
                    </div>

                    {(userId || auth?.currentUser) && (
                        <Link
                            to={ROUTES.SETTINGS}
                            onClick={() => setIsMobileMenuOpen(false)}
                            className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-[9px] font-bold text-slate-700 dark:text-slate-300 overflow-hidden shadow-xs active:scale-95 transition-transform shrink-0"
                            title="Trang cá nhân & Cài đặt"
                        >
                            {renderAvatar()}
                        </Link>
                    )}
                </div>
            </header>

            {/* Mobile Bottom Navigation Bar - Fixed at bottom matching iOS native proportion */}
            <nav 
                className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/98 dark:bg-slate-900/98 backdrop-blur-md border-t border-slate-200/80 dark:border-slate-800/80 shadow-[0_-2px_12px_rgba(0,0,0,0.04)] dark:shadow-[0_-4px_20px_rgba(0,0,0,0.3)] transition-colors select-none"
                style={{
                    paddingTop: '6px',
                    paddingBottom: 'max(6px, calc(env(safe-area-inset-bottom, 0px) - 14px))'
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
                                    Khám phá QUIZKI
                                </h2>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-snug">
                                    Toàn bộ không gian học tập của bạn, được sắp xếp gọn trong một nơi.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsMobileMenuOpen(false)}
                                className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center transition-colors shrink-0 ml-3 mt-0.5 cursor-pointer shadow-2xs"
                                title="Đóng"
                            >
                                <X className="w-4.5 h-4.5" />
                            </button>
                        </div>

                        {/* Scrollable Content Body */}
                        <div className="px-4 pt-2 pb-6 space-y-3.5 overflow-y-auto flex-1 overscroll-contain">
                            {/* Group 1: Study & Features */}
                            <div className="space-y-2">
                                <div className="flex items-center gap-1.5 px-1 text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider font-mono">
                                    <span>📚 HỌC PHẦN & TÍNH NĂNG</span>
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
                                    <span>🛠️ CÔNG CỤ & TIỆN ÍCH</span>
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
                                                {displayName || profile?.displayName || auth?.currentUser?.displayName || (auth?.currentUser?.email ? auth.currentUser.email.split('@')[0] : 'Người học')}
                                            </span>
                                            {isPremium ? (
                                                <span className="bg-amber-500/15 text-amber-600 dark:text-amber-400 text-[9px] font-mono font-black px-1.5 py-0.5 rounded border border-amber-500/30">PREMIUM</span>
                                            ) : (
                                                <span className="bg-slate-200/60 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[9px] font-mono font-bold px-1.5 py-0.5 rounded">FREE</span>
                                            )}
                                        </div>
                                        <p className="text-[10px] text-slate-400 font-mono mt-0.5">LV {xpDetails.level} • {getLevelTitle(xpDetails.level)}</p>
                                    </div>
                                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-500 shrink-0 transition-colors" />
                                </Link>
                            )}

                            {/* 2-Column Language Selectors */}
                            <div className="grid grid-cols-2 gap-2 pt-0.5">
                                <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-800/80 p-2 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
                                    <span className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 pl-1">🎯 HỌC</span>
                                    <TargetLanguageSelector isAdmin={isAdmin} />
                                </div>
                                <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-800/80 p-2 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
                                    <span className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 pl-1">🌐 NGÔN NGỮ</span>
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
                                <span>{t('common.upgrade', 'Nâng cấp tài khoản')}</span>
                            </Link>

                            {/* Logout Button */}
                            <button
                                onClick={handleLogout}
                                className="w-full flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-200 dark:border-rose-800/80 text-xs font-extrabold cursor-pointer hover:bg-rose-100 dark:hover:bg-rose-900/60 transition-colors"
                            >
                                <LogOut className="w-3.5 h-3.5" />
                                <span>Đăng xuất</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Desktop Cyber-AI Futuristic Sidebar */}
            <aside className={`hidden lg:flex flex-col fixed left-0 top-0 bottom-0 z-40 transition-[width] duration-200 ease-out ${isCollapsed ? 'w-20' : 'w-64'} bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 shadow-xl`}>
                {/* Cyber Brand Logo */}
                <div className={`p-4 border-b border-slate-200 dark:border-slate-800 flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
                    <Link
                        to={ROUTES.HOME}
                        className="flex items-center space-x-3 min-w-0"
                    >
                        <div className="w-10 h-10 bg-gradient-to-tr from-cyan-500 via-indigo-600 to-sky-500 rounded-xl flex items-center justify-center text-white shadow-md shadow-cyan-500/25 border border-cyan-400/40 shrink-0">
                            <BookOpen className="w-5 h-5" />
                        </div>
                        {!isCollapsed && (
                            <div className="flex flex-col min-w-0">
                                <span className="text-xl font-black text-slate-800 dark:text-white leading-none tracking-tight">
                                    QuizKi <span className="text-cyan-500 font-mono text-xs font-black">AI</span>
                                </span>
                                <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono font-bold tracking-widest uppercase mt-1">
                                    NEURAL PLATFORM
                                </span>
                            </div>
                        )}
                    </Link>

                    {!isCollapsed && (
                        <div className="relative">
                            <button
                                onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                                className="p-2 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-600 dark:text-slate-300 hover:border-cyan-400 transition-all relative cursor-pointer"
                                title="Thông báo"
                            >
                                <Bell className="w-4.5 h-4.5" />
                                {hasUnread && (
                                    <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full animate-ping"></span>
                                )}
                            </button>
                            <NotificationsPopover isMobile={false} />
                        </div>
                    )}
                </div>

                {/* Cyber Profile Telemetry Capsule with Click Menu */}
                {!isCollapsed && displayName && (
                    <div className="px-3 py-3 border-b border-slate-200 dark:border-slate-800 relative" ref={profileRef}>
                        <div
                            onClick={() => setIsProfileMenuOpen(prev => !prev)}
                            className="flex items-center gap-3 bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-cyan-500/30 rounded-2xl p-2.5 shadow-inner hover:border-cyan-400 transition-all w-full cursor-pointer group min-w-0"
                            title="Tài khoản cá nhân"
                        >
                            <div className="flex flex-col items-center gap-0.5 flex-shrink-0">
                                <div className="w-9 h-9 rounded-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-cyan-500/40 flex items-center justify-center text-[10px] font-bold text-slate-700 dark:text-slate-300 overflow-hidden shadow-sm group-hover:scale-105 transition-transform">
                                    {renderAvatar()}
                                </div>
                                <span className="bg-gradient-to-r from-cyan-500 to-indigo-600 text-white text-[8px] font-black px-1.5 rounded font-mono uppercase">
                                    LV {xpDetails.level}
                                </span>
                            </div>

                            <div className="flex flex-col min-w-0 flex-1 justify-center">
                                {isPremium ? (
                                    <span className="text-[9px] font-mono font-black uppercase tracking-widest text-amber-500 flex items-center gap-0.5">
                                        <Crown className="w-2.5 h-2.5 fill-amber-500 inline" /> PREMIUM
                                    </span>
                                ) : (
                                    <span className="text-[9px] font-mono font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                                        FREE ACCOUNT
                                    </span>
                                )}
                                <span className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate mt-0.5">
                                    {displayName}
                                </span>
                                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono truncate mt-0.5">
                                    {getLevelTitle(xpDetails.level)}
                                </span>
                            </div>
                        </div>

                        {/* Profile Quick Dropdown */}
                        {isProfileMenuOpen && (
                            <div className="absolute left-3 right-3 top-full mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl z-50 p-1.5 space-y-1 animate-fade-in">
                                <Link
                                    to={ROUTES.SETTINGS}
                                    onClick={() => setIsProfileMenuOpen(false)}
                                    className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                >
                                    <span>⚙️ Cài đặt cá nhân</span>
                                </Link>
                                <button
                                    onClick={() => {
                                        setIsProfileMenuOpen(false);
                                        handleLogout();
                                    }}
                                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors cursor-pointer"
                                >
                                    <LogOut className="w-4 h-4 text-rose-500 shrink-0" />
                                    <span>Đăng xuất</span>
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {/* Grouped Navigation Menu */}
                <nav className="flex-1 p-3 space-y-1 overflow-y-auto custom-scrollbar">
                    {menuItems.map((item, idx) => {
                        const isFirstInGroup = idx === 0 || menuItems[idx - 1].group !== item.group;
                        return (
                            <React.Fragment key={item.id}>
                                {!isCollapsed && isFirstInGroup && (
                                    <div className="pt-2.5 pb-1 px-3 text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                                        {item.group}
                                    </div>
                                )}
                                <div className="relative group">
                                    <Link
                                        to={item.disabled ? '#' : item.route}
                                        onClick={(e) => {
                                            if (item.disabled) e.preventDefault();
                                        }}
                                        className={`w-full flex items-center justify-between ${isCollapsed ? 'justify-center' : 'space-x-3'} px-3.5 py-2.5 rounded-xl transition-all duration-200 relative ${item.disabled
                                                ? 'cursor-not-allowed opacity-40 text-slate-400'
                                                : isMenuActive(item)
                                                    ? 'bg-cyan-50 dark:bg-cyan-950/60 text-cyan-700 dark:text-cyan-400 font-bold border border-cyan-200 dark:border-cyan-500/40 shadow-sm'
                                                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
                                            }`}
                                        title={isCollapsed ? item.label : undefined}
                                    >
                                        {isMenuActive(item) && !item.disabled && (
                                            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-7 bg-cyan-500 dark:bg-cyan-400 rounded-l-full shadow-[0_0_12px_rgba(6,182,212,0.8)]" />
                                        )}

                                        <div className="flex items-center space-x-3 min-w-0">
                                            <item.icon className={`w-4.5 h-4.5 ${isMenuActive(item) ? 'text-cyan-600 dark:text-cyan-400' : 'text-slate-500 dark:text-slate-400 group-hover:text-cyan-500'}`} />
                                            {!isCollapsed && (
                                                <span className="text-xs font-semibold truncate">{item.label}</span>
                                            )}
                                        </div>

                                        {!isCollapsed && item.badge > 0 && (
                                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black font-mono bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-400 border border-rose-200 dark:border-rose-800/60 shadow-sm">
                                                {item.badge}
                                            </span>
                                        )}
                                    </Link>
                                </div>
                            </React.Fragment>
                        );
                    })}
                </nav>

                {/* Streamlined Bottom Cyber Controls */}
                <div className="p-3 border-t border-slate-200 dark:border-slate-800 space-y-2 bg-slate-50/50 dark:bg-slate-950/50">
                    {!isCollapsed ? (
                        /* Sleek Compact Language Bar (Clicking opens iOS Wheel Modal) */
                        <button
                            onClick={() => setIsLangWheelModalOpen(true)}
                            className="w-full flex items-center justify-between gap-1.5 bg-white dark:bg-slate-900 p-2.5 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-cyan-500/50 shadow-sm transition-all text-xs font-bold text-slate-700 dark:text-slate-200 cursor-pointer group"
                            title="Bấm để cuộn chọn Ngôn ngữ (iOS Wheel)"
                        >
                            <div className="flex items-center gap-1.5 min-w-0">
                                <span className="text-[11px]">🎯</span>
                                <span className="truncate">{activeTargetConfig?.name || (targetLanguage === 'en' ? 'Tiếng Anh' : targetLanguage === 'ko' ? 'Tiếng Hàn' : 'Tiếng Nhật')}</span>
                            </div>
                            <div className="h-4 w-px bg-slate-200 dark:bg-slate-800 shrink-0" />
                            <div className="flex items-center gap-1.5 min-w-0">
                                <span className="text-[11px]">🌐</span>
                                <span className="truncate">{t('common.langCode', 'VI')}</span>
                            </div>
                        </button>
                    ) : (
                        <button
                            onClick={() => setIsLangWheelModalOpen(true)}
                            className="w-full p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                            title="Đổi ngôn ngữ"
                        >
                            <Globe className="w-4.5 h-4.5 text-cyan-500" />
                        </button>
                    )}

                    {/* iOS Language Wheel Modal */}
                    <IosLanguageWheelModal
                        isOpen={isLangWheelModalOpen}
                        onClose={() => setIsLangWheelModalOpen(false)}
                        isAdmin={isAdmin}
                    />

                    {/* Upgrade Account Button */}
                    <Link
                        to={ROUTES.UPGRADE}
                        className={`w-full flex items-center ${isCollapsed ? 'justify-center' : 'space-x-2.5'} px-3 py-2 rounded-xl transition-all duration-200 text-xs font-bold ${location.pathname === ROUTES.UPGRADE
                                ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md'
                                : 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-300/60 dark:border-amber-700/50 hover:bg-amber-500/20'
                            }`}
                        title={isCollapsed ? t('common.upgrade', 'Nâng cấp tài khoản') : undefined}
                    >
                        <Crown className="w-4 h-4 text-amber-500 fill-amber-500 shrink-0" />
                        {!isCollapsed && <span className="truncate">{t('common.upgrade', 'Nâng cấp tài khoản')}</span>}
                    </Link>

                    {/* Integrated Quick Control Icons Row */}
                    <div className="space-y-2 pt-1 border-t border-slate-200/60 dark:border-slate-800/60">
                        {isCollapsed ? (
                            <button
                                onClick={() => setIsCollapsed(false)}
                                className="w-full py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-slate-500 hover:text-cyan-600 dark:text-slate-400 dark:hover:text-cyan-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center justify-center cursor-pointer shadow-sm relative"
                                title={unreadChatCount > 0 ? `Mở rộng Sidebar (${unreadChatCount} tin nhắn chưa đọc)` : "Mở rộng Sidebar"}
                            >
                                <ChevronRight className="w-5 h-5" />
                                {unreadChatCount > 0 && (
                                    <span className="absolute top-1.5 right-1.5 flex h-2.5 w-2.5">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500"></span>
                                    </span>
                                )}
                            </button>
                        ) : (
                            <div className="flex items-center justify-between p-1 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-sm w-full">
                                {/* Chatbox with Admin Button */}
                                <button
                                    onClick={() => window.dispatchEvent(new CustomEvent('open-admin-chat'))}
                                    className="p-2 rounded-lg text-cyan-600 dark:text-cyan-400 hover:bg-cyan-50 dark:hover:bg-cyan-950/50 transition-colors cursor-pointer relative"
                                    title={unreadChatCount > 0 ? `Chatbox hỗ trợ (${unreadChatCount} tin nhắn chưa đọc)` : "Chatbox hỗ trợ với Admin"}
                                >
                                    <MessageSquare className="w-4.5 h-4.5" />
                                    {unreadChatCount > 0 && (
                                        <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[9px] font-black font-mono rounded-full min-w-[17px] h-4 px-1 flex items-center justify-center shadow-md animate-bounce">
                                            {unreadChatCount > 99 ? '99+' : unreadChatCount}
                                        </span>
                                    )}
                                </button>

                                {/* Pomodoro Focus Clock Button */}
                                <button
                                    onClick={() => setIsFocusModalOpen(true)}
                                    className={`p-2 rounded-lg transition-colors cursor-pointer relative ${focusStatus === 'focusing' || focusStatus === 'break' || focusStatus === 'paused'
                                            ? 'text-purple-500 bg-purple-500/20 font-bold'
                                            : 'text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/50'
                                        }`}
                                    title="Đồng hồ tập trung Focus Session"
                                >
                                    <Timer className="w-4.5 h-4.5" />
                                    {(focusStatus === 'focusing' || focusStatus === 'break') && (
                                        <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-500 rounded-full animate-ping"></span>
                                    )}
                                </button>

                                {/* Help / Page Guide '?' Button */}
                                <button
                                    onClick={() => {
                                        if (onTriggerTour) onTriggerTour();
                                        else navigate(ROUTES.HELP);
                                    }}
                                    className="p-2 rounded-lg text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 transition-colors cursor-pointer"
                                    title="Xem hướng dẫn trang này"
                                >
                                    <HelpCircle className="w-4.5 h-4.5" />
                                </button>

                                {/* Dark Mode Toggle */}
                                <button
                                    onClick={() => setIsDarkMode(prev => !prev)}
                                    className="p-2 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                                    title={isDarkMode ? 'Giao diện sáng' : 'Giao diện tối'}
                                >
                                    {isDarkMode ? <Sun className="w-4.5 h-4.5 text-amber-400" /> : <Moon className="w-4.5 h-4.5 text-indigo-600" />}
                                </button>

                                {/* Collapse Nav Toggle */}
                                <button
                                    onClick={() => setIsCollapsed(true)}
                                    className="p-2 rounded-lg text-slate-400 hover:text-slate-700 dark:text-slate-500 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                                    title="Thu gọn Sidebar"
                                >
                                    <ChevronLeft className="w-4.5 h-4.5" />
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </aside>
            {/* Floating Pomodoro Focus Live Timer Badge */}
            <FloatingFocusWidget />
        </>
    );
};

export default Sidebar;
