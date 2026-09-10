import React, { useState, useEffect, useRef, useMemo, memo } from 'react';
import { 
    MessageSquare, BookOpen, Layers, Play, Mic, Star, Sparkles, 
    Check, ChevronRight, Bookmark, ArrowUpRight, Volume2, Search, Film,
    Edit2, Trash2, Plus, X, Save
} from 'lucide-react';
import FuriganaRenderer from './FuriganaRenderer';

// Memoized Single Dialogue Card Component with Admin Inline Editing
const TranscriptDialogueItem = memo(({
    sub,
    actualIndex,
    idx,
    isActive,
    formattedTime,
    showFurigana,
    showVietnamese,
    isAdmin,
    isEditing,
    keywords = [],
    onStartEdit,
    onSaveEdit,
    onCancelEdit,
    onDeleteSub,
    onAddSubAfter,
    onSeekToSub,
    onOpenShadowing,
    itemRef
}) => {
    // Local edit state
    const [editJa, setEditJa] = useState(sub.ja || '');
    const [editFurigana, setEditFurigana] = useState(sub.furigana || sub.ja || '');
    const [editVi, setEditVi] = useState(sub.vi || '');
    const [editStart, setEditStart] = useState(sub.start ?? 0);
    const [editEnd, setEditEnd] = useState(sub.end ?? 0);

    // Sync local state when starting edit
    useEffect(() => {
        if (isEditing) {
            setEditJa(sub.ja || '');
            setEditFurigana(sub.furigana || sub.ja || '');
            setEditVi(sub.vi || '');
            setEditStart(sub.start ?? 0);
            setEditEnd(sub.end ?? 0);
        }
    }, [isEditing, sub]);

    const handleSave = (e) => {
        e?.stopPropagation?.();
        onSaveEdit?.(actualIndex, {
            ...sub,
            ja: editJa.trim(),
            furigana: editFurigana.trim() || editJa.trim(),
            vi: editVi.trim(),
            start: parseFloat(editStart) || 0,
            end: parseFloat(editEnd) || 0
        });
    };

    if (isEditing) {
        return (
            <div
                ref={itemRef}
                onClick={(e) => e.stopPropagation()}
                className="p-3.5 sm:p-4 rounded-2xl border-2 border-indigo-500 bg-indigo-50/95 dark:bg-slate-900 shadow-xl space-y-3 animate-fade-in"
            >
                <div className="flex items-center justify-between border-b border-indigo-200 dark:border-indigo-900/60 pb-2">
                    <span className="text-xs font-black text-indigo-700 dark:text-indigo-300 flex items-center gap-1.5">
                        <Edit2 className="w-3.5 h-3.5" /> Chỉnh sửa câu #{actualIndex + 1}
                    </span>
                    <div className="flex items-center gap-1.5">
                        <button
                            type="button"
                            onClick={handleSave}
                            className="px-2.5 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1 shadow-sm transition cursor-pointer"
                        >
                            <Save className="w-3 h-3" /> Lưu
                        </button>
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                onCancelEdit?.();
                            }}
                            className="p-1 rounded-xl bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition cursor-pointer"
                            title="Hủy"
                        >
                            <X className="w-3.5 h-3.5" />
                        </button>
                    </div>
                </div>

                {/* Inputs */}
                <div className="space-y-2 text-xs">
                    <div>
                        <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-0.5">
                            Tiếng Nhật (Kanji/Kana):
                        </label>
                        <textarea
                            value={editJa}
                            onChange={(e) => {
                                setEditJa(e.target.value);
                                if (!editFurigana || editFurigana === editJa) {
                                    setEditFurigana(e.target.value);
                                }
                            }}
                            rows={2}
                            className="w-full p-2 rounded-xl bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 font-bold focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                    </div>

                    <div>
                        <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-0.5">
                            Furigana (ví dụ: 私[わたし]も、英語[えいご]の):
                        </label>
                        <input
                            type="text"
                            value={editFurigana}
                            onChange={(e) => setEditFurigana(e.target.value)}
                            className="w-full p-2 rounded-xl bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                    </div>

                    <div>
                        <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-0.5">
                            Bản dịch Tiếng Việt:
                        </label>
                        <textarea
                            value={editVi}
                            onChange={(e) => setEditVi(e.target.value)}
                            rows={2}
                            className="w-full p-2 rounded-xl bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                    </div>

                    {/* Timeline */}
                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-0.5">
                                Bắt đầu (giây):
                            </label>
                            <input
                                type="number"
                                step="0.1"
                                value={editStart}
                                onChange={(e) => setEditStart(e.target.value)}
                                className="w-full p-1.5 rounded-xl bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 font-mono text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-0.5">
                                Kết thúc (giây):
                            </label>
                            <input
                                type="number"
                                step="0.1"
                                value={editEnd}
                                onChange={(e) => setEditEnd(e.target.value)}
                                className="w-full p-1.5 rounded-xl bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 font-mono text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            />
                        </div>
                    </div>
                </div>

                {/* Bottom row actions: Delete & Add Sub After */}
                <div className="flex items-center justify-between pt-1 border-t border-slate-200 dark:border-slate-800 text-xs">
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            if (window.confirm(`Bạn có chắc chắn muốn xóa câu thoại #${actualIndex + 1}?`)) {
                                onDeleteSub?.(actualIndex);
                            }
                        }}
                        className="px-2 py-1 rounded-lg text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-950/50 flex items-center gap-1 font-bold transition cursor-pointer"
                    >
                        <Trash2 className="w-3.5 h-3.5" /> Xóa câu này
                    </button>

                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            onAddSubAfter?.(actualIndex);
                        }}
                        className="px-2 py-1 rounded-lg text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-950/50 flex items-center gap-1 font-bold transition cursor-pointer"
                    >
                        <Plus className="w-3.5 h-3.5" /> Thêm câu sau
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div
            ref={itemRef}
            onClick={() => onSeekToSub?.(sub.start)}
            className={`p-3 sm:p-3.5 rounded-2xl border transition-all duration-200 cursor-pointer group flex items-center gap-3 sm:gap-3.5 relative ${
                isActive
                    ? 'bg-pink-50/25 dark:bg-slate-900/95 border-2 border-[#f494bc] dark:border-[#f494bc] shadow-md shadow-pink-500/10 ring-2 ring-[#f494bc]/30'
                    : 'bg-white/85 dark:bg-slate-900/70 hover:bg-pink-50/15 dark:hover:bg-slate-850 border-slate-200/90 dark:border-slate-800/90 hover:border-[#f494bc]/50 shadow-2xs'
            }`}
        >
            {/* Left Column: Sentence Number, Centered Play Button, Timestamp (Outside text area to prevent furigana collision) */}
            <div className="flex flex-col items-center justify-center shrink-0 gap-1 self-center min-w-[34px]">
                {/* Sentence Number Pill */}
                <span className={`px-1.5 py-0.5 rounded-md text-[9px] font-mono transition-colors text-center ${
                    isActive
                        ? 'bg-[#f494bc] text-slate-950 border border-[#f494bc] font-black shadow-2xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700/60 font-bold'
                }`}>
                    {String((actualIndex >= 0 ? actualIndex : idx) + 1).padStart(2, '0')}
                </span>

                {/* Centered Circular / Rounded-2xl Play Button */}
                <div className={`w-8 h-8 rounded-2xl flex items-center justify-center transition-all duration-200 ${
                    isActive
                        ? 'bg-[#f494bc] text-slate-950 font-black shadow-md shadow-pink-500/20'
                        : 'bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60 text-slate-600 dark:text-slate-300 group-hover:bg-[#f494bc] group-hover:text-slate-950 group-hover:border-[#f494bc] shadow-2xs'
                }`}>
                    <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                </div>

                {/* Timestamp */}
                <span className="text-[9px] font-mono text-slate-400 dark:text-slate-500 font-bold text-center">
                    {formattedTime}
                </span>
            </div>

            {/* Text Content Column (Clean Japanese with unhindered Furigana + Vietnamese translation) */}
            <div className="flex-1 min-w-0 space-y-1 py-0.5">
                {/* Japanese sentence with Furigana (Black & White text) */}
                <div className="text-sm sm:text-base font-bold leading-relaxed text-slate-900 dark:text-white drop-shadow-xs">
                    <FuriganaRenderer 
                        text={sub.furigana || sub.ja} 
                        showFurigana={showFurigana} 
                        keywords={keywords.length > 0 ? keywords : (sub.keywords || [])}
                    />
                </div>

                {/* Vietnamese translation (Black & White text) */}
                {showVietnamese && sub.vi && (
                    <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-300 font-medium">
                        {sub.vi}
                    </p>
                )}
            </div>

            {/* Action Icons: Admin Edit & Shadowing (Centered) */}
            <div className="flex items-center gap-1 shrink-0 self-center">
                {isAdmin && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onStartEdit?.(actualIndex);
                        }}
                        title="Chỉnh sửa câu này (Admin)"
                        className="p-1.5 rounded-xl text-slate-400 hover:text-[#db2777] dark:hover:text-[#f494bc] hover:bg-pink-50 dark:hover:bg-pink-950/40 transition-colors cursor-pointer opacity-70 group-hover:opacity-100"
                    >
                        <Edit2 className="w-3.5 h-3.5" />
                    </button>
                )}

                {onOpenShadowing && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onOpenShadowing(sub);
                        }}
                        title="Luyện nói câu này"
                        className="p-1.5 rounded-xl text-slate-400 hover:text-[#db2777] dark:hover:text-[#f494bc] hover:bg-pink-50 dark:hover:bg-pink-950/40 transition-colors shrink-0 opacity-0 group-hover:opacity-100 cursor-pointer"
                    >
                        <Mic className="w-4 h-4" />
                    </button>
                )}
            </div>
        </div>
    );
});

