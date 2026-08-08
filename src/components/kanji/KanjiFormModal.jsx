import React, { useState } from 'react';
import { X, Folder, Plus, Upload, Image as ImageIcon, Copy, Code, FileText, Check } from 'lucide-react';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../../config/firebase';
import { showToast } from '../../utils/toast';
import { JLPT_LEVELS } from './kanjiConstants';

const SAMPLE_KANJI_JSON = `[
  {
    "character": "愛",
    "sinoViet": "ÁI",
    "meaning": "Yêu, tình yêu, thương yêu",
    "level": "N3",
    "onyomi": "アイ",
    "kunyomi": "い.する、めで.る",
    "strokeCount": 13,
    "parts": "爪, 𠫓, 心, 夂",
    "radical": "心",
    "mnemonic": "Một trái tim (心) nằm giữa để đón nhận tình yêu (愛)",
    "imageUrl": "https://example.com/ai.png"
  }
]`;

const KanjiFormModal = ({
    showAddKanjiModal,
    setShowAddKanjiModal,
    handleAddKanji,
    newKanji,
    setNewKanji,
    jsonKanjiInput,
    setJsonKanjiInput,
    handleImportKanjiJson,
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
    const [uploadingImage, setUploadingImage] = useState(false);
    const [kanjiModalTab, setKanjiModalTab] = useState('manual'); // 'manual' | 'json'
    const [copiedSample, setCopiedSample] = useState(false);

    const handleCopySampleJson = () => {
        navigator.clipboard.writeText(SAMPLE_KANJI_JSON);
        setCopiedSample(true);
        showToast('Đã sao chép JSON mẫu Kanji!', 'success');
        setTimeout(() => setCopiedSample(false), 2000);
    };

    const handleImageUpload = async (e, isEdit = true) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploadingImage(true);
        try {
            const storageRef = ref(storage, `kanji/images/${Date.now()}_${file.name}`);
            const snapshot = await uploadBytes(storageRef, file);
            const url = await getDownloadURL(snapshot.ref);
            if (isEdit) {
                setEditingKanji(prev => ({ ...prev, imageUrl: url }));
            } else {
                setNewKanji(prev => ({ ...prev, imageUrl: url }));
            }
            showToast('Đã tải hình ảnh minh họa thành công!', 'success');
        } catch (err) {
            console.error('Error uploading image:', err);
            showToast('Lỗi tải ảnh: ' + err.message, 'error');
        } finally {
            setUploadingImage(false);
        }
    };
    return (
        <>
            {/* Add Kanji Modal */}
            {showAddKanjiModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onMouseDown={(e) => { if (e.target === e.currentTarget) setShowAddKanjiModal(false); }}>
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
                        {/* Header */}
                        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-slate-700">
                            <div>
                                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Thêm Kanji Mới</h3>
                                <p className="text-xs text-gray-500 dark:text-gray-400">Nhập thủ công từng chữ hoặc dán mã JSON hàng loạt</p>
                            </div>
                            <button onClick={() => setShowAddKanjiModal(false)} className="p-1 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg cursor-pointer"><X className="w-5 h-5" /></button>
                        </div>

                        {/* Tab Switcher */}
                        <div className="flex border-b border-gray-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 p-1.5 gap-1.5">
                            <button
                                type="button"
                                onClick={() => setKanjiModalTab('manual')}
                                className={`flex-1 py-2 px-3 text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer ${
                                    kanjiModalTab === 'manual'
                                        ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-xs border border-gray-200/80 dark:border-slate-700'
                                        : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-800/50'
                                }`}
                            >
                                <FileText className="w-4 h-4" /> Nhập Thủ Công (Form)
                            </button>
                            <button
                                type="button"
                                onClick={() => setKanjiModalTab('json')}
                                className={`flex-1 py-2 px-3 text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer ${
                                    kanjiModalTab === 'json'
                                        ? 'bg-white dark:bg-slate-800 text-sky-600 dark:text-sky-400 shadow-xs border border-gray-200/80 dark:border-slate-700'
                                        : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-800/50'
                                }`}
                            >
                                <Code className="w-4 h-4" /> Nhập Từ JSON Hàng Loạt
                            </button>
                        </div>

                        {/* Tab Content */}
                        {kanjiModalTab === 'manual' ? (
                            <>
                                <div className="p-4 space-y-4 overflow-y-auto flex-1 max-h-[65vh]">
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
                                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Âm Onyomi (Katakana)</label>
                                            <input value={newKanji.onyomi} onChange={e => setNewKanji({ ...newKanji, onyomi: e.target.value })}
                                                className="w-full px-3 py-2 border rounded-xl dark:bg-slate-700 dark:border-slate-600 dark:text-white text-sm" placeholder="ニチ、ジツ" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Âm Kunyomi (Hiragana)</label>
                                            <input value={newKanji.kunyomi} onChange={e => setNewKanji({ ...newKanji, kunyomi: e.target.value })}
                                                className="w-full px-3 py-2 border rounded-xl dark:bg-slate-700 dark:border-slate-600 dark:text-white text-sm" placeholder="ひ、-び" />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Số nét (Strokes)</label>
                                            <input type="number" value={newKanji.strokeCount || ''} onChange={e => setNewKanji({ ...newKanji, strokeCount: e.target.value })}
                                                className="w-full px-3 py-2 border rounded-xl dark:bg-slate-700 dark:border-slate-600 dark:text-white text-sm" placeholder="4" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Thành phần bộ thủ (Parts)</label>
                                            <input value={newKanji.parts || ''} onChange={e => setNewKanji({ ...newKanji, parts: e.target.value })}
                                                className="w-full px-3 py-2 border rounded-xl dark:bg-slate-700 dark:border-slate-600 dark:text-white text-sm" placeholder="一, 日" />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Bộ thủ chính (Radical)</label>
                                        <input value={newKanji.radical || ''} onChange={e => setNewKanji({ ...newKanji, radical: e.target.value })}
                                            className="w-full px-3 py-2 border rounded-xl dark:bg-slate-700 dark:border-slate-600 dark:text-white text-sm" placeholder="日 (Nhật)" />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Cách nhớ / Câu chuyện (Mnemonic)</label>
                                        <textarea value={newKanji.mnemonic} onChange={e => setNewKanji({ ...newKanji, mnemonic: e.target.value })}
                                            rows={2} className="w-full px-3 py-2 border rounded-xl dark:bg-slate-700 dark:border-slate-600 dark:text-white text-sm" placeholder="Mô tả câu chuyện dễ nhớ chữ..." />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Hình ảnh minh họa ý nghĩa (URL hoặc tải từ máy)</label>
                                        <div className="flex gap-2 items-center">
                                            <input 
                                                type="text" 
                                                value={newKanji.imageUrl || ''} 
                                                onChange={e => setNewKanji({ ...newKanji, imageUrl: e.target.value })}
                                                className="flex-1 px-3 py-2 border rounded-xl dark:bg-slate-700 dark:border-slate-600 dark:text-white text-sm" 
                                                placeholder="https://... hoặc tải ảnh từ máy" 
                                            />
                                            <label className="px-3 py-2 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shrink-0 border border-indigo-200/60 dark:border-indigo-800/60">
                                                <Upload className="w-3.5 h-3.5" />
                                                {uploadingImage ? 'Đang tải...' : 'Tải ảnh'}
                                                <input type="file" accept="image/*" className="hidden" onChange={e => handleImageUpload(e, false)} disabled={uploadingImage} />
                                            </label>
                                        </div>
                                        {newKanji.imageUrl && (
                                            <div className="mt-2 relative w-24 h-24 bg-slate-100 dark:bg-slate-900 rounded-xl overflow-hidden border border-gray-250 dark:border-slate-700 group flex items-center justify-center p-1">
                                                <img src={newKanji.imageUrl} alt="Ý nghĩa" className="max-w-full max-h-full object-contain rounded-lg" />
                                                <button 
                                                    type="button" 
                                                    onClick={() => setNewKanji({ ...newKanji, imageUrl: '' })}
                                                    className="absolute top-1 right-1 p-1 bg-red-500 hover:bg-red-600 text-white rounded-full opacity-90 transition-opacity cursor-pointer shadow-md"
                                                    title="Xóa ảnh"
                                                >
                                                    <X className="w-3 h-3" />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="flex justify-end gap-2 p-4 border-t border-gray-200 dark:border-slate-700">
                                    <button onClick={() => setShowAddKanjiModal(false)} className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-xl cursor-pointer">Hủy</button>
                                    <button onClick={handleAddKanji} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold cursor-pointer">Lưu Kanji</button>
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="p-4 space-y-4 overflow-y-auto flex-1 max-h-[65vh]">
                                    {/* Sample JSON Guide */}
                                    <div className="bg-slate-900 text-slate-100 p-3.5 rounded-2xl border border-slate-800 text-xs font-mono">
                                        <div className="flex items-center justify-between mb-2 pb-2 border-b border-slate-800">
                                            <span className="font-bold text-amber-400 flex items-center gap-1.5">
                                                <Code className="w-4 h-4" /> Cấu trúc JSON Mẫu chuẩn Kanji:
                                            </span>
                                            <button
                                                type="button"
                                                onClick={handleCopySampleJson}
                                                className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-sans font-bold flex items-center gap-1 cursor-pointer transition-all active:scale-95"
                                            >
                                                {copiedSample ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                                                {copiedSample ? 'Đã sao chép!' : 'Sao chép JSON Mẫu'}
                                            </button>
                                        </div>
                                        <pre className="text-[11px] leading-relaxed overflow-x-auto text-emerald-300">
                                            {SAMPLE_KANJI_JSON}
                                        </pre>
                                    </div>

                                    {/* Textarea */}
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Dán mảng JSON Kanji vào đây:</label>
                                        <textarea
                                            value={jsonKanjiInput}
                                            onChange={e => setJsonKanjiInput(e.target.value)}
                                            rows={8}
                                            className="w-full p-3 border rounded-xl dark:bg-slate-900 dark:border-slate-700 text-slate-900 dark:text-emerald-400 font-mono text-xs focus:ring-2 focus:ring-sky-500 focus:outline-none"
                                            placeholder={`[ \n  { \n    "character": "愛", \n    "sinoViet": "ÁI", \n    "meaning": "Yêu", \n    "level": "N3" \n  } \n]`}
                                        />
                                    </div>
                                </div>
                                <div className="flex justify-end gap-2 p-4 border-t border-gray-200 dark:border-slate-700">
                                    <button onClick={() => setShowAddKanjiModal(false)} className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-xl cursor-pointer">Hủy</button>
                                    <button
                                        onClick={() => handleImportKanjiJson(jsonKanjiInput)}
                                        className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl font-bold cursor-pointer flex items-center gap-2"
                                    >
                                        <Upload className="w-4 h-4" /> Import Tất Cả Từ JSON
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* Add Vocab Modal */}
            {showAddVocabModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onMouseDown={(e) => { if (e.target === e.currentTarget) setShowAddVocabModal(false); }}>
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
                <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4" onMouseDown={(e) => { if (e.target === e.currentTarget) setShowEditKanjiModal(false); }}>
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-slate-700">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Chỉnh Sửa Kanji ({editingKanji.character})</h3>
                            <button onClick={() => setShowEditKanjiModal(false)} className="p-1 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg cursor-pointer"><X className="w-5 h-5" /></button>
                        </div>
                        <div className="p-4 space-y-4 max-h-[75vh] overflow-y-auto">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Chữ Kanji (*)</label>
                                <input value={editingKanji.character || ''} onChange={e => setEditingKanji({ ...editingKanji, character: e.target.value })}
                                    className="w-full px-3 py-2 border rounded-xl dark:bg-slate-700 dark:border-slate-600 dark:text-white text-lg font-japanese font-bold" />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Âm Hán Việt</label>
                                    <input value={editingKanji.sinoViet || ''} onChange={e => setEditingKanji({ ...editingKanji, sinoViet: e.target.value })}
                                        className="w-full px-3 py-2 border rounded-xl dark:bg-slate-700 dark:border-slate-600 dark:text-white text-sm" placeholder="TAM" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Cấp độ JLPT</label>
                                    <select value={editingKanji.level || 'N5'} onChange={e => setEditingKanji({ ...editingKanji, level: e.target.value })}
                                        className="w-full px-3 py-2 border rounded-xl dark:bg-slate-700 dark:border-slate-600 dark:text-white text-sm">
                                        {JLPT_LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Ý nghĩa tiếng Việt</label>
                                <input value={editingKanji.meaning || ''} onChange={e => setEditingKanji({ ...editingKanji, meaning: e.target.value })}
                                    className="w-full px-3 py-2 border rounded-xl dark:bg-slate-700 dark:border-slate-600 dark:text-white text-sm" placeholder="ba, thứ ba" />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Âm Onyomi (Katakana)</label>
                                    <input value={editingKanji.onyomi || ''} onChange={e => setEditingKanji({ ...editingKanji, onyomi: e.target.value })}
                                        className="w-full px-3 py-2 border rounded-xl dark:bg-slate-700 dark:border-slate-600 dark:text-white text-sm" placeholder="サン" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Âm Kunyomi (Hiragana)</label>
                                    <input value={editingKanji.kunyomi || ''} onChange={e => setEditingKanji({ ...editingKanji, kunyomi: e.target.value })}
                                        className="w-full px-3 py-2 border rounded-xl dark:bg-slate-700 dark:border-slate-600 dark:text-white text-sm" placeholder="み、みっ.つ" />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Số nét (Strokes)</label>
                                    <input type="number" value={editingKanji.strokeCount || editingKanji.stroke_count || ''} onChange={e => setEditingKanji({ ...editingKanji, strokeCount: e.target.value, stroke_count: e.target.value })}
                                        className="w-full px-3 py-2 border rounded-xl dark:bg-slate-700 dark:border-slate-600 dark:text-white text-sm" placeholder="3" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Thành phần bộ thủ (Parts)</label>
                                    <input value={typeof editingKanji.parts === 'string' ? editingKanji.parts : (Array.isArray(editingKanji.parts) ? editingKanji.parts.join(', ') : '')} onChange={e => setEditingKanji({ ...editingKanji, parts: e.target.value })}
                                        className="w-full px-3 py-2 border rounded-xl dark:bg-slate-700 dark:border-slate-600 dark:text-white text-sm" placeholder="一, 二" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Cách nhớ / Mô tả hình ảnh (Mnemonic)</label>
                                <textarea value={editingKanji.mnemonic || ''} onChange={e => setEditingKanji({ ...editingKanji, mnemonic: e.target.value })}
                                    rows={2} className="w-full px-3 py-2 border rounded-xl dark:bg-slate-700 dark:border-slate-600 dark:text-white text-sm" placeholder="Mô tả câu chuyện nhớ chữ Kanji..." />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Hình ảnh minh họa ý nghĩa (URL hoặc tải từ máy)</label>
                                <div className="flex gap-2 items-center">
                                    <input 
                                        type="text" 
                                        value={editingKanji.imageUrl || ''} 
                                        onChange={e => setEditingKanji({ ...editingKanji, imageUrl: e.target.value })}
                                        className="flex-1 px-3 py-2 border rounded-xl dark:bg-slate-700 dark:border-slate-600 dark:text-white text-sm" 
                                        placeholder="https://... hoặc tải ảnh từ máy" 
                                    />
                                    <label className="px-3 py-2 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shrink-0 border border-indigo-200/60 dark:border-indigo-800/60">
                                        <Upload className="w-3.5 h-3.5" />
                                        {uploadingImage ? 'Đang tải...' : 'Tải ảnh'}
                                        <input type="file" accept="image/*" className="hidden" onChange={e => handleImageUpload(e, true)} disabled={uploadingImage} />
                                    </label>
                                </div>
                                {editingKanji.imageUrl && (
                                    <div className="mt-2 relative w-24 h-24 bg-slate-100 dark:bg-slate-900 rounded-xl overflow-hidden border border-gray-250 dark:border-slate-700 group flex items-center justify-center p-1">
                                        <img src={editingKanji.imageUrl} alt="Ý nghĩa" className="max-w-full max-h-full object-contain rounded-lg" />
                                        <button 
                                            type="button" 
                                            onClick={() => setEditingKanji({ ...editingKanji, imageUrl: '' })}
                                            className="absolute top-1 right-1 p-1 bg-red-500 hover:bg-red-600 text-white rounded-full opacity-90 transition-opacity cursor-pointer shadow-md"
                                            title="Xóa ảnh"
                                        >
                                            <X className="w-3 h-3" />
                                        </button>
                                    </div>
                                )}
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
                <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4" onMouseDown={(e) => { if (e.target === e.currentTarget) setShowEditVocabModal(false); }}>
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
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onMouseDown={(e) => { if (e.target === e.currentTarget) setShowFolderSelectModal(false); }}>
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
