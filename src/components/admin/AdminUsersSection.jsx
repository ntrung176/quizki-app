import React from 'react';
import { Users, Search, BarChart3, Clock, Zap, Crown, Loader2, Shield, BookOpen, Languages, CreditCard, UserX, ShieldCheck, Trash2 } from 'lucide-react';

const AdminUsersSection = ({
    stats,
    searchQuery,
    setSearchQuery,
    roleFilter,
    setRoleFilter,
    planFilter,
    setPlanFilter,
    sortBy,
    sortOrder,
    setSortBy,
    setSortOrder,
    filteredUsers,
    selectedUser,
    handleSelectUser,
    currentUserId,
    adminConfig,
    getUserActivePlan,
    setNotification,
    loadingProfile,
    selectedUserProfile,
    selectedUserPackageState,
    setSelectedUserPackageState,
    handleSaveUserPackage,
    updatingUserPackage,
    kanjiStats,
    getUserPlans,
    formatVND,
    handleToggleModerator,
    savingConfig,
    setDeleteType,
    setConfirmDelete,
    handleSyncUserByUidOrEmail,
    handleSyncAllUsersFromFirestore,
    isSyncingAllUsers
}) => {
    return (
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
                        <div className="w-10 h-10 rounded-lg bg-sky-100 dark:bg-sky-900/30 flex items-center justify-center">
                            <BarChart3 className="w-5 h-5 text-sky-600 dark:text-sky-400" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-sky-600">{stats.totalCards}</p>
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
                            placeholder="Tìm kiếm theo tên, email hoặc ID..."
                            className="w-full pl-10 pr-4 py-2 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                        />
                    </div>
                    <select
                        value={roleFilter}
                        onChange={(e) => setRoleFilter(e.target.value)}
                        className="px-3 py-2 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg outline-none dark:text-white"
                    >
                        <option value="all">Tất cả vai trò</option>
                        <option value="admin">👑 Admin</option>
                        <option value="moderator">🛡️ Quản trị viên</option>
                        <option value="user">👤 Người dùng</option>
                    </select>
                    <select
                        value={planFilter}
                        onChange={(e) => setPlanFilter(e.target.value)}
                        className="px-3 py-2 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg outline-none dark:text-white"
                    >
                        <option value="all">Tất cả gói</option>
                        <option value="premium_1m">👑 Gói Premium 1 Tháng</option>
                        <option value="premium_1y">👑 Gói Premium 1 Năm</option>
                        <option value="premium_3y">👑 Gói Premium 3 Năm</option>
                        <option value="free">👤 Gói Miễn Phí</option>
                    </select>
                    <select
                        value={`${sortBy}-${sortOrder}`}
                        onChange={(e) => { const [by, order] = e.target.value.split('-'); setSortBy(by); setSortOrder(order); }}
                        className="px-3 py-2 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg outline-none dark:text-white"
                    >
                        <option value="totalCards-desc">Nhiều thẻ nhất</option>
                        <option value="totalCards-asc">Ít thẻ nhất</option>
                        <option value="displayName-asc">Tên A-Z</option>
                        <option value="displayName-desc">Tên Z-A</option>
                    </select>
                </div>
            </div>

            {/* Main Content: User List + Details */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* User List */}
                <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                    <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex flex-wrap items-center justify-between gap-2">
                        <h3 className="font-semibold text-gray-800 dark:text-white flex items-center gap-2">
                            <Users className="w-4 h-4" />
                            Danh sách người dùng ({filteredUsers.length})
                        </h3>
                        <div className="flex items-center gap-2 flex-wrap">
                            <button
                                type="button"
                                disabled={isSyncingAllUsers}
                                onClick={() => handleSyncAllUsersFromFirestore && handleSyncAllUsersFromFirestore()}
                                className="px-3 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-sm transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 border border-white/20"
                                title="Quét toàn bộ tài khoản người dùng trên Firestore và nạp đầy đủ vào danh sách quản trị"
                            >
                                {isSyncingAllUsers ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                    <Users className="w-3.5 h-3.5" />
                                )}
                                <span>{isSyncingAllUsers ? 'Đang Quét...' : 'Quét & Đồng Bộ Tất Cả User'}</span>
                            </button>
                            <button
                                type="button"
                                onClick={async () => {
                                    const uidInput = window.prompt("Nhập Email hoặc User UID người dùng để đồng bộ vào Admin (ví dụ: buiphuongthao010120@gmail.com hoặc RZfXCpw3JPeG9CsaWmqlQk...):");
                                    if (uidInput && uidInput.trim() && handleSyncUserByUidOrEmail) {
                                        await handleSyncUserByUidOrEmail(uidInput.trim());
                                    }
                                }}
                                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-xl shadow-sm transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 border border-slate-300 dark:border-slate-600"
                                title="Đồng bộ người dùng qua Email hoặc User UID"
                            >
                                <Search className="w-3.5 h-3.5 text-indigo-500" />
                                <span>Tìm & Đồng bộ Email / UID</span>
                            </button>
                            <button
                                onClick={async () => {
                                    try {
                                        const { normalizeAllUserScores } = await import('../../utils/normalizeUserScore');
                                        const result = await normalizeAllUserScores();
                                        setNotification({ type: 'success', message: `⚡ Đã chuẩn hóa ${result.total} người dùng: Gán Score = XP cho ${result.updatedCount} user!` });
                                    } catch (e) {
                                        setNotification({ type: 'error', message: 'Lỗi chuẩn hóa điểm: ' + e.message });
                                    }
                                }}
                                className="px-3 py-1.5 bg-gradient-to-r from-amber-500 via-indigo-600 to-purple-600 hover:from-amber-600 hover:to-purple-700 text-white font-extrabold text-xs rounded-xl shadow transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 border border-white/20"
                                title="Gán trực tiếp Score = XP cho tất cả người dùng trên Bảng xếp hạng"
                            >
                                <Zap className="w-3.5 h-3.5 fill-amber-300 text-amber-300" />
                                <span>Chuẩn Hóa Điểm (Score = XP)</span>
                            </button>
                        </div>
                    </div>
                    <div className="max-h-[500px] overflow-y-auto">
                        {filteredUsers.length === 0 ? (
                            <div className="p-8 text-center text-gray-400">
                                <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                                <p className="text-gray-600 dark:text-gray-300 font-medium">Không tìm thấy người dùng {searchQuery ? `"${searchQuery}"` : ''}</p>
                                {searchQuery && (
                                    <div className="mt-4">
                                        <p className="text-xs text-gray-400 mb-3">Người dùng mới đăng nhập Google có thể chưa cập nhật hồ sơ công khai.</p>
                                        <button
                                            type="button"
                                            onClick={() => handleSyncUserByUidOrEmail && handleSyncUserByUidOrEmail(searchQuery)}
                                            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow transition-all inline-flex items-center gap-1.5 cursor-pointer"
                                        >
                                            <Search className="w-3.5 h-3.5" />
                                            <span>Tìm kiếm & Đồng bộ "{searchQuery}"</span>
                                        </button>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="divide-y divide-gray-100 dark:divide-gray-700">
                                {filteredUsers.map(user => {
                                    const isMod = adminConfig?.moderators?.includes(user.userId);
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
                                                        <p className="text-xs text-gray-400 dark:text-gray-500 leading-none mt-0.5">{user.email || 'no-email@example.com'}</p>
                                                        <div className="flex flex-wrap items-center gap-2 text-xs text-gray-550 dark:text-gray-450 mt-1.5">
                                                            <span className="font-semibold">{user.totalCards || 0} thẻ</span>
                                                            {(() => {
                                                                const activePlan = getUserActivePlan(user);

                                                                let isExpired = false;
                                                                if (user.premiumExpiresAt) {
                                                                    const expiryTime = user.premiumExpiresAt.toDate ? user.premiumExpiresAt.toDate().getTime() : Number(user.premiumExpiresAt || 0);
                                                                    if (expiryTime && expiryTime < Date.now()) {
                                                                        isExpired = true;
                                                                    }
                                                                }

                                                                if (isExpired) {
                                                                    return <span className="text-[10px] text-red-500 bg-red-50 dark:bg-red-950/20 px-1.5 py-0.5 rounded font-bold">HẾT HẠN</span>;
                                                                }
                                                                if (activePlan === 'premium_3y') {
                                                                    return <span className="text-[10px] text-amber-700 bg-amber-50 dark:bg-amber-950/20 px-1.5 py-0.5 rounded font-black">👑 3 NĂM</span>;
                                                                }
                                                                if (activePlan === 'premium_1y') {
                                                                    return <span className="text-[10px] text-amber-700 bg-amber-50 dark:bg-amber-950/20 px-1.5 py-0.5 rounded font-black">👑 1 NĂM</span>;
                                                                }
                                                                if (activePlan === 'premium_1m') {
                                                                    return <span className="text-[10px] text-amber-700 bg-amber-50 dark:bg-amber-950/20 px-1.5 py-0.5 rounded font-black">👑 1 THÁNG</span>;
                                                                }
                                                                if (activePlan === 'premium') {
                                                                    return <span className="text-[10px] text-indigo-500 bg-indigo-50 dark:bg-indigo-950/20 px-1.5 py-0.5 rounded font-bold">👑 PREMIUM</span>;
                                                                }
                                                                return <span className="text-[10px] text-gray-400 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">FREE</span>;
                                                            })()}
                                                            {user.premiumExpiresAt && (
                                                                <span className="text-[10px] text-gray-400">
                                                                    Hạn: {(() => {
                                                                        const d = user.premiumExpiresAt.toDate ? user.premiumExpiresAt.toDate() : new Date(user.premiumExpiresAt);
                                                                        return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
                                                                    })()}
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

                            {/* Account & Packages Info */}
                            <div>
                                <h4 className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-1">
                                    <Shield className="w-3.5 h-3.5 text-indigo-500" /> GÓI & TÀI KHOẢN
                                </h4>
                                {loadingProfile ? (
                                    <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg text-center">
                                        <Loader2 className="w-4 h-4 animate-spin mx-auto text-indigo-500" />
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {/* Active Package Status Badge */}
                                        <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg flex items-center justify-between">
                                            <div>
                                                <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Gói hiện tại</p>
                                                <p className="text-sm font-bold text-gray-800 dark:text-white mt-0.5">
                                                    {selectedUserPackageState === 'premium_3y' ? '👑 Premium 3 Năm' :
                                                        selectedUserPackageState === 'premium_1y' ? '👑 Premium 1 Năm' :
                                                            selectedUserPackageState === 'premium_1m' ? '👑 Premium 1 Tháng' :
                                                                'Gói Miễn Phí'}
                                                </p>
                                                {(() => {
                                                    const exp = selectedUserProfile?.premiumExpiresAt || selectedUser?.premiumExpiresAt;
                                                    if (!exp) return null;
                                                    const expiryTime = exp.toDate ? exp.toDate().getTime() : Number(exp || 0);
                                                    if (!expiryTime) return null;
                                                    const dateStr = new Date(expiryTime).toLocaleDateString('vi-VN');
                                                    const isExpired = expiryTime < Date.now();
                                                    if (isExpired) {
                                                        return <p className="text-[11px] text-red-500 font-semibold mt-0.5">Đã hết hạn ngày {dateStr}</p>;
                                                    }
                                                    return <p className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold mt-0.5">Hạn dùng đến {dateStr}</p>;
                                                })()}
                                            </div>
                                            <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${selectedUserPackageState !== 'free'
                                                    ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-450'
                                                    : 'bg-gray-100 dark:bg-gray-800 text-gray-500'
                                                }`}>
                                                {selectedUserPackageState !== 'free' ? 'PREMIUM' : 'FREE'}
                                            </span>
                                        </div>

                                        {/* Change Package Dropdown & Update Button */}
                                        <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg space-y-2">
                                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Quản lý gói cước</label>
                                            <select
                                                value={selectedUserPackageState}
                                                onChange={(e) => setSelectedUserPackageState(e.target.value)}
                                                className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl text-xs font-semibold text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                                            >
                                                <option value="free" className="bg-white dark:bg-gray-700 text-gray-900 dark:text-white">Gói Miễn Phí (Default)</option>
                                                <option value="premium_1m" className="bg-white dark:bg-gray-700 text-gray-900 dark:text-white">👑 Gói Premium 1 Tháng</option>
                                                <option value="premium_1y" className="bg-white dark:bg-gray-700 text-gray-900 dark:text-white">👑 Gói Premium 1 Năm</option>
                                                <option value="premium_3y" className="bg-white dark:bg-gray-700 text-gray-900 dark:text-white">👑 Gói Premium 3 Năm</option>
                                            </select>
                                            <button
                                                onClick={handleSaveUserPackage}
                                                disabled={updatingUserPackage}
                                                className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5 disabled:opacity-50"
                                            >
                                                {updatingUserPackage ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                                                Cập nhật gói cước
                                            </button>
                                        </div>
                                    </div>
                                )}
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

                            {/* Subscription / Purchased Plans */}
                            <div>
                                <h4 className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-1">
                                    <CreditCard className="w-3.5 h-3.5" /> GÓI ĐÃ MUA
                                </h4>
                                {(() => {
                                    const userPlans = getUserPlans(selectedUser.userId);
                                    if (userPlans.length === 0) {
                                        return (
                                            <p className="text-xs text-gray-400 dark:text-gray-500 italic p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg text-center">
                                                Chưa mua gói nào
                                            </p>
                                        );
                                    }
                                    const totalCredits = userPlans.reduce((sum, r) => sum + (r.credits || 0), 0);
                                    const totalSpent = userPlans.reduce((sum, r) => sum + (r.amount || 0), 0);
                                    return (
                                        <div className="space-y-2">
                                            <div className="grid grid-cols-2 gap-2">
                                                <div className="p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg">
                                                    <p className="text-lg font-bold text-indigo-600">{userPlans.length}</p>
                                                    <p className="text-xs text-gray-500">Lần mua</p>
                                                </div>
                                                <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">
                                                    <p className="text-lg font-bold text-emerald-600">{totalCredits.toLocaleString()}</p>
                                                    <p className="text-xs text-gray-500">Tổng thẻ</p>
                                                </div>
                                            </div>
                                            <div className="p-2.5 bg-amber-50 dark:bg-amber-900/20 rounded-lg flex items-center justify-between">
                                                <span className="text-xs text-amber-700 dark:text-amber-400 font-medium">Tổng chi tiêu</span>
                                                <span className="text-sm font-bold text-amber-600">{formatVND(totalSpent)}</span>
                                            </div>
                                            <div className="max-h-[150px] overflow-y-auto space-y-1.5">
                                                {userPlans.map((r, idx) => (
                                                    <div key={idx} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg text-xs">
                                                        <div>
                                                            <span className="font-bold text-gray-700 dark:text-gray-300">{r.packageName || r.packageId}</span>
                                                            <span className="text-gray-400 ml-1.5">({r.credits} thẻ)</span>
                                                        </div>
                                                        <div className="text-right">
                                                            <span className="font-medium text-emerald-600">{formatVND(r.amount || 0)}</span>
                                                            {r.processedAt && (
                                                                <p className="text-[10px] text-gray-400 mt-0.5">
                                                                    {(r.processedAt?.toDate ? r.processedAt.toDate() : new Date(r.processedAt)).toLocaleDateString('vi-VN')}
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })()}
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
    );
};

export default AdminUsersSection;
