import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot, doc, getDoc, updateDoc, setDoc, where, getDocs } from 'firebase/firestore';
import { db } from '../../config/firebase';

// Application ID for Firebase paths
const appId = typeof __app_id !== 'undefined' ? __app_id : 'quizki-app';

const FriendsScreen = ({ publicStatsPath, currentUserId, isAdmin, onAdminDeleteUserData, onBack }) => {
    const [friendStats, setFriendStats] = useState([]);
    const [_isLoading, setIsLoading] = useState(true); // eslint-disable-line no-unused-vars
    const [editingUser, setEditingUser] = useState(null);
    const [editDisplayName, setEditDisplayName] = useState('');
    const [editGoal, setEditGoal] = useState('');
    const [editApproved, setEditApproved] = useState(false);
    const [editError, setEditError] = useState('');
    const [editSaving, setEditSaving] = useState(false);

    useEffect(() => {
        if (!db || !publicStatsPath) return;
        const q = query(collection(db, publicStatsPath));
        const unsubscribe = onSnapshot(q, (s) => {
            const l = s.docs.map(d => d.data());
            l.sort((a, b) => (b.totalCards || 0) - (a.totalCards || 0));
            setFriendStats(l);
            setIsLoading(false);
        });
        return () => unsubscribe();
    }, [publicStatsPath]);

    const handleOpenEdit = async (u) => {
        if (!db || !appId || !isAdmin) return;
        setEditError('');
        setEditingUser(u);
        setEditDisplayName(u.displayName || '');
        setEditGoal('');
        setEditApproved(u.isApproved === true);
        try {
            const profileRef = doc(db, `artifacts/${appId}/users/${u.userId}/settings/profile`);
            const snap = await getDoc(profileRef);
            if (snap.exists()) {
                const data = snap.data();
                if (typeof data.dailyGoal === 'number') {
                    setEditGoal(String(data.dailyGoal));
                }
                if (data.isApproved === true) {
                    setEditApproved(true);
                }
            }
        } catch (e) {
            console.error("Lỗi tải profile để chỉnh sửa:", e);
        }
    };

    const handleSaveEdit = async () => {
        if (!db || !appId || !editingUser || !isAdmin) return;
        const name = editDisplayName.trim();
        if (!name) {
            setEditError('Tên hiển thị không được để trống.');
            return;
        }
        setEditError('');
        setEditSaving(true);
        try {
            // Check for duplicate display name
            try {
                const q = query(
                    collection(db, publicStatsPath),
                    where('displayName', '==', name)
                );
                const snap = await getDocs(q);
                if (!snap.empty) {
                    const conflict = snap.docs.find(d => d.id !== editingUser.userId);
                    if (conflict) {
                        setEditError('Tên hiển thị này đã được sử dụng. Vui lòng chọn tên khác.');
                        setEditSaving(false);
                        return;
                    }
                }
            } catch (checkErr) {
                console.error('Lỗi kiểm tra trùng tên (admin edit):', checkErr);
            }

            const profileRef = doc(db, `artifacts/${appId}/users/${editingUser.userId}/settings/profile`);
            const updates = { displayName: name, isApproved: editApproved === true };
            const goalNum = editGoal ? Number(editGoal) : null;
            if (!isNaN(goalNum) && goalNum && goalNum > 0) {
                updates.dailyGoal = goalNum;
            }
            await setDoc(profileRef, updates, { merge: true });

            // Update public stats
            const statsRef = doc(db, publicStatsPath, editingUser.userId);
            await setDoc(statsRef, { displayName: name, isApproved: editApproved === true }, { merge: true }).catch(() => { });

            // Update local UI
            setFriendStats(prev =>
                prev.map(item =>
                    item.userId === editingUser.userId ? { ...item, displayName: name, isApproved: editApproved === true } : item
                )
            );

            setEditingUser(null);
            setEditSaving(false);
        } catch (e) {
            console.error("Lỗi admin cập nhật thông tin người dùng:", e);
            setEditError('Không thể cập nhật thông tin người dùng. Vui lòng thử lại.');
            setEditSaving(false);
        }
    };

    return (
        <div className="space-y-3 md:space-y-6">
            <h2 className="text-lg md:text-2xl font-bold text-gray-800 dark:text-gray-100 pb-2 md:pb-4 border-b dark:border-gray-700">Bảng Xếp Hạng</h2>
            <div className="bg-white dark:bg-gray-800 rounded-xl md:rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden">
                <div className="overflow-x-auto overflow-y-visible -mx-2 md:mx-0 px-2 md:px-0">
                    <table className="w-full min-w-[600px]">
                        <thead className="bg-gray-50 dark:bg-gray-700 border-b border-gray-100 dark:border-gray-600">
                            <tr>
                                <th className="px-3 md:px-6 py-2 md:py-4 text-left text-[10px] md:text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Hạng</th>
                                <th className="px-3 md:px-6 py-2 md:py-4 text-left text-[10px] md:text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Thành viên</th>
                                <th className="px-2 md:px-4 py-2 md:py-4 text-center text-[10px] md:text-xs font-bold text-amber-600 dark:text-amber-400 uppercase">Ngắn</th>
                                <th className="px-2 md:px-4 py-2 md:py-4 text-center text-[10px] md:text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase">Trung</th>
                                <th className="px-2 md:px-4 py-2 md:py-4 text-center text-[10px] md:text-xs font-bold text-green-700 dark:text-green-400 uppercase">Dài</th>
                                <th className="px-3 md:px-6 py-2 md:py-4 text-right text-[10px] md:text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Tổng từ</th>
                                {isAdmin && <th className="px-2 md:px-4 py-2 md:py-4 text-right text-[10px] md:text-xs font-bold text-red-500 dark:text-red-400 uppercase">Admin</th>}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                            {friendStats.map((u, i) => (
                                <tr key={u.userId} className={u.userId === currentUserId ? 'bg-indigo-50/50 dark:bg-indigo-900/20' : ''}>
                                    <td className="px-3 md:px-6 py-2 md:py-4 text-xs md:text-sm font-bold text-gray-400 dark:text-gray-500">#{i + 1}</td>
                                    <td className={`px-3 md:px-6 py-2 md:py-4 text-xs md:text-sm font-bold ${u.userId === currentUserId ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-700 dark:text-gray-300'}`}>
                                        <div className="flex items-center gap-1.5 md:gap-2">
                                            <span className="truncate max-w-[120px] md:max-w-none">{u.displayName} {u.userId === currentUserId && '(Bạn)'}</span>
                                            {isAdmin && (
                                                <span className={`px-1.5 md:px-2 py-0.5 text-[9px] md:text-[10px] font-semibold rounded-full border flex-shrink-0 ${u.isApproved
                                                    ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-emerald-100 dark:border-emerald-800'
                                                    : 'bg-yellow-50 dark:bg-yellow-900/30 text-amber-700 dark:text-amber-300 border-amber-100 dark:border-amber-800'
                                                    }`}>
                                                    {u.isApproved ? 'Đã duyệt' : 'Chờ duyệt'}
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-2 md:px-4 py-2 md:py-4 text-center text-xs md:text-sm font-medium text-amber-600 dark:text-amber-400">{u.shortTerm || 0}</td>
                                    <td className="px-2 md:px-4 py-2 md:py-4 text-center text-xs md:text-sm font-medium text-emerald-600 dark:text-emerald-400">{u.midTerm || 0}</td>
                                    <td className="px-2 md:px-4 py-2 md:py-4 text-center text-xs md:text-sm font-medium text-green-700 dark:text-green-400">{u.longTerm || 0}</td>
                                    <td className="px-3 md:px-6 py-2 md:py-4 text-right text-xs md:text-sm font-bold text-emerald-600 dark:text-emerald-400">{u.totalCards}</td>
                                    {isAdmin && (
                                        <td className="px-2 md:px-4 py-2 md:py-4 text-right space-x-1 md:space-x-2">
                                            <button
                                                type="button"
                                                onClick={() => handleOpenEdit(u)}
                                                className="px-2 md:px-3 py-1 md:py-1.5 text-[10px] md:text-xs font-semibold rounded-md md:rounded-lg border border-indigo-200 dark:border-indigo-700 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 whitespace-nowrap transition-colors"
                                            >
                                                Sửa
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    if (u.userId === currentUserId) return;
                                                    if (window.confirm(`Bạn có chắc muốn xoá toàn bộ dữ liệu của ${u.displayName || 'người dùng này'}?`)) {
                                                        onAdminDeleteUserData(u.userId);
                                                    }
                                                }}
                                                className={`px-2 md:px-3 py-1 md:py-1.5 text-[10px] md:text-xs font-semibold rounded-md md:rounded-lg border whitespace-nowrap transition-colors ${u.userId === currentUserId
                                                    ? 'border-gray-200 dark:border-gray-700 text-gray-300 dark:text-gray-600 cursor-not-allowed'
                                                    : 'border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30'
                                                    }`}
                                            >
                                                Xoá dữ liệu
                                            </button>
                                        </td>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {isAdmin && editingUser && (
                <div className="bg-white dark:bg-gray-800 rounded-2xl border border-indigo-100 dark:border-indigo-900/30 shadow-sm p-4 space-y-3">
                    <h3 className="text-sm font-bold text-gray-800 dark:text-gray-100">
                        Chỉnh sửa người dùng: <span className="text-indigo-600 dark:text-indigo-400">{editingUser.displayName || editingUser.userId}</span>
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">Tên hiển thị</label>
                            <input
                                type="text"
                                value={editDisplayName}
                                onChange={(e) => setEditDisplayName(e.target.value)}
                                className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900/50 focus:border-indigo-500 dark:focus:border-indigo-500 outline-none text-gray-900 dark:text-gray-100"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">Mục tiêu/ngày</label>
                            <div className="flex items-center gap-2 pt-1">
                                <input
                                    id="edit-approved"
                                    type="checkbox"
                                    checked={editApproved}
                                    onChange={(e) => setEditApproved(e.target.checked)}
                                    className="w-4 h-4 text-indigo-600 dark:text-indigo-400 border-gray-300 dark:border-gray-600 rounded"
                                />
                                <label htmlFor="edit-approved" className="text-xs text-gray-600 dark:text-gray-400">
                                    Cho phép tài khoản này sử dụng app (Admin duyệt)
                                </label>
                            </div>
                            <input
                                type="number"
                                min={1}
                                value={editGoal}
                                onChange={(e) => setEditGoal(e.target.value)}
                                className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900/50 focus:border-indigo-500 dark:focus:border-indigo-500 outline-none text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
                                placeholder="Giữ nguyên nếu để trống"
                            />
                        </div>
                    </div>
                    {editError && (
                        <div className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 border border-red-100 dark:border-red-800 rounded-xl px-3 py-2">
                            {editError}
                        </div>
                    )}
                    <div className="flex justify-end gap-2">
                        <button
                            type="button"
                            onClick={() => { setEditingUser(null); setEditError(''); }}
                            className="px-4 py-2 text-xs font-semibold rounded-xl border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                        >
                            Huỷ
                        </button>
                        <button
                            type="button"
                            disabled={editSaving}
                            onClick={handleSaveEdit}
                            className="px-4 py-2 text-xs font-semibold rounded-xl bg-indigo-600 dark:bg-indigo-500 text-white hover:bg-indigo-700 dark:hover:bg-indigo-600 disabled:opacity-50 transition-colors"
                        >
                            {editSaving ? 'Đang lưu...' : 'Lưu thay đổi'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FriendsScreen;
