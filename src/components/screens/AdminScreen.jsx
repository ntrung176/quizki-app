import React, { useState, useEffect, useMemo } from 'react';
import { collection, query, onSnapshot, doc, getDoc, setDoc, deleteDoc, getDocs, where } from 'firebase/firestore';
import { db } from '../../config/firebase';
import {
    Users, Search, Shield, ShieldCheck, ShieldX, Trash2, Edit, Save, X,
    BarChart3, UserCheck, UserX, Clock, Calendar, Filter, ChevronDown, ChevronUp,
    AlertTriangle, CheckCircle, Loader2, RefreshCw
} from 'lucide-react';

// Application ID for Firebase paths
const appId = typeof __app_id !== 'undefined' ? __app_id : 'quizki-app';

const AdminScreen = ({ publicStatsPath, currentUserId, onAdminDeleteUserData }) => {
    // State
    const [users, setUsers] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterStatus, setFilterStatus] = useState('all'); // all, approved, pending
    const [sortBy, setSortBy] = useState('totalCards'); // totalCards, displayName, createdAt
    const [sortOrder, setSortOrder] = useState('desc');
    const [selectedUser, setSelectedUser] = useState(null);
    const [isEditing, setIsEditing] = useState(false);
    const [editForm, setEditForm] = useState({});
    const [saving, setSaving] = useState(false);
    const [notification, setNotification] = useState(null);
    const [confirmDelete, setConfirmDelete] = useState(null);
    const [deleting, setDeleting] = useState(false);

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

    // Stats calculations
    const stats = useMemo(() => {
        const total = users.length;
        const approved = users.filter(u => u.isApproved === true).length;
        const pending = users.filter(u => u.isApproved !== true).length;
        const totalCards = users.reduce((sum, u) => sum + (u.totalCards || 0), 0);
        const activeToday = users.filter(u => {
            if (!u.lastActive) return false;
            const today = new Date().setHours(0, 0, 0, 0);
            return u.lastActive >= today;
        }).length;
        return { total, approved, pending, totalCards, activeToday };
    }, [users]);

    // Filtered and sorted users
    const filteredUsers = useMemo(() => {
        let result = [...users];

        // Search filter
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            result = result.filter(u =>
                (u.displayName || '').toLowerCase().includes(query) ||
                (u.userId || '').toLowerCase().includes(query)
            );
        }

        // Status filter
        if (filterStatus === 'approved') {
            result = result.filter(u => u.isApproved === true);
        } else if (filterStatus === 'pending') {
            result = result.filter(u => u.isApproved !== true);
        }

        // Sort
        result.sort((a, b) => {
            let aVal, bVal;
            switch (sortBy) {
                case 'displayName':
                    aVal = (a.displayName || '').toLowerCase();
                    bVal = (b.displayName || '').toLowerCase();
                    break;
                case 'createdAt':
                    aVal = a.createdAt || 0;
                    bVal = b.createdAt || 0;
                    break;
                default:
                    aVal = a.totalCards || 0;
                    bVal = b.totalCards || 0;
            }
            if (sortOrder === 'asc') {
                return aVal > bVal ? 1 : -1;
            }
            return aVal < bVal ? 1 : -1;
        });

        return result;
    }, [users, searchQuery, filterStatus, sortBy, sortOrder]);

    // Open user details
    const handleSelectUser = async (user) => {
        setSelectedUser(user);
        setIsEditing(false);
        setEditForm({
            displayName: user.displayName || '',
            isApproved: user.isApproved === true,
            dailyGoal: ''
        });

        // Load full profile
        if (db && appId) {
            try {
                const profileRef = doc(db, `artifacts/${appId}/users/${user.userId}/settings/profile`);
                const snap = await getDoc(profileRef);
                if (snap.exists()) {
                    const data = snap.data();
                    setEditForm(prev => ({
                        ...prev,
                        dailyGoal: data.dailyGoal ? String(data.dailyGoal) : ''
                    }));
                }
            } catch (e) {
                console.error('Error loading profile:', e);
            }
        }
    };

    // Save user changes
    const handleSave = async () => {
        if (!db || !appId || !selectedUser) return;

        const name = editForm.displayName.trim();
        if (!name) {
            setNotification({ type: 'error', message: 'Tên hiển thị không được để trống.' });
            return;
        }

        setSaving(true);
        try {
            // Check duplicate name
            const q = query(collection(db, publicStatsPath), where('displayName', '==', name));
            const snap = await getDocs(q);
            const conflict = snap.docs.find(d => d.id !== selectedUser.userId);
            if (conflict) {
                setNotification({ type: 'error', message: 'Tên hiển thị đã được sử dụng.' });
                setSaving(false);
                return;
            }

            // Update profile
            const profileRef = doc(db, `artifacts/${appId}/users/${selectedUser.userId}/settings/profile`);
            const updates = {
                displayName: name,
                isApproved: editForm.isApproved === true
            };
            const goalNum = editForm.dailyGoal ? Number(editForm.dailyGoal) : null;
            if (!isNaN(goalNum) && goalNum > 0) {
                updates.dailyGoal = goalNum;
            }
            await setDoc(profileRef, updates, { merge: true });

            // Update public stats
            const statsRef = doc(db, publicStatsPath, selectedUser.userId);
            await setDoc(statsRef, {
                displayName: name,
                isApproved: editForm.isApproved === true
            }, { merge: true });

            // Update local state
            setUsers(prev => prev.map(u =>
                u.userId === selectedUser.userId
                    ? { ...u, displayName: name, isApproved: editForm.isApproved }
                    : u
            ));
            setSelectedUser(prev => ({ ...prev, displayName: name, isApproved: editForm.isApproved }));
            setIsEditing(false);
            setNotification({ type: 'success', message: 'Đã lưu thay đổi.' });
        } catch (e) {
            console.error('Error saving:', e);
            setNotification({ type: 'error', message: 'Lỗi khi lưu: ' + e.message });
        } finally {
            setSaving(false);
        }
    };

    // Quick approve/unapprove
    const handleQuickApprove = async (user, approve) => {
        if (!db || !appId) return;
        try {
            const profileRef = doc(db, `artifacts/${appId}/users/${user.userId}/settings/profile`);
            await setDoc(profileRef, { isApproved: approve }, { merge: true });

            const statsRef = doc(db, publicStatsPath, user.userId);
            await setDoc(statsRef, { isApproved: approve }, { merge: true });

            setUsers(prev => prev.map(u =>
                u.userId === user.userId ? { ...u, isApproved: approve } : u
            ));
            if (selectedUser?.userId === user.userId) {
                setSelectedUser(prev => ({ ...prev, isApproved: approve }));
            }
            setNotification({
                type: 'success',
                message: approve ? `Đã duyệt ${user.displayName}` : `Đã hủy duyệt ${user.displayName}`
            });
        } catch (e) {
            console.error('Error:', e);
            setNotification({ type: 'error', message: 'Lỗi: ' + e.message });
        }
    };

    // Delete user
    const handleDelete = async () => {
        if (!confirmDelete || !onAdminDeleteUserData) return;
        setDeleting(true);
        try {
            await onAdminDeleteUserData(confirmDelete.userId);
            setUsers(prev => prev.filter(u => u.userId !== confirmDelete.userId));
            if (selectedUser?.userId === confirmDelete.userId) {
                setSelectedUser(null);
            }
            setNotification({ type: 'success', message: `Đã xóa dữ liệu ${confirmDelete.displayName}` });
        } catch (e) {
            console.error('Error deleting:', e);
            setNotification({ type: 'error', message: 'Lỗi khi xóa: ' + e.message });
        } finally {
            setDeleting(false);
            setConfirmDelete(null);
        }
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
                        Quản lý người dùng và hệ thống
                    </p>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
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
                        <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                            <UserCheck className="w-5 h-5 text-green-600 dark:text-green-400" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-green-600">{stats.approved}</p>
                            <p className="text-xs text-gray-500">Đã duyệt</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                            <UserX className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-amber-600">{stats.pending}</p>
                            <p className="text-xs text-gray-500">Chờ duyệt</p>
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
                    {/* Search */}
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Tìm kiếm theo tên hoặc ID..."
                            className="w-full pl-10 pr-4 py-2 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                        />
                    </div>

                    {/* Status Filter */}
                    <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                        className="px-4 py-2 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                    >
                        <option value="all">Tất cả trạng thái</option>
                        <option value="approved">Đã duyệt</option>
                        <option value="pending">Chờ duyệt</option>
                    </select>

                    {/* Sort */}
                    <select
                        value={`${sortBy}-${sortOrder}`}
                        onChange={(e) => {
                            const [by, order] = e.target.value.split('-');
                            setSortBy(by);
                            setSortOrder(order);
                        }}
                        className="px-4 py-2 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                    >
                        <option value="totalCards-desc">Nhiều thẻ nhất</option>
                        <option value="totalCards-asc">Ít thẻ nhất</option>
                        <option value="displayName-asc">Tên A-Z</option>
                        <option value="displayName-desc">Tên Z-A</option>
                    </select>
                </div>
            </div>

            {/* Main Content */}
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
                                {filteredUsers.map(user => (
                                    <div
                                        key={user.userId}
                                        onClick={() => handleSelectUser(user)}
                                        className={`p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors ${selectedUser?.userId === user.userId ? 'bg-indigo-50 dark:bg-indigo-900/20' : ''
                                            }`}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${user.isApproved ? 'bg-green-500' : 'bg-amber-500'
                                                    }`}>
                                                    {(user.displayName || '?')[0].toUpperCase()}
                                                </div>
                                                <div>
                                                    <p className="font-medium text-gray-800 dark:text-white">
                                                        {user.displayName || 'Chưa đặt tên'}
                                                        {user.userId === currentUserId && (
                                                            <span className="ml-2 text-xs bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded-full">
                                                                Bạn
                                                            </span>
                                                        )}
                                                    </p>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                                        {user.totalCards || 0} thẻ
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {user.isApproved ? (
                                                    <span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 px-2 py-1 rounded-full flex items-center gap-1">
                                                        <ShieldCheck className="w-3 h-3" /> Đã duyệt
                                                    </span>
                                                ) : (
                                                    <span className="text-xs bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 px-2 py-1 rounded-full flex items-center gap-1">
                                                        <Clock className="w-3 h-3" /> Chờ duyệt
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* User Details Panel */}
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
                    {selectedUser ? (
                        <div className="p-4 space-y-4">
                            {/* User Header */}
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg ${selectedUser.isApproved ? 'bg-green-500' : 'bg-amber-500'
                                        }`}>
                                        {(selectedUser.displayName || '?')[0].toUpperCase()}
                                    </div>
                                    <div>
                                        <p className="font-bold text-gray-800 dark:text-white">
                                            {selectedUser.displayName || 'Chưa đặt tên'}
                                        </p>
                                        <p className="text-xs text-gray-500 font-mono">{selectedUser.userId?.slice(0, 20)}...</p>
                                    </div>
                                </div>
                                {!isEditing && (
                                    <button
                                        onClick={() => setIsEditing(true)}
                                        className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-colors"
                                    >
                                        <Edit className="w-4 h-4" />
                                    </button>
                                )}
                            </div>

                            {/* Stats */}
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

                            {/* Edit Form */}
                            {isEditing ? (
                                <div className="space-y-3 pt-2 border-t border-gray-100 dark:border-gray-700">
                                    <div>
                                        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Tên hiển thị</label>
                                        <input
                                            type="text"
                                            value={editForm.displayName}
                                            onChange={(e) => setEditForm({ ...editForm, displayName: e.target.value })}
                                            className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Mục tiêu hàng ngày</label>
                                        <input
                                            type="number"
                                            value={editForm.dailyGoal}
                                            onChange={(e) => setEditForm({ ...editForm, dailyGoal: e.target.value })}
                                            placeholder="VD: 15"
                                            className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={editForm.isApproved}
                                                onChange={(e) => setEditForm({ ...editForm, isApproved: e.target.checked })}
                                                className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                            />
                                            <span className="text-sm text-gray-700 dark:text-gray-300">Đã duyệt sử dụng</span>
                                        </label>
                                    </div>
                                    <div className="flex gap-2 pt-2">
                                        <button
                                            onClick={() => setIsEditing(false)}
                                            className="flex-1 px-3 py-2 text-sm font-medium text-gray-600 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
                                        >
                                            Hủy
                                        </button>
                                        <button
                                            onClick={handleSave}
                                            disabled={saving}
                                            className="flex-1 px-3 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-1"
                                        >
                                            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                            Lưu
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                /* Quick Actions */
                                <div className="space-y-2 pt-2 border-t border-gray-100 dark:border-gray-700">
                                    <p className="text-xs font-medium text-gray-500 uppercase">Hành động nhanh</p>
                                    {selectedUser.isApproved ? (
                                        <button
                                            onClick={() => handleQuickApprove(selectedUser, false)}
                                            className="w-full px-3 py-2 text-sm font-medium text-amber-600 bg-amber-50 dark:bg-amber-900/20 hover:bg-amber-100 dark:hover:bg-amber-900/30 rounded-lg transition-colors flex items-center justify-center gap-2"
                                        >
                                            <ShieldX className="w-4 h-4" /> Hủy duyệt
                                        </button>
                                    ) : (
                                        <button
                                            onClick={() => handleQuickApprove(selectedUser, true)}
                                            className="w-full px-3 py-2 text-sm font-medium text-green-600 bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30 rounded-lg transition-colors flex items-center justify-center gap-2"
                                        >
                                            <ShieldCheck className="w-4 h-4" /> Duyệt người dùng
                                        </button>
                                    )}
                                    {selectedUser.userId !== currentUserId && (
                                        <button
                                            onClick={() => setConfirmDelete(selectedUser)}
                                            className="w-full px-3 py-2 text-sm font-medium text-red-600 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors flex items-center justify-center gap-2"
                                        >
                                            <Trash2 className="w-4 h-4" /> Xóa dữ liệu người dùng
                                        </button>
                                    )}
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

            {/* Delete Confirmation Modal */}
            {confirmDelete && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-sm w-full p-6 space-y-4">
                        <div className="text-center">
                            <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-3">
                                <AlertTriangle className="w-6 h-6 text-red-600" />
                            </div>
                            <h3 className="text-lg font-bold text-gray-800 dark:text-white">Xác nhận xóa</h3>
                            <p className="text-sm text-gray-500 mt-2">
                                Bạn có chắc muốn xóa toàn bộ dữ liệu của <strong>{confirmDelete.displayName}</strong>?
                                Hành động này không thể hoàn tác.
                            </p>
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setConfirmDelete(null)}
                                disabled={deleting}
                                className="flex-1 px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                            >
                                Hủy
                            </button>
                            <button
                                onClick={handleDelete}
                                disabled={deleting}
                                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors flex items-center justify-center gap-1"
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
