import React, { useState, useEffect, useMemo } from 'react';
import { collection, query, onSnapshot, doc, deleteDoc, getDocs } from 'firebase/firestore';
import { db, appId } from '../../config/firebase';
import {
    Users, Search, Shield, Trash2, BarChart3, Clock,
    AlertTriangle, CheckCircle, Loader2, Languages, BookOpen,
    Sparkles, Bot, UserCheck, UserX, ToggleLeft, ToggleRight,
    ChevronDown, ChevronUp, Settings, Crown, ShieldCheck,
    CreditCard, Plus, Check, X as XIcon, Edit, Ticket
} from 'lucide-react';
import { updateAdminConfig, AI_PROVIDER_OPTIONS, OPENROUTER_MODELS, addModerator, removeModerator, grantAIAccess, revokeAIAccess, subscribeCreditRequests, approveCreditRequest, rejectCreditRequest, addCreditsToUser, DEFAULT_AI_PACKAGES, createVoucher, subscribeVouchers, deleteVoucher, toggleVoucher } from '../../utils/adminSettings';

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
    const [activeSection, setActiveSection] = useState('users');
    const [savingConfig, setSavingConfig] = useState(false);
    const [creditRequests, setCreditRequests] = useState([]);
    const [manualCreditUserId, setManualCreditUserId] = useState('');
    const [manualCreditAmount, setManualCreditAmount] = useState('');
    const [editingPackages, setEditingPackages] = useState(null);

    // Voucher state
    const [vouchers, setVouchers] = useState([]);
    const [newVoucher, setNewVoucher] = useState({ code: '', discountType: 'percent', discountValue: '', maxUses: '', expiresAt: '', description: '' });
    const [voucherError, setVoucherError] = useState('');

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

    // Load credit requests
    useEffect(() => {
        const unsub = subscribeCreditRequests(setCreditRequests);
        return () => { if (unsub) unsub(); };
    }, []);

    // Load vouchers
    useEffect(() => {
        const unsub = subscribeVouchers(setVouchers);
        return () => { if (unsub) unsub(); };
    }, []);

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

    const formatVND = (n) => new Intl.NumberFormat('vi-VN').format(n) + 'đ';

    const handleApproveRequest = async (req) => {
        setSavingConfig(true);
        const ok = await approveCreditRequest(req.id, req.userId, req.credits, currentUserId);
        if (ok) setNotification({ type: 'success', message: `Đã cộng ${req.credits} credits cho ${req.userName}` });
        else setNotification({ type: 'error', message: 'Lỗi khi duyệt' });
        setSavingConfig(false);
    };

    const handleRejectRequest = async (req) => {
        setSavingConfig(true);
        const ok = await rejectCreditRequest(req.id, currentUserId);
        if (ok) setNotification({ type: 'success', message: `Đã từ chối yêu cầu của ${req.userName}` });
        else setNotification({ type: 'error', message: 'Lỗi' });
        setSavingConfig(false);
    };

    const handleManualAddCredits = async () => {
        if (!manualCreditUserId || !manualCreditAmount || isNaN(manualCreditAmount)) return;
        setSavingConfig(true);
        const ok = await addCreditsToUser(manualCreditUserId, parseInt(manualCreditAmount));
        const user = users.find(u => u.userId === manualCreditUserId);
        if (ok) {
            setNotification({ type: 'success', message: `Đã cộng ${manualCreditAmount} credits cho ${user?.displayName || manualCreditUserId}` });
            setManualCreditAmount('');
        } else setNotification({ type: 'error', message: 'Lỗi' });
        setSavingConfig(false);
    };

    const handleSavePackages = async () => {
        if (!editingPackages) return;
        setSavingConfig(true);
        const ok = await updateAdminConfig({ aiCreditPackages: editingPackages }, currentUserId);
        if (ok) {
            setNotification({ type: 'success', message: 'Đã cập nhật giá gói thẽ' });
            setEditingPackages(null);
        } else setNotification({ type: 'error', message: 'Lỗi' });
        setSavingConfig(false);
    };

    // Section tabs
    const sections = [
        { id: 'users', label: 'Người dùng', icon: Users },
        { id: 'ai', label: 'AI', icon: Bot },
        { id: 'credits', label: 'Credits', icon: CreditCard },
        { id: 'vouchers', label: 'Voucher', icon: Ticket },
        { id: 'moderators', label: 'QTV', icon: ShieldCheck },
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
                                    disabled={savingConfig}
                                    className={`p-3 rounded-xl border-2 text-left transition-all ${adminConfig?.aiProvider === opt.value || (!adminConfig?.aiProvider && opt.value === 'auto')
                                        ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 ring-2 ring-indigo-200 dark:ring-indigo-800'
                                        : 'border-gray-200 dark:border-gray-600 hover:border-indigo-300 dark:hover:border-indigo-700'
                                        }`}
                                >
                                    <p className="font-bold text-sm text-gray-800 dark:text-white">{opt.label}</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{opt.description}</p>
                                </button>
                            ))}
                        </div>

                        {/* OpenRouter Model Selection */}
                        {(adminConfig?.aiProvider === 'openrouter' || adminConfig?.aiProvider === 'auto' || !adminConfig?.aiProvider) && (
                            <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                                <p className="font-bold text-sm text-gray-800 dark:text-white mb-2">Mô hình OpenRouter</p>
                                <select
                                    value={adminConfig?.openRouterModel || 'google/gemini-2.5-flash'}
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

                    {/* Info note */}
                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
                        <p className="text-sm text-blue-700 dark:text-blue-300">
                            <strong>💡 Lưu ý:</strong> AI được kiểm soát bằng hệ thống credits. Tất cả người dùng có thể dùng AI trong giới hạn lượt. Quản lý credits ở tab <strong>Credits</strong>.
                        </p>
                    </div>
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

            {/* ==================== CREDITS SECTION ==================== */}
            {activeSection === 'credits' && (
                <div className="space-y-4">
                    {/* Pending Requests */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
                        <h3 className="font-bold text-gray-800 dark:text-white mb-3 flex items-center gap-2">
                            <CreditCard className="w-4 h-4 text-indigo-500" />
                            Yêu cầu nạp thẻ ({creditRequests.filter(r => r.status === 'pending').length} chờ duyệt)
                        </h3>
                        {creditRequests.filter(r => r.status === 'pending').length === 0 ? (
                            <p className="text-sm text-gray-400 italic">Không có yêu cầu nào đang chờ.</p>
                        ) : (
                            <div className="space-y-2">
                                {creditRequests.filter(r => r.status === 'pending').map(req => (
                                    <div key={req.id} className="flex items-center justify-between p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl">
                                        <div>
                                            <p className="font-bold text-sm text-gray-800 dark:text-white">{req.userName || req.userId?.slice(0, 10)}</p>
                                            <p className="text-xs text-gray-500">{req.userEmail}</p>
                                            <p className="text-xs text-amber-600 dark:text-amber-400 font-medium mt-0.5">
                                                Gói {req.packageName} • {req.credits?.toLocaleString()} thẻ • {formatVND(req.amount || 0)}
                                            </p>
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => handleApproveRequest(req)}
                                                disabled={savingConfig}
                                                className="p-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors"
                                                title="Duyệt & cộng credits"
                                            >
                                                <Check className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleRejectRequest(req)}
                                                disabled={savingConfig}
                                                className="p-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                                                title="Từ chối"
                                            >
                                                <XIcon className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Recently processed */}
                        {creditRequests.filter(r => r.status !== 'pending').length > 0 && (
                            <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-700">
                                <p className="text-xs font-bold text-gray-500 mb-2">Đã xử lý gần đây:</p>
                                <div className="space-y-1">
                                    {creditRequests.filter(r => r.status !== 'pending').slice(0, 5).map(req => (
                                        <div key={req.id} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg text-xs">
                                            <span className="text-gray-600 dark:text-gray-400">{req.userName || req.userId?.slice(0, 10)} • {req.packageName} • {req.credits?.toLocaleString()} thẻ</span>
                                            <span className={`font-bold ${req.status === 'approved' ? 'text-emerald-500' : 'text-red-500'}`}>
                                                {req.status === 'approved' ? '✓ Duyệt' : '✗ Từ chối'}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Manual Add Credits */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
                        <h3 className="font-bold text-gray-800 dark:text-white mb-3 flex items-center gap-2">
                            <Plus className="w-4 h-4 text-emerald-500" />
                            Cộng credits thủ công
                        </h3>
                        <div className="flex gap-2">
                            <select
                                value={manualCreditUserId}
                                onChange={(e) => setManualCreditUserId(e.target.value)}
                                className="flex-1 px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm dark:text-white outline-none"
                            >
                                <option value="">Chọn người dùng</option>
                                {users.map(u => (
                                    <option key={u.userId} value={u.userId}>{u.displayName || u.userId?.slice(0, 15)}</option>
                                ))}
                            </select>
                            <input
                                type="number"
                                value={manualCreditAmount}
                                onChange={(e) => setManualCreditAmount(e.target.value)}
                                placeholder="Số credits"
                                className="w-28 px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm dark:text-white outline-none"
                            />
                            <button
                                onClick={handleManualAddCredits}
                                disabled={savingConfig || !manualCreditUserId || !manualCreditAmount}
                                className="px-4 py-2 bg-emerald-500 text-white font-bold text-sm rounded-lg hover:bg-emerald-600 disabled:opacity-50 transition-colors"
                            >
                                Cộng
                            </button>
                        </div>
                    </div>

                    {/* Edit Packages */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="font-bold text-gray-800 dark:text-white flex items-center gap-2">
                                <Edit className="w-4 h-4 text-indigo-500" />
                                Cấu hình gói thẻ bán
                            </h3>
                            {!editingPackages ? (
                                <button
                                    onClick={() => setEditingPackages(adminConfig?.aiCreditPackages || DEFAULT_AI_PACKAGES)}
                                    className="text-xs text-indigo-500 hover:text-indigo-700 font-bold"
                                >Chỉnh sửa</button>
                            ) : (
                                <div className="flex gap-2">
                                    <button onClick={() => setEditingPackages(null)} className="text-xs text-gray-400 hover:text-gray-600">Hủy</button>
                                    <button onClick={handleSavePackages} disabled={savingConfig} className="text-xs text-emerald-500 hover:text-emerald-700 font-bold">Lưu</button>
                                </div>
                            )}
                        </div>
                        <div className="space-y-2">
                            {(editingPackages || adminConfig?.aiCreditPackages || DEFAULT_AI_PACKAGES).map((pkg, i) => (
                                <div key={pkg.id} className="grid grid-cols-5 gap-2 items-center text-sm">
                                    <span className="font-medium text-gray-700 dark:text-gray-300 text-xs">{pkg.name}</span>
                                    <input
                                        type="number" value={pkg.cards}
                                        disabled={!editingPackages}
                                        onChange={(e) => { const p = [...editingPackages]; p[i] = { ...p[i], cards: parseInt(e.target.value) || 0 }; setEditingPackages(p); }}
                                        className="px-2 py-1.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-xs dark:text-white outline-none disabled:opacity-60"
                                        placeholder="Thẻ"
                                    />
                                    <input
                                        type="number" value={pkg.originalPrice}
                                        disabled={!editingPackages}
                                        onChange={(e) => { const p = [...editingPackages]; p[i] = { ...p[i], originalPrice: parseInt(e.target.value) || 0 }; setEditingPackages(p); }}
                                        className="px-2 py-1.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-xs dark:text-white outline-none disabled:opacity-60"
                                        placeholder="Giá gốc"
                                    />
                                    <input
                                        type="number" value={pkg.salePrice}
                                        disabled={!editingPackages}
                                        onChange={(e) => { const p = [...editingPackages]; p[i] = { ...p[i], salePrice: parseInt(e.target.value) || 0 }; setEditingPackages(p); }}
                                        className="px-2 py-1.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-xs dark:text-white outline-none disabled:opacity-60"
                                        placeholder="Giá sale"
                                    />
                                    <span className="text-xs text-gray-400">-{Math.round((1 - pkg.salePrice / (pkg.originalPrice || 1)) * 100)}%</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* SePay Payment Config */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
                        <h3 className="font-bold text-gray-800 dark:text-white mb-3 flex items-center gap-2">
                            <CreditCard className="w-4 h-4 text-purple-500" />
                            Cấu hình thanh toán (SePay)
                        </h3>
                        <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="text-[10px] font-bold text-gray-500 uppercase">Mã ngân hàng</label>
                                    <input
                                        type="text"
                                        key={`bankId-${adminConfig?.bankId || ''}`}
                                        defaultValue={adminConfig?.bankId || ''}
                                        onBlur={(e) => { if (e.target.value.trim()) updateAdminConfig({ bankId: e.target.value.trim() }, currentUserId); }}
                                        className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm dark:text-white outline-none"
                                        placeholder="MB, VCB, TCB..."
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-gray-500 uppercase">Số tài khoản</label>
                                    <input
                                        type="text"
                                        key={`bankAccountNo-${adminConfig?.bankAccountNo || ''}`}
                                        defaultValue={adminConfig?.bankAccountNo || ''}
                                        onBlur={(e) => { if (e.target.value.trim()) updateAdminConfig({ bankAccountNo: e.target.value.trim() }, currentUserId); }}
                                        className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm dark:text-white outline-none"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-gray-500 uppercase">Tên tài khoản</label>
                                <input
                                    type="text"
                                    key={`bankAccountName-${adminConfig?.bankAccountName || ''}`}
                                    defaultValue={adminConfig?.bankAccountName || ''}
                                    onBlur={(e) => { if (e.target.value.trim()) updateAdminConfig({ bankAccountName: e.target.value.trim() }, currentUserId); }}
                                    className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm dark:text-white outline-none"
                                />
                            </div>

                            {/* Support Channels */}
                            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                                <h4 className="text-xs font-bold text-gray-600 dark:text-gray-300 mb-3">📞 Kênh hỗ trợ thanh toán</h4>
                                <div className="space-y-2">
                                    <div>
                                        <label className="text-[10px] font-bold text-gray-500 uppercase">Link Zalo</label>
                                        <input
                                            type="url"
                                            defaultValue={adminConfig?.supportZalo || ''}
                                            onBlur={(e) => updateAdminConfig({ supportZalo: e.target.value }, currentUserId)}
                                            className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm dark:text-white outline-none"
                                            placeholder="https://zalo.me/..."
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-gray-500 uppercase">Link Messenger</label>
                                        <input
                                            type="url"
                                            defaultValue={adminConfig?.supportMessenger || ''}
                                            onBlur={(e) => updateAdminConfig({ supportMessenger: e.target.value }, currentUserId)}
                                            className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm dark:text-white outline-none"
                                            placeholder="https://m.me/..."
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-gray-500 uppercase">Email hỗ trợ</label>
                                        <input
                                            type="email"
                                            defaultValue={adminConfig?.supportEmail || ''}
                                            onBlur={(e) => updateAdminConfig({ supportEmail: e.target.value }, currentUserId)}
                                            className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm dark:text-white outline-none"
                                            placeholder="support@example.com"
                                        />
                                    </div>
                                </div>
                            </div>

                        </div>
                    </div>
                </div>
            )}

            {/* ==================== VOUCHER SECTION ==================== */}
            {activeSection === 'vouchers' && (
                <div className="space-y-4">
                    {/* Create Voucher */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
                        <h3 className="font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                            <Plus className="w-4 h-4 text-emerald-500" />
                            Tạo Voucher mới
                        </h3>
                        <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-[10px] font-bold text-gray-500 uppercase">Mã voucher</label>
                                    <input
                                        type="text"
                                        value={newVoucher.code}
                                        onChange={(e) => setNewVoucher(v => ({ ...v, code: e.target.value.toUpperCase().replace(/\s/g, '') }))}
                                        placeholder="VD: SALE50, FREECREDIT"
                                        className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm dark:text-white outline-none font-mono uppercase"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-gray-500 uppercase">Mô tả</label>
                                    <input
                                        type="text"
                                        value={newVoucher.description}
                                        onChange={(e) => setNewVoucher(v => ({ ...v, description: e.target.value }))}
                                        placeholder="Giảm giá Tết 2026"
                                        className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm dark:text-white outline-none"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-4 gap-3">
                                <div>
                                    <label className="text-[10px] font-bold text-gray-500 uppercase">Loại giảm</label>
                                    <select
                                        value={newVoucher.discountType}
                                        onChange={(e) => setNewVoucher(v => ({ ...v, discountType: e.target.value }))}
                                        className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm dark:text-white outline-none"
                                    >
                                        <option value="percent">% Phần trăm</option>
                                        <option value="fixed">VND Cố định</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-gray-500 uppercase">
                                        {newVoucher.discountType === 'percent' ? 'Giảm (%)' : 'Giảm (VND)'}
                                    </label>
                                    <input
                                        type="number"
                                        value={newVoucher.discountValue}
                                        onChange={(e) => setNewVoucher(v => ({ ...v, discountValue: e.target.value }))}
                                        placeholder={newVoucher.discountType === 'percent' ? '50' : '20000'}
                                        className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm dark:text-white outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-gray-500 uppercase">Số lượt (0=∞)</label>
                                    <input
                                        type="number"
                                        value={newVoucher.maxUses}
                                        onChange={(e) => setNewVoucher(v => ({ ...v, maxUses: e.target.value }))}
                                        placeholder="100"
                                        className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm dark:text-white outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-gray-500 uppercase">Hết hạn</label>
                                    <input
                                        type="date"
                                        value={newVoucher.expiresAt}
                                        onChange={(e) => setNewVoucher(v => ({ ...v, expiresAt: e.target.value }))}
                                        className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm dark:text-white outline-none"
                                    />
                                </div>
                            </div>
                            {voucherError && (
                                <p className="text-xs text-red-500 font-medium">{voucherError}</p>
                            )}
                            <button
                                onClick={async () => {
                                    setVoucherError('');
                                    if (!newVoucher.code.trim()) { setVoucherError('Nhập mã voucher'); return; }
                                    if (!newVoucher.discountValue || Number(newVoucher.discountValue) <= 0) { setVoucherError('Nhập giá trị giảm'); return; }
                                    if (newVoucher.discountType === 'percent' && Number(newVoucher.discountValue) > 100) { setVoucherError('Phần trăm giảm tối đa 100%'); return; }
                                    setSavingConfig(true);
                                    const result = await createVoucher({
                                        ...newVoucher,
                                        expiresAt: newVoucher.expiresAt ? new Date(newVoucher.expiresAt + 'T23:59:59').toISOString() : null,
                                    }, currentUserId);
                                    if (result.success) {
                                        setNotification({ type: 'success', message: `Đã tạo voucher ${newVoucher.code}` });
                                        setNewVoucher({ code: '', discountType: 'percent', discountValue: '', maxUses: '', expiresAt: '', description: '' });
                                    } else {
                                        setVoucherError(result.error || 'Lỗi tạo voucher');
                                    }
                                    setSavingConfig(false);
                                }}
                                disabled={savingConfig}
                                className="w-full py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:from-emerald-600 hover:to-teal-700 disabled:opacity-50 transition-all"
                            >
                                {savingConfig ? <Loader2 className="w-4 h-4 animate-spin" /> : <Ticket className="w-4 h-4" />}
                                Tạo Voucher
                            </button>
                        </div>
                    </div>

                    {/* Voucher List */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
                        <h3 className="font-bold text-gray-800 dark:text-white mb-3 flex items-center gap-2">
                            <Ticket className="w-4 h-4 text-indigo-500" />
                            Danh sách Voucher ({vouchers.length})
                        </h3>
                        {vouchers.length === 0 ? (
                            <p className="text-sm text-gray-400 italic py-4 text-center">Chưa có voucher nào.</p>
                        ) : (
                            <div className="space-y-2">
                                {vouchers.map(v => {
                                    const isExpired = v.expiresAt && new Date() > (v.expiresAt?.toDate ? v.expiresAt.toDate() : new Date(v.expiresAt));
                                    const isUsedUp = v.maxUses > 0 && v.usedCount >= v.maxUses;
                                    return (
                                        <div key={v.id} className={`p-3 rounded-xl border transition-all ${!v.active || isExpired || isUsedUp
                                            ? 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 opacity-60'
                                            : 'border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-900/10'
                                            }`}>
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-white text-xs ${v.active && !isExpired && !isUsedUp
                                                        ? 'bg-gradient-to-br from-emerald-500 to-teal-600'
                                                        : 'bg-gray-400'
                                                        }`}>
                                                        {v.discountType === 'percent' ? `${v.discountValue}%` : `${Math.round(v.discountValue / 1000)}K`}
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-gray-800 dark:text-white font-mono text-sm">{v.code}</p>
                                                        <div className="flex items-center gap-2 flex-wrap">
                                                            <span className="text-xs text-gray-500">
                                                                {v.discountType === 'percent' ? `Giảm ${v.discountValue}%` : `Giảm ${formatVND(v.discountValue)}`}
                                                            </span>
                                                            <span className="text-xs text-gray-400">•</span>
                                                            <span className="text-xs text-gray-500">
                                                                Đã dùng: {v.usedCount || 0}{v.maxUses > 0 ? `/${v.maxUses}` : '/∞'}
                                                            </span>
                                                            {v.expiresAt && (
                                                                <>
                                                                    <span className="text-xs text-gray-400">•</span>
                                                                    <span className={`text-xs ${isExpired ? 'text-red-500' : 'text-gray-500'}`}>
                                                                        {isExpired ? 'Hết hạn' : `HSD: ${new Date(v.expiresAt?.toDate ? v.expiresAt.toDate() : v.expiresAt).toLocaleDateString('vi-VN')}`}
                                                                    </span>
                                                                </>
                                                            )}
                                                            {v.description && (
                                                                <>
                                                                    <span className="text-xs text-gray-400">•</span>
                                                                    <span className="text-xs text-gray-400 italic">{v.description}</span>
                                                                </>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={async () => {
                                                            setSavingConfig(true);
                                                            await toggleVoucher(v.code, !v.active);
                                                            setNotification({ type: 'success', message: v.active ? `Đã tắt voucher ${v.code}` : `Đã bật voucher ${v.code}` });
                                                            setSavingConfig(false);
                                                        }}
                                                        disabled={savingConfig}
                                                        className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                                        title={v.active ? 'Tắt voucher' : 'Bật voucher'}
                                                    >
                                                        {v.active ? <ToggleRight className="w-5 h-5 text-emerald-500" /> : <ToggleLeft className="w-5 h-5 text-gray-400" />}
                                                    </button>
                                                    <button
                                                        onClick={async () => {
                                                            if (!window.confirm(`Xóa voucher ${v.code}?`)) return;
                                                            setSavingConfig(true);
                                                            await deleteVoucher(v.code);
                                                            setNotification({ type: 'success', message: `Đã xóa voucher ${v.code}` });
                                                            setSavingConfig(false);
                                                        }}
                                                        disabled={savingConfig}
                                                        className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                                        title="Xóa voucher"
                                                    >
                                                        <Trash2 className="w-4 h-4 text-red-400 hover:text-red-600" />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
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
