import React from 'react';
import { Settings, ToggleRight, ToggleLeft, Loader2, Save, Bell, Send, Wifi, RefreshCw, Clock, Trash2 } from 'lucide-react';
import { updateAdminConfig } from '../../utils/adminSettings';
import { showConfirm } from '../../utils/toast';

const AdminSystemSection = ({
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
    handleDeleteNotification
}) => {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Maintenance Mode setting card */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 flex flex-col justify-between">
                <div>
                    <h3 className="font-bold text-gray-800 dark:text-white text-lg mb-2 flex items-center gap-2">
                        <Settings className="w-5 h-5 text-indigo-500" />
                        Bảo trì hệ thống
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 leading-relaxed">
                        Khi kích hoạt chế độ bảo trì, chỉ có tài khoản Admin mới có thể truy cập được ứng dụng. Người dùng thông thường khi vào QuizKi sẽ thấy màn hình thông báo bảo trì.
                    </p>

                    <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                        <div className="flex flex-col gap-1">
                            <span className="font-bold text-sm text-slate-800 dark:text-white">Trạng thái bảo trì</span>
                            <span className="text-xs text-slate-400 dark:text-slate-500">
                                {adminConfig?.maintenanceMode ? 'Đang bật' : 'Đang tắt'}
                            </span>
                        </div>
                        <button
                            onClick={async () => {
                                setSavingConfig(true);
                                const newStatus = !adminConfig?.maintenanceMode;
                                const ok = await updateAdminConfig({ maintenanceMode: newStatus }, currentUserId);
                                if (ok) {
                                    setNotification({
                                        type: 'success',
                                        message: newStatus ? 'Đã bật chế độ bảo trì' : 'Đã tắt chế độ bảo trì'
                                    });
                                } else {
                                    setNotification({ type: 'error', message: 'Lỗi khi cập nhật trạng thái bảo trì' });
                                }
                                setSavingConfig(false);
                            }}
                            disabled={savingConfig}
                            className="p-1 rounded-full cursor-pointer focus:outline-none transition-colors"
                        >
                            {adminConfig?.maintenanceMode ? (
                                <ToggleRight className="w-12 h-12 text-[#2E5B70] dark:text-sky-400" />
                            ) : (
                                <ToggleLeft className="w-12 h-12 text-slate-300 dark:text-slate-600" />
                            )}
                        </button>
                    </div>

                    <div className="mt-5 space-y-2 border-t border-slate-100 dark:border-slate-800 pt-4">
                        <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">
                            Dòng thông báo hiển thị khi bảo trì
                        </label>
                        <textarea
                            value={maintenanceMsg}
                            onChange={(e) => setMaintenanceMsg(e.target.value)}
                            placeholder="QuizKi đang thực hiện nâng cấp và bảo trì định kỳ để mang lại trải nghiệm tốt nhất cho bạn. Chúng tôi sẽ trở lại trong thời gian sớm nhất."
                            rows={3}
                            className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-750/50 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-sm text-gray-800 dark:text-white resize-none"
                        />
                        <button
                            onClick={async () => {
                                setSavingConfig(true);
                                const ok = await updateAdminConfig({ maintenanceMessage: maintenanceMsg.trim() }, currentUserId);
                                if (ok) {
                                    setNotification({
                                        type: 'success',
                                        message: 'Đã cập nhật dòng thông báo bảo trì'
                                    });
                                } else {
                                    setNotification({ type: 'error', message: 'Lỗi khi cập nhật thông báo bảo trì' });
                                }
                                setSavingConfig(false);
                            }}
                            disabled={savingConfig || maintenanceMsg.trim() === (adminConfig?.maintenanceMessage || '')}
                            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-sm cursor-pointer disabled:opacity-50"
                        >
                            {savingConfig ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                            Lưu dòng thông báo
                        </button>
                    </div>
                </div>
            </div>

            {/* Global notification creation card */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                <h3 className="font-bold text-gray-800 dark:text-white text-lg mb-2 flex items-center gap-2">
                    <Bell className="w-5 h-5 text-indigo-500" />
                    Gửi thông báo hệ thống
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                    Gửi một thông báo chung tới hộp thư của tất cả người dùng trên hệ thống.
                </p>

                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1.5">Tiêu đề thông báo</label>
                        <input
                            type="text"
                            value={newNotificationText.title}
                            onChange={(e) => setNewNotificationText(prev => ({ ...prev, title: e.target.value }))}
                            placeholder="Ví dụ: Cập nhật tính năng mới..."
                            className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-sm text-gray-800 dark:text-white"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1.5">Nội dung thông báo</label>
                        <textarea
                            value={newNotificationText.message}
                            onChange={(e) => setNewNotificationText(prev => ({ ...prev, message: e.target.value }))}
                            placeholder="Nhập nội dung chi tiết..."
                            rows={3}
                            className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-sm text-gray-800 dark:text-white resize-none"
                        />
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                        <input
                            type="checkbox"
                            id="checkbox-notification-type"
                            checked={notificationType === 'popup'}
                            onChange={(e) => setNotificationType(e.target.checked ? 'popup' : 'normal')}
                            className="w-4 h-4 rounded text-indigo-650 border-gray-300 focus:ring-indigo-500 dark:border-gray-700 dark:bg-gray-800 cursor-pointer"
                        />
                        <label htmlFor="checkbox-notification-type" className="text-xs font-bold text-gray-500 dark:text-gray-400 cursor-pointer select-none uppercase">
                            Hiện Popup (Modal) khi người dùng truy cập web
                        </label>
                    </div>

                    {notificationError && (
                        <p className="text-xs text-red-500 font-medium">{notificationError}</p>
                    )}

                    <button
                        onClick={handleSendNotification}
                        disabled={sendingNotification || !newNotificationText.title.trim() || !newNotificationText.message.trim()}
                        className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 transition-all cursor-pointer shadow-sm"
                    >
                        {sendingNotification ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                        Gửi thông báo
                    </button>
                </div>
            </div>

            {/* CDN Cache Synchronization setting card */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 md:col-span-2">
                <h3 className="font-bold text-gray-800 dark:text-white text-lg mb-2 flex items-center gap-2">
                    <Wifi className="w-5 h-5 text-emerald-500" />
                    Quản lý Bộ nhớ đệm CDN (Cache Sync)
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 leading-relaxed">
                    Xuất dữ liệu từ Firestore thành các file JSON tĩnh và lưu trữ trên Firebase Storage CDN để giảm tải Firestore đọc (reads) và tăng tốc độ tải màn hình cho học sinh.
                </p>

                {syncProgress && (
                    <div className="mb-6 p-4 bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40 rounded-2xl flex items-center gap-3 text-indigo-700 dark:text-indigo-300 text-sm font-medium animate-pulse">
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>{syncProgress}</span>
                    </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    {/* Kanji Card */}
                    <div className="p-4 bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800 rounded-2xl space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="font-bold text-sm text-slate-800 dark:text-white">Kanji & Từ vựng</span>
                            <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${cacheConfig?.kanjiUrl ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-450' : 'bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-450'}`}>
                                {cacheConfig?.kanjiUrl ? 'Đã bật' : 'Chưa có'}
                            </span>
                        </div>
                        <p className="text-[11px] text-slate-400 dark:text-slate-500">
                            {cacheConfig?.kanjiUrl && cacheConfig?.exportedAt ? `Cập nhật: ${new Date(cacheConfig.exportedAt).toLocaleString('vi-VN')}` : 'Chưa đồng bộ'}
                        </p>
                        <button
                            onClick={() => syncKanjiAndVocab()}
                            disabled={Object.values(syncingCache).some(Boolean)}
                            className="w-full py-2 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                        >
                            {syncingCache.kanji ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                            Đồng bộ ngay
                        </button>
                    </div>

                    {/* Books Card */}
                    <div className="p-4 bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800 rounded-2xl space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="font-bold text-sm text-slate-800 dark:text-white">Kho sách</span>
                            <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${cacheConfig?.booksUrl ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-450' : 'bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-450'}`}>
                                {cacheConfig?.booksUrl ? 'Đã bật' : 'Chưa có'}
                            </span>
                        </div>
                        <p className="text-[11px] text-slate-400 dark:text-slate-500">
                            {cacheConfig?.booksUrl && cacheConfig?.exportedAt ? `Cập nhật: ${new Date(cacheConfig.exportedAt).toLocaleString('vi-VN')}` : 'Chưa đồng bộ'}
                        </p>
                        <button
                            onClick={() => syncBooks()}
                            disabled={Object.values(syncingCache).some(Boolean)}
                            className="w-full py-2 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                        >
                            {syncingCache.books ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                            Đồng bộ ngay
                        </button>
                    </div>

                    {/* Grammar Card */}
                    <div className="p-4 bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800 rounded-2xl space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="font-bold text-sm text-slate-800 dark:text-white">Ngữ pháp</span>
                            <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${cacheConfig?.grammarUrl ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-450' : 'bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-450'}`}>
                                {cacheConfig?.grammarUrl ? 'Đã bật' : 'Chưa có'}
                            </span>
                        </div>
                        <p className="text-[11px] text-slate-400 dark:text-slate-500">
                            {cacheConfig?.grammarUrl && cacheConfig?.exportedAt ? `Cập nhật: ${new Date(cacheConfig.exportedAt).toLocaleString('vi-VN')}` : 'Chưa đồng bộ'}
                        </p>
                        <button
                            onClick={() => syncGrammar()}
                            disabled={Object.values(syncingCache).some(Boolean)}
                            className="w-full py-2 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                        >
                            {syncingCache.grammar ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                            Đồng bộ ngay
                        </button>
                    </div>

                    {/* JLPT Card */}
                    <div className="p-4 bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800 rounded-2xl space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="font-bold text-sm text-slate-800 dark:text-white">Đề thi JLPT</span>
                            <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${cacheConfig?.jlptUrl ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-450' : 'bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-450'}`}>
                                {cacheConfig?.jlptUrl ? 'Đã bật' : 'Chưa có'}
                            </span>
                        </div>
                        <p className="text-[11px] text-slate-400 dark:text-slate-500">
                            {cacheConfig?.jlptUrl && cacheConfig?.exportedAt ? `Cập nhật: ${new Date(cacheConfig.exportedAt).toLocaleString('vi-VN')}` : 'Chưa đồng bộ'}
                        </p>
                        <button
                            onClick={() => syncJlpt()}
                            disabled={Object.values(syncingCache).some(Boolean)}
                            className="w-full py-2 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                        >
                            {syncingCache.jlpt ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                            Đồng bộ ngay
                        </button>
                    </div>
                </div>

                <button
                    onClick={syncAllCache}
                    disabled={Object.values(syncingCache).some(Boolean)}
                    className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-bold text-sm rounded-xl flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all cursor-pointer disabled:opacity-50"
                >
                    {syncingCache.all ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                    Đồng bộ tất cả dữ liệu (Full Sync)
                </button>
            </div>

            {/* Notification History card */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 md:col-span-2">
                <h3 className="font-bold text-gray-800 dark:text-white text-lg mb-3 flex items-center gap-2">
                    <Clock className="w-5 h-5 text-slate-500" />
                    Lịch sử thông báo đã gửi
                </h3>
                {globalNotifications.length === 0 ? (
                    <p className="text-sm text-gray-400 italic py-6 text-center border border-dashed border-gray-200 dark:border-gray-700 rounded-2xl">
                        Chưa có thông báo nào được gửi.
                    </p>
                ) : (
                    <div className="space-y-3 max-h-[300px] overflow-y-auto">
                        {globalNotifications.map(notif => (
                            <div key={notif.id} className="p-4 rounded-xl border border-gray-100 dark:border-gray-700 bg-slate-50/50 dark:bg-slate-800/40 flex items-start justify-between gap-4">
                                <div className="overflow-hidden flex-1 min-w-0">
                                    <h4 className="font-bold text-sm text-gray-800 dark:text-white flex items-center gap-2">
                                        <span className="truncate">{notif.title}</span>
                                        {notif.type === 'popup' && (
                                            <span className="text-[10px] px-1.5 py-0.5 bg-amber-500 text-white rounded-full font-black uppercase flex-shrink-0">Popup</span>
                                        )}
                                    </h4>
                                    <p className="text-xs text-gray-600 dark:text-gray-300 mt-1 whitespace-pre-wrap">{notif.message}</p>
                                    <span className="text-[10px] text-gray-400 dark:text-gray-500 mt-2 block">
                                        Gửi vào: {new Date(notif.createdAt).toLocaleString('vi-VN')}
                                    </span>
                                </div>
                                <button
                                    onClick={async () => {
                                        if (await showConfirm('Bạn có chắc chắn muốn xóa thông báo này?', { type: 'danger', confirmText: 'Xóa' })) {
                                            await handleDeleteNotification(notif.id);
                                        }
                                    }}
                                    className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg transition-colors flex-shrink-0"
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
    );
};

export default AdminSystemSection;
