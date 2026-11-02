import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Plus, BookMarked, Edit3, Trash2, Edit, Sparkles, BookOpen } from 'lucide-react';
import { getAuth } from 'firebase/auth';
import { TopTabBar } from '../ui';
import { GRAMMAR_TABS } from '../../config/tabs';
import { getGrammarNotebooks, getCachedGrammarNotebooks, deleteGrammarNotebook, saveGrammarNotebook } from '../../utils/grammarNotebookService';
import { showToast } from '../../utils/toast';

export const GrammarNotebookListScreen = ({ profile = null }) => {
    const navigate = useNavigate();
    const auth = getAuth();
    const userId = auth?.currentUser?.uid;

    const [notebooks, setNotebooks] = useState(() => getCachedGrammarNotebooks(userId));
    const [loading, setLoading] = useState(() => {
        const cached = getCachedGrammarNotebooks(userId);
        return !cached || cached.length === 0;
    });

    // Rename Modal State
    const [renameModalOpen, setRenameModalOpen] = useState(false);
    const [selectedNotebook, setSelectedNotebook] = useState(null);
    const [newTitle, setNewTitle] = useState('');

    // Create Modal State
    const [createModalOpen, setCreateModalOpen] = useState(false);
    const [createTitle, setCreateTitle] = useState('');

    const loadNotebooks = async (forceSpinner = false) => {
        if (forceSpinner) setLoading(true);
        try {
            const list = await getGrammarNotebooks(userId);
            if (list) setNotebooks(list);
        } catch (e) {
            console.warn('Error loading notebooks:', e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const cached = getCachedGrammarNotebooks(userId);
        if (cached && cached.length > 0) {
            setNotebooks(cached);
            setLoading(false);
        }
        loadNotebooks(false);
    }, [userId]);

    const handleDelete = async (e, nb) => {
        e.stopPropagation();
        const confirmed = window.showConfirm
            ? await window.showConfirm(`Bạn có chắc muốn xóa sổ tay "${nb.title}"?`, { type: 'danger', confirmText: 'Xóa ngay' })
            : window.confirm(`Bạn có chắc muốn xóa sổ tay "${nb.title}"?`);

        if (!confirmed) return;

        try {
            await deleteGrammarNotebook(userId, nb.id);
            setNotebooks(prev => prev.filter(item => item.id !== nb.id));
            showToast(`Đã xóa sổ tay "${nb.title}"`, 'success');
        } catch (err) {
            showToast('Lỗi khi xóa sổ tay', 'error');
        }
    };

    const handleOpenRename = (e, nb) => {
        e.stopPropagation();
        setSelectedNotebook(nb);
        setNewTitle(nb.title);
        setRenameModalOpen(true);
    };

    const handleSaveRename = async () => {
        if (!selectedNotebook || !newTitle.trim()) return;
        try {
            const updated = await saveGrammarNotebook(userId, {
                ...selectedNotebook,
                title: newTitle.trim()
            });
            setNotebooks(prev => prev.map(nb => nb.id === updated.id ? updated : nb));
            showToast('Đã đổi tên sổ tay!', 'success');
            setRenameModalOpen(false);
        } catch (err) {
            showToast('Lỗi khi đổi tên', 'error');
        }
    };

    return (
        <div className="w-full pb-16 bg-transparent min-h-screen">
            <TopTabBar tabs={GRAMMAR_TABS} />

            <div className="max-w-6xl mx-auto px-4 sm:px-6 md:px-8 mt-4 space-y-6 animate-fade-in">
                {/* Back to Home / Header Banner */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                        <button
                            onClick={() => navigate('/grammar/curriculum')}
                            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-emerald-600 dark:text-slate-400 dark:hover:text-emerald-400 mb-1 transition-colors cursor-pointer"
                        >
                            <ChevronLeft className="w-4 h-4" />
                            <span>Trang chủ</span>
                        </button>
                        <div className="flex items-center gap-2.5">
                            <span className="text-2xl sm:text-3xl select-none">📖</span>
                            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                                Sổ tay ngữ pháp
                            </h1>
                        </div>
                        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium max-w-2xl leading-relaxed">
                            Tự ghi chú các mẫu ngữ pháp quan trọng, sắp xếp theo chủ đề riêng của bạn rồi ôn bằng flashcard
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={() => {
                            setCreateTitle('');
                            setCreateModalOpen(true);
                        }}
                        className="self-start sm:self-center flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-sky-500 hover:bg-sky-400 border-2 border-b-4 border-sky-700 text-white font-black text-xs sm:text-sm shadow-md transition-all cursor-pointer select-none active:translate-y-0.5 active:border-b-2"
                    >
                        <Plus className="w-4 h-4 stroke-[3]" />
                        <span>Tạo sổ tay mới</span>
                    </button>
                </div>

                {/* Notebooks List or Empty State */}
                {loading ? (
                    <div className="py-16 text-center text-slate-400 font-medium animate-pulse">
                        Đang tải danh sách sổ tay...
                    </div>
                ) : notebooks.length === 0 ? (
                    /* Empty State (Matches Image 1) */
                    <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xs border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-3xl p-10 sm:p-16 flex flex-col items-center justify-center text-center space-y-4 shadow-xs">
                        <div className="w-16 h-16 rounded-2xl bg-sky-50 dark:bg-sky-950/50 border-2 border-sky-200 dark:border-sky-800 text-sky-500 flex items-center justify-center">
                            <BookMarked className="w-8 h-8 stroke-[1.8]" />
                        </div>
                        <div className="space-y-1">
                            <h3 className="text-lg sm:text-xl font-black text-slate-800 dark:text-white">
                                Chưa có sổ tay ngữ pháp nào
                            </h3>
                            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium max-w-md">
                                Tạo sổ tay đầu tiên để ghi chú các mẫu ngữ pháp của bạn.
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={() => {
                                setCreateTitle('');
                                setCreateModalOpen(true);
                            }}
                            className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-sky-500 hover:bg-sky-400 border-2 border-b-4 border-sky-700 text-white font-black text-sm shadow-md transition-all cursor-pointer select-none active:translate-y-0.5 active:border-b-2 mt-2"
                        >
                            <Plus className="w-4 h-4 stroke-[3]" />
                            <span>Tạo sổ tay đầu tiên</span>
                        </button>
                    </div>
                ) : (
                    /* Notebook Cards Grid (Matches Image 2) */
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {notebooks.map((nb) => {
                            const count = nb.items?.length || 0;
                            return (
                                <div
                                    key={nb.id}
                                    onClick={() => navigate(`/grammar/notebook/${nb.id}`)}
                                    className="group bg-white/95 dark:bg-slate-900/95 backdrop-blur-xs border-2 border-b-4 border-slate-200 dark:border-slate-800 rounded-3xl p-5 hover:border-sky-400 dark:hover:border-sky-500 hover:shadow-lg transition-all cursor-pointer flex flex-col justify-between select-none"
                                >
                                    {/* Top Content */}
                                    <div className="flex items-start gap-4">
                                        <div className="w-14 h-14 rounded-2xl bg-sky-50 dark:bg-sky-950/60 border-2 border-sky-200 dark:border-sky-800 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform shadow-xs">
                                            <BookMarked className="w-7 h-7 stroke-[2]" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white truncate group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors">
                                                {nb.title}
                                            </h3>
                                            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                                                {count} mẫu ngữ pháp
                                            </p>
                                        </div>
                                    </div>

                                    {/* Action Bar (Matches Image 2: Sửa, Đổi tên, Xoá) */}
                                    <div className="mt-5 pt-3.5 border-t border-slate-100 dark:border-slate-800 grid grid-cols-3 gap-1">
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                navigate(`/grammar/notebook/${nb.id}/edit`);
                                            }}
                                            className="flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                                            title="Chỉnh sửa nội dung sổ tay"
                                        >
                                            <Edit className="w-3.5 h-3.5 text-sky-500" />
                                            <span>Sửa</span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={(e) => handleOpenRename(e, nb)}
                                            className="flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer border-x border-slate-100 dark:border-slate-800"
                                            title="Đổi tên sổ tay"
                                        >
                                            <Edit3 className="w-3.5 h-3.5 text-amber-500" />
                                            <span>Đổi tên</span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={(e) => handleDelete(e, nb)}
                                            className="flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-xl text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                                            title="Xóa sổ tay"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                            <span>Xoá</span>
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Quick Rename Modal */}
            {renameModalOpen && (
                <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
                    <div className="bg-white dark:bg-slate-900 border-2 border-b-4 border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
                        <h3 className="text-base font-black text-slate-900 dark:text-white">
                            Đổi tên sổ tay
                        </h3>
                        <input
                            type="text"
                            value={newTitle}
                            onChange={(e) => setNewTitle(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && newTitle.trim()) {
                                    handleSaveRename();
                                }
                            }}
                            placeholder="Nhập tên mới..."
                            className="w-full text-sm font-bold px-4 py-3 bg-slate-50 dark:bg-slate-950 border-2 border-slate-200 dark:border-slate-800 rounded-2xl outline-none focus:border-sky-500 dark:text-white"
                            autoFocus
                        />
                        <div className="flex gap-2 justify-end pt-2">
                            <button
                                type="button"
                                onClick={() => setRenameModalOpen(false)}
                                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                            >
                                Hủy
                            </button>
                            <button
                                type="button"
                                onClick={handleSaveRename}
                                disabled={!newTitle.trim()}
                                className="px-5 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 border-b-2 border-sky-700 text-white text-xs font-black transition-all cursor-pointer disabled:opacity-50"
                            >
                                Lưu tên mới
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Create Notebook Modal (Prompt for Title) */}
            {createModalOpen && (
                <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
                    <div className="bg-white dark:bg-slate-900 border-2 border-b-4 border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
                        <div className="flex items-center gap-2.5">
                            <div className="w-9 h-9 rounded-xl bg-sky-50 dark:bg-sky-950/60 border border-sky-200 dark:border-sky-800 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0">
                                <BookMarked className="w-5 h-5" />
                            </div>
                            <h3 className="text-base font-black text-slate-900 dark:text-white">
                                Đặt tên cho sổ tay mới
                            </h3>
                        </div>
                        <input
                            type="text"
                            value={createTitle}
                            onChange={(e) => setCreateTitle(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    setCreateModalOpen(false);
                                    navigate('/grammar/notebook/create' + (createTitle.trim() ? `?title=${encodeURIComponent(createTitle.trim())}` : ''));
                                }
                            }}
                            placeholder="VD: Tổng hợp ngữ pháp N3, Mẫu chỉ mục đích..."
                            className="w-full text-sm font-bold px-4 py-3 bg-slate-50 dark:bg-slate-950 border-2 border-slate-200 dark:border-slate-800 rounded-2xl outline-none focus:border-sky-500 dark:text-white"
                            autoFocus
                        />
                        <div className="flex gap-2 justify-end pt-2">
                            <button
                                type="button"
                                onClick={() => setCreateModalOpen(false)}
                                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                            >
                                Hủy
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setCreateModalOpen(false);
                                    navigate('/grammar/notebook/create' + (createTitle.trim() ? `?title=${encodeURIComponent(createTitle.trim())}` : ''));
                                }}
                                className="px-5 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 border-b-2 border-sky-700 text-white text-xs font-black transition-all cursor-pointer"
                            >
                                Bắt đầu soạn
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default GrammarNotebookListScreen;

