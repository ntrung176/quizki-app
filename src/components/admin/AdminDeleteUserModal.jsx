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
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 rounded-3xl border-2 border-slate-200 dark:border-slate-700 shadow-2xl max-w-sm w-full p-6 space-y-4">
                <div className="text-center">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3 border-b-4 ${deleteType === 'kanji' ? 'bg-amber-500 border-amber-700 text-white' : 'bg-rose-500 border-rose-700 text-white'}`}>
                        <AlertTriangle className="w-6 h-6" />
                    </div>
                    <h3 className="text-lg font-black text-slate-900 dark:text-white">Xác nhận xóa</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
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
                        className="flex-1 px-4 py-2.5 text-xs font-extrabold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border-2 border-b-4 border-slate-200 dark:border-slate-700 rounded-xl transition-all cursor-pointer"
                    >
                        Hủy
                    </button>
                    <button
                        onClick={handleDelete}
                        disabled={deleting}
                        className={`flex-1 px-4 py-2.5 text-xs font-extrabold text-white rounded-xl border-b-4 active:translate-y-0.5 active:border-b-2 transition-all flex items-center justify-center gap-1 cursor-pointer ${deleteType === 'kanji' ? 'bg-amber-500 hover:bg-amber-600 border-amber-700' : 'bg-rose-500 hover:bg-rose-600 border-rose-700'}`}
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
