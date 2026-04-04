import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { X, Save, BookOpen, Filter, Search, ChevronDown, ChevronUp, Check, AlertTriangle, Sparkles, Layers, SkipForward, Upload } from 'lucide-react';
import { doc, updateDoc, addDoc, collection } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { getJotobaKanjiData, getJotobaKanjiByLevel } from '../../data/jotobaKanjiData';
import { showToast } from '../../utils/toast';

const JLPT_LEVELS = ['N5', 'N4', 'N3', 'N2', 'N1'];

const LEVEL_COLORS = {
    N5: { gradient: 'from-emerald-500 to-teal-500', bg: 'bg-emerald-500', light: 'bg-emerald-50 dark:bg-emerald-900/20', text: 'text-emerald-600 dark:text-emerald-400', border: 'border-emerald-300 dark:border-emerald-700', ring: 'ring-emerald-400' },
    N4: { gradient: 'from-sky-500 to-blue-500', bg: 'bg-sky-500', light: 'bg-sky-50 dark:bg-sky-900/20', text: 'text-sky-600 dark:text-sky-400', border: 'border-sky-300 dark:border-sky-700', ring: 'ring-sky-400' },
    N3: { gradient: 'from-violet-500 to-purple-500', bg: 'bg-violet-500', light: 'bg-violet-50 dark:bg-violet-900/20', text: 'text-violet-600 dark:text-violet-400', border: 'border-violet-300 dark:border-violet-700', ring: 'ring-violet-400' },
    N2: { gradient: 'from-amber-500 to-orange-500', bg: 'bg-amber-500', light: 'bg-amber-50 dark:bg-amber-900/20', text: 'text-amber-600 dark:text-amber-400', border: 'border-amber-300 dark:border-amber-700', ring: 'ring-amber-400' },
    N1: { gradient: 'from-rose-500 to-pink-500', bg: 'bg-rose-500', light: 'bg-rose-50 dark:bg-rose-900/20', text: 'text-rose-600 dark:text-rose-400', border: 'border-rose-300 dark:border-rose-700', ring: 'ring-rose-400' },
};

const FILTER_OPTIONS = [
    { value: 'all', label: 'Tất cả', icon: '📋' },
    { value: 'empty', label: 'Chưa có câu chuyện', icon: '❌' },
    { value: 'filled', label: 'Đã có câu chuyện', icon: '✅' },
];

