import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '../../config/firebase';
import { ROUTES } from '../../router';
import {
    Home, BookOpen, BarChart3, Users, Settings, Plus,
    LogOut, Sun, Moon, Sparkles, ChevronRight, X, List,
    Repeat2, FileCheck, Languages, Shield, ChevronDown,
    Trophy, Heart, Gamepad2, MessageSquare, Crown, MessageCircle, User
} from 'lucide-react';

// Sidebar Component - Navigation with submenu support
const Sidebar = ({ isDarkMode, setIsDarkMode, displayName, isAdmin, userId }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [expandedMenus, setExpandedMenus] = useState([]); // Start collapsed for cleaner look
    const [flyoutMenu, setFlyoutMenu] = useState(null);

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
        { id: 'HUB', icon: BarChart3, label: 'Thống kê', route: ROUTES.HUB },
        { id: 'SETTINGS', icon: Settings, label: 'Cài đặt', route: ROUTES.SETTINGS },
    ];

    if (isAdmin) {
        menuItems.push({ id: 'ADMIN', icon: Shield, label: 'Quản trị', route: ROUTES.ADMIN });
    }

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
        return currentView === item.id;
    };

    // Mobile header for small screens
    const MobileHeader = () => (
        <header className="lg:hidden fixed top-0 left-0 right-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-b border-gray-200 dark:border-slate-700/50 z-50 h-14 shadow-sm dark:shadow-none">
            <div className="h-full px-4 flex items-center justify-between">
                <Link to={ROUTES.VOCAB_REVIEW} className="flex items-center space-x-2">
                    <div className="bg-gradient-to-br from-slate-600 to-slate-700 p-1.5 rounded-lg shadow-lg shadow-slate-500/30">
                        <Sparkles className="w-5 h-5 text-white" />
                    </div>
                    <span className="text-lg font-bold text-gray-900 dark:text-white">QuizKi</span>
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
                        {/* User info on mobile */}
                        {displayName && (
                            <div className="px-4 py-3 mb-2 bg-gray-50 dark:bg-slate-800/50 rounded-xl flex items-center justify-between border border-gray-200 dark:border-slate-700/50">
                                <div className="overflow-hidden pr-2">
                                    <p className="text-xs text-gray-500 dark:text-slate-400 uppercase tracking-wider font-medium">Xin chào</p>
                                    <p className="text-sm font-semibold text-gray-900 dark:text-white truncate mt-0.5">{displayName}</p>
                                </div>
                                <Link
                                    to={ROUTES.SETTINGS}
                                    onClick={() => setIsMobileMenuOpen(false)}
                                    className="p-2 flex-shrink-0 text-gray-500 hover:text-indigo-600 dark:text-gray-400 dark:hover:text-indigo-400 hover:bg-white dark:hover:bg-slate-700 rounded-lg transition-colors shadow-sm dark:shadow-none"
                                >
                                    <Settings className="w-5 h-5" />
                                </Link>
                            </div>
                        )}
                        {menuItems.map((item) => (
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
                                            : currentView === item.id
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
            <div className="p-5 border-b border-slate-100 dark:border-slate-800/40">
                <Link
                    to={ROUTES.HOME}
                    className="flex items-center space-x-3"
                >
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
                <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800/40 flex items-center justify-between">
                    <div className="overflow-hidden pr-2">
                        <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Xin chào</p>
                        <p className="text-sm font-bold text-slate-700 dark:text-white truncate mt-0.5">{displayName}</p>
                    </div>
                    <Link
                        to={ROUTES.SETTINGS}
                        className="p-1.5 flex-shrink-0 text-slate-400 hover:text-[#2E5B70] dark:text-slate-500 dark:hover:text-sky-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                        title="Cài đặt"
                    >
                        <Settings className="w-4 h-4" />
                    </Link>
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
            <div className="p-3 border-t border-slate-100 dark:border-slate-800/40 space-y-1">
                {/* Start Review button */}
                {!isCollapsed && (
                    <button
                        onClick={() => {
                            navigate(ROUTES.REVIEW);
                        }}
                        className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-[#2E5B70] hover:bg-[#254A5C] text-white text-xs font-bold rounded-lg transition-all shadow-md shadow-[#2E5B70]/10 tracking-wider uppercase mb-2 cursor-pointer"
                    >
                        <Sparkles className="w-3.5 h-3.5" />
                        Bắt đầu ôn tập
                    </button>
                )}

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
