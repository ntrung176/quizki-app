import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '../../config/firebase';
import { ROUTES } from '../../router';
import {
    Home, BookOpen, BarChart3, Users, Settings, Plus,
    LogOut, Sun, Moon, Sparkles, ChevronRight, X, List,
    Repeat2, FileCheck, Languages, Shield, ChevronDown,
    Trophy, Heart, Gamepad2
} from 'lucide-react';

// Sidebar Component - Navigation with submenu support
const Sidebar = ({ isDarkMode, setIsDarkMode, displayName, isAdmin }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [expandedMenus, setExpandedMenus] = useState(['VOCAB', 'KANJI', 'HUB']); // Keep expanded by default

    // Get current view from URL path
    const getCurrentView = () => {
        const path = location.pathname;
        if (path === '/' || path === ROUTES.HOME) return 'HOME';
        if (path === ROUTES.VOCAB_REVIEW) return 'VOCAB_REVIEW';
        if (path === ROUTES.VOCAB_LIST || path.startsWith('/vocab/list') || path.startsWith('/vocab/edit')) return 'VOCAB_LIST';
        if (path === ROUTES.VOCAB_ADD) return 'VOCAB_ADD';
        if (path === ROUTES.KANJI_STUDY) return 'KANJI_STUDY';
        if (path === ROUTES.KANJI_REVIEW) return 'KANJI_REVIEW';
        if (path === ROUTES.KANJI_SAVED) return 'KANJI_SAVED';
        if (path === ROUTES.KANJI_LIST) return 'KANJI_LIST';
        if (path === ROUTES.TEST) return 'TEST';
        if (path === ROUTES.STATS) return 'STATS';
        if (path === ROUTES.LEADERBOARD) return 'LEADERBOARD';
        if (path === ROUTES.PET) return 'PET';
        if (path === ROUTES.ACCOUNT) return 'ACCOUNT';
        if (path === ROUTES.SETTINGS) return 'SETTINGS';
        if (path === ROUTES.BOOKS) return 'BOOKS_LIST';
        if (path === ROUTES.ADMIN) return 'ADMIN';
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
                ? prev.filter(id => id !== menuId)
                : [...prev, menuId]
        );
    };

    // Menu structure with submenus
    const menuItems = [
        { id: 'HOME', icon: Home, label: 'Trang chủ', route: ROUTES.HOME },
        {
            id: 'VOCAB',
            icon: BookOpen,
            label: 'Học Từ Vựng',
            hasSubmenu: true,
            children: [
                { id: 'VOCAB_ADD', label: 'Thêm từ vựng mới', route: ROUTES.VOCAB_ADD },
                { id: 'VOCAB_REVIEW', label: 'Ôn tập từ vựng', route: ROUTES.VOCAB_REVIEW },
                { id: 'VOCAB_LIST', label: 'Danh sách từ vựng', route: ROUTES.VOCAB_LIST },
                { id: 'BOOKS_LIST', label: 'Học theo sách', route: ROUTES.BOOKS },
            ]
        },
        {
            id: 'KANJI',
            icon: Languages,
            label: 'Học Kanji',
            hasSubmenu: true,
            children: [
                { id: 'KANJI_STUDY', label: 'Học Kanji', route: ROUTES.KANJI_STUDY },
                { id: 'KANJI_REVIEW', label: 'Ôn tập Kanji', route: ROUTES.KANJI_REVIEW },
                { id: 'KANJI_SAVED', label: 'Kanji đã lưu', route: ROUTES.KANJI_SAVED },
                { id: 'KANJI_LIST', label: 'Danh sách Kanji', route: ROUTES.KANJI_LIST },
            ]
        },
        { id: 'TEST', icon: FileCheck, label: 'Kiểm tra JLPT', route: ROUTES.TEST },
        {
            id: 'HUB',
            icon: Gamepad2,
            label: 'Trung tâm',
            hasSubmenu: true,
            children: [
                { id: 'STATS', label: 'Thống kê', route: ROUTES.STATS },
                { id: 'LEADERBOARD', label: 'Bảng xếp hạng', route: ROUTES.LEADERBOARD },
                { id: 'PET', label: 'Thú cưng', route: ROUTES.PET },
            ]
        },
        { id: 'SETTINGS', icon: Settings, label: 'Cài đặt', route: ROUTES.SETTINGS },
        ...(isAdmin ? [{ id: 'ADMIN', icon: Shield, label: 'Quản lý Admin', route: ROUTES.ADMIN }] : []),
    ];

    // Check if a menu or any of its children is active
    const isMenuActive = (item) => {
        if (item.hasSubmenu) {
            return item.children.some(child => currentView === child.id);
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
                                        to={item.route}
                                        onClick={() => setIsMobileMenuOpen(false)}
                                        className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 ${currentView === item.id
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
        <aside className={`hidden lg:flex flex-col fixed left-0 top-0 bottom-0 z-40 transition-all duration-300 ${isCollapsed ? 'w-20' : 'w-64'} bg-white dark:bg-gradient-to-b dark:from-slate-900 dark:via-slate-900 dark:to-slate-800 border-r border-gray-200 dark:border-slate-700/50 shadow-lg dark:shadow-none`}>
            {/* Logo */}
            <div className="p-4 border-b border-gray-200 dark:border-slate-700/50">
                <Link
                    to={ROUTES.VOCAB_REVIEW}
                    className="flex items-center space-x-3 group"
                >
                    <div className="bg-gradient-to-br from-slate-600 to-slate-700 p-2 rounded-xl shadow-lg shadow-slate-500/30 group-hover:shadow-slate-500/50 transition-all duration-300">
                        <Sparkles className="w-6 h-6 text-white" />
                    </div>
                    {!isCollapsed && (
                        <span className="text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
                            QuizKi
                        </span>
                    )}
                </Link>
            </div>

            {/* User info */}
            {!isCollapsed && displayName && (
                <div className="px-4 py-3 border-b border-gray-200 dark:border-slate-700/50">
                    <p className="text-xs text-gray-500 dark:text-slate-500 uppercase tracking-wider font-medium">Xin chào</p>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white truncate mt-0.5">{displayName}</p>
                </div>
            )}

            {/* Navigation */}
            <nav className="flex-1 p-3 space-y-1 overflow-y-auto sidebar-scroll">
                {menuItems.map((item) => (
                    <div key={item.id}>
                        {item.hasSubmenu ? (
                            <>
                                <button
                                    onClick={() => !isCollapsed && toggleMenu(item.id)}
                                    className={`w-full flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'} px-3 py-2.5 rounded-xl transition-all duration-200 ${isMenuActive(item)
                                        ? 'bg-sky-100 dark:bg-gradient-to-r dark:from-sky-600/30 dark:to-slate-600/20 text-sky-700 dark:text-white'
                                        : 'text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-800/50'
                                        }`}
                                    title={isCollapsed ? item.label : undefined}
                                >
                                    <div className={`flex items-center ${isCollapsed ? '' : 'space-x-3'}`}>
                                        <item.icon className={`w-5 h-5 ${isMenuActive(item) ? 'text-sky-600 dark:text-sky-400' : ''}`} />
                                        {!isCollapsed && <span className="font-medium">{item.label}</span>}
                                    </div>
                                    {!isCollapsed && (
                                        <ChevronDown className={`w-4 h-4 transition-transform ${expandedMenus.includes(item.id) ? 'rotate-180' : ''}`} />
                                    )}
                                </button>
                                {!isCollapsed && expandedMenus.includes(item.id) && (
                                    <div className="ml-8 mt-1 space-y-0.5">
                                        {item.children.map((child) => (
                                            <Link
                                                key={child.id}
                                                to={child.route}
                                                className={`block px-3 py-2 rounded-lg text-sm transition-all ${currentView === child.id
                                                    ? 'bg-indigo-500 text-white shadow-md'
                                                    : 'text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-800/50'
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
                                to={item.route}
                                className={`w-full flex items-center ${isCollapsed ? 'justify-center' : 'space-x-3'} px-3 py-2.5 rounded-xl transition-all duration-200 group relative ${currentView === item.id
                                    ? 'bg-sky-100 dark:bg-gradient-to-r dark:from-sky-600/30 dark:to-slate-600/20 text-sky-700 dark:text-white border border-sky-300 dark:border-sky-500/30 shadow-md dark:shadow-lg dark:shadow-sky-500/10'
                                    : 'text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-800/50'
                                    }`}
                                title={isCollapsed ? item.label : undefined}
                            >
                                {currentView === item.id && (
                                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-sky-500 rounded-r-full" />
                                )}
                                <item.icon className={`w-5 h-5 ${currentView === item.id ? 'text-sky-600 dark:text-sky-400' : 'group-hover:text-sky-500 dark:group-hover:text-sky-400'} transition-colors`} />
                                {!isCollapsed && (
                                    <span className="font-medium">{item.label}</span>
                                )}
                            </Link>
                        )}
                    </div>
                ))}
            </nav>

            {/* Bottom section */}
            <div className="p-3 border-t border-gray-200 dark:border-slate-700/50 space-y-1">
                {/* Collapse toggle */}
                <button
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    className={`w-full flex items-center ${isCollapsed ? 'justify-center' : 'space-x-3'} px-3 py-2 rounded-lg text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-800/50 transition-all`}
                >
                    <ChevronRight className={`w-5 h-5 transition-transform duration-300 ${isCollapsed ? '' : 'rotate-180'}`} />
                    {!isCollapsed && <span className="text-sm">Thu gọn</span>}
                </button>

                {/* Dark mode toggle */}
                <button
                    onClick={() => setIsDarkMode(prev => !prev)}
                    className={`w-full flex items-center ${isCollapsed ? 'justify-center' : 'space-x-3'} px-3 py-2 rounded-lg text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-800/50 transition-all`}
                    title={isCollapsed ? (isDarkMode ? 'Giao diện sáng' : 'Giao diện tối') : undefined}
                >
                    {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                    {!isCollapsed && <span className="text-sm">{isDarkMode ? 'Giao diện sáng' : 'Giao diện tối'}</span>}
                </button>

                {/* Logout */}
                <button
                    onClick={handleLogout}
                    className={`w-full flex items-center ${isCollapsed ? 'justify-center' : 'space-x-3'} px-3 py-2 rounded-lg text-gray-500 dark:text-slate-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all`}
                    title={isCollapsed ? 'Đăng xuất' : undefined}
                >
                    <LogOut className="w-5 h-5" />
                    {!isCollapsed && <span className="text-sm">Đăng xuất</span>}
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
