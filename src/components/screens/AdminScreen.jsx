import React, { useState, useEffect, useMemo } from 'react';
import { collection, query, onSnapshot, doc, deleteDoc, getDocs } from 'firebase/firestore';
import { db, appId } from '../../config/firebase';
import {
    Users, Search, Shield, Trash2, BarChart3, Clock,
    AlertTriangle, CheckCircle, Loader2, Languages, BookOpen,
    Sparkles, Bot, UserCheck, UserX, ToggleLeft, ToggleRight,
    ChevronDown, ChevronUp, Settings, Crown, ShieldCheck
} from 'lucide-react';
import { updateAdminConfig, AI_PROVIDER_OPTIONS, OPENROUTER_MODELS, addModerator, removeModerator, grantAIAccess, revokeAIAccess } from '../../utils/adminSettings';

const AdminScreen = ({ publicStatsPath, currentUserId, onAdminDeleteUserData, adminConfig, isAdmin }) => {
    // State
    const [users, setUsers] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [sortBy, setSortBy] = useState('totalCards');
    const [sortOrder, setSortOrder] = useState('desc');
    const [selectedUser, setSelectedUser] = useState(null);
    const [notification, setNotification] = useState(null);
    const [confirmDelete, setConfirmDelete] = useState(null);
    const [deleting, setDeleting] = useState(false);
    const [deleteType, setDeleteType] = useState('all');
    const [userKanjiStats, setUserKanjiStats] = useState({});
    const [activeSection, setActiveSection] = useState('users'); // 'users' | 'ai' | 'moderators'
    const [savingConfig, setSavingConfig] = useState(false);

    // Load users
    useEffect(() => {
        if (!db || !publicStatsPath) return;
        const q = query(collection(db, publicStatsPath));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const userList = snapshot.docs.map(d => ({
                id: d.id,
                ...d.data()
            }));
            setUsers(userList);
            setIsLoading(false);
        });
        return () => unsubscribe();
    }, [publicStatsPath]);

    // Load kanji SRS stats for selected user
    useEffect(() => {
        if (!selectedUser) return;
        const loadKanjiStats = async () => {
            try {
                const srsSnap = await getDocs(collection(db, `artifacts/${appId}/users/${selectedUser.userId}/kanjiSRS`));
                let total = 0, learning = 0, mastered = 0;
                srsSnap.docs.forEach(d => {
                    total++;
                    const data = d.data();
                    if (data.interval >= 1440 * 21) mastered++;
                    else learning++;
                });
                setUserKanjiStats(prev => ({
                    ...prev,
                    [selectedUser.userId]: { total, learning, mastered }
                }));
            } catch (e) {
                console.error('Error loading kanji stats:', e);
            }
        };
        loadKanjiStats();
    }, [selectedUser]);

    // Stats
    const stats = useMemo(() => {
        const total = users.length;
        const totalCards = users.reduce((sum, u) => sum + (u.totalCards || 0), 0);
        const activeToday = users.filter(u => {
            if (!u.lastActive) return false;
            const today = new Date().setHours(0, 0, 0, 0);
            return u.lastActive >= today;
        }).length;
        return { total, totalCards, activeToday };
    }, [users]);

    // Filtered and sorted users
    const filteredUsers = useMemo(() => {
        let result = [...users];
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            result = result.filter(u =>
                (u.displayName || '').toLowerCase().includes(q) ||
                (u.userId || '').toLowerCase().includes(q)
            );
        }
        result.sort((a, b) => {
            let aVal, bVal;
            switch (sortBy) {
                case 'displayName':
                    aVal = (a.displayName || '').toLowerCase();
                    bVal = (b.displayName || '').toLowerCase();
                    break;
                default:
                    aVal = a.totalCards || 0;
                    bVal = b.totalCards || 0;
            }
            return sortOrder === 'asc' ? (aVal > bVal ? 1 : -1) : (aVal < bVal ? 1 : -1);
        });
        return result;
    }, [users, searchQuery, sortBy, sortOrder]);

    const handleSelectUser = (user) => setSelectedUser(user);

    // Delete user data
    const handleDelete = async () => {
        if (!confirmDelete) return;
        setDeleting(true);
        try {
            if (deleteType === 'kanji') {
                const srsSnap = await getDocs(collection(db, `artifacts/${appId}/users/${confirmDelete.userId}/kanjiSRS`));
                let deleted = 0;
                for (const docSnap of srsSnap.docs) {
                    await deleteDoc(docSnap.ref);
                    deleted++;
                }
                setUserKanjiStats(prev => ({
                    ...prev,
                    [confirmDelete.userId]: { total: 0, learning: 0, mastered: 0 }
                }));
                setNotification({ type: 'success', message: `Đã xóa ${deleted} dữ liệu Kanji SRS của ${confirmDelete.displayName}` });
            } else {
                if (onAdminDeleteUserData) await onAdminDeleteUserData(confirmDelete.userId);
                setUsers(prev => prev.filter(u => u.userId !== confirmDelete.userId));
                if (selectedUser?.userId === confirmDelete.userId) setSelectedUser(null);
                setNotification({ type: 'success', message: `Đã xóa toàn bộ dữ liệu ${confirmDelete.displayName}` });
            }
        } catch (e) {
            console.error('Error deleting:', e);
            setNotification({ type: 'error', message: 'Lỗi khi xóa: ' + e.message });
        } finally {
            setDeleting(false);
            setConfirmDelete(null);
            setDeleteType('all');
        }
    };

    // Admin config handlers
    const handleToggleAI = async () => {
        setSavingConfig(true);
        const ok = await updateAdminConfig({ aiEnabled: !adminConfig?.aiEnabled }, currentUserId);
        if (ok) setNotification({ type: 'success', message: adminConfig?.aiEnabled ? 'Đã tắt AI' : 'Đã bật AI' });
        else setNotification({ type: 'error', message: 'Lỗi khi cập nhật' });
        setSavingConfig(false);
    };

    const handleToggleAIAllowAll = async () => {
        setSavingConfig(true);
        const ok = await updateAdminConfig({ aiAllowAll: !adminConfig?.aiAllowAll }, currentUserId);
        if (ok) setNotification({ type: 'success', message: adminConfig?.aiAllowAll ? 'Đã tắt AI cho tất cả' : 'Đã bật AI cho tất cả người dùng' });
        else setNotification({ type: 'error', message: 'Lỗi khi cập nhật' });
        setSavingConfig(false);
    };

    const handleChangeProvider = async (provider) => {
        setSavingConfig(true);
        const ok = await updateAdminConfig({ aiProvider: provider }, currentUserId);
        if (ok) setNotification({ type: 'success', message: `Đã chuyển AI provider sang ${AI_PROVIDER_OPTIONS.find(p => p.value === provider)?.label || provider}` });
        else setNotification({ type: 'error', message: 'Lỗi khi cập nhật' });
        setSavingConfig(false);
    };

    const handleChangeOpenRouterModel = async (model) => {
        setSavingConfig(true);
        const ok = await updateAdminConfig({ openRouterModel: model }, currentUserId);
        if (ok) setNotification({ type: 'success', message: `Đã đổi model OpenRouter sang ${OPENROUTER_MODELS.find(m => m.value === model)?.label || model}` });
        else setNotification({ type: 'error', message: 'Lỗi khi cập nhật' });
        setSavingConfig(false);
    };

    const handleToggleModerator = async (userId, userName) => {
        setSavingConfig(true);
        const isMod = adminConfig?.moderators?.includes(userId);
        const ok = isMod
            ? await removeModerator(adminConfig, userId, currentUserId)
            : await addModerator(adminConfig, userId, currentUserId);
        if (ok) setNotification({ type: 'success', message: isMod ? `Đã gỡ quyền QTV của ${userName}` : `Đã cấp quyền QTV cho ${userName}` });
        else setNotification({ type: 'error', message: 'Lỗi khi cập nhật' });
        setSavingConfig(false);
    };

    const handleToggleAIAccess = async (userId, userName) => {
        setSavingConfig(true);
        const hasAccess = adminConfig?.aiAllowedUsers?.includes(userId);
        const ok = hasAccess
            ? await revokeAIAccess(adminConfig, userId, currentUserId)
            : await grantAIAccess(adminConfig, userId, currentUserId);
        if (ok) setNotification({ type: 'success', message: hasAccess ? `Đã thu hồi quyền AI của ${userName}` : `Đã cấp quyền AI cho ${userName}` });
        else setNotification({ type: 'error', message: 'Lỗi khi cập nhật' });
        setSavingConfig(false);
    };

    // Clear notification
    useEffect(() => {
        if (notification) {
            const timer = setTimeout(() => setNotification(null), 3000);
            return () => clearTimeout(timer);
        }
    }, [notification]);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="text-center space-y-3">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto text-indigo-500" />
                    <p className="text-gray-500 text-sm">Đang tải danh sách người dùng...</p>
                </div>
            </div>
        );
    }

    const kanjiStats = selectedUser ? userKanjiStats[selectedUser.userId] : null;

    // Section tabs
    const sections = [
        { id: 'users', label: 'Người dùng', icon: Users },
        { id: 'ai', label: 'Cài đặt AI', icon: Bot },
        { id: 'moderators', label: 'Quản trị viên', icon: ShieldCheck },
    ];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                        <Shield className="w-6 h-6 text-indigo-500" />
                        Quản lý Admin
                    </h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        Quản lý người dùng, AI, và quyền quản trị viên
                    </p>
                </div>
            </div>

            {/* Section Tabs */}
            <div className="flex rounded-xl bg-gray-100 dark:bg-gray-800 p-1 gap-1">
                {sections.map(sec => (
                    <button
                        key={sec.id}
                        onClick={() => setActiveSection(sec.id)}
                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-sm font-bold transition-all ${activeSection === sec.id
                            ? 'bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-400 shadow-sm'
                            : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'
                            }`}
                    >
                        <sec.icon className="w-4 h-4" />
                        <span className="hidden sm:inline">{sec.label}</span>
                    </button>
                ))}
            </div>

            {/* ==================== USERS SECTION ==================== */}
            {activeSection === 'users' && (
                <>
                    {/* Stats Cards */}
                    <div className="grid grid-cols-3 gap-3">
                        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                                    <Users className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold text-gray-800 dark:text-white">{stats.total}</p>
                                    <p className="text-xs text-gray-500">Tổng người dùng</p>
                                </div>
                            </div>
                        </div>
                        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                                    <BarChart3 className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold text-purple-600">{stats.totalCards}</p>
                                    <p className="text-xs text-gray-500">Tổng flashcard</p>
                                </div>
                            </div>
                        </div>
                        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-cyan-100 dark:bg-cyan-900/30 flex items-center justify-center">
                                    <Clock className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold text-cyan-600">{stats.activeToday}</p>
                                    <p className="text-xs text-gray-500">Hoạt động hôm nay</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Filters & Search */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                        <div className="flex flex-col md:flex-row gap-3">
                            <div className="flex-1 relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input
                                    type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Tìm kiếm theo tên hoặc ID..."
                                    className="w-full pl-10 pr-4 py-2 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                                />
                            </div>
                            <select
                                value={`${sortBy}-${sortOrder}`}
                                onChange={(e) => { const [by, order] = e.target.value.split('-'); setSortBy(by); setSortOrder(order); }}
                                className="px-4 py-2 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg outline-none"
                            >
                                <option value="totalCards-desc">Nhiều thẻ nhất</option>
                                <option value="totalCards-asc">Ít thẻ nhất</option>
                                <option value="displayName-asc">Tên A-Z</option>
                                <option value="displayName-desc">Tên Z-A</option>
                            </select>
                        </div>
                    </div>

                    {/* Main Content: User List + Details */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                        {/* User List */}
                        <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                                <h3 className="font-semibold text-gray-800 dark:text-white flex items-center gap-2">
                                    <Users className="w-4 h-4" />
                                    Danh sách người dùng ({filteredUsers.length})
                                </h3>
                            </div>
                            <div className="max-h-[500px] overflow-y-auto">
                                {filteredUsers.length === 0 ? (
                                    <div className="p-8 text-center text-gray-400">
                                        <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                                        <p>Không tìm thấy người dùng nào</p>
                                    </div>
                                ) : (
                                    <div className="divide-y divide-gray-100 dark:divide-gray-700">
                                        {filteredUsers.map(user => {
                                            const isMod = adminConfig?.moderators?.includes(user.userId);
                                            const hasAI = adminConfig?.aiAllowedUsers?.includes(user.userId) || adminConfig?.aiAllowAll;
                                            return (
                                                <div
                                                    key={user.userId}
                                                    onClick={() => handleSelectUser(user)}
                                                    className={`p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors ${selectedUser?.userId === user.userId ? 'bg-indigo-50 dark:bg-indigo-900/20' : ''}`}
                                                >
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-3">
                                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${isMod ? 'bg-amber-500' : 'bg-indigo-500'}`}>
                                                                {(user.displayName || '?')[0].toUpperCase()}
                                                            </div>
                                                            <div>
                                                                <p className="font-medium text-gray-800 dark:text-white flex items-center gap-1.5 flex-wrap">
                                                                    {user.displayName || 'Chưa đặt tên'}
                                                                    {user.userId === currentUserId && (
                                                                        <span className="text-xs bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded-full">Bạn</span>
                                                                    )}
                                                                    {isMod && (
                                                                        <span className="text-xs bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-2 py-0.5 rounded-full flex items-center gap-0.5">
                                                                            <Crown className="w-3 h-3" /> QTV
                                                                        </span>
                                                                    )}
                                                                </p>
                                                                <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                                                                    <span>{user.totalCards || 0} thẻ</span>
                                                                    {hasAI && (
                                                                        <span className="text-emerald-500 flex items-center gap-0.5">
                                                                            <Sparkles className="w-3 h-3" /> AI
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* User Details Panel */}
                        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
                            {selectedUser ? (
                                <div className="p-4 space-y-4">
                                    {/* User Header */}
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg bg-indigo-500">
                                            {(selectedUser.displayName || '?')[0].toUpperCase()}
                                        </div>
                                        <div>
                                            <p className="font-bold text-gray-800 dark:text-white">{selectedUser.displayName || 'Chưa đặt tên'}</p>
                                            <p className="text-xs text-gray-500 font-mono">{selectedUser.userId?.slice(0, 20)}...</p>
                                        </div>
                                    </div>

                                    {/* Vocabulary Stats */}
                                    <div>
                                        <h4 className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-1">
                                            <BookOpen className="w-3.5 h-3.5" /> TỪ VỰNG
                                        </h4>
                                        <div className="grid grid-cols-2 gap-2">
                                            <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                                                <p className="text-lg font-bold text-gray-800 dark:text-white">{selectedUser.totalCards || 0}</p>
                                                <p className="text-xs text-gray-500">Flashcard</p>
                                            </div>
                                            <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                                                <p className="text-lg font-bold text-gray-800 dark:text-white">{selectedUser.masteredCount || 0}</p>
                                                <p className="text-xs text-gray-500">Đã thuộc</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Kanji SRS Stats */}
                                    <div>
                                        <h4 className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-1">
                                            <Languages className="w-3.5 h-3.5" /> KANJI SRS
                                        </h4>
                                        {kanjiStats ? (
                                            <div className="grid grid-cols-3 gap-2">
                                                <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">
                                                    <p className="text-lg font-bold text-emerald-600">{kanjiStats.total}</p>
                                                    <p className="text-xs text-gray-500">Tổng</p>
                                                </div>
                                                <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                                                    <p className="text-lg font-bold text-amber-600">{kanjiStats.learning}</p>
                                                    <p className="text-xs text-gray-500">Đang học</p>
                                                </div>
                                                <div className="p-3 bg-cyan-50 dark:bg-cyan-900/20 rounded-lg">
                                                    <p className="text-lg font-bold text-cyan-600">{kanjiStats.mastered}</p>
                                                    <p className="text-xs text-gray-500">Thành thạo</p>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg text-center">
                                                <Loader2 className="w-4 h-4 animate-spin mx-auto text-gray-400" />
                                            </div>
                                        )}
                                    </div>

                                    {/* Quick Actions for selected user */}
                                    {selectedUser.userId !== currentUserId && (
                                        <div className="pt-2 border-t border-gray-100 dark:border-gray-700 space-y-2">
                                            {/* Toggle Moderator */}
                                            <button
                                                onClick={() => handleToggleModerator(selectedUser.userId, selectedUser.displayName)}
                                                disabled={savingConfig}
                                                className={`w-full px-3 py-2 text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2 ${adminConfig?.moderators?.includes(selectedUser.userId)
                                                    ? 'text-amber-700 bg-amber-50 dark:bg-amber-900/20 hover:bg-amber-100 dark:hover:bg-amber-900/30'
                                                    : 'text-emerald-700 bg-emerald-50 dark:bg-emerald-900/20 hover:bg-emerald-100 dark:hover:bg-emerald-900/30'
                                                    }`}
                                            >
                                                {adminConfig?.moderators?.includes(selectedUser.userId)
                                                    ? <><UserX className="w-4 h-4" /> Gỡ quyền Quản trị viên</>
                                                    : <><ShieldCheck className="w-4 h-4" /> Cấp quyền Quản trị viên</>
                                                }
                                            </button>

                                            {/* Toggle AI Access */}
                                            <button
                                                onClick={() => handleToggleAIAccess(selectedUser.userId, selectedUser.displayName)}
                                                disabled={savingConfig}
                                                className={`w-full px-3 py-2 text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2 ${adminConfig?.aiAllowedUsers?.includes(selectedUser.userId)
                                                    ? 'text-violet-700 bg-violet-50 dark:bg-violet-900/20 hover:bg-violet-100 dark:hover:bg-violet-900/30'
                                                    : 'text-indigo-700 bg-indigo-50 dark:bg-indigo-900/20 hover:bg-indigo-100 dark:hover:bg-indigo-900/30'
                                                    }`}
                                            >
                                                {adminConfig?.aiAllowedUsers?.includes(selectedUser.userId)
                                                    ? <><Sparkles className="w-4 h-4" /> Thu hồi quyền AI</>
                                                    : <><Sparkles className="w-4 h-4" /> Cấp quyền AI</>
                                                }
                                            </button>

                                            {/* Delete actions */}
                                            <button
                                                onClick={() => { setDeleteType('kanji'); setConfirmDelete(selectedUser); }}
                                                className="w-full px-3 py-2 text-sm font-medium text-orange-600 bg-orange-50 dark:bg-orange-900/20 hover:bg-orange-100 dark:hover:bg-orange-900/30 rounded-lg transition-colors flex items-center justify-center gap-2"
                                            >
                                                <Languages className="w-4 h-4" /> Xóa dữ liệu Kanji SRS
                                            </button>
                                            <button
                                                onClick={() => { setDeleteType('all'); setConfirmDelete(selectedUser); }}
                                                className="w-full px-3 py-2 text-sm font-medium text-red-600 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors flex items-center justify-center gap-2"
                                            >
                                                <Trash2 className="w-4 h-4" /> Xóa toàn bộ dữ liệu
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="p-8 text-center text-gray-400">
                                    <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                                    <p className="text-sm">Chọn một người dùng để xem chi tiết</p>
                                </div>
                            )}
                        </div>
                    </div>
                </>
            )}

            {/* ==================== AI SETTINGS SECTION ==================== */}
            {activeSection === 'ai' && (
                <div className="space-y-4">
                    {/* AI Global Toggle */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
                                    <Sparkles className="w-5 h-5 text-violet-600 dark:text-violet-400" />
                                </div>
                                <div>
                                    <p className="font-bold text-gray-800 dark:text-white">Tính năng AI</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">Bật/tắt tính năng AI tạo từ vựng tự động</p>
                                </div>
                            </div>
                            <button
                                onClick={handleToggleAI}
                                disabled={savingConfig}
                                className={`relative w-14 h-7 rounded-full transition-colors duration-300 cursor-pointer ${adminConfig?.aiEnabled ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-gray-600'}`}
                            >
                                <div className={`absolute top-0.5 w-6 h-6 bg-white rounded-full shadow-md transition-all duration-300 ${adminConfig?.aiEnabled ? 'translate-x-7 left-0.5' : 'translate-x-0 left-0.5'}`} />
                            </button>
                        </div>
                    </div>

                    {/* AI Allow All Users */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                                    <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                                </div>
                                <div>
                                    <p className="font-bold text-gray-800 dark:text-white">Cho phép tất cả người dùng</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                        {adminConfig?.aiAllowAll
                                            ? 'Tất cả đều có thể sử dụng AI'
                                            : 'Chỉ người được cấp quyền mới có thể sử dụng AI'}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={handleToggleAIAllowAll}
                                disabled={savingConfig || !adminConfig?.aiEnabled}
                                className={`relative w-14 h-7 rounded-full transition-colors duration-300 cursor-pointer ${!adminConfig?.aiEnabled ? 'bg-gray-200 dark:bg-gray-700 opacity-50' : adminConfig?.aiAllowAll ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-gray-600'}`}
                            >
                                <div className={`absolute top-0.5 w-6 h-6 bg-white rounded-full shadow-md transition-all duration-300 ${adminConfig?.aiAllowAll && adminConfig?.aiEnabled ? 'translate-x-7 left-0.5' : 'translate-x-0 left-0.5'}`} />
                            </button>
                        </div>
                    </div>

                    {/* AI Provider Selection */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                                <Bot className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                            </div>
                            <div>
                                <p className="font-bold text-gray-800 dark:text-white">Chọn AI Provider</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">Chỉ định AI provider mà ứng dụng sẽ sử dụng</p>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {AI_PROVIDER_OPTIONS.map(opt => (
                                <button
                                    key={opt.value}
                                    onClick={() => handleChangeProvider(opt.value)}
                                    disabled={savingConfig || !adminConfig?.aiEnabled}
                                    className={`p-3 rounded-xl border-2 text-left transition-all ${adminConfig?.aiProvider === opt.value || (!adminConfig?.aiProvider && opt.value === 'auto')
                                        ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 ring-2 ring-indigo-200 dark:ring-indigo-800'
                                        : 'border-gray-200 dark:border-gray-600 hover:border-indigo-300 dark:hover:border-indigo-700'
                                        } ${!adminConfig?.aiEnabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                                >
                                    <p className="font-bold text-sm text-gray-800 dark:text-white">{opt.label}</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{opt.description}</p>
                                </button>
                            ))}
                        </div>

                        {/* OpenRouter Model Selection (Only show if provider is openrouter or auto) */}
                        {(adminConfig?.aiProvider === 'openrouter' || adminConfig?.aiProvider === 'auto' || !adminConfig?.aiProvider) && adminConfig?.aiEnabled && (
                            <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                                <p className="font-bold text-sm text-gray-800 dark:text-white mb-2">Mô hình OpenRouter ưu tiên</p>
                                <select
                                    value={adminConfig?.openRouterModel || 'anthropic/claude-3.5-sonnet'}
                                    onChange={(e) => handleChangeOpenRouterModel(e.target.value)}
                                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl outline-none text-sm dark:text-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                                >
                                    {OPENROUTER_MODELS.map(model => (
                                        <option key={model.value} value={model.value}>{model.label}</option>
                                    ))}
                                </select>
                            </div>
                        )}
                    </div>

                    {/* AI Allowed Users List */}
                    {!adminConfig?.aiAllowAll && (
                        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
                            <h3 className="font-bold text-gray-800 dark:text-white mb-3 flex items-center gap-2">
                                <UserCheck className="w-4 h-4 text-emerald-500" />
                                Người dùng được cấp quyền AI ({adminConfig?.aiAllowedUsers?.length || 0})
                            </h3>
                            {(!adminConfig?.aiAllowedUsers || adminConfig.aiAllowedUsers.length === 0) ? (
                                <p className="text-sm text-gray-400 dark:text-gray-500 italic">
                                    Chưa có ai. Chọn người dùng ở tab "Người dùng" để cấp quyền.
                                </p>
                            ) : (
                                <div className="space-y-2">
                                    {adminConfig.aiAllowedUsers.map(uid => {
                                        const user = users.find(u => u.userId === uid);
                                        return (
                                            <div key={uid} className="flex items-center justify-between p-2.5 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-7 h-7 rounded-full bg-indigo-500 flex items-center justify-center text-white text-xs font-bold">
                                                        {(user?.displayName || '?')[0].toUpperCase()}
                                                    </div>
                                                    <span className="text-sm font-medium text-gray-800 dark:text-white">
                                                        {user?.displayName || uid.slice(0, 15) + '...'}
                                                    </span>
                                                </div>
                                                <button
                                                    onClick={() => handleToggleAIAccess(uid, user?.displayName || uid)}
                                                    disabled={savingConfig}
                                                    className="text-xs text-red-500 hover:text-red-700 font-medium"
                                                >
                                                    Thu hồi
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* ==================== MODERATORS SECTION ==================== */}
            {activeSection === 'moderators' && (
                <div className="space-y-4">
                    {/* Info Card */}
                    <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
                        <h3 className="font-bold text-amber-800 dark:text-amber-300 flex items-center gap-2 mb-2">
                            <Crown className="w-5 h-5" /> Quản trị viên (Moderator)
                        </h3>
                        <ul className="text-sm text-amber-700 dark:text-amber-400 space-y-1 ml-7 list-disc">
                            <li>Có thể sử dụng tất cả tính năng AI</li>
                            <li>Có quyền tương đương admin trong ứng dụng</li>
                            <li><strong>Không</strong> được truy cập trang quản lý Admin này</li>
                        </ul>
                    </div>

                    {/* Current Moderators */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
                        <h3 className="font-bold text-gray-800 dark:text-white mb-3 flex items-center gap-2">
                            <ShieldCheck className="w-4 h-4 text-amber-500" />
                            Danh sách Quản trị viên ({adminConfig?.moderators?.length || 0})
                        </h3>
                        {(!adminConfig?.moderators || adminConfig.moderators.length === 0) ? (
                            <p className="text-sm text-gray-400 dark:text-gray-500 italic">
                                Chưa có quản trị viên nào. Chọn người dùng ở tab "Người dùng" để cấp quyền.
                            </p>
                        ) : (
                            <div className="space-y-2">
                                {adminConfig.moderators.map(uid => {
                                    const user = users.find(u => u.userId === uid);
                                    return (
                                        <div key={uid} className="flex items-center justify-between p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 rounded-full bg-amber-500 flex items-center justify-center text-white font-bold">
                                                    {(user?.displayName || '?')[0].toUpperCase()}
                                                </div>
                                                <div>
                                                    <p className="font-medium text-gray-800 dark:text-white">
                                                        {user?.displayName || uid.slice(0, 15) + '...'}
                                                    </p>
                                                    <p className="text-xs text-gray-500">
                                                        {user?.totalCards || 0} thẻ
                                                    </p>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => handleToggleModerator(uid, user?.displayName || uid)}
                                                disabled={savingConfig}
                                                className="px-3 py-1.5 text-xs font-bold text-red-600 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                                            >
                                                Gỡ quyền
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Add Moderator - quick select from user list */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
                        <h3 className="font-bold text-gray-800 dark:text-white mb-3 flex items-center gap-2">
                            <UserCheck className="w-4 h-4 text-emerald-500" />
                            Thêm Quản trị viên
                        </h3>
                        <div className="max-h-[300px] overflow-y-auto space-y-1">
                            {users.filter(u => u.userId !== currentUserId && !adminConfig?.moderators?.includes(u.userId)).map(user => (
                                <div key={user.userId} className="flex items-center justify-between p-2.5 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-lg transition-colors">
                                    <div className="flex items-center gap-2">
                                        <div className="w-7 h-7 rounded-full bg-indigo-500 flex items-center justify-center text-white text-xs font-bold">
                                            {(user.displayName || '?')[0].toUpperCase()}
                                        </div>
                                        <span className="text-sm text-gray-800 dark:text-white">{user.displayName || 'Chưa đặt tên'}</span>
                                    </div>
                                    <button
                                        onClick={() => handleToggleModerator(user.userId, user.displayName)}
                                        disabled={savingConfig}
                                        className="px-3 py-1.5 text-xs font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 rounded-lg transition-colors"
                                    >
                                        Cấp quyền
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {confirmDelete && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-sm w-full p-6 space-y-4">
                        <div className="text-center">
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 ${deleteType === 'kanji' ? 'bg-orange-100 dark:bg-orange-900/30' : 'bg-red-100 dark:bg-red-900/30'}`}>
                                <AlertTriangle className={`w-6 h-6 ${deleteType === 'kanji' ? 'text-orange-600' : 'text-red-600'}`} />
                            </div>
                            <h3 className="text-lg font-bold text-gray-800 dark:text-white">Xác nhận xóa</h3>
                            <p className="text-sm text-gray-500 mt-2">
                                {deleteType === 'kanji'
                                    ? <>Bạn có chắc muốn xóa <strong>dữ liệu Kanji SRS</strong> của <strong>{confirmDelete.displayName}</strong>?</>
                                    : <>Bạn có chắc muốn xóa <strong>toàn bộ dữ liệu</strong> của <strong>{confirmDelete.displayName}</strong>?</>
                                }
                                <br />Hành động này không thể hoàn tác.
                            </p>
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={() => { setConfirmDelete(null); setDeleteType('all'); }}
                                disabled={deleting}
                                className="flex-1 px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                            >
                                Hủy
                            </button>
                            <button
                                onClick={handleDelete}
                                disabled={deleting}
                                className={`flex-1 px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors flex items-center justify-center gap-1 ${deleteType === 'kanji' ? 'bg-orange-600 hover:bg-orange-700' : 'bg-red-600 hover:bg-red-700'}`}
                            >
                                {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                Xóa
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Notification Toast */}
            {notification && (
                <div className={`fixed bottom-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg flex items-center gap-2 animate-fade-in ${notification.type === 'success'
                    ? 'bg-green-500 text-white'
                    : 'bg-red-500 text-white'
                    }`}>
                    {notification.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
                    <span className="text-sm font-medium">{notification.message}</span>
                </div>
            )}
        </div>
    );
};

export default AdminScreen;
