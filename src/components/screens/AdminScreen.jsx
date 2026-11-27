import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ROUTES } from '../../router';
import LoadingIndicator from '../ui/LoadingIndicator';
import {
    Users, Shield, CheckCircle, AlertTriangle, Bot,
    DollarSign, MessageSquare, SlidersHorizontal, Sparkles
} from 'lucide-react';
import {
    updateAdminConfig,
    OPENROUTER_MODELS,
    AI_FEATURES,
    addModerator,
    removeModerator,
    sendGlobalNotification,
    deleteGlobalNotification
} from '../../utils/adminSettings';

// Subcomponents
import AdminUsersSection from '../admin/AdminUsersSection';
import AdminAiSection from '../admin/AdminAiSection';
import AdminRevenueSection from '../admin/AdminRevenueSection';
import AdminFeaturesSection from '../admin/AdminFeaturesSection';
import AdminSupportChatSection from '../admin/AdminSupportChatSection';

// Modals
import AdminDeleteUserModal from '../admin/AdminDeleteUserModal';
import AdminBroadcastEmailModal from '../admin/AdminBroadcastEmailModal';

// Hooks & Helpers
import { useAdminData } from '../../hooks/useAdminData';
import { fetchThirdPartyApiBalances, syncCdnDomain } from '../admin/adminCacheSync';

const SECTIONS = [
    { id: 'users', label: 'Người dùng', icon: Users },
    { id: 'support', label: 'Hỗ trợ', icon: MessageSquare },
    { id: 'ai', label: 'AI', icon: Bot },
    { id: 'revenue', label: 'Doanh thu', icon: DollarSign },
    { id: 'features', label: 'Tính năng', icon: SlidersHorizontal },
];

