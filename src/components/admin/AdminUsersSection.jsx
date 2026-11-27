import React, { useState, useEffect } from 'react';
import { Users, Search, BarChart3, Clock, Zap, Crown, Loader2, RefreshCw, ChevronDown } from 'lucide-react';
import AdminSyncUserModal from './AdminSyncUserModal';
import AdminUserDetailPanel from './AdminUserDetailPanel';
import AdminCreditResetModal from './AdminCreditResetModal';
import { extractUserLastActive, isUserOnline, formatLastActive } from '../../utils/userActivityHelper';

const PAGE_STEP = 40;

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
    isSyncingAllUsers,
    onSingleUserCreditsUpdated
}) => {
    const [showSyncModal, setShowSyncModal] = useState(false);
    const [showResetCreditsModal, setShowResetCreditsModal] = useState(false);
    const [visibleLimit, setVisibleLimit] = useState(PAGE_STEP);

    // Reset visible page count when search or filters change
    useEffect(() => {
        setVisibleLimit(PAGE_STEP);
    }, [searchQuery, roleFilter, planFilter, sortBy, sortOrder]);

    const visibleUsers = filteredUsers.slice(0, visibleLimit);
    const hasMoreUsers = filteredUsers.length > visibleLimit;
    const modCount = adminConfig?.moderators?.length || 0;

    return (
        <div className="space-y-5">
            {/* KPI Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border-2 border-b-4 border-slate-200 dark:border-slate-700/80 flex items-center gap-3.5">
                    <div className="w-11 h-11 rounded-2xl bg-emerald-500 border-b-4 border-emerald-700 text-white flex items-center justify-center shrink-0">
                        <Users className="w-5 h-5" />
                    </div>
                    <div>
                        <p className="text-2xl font-black text-slate-900 dark:text-white leading-none">{stats.total}</p>
                        <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mt-1">Tổng người dùng ({modCount} QTV)</p>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border-2 border-b-4 border-slate-200 dark:border-slate-700/80 flex items-center gap-3.5">
                    <div className="w-11 h-11 rounded-2xl bg-sky-500 border-b-4 border-sky-700 text-white flex items-center justify-center shrink-0">
                        <BarChart3 className="w-5 h-5" />
                    </div>
                    <div>
                        <p className="text-2xl font-black text-sky-600 dark:text-sky-400 leading-none">{stats.totalCards.toLocaleString()}</p>
                        <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mt-1">Tổng Flashcard</p>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border-2 border-b-4 border-slate-200 dark:border-slate-700/80 flex items-center gap-3.5">
                    <div className="w-11 h-11 rounded-2xl bg-amber-500 border-b-4 border-amber-700 text-white flex items-center justify-center shrink-0">
                        <Clock className="w-5 h-5" />
                    </div>
                    <div>
                        <p className="text-2xl font-black text-amber-600 dark:text-amber-400 leading-none">{stats.activeToday}</p>
                        <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mt-1">Hoạt động hôm nay</p>
                    </div>
                </div>
            </div>

            {/* Search & Filters */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-3.5 border-2 border-slate-200 dark:border-slate-700/80">
                <div className="flex flex-col md:flex-row gap-2.5">
                    <div className="flex-1 relative">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Tìm kiếm theo tên, email hoặc User UID..."
                            className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl focus:border-emerald-500 outline-none text-slate-800 dark:text-white font-medium"
                        />
                    </div>
                    <select
                        value={roleFilter}
                        onChange={(e) => setRoleFilter(e.target.value)}
                        className="px-3 py-2.5 text-xs font-bold bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl outline-none text-slate-700 dark:text-white cursor-pointer"
                    >
                        <option value="all">Tất cả vai trò</option>
                        <option value="admin">👑 Admin chính</option>
                        <option value="moderator">🛡️ Quản trị viên (QTV)</option>
                        <option value="user">👤 Học viên</option>
                    </select>
                    <select
                        value={planFilter}
                        onChange={(e) => setPlanFilter(e.target.value)}
                        className="px-3 py-2.5 text-xs font-bold bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl outline-none text-slate-700 dark:text-white cursor-pointer"
                    >
                        <option value="all">Tất cả gói cước</option>
                        <option value="all_premium">👑 Đang dùng Premium</option>
                        <option value="premium_1m">• Premium 1 Tháng</option>
                        <option value="premium_1y">• Premium 1 Năm</option>
                        <option value="premium_3y">• Premium 3 Năm</option>
                        <option value="expired">⚠️ Đã hết hạn</option>
                        <option value="free">👤 Gói Miễn Phí</option>
                    </select>
                    <select
                        value={`${sortBy}-${sortOrder}`}
                        onChange={(e) => {
                            const [by, order] = e.target.value.split('-');
                            setSortBy(by);
                            setSortOrder(order);
                        }}
                        className="px-3 py-2.5 text-xs font-bold bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl outline-none text-slate-700 dark:text-white cursor-pointer"
                    >
                        <option value="totalCards-desc">Nhiều thẻ nhất</option>
                        <option value="totalCards-asc">Ít thẻ nhất</option>
                        <option value="lastActive-desc">Hoạt động gần nhất</option>
                        <option value="xp-desc">XP cao nhất</option>
                        <option value="displayName-asc">Tên A → Z</option>
                        <option value="displayName-desc">Tên Z → A</option>
                    </select>
                </div>
            </div>

            {/* User List + Sticky Detail Panel (items-start fixes empty stretched box & clipped rows) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
                {/* User List */}
                <div className="lg:col-span-7 bg-white dark:bg-slate-900 rounded-3xl border-2 border-slate-200 dark:border-slate-700/80 overflow-hidden shadow-sm">
                    <div className="p-4 border-b-2 border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2.5">
                        <div className="flex items-center gap-2">
                            <h3 className="font-extrabold text-sm text-slate-800 dark:text-white flex items-center gap-2">
                                <Users className="w-4 h-4 text-emerald-500" />
                                Danh sách người dùng
                            </h3>
                            <span className="px-2 py-0.5 rounded-full text-xs font-black bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
                                {filteredUsers.length}
                            </span>
                        </div>

                        <div className="flex items-center gap-2 flex-wrap">
                            <button
                                type="button"
                                disabled={isSyncingAllUsers}
                                onClick={() => handleSyncAllUsersFromFirestore && handleSyncAllUsersFromFirestore()}
                                className="px-3 py-1.5 bg-sky-500 hover:bg-sky-600 border-b-4 border-sky-700 active:translate-y-0.5 active:border-b-2 disabled:opacity-50 text-white font-extrabold text-xs rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
                                title="Quét toàn bộ tài khoản người dùng trên Firestore"
                            >
                                {isSyncingAllUsers ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                                <span>{isSyncingAllUsers ? 'Đang quét...' : 'Đồng bộ tất cả'}</span>
                            </button>

                            <button
                                type="button"
                                onClick={() => setShowSyncModal(true)}
                                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border-2 border-b-4 border-slate-300 dark:border-slate-600 active:translate-y-0.5 active:border-b-2 text-slate-700 dark:text-slate-200 font-extrabold text-xs rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
                                title="Tìm và đồng bộ người dùng theo Email hoặc User UID"
                            >
                                <Search className="w-3.5 h-3.5 text-emerald-500" />
                                <span>Tìm Email / UID</span>
                            </button>

                            <button
                                type="button"
                                onClick={async () => {
                                    try {
                                        const { normalizeAllUserScores } = await import('../../utils/normalizeUserScore');
                                        const result = await normalizeAllUserScores();
                                        setNotification({ type: 'success', message: `⚡ Đã chuẩn hóa ${result.total} người dùng: Gán Score = XP cho ${result.updatedCount} user!` });
                                    } catch (e) {
                                        setNotification({ type: 'error', message: 'Lỗi chuẩn hóa điểm: ' + e.message });
                                    }
                                }}
                                className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 border-b-4 border-amber-700 active:translate-y-0.5 active:border-b-2 text-white font-extrabold text-xs rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
                                title="Gán trực tiếp Score = XP trên Bảng xếp hạng"
                            >
                                <Zap className="w-3.5 h-3.5" />
                                <span>Score = XP</span>
                            </button>

                            <button
                                type="button"
                                onClick={() => setShowResetCreditsModal(true)}
                                className="px-3 py-1.5 bg-rose-500 hover:bg-rose-600 border-b-4 border-rose-700 active:translate-y-0.5 active:border-b-2 text-white font-extrabold text-xs rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
                                title="Reset lượt AI gói 1 Năm / 3 Năm về đúng chuẩn & xử lý tài khoản cheat Credit"
                            >
                                <RefreshCw className="w-3.5 h-3.5" />
                                <span>Reset Credit AI</span>
                            </button>
                        </div>
                    </div>

                    <div className="max-h-[680px] overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/80">
                        {filteredUsers.length === 0 ? (
                            <div className="p-8 text-center text-slate-400">
                                <Users className="w-12 h-12 mx-auto mb-3 opacity-40" />
                                <p className="text-slate-600 dark:text-slate-300 font-bold text-sm">
                                    Không tìm thấy người dùng {searchQuery ? `"${searchQuery}"` : ''}
                                </p>
                                {searchQuery && (
                                    <div className="mt-4">
                                        <p className="text-xs text-slate-400 mb-3">
                                            Tài khoản mới đăng ký có thể cần đồng bộ hồ sơ từ Email hoặc Firebase UID.
                                        </p>
                                        <button
                                            type="button"
                                            onClick={async () => {
                                                if (!handleSyncUserByUidOrEmail) return;
                                                const res = await handleSyncUserByUidOrEmail(searchQuery);
                                                if (res?.needsUid) setShowSyncModal(true);
                                            }}
                                            className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 border-b-4 border-emerald-700 text-white text-xs font-extrabold rounded-xl transition-all inline-flex items-center gap-1.5 cursor-pointer"
                                        >
                                            <Search className="w-3.5 h-3.5" />
                                            <span>Tìm & Đồng bộ "{searchQuery}"</span>
                                        </button>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <>
                                {visibleUsers.map(user => {
                                    const isMod = Boolean(adminConfig?.moderators?.includes(user.userId));
                                    const isSelf = user.userId === currentUserId;
                                    const isSelected = selectedUser?.userId === user.userId;
                                    const activePlan = getUserActivePlan(user);
                                    const lastActiveMs = extractUserLastActive(user);
                                    const online = isUserOnline(lastActiveMs);

                                    let expiryTime = 0;
                                    if (user.premiumExpiresAt) {
                                        expiryTime = user.premiumExpiresAt.toDate
                                            ? user.premiumExpiresAt.toDate().getTime()
                                            : Number(user.premiumExpiresAt || 0);
                                    }
                                    const isExpired = Boolean(expiryTime && expiryTime < Date.now());

                                    let planBadge = (
                                        <span className="text-[10px] text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full font-bold">
                                            FREE
                                        </span>
                                    );
                                    if (isExpired && activePlan === 'free') {
                                        planBadge = (
                                            <span className="text-[10px] text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 px-2 py-0.5 rounded-full font-black">
                                                HẾT HẠN
                                            </span>
                                        );
                                    } else if (activePlan === 'premium_3y') {
                                        planBadge = <span className="text-[10px] text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/60 px-2 py-0.5 rounded-full font-black">👑 3 NĂM</span>;
                                    } else if (activePlan === 'premium_1y') {
                                        planBadge = <span className="text-[10px] text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/60 px-2 py-0.5 rounded-full font-black">👑 1 NĂM</span>;
                                    } else if (activePlan === 'premium_1m') {
                                        planBadge = <span className="text-[10px] text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/60 px-2 py-0.5 rounded-full font-black">👑 1 THÁNG</span>;
                                    } else if (activePlan === 'premium') {
                                        planBadge = <span className="text-[10px] text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full font-black">👑 PREMIUM</span>;
                                    }

                                    return (
                                        <button
                                            key={user.userId}
                                            type="button"
                                            onClick={() => handleSelectUser(user)}
                                            className={`w-full text-left p-3.5 sm:px-4 hover:bg-slate-50 dark:hover:bg-slate-800/60 cursor-pointer transition-colors flex items-center gap-3 ${
                                                isSelected
                                                    ? 'bg-emerald-50/80 dark:bg-emerald-950/35 border-l-4 border-emerald-500'
                                                    : 'border-l-4 border-transparent'
                                            }`}
                                        >
                                            <div className="relative shrink-0">
                                                <div
                                                    className={`w-10 h-10 rounded-2xl flex items-center justify-center text-white font-black text-sm border-b-2 ${
                                                        isSelf
                                                            ? 'bg-sky-500 border-sky-700'
                                                            : isMod
                                                                ? 'bg-amber-500 border-amber-700'
                                                                : 'bg-emerald-500 border-emerald-700'
                                                    }`}
                                                >
                                                    {(user.displayName || user.email || '?')[0].toUpperCase()}
                                                </div>
                                                {online && (
                                                    <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-900" />
                                                )}
                                            </div>

                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-1.5 flex-wrap">
                                                    <span className="font-extrabold text-sm text-slate-800 dark:text-white truncate max-w-[200px]">
                                                        {user.displayName || 'Chưa đặt tên'}
                                                    </span>
                                                    {isSelf && (
                                                        <span className="text-[10px] font-black bg-sky-100 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 px-2 py-0.5 rounded-full">
                                                            Admin
                                                        </span>
                                                    )}
                                                    {isMod && (
                                                        <span className="text-[10px] font-black bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded-full inline-flex items-center gap-0.5">
                                                            <Crown className="w-2.5 h-2.5" /> QTV
                                                        </span>
                                                    )}
                                                </div>

                                                <p className={`text-xs truncate mt-0.5 ${user.email ? 'text-slate-500 dark:text-slate-400' : 'text-slate-400 dark:text-slate-500 italic'}`}>
                                                    {user.email || `Chưa đồng bộ email • UID: ${user.userId?.slice(0, 8)}...`}
                                                </p>

                                                <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 mt-1.5">
                                                    <span className="font-bold text-slate-700 dark:text-slate-300">{user.totalCards || 0} thẻ</span>
                                                    <span>•</span>
                                                    {planBadge}
                                                    {expiryTime > 0 && (
                                                        <span className="text-[10px] text-slate-400">
                                                            Hạn: {new Date(expiryTime).toLocaleDateString('vi-VN')}
                                                        </span>
                                                    )}
                                                    {!online && lastActiveMs > 0 && (
                                                        <span className="text-[10px] text-slate-400 hidden sm:inline">
                                                            • {formatLastActive(lastActiveMs, '')}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </button>
                                    );
                                })}

                                {hasMoreUsers && (
                                    <div className="p-3 text-center bg-slate-50/70 dark:bg-slate-800/40">
                                        <button
                                            type="button"
                                            onClick={() => setVisibleLimit(prev => prev + PAGE_STEP)}
                                            className="px-4 py-2 bg-white dark:bg-slate-900 border-2 border-b-4 border-slate-200 dark:border-slate-700 hover:border-emerald-400 text-xs font-extrabold text-slate-700 dark:text-slate-200 rounded-xl inline-flex items-center gap-1.5 cursor-pointer transition-all"
                                        >
                                            <ChevronDown className="w-4 h-4 text-emerald-500" />
                                            Hiện thêm ({filteredUsers.length - visibleLimit} người dùng còn lại)
                                        </button>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>

                {/* User Details Panel */}
                <div className="lg:col-span-5 lg:sticky lg:top-4">
                    <AdminUserDetailPanel
                        selectedUser={selectedUser}
                        selectedUserProfile={selectedUserProfile}
                        loadingProfile={loadingProfile}
                        selectedUserPackageState={selectedUserPackageState}
                        setSelectedUserPackageState={setSelectedUserPackageState}
                        handleSaveUserPackage={handleSaveUserPackage}
                        updatingUserPackage={updatingUserPackage}
                        kanjiStats={kanjiStats}
                        getUserPlans={getUserPlans}
                        formatVND={formatVND}
                        currentUserId={currentUserId}
                        adminConfig={adminConfig}
                        handleToggleModerator={handleToggleModerator}
                        savingConfig={savingConfig}
                        setDeleteType={setDeleteType}
                        setConfirmDelete={setConfirmDelete}
                        onSingleUserCreditsUpdated={onSingleUserCreditsUpdated}
                        setNotification={setNotification}
                    />
                </div>
            </div>

            <AdminSyncUserModal
                isOpen={showSyncModal}
                initialQuery={searchQuery}
                onClose={() => setShowSyncModal(false)}
                onSync={handleSyncUserByUidOrEmail}
            />

            <AdminCreditResetModal
                isOpen={showResetCreditsModal}
                onClose={() => setShowResetCreditsModal(false)}
                adminModerators={adminConfig?.moderators || []}
                onCompleted={(res) => {
                    if (selectedUser && res?.updatedUsers) {
                        const hit = res.updatedUsers.find(u => u.uid === selectedUser.userId);
                        if (hit && onSingleUserCreditsUpdated) {
                            onSingleUserCreditsUpdated(selectedUser.userId, hit.after);
                        }
                    }
                    setNotification({
                        type: 'success',
                        message: `Đã reset Credit AI: ${res.reset1yCount} gói 1 Năm, ${res.reset3yCount} gói 3 Năm, ${res.anomalyClearedCount} tài khoản bất thường!`
                    });
                }}
            />
        </div>
    );
};

export default AdminUsersSection;
