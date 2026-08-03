import React from 'react';
import { AlertTriangle, Trash2, Loader2 } from 'lucide-react';

const AdminDeleteUserModal = ({
    confirmDelete,
    deleteType,
    deleting,
    setConfirmDelete,
    setDeleteType,
    handleDelete
}) => {
    if (!confirmDelete) return null;

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-sm w-full p-6 space-y-4">
                <div className="text-center">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 ${deleteType === 'kanji' ? 'bg-orange-100 dark:bg-orange-900/30' : 'bg-red-100 dark:bg-red-900/30'}`}>
                        <AlertTriangle className={`w-6 h-6 ${deleteType === 'kanji' ? 'text-orange-600' : 'text-red-600'}`} />
                    </div>
                    <h3 className="text-lg font-bold text-gray-800 dark:text-white">Xác nhận xóa</h3>
                    <p className="text-sm text-gray-500 mt-2">
                        {deleteType === 'kanji'
                            ? <>Bạn có chắc muốn xóa <strong>dữ liệu Kanji SRS</strong> của <strong>{confirmDelete.displayName}</strong>?</>
                            : <>Bạn có chắc muốn xóa <strong>toàn bộ dữ liệu</strong> của <strong>{confirmDelete.displayName}</strong>?</>
                        }
                        <br />Hành động này không thể hoàn tác.
                    </p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={() => { setConfirmDelete(null); setDeleteType('all'); }}
                        disabled={deleting}
                        className="flex-1 px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors cursor-pointer"
                    >
                        Hủy
                    </button>
                    <button
                        onClick={handleDelete}
                        disabled={deleting}
                        className={`flex-1 px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors flex items-center justify-center gap-1 cursor-pointer ${deleteType === 'kanji' ? 'bg-orange-600 hover:bg-orange-700' : 'bg-red-600 hover:bg-red-700'}`}
                    >
                        {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                        Xóa
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AdminDeleteUserModal;
