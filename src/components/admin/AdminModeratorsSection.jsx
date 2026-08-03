import React from 'react';
import { Crown, ShieldCheck, UserCheck } from 'lucide-react';

const AdminModeratorsSection = ({
    adminConfig,
    users,
    currentUserId,
    handleToggleModerator,
    savingConfig
}) => {
    return (
        <div className="space-y-4">
            {/* Info Card */}
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
                <h3 className="font-bold text-amber-800 dark:text-amber-300 flex items-center gap-2 mb-2">
                    <Crown className="w-5 h-5" /> Quản trị viên (Moderator)
                </h3>
                <ul className="text-sm text-amber-700 dark:text-amber-400 space-y-1 ml-7 list-disc">
                    <li>Có thể sử dụng tất cả tính năng AI</li>
                    <li>Có quyền tương đương admin trong ứng dụng</li>
                    <li><strong>Không</strong> được truy cập trang quản lý Admin này</li>
                </ul>
            </div>

            {/* Current Moderators */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
                <h3 className="font-bold text-gray-800 dark:text-white mb-3 flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-amber-500" />
                    Danh sách Quản trị viên ({adminConfig?.moderators?.length || 0})
                </h3>
                {(!adminConfig?.moderators || adminConfig.moderators.length === 0) ? (
                    <p className="text-sm text-gray-400 dark:text-gray-500 italic">
                        Chưa có quản trị viên nào. Chọn người dùng ở tab "Người dùng" để cấp quyền.
                    </p>
                ) : (
                    <div className="space-y-2">
                        {adminConfig.moderators.map(uid => {
                            const user = users.find(u => u.userId === uid);
                            return (
                                <div key={uid} className="flex items-center justify-between p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                                    <div className="flex items-center gap-3">
                                        <div className="w-9 h-9 rounded-full bg-amber-500 flex items-center justify-center text-white font-bold">
                                            {(user?.displayName || '?')[0].toUpperCase()}
                                        </div>
                                        <div>
                                            <p className="font-medium text-gray-800 dark:text-white">
                                                {user?.displayName || uid.slice(0, 15) + '...'}
                                            </p>
                                            <p className="text-xs text-gray-500">
                                                {user?.totalCards || 0} thẻ
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleToggleModerator(uid, user?.displayName || uid)}
                                        disabled={savingConfig}
                                        className="px-3 py-1.5 text-xs font-bold text-red-600 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                                    >
                                        Gỡ quyền
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Add Moderator - quick select from user list */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
                <h3 className="font-bold text-gray-800 dark:text-white mb-3 flex items-center gap-2">
                    <UserCheck className="w-4 h-4 text-emerald-500" />
                    Thêm Quản trị viên
                </h3>
                <div className="max-h-[300px] overflow-y-auto space-y-1">
                    {users.filter(u => u.userId !== currentUserId && !adminConfig?.moderators?.includes(u.userId)).map(user => (
                        <div key={user.userId} className="flex items-center justify-between p-2.5 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-lg transition-colors">
                            <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-full bg-indigo-500 flex items-center justify-center text-white text-xs font-bold">
                                    {(user.displayName || '?')[0].toUpperCase()}
                                </div>
                                <span className="text-sm text-gray-800 dark:text-white">{user.displayName || 'Chưa đặt tên'}</span>
                            </div>
                            <button
                                onClick={() => handleToggleModerator(user.userId, user.displayName)}
                                disabled={savingConfig}
                                className="px-3 py-1.5 text-xs font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 rounded-lg transition-colors"
                            >
                                Cấp quyền
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default AdminModeratorsSection;
