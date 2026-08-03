import React from 'react';
import { AlertTriangle } from 'lucide-react';

const AdminDeleteDictModal = ({
    deletingDictItem,
    setDeletingDictItem,
    handleDeleteDictItem
}) => {
    if (!deletingDictItem) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[10000] flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 max-w-sm w-full shadow-2xl animate-bounce-in text-center">
                <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Xóa khỏi kho từ vựng chung?</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                    Bạn có chắc chắn muốn xóa từ vựng này khỏi kho từ vựng dùng chung? Người dùng khác sẽ không thể tra cứu từ này nữa (nhưng không mất các từ họ đã lưu về thư viện riêng).
                </p>
                <div className="flex items-center justify-center gap-3">
                    <button
                        onClick={() => setDeletingDictItem(null)}
                        className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-750 dark:hover:bg-gray-700 text-gray-700 dark:text-slate-200 rounded-xl font-bold text-sm transition-all cursor-pointer"
                    >
                        Hủy
                    </button>
                    <button
                        onClick={handleDeleteDictItem}
                        className="flex-1 py-2.5 bg-red-600 hover:bg-red-750 text-white rounded-xl font-bold text-sm transition-all cursor-pointer"
                    >
                        Xóa ngay
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AdminDeleteDictModal;
