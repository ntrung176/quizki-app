import React, { useState, useEffect } from 'react';
import { X, UserPlus, Loader2, Crown } from 'lucide-react';

/**
 * Modal cho phép Admin đồng bộ tài khoản từ Firebase Auth (qua Email & User UID)
 * kể cả khi người dùng đăng ký bằng Email/Password nhưng chưa bấm link xác nhận.
 */
const AdminSyncUserModal = ({ isOpen, initialQuery = '', onClose, onSync }) => {
    const [uid, setUid] = useState('');
    const [email, setEmail] = useState('');
    const [displayName, setDisplayName] = useState('');
    const [packageId, setPackageId] = useState('');
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (!isOpen) return;
        const trimmed = (initialQuery || '').trim();
        if (trimmed.includes('@')) {
            setEmail(trimmed);
            setUid('');
        } else if (trimmed) {
            setUid(trimmed);
            setEmail('');
        } else {
            setUid('');
            setEmail('');
        }
        setDisplayName('');
        setPackageId('');
    }, [isOpen, initialQuery]);

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!uid.trim() && !email.trim()) return;
        setSubmitting(true);
        try {
            const res = await onSync({
                uid: uid.trim(),
                email: email.trim(),
                displayName: displayName.trim(),
                packageId
            });
            if (res && !res.needsUid) {
                onClose();
            }
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4" onClick={onClose}>
            <div
                className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl border-2 border-slate-200 dark:border-slate-700 shadow-2xl overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="px-5 py-4 border-b-2 border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-emerald-500 border-b-2 border-emerald-700 text-white flex items-center justify-center">
                            <UserPlus className="w-4 h-4" />
                        </div>
                        <div>
                            <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                                Đồng bộ & Kích hoạt User từ Firebase
                            </h3>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                Hỗ trợ user đăng ký Email chưa xác thực hoặc mới đăng nhập
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-5 space-y-3.5">
                    <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-[11px] text-amber-800 dark:text-amber-200 leading-relaxed">
                        Nếu tài khoản chưa có trong danh sách Admin, hãy copy cột <strong>User UID</strong> và <strong>Identifier (Email)</strong> trong Firebase Authentication để tạo hồ sơ & kích hoạt Premium ngay.
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                            Email người dùng
                        </label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="vd: anhdaylc181028@gmail.com"
                            className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-emerald-500 text-slate-900 dark:text-white"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                            User UID (bắt buộc nếu user chưa từng đồng bộ Firestore)
                        </label>
                        <input
                            type="text"
                            value={uid}
                            onChange={(e) => setUid(e.target.value)}
                            placeholder="vd: Ue1uobU2TYWwWiRDY1E3E7T..."
                            className="w-full px-3 py-2 text-sm font-mono bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-emerald-500 text-slate-900 dark:text-white"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                            Tên hiển thị (tuỳ chọn)
                        </label>
                        <input
                            type="text"
                            value={displayName}
                            onChange={(e) => setDisplayName(e.target.value)}
                            placeholder="Mặc định lấy theo phần trước @ của Email"
                            className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-emerald-500 text-slate-900 dark:text-white"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                            <Crown className="w-3.5 h-3.5 text-amber-500" /> Kích hoạt gói ngay (tuỳ chọn)
                        </label>
                        <select
                            value={packageId}
                            onChange={(e) => setPackageId(e.target.value)}
                            className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-emerald-500 text-slate-900 dark:text-white font-semibold"
                        >
                            <option value="">Chỉ đồng bộ (giữ nguyên gói hiện tại)</option>
                            <option value="premium_1m">👑 Kích hoạt Premium 1 Tháng</option>
                            <option value="premium_1y">👑 Kích hoạt Premium 1 Năm</option>
                            <option value="premium_3y">👑 Kích hoạt Premium 3 Năm</option>
                        </select>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl cursor-pointer"
                        >
                            Huỷ
                        </button>
                        <button
                            type="submit"
                            disabled={submitting || (!uid.trim() && !email.trim())}
                            className="px-4 py-2 text-xs font-extrabold bg-emerald-500 hover:bg-emerald-600 border-b-4 border-emerald-700 active:translate-y-0.5 active:border-b-2 disabled:opacity-50 text-white rounded-xl flex items-center gap-1.5 cursor-pointer transition-all"
                        >
                            {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                            <span>Đồng bộ & Lưu vào Admin</span>
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AdminSyncUserModal;
