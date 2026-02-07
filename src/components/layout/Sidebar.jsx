import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '../../config/firebase';
import { ROUTES } from '../../router';
import {
    Home, BookOpen, BarChart3, Users, Settings, Plus,
    LogOut, Sun, Moon, Sparkles, ChevronRight, X, List,
    Repeat2, FileCheck
} from 'lucide-react';

// Sidebar Component - New vertical navigation layout with React Router
const Sidebar = ({ isDarkMode, setIsDarkMode, displayName }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    // Get current view from URL path
    const getCurrentView = () => {
        const path = location.pathname;
        if (path === '/' || path === ROUTES.HOME) return 'HOME';
        if (path === ROUTES.VOCABULARY || path.startsWith('/vocabulary')) return 'LIST';
        if (path === ROUTES.REVIEW) return 'REVIEW';
        if (path === ROUTES.TEST) return 'TEST';
        if (path === ROUTES.STATS) return 'STATS';
        if (path === ROUTES.FRIENDS) return 'FRIENDS';
        if (path === ROUTES.ACCOUNT) return 'ACCOUNT';
        if (path === ROUTES.VOCABULARY_ADD) return 'ADD_CARD';
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

    const menuItems = [
        { id: 'HOME', icon: Home, label: 'Trang chủ', route: ROUTES.HOME },
        { id: 'LIST', icon: BookOpen, label: 'Từ vựng', route: ROUTES.VOCABULARY },
        { id: 'REVIEW', icon: Repeat2, label: 'Ôn tập', route: ROUTES.REVIEW },
        { id: 'TEST', icon: FileCheck, label: 'Kiểm tra JLPT', route: ROUTES.TEST },
        { id: 'STATS', icon: BarChart3, label: 'Thống kê', route: ROUTES.STATS },
        { id: 'FRIENDS', icon: Users, label: 'Xếp hạng', route: ROUTES.FRIENDS },
        { id: 'ACCOUNT', icon: Settings, label: 'Cài đặt', route: ROUTES.ACCOUNT },
    ];

    // Mobile header for small screens
    const MobileHeader = () => (
        <header className="lg:hidden fixed top-0 left-0 right-0 bg-slate-900/95 backdrop-blur-xl border-b border-slate-700/50 z-50 h-14">
            <div className="h-full px-4 flex items-center justify-between">
                <Link to={ROUTES.HOME} className="flex items-center space-x-2">
                    <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-1.5 rounded-lg shadow-lg shadow-indigo-500/30">
                        <Sparkles className="w-5 h-5 text-white" />
                    </div>
                    <span className="text-lg font-bold text-white">QuizKi</span>
                </Link>

                <div className="flex items-center space-x-2">
                    <Link
                        to={ROUTES.VOCABULARY_ADD}
                        className="p-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
                    >
                        <Plus className="w-5 h-5" />
                    </Link>
                    <button
                        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                        className="p-2 text-gray-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                    >
                        {isMobileMenuOpen ? <X className="w-5 h-5" /> : <List className="w-5 h-5" />}
                    </button>
                </div>
            </div>

            {/* Mobile menu dropdown */}
            {isMobileMenuOpen && (
                <div className="absolute top-14 left-0 right-0 bg-slate-900/98 backdrop-blur-xl border-b border-slate-700/50 shadow-2xl">
                    <nav className="p-3 space-y-1">
                        {menuItems.map((item) => (
                            <Link
                                key={item.id}
                                to={item.route}
                                onClick={() => setIsMobileMenuOpen(false)}
                                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 ${currentView === item.id
                                    ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30'
                                    : 'text-gray-400 hover:text-white hover:bg-slate-800/50'
                                    }`}
                            >
                                <item.icon className="w-5 h-5" />
                                <span className="font-medium">{item.label}</span>
                            </Link>
                        ))}
                        <div className="border-t border-slate-700/50 my-2" />
                        <div className="flex items-center justify-between px-4 py-2">
                            <button
                                onClick={() => setIsDarkMode(prev => !prev)}
                                className="flex items-center space-x-2 text-gray-400 hover:text-white transition-colors"
                            >
                                {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                                <span>{isDarkMode ? 'Giao diện sáng' : 'Giao diện tối'}</span>
                            </button>
                            <button
                                onClick={handleLogout}
                                className="flex items-center space-x-2 text-red-400 hover:text-red-300 transition-colors"
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
        <aside className={`hidden lg:flex flex-col fixed left-0 top-0 bottom-0 z-40 transition-all duration-300 ${isCollapsed ? 'w-20' : 'w-64'} bg-gradient-to-b from-slate-900 via-slate-900 to-slate-800 border-r border-slate-700/50`}>
            {/* Logo */}
            <div className="p-4 border-b border-slate-700/50">
                <Link
                    to={ROUTES.HOME}
                    className="flex items-center space-x-3 group"
                >
                    <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-2 rounded-xl shadow-lg shadow-indigo-500/30 group-hover:shadow-indigo-500/50 transition-all duration-300">
                        <Sparkles className="w-6 h-6 text-white" />
                    </div>
                    {!isCollapsed && (
                        <span className="text-xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                            QuizKi
                        </span>
                    )}
                </Link>
            </div>

            {/* User info */}
            {!isCollapsed && displayName && (
                <div className="px-4 py-3 border-b border-slate-700/50">
                    <p className="text-xs text-slate-500 uppercase tracking-wider font-medium">Xin chào</p>
                    <p className="text-sm font-semibold text-white truncate mt-0.5">{displayName}</p>
                </div>
            )}

            {/* Navigation */}
            <nav className="flex-1 p-3 space-y-1 overflow-y-auto sidebar-scroll">
                {menuItems.map((item) => (
                    <Link
                        key={item.id}
                        to={item.route}
                        className={`w-full flex items-center ${isCollapsed ? 'justify-center' : 'space-x-3'} px-3 py-2.5 rounded-xl transition-all duration-200 group relative ${currentView === item.id
                            ? 'bg-gradient-to-r from-indigo-600/30 to-purple-600/20 text-white border border-indigo-500/30 shadow-lg shadow-indigo-500/10'
                            : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                            }`}
                        title={isCollapsed ? item.label : undefined}
                    >
                        {currentView === item.id && (
                            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-indigo-500 rounded-r-full" />
                        )}
                        <item.icon className={`w-5 h-5 ${currentView === item.id ? 'text-indigo-400' : 'group-hover:text-indigo-400'} transition-colors`} />
                        {!isCollapsed && (
                            <span className="font-medium">{item.label}</span>
                        )}
                    </Link>
                ))}

                {/* Add Card Button */}
                <Link
                    to={ROUTES.VOCABULARY_ADD}
                    className={`w-full flex items-center ${isCollapsed ? 'justify-center' : 'space-x-3'} px-3 py-2.5 rounded-xl transition-all duration-200 mt-4 ${currentView === 'ADD_CARD'
                        ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-500/30'
                        : 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:shadow-lg hover:shadow-indigo-500/30'
                        }`}
                    title={isCollapsed ? 'Add New' : undefined}
                >
                    <Plus className="w-5 h-5" />
                    {!isCollapsed && <span className="font-medium">Thêm mới</span>}
                </Link>
            </nav>

            {/* Bottom section */}
            <div className="p-3 border-t border-slate-700/50 space-y-1">
                {/* Collapse toggle */}
                <button
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    className={`w-full flex items-center ${isCollapsed ? 'justify-center' : 'space-x-3'} px-3 py-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/50 transition-all`}
                >
                    <ChevronRight className={`w-5 h-5 transition-transform duration-300 ${isCollapsed ? '' : 'rotate-180'}`} />
                    {!isCollapsed && <span className="text-sm">Thu gọn</span>}
                </button>

                {/* Dark mode toggle */}
                <button
                    onClick={() => setIsDarkMode(prev => !prev)}
                    className={`w-full flex items-center ${isCollapsed ? 'justify-center' : 'space-x-3'} px-3 py-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/50 transition-all`}
                    title={isCollapsed ? (isDarkMode ? 'Giao diện sáng' : 'Giao diện tối') : undefined}
                >
                    {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                    {!isCollapsed && <span className="text-sm">{isDarkMode ? 'Giao diện sáng' : 'Giao diện tối'}</span>}
                </button>

                {/* Logout */}
                <button
                    onClick={handleLogout}
                    className={`w-full flex items-center ${isCollapsed ? 'justify-center' : 'space-x-3'} px-3 py-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all`}
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
