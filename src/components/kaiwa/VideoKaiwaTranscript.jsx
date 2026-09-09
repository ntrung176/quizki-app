import React, { useState, useEffect, useRef, useMemo, memo } from 'react';
import { 
    MessageSquare, BookOpen, Layers, Play, Mic, Star, Sparkles, 
    Check, ChevronRight, Bookmark, ArrowUpRight, Volume2, Search, Film,
    Edit2, Trash2, Plus, X, Save
} from 'lucide-react';
import FuriganaRenderer from './FuriganaRenderer';

const BADGE_COLORS = [
    'bg-blue-100 text-blue-700 dark:bg-blue-950/80 dark:text-blue-300 border-blue-200 dark:border-blue-800/60',
    'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60',
    'bg-purple-100 text-purple-700 dark:bg-purple-950/80 dark:text-purple-300 border-purple-200 dark:border-purple-800/60',
    'bg-amber-100 text-amber-700 dark:bg-amber-950/80 dark:text-amber-300 border-amber-200 dark:border-amber-800/60',
    'bg-rose-100 text-rose-700 dark:bg-rose-950/80 dark:text-rose-300 border-rose-200 dark:border-rose-800/60',
    'bg-cyan-100 text-cyan-700 dark:bg-cyan-950/80 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800/60'
];

