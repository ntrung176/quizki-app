import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
    ChevronLeft, Plus, Trash2, Loader2, Volume2,
    Check, FileJson, Wrench, ChevronUp
} from 'lucide-react';
import { getAuth } from 'firebase/auth';
import { TopTabBar } from '../ui';
import { GRAMMAR_TABS } from '../../config/tabs';
import {
    getGrammarNotebookById, getCachedGrammarNotebooks,
    findNotebookInAnyLocalStorage, saveGrammarNotebook,
    aiAssistGrammarPoint
} from '../../utils/grammarNotebookService';
import { speakExampleSentence } from '../../utils/audio';
import { showToast } from '../../utils/toast';
import GrammarNotebookBatchModal from '../grammar/GrammarNotebookBatchModal';
import GrammarJsonImportModal from '../grammar/GrammarJsonImportModal';

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
    const [userId, setUserId] = useState(() => auth?.currentUser?.uid || null);

    // Sync auth state
    useEffect(() => {
        const unsub = auth.onAuthStateChanged(user => {
            if (user?.uid && user.uid !== userId) {
                setUserId(user.uid);
            }
        });
        return () => unsub?.();
    }, [userId]);

    const cachedItem = notebookId
        ? (getCachedGrammarNotebooks(userId).find(nb => nb && nb.id === notebookId) || findNotebookInAnyLocalStorage(notebookId) || null)
        : null;
    const [title, setTitle] = useState(() => {
        if (!notebookId) return searchParams.get('title') || '';
        return cachedItem?.title || '';
    });
    const [description, setDescription] = useState(() => cachedItem?.description || '');
    const [items, setItems] = useState(() => (cachedItem?.items && cachedItem.items.length > 0 ? cachedItem.items : [createEmptyItem()]));
    const [activeItemId, setActiveItemId] = useState(() => (cachedItem?.items?.[0]?.id || null));
    const [saving, setSaving] = useState(false);
    const [loading, setLoading] = useState(() => Boolean(notebookId && !cachedItem));
    const [aiLoadingMap, setAiLoadingMap] = useState({});
    const [batchModalOpen, setBatchModalOpen] = useState(false);
    const [jsonModalOpen, setJsonModalOpen] = useState(false);
    const bottomRef = useRef(null);
    const didAutoScrollRef = useRef(false);

    const isScrollToBottomRequested = searchParams.get('scrollToBottom') === 'true' || searchParams.get('action') === 'add';
    const isActionAddRequested = searchParams.get('action') === 'add';

    useEffect(() => {
        if (!notebookId) {
            const paramTitle = searchParams.get('title');
            if (paramTitle && !title) setTitle(paramTitle);
            if (!activeItemId && items[0]) setActiveItemId(items[0].id);
            return;
        }

        let isMounted = true;
        const load = async () => {
            const localFound = cachedItem || findNotebookInAnyLocalStorage(notebookId);
            if (localFound && !title) {
                setTitle(localFound.title || 'Sổ tay ngữ pháp');
                setDescription(localFound.description || '');
                const initItems = localFound.items && localFound.items.length > 0 ? localFound.items : [createEmptyItem()];
                setItems(initItems);
                setActiveItemId(initItems[0]?.id || null);
                setLoading(false);
            }

            try {
                const data = await getGrammarNotebookById(userId, notebookId);
                if (!isMounted) return;

                if (data) {
                    setTitle(data.title || 'Sổ tay ngữ pháp');
                    setDescription(data.description || '');
                    const loadedItems = data.items && data.items.length > 0 ? data.items : [createEmptyItem()];
                    setItems(loadedItems);
                    if (!activeItemId) setActiveItemId(loadedItems[0]?.id || null);
                } else if (!localFound) {
                    showToast('Không tìm thấy sổ tay', 'error');
                    navigate('/grammar/notebook');
                }
            } catch (e) {
                console.warn('Error loading notebook:', e);
            } finally {
                if (isMounted) setLoading(false);
            }
        };

        load();
        return () => { isMounted = false; };
    }, [notebookId, userId, navigate]);

    // Auto-scroll when requested
    useEffect(() => {
        if (!loading && items.length > 0 && !didAutoScrollRef.current) {
            didAutoScrollRef.current = true;
            if (isActionAddRequested) {
                const newItem = createEmptyItem();
                setItems(prev => [...prev, newItem]);
                setActiveItemId(newItem.id);
            }
            if (isScrollToBottomRequested) {
                setTimeout(() => {
                    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
                }, 350);
            }
        }
    }, [loading, isScrollToBottomRequested, isActionAddRequested, items.length]);

    // Count valid items
    const validCount = items.filter(it => it.pattern?.trim() && it.meaning?.trim()).length;

    // Activate item with smooth scroll into view
    const handleActivateItem = (itemId) => {
        setActiveItemId(itemId);
        setTimeout(() => {
            const el = document.getElementById(`grammar-item-${itemId}`);
            if (el) {
                el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
        }, 80);
    };

    // Item handlers
    const handleUpdateItem = (itemId, field, value) => {
        setItems(prev => prev.map(it => it.id === itemId ? { ...it, [field]: value } : it));
    };

    const handleAddItem = () => {
        const newItem = createEmptyItem();
        setItems(prev => [...prev, newItem]);
        setActiveItemId(newItem.id);
        setTimeout(() => {
            const el = document.getElementById(`grammar-item-${newItem.id}`);
            if (el) {
                el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            } else {
                bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
            }
        }, 100);
    };

    const handleDeleteItem = (itemId) => {
        if (items.length <= 1) {
            const fresh = createEmptyItem();
            setItems([fresh]);
            setActiveItemId(fresh.id);
            return;
        }
        setItems(prev => {
            const next = prev.filter(it => it.id !== itemId);
            if (activeItemId === itemId) {
                setActiveItemId(next[0]?.id || null);
            }
            return next;
        });
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
                    pattern: aiData.pattern || it.pattern,
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

    // Batch & JSON import callbacks
    const handleImportBatchItems = (newItems) => {
        const mapped = newItems.map((it, idx) => ({
            id: it.id || `item_${Date.now()}_${idx}`,
            pattern: it.pattern || '',
            meaning: it.meaning || '',
            connection: it.connection || '',
            usageScope: it.usageScope || '',
            notes: it.notes || '',
            examples: it.examples || []
        }));

        if (items.length === 1 && !items[0].pattern.trim() && !items[0].meaning.trim()) {
            setItems(mapped);
            setActiveItemId(mapped[0]?.id || null);
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

        const validItems = items.filter(it => it.pattern?.trim() && it.meaning?.trim());
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
        <div className="w-full pb-32 bg-transparent min-h-screen">
            <TopTabBar tabs={GRAMMAR_TABS} />

            <div className="max-w-4xl mx-auto px-4 lg:px-8 mt-4 sm:mt-5 space-y-4 sm:space-y-4.5 animate-fade-in">
                {/* Header Section: Matches Vocab Study Set */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
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
                            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-800 dark:text-white tracking-tight">
                                {notebookId ? 'Chỉnh sửa sổ tay' : 'Thêm sổ tay mới'}
                            </h2>
                            <span className="text-xs font-bold text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/60 border border-sky-200 dark:border-sky-800 px-2.5 py-0.5 rounded-xl">
                                {validCount} mẫu hợp lệ
                            </span>
                        </div>
                        <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm">
                            {notebookId
                                ? 'Cập nhật chi tiết và quản lý các mẫu ngữ pháp trong sổ tay này.'
                                : 'Tạo lộ trình học tập của bạn với bộ sưu tập ngữ pháp tập trung.'}
                        </p>
                    </div>

                    {/* Top Action Buttons (HỦY + TẠO/LƯU SỔ TAY) */}
                    <div className="flex items-center gap-2.5 shrink-0">
                        <button
                            type="button"
                            onClick={() => navigate('/grammar/notebook')}
                            className="px-5 py-2.5 text-xs font-bold uppercase tracking-wider rounded-2xl text-slate-700 bg-slate-100 hover:bg-slate-200 border-b-4 border-slate-300 dark:text-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 dark:border-slate-700 active:translate-y-0.5 active:border-b-2 transition-all cursor-pointer min-h-[42px] select-none"
                        >
                            HỦY
                        </button>
                        <button
                            type="button"
                            onClick={handleSave}
                            disabled={saving}
                            className="px-6 py-2.5 text-xs font-black uppercase tracking-wider rounded-2xl text-white bg-sky-500 hover:bg-sky-400 border-b-4 border-sky-700 active:translate-y-0.5 active:border-b-0 shadow-sm transition-all disabled:opacity-50 flex items-center gap-1.5 cursor-pointer min-h-[42px] select-none"
                        >
                            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                            <span>{saving ? 'ĐANG LƯU...' : (notebookId ? 'LƯU SỔ TAY' : 'TẠO SỔ TAY')}</span>
                        </button>
                    </div>
                </div>

                {/* Metadata Card: Matches Vocab Title & Description */}
                <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-6 md:p-7 shadow-sm border-2 border-slate-200 dark:border-slate-800">
                    <div className="space-y-4 sm:space-y-5">
                        <div>
                            <label className="block text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">
                                TIÊU ĐỀ SỔ TAY <span className="text-rose-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="VD: Tổng hợp ngữ pháp N3, Mẫu câu chỉ mục đích, v.v..."
                                className="w-full px-0 py-2.5 bg-transparent border-b-2 border-slate-200 dark:border-slate-700 focus:border-sky-500 dark:focus:border-sky-400 text-2xl font-bold text-slate-800 dark:text-white outline-none placeholder-slate-400 transition-colors"
                            />
                        </div>
                        <div>
                            <label className="block text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">
                                THÊM MÔ TẢ
                            </label>
                            <input
                                type="text"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Mô tả mục tiêu của bộ ngữ pháp này..."
                                className="w-full px-0 py-2 bg-transparent border-b-2 border-slate-200 dark:border-slate-700 focus:border-sky-500 dark:focus:border-sky-400 text-base text-slate-600 dark:text-slate-200 outline-none placeholder-slate-400 transition-colors"
                            />
                        </div>
                    </div>
                </div>

                {/* Tools Menu Row - Equal Symmetrical Spacing & Distinct Color */}
                <div className="flex items-center justify-between relative z-20">
                    <button
                        type="button"
                        onClick={handleAddItem}
                        className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-2xl text-white bg-sky-500 hover:bg-sky-400 border-b-4 border-sky-700 active:translate-y-0.5 active:border-b-2 transition-all cursor-pointer shadow-xs select-none"
                    >
                        <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                        <span>Thêm ngữ pháp</span>
                    </button>

                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => setJsonModalOpen(true)}
                            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-2xl text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border-b-4 border-slate-300 dark:border-slate-700 active:translate-y-0.5 active:border-b-2 transition-all cursor-pointer select-none"
                        >
                            <FileJson className="w-3.5 h-3.5 text-sky-500" />
                            <span>Nhập JSON</span>
                        </button>

                        <button
                            type="button"
                            onClick={() => setBatchModalOpen(true)}
                            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-2xl text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border-b-4 border-slate-300 dark:border-slate-700 active:translate-y-0.5 active:border-b-2 transition-all cursor-pointer select-none"
                        >
                            <Wrench className="w-3.5 h-3.5 text-sky-500" />
                            <span>AI & Dán thô</span>
                        </button>
                    </div>
                </div>

                {/* Grammar Item Cards List (Compact by default, click to expand) */}
                <div className="space-y-3 sm:space-y-3.5">
                    {items.map((item, idx) => {
                        const isActive = activeItemId === item.id;
                        const isAiLoading = aiLoadingMap[item.id];

                        // COMPACT VIEW: Matches Vocab compact cards
                        if (!isActive) {
                            return (
                                <div
                                    key={item.id}
                                    id={`grammar-item-${item.id}`}
                                    className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl p-3.5 sm:p-6 shadow-md border border-slate-200 dark:border-slate-800 hover:shadow-lg cursor-pointer transition-all group flex items-start gap-3 sm:gap-4 select-none"
                                    onClick={() => handleActivateItem(item.id)}
                                >
                                    <div className="flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold text-xs sm:text-sm shrink-0">
                                        {idx + 1}
                                    </div>
                                    <div className="flex-1 grid grid-cols-2 gap-2.5 sm:gap-6 min-w-0">
                                        <div className="border-b border-slate-100 dark:border-slate-800 pb-1.5 sm:pb-2 min-w-0">
                                            <p className={`text-sm sm:text-lg font-bold font-japanese ${item.pattern ? 'text-slate-800 dark:text-slate-200' : 'text-slate-400 dark:text-slate-500 italic'} truncate`}>
                                                {item.pattern || 'Mẫu ngữ pháp (〜...)'}
                                            </p>
                                            <p className="text-[9px] sm:text-[10px] font-bold text-slate-400 mt-0.5 uppercase tracking-wider">
                                                MẪU NGỮ PHÁP
                                            </p>
                                        </div>
                                        <div className="border-b border-slate-100 dark:border-slate-800 pb-1.5 sm:pb-2 min-w-0">
                                            <p className={`text-sm sm:text-lg font-bold ${item.meaning ? 'text-slate-800 dark:text-slate-200' : 'text-slate-400 dark:text-slate-500 italic'} truncate`}>
                                                {item.meaning || 'Ý nghĩa ngữ pháp'}
                                            </p>
                                            <p className="text-[9px] sm:text-[10px] font-bold text-slate-400 mt-0.5 uppercase tracking-wider">
                                                Ý NGHĨA
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleDeleteItem(item.id);
                                        }}
                                        className="p-1.5 text-slate-300 hover:text-rose-500 dark:text-slate-600 dark:hover:text-rose-400 opacity-80 sm:opacity-0 group-hover:opacity-100 transition-opacity min-h-[36px] min-w-[36px] flex items-center justify-center cursor-pointer shrink-0"
                                        title="Xóa mẫu"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            );
                        }

                        // EXPANDED DETAILED VIEW
                        return (
                            <div
                                key={item.id}
                                id={`grammar-item-${item.id}`}
                                className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-xs border-2 border-b-4 border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-md transition-all hover:border-slate-300 dark:hover:border-slate-700"
                            >
                                {/* Card Header */}
                                <div className="bg-sky-50/70 dark:bg-sky-950/30 px-5 py-3 border-b border-slate-200 dark:border-slate-800/80 flex items-center justify-between">
                                    <div className="flex items-center gap-2.5">
                                        <span className="font-black text-xs text-sky-700 dark:text-sky-300 uppercase tracking-wider">
                                            Mẫu #{idx + 1}
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => setActiveItemId(null)}
                                            className="inline-flex items-center gap-1 text-[11px] font-bold text-sky-600 dark:text-sky-400 hover:text-sky-700 dark:hover:text-sky-300 px-2 py-0.5 rounded-lg hover:bg-sky-100/60 dark:hover:bg-sky-900/40 cursor-pointer transition-colors"
                                            title="Thu gọn mẫu này"
                                        >
                                            <ChevronUp className="w-3.5 h-3.5" />
                                            <span>Thu gọn</span>
                                        </button>
                                    </div>
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
                                                placeholder="V-て + から"
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
                                                                    placeholder="Câu ví dụ tiếng Nhật (kèm ngoặc đọc)..."
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

                {/* Big Button: Thêm mẫu ngữ pháp mới (Centered like Vocab) */}
                <div className="pt-1 flex justify-center">
                    <button
                        type="button"
                        onClick={handleAddItem}
                        className="flex flex-col items-center justify-center gap-1.5 py-3.5 px-4 rounded-2xl bg-white dark:bg-slate-900 border-2 border-dashed border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-sky-500 hover:border-sky-400 dark:hover:border-sky-500 hover:bg-sky-50/20 font-bold text-xs sm:text-sm w-full transition-all cursor-pointer"
                    >
                        <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
                        <span>THÊM MẪU NGỮ PHÁP MỚI</span>
                    </button>
                </div>
                <div ref={bottomRef} className="h-4" />

                {/* Bottom Actions for Desktop: Matches Vocab Set */}
                <div className="hidden md:flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                    <button
                        type="button"
                        onClick={() => navigate('/grammar/notebook')}
                        className="px-5 py-2.5 text-xs font-bold uppercase tracking-wider rounded-2xl text-slate-700 bg-slate-100 hover:bg-slate-200 border-b-4 border-slate-300 dark:text-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 dark:border-slate-700 active:translate-y-0.5 active:border-b-2 transition-all cursor-pointer select-none"
                    >
                        HỦY
                    </button>
                    <button
                        type="button"
                        onClick={handleSave}
                        disabled={saving}
                        className="px-6 py-2.5 text-xs font-black uppercase tracking-wider rounded-2xl text-white bg-sky-500 hover:bg-sky-400 border-b-4 border-sky-700 active:translate-y-0.5 active:border-b-0 shadow-sm transition-all disabled:opacity-50 flex items-center gap-2 cursor-pointer select-none"
                    >
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                        <span>{saving ? 'ĐANG LƯU...' : (notebookId ? 'LƯU SỔ TAY' : 'TẠO SỔ TAY')}</span>
                    </button>
                </div>
            </div>

            {/* Bottom floating action bar on mobile: Matches Vocab Set */}
            <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/98 dark:bg-slate-900/98 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 shadow-xl md:hidden z-50 flex gap-3 pb-[max(1rem,env(safe-area-inset-bottom,1rem))]">
                <button
                    type="button"
                    onClick={() => navigate('/grammar/notebook')}
                    className="flex-1 px-4 py-3 text-xs font-bold uppercase tracking-wider rounded-2xl text-slate-700 bg-slate-100 hover:bg-slate-200 border-b-4 border-slate-300 dark:text-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 dark:border-slate-700 active:translate-y-0.5 active:border-b-2 transition-all flex items-center justify-center cursor-pointer select-none"
                >
                    HỦY
                </button>
                <button
                    type="button"
                    onClick={handleSave}
                    disabled={saving}
                    className="flex-1 px-4 py-3 text-xs font-black uppercase tracking-wider rounded-2xl text-white bg-sky-500 hover:bg-sky-400 border-b-4 border-sky-700 active:translate-y-0.5 active:border-b-0 transition-all disabled:opacity-50 flex items-center justify-center shadow-sm cursor-pointer select-none"
                >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <Check className="w-4 h-4 mr-1.5" />}
                    <span>{saving ? 'ĐANG LƯU...' : (notebookId ? 'LƯU SỔ TAY' : 'TẠO SỔ TAY')}</span>
                </button>
            </div>

            {/* Manual JSON Import Modal */}
            <GrammarJsonImportModal
                isOpen={jsonModalOpen}
                onClose={() => setJsonModalOpen(false)}
                onImport={handleImportBatchItems}
            />

            {/* Batch AI / Raw Text Modal */}
            <GrammarNotebookBatchModal
                isOpen={batchModalOpen}
                onClose={() => setBatchModalOpen(false)}
                onImportItems={handleImportBatchItems}
            />
        </div>
    );
};

export default GrammarNotebookEditScreen;
