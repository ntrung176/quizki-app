import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ChevronLeft, Plus, Save, Trash2, Sparkles, Loader2, Volume2, BookMarked, Copy, FileText, Check } from 'lucide-react';
import { getAuth } from 'firebase/auth';
import { TopTabBar } from '../ui';
import { GRAMMAR_TABS } from '../../config/tabs';
import { getGrammarNotebookById, getCachedGrammarNotebooks, saveGrammarNotebook, aiAssistGrammarPoint } from '../../utils/grammarNotebookService';
import { speakExampleSentence } from '../../utils/audio';
import { showToast } from '../../utils/toast';
import GrammarNotebookBatchModal from '../grammar/GrammarNotebookBatchModal';

const createEmptyItem = () => ({
    id: `item_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    pattern: '',
    meaning: '',
    connection: '',
    usageScope: '',
    notes: '',
    examples: []
});

export const GrammarNotebookEditScreen = () => {
    const navigate = useNavigate();
    const { notebookId } = useParams();
    const [searchParams] = useSearchParams();
    const auth = getAuth();
    const userId = auth?.currentUser?.uid;

    const cachedItem = notebookId ? getCachedGrammarNotebooks(userId).find(nb => nb.id === notebookId) : null;
    const [title, setTitle] = useState(() => {
        if (!notebookId) return searchParams.get('title') || '';
        return cachedItem?.title || '';
    });
    const [description, setDescription] = useState(() => cachedItem?.description || '');
    const [items, setItems] = useState(() => (cachedItem?.items && cachedItem.items.length > 0 ? cachedItem.items : [createEmptyItem()]));
    const [saving, setSaving] = useState(false);
    const [loading, setLoading] = useState(() => Boolean(notebookId && !cachedItem));
    const [aiLoadingMap, setAiLoadingMap] = useState({});
    const [batchModalOpen, setBatchModalOpen] = useState(false);

    useEffect(() => {
        if (!notebookId) {
            const paramTitle = searchParams.get('title');
            if (paramTitle && !title) setTitle(paramTitle);
            return;
        }

        const load = async () => {
            if (!cachedItem) setLoading(true);
            try {
                const data = await getGrammarNotebookById(userId, notebookId);
                if (data) {
                    setTitle(data.title || 'Sổ tay ngữ pháp');
                    setDescription(data.description || '');
                    setItems(data.items && data.items.length > 0 ? data.items : [createEmptyItem()]);
                } else if (!cachedItem) {
                    showToast('Không tìm thấy sổ tay', 'error');
                    navigate('/grammar/notebook');
                }
            } catch (e) {
                console.warn('Error loading notebook:', e);
            } finally {
                setLoading(false);
            }
        };

        load();
    }, [notebookId, userId, navigate]);

    // Count valid items (has both pattern and meaning)
    const validCount = items.filter(it => it.pattern.trim() && it.meaning.trim()).length;

    // Item handlers
    const handleUpdateItem = (itemId, field, value) => {
        setItems(prev => prev.map(it => it.id === itemId ? { ...it, [field]: value } : it));
    };

    const handleAddItem = () => {
        setItems(prev => [...prev, createEmptyItem()]);
    };

    const handleDeleteItem = (itemId) => {
        if (items.length <= 1) {
            setItems([createEmptyItem()]);
            return;
        }
        setItems(prev => prev.filter(it => it.id !== itemId));
    };

    // Example handlers
    const handleAddExample = (itemId) => {
        setItems(prev => prev.map(it => {
            if (it.id !== itemId) return it;
            return {
                ...it,
                examples: [...(it.examples || []), { ja: '', vi: '' }]
            };
        }));
    };

    const handleUpdateExample = (itemId, exIdx, field, val) => {
        setItems(prev => prev.map(it => {
            if (it.id !== itemId) return it;
            const updated = [...(it.examples || [])];
            updated[exIdx] = { ...updated[exIdx], [field]: val };
            return { ...it, examples: updated };
        }));
    };

    const handleDeleteExample = (itemId, exIdx) => {
        setItems(prev => prev.map(it => {
            if (it.id !== itemId) return it;
            const updated = (it.examples || []).filter((_, i) => i !== exIdx);
            return { ...it, examples: updated };
        }));
    };

    // AI Single Item Assist
    const handleAiAssist = async (itemId, pattern, meaning = '') => {
        if (!pattern || !pattern.trim()) {
            showToast('Vui lòng nhập Mẫu ngữ pháp trước khi gọi AI.', 'warning');
            return;
        }

        setAiLoadingMap(prev => ({ ...prev, [itemId]: true }));
        try {
            const aiData = await aiAssistGrammarPoint(pattern, meaning);
            setItems(prev => prev.map(it => {
                if (it.id !== itemId) return it;
                return {
                    ...it,
                    meaning: aiData.meaning || (meaning && meaning.trim()) || it.meaning,
                    connection: aiData.connection || it.connection,
                    usageScope: aiData.usageScope || it.usageScope,
                    notes: aiData.notes || it.notes,
                    examples: aiData.examples && aiData.examples.length > 0 ? aiData.examples : it.examples
                };
            }));
            if (meaning && meaning.trim()) {
                showToast(`AI đã tìm chính xác theo cách dùng "${meaning.trim()}"!`, 'success');
            } else {
                showToast(`AI đã tự động điền thông tin cho "${pattern}"!`, 'success');
            }
        } catch (err) {
            console.error('AI Assist error:', err);
            showToast(err.message || 'Lỗi khi gọi AI', 'error');
        } finally {
            setAiLoadingMap(prev => ({ ...prev, [itemId]: false }));
        }
    };

    // Batch import callback
    const handleImportBatchItems = (newItems) => {
        const mapped = newItems.map((it, idx) => ({
            id: `item_${Date.now()}_${idx}`,
            pattern: it.pattern || '',
            meaning: it.meaning || '',
            connection: it.connection || '',
            usageScope: it.usageScope || '',
            notes: it.notes || '',
            examples: it.examples || []
        }));

        // Replace if current has only 1 blank item
        if (items.length === 1 && !items[0].pattern.trim() && !items[0].meaning.trim()) {
            setItems(mapped);
        } else {
            setItems(prev => [...prev, ...mapped]);
        }
    };

    // Save notebook handler
    const handleSave = async () => {
        if (!title.trim()) {
            showToast('Vui lòng nhập tên sổ tay.', 'warning');
            return;
        }

        const validItems = items.filter(it => it.pattern.trim() && it.meaning.trim());
        if (validItems.length === 0) {
            showToast('Sổ tay cần có ít nhất 1 mẫu ngữ pháp có Mẫu và Ý nghĩa.', 'warning');
            return;
        }

        setSaving(true);
        try {
            const saved = await saveGrammarNotebook(userId, {
                id: notebookId || undefined,
                title: title.trim(),
                description: description.trim(),
                items: validItems
            });

            showToast('Đã lưu sổ tay thành công!', 'success');
            // Navigate directly to study flashcards as requested
            navigate(`/grammar/notebook/${saved.id}`);
        } catch (err) {
            console.error('Save error:', err);
            showToast('Lỗi khi lưu sổ tay', 'error');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="w-full min-h-screen pb-16">
                <TopTabBar tabs={GRAMMAR_TABS} />
                <div className="py-20 text-center text-slate-400 font-medium animate-pulse">
                    Đang nạp dữ liệu sổ tay...
                </div>
            </div>
        );
    }

    return (
        <div className="w-full pb-20 bg-transparent min-h-screen">
            <TopTabBar tabs={GRAMMAR_TABS} />

            <div className="max-w-5xl mx-auto px-4 sm:px-6 md:px-8 mt-4 space-y-6 animate-fade-in">
                {/* Top Action Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
                    <div className="space-y-1">
                        <button
                            type="button"
                            onClick={() => navigate('/grammar/notebook')}
                            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-sky-600 dark:text-slate-400 dark:hover:text-sky-400 transition-colors cursor-pointer"
                        >
                            <ChevronLeft className="w-4 h-4" />
                            <span>Sổ tay ngữ pháp</span>
                        </button>
                        <div className="flex items-center gap-2.5">
                            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                                {notebookId ? 'Chỉnh sửa sổ tay' : 'Tạo sổ tay mới'}
                            </h1>
                            <span className="text-xs font-black text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/60 border border-sky-200 dark:border-sky-800 px-2.5 py-0.5 rounded-lg">
                                {validCount} mẫu hợp lệ
                            </span>
                        </div>
                    </div>

                    <div className="flex items-center gap-2.5 self-start sm:self-center shrink-0">
                        <button
                            type="button"
                            onClick={() => setBatchModalOpen(true)}
                            className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-white dark:bg-slate-800 border-2 border-b-4 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-sky-300 font-black text-xs shadow-xs transition-all cursor-pointer active:translate-y-0.5 active:border-b-2 select-none"
                        >
                            <FileText className="w-4 h-4 text-sky-500" />
                            <span>Nhập hàng loạt</span>
                        </button>

                        <button
                            type="button"
                            onClick={handleSave}
                            disabled={saving}
                            className="flex items-center gap-1.5 px-5 py-2.5 rounded-2xl bg-sky-500 hover:bg-sky-400 border-2 border-b-4 border-sky-700 text-white font-black text-xs sm:text-sm shadow-md transition-all cursor-pointer active:translate-y-0.5 active:border-b-2 disabled:opacity-50 select-none"
                        >
                            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            <span>Lưu sổ tay</span>
                        </button>
                    </div>
                </div>

                {/* Notebook Info Card (Title & Description) */}
                <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-xs border-2 border-b-4 border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-6 space-y-4 shadow-xs">
                    <div>
                        <label className="block text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                            TÊN SỔ TAY NGỮ PHÁP <span className="text-rose-500">*</span>
                        </label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="VD: Tổng hợp ngữ pháp N3, Mẫu câu chỉ mục đích, v.v..."
                            className="w-full text-base sm:text-lg font-bold px-4 py-3 bg-slate-50 dark:bg-slate-950 border-2 border-slate-200 dark:border-slate-800 rounded-2xl outline-none focus:border-sky-500 dark:text-white transition-colors"
                        />
                    </div>

                    <div>
                        <label className="block text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                            MÔ TẢ (TUỲ CHỌN)
                        </label>
                        <input
                            type="text"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Mô tả mục tiêu học tập, thời hạn ôn tập của sổ tay này..."
                            className="w-full text-xs sm:text-sm font-medium px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border-2 border-slate-200 dark:border-slate-800 rounded-2xl outline-none focus:border-sky-500 dark:text-white transition-colors"
                        />
                    </div>
                </div>

                {/* Grammar Item Cards List (Matches Image 3 & Image 4) */}
                <div className="space-y-5">
                    {items.map((item, idx) => {
                        const isAiLoading = aiLoadingMap[item.id];
                        return (
                            <div
                                key={item.id}
                                className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-xs border-2 border-b-4 border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-xs transition-all hover:border-slate-300 dark:hover:border-slate-700"
                            >
                                {/* Card Header */}
                                <div className="bg-sky-50/70 dark:bg-sky-950/30 px-5 py-3 border-b border-slate-200 dark:border-slate-800/80 flex items-center justify-between">
                                    <span className="font-black text-xs text-sky-700 dark:text-sky-300 uppercase tracking-wider">
                                        Mẫu #{idx + 1}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => handleDeleteItem(item.id)}
                                        className="p-1 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                                        title="Xóa mẫu này"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>

                                {/* Card Body: Form Fields */}
                                <div className="p-5 sm:p-6 space-y-4">
                                    {/* Row 1: Mẫu ngữ pháp & Ý nghĩa */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                                                Mẫu ngữ pháp <span className="text-rose-500 font-bold">*</span>
                                            </label>
                                            <div className="flex gap-2">
                                                <input
                                                    type="text"
                                                    value={item.pattern}
                                                    onChange={(e) => handleUpdateItem(item.id, 'pattern', e.target.value)}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') {
                                                            e.preventDefault();
                                                            if (item.pattern.trim() && !isAiLoading) {
                                                                handleAiAssist(item.id, item.pattern, item.meaning);
                                                            }
                                                        }
                                                    }}
                                                    placeholder="〜てから"
                                                    className="w-full text-sm font-bold font-japanese px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border-2 border-slate-200 dark:border-slate-800 rounded-2xl outline-none focus:border-sky-500 dark:text-white transition-colors"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => handleAiAssist(item.id, item.pattern, item.meaning)}
                                                    disabled={isAiLoading || !item.pattern.trim()}
                                                    className="flex items-center justify-center px-3.5 py-2.5 bg-sky-500 hover:bg-sky-400 border-b-4 border-sky-700 active:translate-y-0.5 active:border-b-0 text-white rounded-2xl transition-all font-black text-xs disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0 min-w-[44px] cursor-pointer select-none"
                                                    title={item.meaning?.trim() ? `AI tìm chính xác theo cách dùng "${item.meaning}"` : "Tự động điền ngữ pháp bằng AI (Nhập thêm Ý nghĩa nếu muốn tìm đúng cách dùng)"}
                                                >
                                                    {isAiLoading ? <Loader2 className="animate-spin w-4 h-4" /> : <span className="tracking-wide">AI</span>}
                                                </button>
                                            </div>
                                        </div>

                                        <div className="space-y-1.5">
                                            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                                                Ý nghĩa <span className="text-rose-500 font-bold">*</span>
                                            </label>
                                            <input
                                                type="text"
                                                value={item.meaning}
                                                onChange={(e) => handleUpdateItem(item.id, 'meaning', e.target.value)}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') {
                                                        e.preventDefault();
                                                        if (item.pattern.trim() && !isAiLoading) {
                                                            handleAiAssist(item.id, item.pattern, item.meaning);
                                                        }
                                                    }
                                                }}
                                                placeholder="Sau khi... rồi mới... (nhập để AI tìm đúng cách dùng này)"
                                                className="w-full text-sm font-medium px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border-2 border-slate-200 dark:border-slate-800 rounded-2xl outline-none focus:border-sky-500 dark:text-white"
                                            />
                                        </div>
                                    </div>

                                    {/* Row 2: Cách nối (接続) & Phạm vi sử dụng */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                                                Cách nối (接続)
                                            </label>
                                            <input
                                                type="text"
                                                value={item.connection}
                                                onChange={(e) => handleUpdateItem(item.id, 'connection', e.target.value)}
                                                placeholder="Vて + から"
                                                className="w-full text-xs sm:text-sm font-japanese px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border-2 border-slate-200 dark:border-slate-800 rounded-2xl outline-none focus:border-sky-500 dark:text-white"
                                            />
                                        </div>

                                        <div className="space-y-1.5">
                                            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                                                Phạm vi sử dụng
                                            </label>
                                            <input
                                                type="text"
                                                value={item.usageScope}
                                                onChange={(e) => handleUpdateItem(item.id, 'usageScope', e.target.value)}
                                                placeholder="Khi nào dùng, sắc thái, hạn chế..."
                                                className="w-full text-xs sm:text-sm px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border-2 border-slate-200 dark:border-slate-800 rounded-2xl outline-none focus:border-sky-500 dark:text-white"
                                            />
                                        </div>
                                    </div>

                                    {/* Row 3: Ghi chú */}
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                                            Ghi chú
                                        </label>
                                        <textarea
                                            value={item.notes}
                                            onChange={(e) => handleUpdateItem(item.id, 'notes', e.target.value)}
                                            rows={2}
                                            placeholder="Mẫu dễ nhầm, cấp độ JLPT, mẹo nhớ..."
                                            className="w-full text-xs sm:text-sm px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border-2 border-slate-200 dark:border-slate-800 rounded-2xl outline-none focus:border-sky-500 dark:text-white resize-none"
                                        />
                                    </div>

                                    {/* Row 4: Câu ví dụ */}
                                    <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800/80">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                                Câu ví dụ ({item.examples?.length || 0})
                                            </span>
                                            <button
                                                type="button"
                                                onClick={() => handleAddExample(item.id)}
                                                className="inline-flex items-center gap-1 text-[11px] font-bold px-3 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 rounded-xl transition-all cursor-pointer border border-slate-200 dark:border-slate-700"
                                            >
                                                <Plus className="w-3.5 h-3.5" />
                                                <span>Thêm ví dụ</span>
                                            </button>
                                        </div>

                                        {(!item.examples || item.examples.length === 0) ? (
                                            <p className="text-xs text-slate-400 dark:text-slate-500 py-1.5 italic">
                                                Chưa có ví dụ. Bấm Thêm ví dụ để bổ sung.
                                            </p>
                                        ) : (
                                            <div className="space-y-2.5">
                                                {item.examples.map((ex, exIdx) => (
                                                    <div key={exIdx} className="p-3 bg-slate-50 dark:bg-slate-950/60 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-start gap-2.5">
                                                        <span className="text-[10px] font-black text-slate-400 select-none pt-2">
                                                            #{exIdx + 1}
                                                        </span>
                                                        <div className="flex-1 space-y-1.5 min-w-0">
                                                            <div className="flex items-center gap-2">
                                                                <input
                                                                    type="text"
                                                                    value={ex.ja}
                                                                    onChange={(e) => handleUpdateExample(item.id, exIdx, 'ja', e.target.value)}
                                                                    placeholder="Câu ví dụ tiếng Nhật..."
                                                                    className="w-full text-xs sm:text-sm font-japanese px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl outline-none focus:border-sky-500 dark:text-white"
                                                                />
                                                                {ex.ja && (
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => speakExampleSentence(ex.ja)}
                                                                        className="p-1.5 text-slate-400 hover:text-sky-500 transition-colors shrink-0 cursor-pointer"
                                                                        title="Nghe phát âm"
                                                                    >
                                                                        <Volume2 className="w-4 h-4" />
                                                                    </button>
                                                                )}
                                                            </div>
                                                            <input
                                                                type="text"
                                                                value={ex.vi}
                                                                onChange={(e) => handleUpdateExample(item.id, exIdx, 'vi', e.target.value)}
                                                                placeholder="Dịch nghĩa tiếng Việt..."
                                                                className="w-full text-xs px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl outline-none focus:border-sky-500 dark:text-white"
                                                            />
                                                        </div>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleDeleteExample(item.id, exIdx)}
                                                            className="p-1 text-slate-400 hover:text-rose-500 transition-colors cursor-pointer shrink-0 mt-1"
                                                            title="Xóa ví dụ này"
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Big Button: Thêm mẫu ngữ pháp */}
                <button
                    type="button"
                    onClick={handleAddItem}
                    className="w-full py-3.5 rounded-3xl bg-white/95 dark:bg-slate-900/95 border-2 border-b-4 border-dashed border-sky-400/80 dark:border-sky-600/80 text-sky-600 dark:text-sky-400 hover:bg-sky-50/50 dark:hover:bg-sky-950/30 font-black text-sm flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer active:translate-y-0.5 active:border-b-2 select-none"
                >
                    <Plus className="w-5 h-5 stroke-[2.5]" />
                    <span>Thêm mẫu ngữ pháp</span>
                </button>

                {/* Footer Note & Save Button (Matches Image 3 & Image 4) */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 border-t border-slate-200 dark:border-slate-800">
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed max-w-xl">
                        Mỗi mẫu cần có ít nhất <strong>Mẫu ngữ pháp</strong> và <strong>Ý nghĩa</strong>. Các trường khác tuỳ chọn. Lưu xong sẽ chuyển sang học flashcard.
                    </p>
                    <button
                        type="button"
                        onClick={handleSave}
                        disabled={saving}
                        className="self-end sm:self-center flex items-center gap-2 px-7 py-3 rounded-2xl bg-sky-500 hover:bg-sky-400 border-2 border-b-4 border-sky-700 text-white font-black text-sm shadow-md transition-all cursor-pointer active:translate-y-0.5 active:border-b-2 disabled:opacity-50 select-none shrink-0"
                    >
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        <span>Lưu</span>
                    </button>
                </div>
            </div>

            {/* Batch Import Modal */}
            <GrammarNotebookBatchModal
                isOpen={batchModalOpen}
                onClose={() => setBatchModalOpen(false)}
                onImportItems={handleImportBatchItems}
            />
        </div>
    );
};

export default GrammarNotebookEditScreen;