const KanjiStoryTool = ({ kanjiList, setKanjiList, onClose }) => {
    const [selectedLevel, setSelectedLevel] = useState('N5');
    const [filter, setFilter] = useState('empty'); // 'all' | 'empty' | 'filled'
    const [searchQuery, setSearchQuery] = useState('');
    const [editingId, setEditingId] = useState(null); // kanji character being edited
    const [editValue, setEditValue] = useState('');
    const [savingId, setSavingId] = useState(null);
    const [savedIds, setSavedIds] = useState(new Set());
    const [expandedId, setExpandedId] = useState(null);
    const [showImportModal, setShowImportModal] = useState(false);
    const [jsonInput, setJsonInput] = useState('');
    const [isImporting, setIsImporting] = useState(false);
    const textareaRefs = useRef({});
    const listRef = useRef(null);

    // Build kanji data for current level - merge Firebase + Jotoba
    const kanjiData = useMemo(() => {
        const fbMap = new Map();
        kanjiList.forEach(k => { if (k.character) fbMap.set(k.character, k); });

        // Get all kanji from both sources
        const jotobaChars = getJotobaKanjiByLevel(selectedLevel) || [];
        const fbChars = kanjiList.filter(k => k.level === selectedLevel).map(k => k.character);
        const allChars = [...new Set([...jotobaChars.map(j => j.literal), ...fbChars])];

        // Sort by stroke count
        allChars.sort((a, b) => {
            const jA = getJotobaKanjiData(a);
            const jB = getJotobaKanjiData(b);
            const strokeA = jA?.stroke_count || 999;
            const strokeB = jB?.stroke_count || 999;
            if (strokeA !== strokeB) return strokeA - strokeB;
            const freqA = jA?.frequency || 9999;
            const freqB = jB?.frequency || 9999;
            return freqA - freqB;
        });

        return allChars.map(char => {
            const fb = fbMap.get(char);
            const j = getJotobaKanjiData(char);
            return {
                character: char,
                id: fb?.id || null,
                sinoViet: fb?.sinoViet || j?.sinoViet || '',
                meaning: fb?.meaning || j?.meaningVi || j?.meanings?.join(', ') || '',
                onyomi: fb?.onyomi || j?.onyomi?.join('、') || '',
                kunyomi: fb?.kunyomi || j?.kunyomi?.join('、') || '',
                mnemonic: fb?.mnemonic || '',
                radical: fb?.radical || '',
                parts: j?.parts || [],
                strokeCount: j?.stroke_count || fb?.strokeCount || '',
                level: selectedLevel,
                _hasFb: !!fb,
            };
        });
    }, [kanjiList, selectedLevel]);

    // Filter kanji based on filter + search
    const filteredKanji = useMemo(() => {
        let result = kanjiData;

        // Filter by story status
        if (filter === 'empty') {
            result = result.filter(k => !k.mnemonic || k.mnemonic.trim() === '');
        } else if (filter === 'filled') {
            result = result.filter(k => k.mnemonic && k.mnemonic.trim() !== '');
        }

        // Search
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase().trim();
            result = result.filter(k =>
                k.character.includes(q) ||
                k.sinoViet?.toLowerCase().includes(q) ||
                k.meaning?.toLowerCase().includes(q)
            );
        }

        return result;
    }, [kanjiData, filter, searchQuery]);

    // Stats
    const stats = useMemo(() => {
        const total = kanjiData.length;
        const withStory = kanjiData.filter(k => k.mnemonic && k.mnemonic.trim()).length;
        return { total, withStory, withoutStory: total - withStory };
    }, [kanjiData]);

    // Save mnemonic to Firebase
    const saveMnemonic = useCallback(async (kanji, newMnemonic) => {
        if (!kanji) return;
        setSavingId(kanji.character);

        try {
            if (kanji.id) {
                // Update existing kanji in Firebase
                await updateDoc(doc(db, 'kanji', kanji.id), { mnemonic: newMnemonic });
                setKanjiList(prev => prev.map(k =>
                    k.id === kanji.id ? { ...k, mnemonic: newMnemonic } : k
                ));
            } else {
                // Create new kanji document in Firebase
                const jData = getJotobaKanjiData(kanji.character);
                const newDoc = {
                    character: kanji.character,
                    meaning: kanji.meaning || jData?.meaningVi || '',
                    sinoViet: kanji.sinoViet || jData?.sinoViet || '',
                    onyomi: kanji.onyomi || jData?.onyomi?.join('、') || '',
                    kunyomi: kanji.kunyomi || jData?.kunyomi?.join('、') || '',
                    level: kanji.level || selectedLevel,
                    mnemonic: newMnemonic,
                    radical: kanji.radical || '',
                    strokeCount: String(kanji.strokeCount || ''),
                };
                const docRef = await addDoc(collection(db, 'kanji'), newDoc);
                setKanjiList(prev => [...prev, { ...newDoc, id: docRef.id }]);
            }

            setSavedIds(prev => new Set([...prev, kanji.character]));
            // Clear saved indicator after 2 seconds
            setTimeout(() => {
                setSavedIds(prev => {
                    const next = new Set(prev);
                    next.delete(kanji.character);
                    return next;
                });
            }, 2000);
        } catch (e) {
            console.error('Error saving mnemonic:', e);
            showToast(`Lỗi lưu câu chuyện cho ${kanji.character}: ${e.message}`, 'error');
        } finally {
            setSavingId(null);
        }
    }, [selectedLevel, setKanjiList]);

    const handleImportJson = async () => {
        if (!jsonInput.trim()) return;
        setIsImporting(true);

        try {
            const data = JSON.parse(jsonInput);
            const items = Array.isArray(data) ? data : [data];
            let successCount = 0;

            for (const item of items) {
                if (!item.character || !item.mnemonic) continue;

                // Try to find if kanji doc exists in Firebase by looking at kanjiList
                const existingKanji = kanjiList.find(k => k.character === item.character);
                if (existingKanji) {
                    await updateDoc(doc(db, 'kanji', existingKanji.id), { mnemonic: item.mnemonic });
                    setKanjiList(prev => prev.map(k =>
                        k.id === existingKanji.id ? { ...k, mnemonic: item.mnemonic } : k
                    ));
                    successCount++;
                } else {
                    // Create minimal entry if missing in Firebase
                    const jData = getJotobaKanjiData(item.character);
                    if (jData) {
                        const newDoc = {
                            character: item.character,
                            meaning: jData.meaningVi || '',
                            sinoViet: jData.sinoViet || '',
                            onyomi: jData.onyomi?.join('、') || '',
                            kunyomi: jData.kunyomi?.join('、') || '',
                            level: jData.level || selectedLevel,
                            mnemonic: item.mnemonic,
                            radical: '',
                            strokeCount: String(jData.stroke_count || ''),
                        };
                        const docRef = await addDoc(collection(db, 'kanji'), newDoc);
                        setKanjiList(prev => [...prev, { ...newDoc, id: docRef.id }]);
                        successCount++;
                    }
                }
            }

            showToast(`Đã nhập thành công ${successCount} câu chuyện!`, 'success');
            setShowImportModal(false);
            setJsonInput('');
        } catch (e) {
            console.error('Lỗi import:', e);
            showToast('Lỗi đọc JSON: ' + e.message, 'error');
        } finally {
            setIsImporting(false);
        }
    };

    // Handle start editing
    const startEditing = useCallback((kanji) => {
        setEditingId(kanji.character);
        setEditValue(kanji.mnemonic || '');
        setTimeout(() => {
            const textarea = textareaRefs.current[kanji.character];
            if (textarea) {
                textarea.focus();
                textarea.setSelectionRange(textarea.value.length, textarea.value.length);
            }
        }, 50);
    }, []);

    // Handle save and move to next
    const saveAndNext = useCallback(async (currentKanji) => {
        const trimmed = editValue.trim();
        // Only save if content changed
        if (trimmed !== (currentKanji.mnemonic || '').trim()) {
            await saveMnemonic(currentKanji, trimmed);
        }

        // Find next kanji without story
        const currentIndex = filteredKanji.findIndex(k => k.character === currentKanji.character);
        let nextKanji = null;
        for (let i = currentIndex + 1; i < filteredKanji.length; i++) {
            if (!filteredKanji[i].mnemonic || filteredKanji[i].mnemonic.trim() === '') {
                nextKanji = filteredKanji[i];
                break;
            }
        }
        // Wrap around
        if (!nextKanji) {
            for (let i = 0; i < currentIndex; i++) {
                if (!filteredKanji[i].mnemonic || filteredKanji[i].mnemonic.trim() === '') {
                    nextKanji = filteredKanji[i];
                    break;
                }
            }
        }

        if (nextKanji) {
            startEditing(nextKanji);
            // Scroll to next
            setTimeout(() => {
                const el = document.getElementById(`kanji-story-${nextKanji.character}`);
                if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 100);
        } else {
            setEditingId(null);
            setEditValue('');
        }
    }, [editValue, filteredKanji, saveMnemonic, startEditing]);

    // Handle blur - save current
    const handleBlur = useCallback(async (kanji) => {
        const trimmed = editValue.trim();
        if (trimmed !== (kanji.mnemonic || '').trim()) {
            await saveMnemonic(kanji, trimmed);
        }
        setEditingId(null);
        setEditValue('');
    }, [editValue, saveMnemonic]);

    // Handle key down in textarea
    const handleKeyDown = useCallback((e, kanji) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            saveAndNext(kanji);
        }
        if (e.key === 'Escape') {
            setEditingId(null);
            setEditValue('');
        }
        // Tab to move to next
        if (e.key === 'Tab') {
            e.preventDefault();
            saveAndNext(kanji);
        }
    }, [saveAndNext]);

    // Auto-resize textarea
    const autoResize = useCallback((textarea) => {
        if (!textarea) return;
        textarea.style.height = 'auto';
        textarea.style.height = Math.max(48, textarea.scrollHeight) + 'px';
    }, []);

    useEffect(() => {
        if (editingId && textareaRefs.current[editingId]) {
            autoResize(textareaRefs.current[editingId]);
        }
    }, [editValue, editingId, autoResize]);

    return (
        <div className="fixed inset-0 bg-black/60 dark:bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-2 md:p-4">
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[95vh] flex flex-col overflow-hidden border border-gray-200 dark:border-slate-700">
                {/* Header */}
                <div className={`bg-gradient-to-r ${LEVEL_COLORS[selectedLevel]?.gradient || 'from-violet-500 to-purple-500'} p-4 md:p-5 flex-shrink-0`}>
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                                <BookOpen className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-white">📖 Nhập Câu Chuyện Kanji</h2>
                                <p className="text-white/70 text-xs">Nhập nhanh câu chuyện ghi nhớ (mnemonic) cho từng Kanji</p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 bg-white/20 hover:bg-white/30 rounded-xl text-white transition-all"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Level Tabs */}
                    <div className="flex gap-1.5 mb-3">
                        {JLPT_LEVELS.map(level => (
                            <button
                                key={level}
                                onClick={() => { setSelectedLevel(level); setEditingId(null); }}
                                className={`px-3 py-1.5 rounded-lg text-sm font-bold transition-all ${selectedLevel === level
                                    ? 'bg-white text-gray-900 shadow-lg scale-105'
                                    : 'bg-white/20 text-white/80 hover:bg-white/30 hover:text-white'
                                    }`}
                            >
                                {level}
                            </button>
                        ))}
                    </div>

                    {/* Stats + Filter Row */}
                    <div className="flex flex-wrap items-center gap-2">
                        {/* Stats */}
                        <div className="flex gap-2">
                            <div className="bg-white/15 backdrop-blur-sm rounded-lg px-2.5 py-1.5 text-center border border-white/10">
                                <div className="text-sm font-bold text-white">{stats.total}</div>
                                <div className="text-[9px] text-white/60">Tổng</div>
                            </div>
                            <div className="bg-emerald-400/20 backdrop-blur-sm rounded-lg px-2.5 py-1.5 text-center border border-emerald-300/20">
                                <div className="text-sm font-bold text-emerald-200">{stats.withStory}</div>
                                <div className="text-[9px] text-emerald-200/60">Đã có</div>
                            </div>
                            <div className="bg-red-400/20 backdrop-blur-sm rounded-lg px-2.5 py-1.5 text-center border border-red-300/20">
                                <div className="text-sm font-bold text-red-200">{stats.withoutStory}</div>
                                <div className="text-[9px] text-red-200/60">Thiếu</div>
                            </div>
                        </div>

                        {/* Progress bar */}
                        <div className="flex-1 min-w-[120px]">
                            <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-gradient-to-r from-emerald-400 to-emerald-300 rounded-full transition-all duration-500"
                                    style={{ width: `${stats.total > 0 ? (stats.withStory / stats.total * 100) : 0}%` }}
                                />
                            </div>
                            <div className="text-[10px] text-white/50 mt-0.5 text-right">
                                {stats.total > 0 ? Math.round(stats.withStory / stats.total * 100) : 0}% hoàn thành
                            </div>
                        </div>
                    </div>
                </div>

                {/* Toolbar */}
                <div className="px-4 py-2.5 bg-gray-50 dark:bg-slate-800/80 border-b border-gray-200 dark:border-slate-700 flex flex-wrap items-center gap-2 flex-shrink-0">
                    {/* Filter buttons  */}
                    <div className="flex gap-1">
                        {FILTER_OPTIONS.map(opt => (
                            <button
                                key={opt.value}
                                onClick={() => setFilter(opt.value)}
                                className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${filter === opt.value
                                    ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 ring-1 ring-indigo-300 dark:ring-indigo-700'
                                    : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-slate-600'
                                    }`}
                            >
                                {opt.icon} {opt.label}
                            </button>
                        ))}
                    </div>

                    {/* Search */}
                    <div className="relative flex-1 min-w-[150px]">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            placeholder="Tìm kanji, HV, nghĩa..."
                            className="w-full pl-8 pr-3 py-1.5 bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg text-xs text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-indigo-400 focus:border-transparent"
                        />
                    </div>

                    {/* Count */}
                    <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                        {filteredKanji.length} kanji
                    </span>
                </div>

                {/* Kanji List */}
                <div ref={listRef} className="flex-1 overflow-y-auto p-3 md:p-4 space-y-1.5">
                    {filteredKanji.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-gray-400 dark:text-gray-500">
                            {filter === 'empty' ? (
                                <>
                                    <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 rounded-2xl flex items-center justify-center mb-4">
                                        <Check className="w-8 h-8 text-emerald-500" />
                                    </div>
                                    <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400 mb-1">🎉 Hoàn tất!</p>
                                    <p className="text-sm">Tất cả kanji {selectedLevel} đã có câu chuyện</p>
                                </>
                            ) : (
                                <>
                                    <Search className="w-12 h-12 mb-3 opacity-50" />
                                    <p className="text-sm">Không tìm thấy kanji phù hợp</p>
                                </>
                            )}
                        </div>
                    ) : (
                        filteredKanji.map((kanji, idx) => {
                            const isEditing = editingId === kanji.character;
                            const isSaving = savingId === kanji.character;
                            const isSaved = savedIds.has(kanji.character);
                            const isExpanded = expandedId === kanji.character;
                            const hasStory = kanji.mnemonic && kanji.mnemonic.trim();
                            const colors = LEVEL_COLORS[selectedLevel] || LEVEL_COLORS.N5;

                            return (
                                <div
                                    key={kanji.character}
                                    id={`kanji-story-${kanji.character}`}
                                    className={`group rounded-xl border transition-all duration-200 ${isEditing
                                        ? `ring-2 ${colors.ring} border-transparent bg-white dark:bg-slate-800 shadow-lg`
                                        : isSaved
                                            ? 'border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-900/10'
                                            : hasStory
                                                ? 'border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 hover:shadow-md'
                                                : 'border-gray-200 dark:border-slate-700/50 bg-gray-50/50 dark:bg-slate-800/30 hover:border-gray-300 dark:hover:border-slate-600 hover:shadow-md'
                                        }`}
                                >
                                    <div className="flex items-start gap-3 p-3">
                                        {/* Index + Character */}
                                        <div className="flex flex-col items-center gap-1 flex-shrink-0">
                                            <span className="text-[10px] text-gray-400 dark:text-gray-500 font-mono">{idx + 1}</span>
                                            <div
                                                className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl font-bold font-japanese cursor-pointer transition-all hover:scale-110 ${hasStory
                                                    ? `bg-gradient-to-br ${colors.gradient} text-white shadow-md`
                                                    : 'bg-gray-200 dark:bg-slate-700 text-gray-600 dark:text-gray-300'
                                                    }`}
                                                onClick={() => startEditing(kanji)}
                                                title="Click để nhập câu chuyện"
                                            >
                                                {kanji.character}
                                            </div>
                                        </div>

                                        {/* Info */}
                                        <div className="flex-1 min-w-0">
                                            {/* Kanji info row */}
                                            <div className="flex items-center flex-wrap gap-x-2 gap-y-0.5 mb-1.5">
                                                <span className={`font-bold text-sm uppercase ${colors.text}`}>{kanji.sinoViet || '---'}</span>
                                                <span className="text-gray-400 dark:text-gray-600">·</span>
                                                <span className="text-sm text-gray-700 dark:text-gray-200 font-medium">{kanji.meaning || '---'}</span>
                                                {kanji.strokeCount && (
                                                    <span className="text-[10px] text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-slate-700 px-1.5 py-0.5 rounded">
                                                        {kanji.strokeCount}画
                                                    </span>
                                                )}
                                                {kanji.parts?.length > 0 && (
                                                    <button
                                                        onClick={() => setExpandedId(isExpanded ? null : kanji.character)}
                                                        className="text-[10px] text-purple-500 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20 px-1.5 py-0.5 rounded hover:bg-purple-100 dark:hover:bg-purple-900/40 transition-colors flex items-center gap-0.5"
                                                    >
                                                        <Layers className="w-2.5 h-2.5" />
                                                        {kanji.parts.join(' ')}
                                                    </button>
                                                )}
                                                {isSaved && (
                                                    <span className="text-[10px] text-emerald-500 font-bold flex items-center gap-0.5 animate-fade-in">
                                                        <Check className="w-3 h-3" /> Đã lưu
                                                    </span>
                                                )}
                                                {isSaving && (
                                                    <div className="w-3.5 h-3.5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                                                )}
                                            </div>

                                            {/* Reading info (collapsible) */}
                                            {isExpanded && (
                                                <div className="mb-2 text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-slate-800 rounded-lg p-2 space-y-0.5">
                                                    {kanji.onyomi && <div><span className="text-cyan-500">On:</span> <span className="font-japanese">{kanji.onyomi}</span></div>}
                                                    {kanji.kunyomi && <div><span className="text-indigo-500">Kun:</span> <span className="font-japanese">{kanji.kunyomi}</span></div>}
                                                    {kanji.radical && <div><span className="text-orange-500">Bộ thủ:</span> {kanji.radical}</div>}
                                                </div>
                                            )}

                                            {/* Story area */}
                                            {isEditing ? (
                                                <div className="space-y-1.5">
                                                    <textarea
                                                        ref={el => { textareaRefs.current[kanji.character] = el; }}
                                                        value={editValue}
                                                        onChange={e => { setEditValue(e.target.value); autoResize(e.target); }}
                                                        onBlur={() => handleBlur(kanji)}
                                                        onKeyDown={e => handleKeyDown(e, kanji)}
                                                        placeholder="Nhập câu chuyện ghi nhớ... (Enter: lưu & tiếp, Shift+Enter: xuống dòng, Esc: hủy)"
                                                        className={`w-full rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white bg-gray-50 dark:bg-slate-700/50 border ${colors.border} focus:ring-2 focus:${colors.ring} resize-none transition-all placeholder-gray-400 dark:placeholder-gray-500`}
                                                        style={{ minHeight: '48px' }}
                                                        rows={1}
                                                    />
                                                    <div className="flex items-center gap-2 text-[10px] text-gray-400 dark:text-gray-500">
                                                        <kbd className="bg-gray-100 dark:bg-slate-700 px-1.5 py-0.5 rounded border border-gray-200 dark:border-slate-600 font-mono">Enter</kbd>
                                                        <span>Lưu & tiếp</span>
                                                        <kbd className="bg-gray-100 dark:bg-slate-700 px-1.5 py-0.5 rounded border border-gray-200 dark:border-slate-600 font-mono">Shift+Enter</kbd>
                                                        <span>Xuống dòng</span>
                                                        <kbd className="bg-gray-100 dark:bg-slate-700 px-1.5 py-0.5 rounded border border-gray-200 dark:border-slate-600 font-mono">Tab</kbd>
                                                        <span>Lưu & tiếp</span>
                                                        <kbd className="bg-gray-100 dark:bg-slate-700 px-1.5 py-0.5 rounded border border-gray-200 dark:border-slate-600 font-mono">Esc</kbd>
                                                        <span>Hủy</span>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div
                                                    onClick={() => startEditing(kanji)}
                                                    className={`cursor-pointer rounded-lg px-3 py-2 text-sm transition-all ${hasStory
                                                        ? 'text-gray-700 dark:text-gray-200 bg-gray-50/50 dark:bg-slate-800/30 hover:bg-gray-100 dark:hover:bg-slate-700/50'
                                                        : 'text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-slate-800/20 hover:bg-indigo-50 dark:hover:bg-indigo-900/10 hover:text-indigo-500 dark:hover:text-indigo-400 border border-dashed border-gray-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-700'
                                                        }`}
                                                    title="Click để nhập câu chuyện"
                                                >
                                                    {hasStory ? (
                                                        <span>💡 {kanji.mnemonic}</span>
                                                    ) : (
                                                        <span className="italic flex items-center gap-1.5">
                                                            <span className="text-lg">✏️</span>
                                                            Click để nhập câu chuyện...
                                                        </span>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

                {/* Footer */}
                <div className="px-4 py-3 bg-gray-50 dark:bg-slate-800/80 border-t border-gray-200 dark:border-slate-700 flex items-center justify-between flex-shrink-0">
                    <div className="text-xs text-gray-500 dark:text-gray-400 hidden md:block">
                        💡 Mẹo: Click <kbd className="bg-gray-200 dark:bg-slate-600 px-1 py-0.5 rounded text-[10px]">Enter</kbd> để lưu và tiếp tục.
                    </div>
                    <div className="flex gap-2 w-full md:w-auto">
                        <button
                            onClick={() => setShowImportModal(true)}
                            className="flex-1 md:flex-none px-4 py-2 bg-indigo-100 dark:bg-indigo-900/30 hover:bg-indigo-200 dark:hover:bg-indigo-800/50 text-indigo-700 dark:text-indigo-300 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2"
                        >
                            <Upload className="w-4 h-4" /> Bỏ JSON
                        </button>
                        <button
                            onClick={onClose}
                            className="flex-1 md:flex-none px-4 py-2 bg-gray-200 dark:bg-slate-700 hover:bg-gray-300 dark:hover:bg-slate-600 text-gray-700 dark:text-gray-300 rounded-xl text-sm font-medium transition-colors"
                        >
                            Đóng
                        </button>
                    </div>
                </div>
            </div>

            {/* Import JSON Modal */}
            {showImportModal && (
                <div className="fixed inset-0 bg-black/60 dark:bg-black/80 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden border border-gray-200 dark:border-slate-700">
                        <div className="p-4 border-b border-gray-200 dark:border-slate-700 flex justify-between items-center">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                <Upload className="w-5 h-5 text-indigo-500" /> Nhập nhiều câu chuyện bằng JSON
                            </h3>
                            <button onClick={() => setShowImportModal(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-white">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-4 overflow-y-auto">
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                                Dán mảng JSON của bạn vào bên dưới. Bạn có thể sử dụng định dạng mẫu sau:
                            </p>
                            <div className="bg-gray-100 dark:bg-slate-900 rounded-lg p-3 mb-4 text-xs font-mono text-gray-700 dark:text-gray-300 overflow-x-auto">
                                <pre>{`[
  { "character": "水", "mnemonic": "Nước chảy thành dòng..." },
  { "character": "火", "mnemonic": "Ngọn lửa bùng cháy..." }
]`}</pre>
                            </div>
                            <textarea
                                value={jsonInput}
                                onChange={e => setJsonInput(e.target.value)}
                                placeholder="Dán mảng JSON vào đây..."
                                className="w-full h-48 bg-gray-50 dark:bg-slate-900/50 rounded-lg p-3 text-sm text-gray-900 dark:text-white border border-gray-200 dark:border-slate-600 focus:ring-2 focus:ring-indigo-400 resize-none font-mono"
                            />
                        </div>
                        <div className="p-4 border-t border-gray-200 dark:border-slate-700 flex justify-end gap-2 bg-gray-50 dark:bg-slate-800/50">
                            <button
                                onClick={() => setShowImportModal(false)}
                                className="px-4 py-2 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors"
                            >
                                Hủy
                            </button>
                            <button
                                onClick={handleImportJson}
                                disabled={isImporting || !jsonInput.trim()}
                                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-400 dark:disabled:bg-slate-600 text-white rounded-xl text-sm font-medium transition-colors flex items-center gap-2"
                            >
                                {isImporting ? <span className="animate-spin text-lg leading-none">⏳</span> : <Upload className="w-4 h-4" />}
                                {isImporting ? 'Đang xử lý...' : 'Xác nhận nhập'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default KanjiStoryTool;
