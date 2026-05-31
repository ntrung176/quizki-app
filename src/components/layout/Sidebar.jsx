import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth, db, appId } from '../../config/firebase';
import { collection, query, onSnapshot } from 'firebase/firestore';
import { ROUTES } from '../../router';
import {
    Home, BookOpen, BarChart3, Users, Settings, Plus,
    LogOut, Sun, Moon, Sparkles, ChevronRight, X, List,
    Repeat2, FileCheck, Languages, Shield, ChevronDown,
    Trophy, Heart, Gamepad2, MessageSquare, Crown, MessageCircle, User, Bell, Clock, Trash2
} from 'lucide-react';

// Sidebar Component - Navigation with submenu support
const Sidebar = ({ isDarkMode, setIsDarkMode, displayName, isAdmin, userId, allCards = [] }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [expandedMenus, setExpandedMenus] = useState([]); // Start collapsed for cleaner look
    const [flyoutMenu, setFlyoutMenu] = useState(null);

    // Notifications state
    const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
    const [kanjiDueCount, setKanjiDueCount] = useState(0);
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

    // Listen to Kanji SRS due count
    useEffect(() => {
        if (!userId || !db) return;
        const q = query(collection(db, `artifacts/${appId}/users/${userId}/kanjiSRS`));
        const unsub = onSnapshot(q, (snap) => {
            let dueCount = 0;
            const now = Date.now();
            snap.docs.forEach(d => {
                const data = d.data();
                if (data.nextReview && data.nextReview <= now) dueCount++;
            });
            setKanjiDueCount(dueCount);
        }, () => { });
        return () => unsub();
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
    const dueVocabCount = allCards.filter(card =>
        card.srsEnabled === true && card.nextReview_back && card.nextReview_back <= Date.now()
    ).length;

    // Check if there are any unread notifications (due counts > 0 OR unread global notifications)
    const hasUnread = dueVocabCount > 0 || kanjiDueCount > 0 || globalNotifications.some(n => !readNotificationIds.includes(n.id));

    const markAllAsRead = () => {
        const allIds = globalNotifications.map(n => n.id);
        setReadNotificationIds(allIds);
    };

    const NotificationsPopover = ({ isMobile = false }) => {
        if (!isNotificationsOpen) return null;
        return (
            <div
                ref={popoverRef}
                className={`absolute z-50 w-80 bg-white dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700 rounded-2xl shadow-xl p-4 text-left ${isMobile
                        ? 'right-0 top-12 max-h-[80vh] overflow-y-auto'
                        : 'left-4 top-16 max-h-[70vh] overflow-y-auto'
                    }`}
            >
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700/60 pb-2 mb-3">
                    <span className="font-bold text-sm text-slate-800 dark:text-white flex items-center gap-1.5">
                        <Bell className="w-4 h-4 text-[#2E5B70] dark:text-sky-400 font-bold" />
                        Thông báo của bạn
                    </span>
                    {globalNotifications.some(n => !readNotificationIds.includes(n.id)) && (
                        <button
                            onClick={markAllAsRead}
                            className="text-xs font-semibold text-[#2E5B70] dark:text-sky-400 hover:underline cursor-pointer"
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
                            className="w-full p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/20 border border-rose-100/50 dark:border-rose-900/30 flex items-start gap-3 hover:scale-[1.01] transition-transform text-left cursor-pointer"
                        >
                            <div className="w-8 h-8 rounded-lg bg-rose-100 dark:bg-rose-900/40 flex items-center justify-center flex-shrink-0">
                                <BookOpen className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                            </div>
                            <div>
                                <h4 className="font-bold text-xs text-rose-800 dark:text-rose-300">Từ vựng đến hạn ôn tập</h4>
                                <p className="text-[11px] text-rose-700/80 dark:text-rose-400/80 mt-0.5">Bạn có {dueVocabCount} từ vựng cần ôn tập ngay hôm nay.</p>
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
                            className="w-full p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-100/50 dark:border-amber-900/30 flex items-start gap-3 hover:scale-[1.01] transition-transform text-left cursor-pointer"
                        >
                            <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center flex-shrink-0">
                                <Languages className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                            </div>
                            <div>
                                <h4 className="font-bold text-xs text-amber-800 dark:text-amber-300">Kanji đến hạn ôn tập</h4>
                                <p className="text-[11px] text-amber-700/80 dark:text-amber-400/80 mt-0.5">Bạn có {kanjiDueCount} chữ Kanji cần ôn tập.</p>
                            </div>
                        </button>
                    )}

                    {/* Global Admin Notifications */}
                    {globalNotifications.map(notif => {
                        const isRead = readNotificationIds.includes(notif.id);
                        return (
                            <div
                                key={notif.id}
                                onClick={() => {
                                    if (!isRead) {
                                        setReadNotificationIds(prev => [...prev, notif.id]);
                                    }
                                }}
                                className={`p-2.5 rounded-xl border transition-all text-left relative ${isRead
                                        ? 'bg-slate-50 dark:bg-slate-800/40 border-slate-100 dark:border-slate-700/40'
                                        : 'bg-indigo-50/50 dark:bg-indigo-950/20 border-indigo-100/50 dark:border-indigo-900/30 cursor-pointer hover:border-indigo-200'
                                    }`}
                            >
                                {!isRead && (
                                    <span className="absolute top-3 right-3 w-1.5 h-1.5 bg-indigo-600 dark:bg-sky-400 rounded-full"></span>
                                )}
                                <div className="flex items-start gap-3">
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${isRead ? 'bg-slate-200/50 dark:bg-slate-700' : 'bg-indigo-100 dark:bg-indigo-900/40'
                                        }`}>
                                        <Sparkles className={`w-4 h-4 ${isRead ? 'text-slate-500' : 'text-indigo-600 dark:text-indigo-400'}`} />
                                    </div>
                                    <div className="overflow-hidden">
                                        <h4 className={`font-bold text-xs truncate ${isRead ? 'text-slate-600 dark:text-slate-400' : 'text-slate-800 dark:text-white'}`}>
                                            {notif.title}
                                        </h4>
                                        <p className={`text-[11px] mt-0.5 whitespace-pre-wrap leading-relaxed ${isRead ? 'text-slate-500 dark:text-slate-500' : 'text-slate-600 dark:text-slate-300'}`}>
                                            {notif.message}
                                        </p>
                                        <span className="text-[9px] text-slate-400 dark:text-slate-500 mt-1.5 block">
                                            {new Date(notif.createdAt).toLocaleDateString('vi-VN')}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        );
                    })}

                    {dueVocabCount === 0 && kanjiDueCount === 0 && globalNotifications.length === 0 && (
                        <div className="py-6 text-center text-xs text-slate-400 dark:text-slate-500 italic">
                            Chưa có thông báo nào mới.
                        </div>
                    )}
                </div>
            </div>
        );
    };

    // Hide sidebar completely on login page or when not logged in
    if (!userId || location.pathname === ROUTES.LOGIN || location.pathname === '/login' || location.pathname === '/privacy' || location.pathname === '/terms') {
        return null;
    }

    // Get current view from URL path
    const getCurrentView = () => {
        const path = location.pathname;
        if (path === '/' || path === ROUTES.HOME) return 'HOME';
        if (path === ROUTES.VOCAB_REVIEW || path.startsWith('/vocab/review/')) return 'VOCAB_REVIEW';
        if (path === ROUTES.VOCAB_LIST || path.startsWith('/vocab/list') || path.startsWith('/vocab/edit')) return 'VOCAB_LIST';
        if (path === ROUTES.VOCAB_ADD) return 'VOCAB_ADD';
        if (path === ROUTES.KANJI_STUDY || path.startsWith('/kanji/study/')) return 'KANJI_STUDY';
        if (path === ROUTES.KANJI_REVIEW || path.startsWith('/kanji/review/')) return 'KANJI_REVIEW';
        if (path === ROUTES.KANJI_SAVED) return 'KANJI_SAVED';
        if (path === ROUTES.KANJI_LIST || path.startsWith('/kanji/list/')) return 'KANJI_LIST';
        if (path === ROUTES.TEST) return 'TEST';
        if (path === ROUTES.JLPT_TEST) return 'JLPT_TEST';
        if (path === ROUTES.JLPT_ADMIN) return 'JLPT_ADMIN';
        if (path === ROUTES.HUB || path.startsWith('/hub')) return 'HUB';
        if (path === ROUTES.ACCOUNT) return 'ACCOUNT';
        if (path === ROUTES.SETTINGS) return 'SETTINGS';
        if (path === ROUTES.FEEDBACK) return 'FEEDBACK';
        if (path === ROUTES.FORUM) return 'FORUM';
        if (path.startsWith('/profile')) return 'PROFILE';
        if (path === ROUTES.BOOKS) return 'BOOKS_LIST';
        if (path === ROUTES.UPGRADE) return 'UPGRADE';
        if (path === ROUTES.ADMIN) return 'ADMIN';
        if (path === ROUTES.GRAMMAR || path.startsWith('/grammar')) return 'GRAMMAR';
        return 'HOME';
    };

    const currentView = getCurrentView();

    const handleLogout = async () => {
        try {
            if (auth) {
                await signOut(auth);
                navigate(ROUTES.LOGIN);
            }
        } catch (e) {
            console.error('Lỗi đăng xuất:', e);
        }
    };

    const toggleMenu = (menuId) => {
        setExpandedMenus(prev =>
            prev.includes(menuId)
                ? [] // Close if already open
                : [menuId] // Open only this one (accordion)
        );
    };

    // Menu structure matching the new requirements
    const menuItems = [
        { id: 'HOME', icon: Home, label: 'Trang chủ', route: ROUTES.HOME },
        { id: 'VOCAB_LIST', icon: BookOpen, label: 'Từ vựng', route: ROUTES.VOCAB_LIST },
        { id: 'KANJI_STUDY', icon: Languages, label: 'Thư viện Kanji', route: ROUTES.KANJI_STUDY },
        { id: 'GRAMMAR', icon: Repeat2, label: 'Ngữ pháp', route: ROUTES.GRAMMAR },
        { id: 'JLPT_TEST', icon: FileCheck, label: 'Luyện đề JLPT', route: ROUTES.JLPT_TEST },
        { id: 'HUB', icon: Trophy, label: 'Bảng vinh danh', route: ROUTES.HUB },
    ];

    if (isAdmin) {
        menuItems.push({ id: 'ADMIN', icon: Shield, label: 'Quản trị', route: ROUTES.ADMIN });
    }

    const mobileMenuItems = [
        ...menuItems,
        { id: 'UPGRADE', icon: Crown, label: 'Nâng cấp tài khoản', route: ROUTES.UPGRADE }
    ];

    // Check if a menu or any of its children is active
    const isMenuActive = (item) => {
        if (item.hasSubmenu) {
            return item.children.some(child => currentView === child.id);
        }
        if (item.id === 'KANJI_STUDY') {
            return currentView.startsWith('KANJI_');
        }
        if (item.id === 'VOCAB_LIST') {
            return currentView.startsWith('VOCAB_');
        }
        if (item.id === 'HUB') {
            return currentView === 'HUB';
        }
        if (item.id === 'JLPT_TEST') {
            return currentView === 'JLPT_TEST' || currentView === 'JLPT_ADMIN';
        }
        return currentView === item.id;
    };

    // Mobile header for small screens
    const MobileHeader = () => (
        <header className="lg:hidden fixed top-0 left-0 right-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-b border-gray-200 dark:border-slate-700/50 z-50 h-14 shadow-sm dark:shadow-none">
            <div className="h-full px-4 flex items-center justify-between">
                <Link to={ROUTES.VOCAB_REVIEW} className="flex items-center space-x-3.5">
                    <div className="w-9 h-9 bg-[#2E5B70] rounded-xl flex items-center justify-center text-white shadow-md shadow-[#2E5B70]/20">
                        <BookOpen className="w-5 h-5" />
                    </div>
                    <span className="text-lg font-bold text-slate-800 dark:text-white tracking-tight">QuizKi</span>
                </Link>

                <div className="flex items-center space-x-2">
                    <Link
                        to={ROUTES.VOCAB_ADD}
                        className="p-2 bg-sky-600 hover:bg-sky-700 text-white rounded-lg transition-colors"
                    >
                        <Plus className="w-5 h-5" />
                    </Link>
                    <button
                        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                        className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                    >
                        {isMobileMenuOpen ? <X className="w-5 h-5" /> : <List className="w-5 h-5" />}
                    </button>
                </div>
            </div>

            {/* Mobile menu dropdown */}
            {isMobileMenuOpen && (
                <div className="absolute top-14 left-0 right-0 bg-white/98 dark:bg-slate-900/98 backdrop-blur-xl border-b border-gray-200 dark:border-slate-700/50 shadow-2xl max-h-[calc(100vh-3.5rem)] overflow-y-auto">
                    <nav className="p-3 space-y-1">
                        {/* User info on mobile with notifications & avatar capsule */}
                        {displayName && (
                            <div className="px-4 py-3 mb-3 bg-gray-50 dark:bg-slate-800/50 rounded-2xl flex items-center gap-3 justify-between border border-gray-200 dark:border-slate-700/50 relative">
                                <div className="flex items-center gap-2 flex-1">
                                    {/* Bell Notification Button */}
                                    <button
                                        onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                                        className="p-2.5 bg-white dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700 rounded-full text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:shadow-sm transition-all relative flex-shrink-0 cursor-pointer"
                                    >
                                        <Bell className="w-5 h-5" />
                                        {hasUnread && (
                                            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full animate-pulse"></span>
                                        )}
                                    </button>

                                    {/* Profile Capsule */}
                                    <Link
                                        to={ROUTES.SETTINGS}
                                        onClick={() => setIsMobileMenuOpen(false)}
                                        className="flex items-center gap-2 bg-white dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700 rounded-full pl-2 pr-3 py-1 shadow-sm overflow-hidden flex-1 cursor-pointer hover:border-slate-300 dark:hover:border-slate-600 transition-colors"
                                    >
                                        <div className="w-7 h-7 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-700 dark:text-slate-300 overflow-hidden flex-shrink-0">
                                            {auth?.currentUser?.photoURL ? (
                                                <img src={auth.currentUser.photoURL} alt="Avatar" className="w-full h-full object-cover" />
                                            ) : (
                                                displayName.charAt(0) || 'U'
                                            )}
                                        </div>
                                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300 truncate max-w-[100px]">
                                            {displayName}
                                        </span>
                                    </Link>
                                </div>

                                <NotificationsPopover isMobile={true} />
                            </div>
                        )}
                        {mobileMenuItems.map((item) => (
                            <div key={item.id}>
                                {item.hasSubmenu ? (
                                    <>
                                        <button
                                            onClick={() => toggleMenu(item.id)}
                                            className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-200 ${isMenuActive(item)
                                                ? 'bg-indigo-100 dark:bg-indigo-600/20 text-indigo-600 dark:text-indigo-400'
                                                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-800/50'
                                                }`}
                                        >
                                            <div className="flex items-center space-x-3">
                                                <item.icon className="w-5 h-5" />
                                                <span className="font-medium">{item.label}</span>
                                            </div>
                                            <ChevronDown className={`w-4 h-4 transition-transform ${expandedMenus.includes(item.id) ? 'rotate-180' : ''}`} />
                                        </button>
                                        {expandedMenus.includes(item.id) && (
                                            <div className="ml-8 mt-1 space-y-1">
                                                {item.children.map((child) => (
                                                    <Link
                                                        key={child.id}
                                                        to={child.route}
                                                        onClick={() => setIsMobileMenuOpen(false)}
                                                        className={`block px-4 py-2 rounded-lg text-sm transition-all ${currentView === child.id
                                                            ? 'bg-indigo-500 text-white'
                                                            : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-800/50'
                                                            }`}
                                                    >
                                                        {child.label}
                                                    </Link>
                                                ))}
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    <Link
                                        to={item.disabled ? '#' : item.route}
                                        onClick={(e) => {
                                            if (item.disabled) e.preventDefault();
                                            else setIsMobileMenuOpen(false);
                                        }}
                                        className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 ${item.disabled
                                            ? 'cursor-not-allowed opacity-50 text-gray-400'
                                            : isMenuActive(item)
                                                ? 'bg-indigo-100 dark:bg-indigo-600/20 text-indigo-600 dark:text-indigo-400 border border-indigo-300 dark:border-indigo-500/30'
                                                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-800/50'
                                            }`}
                                    >
                                        <item.icon className="w-5 h-5" />
                                        <span className="font-medium">{item.label}</span>
                                    </Link>
                                )}
                            </div>
                        ))}
                        <div className="border-t border-gray-200 dark:border-slate-700/50 my-2" />
                        <div className="flex items-center justify-between px-4 py-2">
                            <button
                                onClick={() => setIsDarkMode(prev => !prev)}
                                className="flex items-center space-x-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                            >
                                {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                                <span>{isDarkMode ? 'Giao diện sáng' : 'Giao diện tối'}</span>
                            </button>
                            <button
                                onClick={handleLogout}
                                className="flex items-center space-x-2 text-red-500 dark:text-red-400 hover:text-red-600 dark:hover:text-red-300 transition-colors"
                            >
                                <LogOut className="w-5 h-5" />
                                <span>Đăng xuất</span>
                            </button>
                        </div>
                    </nav>
                </div>
            )}
        </header>
    );

    // Desktop sidebar
    const DesktopSidebar = () => (
        <aside className={`hidden lg:flex flex-col fixed left-0 top-0 bottom-0 z-40 transition-all duration-300 ${isCollapsed ? 'w-20' : 'w-64'} bg-[#F8F9FA] dark:bg-slate-900 border-r border-slate-100 dark:border-slate-800/40 shadow-sm`}>
            {/* Logo */}
            <div className="p-4 border-b border-slate-100 dark:border-slate-800/40 flex justify-center lg:justify-start">
                <Link
                    to={ROUTES.HOME}
                    className="flex items-center space-x-3"
                >
                    <div className="w-10 h-10 bg-[#2E5B70] rounded-xl flex items-center justify-center text-white shadow-md shadow-[#2E5B70]/20 shrink-0">
                        <BookOpen className="w-5 h-5" />
                    </div>
                    {!isCollapsed && (
                        <div className="flex flex-col">
                            <span className="text-xl font-bold text-slate-800 dark:text-white leading-none">
                                QuizKi
                            </span>
                            <span className="text-[11px] text-slate-400 dark:text-slate-500 font-medium tracking-wide mt-1.5">
                                Học tập hiện đại
                            </span>
                        </div>
                    )}
                </Link>
            </div>

            {/* User info */}
            {!isCollapsed && displayName && (
                <div className="px-4 py-4 border-b border-slate-100 dark:border-slate-800/40 flex items-center gap-2 justify-between relative">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                        {/* Bell Notification Button */}
                        <button
                            onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                            className="p-2 bg-white dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700 rounded-full text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:shadow-sm transition-all relative flex-shrink-0 cursor-pointer"
                            title="Thông báo"
                        >
                            <Bell className="w-4 h-4" />
                            {hasUnread && (
                                <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-rose-500 rounded-full animate-pulse"></span>
                            )}
                        </button>

                        {/* Profile Capsule */}
                        <Link
                            to={ROUTES.SETTINGS}
                            className="flex items-center gap-1.5 bg-white dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700 rounded-full pl-1.5 pr-2.5 py-0.5 shadow-sm overflow-hidden flex-1 cursor-pointer hover:border-slate-300 dark:hover:border-slate-600 transition-colors min-w-0"
                            title="Trang cá nhân"
                        >
                            <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-[10px] font-bold text-slate-700 dark:text-slate-300 overflow-hidden flex-shrink-0">
                                {auth?.currentUser?.photoURL ? (
                                    <img src={auth.currentUser.photoURL} alt="Avatar" className="w-full h-full object-cover" />
                                ) : (
                                    displayName.charAt(0) || 'U'
                                )}
                            </div>
                            <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 truncate">
                                {displayName}
                            </span>
                        </Link>
                    </div>

                    <NotificationsPopover isMobile={false} />
                </div>
            )}

            {/* Navigation */}
            <nav className="flex-1 p-3 space-y-1 overflow-y-auto sidebar-scroll">
                {menuItems.map((item) => (
                    <div
                        key={item.id}
                        data-tour-id={item.id}
                        className="relative group"
                    >
                        <Link
                            to={item.disabled ? '#' : item.route}
                            onClick={(e) => {
                                if (item.disabled) e.preventDefault();
                            }}
                            className={`w-full flex items-center ${isCollapsed ? 'justify-center' : 'space-x-3'} px-4 py-3 rounded-xl transition-all duration-200 group relative ${item.disabled
                                ? 'cursor-not-allowed opacity-50 text-slate-300 dark:text-slate-600'
                                : isMenuActive(item)
                                    ? 'bg-slate-100/70 dark:bg-slate-800/50 text-[#2E5B70] dark:text-sky-400 font-semibold shadow-sm'
                                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800/30'
                                }`}
                            title={isCollapsed ? item.label : undefined}
                        >
                            {isMenuActive(item) && !item.disabled && (
                                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-[#2E5B70] dark:bg-sky-400 rounded-l-full" />
                            )}
                            <item.icon className={`w-5 h-5 ${isMenuActive(item) && !item.disabled ? 'text-[#2E5B70] dark:text-sky-400' : item.disabled ? 'text-slate-300 dark:text-slate-600' : 'text-slate-400 dark:text-slate-500 group-hover:text-[#2E5B70] dark:group-hover:text-white'} transition-colors`} />
                            {!isCollapsed && (
                                <span className="text-sm font-medium">{item.label}</span>
                            )}
                        </Link>
                    </div>
                ))}
            </nav>

            {/* Bottom section */}
            <div className="p-3 border-t border-slate-100 dark:border-slate-800/40 space-y-2">
                {/* Upgrade Account Link */}
                <Link
                    to={ROUTES.UPGRADE}
                    className={`w-full flex items-center ${isCollapsed ? 'justify-center' : 'space-x-3'} px-4 py-3 rounded-xl transition-all duration-200 group relative ${currentView === 'UPGRADE'
                            ? 'bg-[#6366F1] text-white font-semibold shadow-md shadow-indigo-150 dark:shadow-none'
                            : 'bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/30'
                        }`}
                    title={isCollapsed ? 'Nâng cấp tài khoản' : undefined}
                >
                    <Crown className={`w-5 h-5 ${currentView === 'UPGRADE' ? 'text-white' : 'text-indigo-500'}`} />
                    {!isCollapsed && <span className="text-sm font-semibold">Nâng cấp tài khoản</span>}
                </Link>

                {/* Collapse toggle */}
                <button
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    className={`w-full flex items-center ${isCollapsed ? 'justify-center' : 'space-x-3'} px-3 py-2 rounded-lg text-slate-400 hover:text-slate-700 dark:text-slate-500 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer`}
                >
                    <ChevronRight className={`w-5 h-5 transition-transform duration-300 ${isCollapsed ? '' : 'rotate-180'}`} />
                    {!isCollapsed && <span className="text-sm font-medium">Thu gọn</span>}
                </button>

                {/* Dark mode toggle */}
                <button
                    onClick={() => setIsDarkMode(prev => !prev)}
                    className={`w-full flex items-center ${isCollapsed ? 'justify-center' : 'space-x-3'} px-3 py-2 rounded-lg text-slate-400 hover:text-slate-700 dark:text-slate-500 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer`}
                    title={isCollapsed ? (isDarkMode ? 'Giao diện sáng' : 'Giao diện tối') : undefined}
                >
                    {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                    {!isCollapsed && <span className="text-sm font-medium">{isDarkMode ? 'Giao diện sáng' : 'Giao diện tối'}</span>}
                </button>

                {/* Logout */}
                <button
                    onClick={handleLogout}
                    className={`w-full flex items-center ${isCollapsed ? 'justify-center' : 'space-x-3'} px-3 py-2 rounded-lg text-slate-400 hover:text-red-500 dark:text-slate-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all cursor-pointer`}
                    title={isCollapsed ? 'Đăng xuất' : undefined}
                >
                    <LogOut className="w-5 h-5" />
                    {!isCollapsed && <span className="text-sm font-medium">Đăng xuất</span>}
                </button>
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
