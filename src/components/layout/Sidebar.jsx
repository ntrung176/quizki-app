import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth, db, appId } from '../../config/firebase';
import { collection, query, onSnapshot, doc, orderBy, limit } from 'firebase/firestore';
import { ROUTES } from '../../router';
import { getLevelFromXp, getLevelTitle } from '../../utils/scoring';
import { 
    Home, BookOpen, LogOut, Sun, Moon, Sparkle, ChevronRight, ChevronLeft, X, 
    List, Repeat2, FileCheck, Languages, Shield, Crown, Bell, 
    MessageSquare, HelpCircle, Trophy, Cpu, Zap, Activity, Bot
} from 'lucide-react'
import { SafeAvatarImage } from '../ui';
import LanguageSelector from '../ui/LanguageSelector';
import TargetLanguageSelector from '../ui/TargetLanguageSelector';
import { isVocabCardDue, isSrsCardDue } from '../../utils/srs';
import { isEnglishCard } from '../../utils/englishVocab';
import { getSharedKanjiList, subscribeKanjiSrs } from '../../utils/kanjiService';
import { getSharedGrammarPointsList, subscribeGrammarSrs } from '../../utils/grammarService';

import { useLanguage } from '../../context/LanguageContext';
import { useTargetLanguage } from '../../context/TargetLanguageContext';

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
    const { isEnglishMode } = useTargetLanguage();

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
        const xp = Number(profile?.xp || profile?.score || profile?.totalXp || 0);
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

        const fallbackChar = (
            <span className="text-lg select-none">
                {displayName ? displayName.charAt(0).toUpperCase() : '👤'}
            </span>
        );

        if (isPhotoUrl(avatar)) {
            return (
                <SafeAvatarImage
                    src={avatar}
                    alt="Avatar"
                    fallback={fallbackChar}
                />
            );
        }
        
        const emoji = AVATAR_EMOJIS[avatar];
        if (emoji) {
            return <span className="text-lg select-none">{emoji}</span>;
        }
        
        if (auth?.currentUser?.photoURL) {
            return (
                <SafeAvatarImage
                    src={auth.currentUser.photoURL}
                    alt="Avatar"
                    fallback={fallbackChar}
                />
            );
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
        } catch (e) {}
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
    const [kanjiDueCount, setKanjiDueCount] = useState(0);
    const [grammarDueCount, setGrammarDueCount] = useState(0);
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
        const intervalId = setInterval(handleSrsUpdate, 3000);
        return () => {
            window.removeEventListener('srs-updated', handleSrsUpdate);
            clearInterval(intervalId);
        };
    }, [updateKanjiCount, updateGrammarCount]);

    // Listen to Kanji SRS due count synchronized with Kanji module
    useEffect(() => {
        if (!userId) return;
        let isMounted = true;
        let unsub = () => {};

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

        return () => {
            isMounted = false;
            unsub();
        };
    }, [userId, updateKanjiCount]);

    // Listen to Grammar SRS due count synchronized with Grammar module
    useEffect(() => {
        if (!userId) return;
        let isMounted = true;
        let unsub = () => {};

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

        return () => {
            isMounted = false;
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
            const cardIsEng = isEnglishCard(card, isEnglishMode);
            if (cardIsEng !== isEnglishMode) return false;
            return isVocabCardDue(card, now);
        }).length;
    }, [allCards, isEnglishMode, sidebarTick]);
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
            { id: 'HOME', icon: Home, label: t('nav.home', 'Trang chủ'), route: ROUTES.HOME },
            { id: 'VOCAB_LIST', icon: BookOpen, label: t('nav.vocab', 'Từ vựng'), route: ROUTES.VOCAB_REVIEW },
        ];

        // Kanji / Phonetics menu is only relevant for Japanese learning
        if (!isEnglishMode) {
            items.push({ id: 'KANJI_STUDY', icon: Languages, label: t('nav.kanji', 'Thư viện Kanji'), route: ROUTES.KANJI_REVIEW });
        }

        items.push(
            { id: 'GRAMMAR', icon: Repeat2, label: t('nav.grammar', 'Ngữ pháp'), route: ROUTES.GRAMMAR_REVIEW },
            { id: 'JLPT_TEST', icon: FileCheck, label: isEnglishMode ? 'Luyện thi IELTS/TOEIC' : t('nav.jlptTest', 'Luyện đề JLPT'), route: ROUTES.JLPT_TEST },
            { id: 'JLPT_KAIWA', icon: MessageSquare, label: t('nav.kaiwa', 'Phòng Kaiwa AI'), route: ROUTES.JLPT_KAIWA },
            { id: 'HUB', icon: Trophy, label: t('nav.leaderboard', 'Bảng vinh danh'), route: ROUTES.HUB },
        );

        if (isAdmin) {
            items.push({ id: 'ADMIN', icon: Shield, label: 'Quản trị', route: ROUTES.ADMIN });
        }
        return items;
    }, [t, dueVocabCount, kanjiDueCount, grammarDueCount, isAdmin, isEnglishMode]);

    const isMenuActive = (item) => {
        const path = location.pathname;
        if (item.id === 'HOME') return path === '/' || path === '/home';
        if (item.id === 'VOCAB_LIST') return path.includes('/vocab') || path.includes('/books');
        if (item.id === 'KANJI_STUDY') return path.includes('/kanji');
        if (item.id === 'GRAMMAR') return path.includes('/grammar');
        if (item.id === 'JLPT_TEST') return path.includes('/jlpt/test') || path.includes('/jlpt/admin');
        if (item.id === 'JLPT_KAIWA') return path.includes('/jlpt/kaiwa') || path.includes('/kaiwa');
        if (item.id === 'HUB') return path.includes('/hub') || path.includes('/stats');
        if (item.id === 'ADMIN') return path.includes('/admin');
        return path.startsWith(item.route);
    };

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
                                className={`p-3 rounded-xl border flex items-start gap-3 transition-all ${
                                    isRead 
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
            {/* Top Fixed Mobile Header Bar - Fixed at z-[99999] above everything */}
            <header className="lg:hidden fixed top-0 left-0 right-0 z-[99999] bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border-b border-slate-200/80 dark:border-slate-800/80 px-4 py-2.5 flex items-center justify-between shadow-lg">
                <Link to={ROUTES.HOME} onClick={() => setIsMobileMenuOpen(false)} className="flex items-center space-x-2.5 group active:scale-95 transition-transform">
                    <div className="w-9 h-9 bg-gradient-to-tr from-cyan-500 via-indigo-600 to-sky-500 rounded-xl flex items-center justify-center text-white shadow-md shadow-cyan-500/25 border border-cyan-400/40 group-hover:scale-105 transition-transform">
                        <BookOpen className="w-5 h-5" />
                    </div>
                    <span className="text-lg font-black text-slate-800 dark:text-white tracking-wide">
                        QuizKi <span className="text-cyan-500 font-mono text-xs font-black">AI</span>
                    </span>
                </Link>

                <div className="flex items-center space-x-2">
                    {/* Mobile Avatar Settings Link */}
                    {displayName && (
                        <Link
                            to={ROUTES.SETTINGS}
                            onClick={() => setIsMobileMenuOpen(false)}
                            className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 border border-cyan-500/40 flex items-center justify-center text-[9px] font-bold text-slate-700 dark:text-slate-300 overflow-hidden shadow-sm active:scale-95 transition-transform shrink-0"
                            title="Trang cá nhân & Cài đặt"
                        >
                            {renderAvatar()}
                        </Link>
                    )}

                    <div className="relative">
                        <button
                            type="button"
                            onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                            className="p-2 rounded-xl bg-slate-100/90 dark:bg-slate-800/90 text-slate-600 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700/80 cursor-pointer active:scale-95 transition-all hover:border-cyan-500/50"
                        >
                            <Bell className="w-4 h-4" />
                            {hasUnread && (
                                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full animate-ping"></span>
                            )}
                        </button>
                        <NotificationsPopover isMobile={true} />
                    </div>

                    {/* Single Stable Toggle Button with 400ms Touch Debounce */}
                    <button
                        type="button"
                        onClick={handleMobileToggle}
                        className="p-2 rounded-xl bg-slate-100/90 dark:bg-slate-800/90 text-slate-600 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700/80 cursor-pointer active:scale-95 transition-all hover:border-cyan-500/50"
                        aria-label="Toggle mobile menu"
                    >
                        {isMobileMenuOpen ? <X className="w-5 h-5 text-cyan-600 dark:text-cyan-400" /> : <List className="w-5 h-5" />}
                    </button>
                </div>
            </header>

            {/* Mobile menu drawer - Full-height Overlay anchored beneath Top Header Bar */}
            {isMobileMenuOpen && (
                <div className="lg:hidden fixed inset-x-0 top-[56px] bottom-0 z-[99998] bg-white/98 dark:bg-slate-950/98 backdrop-blur-2xl flex flex-col justify-between overflow-y-auto animate-fade-in p-3 space-y-4 shadow-2xl">
                    {/* User Profile Capsule on Mobile Drawer Header */}
                    {displayName && (
                        <Link
                            to={ROUTES.SETTINGS}
                            onClick={() => setIsMobileMenuOpen(false)}
                            className="p-3 bg-slate-50 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 hover:border-cyan-400 dark:hover:border-cyan-500/50 rounded-2xl flex items-center gap-3 shadow-sm active:scale-[0.98] transition-all cursor-pointer group shrink-0"
                        >
                            <div className="w-10 h-10 rounded-full bg-white dark:bg-slate-800 border border-cyan-500/40 flex items-center justify-center text-xs font-bold shrink-0 overflow-hidden shadow-inner group-hover:scale-105 transition-transform">
                                {renderAvatar()}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5">
                                    <span className="font-extrabold text-sm text-slate-800 dark:text-white truncate">{displayName}</span>
                                    {isPremium ? (
                                        <span className="bg-amber-500/15 text-amber-600 dark:text-amber-400 text-[9px] font-mono font-black px-1.5 py-0.5 rounded border border-amber-500/30">PREMIUM</span>
                                    ) : (
                                        <span className="bg-slate-200 dark:bg-slate-800 text-slate-500 text-[9px] font-mono font-bold px-1.5 py-0.5 rounded">FREE</span>
                                    )}
                                </div>
                                <p className="text-[10px] text-slate-400 font-mono mt-0.5">LV {xpDetails.level} • {getLevelTitle(xpDetails.level)}</p>
                            </div>
                            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-cyan-500 shrink-0 transition-colors" />
                        </Link>
                    )}

                    {/* Navigation Items */}
                    <nav className="space-y-1 flex-1">
                        {menuItems.map((item) => {
                            const active = isMenuActive(item);
                            return (
                                <Link
                                    key={item.id}
                                    to={item.disabled ? '#' : item.route}
                                    onClick={(e) => {
                                        if (item.disabled) e.preventDefault();
                                        else setIsMobileMenuOpen(false);
                                    }}
                                    className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl transition-all relative ${
                                        item.disabled
                                            ? 'cursor-not-allowed opacity-40 text-slate-400'
                                            : active
                                            ? 'bg-cyan-50 dark:bg-cyan-950/60 text-cyan-700 dark:text-cyan-400 font-bold border border-cyan-200 dark:border-cyan-500/40 shadow-sm'
                                            : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                                    }`}
                                >
                                    {active && !item.disabled && (
                                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-cyan-500 dark:bg-cyan-400 rounded-r-full shadow-[0_0_8px_rgba(6,182,212,0.8)]" />
                                    )}
                                    <div className="flex items-center space-x-3 min-w-0 pl-1">
                                        <item.icon className={`w-4.5 h-4.5 ${active ? 'text-cyan-600 dark:text-cyan-400' : 'text-slate-500 dark:text-slate-400'}`} />
                                        <span className="text-xs font-semibold truncate">{item.label}</span>
                                    </div>
                                    {item.badge > 0 && (
                                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black font-mono bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-400 border border-rose-200 dark:border-rose-800/60 shadow-sm">
                                            {item.badge}
                                        </span>
                                    )}
                                </Link>
                            );
                        })}
                    </nav>

                    {/* Bottom Quick Controls & Language Selectors */}
                    <div className="p-3 border-t border-slate-200 dark:border-slate-800/80 space-y-2 bg-slate-50/70 dark:bg-slate-900/80 rounded-2xl shrink-0">
                        {/* 2-Column Language Selectors */}
                        <div className="grid grid-cols-2 gap-2">
                            <div className="flex items-center justify-between bg-white dark:bg-slate-950 p-1.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                                <span className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 pl-1">🎯 HỌC</span>
                                <TargetLanguageSelector isAdmin={isAdmin} />
                            </div>
                            <div className="flex items-center justify-between bg-white dark:bg-slate-950 p-1.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                                <span className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 pl-1">🌐 NGÔN NGỮ</span>
                                <LanguageSelector compact={true} />
                            </div>
                        </div>

                        {/* Upgrade Button */}
                        <Link
                            to={ROUTES.UPGRADE}
                            onClick={() => setIsMobileMenuOpen(false)}
                            className="w-full flex items-center justify-center space-x-2 px-3 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-extrabold text-xs shadow-md active:scale-98 transition-transform"
                        >
                            <Crown className="w-4 h-4 fill-white" />
                            <span>{t('common.upgrade', 'Nâng cấp tài khoản')}</span>
                        </Link>

                        {/* Quick Utility Action Buttons */}
                        <div className="grid grid-cols-3 gap-1.5">
                            <button
                                onClick={() => {
                                    setIsMobileMenuOpen(false);
                                    window.dispatchEvent(new CustomEvent('open-admin-chat'));
                                }}
                                className="flex items-center justify-center gap-1.5 p-2 rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30 text-[11px] font-bold cursor-pointer hover:bg-cyan-500/20 transition-colors"
                            >
                                <MessageSquare className="w-3.5 h-3.5" />
                                <span>Chat</span>
                            </button>

                            <button
                                onClick={() => {
                                    setIsMobileMenuOpen(false);
                                    if (onTriggerTour) onTriggerTour();
                                    else navigate(ROUTES.HELP);
                                }}
                                className="flex items-center justify-center gap-1.5 p-2 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30 text-[11px] font-bold cursor-pointer hover:bg-indigo-500/20 transition-colors"
                            >
                                <HelpCircle className="w-3.5 h-3.5" />
                                <span>Giúp đỡ</span>
                            </button>

                            <button
                                onClick={() => setIsDarkMode(prev => !prev)}
                                className="flex items-center justify-center gap-1.5 p-2 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 text-[11px] font-bold cursor-pointer hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors"
                            >
                                {isDarkMode ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5 text-indigo-600" />}
                                <span>{isDarkMode ? 'Sáng' : 'Tối'}</span>
                            </button>
                        </div>

                        {/* Standalone Red Logout Button */}
                        <button
                            onClick={handleLogout}
                            className="w-full flex items-center justify-center space-x-2 px-3 py-2 rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-200 dark:border-rose-800 text-xs font-extrabold cursor-pointer hover:bg-rose-100 dark:hover:bg-rose-900/60 transition-colors"
                        >
                            <LogOut className="w-3.5 h-3.5" />
                            <span>Đăng xuất</span>
                        </button>
                    </div>
                </div>
            )}

            {/* Desktop Cyber-AI Futuristic Sidebar */}
            <aside className={`hidden lg:flex flex-col fixed left-0 top-0 bottom-0 z-40 transition-all duration-300 ${isCollapsed ? 'w-20' : 'w-64'} bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 shadow-xl`}>
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

                {/* Cyber Profile Telemetry Capsule */}
                {!isCollapsed && displayName && (
                    <div className="px-4 py-4 border-b border-slate-200 dark:border-slate-800">
                        <Link
                            to={ROUTES.SETTINGS}
                            className="flex items-center gap-3 bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-cyan-500/30 rounded-2xl p-3 shadow-inner hover:border-cyan-400 transition-all w-full cursor-pointer group min-w-0"
                            title="Trang cá nhân"
                        >
                            <div className="flex flex-col items-center gap-1 flex-shrink-0">
                                <div className="w-10 h-10 rounded-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-cyan-500/40 flex items-center justify-center text-[10px] font-bold text-slate-700 dark:text-slate-300 overflow-hidden shadow-sm group-hover:scale-105 transition-transform">
                                    {renderAvatar()}
                                </div>
                                <span className="bg-gradient-to-r from-cyan-500 to-indigo-600 text-white text-[8px] font-black px-1.5 py-0.2 rounded font-mono uppercase">
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
                        </Link>
                    </div>
                )}

                {/* Navigation Menu */}
                <nav className="flex-1 p-3 space-y-1.5 overflow-y-auto custom-scrollbar">
                    {menuItems.map((item) => (
                        <div key={item.id} className="relative group">
                            <Link
                                to={item.disabled ? '#' : item.route}
                                onClick={(e) => {
                                    if (item.disabled) e.preventDefault();
                                }}
                                className={`w-full flex items-center justify-between ${isCollapsed ? 'justify-center' : 'space-x-3'} px-3.5 py-2.5 rounded-xl transition-all duration-200 relative ${
                                    item.disabled
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
                    ))}
                </nav>

                {/* Bottom Cyber Controls with Chatbox & Help Integrated */}
                <div className="p-3 border-t border-slate-200 dark:border-slate-800 space-y-2 bg-slate-50/50 dark:bg-slate-950/50">
                    {!isCollapsed ? (
                        <div className="space-y-2">
                            <div className="flex items-center justify-between bg-white dark:bg-slate-900 p-2 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                                <span className="text-xs font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1.5 pl-1">
                                    🎯 NGÔN NGỮ MUỐN HỌC
                                </span>
                                <TargetLanguageSelector isAdmin={isAdmin} />
                            </div>

                            <div className="flex items-center justify-between bg-white dark:bg-slate-900 p-2 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                                <span className="text-xs font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1.5 pl-1">
                                    🌐 {t('common.language', 'Ngôn ngữ')}
                                </span>
                                <LanguageSelector compact={true} />
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center gap-2">
                            <TargetLanguageSelector minimal={true} isAdmin={isAdmin} />
                            <LanguageSelector compact={true} minimal={true} direction="up" />
                        </div>
                    )}

                    <Link
                        to={ROUTES.UPGRADE}
                        className={`w-full flex items-center ${isCollapsed ? 'justify-center' : 'space-x-3'} px-3.5 py-2.5 rounded-xl transition-all duration-200 font-mono text-xs font-bold ${
                            location.pathname === ROUTES.UPGRADE
                                ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md'
                                : 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-300/60 dark:border-amber-700/50 hover:bg-amber-500/20'
                        }`}
                        title={isCollapsed ? t('common.upgrade', 'Nâng cấp tài khoản') : undefined}
                    >
                        <Crown className="w-4 h-4 text-amber-500 fill-amber-500 shrink-0" />
                        {!isCollapsed && <span>{t('common.upgrade', 'Nâng cấp tài khoản')}</span>}
                    </Link>

                    {/* Integrated Cyber Quick Control Chips + Standalone Logout */}
                    <div className="space-y-2 pt-1 border-t border-slate-200/60 dark:border-slate-800/60">
                        {isCollapsed ? (
                            /* Collapsed Mode: Only show Expand button */
                            <button
                                onClick={() => setIsCollapsed(false)}
                                className="w-full py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-slate-500 hover:text-cyan-600 dark:text-slate-400 dark:hover:text-cyan-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center justify-center cursor-pointer shadow-sm"
                                title="Mở rộng Sidebar"
                            >
                                <ChevronRight className="w-5 h-5" />
                            </button>
                        ) : (
                            /* Expanded Mode: Full 4-icon horizontal row */
                            <div className="flex items-center justify-between p-1 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-sm w-full">
                                {/* Chatbox with Admin Button */}
                                <button
                                    onClick={() => window.dispatchEvent(new CustomEvent('open-admin-chat'))}
                                    className="p-2 rounded-lg text-cyan-600 dark:text-cyan-400 hover:bg-cyan-50 dark:hover:bg-cyan-950/50 transition-colors cursor-pointer"
                                    title="Chatbox hỗ trợ với Admin"
                                >
                                    <MessageSquare className="w-4.5 h-4.5" />
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

                                {/* Collapse Nav Toggle - Placed at the rightmost position */}
                                <button
                                    onClick={() => setIsCollapsed(true)}
                                    className="p-2 rounded-lg text-slate-400 hover:text-slate-700 dark:text-slate-500 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                                    title="Thu gọn Sidebar"
                                >
                                    <ChevronLeft className="w-4.5 h-4.5" />
                                </button>
                            </div>
                        )}

                        {/* Dedicated Standalone Logout Button */}
                        <button
                            onClick={handleLogout}
                            className={`w-full flex items-center ${isCollapsed ? 'justify-center' : 'justify-center space-x-2'} px-3.5 py-2.5 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 hover:bg-rose-500/20 text-xs font-bold transition-all cursor-pointer shadow-sm`}
                            title={isCollapsed ? "Đăng xuất" : undefined}
                        >
                            <LogOut className="w-4 h-4 text-rose-500 shrink-0" />
                            {!isCollapsed && <span>Đăng xuất</span>}
                        </button>
                    </div>
                </div>
            </aside>
        </>
    );
};

export default Sidebar;
