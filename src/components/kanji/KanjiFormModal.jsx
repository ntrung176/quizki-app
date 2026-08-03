import React from 'react';
import { X, Folder, Plus } from 'lucide-react';
import { JLPT_LEVELS } from './kanjiConstants';

const KanjiFormModal = ({
    showAddKanjiModal,
    setShowAddKanjiModal,
    handleAddKanji,
    newKanji,
    setNewKanji,
    showAddVocabModal,
    setShowAddVocabModal,
    handleAddVocab,
    newVocab,
    setNewVocab,
    vocabCategories,
    showEditKanjiModal,
    setShowEditKanjiModal,
    handleEditKanji,
    editingKanji,
    setEditingKanji,
    showEditVocabModal,
    setShowEditVocabModal,
    handleEditVocab,
    editingVocab,
    setEditingVocab,
    showCategoryModal,
    setShowCategoryModal,
    newCategoryName,
    setNewCategoryName,
    handleDeleteCategory,
    showFolderSelectModal,
    setShowFolderSelectModal,
    handleConfirmSaveVocab,
    folders,
    selectedModalFolderId,
    setSelectedModalFolderId,
    modalSearchQuery,
    setModalSearchQuery,
    vocabToSave
}) => {
    return (
        <>
            {/* Add Kanji Modal */}
            {showAddKanjiModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowAddKanjiModal(false)}>
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-slate-700">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Thêm Kanji Mới</h3>
                            <button onClick={() => setShowAddKanjiModal(false)} className="p-1 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg cursor-pointer"><X className="w-5 h-5" /></button>
                        </div>
                        <div className="p-4 space-y-4 max-h-[70vh] overflow-y-auto">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Chữ Kanji (*)</label>
                                <input value={newKanji.character} onChange={e => setNewKanji({ ...newKanji, character: e.target.value })}
                                    className="w-full px-3 py-2 border rounded-xl dark:bg-slate-700 dark:border-slate-600 dark:text-white text-lg font-japanese font-bold" placeholder="日" />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Âm Hán Việt</label>
                                    <input value={newKanji.sinoViet} onChange={e => setNewKanji({ ...newKanji, sinoViet: e.target.value })}
                                        className="w-full px-3 py-2 border rounded-xl dark:bg-slate-700 dark:border-slate-600 dark:text-white text-sm" placeholder="NHẬT" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Cấp độ JLPT</label>
                                    <select value={newKanji.level} onChange={e => setNewKanji({ ...newKanji, level: e.target.value })}
                                        className="w-full px-3 py-2 border rounded-xl dark:bg-slate-700 dark:border-slate-600 dark:text-white text-sm">
                                        {JLPT_LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Ý nghĩa tiếng Việt</label>
                                <input value={newKanji.meaning} onChange={e => setNewKanji({ ...newKanji, meaning: e.target.value })}
                                    className="w-full px-3 py-2 border rounded-xl dark:bg-slate-700 dark:border-slate-600 dark:text-white text-sm" placeholder="Mặt trời, ngày" />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Âm Onyomi</label>
                                    <input value={newKanji.onyomi} onChange={e => setNewKanji({ ...newKanji, onyomi: e.target.value })}
                                        className="w-full px-3 py-2 border rounded-xl dark:bg-slate-700 dark:border-slate-600 dark:text-white text-sm" placeholder="ニチ、ジツ" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Âm Kunyomi</label>
                                    <input value={newKanji.kunyomi} onChange={e => setNewKanji({ ...newKanji, kunyomi: e.target.value })}
                                        className="w-full px-3 py-2 border rounded-xl dark:bg-slate-700 dark:border-slate-600 dark:text-white text-sm" placeholder="ひ、-び" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Cách nhớ (Mnemonic)</label>
                                <textarea value={newKanji.mnemonic} onChange={e => setNewKanji({ ...newKanji, mnemonic: e.target.value })}
                                    rows={2} className="w-full px-3 py-2 border rounded-xl dark:bg-slate-700 dark:border-slate-600 dark:text-white text-sm" placeholder="Mô tả câu chuyện dễ nhớ..." />
                            </div>
                        </div>
                        <div className="flex justify-end gap-2 p-4 border-t border-gray-200 dark:border-slate-700">
                            <button onClick={() => setShowAddKanjiModal(false)} className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-xl cursor-pointer">Hủy</button>
                            <button onClick={handleAddKanji} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold cursor-pointer">Lưu Kanji</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Add Vocab Modal */}
            {showAddVocabModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowAddVocabModal(false)}>
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-slate-700">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Thêm Từ Vựng Kanji</h3>
                            <button onClick={() => setShowAddVocabModal(false)} className="p-1 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg cursor-pointer"><X className="w-5 h-5" /></button>
                        </div>
                        <div className="p-4 space-y-4 max-h-[70vh] overflow-y-auto">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Từ vựng (*)</label>
                                <input value={newVocab.word} onChange={e => setNewVocab({ ...newVocab, word: e.target.value })}
                                    className="w-full px-3 py-2 border rounded-xl dark:bg-slate-700 dark:border-slate-600 dark:text-white text-lg font-japanese font-bold" placeholder="日本" />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Cách đọc (Furigana)</label>
                                    <input value={newVocab.reading} onChange={e => setNewVocab({ ...newVocab, reading: e.target.value })}
                                        className="w-full px-3 py-2 border rounded-xl dark:bg-slate-700 dark:border-slate-600 dark:text-white text-sm" placeholder="にほん" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Hán Việt</label>
                                    <input value={newVocab.sinoViet} onChange={e => setNewVocab({ ...newVocab, sinoViet: e.target.value })}
                                        className="w-full px-3 py-2 border rounded-xl dark:bg-slate-700 dark:border-slate-600 dark:text-white text-sm" placeholder="NHẬT BẢN" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nghĩa tiếng Việt</label>
                                <input value={newVocab.meaning} onChange={e => setNewVocab({ ...newVocab, meaning: e.target.value })}
                                    className="w-full px-3 py-2 border rounded-xl dark:bg-slate-700 dark:border-slate-600 dark:text-white text-sm" placeholder="Nước Nhật" />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Cấp độ</label>
                                    <select value={newVocab.level} onChange={e => setNewVocab({ ...newVocab, level: e.target.value })}
                                        className="w-full px-3 py-2 border rounded-xl dark:bg-slate-700 dark:border-slate-600 dark:text-white text-sm">
                                        {JLPT_LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Phân loại</label>
                                    <select value={newVocab.category} onChange={e => setNewVocab({ ...newVocab, category: e.target.value })}
                                        className="w-full px-3 py-2 border rounded-xl dark:bg-slate-700 dark:border-slate-600 dark:text-white text-sm">
                                        <option value="">Chưa chọn</option>
                                        {vocabCategories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                                    </select>
                                </div>
                            </div>
                        </div>
                        <div className="flex justify-end gap-2 p-4 border-t border-gray-200 dark:border-slate-700">
                            <button onClick={() => setShowAddVocabModal(false)} className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-xl cursor-pointer">Hủy</button>
                            <button onClick={handleAddVocab} className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl font-bold cursor-pointer">Lưu Từ vựng</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Kanji Modal */}
            {showEditKanjiModal && editingKanji && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowEditKanjiModal(false)}>
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-slate-700">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Chỉnh Sửa Kanji ({editingKanji.character})</h3>
                            <button onClick={() => setShowEditKanjiModal(false)} className="p-1 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg cursor-pointer"><X className="w-5 h-5" /></button>
                        </div>
                        <div className="p-4 space-y-4 max-h-[70vh] overflow-y-auto">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Chữ Kanji</label>
                                <input value={editingKanji.character} onChange={e => setEditingKanji({ ...editingKanji, character: e.target.value })}
                                    className="w-full px-3 py-2 border rounded-xl dark:bg-slate-700 dark:border-slate-600 dark:text-white text-lg font-japanese font-bold" />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Âm Hán Việt</label>
                                    <input value={editingKanji.sinoViet || ''} onChange={e => setEditingKanji({ ...editingKanji, sinoViet: e.target.value })}
                                        className="w-full px-3 py-2 border rounded-xl dark:bg-slate-700 dark:border-slate-600 dark:text-white text-sm" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Cấp độ</label>
                                    <select value={editingKanji.level || 'N5'} onChange={e => setEditingKanji({ ...editingKanji, level: e.target.value })}
                                        className="w-full px-3 py-2 border rounded-xl dark:bg-slate-700 dark:border-slate-600 dark:text-white text-sm">
                                        {JLPT_LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Ý nghĩa tiếng Việt</label>
                                <input value={editingKanji.meaning || ''} onChange={e => setEditingKanji({ ...editingKanji, meaning: e.target.value })}
                                    className="w-full px-3 py-2 border rounded-xl dark:bg-slate-700 dark:border-slate-600 dark:text-white text-sm" />
                            </div>
                        </div>
                        <div className="flex justify-end gap-2 p-4 border-t border-gray-200 dark:border-slate-700">
                            <button onClick={() => setShowEditKanjiModal(false)} className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-xl cursor-pointer">Hủy</button>
                            <button onClick={handleEditKanji} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold cursor-pointer">Lưu Thay Đổi</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Vocab Modal */}
            {showEditVocabModal && editingVocab && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowEditVocabModal(false)}>
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-slate-700">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Chỉnh Sửa Từ Vựng ({editingVocab.word})</h3>
                            <button onClick={() => setShowEditVocabModal(false)} className="p-1 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg cursor-pointer"><X className="w-5 h-5" /></button>
                        </div>
                        <div className="p-4 space-y-4 max-h-[70vh] overflow-y-auto">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Từ vựng</label>
                                <input value={editingVocab.word} onChange={e => setEditingVocab({ ...editingVocab, word: e.target.value })}
                                    className="w-full px-3 py-2 border rounded-xl dark:bg-slate-700 dark:border-slate-600 dark:text-white text-lg font-japanese font-bold" />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Cách đọc (Furigana)</label>
                                    <input value={editingVocab.reading || ''} onChange={e => setEditingVocab({ ...editingVocab, reading: e.target.value })}
                                        className="w-full px-3 py-2 border rounded-xl dark:bg-slate-700 dark:border-slate-600 dark:text-white text-sm" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Hán Việt</label>
                                    <input value={editingVocab.sinoViet || ''} onChange={e => setEditingVocab({ ...editingVocab, sinoViet: e.target.value })}
                                        className="w-full px-3 py-2 border rounded-xl dark:bg-slate-700 dark:border-slate-600 dark:text-white text-sm" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nghĩa tiếng Việt</label>
                                <input value={editingVocab.meaning || ''} onChange={e => setEditingVocab({ ...editingVocab, meaning: e.target.value })}
                                    className="w-full px-3 py-2 border rounded-xl dark:bg-slate-700 dark:border-slate-600 dark:text-white text-sm" />
                            </div>
                        </div>
                        <div className="flex justify-end gap-2 p-4 border-t border-gray-200 dark:border-slate-700">
                            <button onClick={() => setShowEditVocabModal(false)} className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-xl cursor-pointer">Hủy</button>
                            <button onClick={handleEditVocab} className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl font-bold cursor-pointer">Lưu Thay Đổi</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Folder Select Modal for SRS */}
            {showFolderSelectModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowFolderSelectModal(false)}>
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-slate-700">
                            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                                <Folder className="w-4 h-4 text-sky-500" /> Chọn học phần để lưu
                            </h3>
                            <button onClick={() => setShowFolderSelectModal(false)} className="p-1 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg cursor-pointer"><X className="w-4 h-4" /></button>
                        </div>
                        <div className="p-4 space-y-3">
                            <button
                                onClick={() => handleConfirmSaveVocab('unfiled')}
                                className="w-full py-2.5 px-4 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center justify-between transition-all cursor-pointer"
                            >
                                <span>Chưa phân loại (Không chọn học phần)</span>
                                <Folder className="w-4 h-4 opacity-50" />
                            </button>
                            {folders && folders.filter(f => f.type !== 'folder').map(f => (
                                <button
                                    key={f.id}
                                    onClick={() => handleConfirmSaveVocab(f.id)}
                                    className="w-full py-2.5 px-4 bg-sky-50 dark:bg-sky-950/40 hover:bg-sky-100 dark:hover:bg-sky-900/60 rounded-xl text-xs font-bold text-sky-700 dark:text-sky-300 flex items-center justify-between transition-all border border-sky-200/50 dark:border-sky-800/50 cursor-pointer"
                                >
                                    <span>{f.name}</span>
                                    <Folder className="w-4 h-4 text-sky-500" />
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default KanjiFormModal;