// Memoized Single Dialogue Card Component with Admin Inline Editing
const TranscriptDialogueItem = memo(({
    sub,
    actualIndex,
    idx,
    isActive,
    badgeColor,
    formattedTime,
    showFurigana,
    showVietnamese,
    isAdmin,
    isEditing,
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
            className={`p-3 sm:p-3.5 rounded-2xl border transition-colors duration-200 cursor-pointer group flex items-start gap-3 relative ${
                isActive
                    ? 'bg-gradient-to-r from-purple-50 via-indigo-50/70 to-purple-50 dark:from-[#2a1e3b] dark:via-[#1e1b2e] dark:to-[#2a1e3b] border-purple-500 dark:border-purple-400 shadow-md shadow-purple-500/15 ring-1 ring-purple-400/40'
                    : 'bg-white/85 dark:bg-slate-900/70 hover:bg-indigo-50/40 dark:hover:bg-indigo-950/30 border-slate-200/80 dark:border-slate-800/80 hover:border-indigo-300 dark:hover:border-indigo-600/60 shadow-2xs'
            }`}
        >
            {/* Circular / Rounded-2xl Play Button on Left */}
            <div className={`w-8.5 h-8.5 rounded-2xl flex items-center justify-center shrink-0 mt-0.5 transition-colors duration-200 ${
                isActive
                    ? 'bg-gradient-to-br from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-600/30'
                    : 'bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-indigo-950/70 dark:to-slate-800 border border-indigo-100 dark:border-indigo-900/50 text-indigo-600 dark:text-indigo-400 group-hover:from-indigo-600 group-hover:to-blue-600 group-hover:text-white shadow-2xs'
            }`}>
                <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
            </div>

            {/* Text Content Column */}
            <div className="flex-1 min-w-0 space-y-1">
                {/* Sentence Number & Timestamp Pill */}
                <div className="flex items-center gap-1.5">
                    <span className={`px-1.5 py-0.2 rounded border text-[9px] font-mono font-black ${
                        isActive
                            ? 'bg-purple-500 text-white border-purple-600 shadow-2xs'
                            : badgeColor
                    }`}>
                        {String((actualIndex >= 0 ? actualIndex : idx) + 1).padStart(2, '0')}
                    </span>
                    <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500 font-bold">
                        {formattedTime}
                    </span>
                    {isActive && (
                        <span className="px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300 text-[9px] font-black uppercase tracking-wider ml-auto shadow-2xs flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                            Đang phát
                        </span>
                    )}
                </div>

                {/* Japanese sentence with Furigana */}
                <div className={`text-sm sm:text-base font-bold leading-relaxed ${
                    isActive 
                        ? 'text-purple-950 dark:text-white drop-shadow-xs' 
                        : 'text-slate-800 dark:text-slate-100 group-hover:text-indigo-950 dark:group-hover:text-white'
                }`}>
                    <FuriganaRenderer text={sub.furigana || sub.ja} showFurigana={showFurigana} />
                </div>

                {/* Vietnamese translation */}
                {showVietnamese && sub.vi && (
                    <p className={`text-xs leading-relaxed ${
                        isActive 
                            ? 'text-purple-900 dark:text-purple-200 font-medium' 
                            : 'text-slate-500 dark:text-slate-400'
                    }`}>
                        {sub.vi}
                    </p>
                )}
            </div>

            {/* Action Icons: Admin Edit & Shadowing */}
            <div className="flex items-center gap-1 shrink-0">
                {isAdmin && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onStartEdit?.(actualIndex);
                        }}
                        title="Chỉnh sửa câu này (Admin)"
                        className="p-1.5 rounded-xl text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-100/70 dark:hover:bg-indigo-950/60 transition-colors cursor-pointer opacity-70 group-hover:opacity-100"
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
                        className="p-1.5 rounded-xl text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-300 hover:bg-indigo-100/70 dark:hover:bg-indigo-950/60 transition-colors shrink-0 opacity-0 group-hover:opacity-100 cursor-pointer"
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
        <div className="flex flex-col bg-white/95 dark:bg-[#14161d] border border-slate-200/90 dark:border-slate-800/90 rounded-3xl shadow-xl dark:shadow-2xl overflow-hidden h-full max-h-full w-full font-sans text-slate-900 dark:text-white backdrop-blur-md">
            {/* 1. Header Tabs Switcher */}
            <div className="shrink-0 px-4 pt-3 bg-slate-50/90 dark:bg-slate-950/90 border-b border-slate-200 dark:border-slate-800 flex items-center justify-start gap-6 text-xs font-bold">
                <button
                    onClick={() => setActiveTab('transcript')}
                    className={`pb-2.5 transition-all relative cursor-pointer ${
                        activeTab === 'transcript'
                            ? 'text-rose-600 dark:text-rose-500 font-extrabold after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2.5px] after:bg-rose-600 dark:after:bg-rose-500 after:rounded-full'
                            : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                >
                    Hội thoại ({subtitles.length})
                </button>

                <button
                    onClick={() => setActiveTab('analysis')}
                    className={`pb-2.5 transition-all relative cursor-pointer ${
                        activeTab === 'analysis'
                            ? 'text-rose-600 dark:text-rose-500 font-extrabold after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2.5px] after:bg-rose-600 dark:after:bg-rose-500 after:rounded-full'
                            : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                >
                    Phân tích ({allKeywords.length})
                </button>

                <button
                    onClick={() => setActiveTab('playlist')}
                    className={`pb-2.5 transition-all relative cursor-pointer ${
                        activeTab === 'playlist'
                            ? 'text-rose-600 dark:text-rose-500 font-extrabold after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2.5px] after:bg-rose-600 dark:after:bg-rose-500 after:rounded-full'
                            : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                >
                    Tập ({allVideos.length})
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
                                    className="w-full pl-8 pr-3 py-1.5 bg-white dark:bg-slate-900/90 rounded-2xl text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-rose-500 border border-slate-200 dark:border-slate-800 font-sans shadow-xs"
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
                                    const badgeColor = BADGE_COLORS[actualIndex % BADGE_COLORS.length];

                                    return (
                                        <TranscriptDialogueItem
                                            key={sub.id || idx}
                                            sub={sub}
                                            actualIndex={actualIndex}
                                            idx={idx}
                                            isActive={isActive}
                                            badgeColor={badgeColor}
                                            formattedTime={formatTime(sub.start)}
                                            showFurigana={showFurigana}
                                            showVietnamese={showVietnamese}
                                            isAdmin={isAdmin}
                                            isEditing={isEditing}
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
                            <div className="p-3 bg-amber-50/80 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40 rounded-2xl space-y-2">
                                <span className="text-[10px] font-black text-amber-700 dark:text-amber-400 uppercase tracking-wider flex items-center gap-1">
                                    <Sparkles className="w-3 h-3 text-amber-500 dark:text-amber-400" /> Từ vựng trong câu đang phát
                                </span>
                                <div className="space-y-2">
                                    {currentSub.keywords.map((kw, i) => (
                                        <div key={i} className="flex items-center justify-between gap-2 p-2.5 bg-white dark:bg-slate-900/90 rounded-xl border border-amber-200/80 dark:border-amber-900/40 shadow-xs">
                                            <div>
                                                <div className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
                                                    <span>{kw.word}</span>
                                                    {kw.reading && kw.reading !== kw.word && (
                                                        <span className="text-[10px] font-normal text-amber-600 dark:text-amber-400">({kw.reading})</span>
                                                    )}
                                                </div>
                                                <div className="text-[11px] text-slate-600 dark:text-slate-400">{kw.meaning}</div>
                                            </div>
                                            {onSaveToFlashcard && (
                                                <button
                                                    onClick={() => onSaveToFlashcard(kw)}
                                                    title="Lưu vào Flashcard"
                                                    className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-amber-100 dark:hover:bg-amber-950/60 text-slate-600 dark:text-slate-300 hover:text-amber-700 dark:hover:text-amber-400 transition-colors cursor-pointer"
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
                            <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                                Tất cả từ vựng trong video ({allKeywords.length})
                            </span>
                            <div className="space-y-2">
                                {allKeywords.map((kw, i) => (
                                    <div key={i} className="flex items-center justify-between gap-2 p-2.5 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-800">
                                        <div>
                                            <div className="font-bold text-xs text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                                                <span>{kw.word}</span>
                                                {kw.reading && kw.reading !== kw.word && (
                                                    <span className="text-[10px] font-normal text-indigo-600 dark:text-indigo-400">({kw.reading})</span>
                                                )}
                                                {kw.level && (
                                                    <span className="text-[8px] font-bold px-1.5 py-0.2 rounded bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300">
                                                        {kw.level}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{kw.meaning}</div>
                                        </div>
                                        {onSaveToFlashcard && (
                                            <button
                                                onClick={() => onSaveToFlashcard(kw)}
                                                title="Lưu vào Flashcard"
                                                className="p-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 transition-colors cursor-pointer shadow-xs"
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
                                <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                                    Mẫu ngữ pháp trọng tâm ({allGrammar.length})
                                </span>
                                <div className="space-y-1.5">
                                    {allGrammar.map((g, i) => (
                                        <div key={i} className="p-2.5 bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-900/40 rounded-xl text-xs font-bold text-indigo-800 dark:text-indigo-300">
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
                                            ? 'bg-sky-50 dark:bg-sky-950/40 border-sky-400 dark:border-sky-500 ring-1 ring-sky-300 dark:ring-sky-400/40 shadow-xs'
                                            : 'bg-slate-50 dark:bg-slate-900/50 hover:bg-slate-100 dark:hover:bg-slate-850 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                                    }`}
                                >
                                    {/* Thumbnail Preview */}
                                    <div className="w-20 aspect-video rounded-lg overflow-hidden bg-slate-950 shrink-0 relative">
                                        <img 
                                            src={v.thumbnail || `https://img.youtube.com/vi/${v.youtubeId}/hqdefault.jpg`} 
                                            alt={v.title} 
                                            className="w-full h-full object-cover" 
                                        />
                                        <span className="absolute bottom-0.5 right-0.5 px-1 rounded bg-black/80 text-white text-[8px] font-mono">
                                            {v.duration ? `${Math.floor(v.duration / 60)}m` : 'Video'}
                                        </span>
                                    </div>

                                    {/* Video Info */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-1.5 mb-0.5">
                                            <span className="px-1.5 py-0.2 rounded text-[8px] font-black bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-300">
                                                {v.level || 'JLPT'}
                                            </span>
                                            {isCurrent && (
                                                <span className="text-[8px] font-black text-sky-600 dark:text-sky-400 uppercase">
                                                    ● Đang phát
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
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


