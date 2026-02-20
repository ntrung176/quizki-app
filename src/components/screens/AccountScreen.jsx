import React, { useState } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db, auth } from '../../config/firebase';
import { Users, Save, Lock, Eye, EyeOff } from 'lucide-react';

const AccountScreen = ({ profile, onUpdateProfileName, onChangePassword, onBack, publicStatsPath, currentUserId }) => {
    const [newDisplayName, setNewDisplayName] = useState(profile.displayName || '');
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmNewPassword, setConfirmNewPassword] = useState('');
    const [showCurrent, setShowCurrent] = useState(false);
    const [showNew, setShowNew] = useState(false);
    const [showConfirmNew, setShowConfirmNew] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    const handleSaveProfile = async () => {
        setError('');
        setMessage('');
        if (!newDisplayName.trim()) {
            setError('Tên hiển thị không được để trống.');
            return;
        }
        try {
            // Kiểm tra trùng tên hiển thị
            if (db && publicStatsPath) {
                try {
                    const q = query(
                        collection(db, publicStatsPath),
                        where('displayName', '==', newDisplayName.trim())
                    );
                    const snap = await getDocs(q);
                    if (!snap.empty) {
                        const conflict = snap.docs.find(d => d.id !== currentUserId);
                        if (conflict) {
                            setError('Tên hiển thị này đã được sử dụng. Vui lòng chọn tên khác.');
                            return;
                        }
                    }
                } catch (checkErr) {
                    console.error('Lỗi kiểm tra trùng tên hiển thị:', checkErr);
                }
            }

            await onUpdateProfileName(newDisplayName.trim());
            setMessage('Đã cập nhật tên hiển thị.');
        } catch (e) {
            console.error('Lỗi cập nhật tên:', e);
            setError('Không thể cập nhật tên hiển thị. Vui lòng thử lại.');
        }
    };

    const handleChangePassword = async () => {
        setError('');
        setMessage('');
        if (!newPassword || newPassword.length < 6) {
            setError('Mật khẩu mới phải có ít nhất 6 ký tự.');
            return;
        }
        if (newPassword !== confirmNewPassword) {
            setError('Mật khẩu xác nhận không khớp.');
            return;
        }
        try {
            await onChangePassword(currentPassword, newPassword);
            setMessage('Đã cập nhật mật khẩu. Lần sau hãy dùng mật khẩu mới để đăng nhập.');
            setCurrentPassword('');
            setNewPassword('');
            setConfirmNewPassword('');
        } catch (e) {
            console.error('Lỗi đổi mật khẩu:', e);
            if (e.code === 'auth/wrong-password' || e.code === 'auth/invalid-credential') {
                setError('Mật khẩu hiện tại không đúng.');
            } else if (e.code === 'auth/requires-recent-login') {
                setError('Vì lý do bảo mật, bạn cần đăng xuất và đăng nhập lại trước khi tạo/đổi mật khẩu.');
            } else {
                setError('Không thể đổi mật khẩu: ' + (e.message || 'Lỗi không xác định'));
            }
        }
    };

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-gray-700">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Tài khoản của bạn</h2>
                    <p className="text-gray-500 dark:text-gray-400 text-sm">Quản lý thông tin cá nhân và bảo mật</p>
                </div>
                <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                    <Users className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm space-y-4">
                    <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100">Thông tin cá nhân</h3>
                    <div className="space-y-3">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Email</label>
                            <input
                                type="email"
                                value={auth?.currentUser?.email || ''}
                                readOnly
                                className="w-full px-4 py-2.5 bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm text-gray-500 dark:text-gray-400 cursor-not-allowed"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Tên hiển thị</label>
                            <input
                                type="text"
                                value={newDisplayName}
                                onChange={(e) => setNewDisplayName(e.target.value)}
                                className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900/50 focus:border-indigo-500 dark:focus:border-indigo-500 text-sm outline-none text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
                                placeholder="Tên sẽ hiển thị trong app"
                            />
                        </div>
                        <button
                            type="button"
                            onClick={handleSaveProfile}
                            className="inline-flex items-center px-4 py-2 text-sm font-semibold rounded-xl bg-indigo-600 dark:bg-indigo-500 text-white hover:bg-indigo-700 dark:hover:bg-indigo-600 shadow-sm transition-colors"
                        >
                            <Save className="w-4 h-4 mr-1" /> Lưu thay đổi
                        </button>
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm space-y-4">
                    <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                        <Lock className="w-5 h-5 text-rose-500 dark:text-rose-400" /> Bảo mật & mật khẩu
                    </h3>
                    <div className="space-y-3">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Mật khẩu hiện tại</label>
                            <div className="relative">
                                <input
                                    type={showCurrent ? 'text' : 'password'}
                                    value={currentPassword}
                                    onChange={(e) => setCurrentPassword(e.target.value)}
                                    className="w-full px-4 py-2.5 pr-10 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900/50 focus:border-indigo-500 dark:focus:border-indigo-500 text-sm outline-none text-gray-900 dark:text-gray-100"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowCurrent(!showCurrent)}
                                    className="absolute inset-y-0 right-2 px-2 flex items-center text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
                                    tabIndex={-1}
                                >
                                    {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Mật khẩu mới</label>
                            <div className="relative">
                                <input
                                    type={showNew ? 'text' : 'password'}
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    className="w-full px-4 py-2.5 pr-10 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900/50 focus:border-indigo-500 dark:focus:border-indigo-500 text-sm outline-none text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
                                    placeholder="Tối thiểu 6 ký tự"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowNew(!showNew)}
                                    className="absolute inset-y-0 right-2 px-2 flex items-center text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
                                    tabIndex={-1}
                                >
                                    {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Xác nhận mật khẩu mới</label>
                            <div className="relative">
                                <input
                                    type={showConfirmNew ? 'text' : 'password'}
                                    value={confirmNewPassword}
                                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                                    className="w-full px-4 py-2.5 pr-10 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900/50 focus:border-indigo-500 dark:focus:border-indigo-500 text-sm outline-none text-gray-900 dark:text-gray-100"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowConfirmNew(!showConfirmNew)}
                                    className="absolute inset-y-0 right-2 px-2 flex items-center text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
                                    tabIndex={-1}
                                >
                                    {showConfirmNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={handleChangePassword}
                            className="inline-flex items-center px-4 py-2 text-sm font-semibold rounded-xl bg-rose-500 dark:bg-rose-600 text-white hover:bg-rose-600 dark:hover:bg-rose-700 shadow-sm transition-colors"
                        >
                            <Save className="w-4 h-4 mr-1" /> Đổi mật khẩu
                        </button>
                    </div>
                    {error && (
                        <div className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 border border-red-100 dark:border-red-800 rounded-xl px-3 py-2 mt-1">
                            {error}
                        </div>
                    )}
                    {message && (
                        <div className="text-xs text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-100 dark:border-emerald-800 rounded-xl px-3 py-2 mt-1">
                            {message}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AccountScreen;
