import React, { useState } from 'react';
import { Ticket, Bell, Wifi, ShieldAlert, Sparkles } from 'lucide-react';
import AdminVouchersSection from './AdminVouchersSection';
import AdminSystemSection from './AdminSystemSection';
import { updateAdminConfig } from '../../utils/adminSettings';

const AdminFeaturesSection = ({
    vouchers = [],
    globalNotifications = [],
    cacheConfig,
    adminConfig,
    savingConfig,
    setSavingConfig,
    currentUserId,
    setNotification,
    formatVND,
    maintenanceMsg,
    setMaintenanceMsg,
    newNotificationText,
    setNewNotificationText,
    notificationType,
    setNotificationType,
    notificationError,
    handleSendNotification,
    sendingNotification,
    syncProgress,
    syncingCache,
    syncKanjiAndVocab,
    syncBooks,
    syncGrammar,
    syncJlpt,
    syncAllCache,
    handleDeleteNotification,
    onOpenBroadcastEmailModal
}) => {
    const [subTab, setSubTab] = useState('vouchers'); // 'vouchers' | 'notifications' | 'system'

    const activeVouchersCount = vouchers.filter(v => {
        const exp = v.expiresAt ? (v.expiresAt?.toDate ? v.expiresAt.toDate() : new Date(v.expiresAt)) : null;
        const isExpired = Boolean(exp && new Date() > exp);
        const isUsedUp = v.maxUses > 0 && v.usedCount >= v.maxUses;
        return Boolean(v.active && !isExpired && !isUsedUp);
    }).length;

    const syncedCdnCount = [
        cacheConfig?.kanjiUrl,
        cacheConfig?.booksUrl,
        cacheConfig?.grammarUrl,
        cacheConfig?.jlptUrl
    ].filter(Boolean).length;

    const handleToggleMaintenance = async () => {
        setSavingConfig(true);
        const nextVal = !adminConfig?.maintenanceMode;
        const ok = await updateAdminConfig({ maintenanceMode: nextVal }, currentUserId);
        setNotification(ok
            ? { type: 'success', message: nextVal ? 'Đã bật chế độ bảo trì hệ thống' : 'Đã tắt chế độ bảo trì hệ thống' }
            : { type: 'error', message: 'Lỗi khi cập nhật Chế độ bảo trì' }
        );
        setSavingConfig(false);
    };

    const subTabs = [
        { id: 'vouchers', label: 'Voucher & Ưu đãi', icon: Ticket, count: activeVouchersCount },
        { id: 'notifications', label: 'Thông báo & Email', icon: Bell, count: globalNotifications.length },
        { id: 'system', label: 'Bảo trì & CDN', icon: Wifi, count: `${syncedCdnCount}/4` },
    ];

    return (
        <div className="space-y-5">
            {/* Feature Control Strip */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <button
                    type="button"
                    disabled={savingConfig}
                    onClick={handleToggleMaintenance}
                    className={`text-left p-4 rounded-2xl border-2 border-b-4 transition-all cursor-pointer active:translate-y-0.5 active:border-b-2 ${
                        adminConfig?.maintenanceMode
                            ? 'bg-rose-50 dark:bg-rose-950/30 border-rose-300 dark:border-rose-700'
                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700/80 hover:border-emerald-400'
                    }`}
                >
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                        <ShieldAlert className={`w-4 h-4 ${adminConfig?.maintenanceMode ? 'text-rose-500' : 'text-emerald-500'}`} />
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                            adminConfig?.maintenanceMode
                                ? 'bg-rose-500 text-white'
                                : 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                        }`}>
                            {adminConfig?.maintenanceMode ? 'Đang bảo trì' : 'Online'}
                        </span>
                    </div>
                    <p className="text-xs font-extrabold text-slate-800 dark:text-white">Chế độ bảo trì</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Nhấn để bật / tắt nhanh</p>
                </button>

                <button
                    type="button"
                    onClick={() => setSubTab('vouchers')}
                    className={`text-left p-4 rounded-2xl border-2 border-b-4 transition-all cursor-pointer ${
                        subTab === 'vouchers'
                            ? 'bg-amber-50/70 dark:bg-amber-950/30 border-amber-400 dark:border-amber-600'
                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700/80 hover:border-amber-300'
                    }`}
                >
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                        <Ticket className="w-4 h-4 text-amber-500" />
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300">
                            {activeVouchersCount} đang chạy
                        </span>
                    </div>
                    <p className="text-xs font-extrabold text-slate-800 dark:text-white">Voucher khuyến mãi</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Tổng {vouchers.length} mã đã tạo</p>
                </button>

                <button
                    type="button"
                    onClick={() => setSubTab('notifications')}
                    className={`text-left p-4 rounded-2xl border-2 border-b-4 transition-all cursor-pointer ${
                        subTab === 'notifications'
                            ? 'bg-sky-50/70 dark:bg-sky-950/30 border-sky-400 dark:border-sky-600'
                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700/80 hover:border-sky-300'
                    }`}
                >
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                        <Bell className="w-4 h-4 text-sky-500" />
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-sky-100 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300">
                            {globalNotifications.length} đã gửi
                        </span>
                    </div>
                    <p className="text-xs font-extrabold text-slate-800 dark:text-white">Thông báo & Email</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Popup & Broadcast Mail</p>
                </button>

                <button
                    type="button"
                    onClick={() => setSubTab('system')}
                    className={`text-left p-4 rounded-2xl border-2 border-b-4 transition-all cursor-pointer ${
                        subTab === 'system'
                            ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-400 dark:border-emerald-600'
                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700/80 hover:border-emerald-300'
                    }`}
                >
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                        <Sparkles className="w-4 h-4 text-emerald-500" />
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
                            {syncedCdnCount}/4 CDN
                        </span>
                    </div>
                    <p className="text-xs font-extrabold text-slate-800 dark:text-white">Bộ nhớ đệm CDN</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Đồng bộ dữ liệu tĩnh</p>
                </button>
            </div>

            {/* Sub-Tabs Selector */}
            <div className="flex flex-wrap gap-2 bg-slate-100 dark:bg-slate-900/90 border-2 border-slate-200 dark:border-slate-700/80 rounded-2xl p-1.5">
                {subTabs.map(tab => {
                    const isActive = subTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            type="button"
                            onClick={() => setSubTab(tab.id)}
                            className={`flex-1 min-w-[140px] flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-extrabold transition-all cursor-pointer whitespace-nowrap ${
                                isActive
                                    ? 'bg-emerald-500 text-white border-b-4 border-emerald-700 shadow-sm'
                                    : 'text-slate-600 dark:text-slate-400 hover:bg-white/70 dark:hover:bg-slate-800'
                            }`}
                        >
                            <tab.icon className="w-4 h-4 shrink-0" />
                            <span>{tab.label}</span>
                            <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${
                                isActive
                                    ? 'bg-white/20 text-white'
                                    : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                            }`}>
                                {tab.count}
                            </span>
                        </button>
                    );
                })}
            </div>

            {/* Active Panel */}
            {subTab === 'vouchers' && (
                <AdminVouchersSection
                    vouchers={vouchers}
                    currentUserId={currentUserId}
                    setNotification={setNotification}
                    formatVND={formatVND}
                    savingConfig={savingConfig}
                    setSavingConfig={setSavingConfig}
                />
            )}

            {(subTab === 'notifications' || subTab === 'system') && (
                <AdminSystemSection
                    viewMode={subTab}
                    adminConfig={adminConfig}
                    savingConfig={savingConfig}
                    setSavingConfig={setSavingConfig}
                    currentUserId={currentUserId}
                    setNotification={setNotification}
                    maintenanceMsg={maintenanceMsg}
                    setMaintenanceMsg={setMaintenanceMsg}
                    newNotificationText={newNotificationText}
                    setNewNotificationText={setNewNotificationText}
                    notificationType={notificationType}
                    setNotificationType={setNotificationType}
                    notificationError={notificationError}
                    handleSendNotification={handleSendNotification}
                    sendingNotification={sendingNotification}
                    cacheConfig={cacheConfig}
                    syncProgress={syncProgress}
                    syncingCache={syncingCache}
                    syncKanjiAndVocab={syncKanjiAndVocab}
                    syncBooks={syncBooks}
                    syncGrammar={syncGrammar}
                    syncJlpt={syncJlpt}
                    syncAllCache={syncAllCache}
                    globalNotifications={globalNotifications}
                    handleDeleteNotification={handleDeleteNotification}
                    onOpenBroadcastEmailModal={onOpenBroadcastEmailModal}
                />
            )}
        </div>
    );
};

export default AdminFeaturesSection;
