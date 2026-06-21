import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db, auth } from '../../config/firebase';
import { Users, Save, Lock, Eye, EyeOff, Crown, Gift, Copy, Check, Award, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '../../router';

const AccountScreen = ({ profile, onUpdateProfileName, onChangePassword, onBack, publicStatsPath, currentUserId }) => {
    const navigate = useNavigate();
    const isPremiumUser = (profile?.unlockedSpecializedPackages && (
        profile.unlockedSpecializedPackages.includes('premium') ||
        profile.unlockedSpecializedPackages.includes('premium_1m') ||
        profile.unlockedSpecializedPackages.includes('premium_1y') ||
        profile.unlockedSpecializedPackages.includes('premium_3y') ||
        profile.unlockedSpecializedPackages.includes('vocab_zen') ||
        profile.unlockedSpecializedPackages.includes('grammar_zen') ||
        profile.unlockedSpecializedPackages.includes('kanji_zen') ||
        profile.unlockedSpecializedPackages.includes('jlpt_prep')
    )) || false;

    const [newDisplayName, setNewDisplayName] = useState(profile.displayName || '');
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmNewPassword, setConfirmNewPassword] = useState('');
    const [showCurrent, setShowCurrent] = useState(false);
    const [showNew, setShowNew] = useState(false);
    const [showConfirmNew, setShowConfirmNew] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    // Referral States
    const [refStats, setRefStats] = useState({ totalInvited: 0, premiumInvited: 0, friends: [] });
    const [loadingStats, setLoadingStats] = useState(true);
    const [enteredCode, setEnteredCode] = useState('');
    const [submitLoading, setSubmitLoading] = useState(false);
    const [successMsg, setSuccessMsg] = useState('');
    const [errorMsg, setErrorMsg] = useState('');
    const [copied, setCopied] = useState(false);

    // Fetch Referral Stats
    useEffect(() => {
        if (!currentUserId) return;
        const fetchStats = async () => {
            try {
                const { getReferralStats } = await import('../../utils/referralService');
                const stats = await getReferralStats(currentUserId);
                setRefStats(stats);
            } catch (e) {
                console.error('Lỗi tải thống kê giới thiệu:', e);
            } finally {
                setLoadingStats(false);
            }
        };
        fetchStats();
    }, [currentUserId]);

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

    const handleCopyCode = () => {
        if (!profile?.referralCode) return;
        const refLink = `${window.location.origin}/?ref=${profile.referralCode}`;
        navigator.clipboard.writeText(refLink);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleApplyReferral = async () => {
        setErrorMsg('');
        setSuccessMsg('');
        if (!enteredCode.trim()) return;
        setSubmitLoading(true);
        try {
            const { submitReferralCode } = await import('../../utils/referralService');
            const res = await submitReferralCode(currentUserId, profile?.displayName, enteredCode);
            if (res.success) {
                setSuccessMsg(`Nhập mã giới thiệu thành công! Bạn đã được nhận ngay 15 ngày dùng thử Premium miễn phí.`);
                setEnteredCode('');
                // Fetch stats again
                const { getReferralStats } = await import('../../utils/referralService');
                const stats = await getReferralStats(currentUserId);
                setRefStats(stats);
            } else {
                setErrorMsg(res.error || 'Có lỗi xảy ra.');
            }
        } catch (e) {
            setErrorMsg(e.message || 'Lỗi kết nối khi gửi mã.');
        } finally {
            setSubmitLoading(false);
        }
    };

    return (
        <div className="space-y-8 pb-12">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-gray-700">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Tài khoản của bạn</h2>
                    <p className="text-gray-500 dark:text-gray-400 text-sm">Quản lý thông tin cá nhân và bảo mật</p>
                </div>
                <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                    <Users className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                </div>
            </div>

            {/* Subscription Box */}
            <div className="bg-slate-50 dark:bg-slate-900/40 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                    <h3 className="text-sm font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Gói học tập của bạn</h3>
                    {profile?.isPremiumUnlocked ? (
                        <div className="flex flex-wrap items-center gap-2 mt-1">
                            <span className="bg-gradient-to-r from-amber-500 to-yellow-500 text-white text-[10px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider flex items-center gap-1 shadow-sm">
                                <Crown className="w-3 h-3 fill-white text-white" /> PREMIUM HOẠT ĐỘNG
                            </span>
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                                Thời hạn đến: <span className="font-bold text-indigo-650 dark:text-indigo-400">
                                    {profile.premiumExpiresAt ? (
                                        (() => {
                                            const date = profile.premiumExpiresAt.toDate ? profile.premiumExpiresAt.toDate() : new Date(profile.premiumExpiresAt);
                                            return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
                                        })()
                                    ) : 'Vĩnh viễn'}
                                </span>
                            </span>
                        </div>
                    ) : (
                        <div className="flex flex-wrap items-center gap-2 mt-1">
                            <span className="bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-[10px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider">
                                THÀNH VIÊN FREE
                            </span>
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                                Đang sử dụng các tính năng cơ bản
                            </span>
                        </div>
                    )}
                </div>
                {!profile?.isPremiumUnlocked && (
                    <button
                        onClick={() => navigate(ROUTES.UPGRADE)}
                        className="px-4 py-2 text-xs font-bold bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl shadow transition-all hover:scale-[1.02] cursor-pointer"
                    >
                        Nâng cấp ngay
                    </button>
                )}
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
                            className="inline-flex items-center px-4 py-2 text-sm font-semibold rounded-xl bg-indigo-600 dark:bg-indigo-50 text-white hover:bg-indigo-700 dark:hover:bg-indigo-600 shadow-sm transition-colors"
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

            {/* ==================== REFERRAL SECTION ==================== */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm space-y-6">
                <div className="flex items-center gap-3 pb-4 border-b border-gray-150/50 dark:border-gray-700">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-500 to-indigo-500 flex items-center justify-center text-white shadow-md shadow-indigo-100 dark:shadow-none">
                        <Gift className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 flex items-center gap-1.5">
                            Giới thiệu bạn bè & Nhận quà lũy tiến
                            <span className="bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                                hot
                            </span>
                        </h3>
                        <p className="text-gray-500 dark:text-slate-400 text-xs mt-0.5">
                            Chia sẻ link giới thiệu của bạn cho bạn bè. Bạn bè nhận ngay 15 ngày Premium dùng thử khi đăng ký, và bạn sẽ nhận thêm ngày Premium lũy tiến khi họ nâng cấp gói Premium!
                        </p>
                    </div>
                </div>

                {!isPremiumUser && (
                    <div className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20 rounded-2xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center text-white shadow-md shadow-orange-100 dark:shadow-none flex-shrink-0">
                                <Crown className="w-6 h-6 text-white fill-white/10" />
                            </div>
                            <div>
                                <h4 className="text-sm font-extrabold text-gray-900 dark:text-white">Tài khoản của bạn chưa nâng cấp Premium</h4>
                                <p className="text-gray-500 dark:text-slate-450 text-xs mt-0.5 leading-relaxed">
                                    Nâng cấp gói Premium ngay hôm nay để học không giới hạn, hoặc **chia sẻ link giới thiệu bên dưới** cho bạn bè để nhận ngày Premium tích lũy!
                                </p>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={() => navigate(ROUTES.UPGRADE)}
                            className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white text-xs font-bold rounded-xl hover:shadow-md hover:scale-[1.02] transition-all flex items-center gap-1.5 shadow-sm shadow-amber-100 dark:shadow-none whitespace-nowrap cursor-pointer"
                        >
                            <Sparkles className="w-3.5 h-3.5" /> Nâng cấp Premium
                        </button>
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Panel 1: Share Link */}
                    <div className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-slate-900/40 dark:to-slate-800/40 p-5 rounded-2xl border border-indigo-100/40 dark:border-slate-800 flex flex-col justify-between space-y-4">
                        <div>
                            <h4 className="text-xs font-bold text-indigo-700 dark:text-indigo-400 uppercase tracking-wider mb-2">Link giới thiệu của bạn</h4>
                            <p className="text-gray-500 dark:text-slate-450 text-[11px] leading-relaxed">
                                Sao chép link này gửi cho bạn bè. Khi họ click link đăng ký tài khoản, hệ thống sẽ tự động kích hoạt **15 ngày Premium dùng thử miễn phí**!
                            </p>
                        </div>
                        <div className="space-y-2">
                            <div className="w-full flex items-center justify-between bg-white dark:bg-slate-850 px-3 py-2 rounded-xl border border-indigo-150/40 dark:border-slate-700 font-mono text-xs font-semibold text-indigo-650 dark:text-indigo-400 shadow-sm relative overflow-hidden break-all select-all">
                                <span>{profile?.referralCode ? `${window.location.origin}/?ref=${profile.referralCode}` : 'ĐANG KHỞI TẠO...'}</span>
                                <button
                                    type="button"
                                    onClick={handleCopyCode}
                                    className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-gray-500 hover:text-indigo-600 transition-colors flex-shrink-0 ml-1"
                                    title="Copy link giới thiệu"
                                >
                                    {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                                </button>
                            </div>
                            {copied && <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 text-center">✓ Đã copy link vào Clipboard!</p>}
                        </div>
                    </div>

                    {/* Panel 2: Enter code */}
                    <div className="p-5 rounded-2xl border border-gray-150/50 dark:border-gray-700 bg-gray-50/20 dark:bg-slate-900/10 flex flex-col justify-between space-y-4">
                        <div>
                            <h4 className="text-xs font-bold text-gray-700 dark:text-slate-350 uppercase tracking-wider mb-2">Nhập mã giới thiệu của bạn bè</h4>
                            <p className="text-gray-500 dark:text-slate-450 text-[11px] leading-relaxed">
                                Nếu link giới thiệu không tự động nhận diện, bạn có thể nhập thủ công mã giới thiệu của bạn bè tại đây để nhận **15 ngày Premium** dùng thử.
                            </p>
                        </div>

                        {profile?.referredBy ? (
                            <div className="bg-emerald-50/50 dark:bg-emerald-950/10 border border-emerald-100/50 dark:border-emerald-900/40 px-4 py-3 rounded-xl flex items-center gap-2.5">
                                <div className="w-7 h-7 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-600">
                                    <Check className="w-4 h-4" />
                                </div>
                                <div className="text-xs">
                                    <p className="font-semibold text-emerald-800 dark:text-emerald-450">Đã nhập mã giới thiệu</p>
                                    <p className="text-gray-500 dark:text-slate-400 text-[10px]">Bởi: <span className="font-bold">{profile.referredBy.name}</span></p>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        placeholder="Nhập mã ví dụ: QKXXXXXX"
                                        value={enteredCode}
                                        onChange={(e) => setEnteredCode(e.target.value.toUpperCase())}
                                        className="flex-1 px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-650 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-900/40 text-gray-900 dark:text-white font-mono uppercase"
                                    />
                                    <button
                                        type="button"
                                        onClick={handleApplyReferral}
                                        disabled={submitLoading || !enteredCode.trim()}
                                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow cursor-pointer transition-all flex items-center justify-center"
                                    >
                                        {submitLoading ? '...' : 'Gửi'}
                                    </button>
                                </div>
                                {errorMsg && <p className="text-[10px] text-red-500 dark:text-red-400 font-medium">{errorMsg}</p>}
                                {successMsg && <p className="text-[10px] text-emerald-600 dark:text-emerald-450 font-medium">{successMsg}</p>}
                            </div>
                        )}
                    </div>

                    {/* Panel 3: Stats Summary */}
                    <div className="p-5 rounded-2xl border border-gray-150/50 dark:border-gray-700 bg-gray-50/20 dark:bg-slate-900/10 flex flex-col justify-between">
                        <div>
                            <h4 className="text-xs font-bold text-gray-700 dark:text-slate-350 uppercase tracking-wider mb-2.5">Thống kê giới thiệu của bạn</h4>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="bg-white dark:bg-slate-800 p-3 rounded-xl border border-gray-100 dark:border-slate-700 text-center">
                                    <span className="text-[10px] text-gray-400 uppercase font-bold block mb-0.5">Số lượt mời</span>
                                    <span className="text-xl font-extrabold text-gray-800 dark:text-white">{loadingStats ? '...' : refStats.totalInvited}</span>
                                </div>
                                <div className="bg-white dark:bg-slate-800 p-3 rounded-xl border border-gray-100 dark:border-slate-700 text-center">
                                    <span className="text-[10px] text-amber-500 uppercase font-bold block mb-0.5">Lên Premium</span>
                                    <span className="text-xl font-extrabold text-amber-600 dark:text-amber-400 flex items-center justify-center gap-0.5">
                                        <Crown className="w-4 h-4 fill-amber-500/20 text-amber-500" />
                                        {loadingStats ? '...' : refStats.premiumInvited}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="mt-4 pt-3 border-t border-gray-100 dark:border-slate-750 text-[10px] text-gray-500 dark:text-slate-400 flex items-center justify-between">
                            <span>Thành viên Free đã mời:</span>
                            <span className="font-bold text-gray-800 dark:text-slate-300">
                                {loadingStats ? '...' : refStats.totalInvited - refStats.premiumInvited} người
                            </span>
                        </div>
                    </div>
                </div>

                {/* Progressive Reward Map */}
                <div className="border border-indigo-50/80 dark:border-slate-750 bg-indigo-50/10 dark:bg-slate-900/10 rounded-2xl p-5 space-y-4">
                    <div className="flex items-center gap-1.5">
                        <Award className="w-4 h-4 text-purple-600" />
                        <h4 className="text-xs font-bold text-gray-800 dark:text-slate-200">
                            Bản đồ phần thưởng Premium lũy tiến (Khi bạn bè nâng cấp Premium)
                        </h4>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 relative z-10">
                        {[
                            { step: 1, label: 'Bạn thứ 1', bonus: '+15 ngày' },
                            { step: 2, label: 'Bạn thứ 2', bonus: '+30 ngày' },
                            { step: 3, label: 'Bạn thứ 3', bonus: '+45 ngày' },
                            { step: 4, label: 'Bạn thứ 4+', bonus: '+60 ngày/bạn' }
                        ].map((milestone) => {
                            const isAchieved = refStats.premiumInvited >= milestone.step || (milestone.step === 4 && refStats.premiumInvited >= 4);
                            const isActiveNext = refStats.premiumInvited === milestone.step - 1;
                            
                            return (
                                <div
                                    key={milestone.step}
                                    className={`p-3.5 rounded-xl border flex flex-col items-center justify-between text-center relative overflow-hidden transition-all ${
                                        isAchieved
                                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-400'
                                            : isActiveNext
                                            ? 'bg-purple-500/10 border-purple-500/30 text-purple-800 dark:text-purple-400 shadow-sm shadow-purple-100 dark:shadow-none animate-pulse'
                                            : 'bg-white dark:bg-slate-800 border-gray-150/40 dark:border-slate-700 text-gray-400'
                                    }`}
                                >
                                    <div className="absolute top-1.5 right-2 text-[8px] font-black uppercase tracking-wider">
                                        {isAchieved ? (
                                            <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5">✓ ĐÃ CỘNG</span>
                                        ) : isActiveNext ? (
                                            <span className="text-purple-600 dark:text-purple-400 flex items-center gap-0.5 animate-bounce">TỚI LƯỢT</span>
                                        ) : (
                                            <span>CHƯA ĐẠT</span>
                                        )}
                                    </div>
                                    <span className="text-[10px] font-extrabold block mb-1 uppercase tracking-wider">{milestone.label}</span>
                                    <span className={`text-sm font-black mt-1 ${isAchieved ? 'text-emerald-700 dark:text-emerald-300' : isActiveNext ? 'text-purple-700 dark:text-purple-300' : 'text-gray-700 dark:text-slate-350'}`}>
                                        {milestone.bonus}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Referred Friends History */}
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold text-gray-700 dark:text-slate-350 uppercase tracking-wider">Lịch sử giới thiệu bạn bè</h4>
                        <span className="text-[10px] text-gray-400">Đã cập nhật mới nhất</span>
                    </div>

                    {loadingStats ? (
                        <div className="text-center py-6 text-xs text-gray-400">Đang tải lịch sử giới thiệu...</div>
                    ) : refStats.friends.length === 0 ? (
                        <div className="text-center py-8 border border-dashed border-gray-200 dark:border-slate-700 rounded-xl text-xs text-gray-400">
                            Chưa có bạn bè nào nhập mã giới thiệu của bạn. Hãy chia sẻ mã để nhận quà nhé!
                        </div>
                    ) : (
                        <div className="overflow-hidden border border-gray-150/40 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800">
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-100 dark:divide-slate-750 text-xs">
                                    <thead className="bg-gray-50 dark:bg-slate-900/50 text-[10px] font-bold uppercase text-gray-400">
                                        <tr>
                                            <th scope="col" className="px-4 py-2.5 text-left">Tên bạn bè</th>
                                            <th scope="col" className="px-4 py-2.5 text-center">Trạng thái</th>
                                            <th scope="col" className="px-4 py-2.5 className text-center">Mốc quà tặng</th>
                                            <th scope="col" className="px-4 py-2.5 text-right">Thời gian</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 dark:divide-slate-750 text-gray-700 dark:text-slate-300 font-medium">
                                        {refStats.friends.map((friend, idx) => (
                                            <tr key={friend.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-750/30 transition-colors">
                                                <td className="px-4 py-3 text-left font-bold text-gray-900 dark:text-white">
                                                    {friend.name}
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    {friend.status === 'premium' ? (
                                                        <span className="inline-flex items-center gap-1 bg-gradient-to-r from-amber-500/10 to-yellow-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 font-black px-2 py-0.5 rounded-full text-[9px] uppercase tracking-wider">
                                                            <Crown className="w-2.5 h-2.5 fill-amber-500/20 text-amber-500" />
                                                            PREMIUM
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex bg-gray-100 dark:bg-gray-700/50 text-gray-500 dark:text-slate-400 px-2 py-0.5 rounded-full text-[9px] uppercase font-bold tracking-wider">
                                                            FREE
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    {friend.status === 'premium' ? (
                                                        <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center justify-center gap-1">
                                                            <Sparkles className="w-3 h-3 text-emerald-500" />
                                                            Đã nhận quà Premium
                                                        </span>
                                                    ) : (
                                                        <span className="text-gray-400 dark:text-slate-500 font-normal">
                                                            Đang đợi nâng cấp Premium
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-right text-gray-400 text-[10px]">
                                                    {new Date(friend.createdAt).toLocaleDateString('vi-VN')} {new Date(friend.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AccountScreen;
