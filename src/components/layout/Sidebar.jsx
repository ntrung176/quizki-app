import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth, db, appId } from '../../config/firebase';
import { collection, query, onSnapshot, doc } from 'firebase/firestore';
import { ROUTES } from '../../router';
import { getLevelFromXp, getLevelTitle } from '../../utils/scoring';
import { 
    Home, BookOpen, LogOut, Sun, Moon, Sparkle, ChevronRight, X, 
    List, Repeat2, FileCheck, Languages, Shield, Crown, Bell, 
    MessageSquare, HelpCircle, Trophy, Cpu, Zap, Activity, Bot
} from 'lucide-react'
import { SafeAvatarImage } from '../ui';
import { isVocabCardDue, isSrsCardDue } from '../../utils/srs';
import { getSharedKanjiList, subscribeKanjiSrs } from '../../utils/kanjiService';
import { getSharedGrammarPointsList, subscribeGrammarSrs } from '../../utils/grammarService';

// Sidebar Component - Restored Exact Original Menus with Chatbox & Help Buttons Integrated at Bottom
const Sidebar = ({ 
    isDarkMode, 
    setIsDarkMode, 
    displayName, 
    isAdmin, 
    userId, 
    allCards = [], 
    isPremium = false, 
    avatar, 
    profile,
    onTriggerTour
}) => {
    const navigate = useNavigate();
    const location = useLocation();

    const xpDetails = React.useMemo(() => {
        const xp = profile?.xp || 0;
        return getLevelFromXp(xp);
    }, [profile?.xp]);

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

    const [isCollapsed, setIsCollapsed] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    
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

    // Listen to Kanji SRS due count synchronized with Kanji module
    useEffect(() => {
        if (!userId) return;
        let isMounted = true;
        let unsub = () => {};

        getSharedKanjiList().then(kList => {
            if (!isMounted) return;
            const validKanjiIds = new Set((kList || []).map(k => k.id));

            unsub = subscribeKanjiSrs(userId, (freshSrs) => {
                if (!isMounted) return;
                let dueCount = 0;
                const now = Date.now();
                Object.entries(freshSrs || {}).forEach(([id, data]) => {
                    if (validKanjiIds.size > 0 && !validKanjiIds.has(id)) return;
                    if (isSrsCardDue(data, now)) dueCount++;
                });
                setKanjiDueCount(dueCount);
            });
        }).catch(err => {
            console.error('Error fetching kanji list in Sidebar:', err);
        });

        return () => {
            isMounted = false;
            unsub();
        };
    }, [userId]);

    // Listen to Grammar SRS due count synchronized with Grammar module
    useEffect(() => {
        if (!userId) return;
        let isMounted = true;
        let unsub = () => {};

        getSharedGrammarPointsList().then(gList => {
            if (!isMounted) return;
            const validGrammarIds = new Set((gList || []).map(g => g.id));

            unsub = subscribeGrammarSrs(userId, (freshSrs) => {
                if (!isMounted) return;
                let dueCount = 0;
                const now = Date.now();
                Object.entries(freshSrs || {}).forEach(([id, data]) => {
                    if (validGrammarIds.size > 0 && !validGrammarIds.has(id)) return;
                    if (isSrsCardDue(data, now)) dueCount++;
                });
                setGrammarDueCount(dueCount);
            });
        }).catch(err => {
            console.error('Error fetching grammar list in Sidebar:', err);
        });

        return () => {
            isMounted = false;
            unsub();
        };
    }, [userId]);

    // Listen to Global Notifications
    useEffect(() => {
        if (!userId || !db) return;
        const q = query(collection(db, `artifacts/${appId}/globalNotifications`));
        const unsub = onSnapshot(q, (snap) => {
            const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            list.sort((a, b) => {
                const aTime = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : (a.createdAt || 0);
                const bTime = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : (b.createdAt || 0);
                return bTime - aTime;
            });
            setGlobalNotifications(list);
        }, () => { });
        return () => unsub();
    }, [userId]);

    // Calculate due vocab count
    const dueVocabCount = allCards.filter(card => isVocabCardDue(card)).length;
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
            await signOut(auth);
            navigate(ROUTES.LOGIN);
        } catch (error) {
            console.error('Logout error:', error);
        }
    };

    // Exact Original Menu Items List Restored
    const menuItems = [
        { id: 'HOME', icon: Home, label: 'Trang chủ', route: ROUTES.HOME },
        { id: 'VOCAB_LIST', icon: BookOpen, label: 'Từ vựng', route: ROUTES.VOCAB_REVIEW, badge: dueVocabCount },
        { id: 'KANJI_STUDY', icon: Languages, label: 'Thư viện Kanji', route: ROUTES.KANJI_REVIEW, badge: kanjiDueCount },
        { id: 'GRAMMAR', icon: Repeat2, label: 'Ngữ pháp', route: ROUTES.GRAMMAR_REVIEW, badge: grammarDueCount },
        { id: 'JLPT_TEST', icon: FileCheck, label: 'Luyện đề JLPT', route: ROUTES.JLPT_TEST },
        { id: 'JLPT_KAIWA', icon: MessageSquare, label: 'Luyện KAIWA 1:1', route: ROUTES.JLPT_KAIWA },
        { id: 'HUB', icon: Trophy, label: 'Bảng vinh danh', route: ROUTES.HUB },
    ];

    if (isAdmin) {
        menuItems.push({ id: 'ADMIN', icon: Shield, label: 'Quản trị', route: ROUTES.ADMIN });
    }

    const isMenuActive = (item) => {
        const path = location.pathname;
        if (item.id === 'HOME') return path === '/' || path === '/home';
        if (item.id === 'VOCAB_LIST') return path.includes('/vocab');
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
                    {globalNotifications.length === 0 && dueVocabCount === 0 && kanjiDueCount === 0 && grammarDueCount === 0 && (
                        <p className="text-xs text-slate-400 text-center py-4 font-mono">Không có thông báo mới</p>
                    )}
                </div>
            </div>
        );
    };

    // Mobile Header
    const MobileHeader = () => (
        <header className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 py-3 flex items-center justify-between shadow-md">
            <Link to={ROUTES.HOME} className="flex items-center space-x-2.5">
                <div className="w-9 h-9 bg-gradient-to-tr from-cyan-500 via-indigo-600 to-sky-500 rounded-xl flex items-center justify-center text-white shadow-md shadow-cyan-500/20 border border-cyan-400/30">
                    <BookOpen className="w-5 h-5" />
                </div>
                <span className="text-lg font-black text-slate-800 dark:text-white tracking-wide">QuizKi <span className="text-cyan-500 font-mono text-xs">AI</span></span>
            </Link>

            <div className="flex items-center space-x-2">
                <div className="relative">
                    <button
                        onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                        className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 cursor-pointer"
                    >
                        <Bell className="w-4 h-4" />
                        {hasUnread && (
                            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full animate-ping"></span>
                        )}
                    </button>
                    <NotificationsPopover isMobile={true} />
                </div>

                <button
                    onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                    className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 cursor-pointer"
                >
                    {isMobileMenuOpen ? <X className="w-5 h-5" /> : <List className="w-5 h-5" />}
                </button>
            </div>

            {/* Mobile menu drawer */}
            {isMobileMenuOpen && (
                <div className="fixed inset-0 top-[60px] z-50 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex flex-col overflow-y-auto">
                    <nav className="p-4 space-y-1.5 flex-1">
                        {menuItems.map((item) => (
                            <Link
                                key={item.id}
                                to={item.route}
                                onClick={() => setIsMobileMenuOpen(false)}
                                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all ${
                                    isMenuActive(item)
                                        ? 'bg-cyan-50 dark:bg-cyan-950/60 text-cyan-700 dark:text-cyan-400 font-bold border border-cyan-200 dark:border-cyan-500/40 shadow-sm'
                                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                                }`}
                            >
                                <div className="flex items-center space-x-3">
                                    <item.icon className="w-5 h-5 text-indigo-600 dark:text-cyan-400" />
                                    <span className="text-sm font-semibold">{item.label}</span>
                                </div>
                                {item.badge > 0 && (
                                    <span className="px-2 py-0.5 rounded-full text-xs font-bold font-mono bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-400 border border-rose-200 dark:border-rose-800/60">
                                        {item.badge}
                                    </span>
                                )}
                            </Link>
                        ))}
                    </nav>

                    <div className="p-4 border-t border-slate-200 dark:border-slate-800 space-y-3 bg-white dark:bg-slate-900">
                        <Link
                            to={ROUTES.UPGRADE}
                            onClick={() => setIsMobileMenuOpen(false)}
                            className="w-full flex items-center justify-center space-x-2 px-4 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold text-sm shadow-md"
                        >
                            <Crown className="w-4 h-4 fill-white" />
                            <span>Nâng cấp tài khoản</span>
                        </Link>

                        <div className="grid grid-cols-2 gap-2">
                            <button
                                onClick={() => {
                                    setIsMobileMenuOpen(false);
                                    window.dispatchEvent(new CustomEvent('open-admin-chat'));
                                }}
                                className="flex items-center justify-center gap-2 p-2.5 rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30 text-xs font-bold cursor-pointer"
                            >
                                <MessageSquare className="w-4 h-4" />
                                <span>Chat Admin</span>
                            </button>

                            <button
                                onClick={() => {
                                    setIsMobileMenuOpen(false);
                                    if (onTriggerTour) onTriggerTour();
                                    else navigate(ROUTES.HELP);
                                }}
                                className="flex items-center justify-center gap-2 p-2.5 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30 text-xs font-bold"
                            >
                                <HelpCircle className="w-4 h-4" />
                                <span>Hướng dẫn</span>
                            </button>
                        </div>

                        <button
                            onClick={() => setIsDarkMode(prev => !prev)}
                            className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 text-sm font-medium cursor-pointer"
                        >
                            <span className="flex items-center gap-2">
                                {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-600" />}
                                {isDarkMode ? 'Giao diện sáng' : 'Giao diện tối'}
                            </span>
                        </button>

                        <button
                            onClick={handleLogout}
                            className="w-full flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-200 dark:border-rose-800 text-sm font-bold cursor-pointer"
                        >
                            <LogOut className="w-4 h-4" />
                            <span>Đăng xuất</span>
                        </button>
                    </div>
                </div>
            )}
        </header>
    );

    // Desktop Cyber-AI Futuristic Sidebar
    const DesktopSidebar = () => (
        <aside className={`hidden lg:flex flex-col fixed left-0 top-0 bottom-0 z-40 transition-all duration-300 ${isCollapsed ? 'w-20' : 'w-64'} bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 shadow-xl`}>
            {/* Cyber Brand Logo */}
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <Link
                    to={ROUTES.HOME}
                    className="flex items-center space-x-3"
                >
                    <div className="w-10 h-10 bg-gradient-to-tr from-cyan-500 via-indigo-600 to-sky-500 rounded-xl flex items-center justify-center text-white shadow-md shadow-cyan-500/25 border border-cyan-400/40 shrink-0">
                        <BookOpen className="w-5 h-5" />
                    </div>
                    {!isCollapsed && (
                        <div className="flex flex-col">
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
                <Link
                    to={ROUTES.UPGRADE}
                    className={`w-full flex items-center ${isCollapsed ? 'justify-center' : 'space-x-3'} px-3.5 py-2.5 rounded-xl transition-all duration-200 font-mono text-xs font-bold ${
                        location.pathname === ROUTES.UPGRADE
                            ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md'
                            : 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-300/60 dark:border-amber-700/50 hover:bg-amber-500/20'
                    }`}
                    title={isCollapsed ? 'Nâng cấp tài khoản' : undefined}
                >
                    <Crown className="w-4 h-4 text-amber-500 fill-amber-500 shrink-0" />
                    {!isCollapsed && <span>Nâng cấp tài khoản</span>}
                </Link>

                {/* Integrated Cyber Quick Control Chips (Chatbox with Admin, Help, Theme, Collapse, Logout) */}
                <div className="flex items-center justify-between gap-1 pt-1 border-t border-slate-200/60 dark:border-slate-800/60">
                    {/* Chatbox with Admin Button */}
                    <button
                        onClick={() => window.dispatchEvent(new CustomEvent('open-admin-chat'))}
                        className={`p-2 rounded-xl text-cyan-600 dark:text-cyan-400 hover:bg-cyan-50 dark:hover:bg-cyan-950/50 transition-colors cursor-pointer ${isCollapsed ? 'w-full flex justify-center' : ''}`}
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
                        className={`p-2 rounded-xl text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 transition-colors cursor-pointer ${isCollapsed ? 'w-full flex justify-center' : ''}`}
                        title="Xem hướng dẫn trang này"
                    >
                        <HelpCircle className="w-4.5 h-4.5" />
                    </button>

                    {/* Dark Mode Toggle */}
                    <button
                        onClick={() => setIsDarkMode(prev => !prev)}
                        className={`p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer ${isCollapsed ? 'w-full flex justify-center' : ''}`}
                        title={isDarkMode ? 'Giao diện sáng' : 'Giao diện tối'}
                    >
                        {isDarkMode ? <Sun className="w-4.5 h-4.5 text-amber-400" /> : <Moon className="w-4.5 h-4.5 text-indigo-600" />}
                    </button>

                    {/* Collapse Sidebar Toggle */}
                    {!isCollapsed && (
                        <button
                            onClick={() => setIsCollapsed(!isCollapsed)}
                            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:text-slate-500 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                            title="Thu gọn Sidebar"
                        >
                            <ChevronRight className="w-4.5 h-4.5 rotate-180" />
                        </button>
                    )}

                    {/* Logout Button */}
                    <button
                        onClick={handleLogout}
                        className={`p-2 rounded-xl text-slate-400 hover:text-rose-600 dark:text-slate-500 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer ${isCollapsed ? 'w-full flex justify-center' : ''}`}
                        title="Đăng xuất"
                    >
                        <LogOut className="w-4.5 h-4.5" />
                    </button>
                </div>
            </div>
        </aside>
    );

    return (
        <>
            <MobileHeader />
            <DesktopSidebar />
        </>
    );
};

export default Sidebar;
