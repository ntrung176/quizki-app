import React, { useState, useEffect } from 'react';
import {
    Users, Shield, BookOpen, Languages, CreditCard, UserX,
    ShieldCheck, Trash2, Loader2, Mail, Copy, Check, Zap, Clock, Sparkles, Crown, Edit2
} from 'lucide-react';
import { extractUserLastActive, isUserOnline, formatLastActive } from '../../utils/userActivityHelper';
import { setSingleUserAiCredits } from '../../utils/resetUserAiCredits';

const AdminUserDetailPanel = ({
    selectedUser,
    selectedUserProfile,
    loadingProfile,
    selectedUserPackageState,
    setSelectedUserPackageState,
    handleSaveUserPackage,
    updatingUserPackage,
    kanjiStats,
    getUserPlans,
    formatVND,
    currentUserId,
    adminConfig,
    handleToggleModerator,
    savingConfig,
    setDeleteType,
    setConfirmDelete,
    onSingleUserCreditsUpdated,
    setNotification
}) => {
    const [copiedUid, setCopiedUid] = useState(false);
    const [editingCredits, setEditingCredits] = useState(false);
    const [creditDraft, setCreditDraft] = useState('');
    const [savingCredits, setSavingCredits] = useState(false);

    useEffect(() => {
        setEditingCredits(false);
    }, [selectedUser?.userId]);

    if (!selectedUser) {
        return (
            <div className="bg-white dark:bg-slate-900 rounded-3xl border-2 border-slate-200 dark:border-slate-700/80 p-8 text-center shadow-sm">
                <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 flex items-center justify-center mx-auto mb-4 text-slate-400">
                    <Users className="w-8 h-8" />
                </div>
                <p className="text-sm font-extrabold text-slate-700 dark:text-slate-200">
                    Chọn một người dùng để xem chi tiết
                </p>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                    Xem thông tin, gói cước, thống kê học tập hoặc cấp quyền quản trị viên (QTV).
                </p>
            </div>
        );
    }

    const isSelf = selectedUser.userId === currentUserId;
    const isMod = Boolean(adminConfig?.moderators?.includes(selectedUser.userId));
    const displayEmail = selectedUserProfile?.email || selectedUser.email || '';
    const lastActiveMs = extractUserLastActive(selectedUser);
    const online = isUserOnline(lastActiveMs);
    const userPlans = getUserPlans(selectedUser.userId);
    const aiCredits = selectedUserProfile?.aiCreditsRemaining ?? selectedUser.aiCreditsRemaining ?? 0;
    const xpValue = Number(selectedUser.xp ?? selectedUser.score ?? 0);

    const handleCopyUid = async () => {
        if (!selectedUser.userId) return;
        try {
            await navigator.clipboard.writeText(selectedUser.userId);
            setCopiedUid(true);
            setTimeout(() => setCopiedUid(false), 1800);
        } catch (_) {
            // Fallback silent
        }
    };

    const exp = selectedUserProfile?.premiumExpiresAt || selectedUser?.premiumExpiresAt;
    const expiryTime = exp ? (exp.toDate ? exp.toDate().getTime() : Number(exp || 0)) : 0;
    const isExpired = Boolean(expiryTime && expiryTime < Date.now());
    const dateStr = expiryTime ? new Date(expiryTime).toLocaleDateString('vi-VN') : '';

    return (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border-2 border-slate-200 dark:border-slate-700/80 p-5 space-y-4 shadow-sm">
            {/* Header Info */}
            <div className="flex items-start gap-3.5 pb-4 border-b-2 border-slate-100 dark:border-slate-800">
                <div className="relative shrink-0">
                    <div
                        className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white font-black text-lg border-b-4 shadow-sm ${
                            isSelf
                                ? 'bg-sky-500 border-sky-700'
                                : isMod
                                    ? 'bg-amber-500 border-amber-700'
                                    : 'bg-emerald-500 border-emerald-700'
                        }`}
                    >
                        {(selectedUser.displayName || displayEmail || '?')[0].toUpperCase()}
                    </div>
                    {online && (
                        <span
                            className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-900"
                            title="Đang trực tuyến"
                        />
                    )}
                </div>

                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                        <h3 className="font-black text-base text-slate-900 dark:text-white truncate">
                            {selectedUser.displayName || 'Chưa đặt tên'}
                        </h3>
                        {isSelf && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-sky-100 dark:bg-sky-950/70 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
                                Admin
                            </span>
                        )}
                        {isMod && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-100 dark:bg-amber-950/70 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 flex items-center gap-0.5">
                                <Crown className="w-3 h-3" /> QTV
                            </span>
                        )}
                    </div>

                    <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mt-1 min-w-0">
                        <Mail className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                        <span className="truncate">{displayEmail || 'Chưa cập nhật email'}</span>
                    </div>

                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                        <button
                            type="button"
                            onClick={handleCopyUid}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-[11px] font-mono font-bold text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
                            title="Sao chép UID"
                        >
                            <span>UID: {selectedUser.userId?.slice(0, 14)}...</span>
                            {copiedUid ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3 text-slate-400" />}
                        </button>

                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-xl text-[10px] font-bold ${
                            online
                                ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                        }`}>
                            <Clock className="w-3 h-3" />
                            {online ? 'Đang online' : formatLastActive(lastActiveMs, 'Chưa rõ')}
                        </span>
                    </div>
                </div>
            </div>

            {/* Quick Engagement Row */}
            <div className="grid grid-cols-2 gap-2.5">
                <div className="p-3 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border-2 border-amber-200/80 dark:border-amber-800/60 flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0">
                        <Zap className="w-4 h-4" />
                    </div>
                    <div>
                        <p className="text-sm font-black text-amber-700 dark:text-amber-300 leading-none">{xpValue.toLocaleString()}</p>
                        <p className="text-[10px] font-bold text-amber-600/80 dark:text-amber-400/80 uppercase mt-1">Điểm XP</p>
                    </div>
                </div>
                <div className={`p-3 rounded-2xl border-2 flex items-center gap-2.5 ${
                    Number(aiCredits) > 5000
                        ? 'bg-rose-50/80 dark:bg-rose-950/30 border-rose-300 dark:border-rose-800'
                        : 'bg-sky-50/70 dark:bg-sky-950/30 border-sky-200/80 dark:border-sky-800/60'
                }`}>
                    <div className={`w-8 h-8 rounded-xl text-white flex items-center justify-center shrink-0 ${
                        Number(aiCredits) > 5000 ? 'bg-rose-500' : 'bg-sky-500'
                    }`}>
                        <Sparkles className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                        {editingCredits ? (
                            <div className="flex items-center gap-1">
                                <input
                                    type="number"
                                    min={0}
                                    value={creditDraft}
                                    onChange={(e) => setCreditDraft(e.target.value)}
                                    className="w-20 px-1.5 py-0.5 text-xs font-black bg-white dark:bg-slate-900 border border-sky-400 rounded-lg outline-none text-slate-900 dark:text-white"
                                />
                                <button
                                    type="button"
                                    disabled={savingCredits}
                                    onClick={async () => {
                                        setSavingCredits(true);
                                        try {
                                            const nextVal = await setSingleUserAiCredits(selectedUser.userId, creditDraft);
                                            if (onSingleUserCreditsUpdated) {
                                                onSingleUserCreditsUpdated(selectedUser.userId, nextVal);
                                            }
                                            if (setNotification) {
                                                setNotification({ type: 'success', message: `Đã cập nhật Credit AI cho ${selectedUser.displayName || displayEmail} thành ${nextVal.toLocaleString()}.` });
                                            }
                                            setEditingCredits(false);
                                        } catch (err) {
                                            if (setNotification) {
                                                setNotification({ type: 'error', message: err?.message || 'Lỗi cập nhật Credit AI' });
                                            }
                                        } finally {
                                            setSavingCredits(false);
                                        }
                                    }}
                                    className="px-2 py-0.5 rounded-lg bg-emerald-500 text-white text-[10px] font-black cursor-pointer"
                                >
                                    {savingCredits ? '...' : 'Lưu'}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setEditingCredits(false)}
                                    className="px-1.5 py-0.5 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-[10px] font-bold cursor-pointer"
                                >
                                    Hủy
                                </button>
                            </div>
                        ) : (
                            <div className="flex items-center justify-between gap-1">
                                <div className="min-w-0">
                                    <p className={`text-sm font-black leading-none truncate ${
                                        Number(aiCredits) > 5000 ? 'text-rose-600 dark:text-rose-300' : 'text-sky-700 dark:text-sky-300'
                                    }`}>
                                        {Number(aiCredits).toLocaleString()}
                                    </p>
                                    <p className={`text-[10px] font-bold uppercase mt-1 ${
                                        Number(aiCredits) > 5000 ? 'text-rose-500' : 'text-sky-600/80 dark:text-sky-400/80'
                                    }`}>
                                        {Number(aiCredits) > 5000 ? '⚠️ Lượt AI bất thường' : 'Lượt AI'}
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setCreditDraft(String(Number(aiCredits) || 0));
                                        setEditingCredits(true);
                                    }}
                                    className="p-1.5 rounded-lg bg-white/80 dark:bg-slate-800 hover:bg-white text-slate-500 hover:text-sky-600 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer shrink-0"
                                    title="Chỉnh sửa Credit AI của người dùng này"
                                >
                                    <Edit2 className="w-3 h-3" />
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Account & Package Management */}
            <div className="space-y-2.5">
                <h4 className="text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5 text-emerald-500" /> Gói cước & Thời hạn
                </h4>

                {loadingProfile ? (
                    <div className="p-4 bg-slate-50 dark:bg-slate-800/70 rounded-2xl border-2 border-slate-100 dark:border-slate-800 text-center">
                        <Loader2 className="w-4 h-4 animate-spin mx-auto text-emerald-500" />
                    </div>
                ) : (
                    <div className="space-y-2.5">
                        <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border-2 border-slate-200/80 dark:border-slate-700/70 flex items-center justify-between gap-2">
                            <div className="min-w-0">
                                <p className="text-[10px] text-slate-400 uppercase font-black tracking-wider">Gói hiện tại</p>
                                <p className="text-sm font-extrabold text-slate-800 dark:text-white mt-0.5 truncate">
                                    {selectedUserPackageState === 'premium_3y' ? '👑 Premium 3 Năm' :
                                        selectedUserPackageState === 'premium_1y' ? '👑 Premium 1 Năm' :
                                            selectedUserPackageState === 'premium_1m' ? '👑 Premium 1 Tháng' :
                                                selectedUserPackageState === 'premium' ? '👑 Premium' :
                                                    'Gói Miễn Phí'}
                                </p>
                                {dateStr && (
                                    <p className={`text-[11px] font-bold mt-0.5 ${isExpired ? 'text-rose-500' : 'text-amber-600 dark:text-amber-400'}`}>
                                        {isExpired ? `Đã hết hạn ngày ${dateStr}` : `Hạn dùng đến ${dateStr}`}
                                    </p>
                                )}
                            </div>
                            <span className={`px-3 py-1 rounded-full text-[11px] font-black shrink-0 ${
                                selectedUserPackageState !== 'free'
                                    ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-700'
                                    : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                            }`}>
                                {selectedUserPackageState !== 'free' ? 'PREMIUM' : 'FREE'}
                            </span>
                        </div>

                        <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border-2 border-slate-200/80 dark:border-slate-700/70 space-y-2.5">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                                Cấp / thay đổi gói cước
                            </label>
                            <select
                                value={selectedUserPackageState}
                                onChange={(e) => setSelectedUserPackageState(e.target.value)}
                                className="w-full px-3 py-2.5 bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-white focus:border-emerald-500 outline-none"
                            >
                                <option value="free">Gói Miễn Phí (Mặc định)</option>
                                <option value="premium_1m">👑 Gói Premium 1 Tháng</option>
                                <option value="premium_1y">👑 Gói Premium 1 Năm</option>
                                <option value="premium_3y">👑 Gói Premium 3 Năm</option>
                            </select>
                            <button
                                type="button"
                                onClick={handleSaveUserPackage}
                                disabled={updatingUserPackage}
                                className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-600 border-b-4 border-emerald-700 active:translate-y-0.5 active:border-b-2 text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
                            >
                                {updatingUserPackage && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                                Cập nhật gói cước
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Study Progress */}
            <div className="grid grid-cols-2 gap-3">
                <div>
                    <h4 className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                        <BookOpen className="w-3.5 h-3.5 text-sky-500" /> Từ vựng
                    </h4>
                    <div className="grid grid-cols-2 gap-2">
                        <div className="p-2.5 bg-slate-50 dark:bg-slate-800/70 rounded-xl border border-slate-200/80 dark:border-slate-700/70">
                            <p className="text-base font-black text-slate-800 dark:text-white">{selectedUser.totalCards || 0}</p>
                            <p className="text-[10px] font-bold text-slate-400">Thẻ</p>
                        </div>
                        <div className="p-2.5 bg-slate-50 dark:bg-slate-800/70 rounded-xl border border-slate-200/80 dark:border-slate-700/70">
                            <p className="text-base font-black text-emerald-600 dark:text-emerald-400">{selectedUser.masteredCount || 0}</p>
                            <p className="text-[10px] font-bold text-slate-400">Đã thuộc</p>
                        </div>
                    </div>
                </div>

                <div>
                    <h4 className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                        <Languages className="w-3.5 h-3.5 text-amber-500" /> Kanji SRS
                    </h4>
                    {kanjiStats ? (
                        <div className="grid grid-cols-3 gap-1.5">
                            <div className="p-2 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl border border-emerald-200/70 dark:border-emerald-800/60 text-center">
                                <p className="text-sm font-black text-emerald-600 dark:text-emerald-400">{kanjiStats.total}</p>
                                <p className="text-[9px] font-bold text-slate-500">Tổng</p>
                            </div>
                            <div className="p-2 bg-amber-50 dark:bg-amber-950/30 rounded-xl border border-amber-200/70 dark:border-amber-800/60 text-center">
                                <p className="text-sm font-black text-amber-600 dark:text-amber-400">{kanjiStats.learning}</p>
                                <p className="text-[9px] font-bold text-slate-500">Học</p>
                            </div>
                            <div className="p-2 bg-cyan-50 dark:bg-cyan-950/30 rounded-xl border border-cyan-200/70 dark:border-cyan-800/60 text-center">
                                <p className="text-sm font-black text-cyan-600 dark:text-cyan-400">{kanjiStats.mastered}</p>
                                <p className="text-[9px] font-bold text-slate-500">Thuộc</p>
                            </div>
                        </div>
                    ) : (
                        <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl text-center">
                            <Loader2 className="w-4 h-4 animate-spin mx-auto text-slate-400" />
                        </div>
                    )}
                </div>
            </div>

            {/* Purchased Plans */}
            <div>
                <h4 className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <CreditCard className="w-3.5 h-3.5 text-emerald-500" /> Lịch sử giao dịch
                </h4>
                {userPlans.length === 0 ? (
                    <p className="text-xs text-slate-400 italic p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 text-center">
                        Chưa có giao dịch mua gói nào
                    </p>
                ) : (
                    <div className="space-y-2">
                        <div className="p-2.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/70 rounded-xl flex items-center justify-between">
                            <span className="text-xs text-amber-700 dark:text-amber-300 font-bold">
                                Tổng chi tiêu ({userPlans.length} lần)
                            </span>
                            <span className="text-sm font-black text-amber-600 dark:text-amber-400">
                                {formatVND(userPlans.reduce((sum, r) => sum + (r.amount || 0), 0))}
                            </span>
                        </div>
                        <div className="max-h-[140px] overflow-y-auto space-y-1.5 pr-1">
                            {userPlans.map((r, idx) => (
                                <div key={r.id || idx} className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60 rounded-xl text-xs">
                                    <div className="min-w-0 pr-2">
                                        <span className="font-bold text-slate-700 dark:text-slate-200 truncate block">{r.packageName || r.packageId}</span>
                                    </div>
                                    <div className="text-right shrink-0">
                                        <span className="font-extrabold text-emerald-600 dark:text-emerald-400">{formatVND(r.amount || 0)}</span>
                                        {r.processedAt && (
                                            <p className="text-[10px] text-slate-400">
                                                {(r.processedAt?.toDate ? r.processedAt.toDate() : new Date(r.processedAt)).toLocaleDateString('vi-VN')}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Admin Actions: Role & Cleanup */}
            {!isSelf && (
                <div className="pt-3 border-t-2 border-slate-100 dark:border-slate-800 space-y-2">
                    <button
                        type="button"
                        onClick={() => handleToggleModerator(selectedUser.userId, selectedUser.displayName)}
                        disabled={savingConfig}
                        className={`w-full px-3.5 py-2.5 text-xs font-black uppercase tracking-wider rounded-xl border-2 border-b-4 active:translate-y-0.5 active:border-b-2 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 ${
                            isMod
                                ? 'text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-700 hover:bg-amber-100 dark:hover:bg-amber-950/60'
                                : 'text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-700 hover:bg-emerald-100 dark:hover:bg-emerald-950/60'
                        }`}
                    >
                        {isMod
                            ? <><UserX className="w-4 h-4" /> Gỡ quyền Quản trị viên (QTV)</>
                            : <><ShieldCheck className="w-4 h-4" /> Cấp quyền Quản trị viên (QTV)</>
                        }
                    </button>

                    <div className="grid grid-cols-2 gap-2">
                        <button
                            type="button"
                            onClick={() => { setDeleteType('kanji'); setConfirmDelete(selectedUser); }}
                            className="px-3 py-2 text-xs font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 hover:bg-amber-100 dark:hover:bg-amber-950/50 rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                            <Languages className="w-3.5 h-3.5" /> Xóa Kanji SRS
                        </button>
                        <button
                            type="button"
                            onClick={() => { setDeleteType('all'); setConfirmDelete(selectedUser); }}
                            className="px-3 py-2 text-xs font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 hover:bg-rose-100 dark:hover:bg-rose-950/50 rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                            <Trash2 className="w-3.5 h-3.5" /> Xóa tài khoản
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminUserDetailPanel;