const AdminScreen = ({ publicStatsPath, currentUserId, onAdminDeleteUserData, adminConfig }) => {
    const [activeSection, setActiveSection] = useState('users');
    const [savingConfig, setSavingConfig] = useState(false);
    const [showBroadcastEmailModal, setShowBroadcastEmailModal] = useState(false);
    const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
    const [apiBalances, setApiBalances] = useState({ openRouter: null, speechGen: null, loading: false, error: '' });

    // Global notifications & maintenance states
    const [newNotificationText, setNewNotificationText] = useState({ title: '', message: '', link: '' });
    const [notificationError, setNotificationError] = useState('');
    const [sendingNotification, setSendingNotification] = useState(false);
    const [notificationType, setNotificationType] = useState('popup');
    const [maintenanceMsg, setMaintenanceMsg] = useState(adminConfig?.maintenanceMessage || '');

    // Cache Sync States
    const [syncingCache, setSyncingCache] = useState({ kanji: false, books: false, grammar: false, jlpt: false, all: false });
    const [syncProgress, setSyncProgress] = useState('');

    // User & Admin Data Hook
    const {
        users, isLoading, searchQuery, setSearchQuery, sortBy, setSortBy, sortOrder, setSortOrder,
        selectedUser, selectedUserProfile, setSelectedUserProfile, selectedUserPackageState, setSelectedUserPackageState,
        updatingUserPackage, loadingProfile, notification, setNotification, confirmDelete, setConfirmDelete,
        deleting, deleteType, setDeleteType, roleFilter, setRoleFilter, planFilter, setPlanFilter,
        creditRequests, vouchers, expenses, globalNotifications, cacheConfig, getUserActivePlan,
        handleSaveUserPackage, stats, filteredUsers, handleDelete, getUserPlans, kanjiStats, formatVND, handleSelectUser,
        handleSyncUserByUidOrEmail, handleSyncAllUsersFromFirestore, isSyncingAllUsers
    } = useAdminData({ publicStatsPath, currentUserId, adminConfig, onAdminDeleteUserData });

    useEffect(() => {
        if (adminConfig?.maintenanceMessage !== undefined) {
            setMaintenanceMsg(adminConfig.maintenanceMessage || '');
        }
    }, [adminConfig?.maintenanceMessage]);

    const fetchApiBalances = async () => {
        setApiBalances(prev => ({ ...prev, loading: true, error: '' }));
        const results = await fetchThirdPartyApiBalances();
        setApiBalances(results);
    };

    const handleChangeFeatureModel = async (featureId, model) => {
        setSavingConfig(true);
        const updatedFeatureModels = { ...(adminConfig?.aiFeatureModels || {}), [featureId]: model };
        const ok = await updateAdminConfig({ aiFeatureModels: updatedFeatureModels }, currentUserId);
        if (ok) {
            setNotification({
                type: 'success',
                message: `Đã đổi model cho "${AI_FEATURES.find(f => f.id === featureId)?.label || featureId}" sang ${OPENROUTER_MODELS.find(m => m.value === model)?.label || model}`
            });
        } else {
            setNotification({ type: 'error', message: 'Lỗi khi cập nhật model cho tính năng' });
        }
        setSavingConfig(false);
    };

    const handleSaveFeatureCosts = async (updatedFeatureCosts) => {
        setSavingConfig(true);
        const ok = await updateAdminConfig({ aiFeatureCosts: updatedFeatureCosts }, currentUserId);
        if (ok) {
            setNotification({
                type: 'success',
                message: 'Đã lưu & áp dụng định mức Credit AI cho tất cả tính năng!'
            });
        } else {
            setNotification({ type: 'error', message: 'Lỗi khi lưu định mức Credit AI' });
        }
        setSavingConfig(false);
    };

    const handleToggleModerator = async (userId, userName) => {
        setSavingConfig(true);
        const isMod = adminConfig?.moderators?.includes(userId);
        const ok = isMod
            ? await removeModerator(adminConfig, userId, currentUserId)
            : await addModerator(adminConfig, userId, currentUserId);
        if (ok) {
            setNotification({
                type: 'success',
                message: isMod ? `Đã gỡ quyền QTV của ${userName}` : `Đã cấp quyền QTV cho ${userName}`
            });
        } else {
            setNotification({ type: 'error', message: 'Lỗi khi cập nhật quyền quản trị viên' });
        }
        setSavingConfig(false);
    };

    const runDomainSync = async (domain, label, forceFull = false, silent = false) => {
        if (!silent) {
            setSyncingCache(prev => ({ ...prev, [domain]: true }));
            setSyncProgress(`Đang đồng bộ dữ liệu ${label} lên CDN...`);
        }
        try {
            const res = await syncCdnDomain(domain, forceFull);
            if (!silent) setNotification({ type: 'success', message: `Đồng bộ ${label} thành công!` });
            return res;
        } catch (error) {
            console.error(`Error syncing ${domain}:`, error);
            if (!silent) setNotification({ type: 'error', message: `Lỗi khi đồng bộ ${label}: ` + error.message });
            throw error;
        } finally {
            if (!silent) {
                setSyncingCache(prev => ({ ...prev, [domain]: false }));
                setSyncProgress('');
            }
        }
    };

    const syncKanjiAndVocab = (silent = false, forceFull = false) => runDomainSync('kanji', 'Kanji & Từ vựng', forceFull, silent);
    const syncBooks = (silent = false) => runDomainSync('books', 'Kho sách', false, silent);
    const syncGrammar = (silent = false) => runDomainSync('grammar', 'Ngữ pháp', false, silent);
    const syncJlpt = (silent = false) => runDomainSync('jlpt', 'Đề thi JLPT', false, silent);

    const syncAllCache = async () => {
        setSyncingCache(prev => ({ ...prev, all: true }));
        try {
            setSyncProgress('1/4 Đồng bộ Kanji & Từ vựng...');
            await syncKanjiAndVocab(true, true);
            setSyncProgress('2/4 Đồng bộ Kho sách...');
            await syncBooks(true);
            setSyncProgress('3/4 Đồng bộ Ngữ pháp...');
            await syncGrammar(true);
            setSyncProgress('4/4 Đồng bộ Đề thi JLPT...');
            await syncJlpt(true);
            setNotification({ type: 'success', message: 'Đồng bộ tất cả dữ liệu tĩnh CDN thành công!' });
        } catch (error) {
            setNotification({ type: 'error', message: 'Lỗi khi đồng bộ: ' + error.message });
        } finally {
            setSyncingCache(prev => ({ ...prev, all: false }));
            setSyncProgress('');
        }
    };

    const handleSendNotification = async () => {
        if (!newNotificationText.title.trim() || !newNotificationText.message.trim()) {
            setNotificationError('Vui lòng điền đầy đủ tiêu đề và nội dung');
            return;
        }
        setSendingNotification(true);
        setNotificationError('');
        try {
            const ok = await sendGlobalNotification(
                newNotificationText.title, newNotificationText.message, currentUserId, notificationType, newNotificationText.link
            );
            if (ok) {
                setNewNotificationText({ title: '', message: '', link: '' });
                setNotificationType('normal');
                setNotification({ type: 'success', message: 'Đã gửi thông báo đến toàn bộ người dùng' });
            } else {
                setNotificationError('Lỗi khi gửi thông báo. Vui lòng kiểm tra lại kết nối.');
            }
        } catch (e) {
            console.error('Error sending notification:', e);
            setNotificationError('Lỗi khi gửi thông báo: ' + (e.message || e));
        } finally {
            setSendingNotification(false);
        }
    };

    const handleDeleteNotification = async (notifId) => {
        const ok = await deleteGlobalNotification(notifId);
        if (ok) setNotification({ type: 'success', message: 'Đã xóa thông báo' });
        else setNotification({ type: 'error', message: 'Lỗi khi xóa thông báo' });
    };

    if (isLoading) {
        return <LoadingIndicator text="Đang tải dữ liệu quản trị..." />;
    }

    return (
        <div className="space-y-6 pb-8">
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-500 border-b-4 border-emerald-700 text-white flex items-center justify-center shadow-sm shrink-0">
                        <Shield className="w-6 h-6" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black text-slate-900 dark:text-white leading-tight">
                            Quản lý Admin
                        </h1>
                        <p className="text-xs sm:text-sm font-semibold text-slate-500 dark:text-slate-400 mt-0.5">
                            Người dùng, hỗ trợ học viên, cấu hình AI, doanh thu & trung tâm tính năng
                        </p>
                    </div>
                </div>

                <Link
                    to={`${ROUTES.JLPT_ADMIN}?mode=studio`}
                    className="px-4 py-2.5 rounded-2xl bg-sky-500 hover:bg-sky-400 border-b-4 border-sky-700 active:translate-y-0.5 active:border-b-2 text-white text-xs font-black flex items-center gap-2 shadow-xs shrink-0"
                >
                    <Sparkles className="w-4 h-4" />
                    <span>Studio Soạn Đề &amp; Nghe JLPT</span>
                </Link>
            </div>

            {/* Duolingo 5-Tab Navigation Bar */}
            <div className="grid grid-cols-5 gap-1.5 bg-slate-100 dark:bg-slate-900/90 border-2 border-slate-200 dark:border-slate-700/80 rounded-2xl p-1.5 shadow-xs">
                {SECTIONS.map(sec => {
                    const isActive = activeSection === sec.id;
                    return (
                        <button
                            key={sec.id}
                            type="button"
                            onClick={() => setActiveSection(sec.id)}
                            className={`flex items-center justify-center gap-2 py-2.5 px-2 sm:px-3 rounded-xl text-xs sm:text-sm font-extrabold transition-all cursor-pointer whitespace-nowrap ${
                                isActive
                                    ? 'bg-emerald-500 text-white border-b-4 border-emerald-700 shadow-sm'
                                    : 'text-slate-500 dark:text-slate-400 hover:bg-white/70 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-slate-200'
                            }`}
                        >
                            <sec.icon className="w-4 h-4 shrink-0" />
                            <span className="hidden sm:inline">{sec.label}</span>
                        </button>
                    );
                })}
            </div>

            {/* Active Tab Panel */}
            {activeSection === 'users' && (
                <AdminUsersSection
                    stats={stats} searchQuery={searchQuery} setSearchQuery={setSearchQuery}
                    roleFilter={roleFilter} setRoleFilter={setRoleFilter} planFilter={planFilter} setPlanFilter={setPlanFilter}
                    sortBy={sortBy} sortOrder={sortOrder} setSortBy={setSortBy} setSortOrder={setSortOrder}
                    filteredUsers={filteredUsers} selectedUser={selectedUser} handleSelectUser={handleSelectUser}
                    currentUserId={currentUserId} adminConfig={adminConfig} getUserActivePlan={getUserActivePlan}
                    setNotification={setNotification} loadingProfile={loadingProfile} selectedUserProfile={selectedUserProfile}
                    selectedUserPackageState={selectedUserPackageState} setSelectedUserPackageState={setSelectedUserPackageState}
                    handleSaveUserPackage={handleSaveUserPackage} updatingUserPackage={updatingUserPackage} kanjiStats={kanjiStats}
                    getUserPlans={getUserPlans} formatVND={formatVND} handleToggleModerator={handleToggleModerator}
                    savingConfig={savingConfig} setDeleteType={setDeleteType} setConfirmDelete={setConfirmDelete}
                    handleSyncUserByUidOrEmail={handleSyncUserByUidOrEmail}
                    handleSyncAllUsersFromFirestore={handleSyncAllUsersFromFirestore}
                    isSyncingAllUsers={isSyncingAllUsers}
                    onSingleUserCreditsUpdated={(uid, nextCredits) => {
                        setSelectedUserProfile(prev => (selectedUser?.userId === uid ? { ...(prev || {}), aiCreditsRemaining: nextCredits } : prev));
                    }}
                />
            )}

            {activeSection === 'support' && (
                <AdminSupportChatSection users={users} currentUserId={currentUserId} />
            )}

            {activeSection === 'ai' && (
                <AdminAiSection
                    adminConfig={adminConfig}
                    handleChangeFeatureModel={handleChangeFeatureModel}
                    handleSaveFeatureCosts={handleSaveFeatureCosts}
                    savingConfig={savingConfig}
                />
            )}

            {activeSection === 'revenue' && (
                <AdminRevenueSection
                    apiBalances={apiBalances} fetchApiBalances={fetchApiBalances} selectedMonth={selectedMonth}
                    setSelectedMonth={setSelectedMonth} creditRequests={creditRequests} expenses={expenses}
                    users={users} formatVND={formatVND} currentUserId={currentUserId}
                    setNotification={setNotification} savingConfig={savingConfig} setSavingConfig={setSavingConfig}
                />
            )}

            {activeSection === 'features' && (
                <AdminFeaturesSection
                    vouchers={vouchers}
                    globalNotifications={globalNotifications}
                    cacheConfig={cacheConfig}
                    adminConfig={adminConfig}
                    savingConfig={savingConfig}
                    setSavingConfig={setSavingConfig}
                    currentUserId={currentUserId}
                    setNotification={setNotification}
                    formatVND={formatVND}
                    maintenanceMsg={maintenanceMsg}
                    setMaintenanceMsg={setMaintenanceMsg}
                    newNotificationText={newNotificationText}
                    setNewNotificationText={setNewNotificationText}
                    notificationType={notificationType}
                    setNotificationType={setNotificationType}
                    notificationError={notificationError}
                    handleSendNotification={handleSendNotification}
                    sendingNotification={sendingNotification}
                    syncProgress={syncProgress}
                    syncingCache={syncingCache}
                    syncKanjiAndVocab={syncKanjiAndVocab}
                    syncBooks={syncBooks}
                    syncGrammar={syncGrammar}
                    syncJlpt={syncJlpt}
                    syncAllCache={syncAllCache}
                    handleDeleteNotification={handleDeleteNotification}
                    onOpenBroadcastEmailModal={() => setShowBroadcastEmailModal(true)}
                />
            )}

            {/* Modals */}
            <AdminDeleteUserModal
                confirmDelete={confirmDelete} deleteType={deleteType} deleting={deleting}
                setConfirmDelete={setConfirmDelete} setDeleteType={setDeleteType} handleDelete={handleDelete}
            />

            <AdminBroadcastEmailModal
                isOpen={showBroadcastEmailModal}
                onClose={() => setShowBroadcastEmailModal(false)}
                users={users}
                getUserActivePlan={getUserActivePlan}
                currentAdminEmail={import.meta.env.VITE_ADMIN_EMAIL || ''}
            />

            {/* Notification Toast */}
            {notification && (
                <div className={`fixed bottom-4 right-4 z-[10005] px-4 py-3 rounded-2xl border-2 border-b-4 shadow-xl flex items-center gap-2.5 animate-fade-in ${
                    notification.type === 'success'
                        ? 'bg-emerald-500 border-emerald-700 text-white'
                        : notification.type === 'info' || notification.type === 'warning'
                            ? 'bg-amber-500 border-amber-700 text-white'
                            : 'bg-rose-500 border-rose-700 text-white'
                }`}>
                    {notification.type === 'success' ? <CheckCircle className="w-5 h-5 shrink-0" /> : <AlertTriangle className="w-5 h-5 shrink-0" />}
                    <span className="text-xs sm:text-sm font-extrabold">{notification.message}</span>
                </div>
            )}
        </div>
    );
};

export default AdminScreen;
