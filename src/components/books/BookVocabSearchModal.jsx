import React, { useState, useMemo } from 'react';
import { 
    Search, X, Edit, ExternalLink, Save, AlertTriangle, 
    Wand2, Loader2, Volume2, BookOpen, Layers
} from 'lucide-react';
import { getSinoVietnamese } from '../../utils/kanjiHVLookup';
import { speakJapanese } from '../../utils/audio';
import { showToast } from '../../utils/toast';

const BookVocabSearchModal = ({
    isOpen,
    onClose,
    currentBook,
    groupId,
    bookId,
    isAdmin,
    navigateTo,
    onGeminiAssist,
    onSaveVocabEdit
}) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [editingVocab, setEditingVocab] = useState(null); // { item, targetChapterId, targetLessonId, vocabIndex }
    const [editFormData, setEditFormData] = useState(null);
    const [isAiLoading, setIsAiLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // Thu thập toàn bộ từ vựng từ tất cả các chương & bài học của cuốn sách
    const allBookVocab = useMemo(() => {
        if (!currentBook?.chapters) return [];
        const list = [];
        currentBook.chapters.forEach(chapter => {
            (chapter.lessons || []).forEach(lesson => {
                (lesson.vocab || []).forEach((v, idx) => {
                    list.push({
                        ...v,
                        chapterId: chapter.id,
                        chapterName: chapter.name,
                        lessonId: lesson.id,
                        lessonName: lesson.name,
                        vocabIndex: idx
                    });
                });
            });
        });
        return list;
    }, [currentBook]);

    // Lọc theo từ khóa tìm kiếm
    const filteredVocab = useMemo(() => {
        const q = (searchQuery || '').trim().toLowerCase();
        if (!q) return [];
        return allBookVocab.filter(v => {
            const word = (v.word || v.front || '').toLowerCase();
            const reading = (v.reading || '').toLowerCase();
            const meaning = (v.meaning || v.back || '').toLowerCase();
            const sino = (v.sinoVietnamese || v.sinoViet || '').toLowerCase();
            const synonym = (v.synonym || '').toLowerCase();
            return word.includes(q) || reading.includes(q) || meaning.includes(q) || sino.includes(q) || synonym.includes(q);
        });
    }, [allBookVocab, searchQuery]);

    if (!isOpen) return null;

    // Mở chỉnh sửa từ vựng
    const handleStartEdit = (item) => {
        setEditingVocab(item);
        setEditFormData({
            word: item.word || item.front || '',
            reading: item.reading || '',
            meaning: item.meaning || item.back || '',
            sinoVietnamese: item.sinoVietnamese || item.sinoViet || '',
            pos: item.pos || '',
            level: item.level || '',
            accent: item.accent !== undefined ? item.accent : '',
            example: item.example || item.exampleSentence || '',
            exampleMeaning: item.exampleMeaning || item.exampleTranslation || '',
            synonym: item.synonym || '',
            nuance: item.nuance || item.note || '',
            specialReading: Boolean(item.specialReading)
        });
    };

    // AI tự động điền các trường còn thiếu
    const handleAiFill = async () => {
        if (!editFormData || !onGeminiAssist || isAiLoading) return;
        const word = (editFormData.word || '').split('（')[0].split('(')[0].trim();
        if (!word) {
            showToast('Vui lòng nhập từ vựng trước khi dùng AI!', 'warning');
            return;
        }

        setIsAiLoading(true);
        try {
            const aiRes = await onGeminiAssist(
                word,
                editFormData.pos || '',
                editFormData.level || currentBook?.name || '',
                editFormData.meaning || '',
                false
            );
            if (aiRes) {
                setEditFormData(prev => ({
                    ...prev,
                    word: prev.word || aiRes.word || aiRes.front || word,
                    reading: prev.reading || aiRes.reading || '',
                    meaning: prev.meaning || aiRes.meaning || aiRes.back || '',
                    sinoVietnamese: prev.sinoVietnamese || aiRes.sinoVietnamese || getSinoVietnamese(word) || '',
                    pos: prev.pos || aiRes.pos || '',
                    level: prev.level || aiRes.level || '',
                    accent: prev.accent !== undefined && prev.accent !== '' ? prev.accent : aiRes.accent,
                    example: prev.example || aiRes.example || '',
                    exampleMeaning: prev.exampleMeaning || aiRes.exampleMeaning || '',
                    synonym: prev.synonym || aiRes.synonym || '',
                    nuance: prev.nuance || aiRes.nuance || ''
                }));
                showToast('AI đã hoàn thiện các trường thông tin! 🎉', 'success');
            }
        } catch (e) {
            showToast('Lỗi AI: ' + (e?.message || e), 'error');
        } finally {
            setIsAiLoading(false);
        }
    };

    // Lưu chỉnh sửa
    const handleSave = async () => {
        if (!editingVocab || !editFormData || isSaving) return;
        setIsSaving(true);
        try {
            const success = await onSaveVocabEdit(
                editingVocab.chapterId,
                editingVocab.lessonId,
                editingVocab.vocabIndex,
                editFormData
            );
            if (success) {
                setEditingVocab(null);
                setEditFormData(null);
            }
        } finally {
            setIsSaving(false);
        }
    };

    // Điều hướng vào bài học chứa từ này
    const handleGoToLesson = (item) => {
        navigateTo({
            group: groupId,
            book: bookId,
            chapter: item.chapterId,
            lesson: item.lessonId
        });
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-xs animate-fade-in">
            <div 
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-900/50">
                    <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
                            <Search className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                Tìm kiếm từ vựng trong sách
                            </h2>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                {currentBook?.name || 'Sách'} • Tổng cộng {allBookVocab.length} từ
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Search Input */}
                <div className="p-3 sm:p-4 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
                    <div className="relative">
                        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            placeholder="Nhập từ Kanji, Hiragana, âm Hán Việt hoặc nghĩa tiếng Việt..."
                            className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-3 focus:ring-blue-500/15 transition-all"
                            autoFocus
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery('')}
                                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3">
                    {/* EDIT FORM (nếu đang chọn sửa 1 từ) */}
                    {editingVocab && editFormData ? (
                        <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-4 border border-blue-200 dark:border-blue-800/50 space-y-3 animate-fade-in">
                            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-700">
                                <div>
                                    <h3 className="text-sm font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
                                        <Edit className="w-4 h-4" /> Chỉnh sửa từ vựng
                                    </h3>
                                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                                        Thuộc {editingVocab.chapterName} • {editingVocab.lessonName}
                                    </p>
                                </div>
                                <div className="flex items-center gap-2">
                                    {onGeminiAssist && (
                                        <button
                                            type="button"
                                            onClick={handleAiFill}
                                            disabled={isAiLoading}
                                            className="px-2.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold flex items-center gap-1 shadow-xs cursor-pointer disabled:opacity-50"
                                            title="AI điền thông tin còn thiếu"
                                        >
                                            {isAiLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wand2 className="w-3.5 h-3.5" />}
                                            AI Điền
                                        </button>
                                    )}
                                    <button
                                        onClick={handleSave}
                                        disabled={isSaving}
                                        className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1 shadow-xs cursor-pointer disabled:opacity-50"
                                    >
                                        {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                                        Lưu thay đổi
                                    </button>
                                    <button
                                        onClick={() => { setEditingVocab(null); setEditFormData(null); }}
                                        className="px-2.5 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold cursor-pointer"
                                    >
                                        Đóng
                                    </button>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Từ vựng</label>
                                    <input
                                        value={editFormData.word}
                                        onChange={e => setEditFormData(prev => ({ ...prev, word: e.target.value }))}
                                        className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Cách đọc (reading)</label>
                                    <input
                                        value={editFormData.reading}
                                        onChange={e => setEditFormData(prev => ({ ...prev, reading: e.target.value }))}
                                        className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white font-japanese"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Nghĩa</label>
                                    <input
                                        value={editFormData.meaning}
                                        onChange={e => setEditFormData(prev => ({ ...prev, meaning: e.target.value }))}
                                        className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Hán Việt</label>
                                    <input
                                        value={editFormData.sinoVietnamese}
                                        onChange={e => setEditFormData(prev => ({ ...prev, sinoVietnamese: e.target.value }))}
                                        className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white"
                                    />
                                </div>
                                <div className="sm:col-span-2">
                                    <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Câu ví dụ</label>
                                    <input
                                        value={editFormData.example}
                                        onChange={e => setEditFormData(prev => ({ ...prev, example: e.target.value }))}
                                        className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white font-japanese"
                                        placeholder="Ví dụ tiếng Nhật..."
                                    />
                                </div>
                                <div className="sm:col-span-2">
                                    <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Dịch nghĩa ví dụ</label>
                                    <input
                                        value={editFormData.exampleMeaning}
                                        onChange={e => setEditFormData(prev => ({ ...prev, exampleMeaning: e.target.value }))}
                                        className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white"
                                        placeholder="Nghĩa câu ví dụ..."
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Từ đồng nghĩa</label>
                                    <input
                                        value={editFormData.synonym}
                                        onChange={e => setEditFormData(prev => ({ ...prev, synonym: e.target.value }))}
                                        className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white font-japanese"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Ghi chú / Sắc thái</label>
                                    <input
                                        value={editFormData.nuance}
                                        onChange={e => setEditFormData(prev => ({ ...prev, nuance: e.target.value }))}
                                        className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white"
                                    />
                                </div>
                            </div>
                        </div>
                    ) : null}

                    {/* RESULTS LIST */}
                    {searchQuery.trim() === '' ? (
                        <div className="py-12 text-center text-slate-400 dark:text-slate-500">
                            <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-30" />
                            <p className="text-sm font-medium">Nhập từ vựng cần tìm kiếm để chỉnh sửa nhanh</p>
                            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                                Hỗ trợ tìm kiếm theo chữ Hán, Hiragana, âm Hán Việt hoặc nghĩa tiếng Việt
                            </p>
                        </div>
                    ) : filteredVocab.length === 0 ? (
                        <div className="py-12 text-center text-slate-400 dark:text-slate-500">
                            <AlertTriangle className="w-10 h-10 mx-auto mb-2 text-amber-500/50" />
                            <p className="text-sm font-semibold">Không tìm thấy từ vựng nào phù hợp với "{searchQuery}"</p>
                            <p className="text-xs mt-1">Hãy thử kiểm tra lại chính tả hoặc tìm theo từ đồng nghĩa</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 px-1 flex items-center justify-between">
                                <span>Tìm thấy <strong className="text-blue-600 dark:text-blue-400">{filteredVocab.length}</strong> từ vựng</span>
                            </div>

                            {filteredVocab.map((item, idx) => {
                                const word = item.word || item.front || '';
                                const displayWord = word.split('（')[0].split('(')[0].trim();
                                const isCurrentEditing = editingVocab?.lessonId === item.lessonId && editingVocab?.vocabIndex === item.vocabIndex;

                                return (
                                    <div
                                        key={`${item.chapterId}_${item.lessonId}_${item.vocabIndex}_${idx}`}
                                        className={`p-3.5 rounded-xl border transition-all ${
                                            isCurrentEditing
                                                ? 'bg-blue-50/70 dark:bg-blue-950/40 border-blue-300 dark:border-blue-700 ring-2 ring-blue-500/20'
                                                : 'bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700/80 hover:border-blue-300 dark:hover:border-blue-700/60 shadow-xs'
                                        }`}
                                    >
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                            {/* Info */}
                                            <div className="min-w-0 flex-1 space-y-1">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className="font-bold text-base sm:text-lg text-slate-900 dark:text-white font-japanese">
                                                        {displayWord}
                                                    </span>
                                                    {item.reading && (
                                                        <span className="text-xs font-medium text-slate-500 dark:text-slate-400 font-japanese">
                                                            [{item.reading}]
                                                        </span>
                                                    )}
                                                    {(item.sinoVietnamese || item.sinoViet) && (
                                                        <span className="text-xs font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-1.5 py-0.5 rounded border border-amber-200/60 dark:border-amber-800/40">
                                                            {item.sinoVietnamese || item.sinoViet}
                                                        </span>
                                                    )}
                                                    <button
                                                        onClick={() => speakJapanese(displayWord, null, null, null, item.reading || '')}
                                                        className="p-1 rounded-md text-slate-400 hover:text-blue-500 transition-colors cursor-pointer"
                                                        title="Nghe phát âm"
                                                    >
                                                        <Volume2 className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>

                                                <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 line-clamp-2">
                                                    {item.meaning || item.back || 'Chưa có nghĩa'}
                                                </p>

                                                {/* Vị trí trong sách */}
                                                <div className="flex items-center gap-2 text-[11px] text-slate-400 dark:text-slate-500 pt-0.5 flex-wrap">
                                                    <span className="flex items-center gap-1">
                                                        <Layers className="w-3 h-3" />
                                                        {item.chapterName}
                                                    </span>
                                                    <span>•</span>
                                                    <span className="font-medium text-slate-600 dark:text-slate-400">
                                                        {item.lessonName}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Actions */}
                                            <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                                                {isAdmin && (
                                                    <button
                                                        onClick={() => handleStartEdit(item)}
                                                        className="px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/40 dark:hover:bg-blue-900/50 text-blue-600 dark:text-blue-400 text-xs font-bold flex items-center gap-1.5 border border-blue-200 dark:border-blue-800/60 transition-all cursor-pointer"
                                                        title="Sửa từ vựng này"
                                                    >
                                                        <Edit className="w-3.5 h-3.5" />
                                                        <span>Sửa nhanh</span>
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => handleGoToLesson(item)}
                                                    className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-xs font-medium flex items-center gap-1 transition-all cursor-pointer"
                                                    title="Mở bài học chứa từ này"
                                                >
                                                    <span>Vào bài học</span>
                                                    <ExternalLink className="w-3 h-3 opacity-70" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-3 sm:p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between text-xs text-slate-500">
                    <span>Mẹo: Nhấn ESC hoặc nút [Đóng] để thoát</span>
                    <button
                        onClick={onClose}
                        className="px-4 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 font-semibold text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
                    >
                        Đóng
                    </button>
                </div>
            </div>
        </div>
    );
};

export default BookVocabSearchModal;
