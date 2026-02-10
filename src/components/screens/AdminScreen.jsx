import React, { useState, useEffect, useMemo } from 'react';
import { collection, query, onSnapshot, doc, deleteDoc, getDocs } from 'firebase/firestore';
import { db, appId } from '../../config/firebase';
import {
    Users, Search, Shield, Trash2, BarChart3, Clock,
    AlertTriangle, CheckCircle, Loader2, Languages, BookOpen
} from 'lucide-react';

const AdminScreen = ({ publicStatsPath, currentUserId, onAdminDeleteUserData }) => {
    // State
    const [users, setUsers] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [sortBy, setSortBy] = useState('totalCards'); // totalCards, displayName
    const [sortOrder, setSortOrder] = useState('desc');
    const [selectedUser, setSelectedUser] = useState(null);
    const [notification, setNotification] = useState(null);
    const [confirmDelete, setConfirmDelete] = useState(null);
    const [deleting, setDeleting] = useState(false);
    const [deleteType, setDeleteType] = useState('all'); // 'all' | 'kanji'
    const [userKanjiStats, setUserKanjiStats] = useState({}); // userId -> { total, learning, mastered }

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
                const now = Date.now();
                let total = 0, learning = 0, mastered = 0;
                srsSnap.docs.forEach(d => {
                    total++;
                    const data = d.data();
                    if (data.interval >= 1440 * 21) mastered++; // > 21 days
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

    // Stats calculations
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

        // Search filter
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            result = result.filter(u =>
                (u.displayName || '').toLowerCase().includes(query) ||
                (u.userId || '').toLowerCase().includes(query)
            );
        }

        // Sort
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
            if (sortOrder === 'asc') {
                return aVal > bVal ? 1 : -1;
            }
            return aVal < bVal ? 1 : -1;
        });

        return result;
    }, [users, searchQuery, sortBy, sortOrder]);

    // Open user details
    const handleSelectUser = (user) => {
        setSelectedUser(user);
    };

    // Delete user data
    const handleDelete = async () => {
        if (!confirmDelete) return;
        setDeleting(true);
        try {
            if (deleteType === 'kanji') {
                // Delete only kanji SRS data
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
                // Delete all user data
                if (onAdminDeleteUserData) {
                    await onAdminDeleteUserData(confirmDelete.userId);
                }
                setUsers(prev => prev.filter(u => u.userId !== confirmDelete.userId));
                if (selectedUser?.userId === confirmDelete.userId) {
                    setSelectedUser(null);
                }
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
                        Quản lý người dùng, dữ liệu từ vựng và Kanji SRS
                    </p>
                </div>
            </div>

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
                                                <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold bg-indigo-500">
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
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg bg-indigo-500">
                                    {(selectedUser.displayName || '?')[0].toUpperCase()}
                                </div>
                                <div>
                                    <p className="font-bold text-gray-800 dark:text-white">
                                        {selectedUser.displayName || 'Chưa đặt tên'}
                                    </p>
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

                            {/* Delete Actions */}
                            {selectedUser.userId !== currentUserId && (
                                <div className="pt-2 border-t border-gray-100 dark:border-gray-700 space-y-2">
                                    {/* Delete Kanji SRS only */}
                                    <button
                                        onClick={() => { setDeleteType('kanji'); setConfirmDelete(selectedUser); }}
                                        className="w-full px-3 py-2 text-sm font-medium text-orange-600 bg-orange-50 dark:bg-orange-900/20 hover:bg-orange-100 dark:hover:bg-orange-900/30 rounded-lg transition-colors flex items-center justify-center gap-2"
                                    >
                                        <Languages className="w-4 h-4" /> Xóa dữ liệu Kanji SRS
                                    </button>
                                    {/* Delete all user data */}
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