const VideoKaiwaTranscript = ({
    video,
    allVideos = [],
    activeSubIndex,
    isAdmin = false,
    onUpdateSubtitles,
    onSeekToSub,
    onSelectVideo,
    onOpenShadowing,
    showFurigana,
    showVietnamese,
    onSaveToFlashcard
}) => {
    const [activeTab, setActiveTab] = useState('transcript'); // 'transcript' | 'analysis' | 'playlist'
    const [filterQuery, setFilterQuery] = useState('');
    const [editingSubIndex, setEditingSubIndex] = useState(null);
    const listContainerRef = useRef(null);
    const activeItemRef = useRef(null);
    const isUserInteractingRef = useRef(false);
    const scrollTimeoutRef = useRef(null);

    const subtitles = video?.subtitles || [];
    const currentSub = activeSubIndex >= 0 ? subtitles[activeSubIndex] : null;

    // Handlers for Admin Editing
    const handleStartEdit = (actualIdx) => {
        setEditingSubIndex(actualIdx);
    };

    const handleCancelEdit = () => {
        setEditingSubIndex(null);
    };

    const handleSaveEdit = (targetIndex, updatedSub) => {
        const nextSubs = [...subtitles];
        nextSubs[targetIndex] = updatedSub;
        nextSubs.sort((a, b) => (parseFloat(a.start) || 0) - (parseFloat(b.start) || 0));
        onUpdateSubtitles?.(nextSubs);
        setEditingSubIndex(null);
    };

    const handleDeleteSub = (targetIndex) => {
        const nextSubs = subtitles.filter((_, i) => i !== targetIndex);
        onUpdateSubtitles?.(nextSubs);
        setEditingSubIndex(null);
    };

    const handleAddSubAfter = (targetIndex) => {
        const current = subtitles[targetIndex];
        const newStart = current ? Number(current.end || current.start + 2) : 0;
        const newEnd = newStart + 3;
        const newSubItem = {
            id: Date.now(),
            start: newStart,
            end: newEnd,
            ja: 'Câu mới',
            furigana: 'Câu mới',
            vi: 'Bản dịch mới',
            keywords: [],
            grammar: []
        };
        const nextSubs = [
            ...subtitles.slice(0, targetIndex + 1),
            newSubItem,
            ...subtitles.slice(targetIndex + 1)
        ];
        onUpdateSubtitles?.(nextSubs);
        setEditingSubIndex(targetIndex + 1);
    };

    // Detect user manual scroll to avoid stuttering/fighting with auto-scroll
    const handleScrollInteraction = () => {
        isUserInteractingRef.current = true;
        if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
        scrollTimeoutRef.current = setTimeout(() => {
            isUserInteractingRef.current = false;
        }, 2500);
    };

    // Auto-scroll transcript container smoothly only when active item moves out of comfort view zone
    useEffect(() => {
        if (activeTab !== 'transcript' || !listContainerRef.current || !activeItemRef.current || isUserInteractingRef.current || editingSubIndex !== null) {
            return;
        }

        const container = listContainerRef.current;
        const item = activeItemRef.current;

        const containerRect = container.getBoundingClientRect();
        const itemRect = item.getBoundingClientRect();

        // Check if item is already comfortably in view (between 15% and 80% of container height)
        const relativeTop = itemRect.top - containerRect.top;
        const relativeBottom = itemRect.bottom - containerRect.top;
        const isComfortablyVisible = relativeTop >= containerRect.height * 0.15 && relativeBottom <= containerRect.height * 0.80;

        if (!isComfortablyVisible) {
            const itemOffsetTop = item.offsetTop - container.offsetTop;
            const targetScrollTop = itemOffsetTop - (container.clientHeight / 2) + (item.clientHeight / 2);
            container.scrollTo({
                top: Math.max(0, targetScrollTop),
                behavior: 'smooth'
            });
        }
    }, [activeSubIndex, activeTab, editingSubIndex]);

    // Clean up timeout
    useEffect(() => {
        return () => {
            if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
        };
    }, []);

    // Format seconds to mm:ss
    const formatTime = (seconds) => {
        const m = Math.floor(seconds / 60);
        const s = Math.floor(seconds % 60);
        return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    };

    // Filter subtitles if search query provided - Memoized
    const filteredSubs = useMemo(() => {
        if (!filterQuery.trim()) return subtitles;
        const q = filterQuery.toLowerCase();
        return subtitles.filter(s => 
            s.ja.toLowerCase().includes(q) || 
            (s.vi && s.vi.toLowerCase().includes(q))
        );
    }, [subtitles, filterQuery]);

    // Collect all keywords & grammar points across the entire video - Memoized
    const { allKeywords, allGrammar } = useMemo(() => {
        const keywords = [];
        const grammar = [];
        const seenWords = new Set();
        const seenGrammar = new Set();

        subtitles.forEach(sub => {
            (sub.keywords || []).forEach(kw => {
                if (!seenWords.has(kw.word)) {
                    seenWords.add(kw.word);
                    keywords.push(kw);
                }
            });
            (sub.grammar || []).forEach(g => {
                if (!seenGrammar.has(g)) {
                    seenGrammar.add(g);
                    grammar.push(g);
                }
            });
        });

        return { allKeywords: keywords, allGrammar: grammar };
    }, [subtitles]);

    return (
        <div className="flex flex-col bg-white/95 dark:bg-[#14161d] border border-slate-200/90 dark:border-slate-800/90 rounded-2xl lg:rounded-3xl shadow-none overflow-hidden h-full max-h-full w-full font-sans text-slate-900 dark:text-white backdrop-blur-md">
            {/* 1. Header Tabs Switcher */}
            <div className="shrink-0 px-4 pt-3 bg-slate-50/90 dark:bg-slate-950/90 border-b border-slate-200 dark:border-slate-800 flex items-center justify-start gap-6 text-xs font-bold rounded-t-2xl lg:rounded-t-3xl">
                <button
                    onClick={() => setActiveTab('transcript')}
                    className={`pb-2.5 transition-all relative cursor-pointer ${
                        activeTab === 'transcript'
                            ? 'text-[#db2777] dark:text-[#f494bc] font-extrabold after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2.5px] after:bg-[#f494bc] after:rounded-full'
                            : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                >
                    Hội thoại ({subtitles.length})
                </button>

                <button
                    onClick={() => setActiveTab('analysis')}
                    className={`pb-2.5 transition-all relative cursor-pointer ${
                        activeTab === 'analysis'
                            ? 'text-[#db2777] dark:text-[#f494bc] font-extrabold after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2.5px] after:bg-[#f494bc] after:rounded-full'
                            : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                >
                    Phân tích ({allKeywords.length})
                </button>

                <button
                    onClick={() => setActiveTab('playlist')}
                    className={`pb-2.5 transition-all relative cursor-pointer ${
                        activeTab === 'playlist'
                            ? 'text-[#db2777] dark:text-[#f494bc] font-extrabold after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2.5px] after:bg-[#f494bc] after:rounded-full'
                            : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                >
                    Video khác ({allVideos.length})
                </button>
            </div>

            {/* 2. Tab Contents */}
            <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
                {/* ================= TAB 1: HỘI THOẠI (TRANSCRIPT) ================= */}
                {activeTab === 'transcript' && (
                    <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
                        {/* Search Filter inside Transcript */}
                        <div className="shrink-0 p-2.5 border-b border-slate-200 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-950/40">
                            <div className="relative">
                                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                                <input
                                    type="text"
                                    placeholder="Tìm câu trong video..."
                                    value={filterQuery}
                                    onChange={(e) => setFilterQuery(e.target.value)}
                                    className="w-full pl-8 pr-3 py-1.5 bg-white dark:bg-slate-900/90 rounded-2xl text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-[#f494bc] border border-slate-200 dark:border-slate-800 font-sans shadow-xs"
                                />
                            </div>
                        </div>

                        {/* Scrolling Subtitles List (Rollable with visible scrollbar & lag-free smooth rendering) */}
                        <div 
                            ref={listContainerRef} 
                            onWheel={handleScrollInteraction}
                            onTouchMove={handleScrollInteraction}
                            className="flex-1 min-h-0 overflow-y-auto overscroll-contain scroll-smooth p-3 space-y-2.5 [scrollbar-width:thin] [scrollbar-color:#cbd5e1_#f8fafc] dark:[scrollbar-color:#64748b_#1e293b] [&::-webkit-scrollbar]:w-2.5 [&::-webkit-scrollbar-thumb]:bg-slate-300 dark:[&::-webkit-scrollbar-thumb]:bg-slate-600 hover:[&::-webkit-scrollbar-thumb]:bg-slate-400 dark:hover:[&::-webkit-scrollbar-thumb]:bg-slate-500 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:bg-slate-100 dark:[&::-webkit-scrollbar-track]:bg-slate-900/60"
                        >
                            {filteredSubs.length > 0 ? (
                                filteredSubs.map((sub, idx) => {
                                    const actualIndex = subtitles.indexOf(sub);
                                    const isActive = actualIndex === activeSubIndex;
                                    const isEditing = actualIndex === editingSubIndex;

                                    return (
                                        <TranscriptDialogueItem
                                            key={sub.id || idx}
                                            sub={sub}
                                            actualIndex={actualIndex}
                                            idx={idx}
                                            isActive={isActive}
                                            formattedTime={formatTime(sub.start)}
                                            showFurigana={showFurigana}
                                            showVietnamese={showVietnamese}
                                            isAdmin={isAdmin}
                                            isEditing={isEditing}
                                            keywords={allKeywords}
                                            onStartEdit={handleStartEdit}
                                            onSaveEdit={handleSaveEdit}
                                            onCancelEdit={handleCancelEdit}
                                            onDeleteSub={handleDeleteSub}
                                            onAddSubAfter={handleAddSubAfter}
                                            onSeekToSub={onSeekToSub}
                                            onOpenShadowing={onOpenShadowing}
                                            itemRef={isActive ? activeItemRef : null}
                                        />
                                    );
                                })
                            ) : (
                                <div className="p-8 text-center text-slate-400 dark:text-slate-500 text-xs">
                                    Không tìm thấy câu nào phù hợp với từ khóa.
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* ================= TAB 2: PHÂN TÍCH (ANALYSIS - Rollable) ================= */}
                {activeTab === 'analysis' && (
                    <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4 [scrollbar-width:thin] [scrollbar-color:#cbd5e1_#f8fafc] dark:[scrollbar-color:#64748b_#1e293b] [&::-webkit-scrollbar]:w-2.5 [&::-webkit-scrollbar-thumb]:bg-slate-300 dark:[&::-webkit-scrollbar-thumb]:bg-slate-600 hover:[&::-webkit-scrollbar-thumb]:bg-slate-400 dark:hover:[&::-webkit-scrollbar-thumb]:bg-slate-500 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:bg-slate-100 dark:[&::-webkit-scrollbar-track]:bg-slate-900/60">
                        {/* Current sentence keywords if active */}
                        {currentSub?.keywords && currentSub.keywords.length > 0 && (
                            <div className="p-3.5 bg-pink-50/20 dark:bg-slate-900/90 border-2 border-[#f494bc] dark:border-[#f494bc]/80 rounded-2xl space-y-2.5 shadow-xs">
                                <span className="text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                                    <Sparkles className="w-3.5 h-3.5 text-[#db2777] dark:text-[#f494bc]" /> Từ vựng trong câu đang phát
                                </span>
                                <div className="space-y-2">
                                    {currentSub.keywords.map((kw, i) => (
                                        <div key={i} className="flex items-center justify-between gap-2 p-2.5 bg-white dark:bg-slate-900/90 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-[#f494bc]/50 shadow-xs transition-colors">
                                            <div>
                                                <div className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
                                                    <span>{kw.word}</span>
                                                    {kw.reading && kw.reading !== kw.word && (
                                                        <span className="text-[10px] font-normal text-slate-500 dark:text-slate-400">({kw.reading})</span>
                                                    )}
                                                </div>
                                                <div className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5">{kw.meaning}</div>
                                            </div>
                                            {onSaveToFlashcard && (
                                                <button
                                                    onClick={() => onSaveToFlashcard(kw)}
                                                    title="Lưu vào Flashcard"
                                                    className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white transition-colors cursor-pointer"
                                                >
                                                    <Bookmark className="w-3.5 h-3.5" />
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* All Vocabulary in Video */}
                        <div className="space-y-2">
                            <span className="text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-wider block">
                                Tất cả từ vựng trong video ({allKeywords.length})
                            </span>
                            <div className="space-y-2">
                                {allKeywords.map((kw, i) => (
                                    <div key={i} className="flex items-center justify-between gap-2 p-2.5 bg-white dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-[#f494bc]/40 transition-colors">
                                        <div>
                                            <div className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
                                                <span>{kw.word}</span>
                                                {kw.reading && kw.reading !== kw.word && (
                                                    <span className="text-[10px] font-normal text-slate-500 dark:text-slate-400">({kw.reading})</span>
                                                )}
                                                {kw.level && (
                                                    <span className="text-[8px] font-bold px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                                                        {kw.level}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5">{kw.meaning}</div>
                                        </div>
                                        {onSaveToFlashcard && (
                                            <button
                                                onClick={() => onSaveToFlashcard(kw)}
                                                title="Lưu vào Flashcard"
                                                className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white transition-colors cursor-pointer shadow-xs"
                                            >
                                                <Bookmark className="w-3.5 h-3.5" />
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Grammar Points */}
                        {allGrammar.length > 0 && (
                            <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                                <span className="text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-wider block">
                                    Mẫu ngữ pháp trọng tâm ({allGrammar.length})
                                </span>
                                <div className="space-y-1.5">
                                    {allGrammar.map((g, i) => (
                                        <div key={i} className="p-2.5 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 hover:border-[#f494bc]/50 rounded-xl text-xs font-bold text-slate-900 dark:text-white transition-colors">
                                            {g}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* ================= TAB 3: DANH SÁCH TẬP (PLAYLIST - Rollable) ================= */}
                {activeTab === 'playlist' && (
                    <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-2.5 [scrollbar-width:thin] [scrollbar-color:#cbd5e1_#f8fafc] dark:[scrollbar-color:#475569_transparent] [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:bg-slate-300 dark:[&::-webkit-scrollbar-thumb]:bg-slate-700 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:bg-transparent">
                        {allVideos.map((v) => {
                            const isCurrent = v.id === video?.id;
                            return (
                                <div
                                    key={v.id}
                                    onClick={() => onSelectVideo?.(v)}
                                    className={`p-2.5 rounded-2xl border flex items-center gap-3 transition-all cursor-pointer ${
                                        isCurrent
                                            ? 'bg-pink-50/25 dark:bg-slate-900/95 border-2 border-[#f494bc] ring-1 ring-[#f494bc]/40 shadow-xs'
                                            : 'bg-slate-50 dark:bg-slate-900/50 hover:bg-slate-100 dark:hover:bg-slate-850 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                                    }`}
                                >
                                    {/* Thumbnail Preview */}
                                    <div className="w-20 aspect-video rounded-lg overflow-hidden bg-slate-950 shrink-0 relative flex items-center justify-center">
                                        {(v.thumbnail || v.youtubeId) ? (
                                            <img 
                                                src={v.thumbnail || `https://img.youtube.com/vi/${v.youtubeId}/hqdefault.jpg`} 
                                                alt={v.title} 
                                                className="w-full h-full object-cover" 
                                            />
                                        ) : (
                                            <Film className="w-5 h-5 text-amber-500/70" />
                                        )}
                                        <span className="absolute bottom-0.5 right-0.5 px-1 rounded bg-black/80 text-white text-[8px] font-mono">
                                            {v.duration ? `${Math.floor(v.duration / 60)}m` : 'Video'}
                                        </span>
                                    </div>

                                    {/* Video Info */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-1.5 mb-0.5">
                                            <span className="px-1.5 py-0.2 rounded text-[8px] font-black bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                                                {v.level || 'JLPT'}
                                            </span>
                                            {isCurrent && (
                                                <span className="text-[8px] font-black text-[#db2777] dark:text-[#f494bc] uppercase">
                                                    ● Đang phát
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                                            {v.title}
                                        </p>
                                        <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                                            {v.subtitles?.length || 0} câu thoại
                                        </p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

export default memo(VideoKaiwaTranscript);


