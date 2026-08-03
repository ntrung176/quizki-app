import React from 'react';
import { X, Copy, FolderPlus, Layers } from 'lucide-react';
import { showToast } from '../../utils/toast';
import { PremiumLockedModal } from '../ui';

export const FormModal = ({ show, onClose, title, onSave, children }) => {
    if (!show) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">{title}</h3>
                    <button onClick={onClose} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"><X className="w-5 h-5" /></button>
                </div>
                <div className="p-4 space-y-4">{children}</div>
                <div className="flex justify-end gap-2 p-4 border-t border-gray-200 dark:border-gray-700">
                    <button onClick={onClose} className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl">Hủy</button>
                    <button onClick={onSave} className="px-4 py-2 bg-sky-500 hover:bg-sky-600 text-white rounded-xl font-bold">Lưu</button>
                </div>
            </div>
        </div>
    );
};

export const InputField = ({ label, value, onChange, placeholder, type = 'text' }) => (
    <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</label>
        <input type={type} value={value} onChange={e => onChange(e.target.value)}
            placeholder={placeholder} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-sky-500 outline-none" />
    </div>
);

const BOOK_COLORS = ['#3B82F6', '#8B5CF6', '#F59E0B', '#10B981', '#EF4444', '#EC4899', '#6366F1', '#14B8A6'];

