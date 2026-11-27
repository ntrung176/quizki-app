import React from 'react';
import { Settings, ToggleRight, ToggleLeft, Loader2, Save, Bell, Send, Wifi, RefreshCw, Clock, Trash2, Mail } from 'lucide-react';
import { updateAdminConfig } from '../../utils/adminSettings';
import { showConfirm } from '../../utils/toast';

const AdminSystemSection = ({
    viewMode = 'all', // 'notifications' | 'system' | 'all'
    adminConfig,
    savingConfig,
    setSavingConfig,
    currentUserId,
    setNotification,
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
    cacheConfig,
    syncingCache,
    syncKanjiAndVocab,
    syncBooks,
    syncGrammar,
    syncJlpt,
    syncAllCache,
    globalNotifications,
    handleDeleteNotification,
    onOpenBroadcastEmailModal
}) => {
    const showNotifications = viewMode === 'notifications' || viewMode === 'all';
    const showSystem = viewMode === 'system' || viewMode === 'all';

    const cacheCards = [
        { key: 'kanji', label: 'Kanji & Từ vựng', ready: Boolean(cacheConfig?.kanjiUrl), action: syncKanjiAndVocab, spinning: syncingCache.kanji },
        { key: 'books', label: 'Kho sách', ready: Boolean(cacheConfig?.booksUrl), action: syncBooks, spinning: syncingCache.books },
        { key: 'grammar', label: 'Ngữ pháp', ready: Boolean(cacheConfig?.grammarUrl), action: syncGrammar, spinning: syncingCache.grammar },
        { key: 'jlpt', label: 'Đề thi JLPT', ready: Boolean(cacheConfig?.jlptUrl), action: syncJlpt, spinning: syncingCache.jlpt },
    ];

    return (
        <div className="space-y-5">
            {/* Notifications & Broadcast Email View */}
            {showNotifications && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
                    {/* Left: Send Notification */}
                    <div className="lg:col-span-5 bg-white dark:bg-slate-900 rounded-3xl border-2 border-slate-200 dark:border-slate-700/80 p-5 space-y-4 shadow-sm">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-sky-500 border-b-4 border-sky-700 text-white flex items-center justify-center shrink-0">
                                <Bell className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="font-extrabold text-sm text-slate-800 dark:text-white">Gửi thông báo toàn web</h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400">Hiển thị trong hộp thư & popup người dùng</p>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Tiêu đề thông báo</label>
                                <input
                                    type="text"
                                    value={newNotificationText.title}
                                    onChange={(e) => setNewNotificationText(prev => ({ ...prev, title: e.target.value }))}
                                    placeholder="Ví dụ: Ra mắt chế độ ôn tập Trắc nghiệm..."
                                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl focus:border-emerald-500 outline-none text-xs font-semibold text-slate-800 dark:text-white"
                                />
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Nội dung chi tiết</label>
                                <textarea
                                    value={newNotificationText.message}
                                    onChange={(e) => setNewNotificationText(prev => ({ ...prev, message: e.target.value }))}
                                    placeholder="Nhập nội dung thông báo..."
                                    rows={4}
                                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl focus:border-emerald-500 outline-none text-xs text-slate-800 dark:text-white resize-none"
                                />
                            </div>

                            <label className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 cursor-pointer select-none">
                                <input
                                    type="checkbox"
                                    checked={notificationType === 'popup'}
                                    onChange={(e) => setNotificationType(e.target.checked ? 'popup' : 'normal')}
                                    className="w-4 h-4 rounded text-emerald-600 border-slate-300 focus:ring-emerald-500 cursor-pointer"
                                />
                                <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                                    Bật Popup nổi khi học viên vào web
                                </span>
                            </label>

                            {notificationError && <p className="text-xs text-rose-500 font-bold">{notificationError}</p>}

                            <button
                                type="button"
                                onClick={handleSendNotification}
                                disabled={sendingNotification || !newNotificationText.title.trim() || !newNotificationText.message.trim()}
                                className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-600 border-b-4 border-emerald-700 active:translate-y-0.5 active:border-b-2 text-white font-black text-xs uppercase tracking-wider rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 transition-all cursor-pointer"
                            >
                                {sendingNotification ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                Phát thông báo ngay
                            </button>
                        </div>
                    </div>

                    {/* Right: Broadcast Email + History */}
                    <div className="lg:col-span-7 space-y-5">
                        <div className="bg-white dark:bg-slate-900 rounded-3xl border-2 border-emerald-200 dark:border-emerald-800/70 p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="flex items-start gap-3.5">
                                <div className="w-11 h-11 rounded-2xl bg-emerald-500 border-b-4 border-emerald-700 text-white flex items-center justify-center shrink-0">
                                    <Mail className="w-5 h-5" />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">Gửi Email Hàng Loạt</h3>
                                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-black uppercase">
                                            Resend @quizki.space
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                        Gửi email cập nhật tính năng, voucher hoặc thông báo bảo trì tới toàn bộ học viên.
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={onOpenBroadcastEmailModal}
                                className="px-4 py-2.5 bg-sky-500 hover:bg-sky-600 border-b-4 border-sky-700 active:translate-y-0.5 active:border-b-2 text-white font-black text-xs rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer shrink-0"
                            >
                                <Mail className="w-4 h-4" />
                                Soạn Email
                            </button>
                        </div>

                        {/* Notification History */}
                        <div className="bg-white dark:bg-slate-900 rounded-3xl border-2 border-slate-200 dark:border-slate-700/80 p-5 shadow-sm">
                            <h3 className="font-extrabold text-sm text-slate-800 dark:text-white mb-3 flex items-center gap-2">
                                <Clock className="w-4 h-4 text-slate-500" />
                                Lịch sử thông báo ({globalNotifications.length})
                            </h3>
                            {globalNotifications.length === 0 ? (
                                <p className="text-xs text-slate-400 italic py-6 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                                    Chưa có thông báo nào được gửi.
                                </p>
                            ) : (
                                <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
                                    {globalNotifications.map(notif => (
                                        <div key={notif.id} className="p-3.5 rounded-2xl border-2 border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50 flex items-start justify-between gap-3">
                                            <div className="overflow-hidden flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <h4 className="font-extrabold text-xs text-slate-800 dark:text-white truncate">{notif.title}</h4>
                                                    {notif.type === 'popup' && (
                                                        <span className="text-[10px] px-2 py-0.5 bg-amber-500 text-white rounded-full font-black uppercase shrink-0">Popup</span>
                                                    )}
                                                </div>
                                                <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 whitespace-pre-wrap">{notif.message}</p>
                                                <span className="text-[10px] text-slate-400 mt-1.5 block">
                                                    {new Date(notif.createdAt).toLocaleString('vi-VN')}
                                                </span>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={async () => {
                                                    if (await showConfirm('Bạn có chắc chắn muốn xóa thông báo này?', { type: 'danger', confirmText: 'Xóa' })) {
                                                        await handleDeleteNotification(notif.id);
                                                    }
                                                }}
                                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-colors shrink-0 cursor-pointer"
                                                title="Xóa thông báo"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Maintenance & CDN View */}
            {showSystem && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
                    {/* Maintenance Mode Card */}
                    <div className="lg:col-span-5 bg-white dark:bg-slate-900 rounded-3xl border-2 border-slate-200 dark:border-slate-700/80 p-5 space-y-4 shadow-sm">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-amber-500 border-b-4 border-amber-700 text-white flex items-center justify-center shrink-0">
                                <Settings className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="font-extrabold text-sm text-slate-800 dark:text-white">Bảo trì hệ thống</h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400">Chỉ Admin truy cập được app khi đang bật</p>
                            </div>
                        </div>

                        <div className="flex items-center justify-between p-3.5 bg-slate-50 dark:bg-slate-800/70 rounded-2xl border-2 border-slate-200/80 dark:border-slate-700/70">
                            <div>
                                <p className="font-extrabold text-xs text-slate-800 dark:text-white">Trạng thái bảo trì</p>
                                <p className={`text-[11px] font-bold mt-0.5 ${adminConfig?.maintenanceMode ? 'text-rose-500' : 'text-emerald-600 dark:text-emerald-400'}`}>
                                    {adminConfig?.maintenanceMode ? 'Đang bật chế độ bảo trì' : 'Đang hoạt động bình thường'}
                                </p>
                            </div>
                            <button
                                type="button"
                                disabled={savingConfig}
                                onClick={async () => {
                                    setSavingConfig(true);
                                    const newStatus = !adminConfig?.maintenanceMode;
                                    const ok = await updateAdminConfig({ maintenanceMode: newStatus }, currentUserId);
                                    setNotification(ok
                                        ? { type: 'success', message: newStatus ? 'Đã bật chế độ bảo trì' : 'Đã tắt chế độ bảo trì' }
                                        : { type: 'error', message: 'Lỗi khi cập nhật trạng thái bảo trì' }
                                    );
                                    setSavingConfig(false);
                                }}
                                className="cursor-pointer disabled:opacity-50"
                            >
                                {adminConfig?.maintenanceMode
                                    ? <ToggleRight className="w-11 h-11 text-amber-500" />
                                    : <ToggleLeft className="w-11 h-11 text-slate-300 dark:text-slate-600" />
                                }
                            </button>
                        </div>

                        <div className="space-y-2">
                            <label className="block text-[10px] font-black text-slate-400 uppercase">Thông báo hiển thị khi bảo trì</label>
                            <textarea
                                value={maintenanceMsg}
                                onChange={(e) => setMaintenanceMsg(e.target.value)}
                                placeholder="QuizKi đang thực hiện nâng cấp và bảo trì định kỳ..."
                                rows={3}
                                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl focus:border-emerald-500 outline-none text-xs text-slate-800 dark:text-white resize-none"
                            />
                            <button
                                type="button"
                                onClick={async () => {
                                    setSavingConfig(true);
                                    const ok = await updateAdminConfig({ maintenanceMessage: maintenanceMsg.trim() }, currentUserId);
                                    setNotification(ok
                                        ? { type: 'success', message: 'Đã cập nhật dòng thông báo bảo trì' }
                                        : { type: 'error', message: 'Lỗi khi cập nhật thông báo bảo trì' }
                                    );
                                    setSavingConfig(false);
                                }}
                                disabled={savingConfig || maintenanceMsg.trim() === (adminConfig?.maintenanceMessage || '')}
                                className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-600 border-b-4 border-emerald-700 active:translate-y-0.5 active:border-b-2 text-white font-black text-xs uppercase rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                            >
                                {savingConfig ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                                Lưu thông báo bảo trì
                            </button>
                        </div>
                    </div>

                    {/* CDN Cache Sync Card */}
                    <div className="lg:col-span-7 bg-white dark:bg-slate-900 rounded-3xl border-2 border-slate-200 dark:border-slate-700/80 p-5 space-y-4 shadow-sm">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-2xl bg-emerald-500 border-b-4 border-emerald-700 text-white flex items-center justify-center shrink-0">
                                    <Wifi className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="font-extrabold text-sm text-slate-800 dark:text-white">Bộ nhớ đệm CDN (Cache Sync)</h3>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">Xuất dữ liệu tĩnh lên Cloud Storage CDN giảm reads Firestore</p>
                                </div>
                            </div>

                            <button
                                type="button"
                                onClick={syncAllCache}
                                disabled={Object.values(syncingCache).some(Boolean)}
                                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 border-b-4 border-emerald-700 active:translate-y-0.5 active:border-b-2 text-white font-black text-xs rounded-xl flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                            >
                                {syncingCache.all ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                                Full Sync CDN
                            </button>
                        </div>

                        {syncProgress && (
                            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border-2 border-emerald-200 dark:border-emerald-800 rounded-2xl flex items-center gap-2.5 text-emerald-700 dark:text-emerald-300 text-xs font-bold animate-pulse">
                                <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                                <span>{syncProgress}</span>
                            </div>
                        )}

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {cacheCards.map(item => (
                                <div key={item.key} className="p-4 bg-slate-50 dark:bg-slate-800/60 border-2 border-slate-200/80 dark:border-slate-700/70 rounded-2xl space-y-2.5">
                                    <div className="flex items-center justify-between gap-2">
                                        <span className="font-extrabold text-xs text-slate-800 dark:text-white">{item.label}</span>
                                        <span className={`px-2 py-0.5 text-[10px] font-black rounded-full ${
                                            item.ready
                                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                                                : 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                                        }`}>
                                            {item.ready ? 'Đã bật' : 'Chưa có'}
                                        </span>
                                    </div>
                                    <p className="text-[11px] text-slate-400">
                                        {item.ready && cacheConfig?.exportedAt
                                            ? `Cập nhật: ${new Date(cacheConfig.exportedAt).toLocaleString('vi-VN')}`
                                            : 'Chưa đồng bộ'}
                                    </p>
                                    <button
                                        type="button"
                                        onClick={() => item.action()}
                                        disabled={Object.values(syncingCache).some(Boolean)}
                                        className="w-full py-2 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 border-2 border-b-4 border-slate-200 dark:border-slate-700 active:translate-y-0.5 active:border-b-2 text-slate-700 dark:text-slate-200 font-extrabold text-xs rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                                    >
                                        {item.spinning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                                        Đồng bộ ngay
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminSystemSection;