const BookFormModals = ({
    showAddGroup, setShowAddGroup, handleAddGroup,
    showAddBook, setShowAddBook, handleAddBook,
    showAddChapter, setShowAddChapter, handleAddChapter,
    showAddLesson, setShowAddLesson, handleAddLesson,
    showJsonImport, setShowJsonImport, handleImportJson, jsonInput, setJsonInput,
    showEditGroup, setShowEditGroup, handleSaveEditGroup,
    showEditBook, setShowEditBook, handleSaveEditBook,
    formName, setFormName, formSubtitle, setFormSubtitle, formColor, setFormColor,
    formDescription, setFormDescription, formWordCount, setFormWordCount, formImageUrl, setFormImageUrl,
    resetForm,
    showCreateStudySetModal, setShowCreateStudySetModal,
    studySetName, setStudySetName, studySetDesc, setStudySetDesc,
    selectedParentFolderId, setSelectedParentFolderId, parentFolders,
    isCreatingNewParentFolder, setIsCreatingNewParentFolder, newParentFolderName, setNewParentFolderName,
    selectedVocabIndices, setSelectedVocabIndices, vocabWithAudio, allUserCards,
    handleCreateStudySetFromLesson, creationLoading,
    showLinkStudySetModal, setShowLinkStudySetModal,
    selectedExistingStudySetId, setSelectedExistingStudySetId, folders: inputFolders, availableFolders, handleLinkToExistingStudySet,
    showPremiumModal, setShowPremiumModal, lockedPkgName
}) => {
    const folders = availableFolders || inputFolders || [];
    return (
        <>
            {/* Add Group Modal */}
            <FormModal show={showAddGroup} onClose={() => { setShowAddGroup(false); resetForm(); }} title="Thêm nhóm sách" onSave={handleAddGroup}>
                <InputField label="Tên nhóm sách" value={formName} onChange={setFormName} placeholder="VD: Mimikara Oboeru" />
                <InputField label="Phụ đề" value={formSubtitle} onChange={setFormSubtitle} placeholder="VD: 耳から覚える日本語能力試験" />
                <InputField label="URL hình ảnh (tùy chọn)" value={formImageUrl} onChange={setFormImageUrl} placeholder="https://..." />
            </FormModal>

            {/* Add Book Modal */}
            <FormModal show={showAddBook} onClose={() => { setShowAddBook(false); resetForm(); }} title="Thêm sách" onSave={handleAddBook}>
                <InputField label="Tên sách" value={formName} onChange={setFormName} placeholder="VD: Mimikara N3 Từ vựng" />
                <InputField label="Phụ đề" value={formSubtitle} onChange={setFormSubtitle} placeholder="VD: N3語彙" />
                <InputField label="Số lượng từ vựng" value={formWordCount} onChange={setFormWordCount} placeholder="VD: 880 từ" />
                <InputField label="Mô tả" value={formDescription} onChange={setFormDescription} placeholder="VD: Sách luyện từ vựng N3 qua âm thanh" />
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Màu sách</label>
                    <div className="flex gap-2 flex-wrap">
                        {BOOK_COLORS.map(c => (
                            <button key={c} onClick={() => setFormColor(c)}
                                className={`w-8 h-8 rounded-lg transition-all ${formColor === c ? 'ring-2 ring-offset-2 ring-sky-500 scale-110' : 'hover:scale-105'}`}
                                style={{ backgroundColor: c }} />
                        ))}
                    </div>
                </div>
            </FormModal>

            {/* Add Chapter Modal */}
            <FormModal show={showAddChapter} onClose={() => { setShowAddChapter(false); resetForm(); }} title="Thêm chương" onSave={handleAddChapter}>
                <InputField label="Tên chương" value={formName} onChange={setFormName} placeholder="VD: Chương 1 - Chào hỏi" />
            </FormModal>

            {/* Add Lesson Modal */}
            <FormModal show={showAddLesson} onClose={() => { setShowAddLesson(false); resetForm(); }} title="Thêm bài" onSave={handleAddLesson}>
                <InputField label="Tên bài" value={formName} onChange={setFormName} placeholder="VD: Bài 1 - Giới thiệu bản thân" />
            </FormModal>

            {/* JSON Import Modal */}
            <FormModal show={showJsonImport} onClose={() => { setShowJsonImport(false); resetForm(); }} title="Import / Cập nhật từ vựng (JSON)" onSave={handleImportJson}>
                <div className="space-y-3">
                    <div className="bg-sky-50 dark:bg-sky-900/20 border border-sky-200 dark:border-sky-800 rounded-xl p-3">
                        <p className="text-xs text-sky-700 dark:text-sky-300 font-medium">💡 Hỗ trợ cập nhật từ vựng đã có</p>
                        <p className="text-[11px] text-sky-600 dark:text-sky-400 mt-1">Nếu <strong>word</strong> đã tồn tại trong bài, chỉ các trường <strong>không trống</strong> trong JSON sẽ được cập nhật. Từ mới sẽ được thêm vào cuối danh sách.</p>
                    </div>
                    <div>
                        <div className="flex items-center justify-between mb-1">
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">JSON mẫu</label>
                            <button
                                onClick={() => {
                                    const sample = JSON.stringify([
                                        {
                                            word: "漢字（かんじ）",
                                            reading: "かんじ",
                                            meaning: "Chữ Hán; Kanji",
                                            level: "N3",
                                            sinoVietnamese: "HÁN TỰ",
                                            pos: "noun",
                                            synonym: "文字",
                                            example: "漢字を勉強します。\n新しい漢字を書きなさい。",
                                            exampleMeaning: "Tôi học chữ Hán.\nHãy viết chữ Hán mới.",
                                            nuance: "Chỉ hệ thống chữ viết gốc Trung Quốc dùng trong tiếng Nhật.",
                                            accent: "0",
                                            specialReading: false
                                        }
                                    ], null, 2);
                                    navigator.clipboard.writeText(sample);
                                    showToast('Đã copy JSON mẫu!', 'success');
                                }}
                                className="flex items-center gap-1 px-2 py-1 text-xs text-sky-600 dark:text-sky-400 hover:bg-sky-50 dark:hover:bg-sky-900/20 rounded-lg transition-colors font-medium"
                            >
                                <Copy className="w-3 h-3" /> Copy mẫu
                            </button>
                        </div>
                        <pre className="text-[11px] bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-600 rounded-xl p-3 overflow-x-auto text-gray-600 dark:text-gray-400 font-mono leading-relaxed max-h-48 overflow-y-auto">{`[
  {
    "word": "漢字（かんじ）",
    "reading": "かんじ",
    "meaning": "Chữ Hán; Kanji",
    "level": "N3",
    "sinoVietnamese": "HÁN TỰ",
    "pos": "noun",
    "synonym": "文字",
    "example": "漢字を勉強します。\\n新しい漢字を書きなさい。",
    "exampleMeaning": "Tôi học chữ Hán.\\nHãy viết chữ Hán mới.",
    "nuance": "Ghi chú về sắc thái hoặc cách dùng.",
    "accent": "0",
    "specialReading": false
  }
]`}</pre>
                    </div>
                    <div>
                        <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Ví dụ cập nhật 1 trường cho từ đã có:</label>
                        <pre className="text-[10px] bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-lg p-2 font-mono text-amber-700 dark:text-amber-400 mt-1">{`[{ "word": "漢字（かんじ）", "sinoVietnamese": "HÁN TỰ" }]`}</pre>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Dán JSON vào đây</label>
                        <textarea value={jsonInput} onChange={e => setJsonInput(e.target.value)}
                            rows={10} placeholder="Dán JSON từ vựng vào đây...\n\nCó thể bỏ trống các trường không cần cập nhật."
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono text-xs focus:ring-2 focus:ring-sky-500 outline-none" />
                        <p className="text-[10px] text-gray-400 mt-1">Các trường: word, reading, meaning, sinoVietnamese, pos, level, synonym, example, exampleMeaning, nuance, accent, specialReading, imageUrl</p>
                    </div>
                </div>
            </FormModal>

            {/* Edit Group Modal */}
            <FormModal show={showEditGroup} onClose={() => { setShowEditGroup(false); resetForm(); }} title="Chỉnh sửa nhóm sách" onSave={handleSaveEditGroup}>
                <InputField label="Tên nhóm" value={formName} onChange={setFormName} placeholder="VD: Tango" />
                <InputField label="Phụ đề" value={formSubtitle} onChange={setFormSubtitle} placeholder="VD: はじめての日本語能力試験" />
                <InputField label="URL hình ảnh (tùy chọn)" value={formImageUrl} onChange={setFormImageUrl} placeholder="https://..." />
            </FormModal>

            {/* Edit Book Modal */}
            <FormModal show={showEditBook} onClose={() => { setShowEditBook(false); resetForm(); }} title="Chỉnh sửa sách" onSave={handleSaveEditBook}>
                <InputField label="Tên sách" value={formName} onChange={setFormName} placeholder="VD: N5" />
                <InputField label="Phụ đề" value={formSubtitle} onChange={setFormSubtitle} placeholder="VD: はじめての日本語能力試験" />
                <InputField label="Số lượng từ vựng" value={formWordCount} onChange={setFormWordCount} placeholder="VD: 1000" />
                <InputField label="Mô tả" value={formDescription} onChange={setFormDescription} placeholder="VD: dành cho Kỳ thi Năng lực Nhật ngữ N5" />
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Màu sách</label>
                    <div className="flex gap-2 flex-wrap">
                        {BOOK_COLORS.map(c => (
                            <button key={c} onClick={() => setFormColor(c)}
                                className={`w-8 h-8 rounded-lg transition-all ${formColor === c ? 'ring-2 ring-offset-2 ring-sky-500 scale-110' : 'hover:scale-105'}`}
                                style={{ backgroundColor: c }} />
                        ))}
                    </div>
                </div>
            </FormModal>

            {/* Create Study Set Modal */}
            {showCreateStudySetModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 animate-fadeIn">
                    <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-2xl w-full border border-slate-100 dark:border-slate-700 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
                        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
                            <div>
                                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                                    <FolderPlus className="w-5 h-5 text-sky-500" />
                                    Tạo học phần mới từ bài học
                                </h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                    Từ vựng của bài học này sẽ được tự động thêm vào học phần mới.
                                </p>
                            </div>
                            <button 
                                onClick={() => setShowCreateStudySetModal(false)}
                                className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl text-slate-400 dark:text-slate-500 hover:text-slate-600 transition-all"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-6 overflow-y-auto space-y-4 flex-1">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Tên học phần</label>
                                <input 
                                    type="text" 
                                    value={studySetName} 
                                    onChange={e => setStudySetName(e.target.value)}
                                    placeholder="Ví dụ: N5 - Bài 1"
                                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-sky-500"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Mô tả học phần (tùy chọn)</label>
                                <textarea 
                                    value={studySetDesc} 
                                    onChange={e => setStudySetDesc(e.target.value)}
                                    placeholder="Nhập mô tả cho học phần này..."
                                    rows={2}
                                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-sky-500 resize-none"
                                />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Thư mục cha</label>
                                    <select 
                                        value={selectedParentFolderId} 
                                        onChange={e => {
                                            setSelectedParentFolderId(e.target.value);
                                            setIsCreatingNewParentFolder(e.target.value === 'NEW_PARENT');
                                        }}
                                        className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-sky-500"
                                    >
                                        <option value="">📂 Chưa phân loại (Gốc)</option>
                                        {parentFolders.map(pf => (
                                            <option key={pf.id} value={pf.id}>📁 {pf.name}</option>
                                        ))}
                                        <option value="NEW_PARENT">➕ Tạo thư mục mới...</option>
                                    </select>
                                </div>
                                {isCreatingNewParentFolder && (
                                    <div className="animate-fadeIn">
                                        <label className="block text-xs font-bold text-sky-500 dark:text-sky-400 uppercase tracking-wider mb-1.5">Tên thư mục mới</label>
                                        <input 
                                            type="text" 
                                            value={newParentFolderName} 
                                            onChange={e => setNewParentFolderName(e.target.value)}
                                            placeholder="Tên thư mục cha mới..."
                                            className="w-full px-3 py-2 border border-sky-200 dark:border-sky-800 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-sky-500"
                                        />
                                    </div>
                                )}
                            </div>
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                        Chọn từ vựng muốn thêm ({selectedVocabIndices.size}/{vocabWithAudio.length})
                                    </label>
                                    <button 
                                        type="button"
                                        onClick={() => {
                                            if (selectedVocabIndices.size === vocabWithAudio.length) {
                                                setSelectedVocabIndices(new Set());
                                            } else {
                                                setSelectedVocabIndices(new Set(vocabWithAudio.map((_, i) => i)));
                                            }
                                        }}
                                        className="text-xs text-sky-500 dark:text-sky-400 font-bold hover:underline"
                                    >
                                        {selectedVocabIndices.size === vocabWithAudio.length ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
                                    </button>
                                </div>
                                <div className="border border-slate-100 dark:border-slate-700 rounded-2xl max-h-48 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-700 bg-slate-50/50 dark:bg-slate-900/30">
                                    {vocabWithAudio.map((v, i) => {
                                        const word = v.word || v.front || '';
                                        const displayWord = word.split('（')[0].split('(')[0].trim();
                                        const isSelected = selectedVocabIndices.has(i);
                                        const inList = Array.isArray(allUserCards) && allUserCards.some(c => c && c.front && String(c.front).split('（')[0].split('(')[0].trim() === displayWord);
                                        return (
                                            <div 
                                                key={i} 
                                                onClick={() => {
                                                    setSelectedVocabIndices(prev => {
                                                        const next = new Set(prev);
                                                        if (next.has(i)) next.delete(i);
                                                        else next.add(i);
                                                        return next;
                                                    });
                                                }}
                                                className="flex items-center gap-3 px-4 py-2 hover:bg-slate-100/50 dark:hover:bg-slate-800/30 cursor-pointer transition-colors"
                                            >
                                                <input 
                                                    type="checkbox" 
                                                    checked={isSelected}
                                                    onChange={() => {}}
                                                    className="w-4 h-4 rounded text-sky-500 border-slate-300 dark:border-slate-600 focus:ring-sky-500 cursor-pointer"
                                                />
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate">{displayWord}</p>
                                                    <p className="text-xs text-slate-400 dark:text-slate-500 truncate">{v.meaning || v.back}</p>
                                                </div>
                                                {inList && (
                                                    <span className="text-[10px] px-2 py-0.5 bg-emerald-100 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 rounded-full font-bold">
                                                        Đã có trong SRS
                                                    </span>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 flex justify-end gap-3">
                            <button 
                                type="button"
                                onClick={() => setShowCreateStudySetModal(false)}
                                className="px-4 py-2 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 rounded-xl text-sm font-bold hover:bg-slate-100 dark:hover:bg-slate-700 transition-all"
                            >
                                Hủy
                            </button>
                            <button 
                                type="button"
                                onClick={handleCreateStudySetFromLesson}
                                disabled={creationLoading || !studySetName.trim() || selectedVocabIndices.size === 0}
                                className="px-5 py-2 bg-sky-500 hover:bg-sky-600 disabled:opacity-50 text-white rounded-xl text-sm font-extrabold transition-all shadow-md flex items-center gap-1.5"
                            >
                                {creationLoading ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                        Đang tạo...
                                    </>
                                ) : (
                                    'Tạo học phần 🚀'
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Link Existing Study Set Modal */}
            {showLinkStudySetModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 animate-fadeIn">
                    <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-2xl w-full border border-slate-100 dark:border-slate-700 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
                        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
                            <div>
                                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                                    <Layers className="w-5 h-5 text-indigo-500" />
                                    Liên kết với học phần sẵn có
                                </h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                    Chọn một học phần trống hoặc chưa liên kết từ thư viện của bạn.
                                </p>
                            </div>
                            <button 
                                onClick={() => setShowLinkStudySetModal(false)}
                                className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl text-slate-400 dark:text-slate-500 hover:text-slate-600 transition-all"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-6 overflow-y-auto space-y-4 flex-1">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Chọn học phần</label>
                                <select 
                                    value={selectedExistingStudySetId} 
                                    onChange={e => setSelectedExistingStudySetId(e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-sky-500"
                                >
                                    <option value="">-- Chọn học phần trong danh sách --</option>
                                    {(folders || []).filter(f => f && f.type !== 'folder' && !f.sourceLesson).map(f => (
                                        <option key={f.id} value={f.id}>📚 {f.name} ({(allUserCards || []).filter(c => c && c.folderId === f.id).length} từ vựng)</option>
                                    ))}
                                    {(folders || []).filter(f => f && f.type !== 'folder' && f.sourceLesson).map(f => (
                                        <option key={f.id} value={f.id}>🔗 {f.name} (Đang liên kết bài khác - {(allUserCards || []).filter(c => c && c.folderId === f.id).length} từ vựng)</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                        Chọn từ vựng muốn thêm ({selectedVocabIndices.size}/{vocabWithAudio.length})
                                    </label>
                                    <button 
                                        type="button"
                                        onClick={() => {
                                            if (selectedVocabIndices.size === vocabWithAudio.length) {
                                                setSelectedVocabIndices(new Set());
                                            } else {
                                                setSelectedVocabIndices(new Set(vocabWithAudio.map((_, i) => i)));
                                            }
                                        }}
                                        className="text-xs text-indigo-500 dark:text-indigo-400 font-bold hover:underline"
                                    >
                                        {selectedVocabIndices.size === vocabWithAudio.length ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
                                    </button>
                                </div>
                                <div className="border border-slate-100 dark:border-slate-700 rounded-2xl max-h-48 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-700 bg-slate-50/50 dark:bg-slate-900/30">
                                    {vocabWithAudio.map((v, i) => {
                                        const word = v.word || v.front || '';
                                        const displayWord = word.split('（')[0].split('(')[0].trim();
                                        const isSelected = selectedVocabIndices.has(i);
                                        const inList = Array.isArray(allUserCards) && allUserCards.some(c => c && c.front && String(c.front).split('（')[0].split('(')[0].trim() === displayWord);
                                        return (
                                            <div 
                                                key={i} 
                                                onClick={() => {
                                                    setSelectedVocabIndices(prev => {
                                                        const next = new Set(prev);
                                                        if (next.has(i)) next.delete(i);
                                                        else next.add(i);
                                                        return next;
                                                    });
                                                }}
                                                className="flex items-center gap-3 px-4 py-2 hover:bg-slate-100/50 dark:hover:bg-slate-800/30 cursor-pointer transition-colors"
                                            >
                                                <input 
                                                    type="checkbox" 
                                                    checked={isSelected}
                                                    onChange={() => {}}
                                                    className="w-4 h-4 rounded text-indigo-500 border-slate-300 dark:border-slate-600 focus:ring-indigo-500 cursor-pointer"
                                                />
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate">{displayWord}</p>
                                                    <p className="text-xs text-slate-400 dark:text-slate-500 truncate">{v.meaning || v.back}</p>
                                                </div>
                                                {inList && (
                                                    <span className="text-[10px] px-2 py-0.5 bg-emerald-100 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 rounded-full font-bold">
                                                        Đã có trong SRS
                                                    </span>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 flex justify-end gap-3">
                            <button 
                                type="button"
                                onClick={() => setShowLinkStudySetModal(false)}
                                className="px-4 py-2 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 rounded-xl text-sm font-bold hover:bg-slate-100 dark:hover:bg-slate-700 transition-all"
                            >
                                Hủy
                            </button>
                            <button 
                                type="button"
                                onClick={handleLinkToExistingStudySet}
                                disabled={creationLoading || !selectedExistingStudySetId || selectedVocabIndices.size === 0}
                                className="px-5 py-2 bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 text-white rounded-xl text-sm font-extrabold transition-all shadow-md flex items-center gap-1.5"
                            >
                                {creationLoading ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                        Đang liên kết...
                                    </>
                                ) : (
                                    'Liên kết ngay 🔗'
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Premium Locked Modal */}
            <PremiumLockedModal 
                isOpen={showPremiumModal} 
                onClose={() => setShowPremiumModal(false)} 
                pkgName={lockedPkgName} 
            />
        </>
    );
};

export default BookFormModals;
