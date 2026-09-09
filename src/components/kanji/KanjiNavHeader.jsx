import React, { useState, useRef, useEffect } from 'react';
import { Search, PenTool, RotateCcw, X, RefreshCw, Upload, Plus, Layers, CheckSquare, Square, Sparkles, Lock, Wrench, ChevronDown, Trash2, Filter } from 'lucide-react';
import { JLPT_LEVELS, LEVEL_TAB_COLORS } from './kanjiConstants';

const KanjiNavHeader = ({
    searchQuery,
    setSearchQuery,
    showSearchResults,
    setShowSearchResults,
    searchResults,
    vocabList,
    searchInputRef,
    showHandwritingPopup,
    setShowHandwritingPopup,
    handwritingStrokesRef,
    currentStrokeRef,
    recognitionTimeoutRef,
    recognizeHandwriting,
    handwritingSuggestions,
    setHandwritingSuggestions,
    selectedLevel,
    setSelectedLevel,
    isUserAdmin,
    isAdmin,
    profile,
    setLockedPkgName,
    setShowPremiumModal,
    openKanjiDetail,
    handleCDNSync,
    syncingCDN,
    handleMigrateComponents,
    migratingComponents,
    setShowAddKanjiModal,
    setShowAddVocabModal,
    setShowCategoryModal,
    handleSyncVocabToKanji,
    handleAutoFixVocabSinoViet,
    fixingSinoViet,
    handleBatchGenerateAiVocabForNoVocabKanji,
    generatingAiVocab,
    bulkSelectMode,
    setBulkSelectMode,
    selectedKanjiIds,
    handleBulkDeleteKanji
}) => {
    const [adminMenuOpen, setAdminMenuOpen] = useState(false);
    const adminMenuRef = useRef(null);

    // Close admin popover when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (adminMenuRef.current && !adminMenuRef.current.contains(event.target)) {
                setAdminMenuOpen(false);
            }
        };
        if (adminMenuOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [adminMenuOpen]);

    const handleLevelChange = (level) => {
        const isLocked = ['N3', 'N2', 'N1'].includes(level) && !isAdmin && !profile?.isPremiumUnlocked && !(profile?.unlockedSpecializedPackages || []).includes('kanji_zen');
        if (isLocked) {
            setLockedPkgName('Thư viện Kanji Zen');
            setShowPremiumModal(true);
        } else {
            setSelectedLevel(level);
        }
    };

    const levelOptions = [
        ...JLPT_LEVELS.map(lvl => ({
            value: lvl,
            label: lvl,
            isLocked: ['N3', 'N2', 'N1'].includes(lvl) && !isAdmin && !profile?.isPremiumUnlocked && !(profile?.unlockedSpecializedPackages || []).includes('kanji_zen')
        })),
        { value: 'Bộ thủ', label: 'Bộ thủ (214)', isLocked: false },
        ...(isUserAdmin ? [
            { value: 'Mới thêm', label: 'Mới thêm (Admin)', isLocked: false },
            { value: 'Chưa có từ vựng', label: 'Chưa có từ vựng (Admin)', isLocked: false },
            { value: 'Đã có từ vựng', label: 'Đã có từ vựng (Admin)', isLocked: false }
        ] : [])
    ];

    return (
        <div className="flex flex-col gap-4">
            {/* Search & Action Controls Row */}
            <div className="flex flex-col sm:flex-row gap-2.5 sm:gap-3 items-stretch sm:items-center">
                {/* Search Input - Expanded / Flex-1 */}
                <div className="relative flex-1" ref={searchInputRef}>
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => { setSearchQuery(e.target.value); setShowSearchResults(true); }}
                        onFocus={() => setShowSearchResults(true)}
                        placeholder="Tìm kiếm Kanji, nghĩa hoặc âm Hán-Việt..."
                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl sm:rounded-2xl px-4 py-2.5 sm:px-5 sm:py-3 pr-20 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:ring-2 focus:ring-cyan-500 dark:focus:ring-cyan-400/50 focus:border-cyan-400 shadow-sm transition-all text-xs sm:text-sm font-medium"
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                        <button
                            onClick={() => setShowHandwritingPopup(!showHandwritingPopup)}
                            className={`p-1.5 sm:p-2 rounded-xl transition-all hover:scale-105 cursor-pointer ${showHandwritingPopup ? 'bg-sky-100 dark:bg-sky-950 text-sky-600 dark:text-sky-400' : 'hover:bg-slate-100 dark:hover:bg-slate-700/50 text-gray-400'}`}
                            title="Vẽ Kanji để tìm kiếm"
                        >
                            <PenTool className="w-4 h-4" />
                        </button>
                        <Search className="w-4 h-4 text-gray-400" />
                    </div>

                    {/* Search Results Dropdown */}
                    {showSearchResults && searchQuery.trim() && (searchResults.length > 0 || vocabList.some(v => v.word?.includes(searchQuery) || (v.meaning && String(v.meaning).toLowerCase().includes(searchQuery.toLowerCase())) || v.reading?.includes(searchQuery))) && (
                        <div className="absolute z-50 left-0 right-0 sm:left-0 sm:w-[480px] max-w-[95vw] mt-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 rounded-2xl shadow-2xl max-h-96 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 animate-in fade-in slide-in-from-top-2 duration-200">
                            {searchResults.length > 0 && (
                                <>
                                    <div className="px-4 py-2 text-[10px] font-bold text-slate-400 dark:text-slate-500 tracking-wider bg-slate-50 dark:bg-slate-950/50 flex items-center gap-1.5 font-mono uppercase">
                                        <span className="w-4 h-4 rounded-md bg-sky-100 dark:bg-sky-950 flex items-center justify-center text-[10px] text-sky-600 dark:text-sky-400 font-bold font-japanese">漢</span>
                                        KANJI ({searchResults.length})
                                    </div>
                                    {searchResults.slice(0, 10).map((kanji, idx) => (
                                        <button 
                                            key={kanji.id || idx} 
                                            onClick={() => { openKanjiDetail(kanji.character); setSearchQuery(''); setShowSearchResults(false); }}
                                            className="w-full px-4 py-3 flex items-center gap-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-all text-left cursor-pointer group"
                                        >
                                            <div className="w-10 h-10 rounded-xl bg-sky-50 dark:bg-sky-950/40 border border-sky-200/60 dark:border-sky-800/60 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform shadow-sm">
                                                <span className="text-2xl font-japanese font-black text-sky-600 dark:text-sky-400">{kanji.character}</span>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className="font-bold text-slate-800 dark:text-slate-100 text-sm">{kanji.sinoViet || '---'}</span>
                                                    {kanji.level && (
                                                        <span className="text-[9px] px-1.5 py-0.5 bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300 rounded-md font-mono font-bold uppercase border border-sky-200/60 dark:border-sky-800/50">
                                                            {kanji.level}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5 font-medium">{kanji.meaning}</div>
                                            </div>
                                        </button>
                                    ))}
                                </>
                            )}
                            {(() => {
                                const q = searchQuery.toLowerCase().trim();
                                const vocabResults = vocabList.filter(v => v.word?.includes(q) || (v.meaning && String(v.meaning).toLowerCase().includes(q)) || v.reading?.includes(q) || (v.sinoViet && String(v.sinoViet).toLowerCase().includes(q))).slice(0, 15);
                                if (vocabResults.length === 0) return null;
                                return (
                                    <>
                                        <div className="px-4 py-2 text-[10px] font-bold text-slate-400 dark:text-slate-500 tracking-wider bg-slate-50 dark:bg-slate-950/50 flex items-center gap-1.5 font-mono uppercase">
                                            <span className="w-4 h-4 rounded-md bg-orange-100 dark:bg-orange-950 flex items-center justify-center text-[10px] text-orange-600 dark:text-orange-400 font-bold font-japanese">語</span>
                                            TỪ VỰNG ({vocabResults.length})
                                        </div>
                                        {vocabResults.map((v, idx) => (
                                            <button 
                                                key={v.id || idx} 
                                                onClick={() => {
                                                    const kanjiChar = v.word?.split('').find(ch => { const code = ch.charCodeAt(0); return code >= 0x4E00 && code <= 0x9FFF; });
                                                    if (kanjiChar) { openKanjiDetail(kanjiChar); }
                                                    setSearchQuery(''); 
                                                    setShowSearchResults(false);
                                                }}
                                                className="w-full px-4 py-3 flex items-start gap-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-all text-left cursor-pointer group"
                                            >
                                                <div className="flex flex-col shrink-0 min-w-[75px] max-w-[130px]">
                                                    <span className="text-base font-japanese font-bold text-orange-600 dark:text-orange-400 break-words leading-tight">
                                                        {v.word}
                                                    </span>
                                                    {v.reading && (
                                                        <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-0.5 leading-tight">
                                                            {v.reading}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0 border-l border-slate-100 dark:border-slate-800 pl-3">
                                                    {v.sinoViet && (
                                                        <div className="mb-0.5">
                                                            <span className="text-[10px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-wider bg-amber-50 dark:bg-amber-950/40 px-1.5 py-0.5 rounded border border-amber-200/50 dark:border-amber-900/30">
                                                                {v.sinoViet}
                                                            </span>
                                                        </div>
                                                    )}
                                                    <div className="text-xs text-slate-700 dark:text-slate-300 line-clamp-2 mt-0.5 leading-snug font-medium">
                                                        {v.meaning || '---'}
                                                    </div>
                                                </div>
                                            </button>
                                        ))}
                                    </>
                                );
                            })()}
                        </div>
                    )}
                </div>

                {showSearchResults && <div className="fixed inset-0 z-40" onClick={() => setShowSearchResults(false)} />}

                {/* Right controls: Level/Radical Dropdown & Admin Toolbar */}
                <div className="flex items-center gap-2 shrink-0">
                    {/* Level & Radical Dropdown Selector */}
                    <div className="relative">
                        <select
                            value={selectedLevel}
                            onChange={(e) => handleLevelChange(e.target.value)}
                            aria-label="Chọn cấp độ hoặc bộ thủ"
                            className="appearance-none bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 rounded-xl sm:rounded-2xl pl-3.5 pr-8 py-2.5 sm:py-3 text-xs sm:text-sm font-bold shadow-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-all cursor-pointer"
                        >
                            {levelOptions.map(opt => (
                                <option key={opt.value} value={opt.value} className="bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-medium">
                                    {opt.label} {opt.isLocked ? '🔒' : ''}
                                </option>
                            ))}
                        </select>
                        <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>

                    {/* Consolidated Admin Toolbar Button */}
                    {isUserAdmin && (
                        <div className="relative" ref={adminMenuRef}>
                            <button
                                onClick={() => setAdminMenuOpen(!adminMenuOpen)}
                                className={`px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl text-xs sm:text-sm font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm border ${
                                    adminMenuOpen
                                        ? 'bg-cyan-600 text-white border-cyan-600 shadow-cyan-500/20'
                                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/60'
                                }`}
                                title="Thanh công cụ Quản trị viên"
                            >
                                <Wrench className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                                <span className="hidden sm:inline">Công cụ</span>
                                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${adminMenuOpen ? 'rotate-180' : ''}`} />
                            </button>

                            {/* Admin Tools Popover Menu */}
                            {adminMenuOpen && (
                                <div className="absolute right-0 top-full mt-2 w-72 sm:w-80 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl p-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150 divide-y divide-slate-100 dark:divide-slate-800">
                                    {/* Section 1: Thêm dữ liệu */}
                                    <div className="p-1 space-y-1">
                                        <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider px-2 py-1">
                                            Thêm mới
                                        </div>
                                        <button
                                            onClick={() => { setShowAddKanjiModal(true); setAdminMenuOpen(false); }}
                                            className="w-full px-2.5 py-2 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-slate-700 dark:text-slate-200 hover:text-emerald-700 dark:hover:text-emerald-300 rounded-xl text-xs font-semibold transition-all flex items-center gap-2.5 cursor-pointer text-left"
                                        >
                                            <div className="w-6 h-6 rounded-lg bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center text-emerald-600 shrink-0">
                                                <Plus className="w-3.5 h-3.5" />
                                            </div>
                                            <span>Thêm Kanji mới</span>
                                        </button>
                                        <button
                                            onClick={() => { setShowAddVocabModal(true); setAdminMenuOpen(false); }}
                                            className="w-full px-2.5 py-2 hover:bg-sky-50 dark:hover:bg-sky-950/40 text-slate-700 dark:text-slate-200 hover:text-sky-700 dark:hover:text-sky-300 rounded-xl text-xs font-semibold transition-all flex items-center gap-2.5 cursor-pointer text-left"
                                        >
                                            <div className="w-6 h-6 rounded-lg bg-sky-100 dark:bg-sky-950 flex items-center justify-center text-sky-600 shrink-0">
                                                <Plus className="w-3.5 h-3.5" />
                                            </div>
                                            <span>Thêm Từ vựng mới</span>
                                        </button>
                                        <button
                                            onClick={() => { setShowCategoryModal(true); setAdminMenuOpen(false); }}
                                            className="w-full px-2.5 py-2 hover:bg-purple-50 dark:hover:bg-purple-950/40 text-slate-700 dark:text-slate-200 hover:text-purple-700 dark:hover:text-purple-300 rounded-xl text-xs font-semibold transition-all flex items-center gap-2.5 cursor-pointer text-left"
                                        >
                                            <div className="w-6 h-6 rounded-lg bg-purple-100 dark:bg-purple-950 flex items-center justify-center text-purple-600 shrink-0">
                                                <Layers className="w-3.5 h-3.5" />
                                            </div>
                                            <span>Quản lý Phân Loại</span>
                                        </button>
                                    </div>

                                    {/* Section 2: AI & Đồng bộ tự động */}
                                    <div className="p-1 space-y-1">
                                        <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider px-2 py-1">
                                            AI & Đồng bộ
                                        </div>
                                        {handleBatchGenerateAiVocabForNoVocabKanji && (
                                            <button
                                                onClick={() => { handleBatchGenerateAiVocabForNoVocabKanji(10); setAdminMenuOpen(false); }}
                                                disabled={generatingAiVocab}
                                                className="w-full px-2.5 py-2 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 text-slate-700 dark:text-slate-200 hover:text-indigo-700 dark:hover:text-indigo-300 rounded-xl text-xs font-semibold transition-all flex items-center gap-2.5 cursor-pointer text-left disabled:opacity-50"
                                            >
                                                <div className="w-6 h-6 rounded-lg bg-indigo-100 dark:bg-indigo-950 flex items-center justify-center text-indigo-600 shrink-0">
                                                    <Sparkles className={`w-3.5 h-3.5 ${generatingAiVocab ? 'animate-spin' : ''}`} />
                                                </div>
                                                <span className="truncate">{generatingAiVocab ? 'AI đang tạo từ vựng...' : 'AI Bổ sung Từ vựng (10 Kanji)'}</span>
                                            </button>
                                        )}
                                        {handleAutoFixVocabSinoViet && (
                                            <button
                                                onClick={() => { handleAutoFixVocabSinoViet(); setAdminMenuOpen(false); }}
                                                disabled={fixingSinoViet}
                                                className="w-full px-2.5 py-2 hover:bg-teal-50 dark:hover:bg-teal-950/40 text-slate-700 dark:text-slate-200 hover:text-teal-700 dark:hover:text-teal-300 rounded-xl text-xs font-semibold transition-all flex items-center gap-2.5 cursor-pointer text-left disabled:opacity-50"
                                            >
                                                <div className="w-6 h-6 rounded-lg bg-teal-100 dark:bg-teal-950 flex items-center justify-center text-teal-600 shrink-0">
                                                    <Sparkles className={`w-3.5 h-3.5 ${fixingSinoViet ? 'animate-spin' : ''}`} />
                                                </div>
                                                <span>Sửa Âm Hán Việt Từ vựng</span>
                                            </button>
                                        )}
                                        <button
                                            onClick={() => { handleSyncVocabToKanji(); setAdminMenuOpen(false); }}
                                            className="w-full px-2.5 py-2 hover:bg-amber-50 dark:hover:bg-amber-950/40 text-slate-700 dark:text-slate-200 hover:text-amber-700 dark:hover:text-amber-300 rounded-xl text-xs font-semibold transition-all flex items-center gap-2.5 cursor-pointer text-left"
                                        >
                                            <div className="w-6 h-6 rounded-lg bg-amber-100 dark:bg-amber-950 flex items-center justify-center text-amber-600 shrink-0">
                                                <RefreshCw className="w-3.5 h-3.5" />
                                            </div>
                                            <span>Đồng bộ Hán tự thiếu</span>
                                        </button>
                                    </div>

                                    {/* Section 3: CDN & Di trú */}
                                    <div className="p-1 space-y-1">
                                        <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider px-2 py-1">
                                            Hệ thống & CDN
                                        </div>
                                        <button
                                            onClick={() => { handleCDNSync(); setAdminMenuOpen(false); }}
                                            disabled={syncingCDN}
                                            className="w-full px-2.5 py-2 hover:bg-cyan-50 dark:hover:bg-cyan-950/40 text-slate-700 dark:text-slate-200 hover:text-cyan-700 dark:hover:text-cyan-300 rounded-xl text-xs font-semibold transition-all flex items-center gap-2.5 cursor-pointer text-left disabled:opacity-50"
                                        >
                                            <div className="w-6 h-6 rounded-lg bg-cyan-100 dark:bg-cyan-950 flex items-center justify-center text-cyan-600 shrink-0">
                                                <Upload className={`w-3.5 h-3.5 ${syncingCDN ? 'animate-spin' : ''}`} />
                                            </div>
                                            <span>Đồng bộ CDN</span>
                                        </button>
                                        <button
                                            onClick={() => { handleMigrateComponents(); setAdminMenuOpen(false); }}
                                            disabled={migratingComponents}
                                            className="w-full px-2.5 py-2 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 text-slate-700 dark:text-slate-200 hover:text-indigo-700 dark:hover:text-indigo-300 rounded-xl text-xs font-semibold transition-all flex items-center gap-2.5 cursor-pointer text-left disabled:opacity-50"
                                        >
                                            <div className="w-6 h-6 rounded-lg bg-indigo-100 dark:bg-indigo-950 flex items-center justify-center text-indigo-600 shrink-0">
                                                <RefreshCw className={`w-3.5 h-3.5 ${migratingComponents ? 'animate-spin' : ''}`} />
                                            </div>
                                            <span>Ghi đè Bộ thủ</span>
                                        </button>
                                    </div>

                                    {/* Section 4: Chọn nhiều */}
                                    <div className="p-1">
                                        <button
                                            onClick={() => { setBulkSelectMode(!bulkSelectMode); setAdminMenuOpen(false); }}
                                            className={`w-full px-2.5 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2.5 cursor-pointer text-left ${
                                                bulkSelectMode
                                                    ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400'
                                                    : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200'
                                            }`}
                                        >
                                            <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${
                                                bulkSelectMode ? 'bg-rose-100 dark:bg-rose-900 text-rose-600' : 'bg-slate-100 dark:bg-slate-800 text-slate-600'
                                            }`}>
                                                {bulkSelectMode ? <CheckSquare className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5" />}
                                            </div>
                                            <span>{bulkSelectMode ? 'Tắt chế độ Chọn nhiều' : 'Bật chế độ Chọn nhiều'}</span>
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Bulk Delete Action Button (Appears when items are selected) */}
                    {isUserAdmin && bulkSelectMode && selectedKanjiIds.length > 0 && (
                        <button
                            onClick={handleBulkDeleteKanji}
                            className="px-3 sm:px-4 py-2.5 sm:py-3 bg-red-600 hover:bg-red-500 text-white rounded-xl sm:rounded-2xl text-xs sm:text-sm font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-md shadow-red-500/20 shrink-0 animate-in zoom-in-95 duration-150"
                        >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Xóa ({selectedKanjiIds.length})</span>
                        </button>
                    )}
                </div>
            </div>

            {/* Handwriting Canvas Modal Popup */}
            {showHandwritingPopup && (
                <div className="flex justify-center">
                    <div className="bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/60 rounded-2xl shadow-2xl overflow-hidden w-full max-w-sm">
                        <div className="p-3 border-b border-slate-100 dark:border-slate-700/50 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
                            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                                <PenTool className="w-3.5 h-3.5 text-sky-500" /> Vẽ Kanji để tìm kiếm
                            </span>
                            <div className="flex items-center gap-1.5">
                                {handwritingStrokesRef.current.length > 0 && (
                                    <span className="text-[9px] text-gray-400 mr-1 font-mono">{handwritingStrokesRef.current.length} nét</span>
                                )}
                                <button
                                    onClick={() => {
                                        const canvas = document.getElementById('handwriting-canvas');
                                        if (canvas) { const ctx = canvas.getContext('2d'); ctx.clearRect(0, 0, canvas.width, canvas.height); }
                                        handwritingStrokesRef.current = []; currentStrokeRef.current = { xs: [], ys: [] };
                                        if (recognitionTimeoutRef.current) clearTimeout(recognitionTimeoutRef.current);
                                        setHandwritingSuggestions([]);
                                    }}
                                    className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-gray-500 transition-colors cursor-pointer" title="Xóa và vẽ lại"
                                ><RotateCcw className="w-3.5 h-3.5" /></button>
                                <button onClick={() => setShowHandwritingPopup(false)} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-gray-500 transition-colors cursor-pointer">
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        </div>
                        <div className="relative bg-slate-50 dark:bg-slate-900" style={{ height: '240px' }}>
                            <canvas
                                id="handwriting-canvas" width="280" height="240"
                                className="w-full h-full cursor-crosshair touch-none" style={{ touchAction: 'none' }}
                                onMouseDown={(e) => { const canvas = e.currentTarget; const rect = canvas.getBoundingClientRect(); const x = (e.clientX - rect.left) * (canvas.width / rect.width); const y = (e.clientY - rect.top) * (canvas.height / rect.height); const ctx = canvas.getContext('2d'); ctx.beginPath(); ctx.moveTo(x, y); canvas.dataset.drawing = 'true'; currentStrokeRef.current = { xs: [Math.round(x)], ys: [Math.round(y)] }; }}
                                onMouseMove={(e) => { const canvas = e.currentTarget; if (canvas.dataset.drawing !== 'true') return; const rect = canvas.getBoundingClientRect(); const x = (e.clientX - rect.left) * (canvas.width / rect.width); const y = (e.clientY - rect.top) * (canvas.height / rect.height); const ctx = canvas.getContext('2d'); ctx.lineTo(x, y); ctx.strokeStyle = document.documentElement.classList.contains('dark') ? '#38bdf8' : '#0284c7'; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.stroke(); currentStrokeRef.current.xs.push(Math.round(x)); currentStrokeRef.current.ys.push(Math.round(y)); }}
                                onMouseUp={(e) => { const canvas = e.currentTarget; canvas.dataset.drawing = 'false'; if (currentStrokeRef.current.xs.length > 1) { handwritingStrokesRef.current = [...handwritingStrokesRef.current, { ...currentStrokeRef.current }]; currentStrokeRef.current = { xs: [], ys: [] }; if (recognitionTimeoutRef.current) clearTimeout(recognitionTimeoutRef.current); recognitionTimeoutRef.current = setTimeout(() => { recognizeHandwriting(handwritingStrokesRef.current, canvas.width, canvas.height); }, 300); } }}
                                onMouseLeave={(e) => { const canvas = e.currentTarget; if (canvas.dataset.drawing === 'true') { canvas.dataset.drawing = 'false'; if (currentStrokeRef.current.xs.length > 1) { handwritingStrokesRef.current = [...handwritingStrokesRef.current, { ...currentStrokeRef.current }]; currentStrokeRef.current = { xs: [], ys: [] }; if (recognitionTimeoutRef.current) clearTimeout(recognitionTimeoutRef.current); recognitionTimeoutRef.current = setTimeout(() => { recognizeHandwriting(handwritingStrokesRef.current, canvas.width, canvas.height); }, 300); } } }}
                                onTouchStart={(e) => { e.preventDefault(); const canvas = e.currentTarget; const rect = canvas.getBoundingClientRect(); const touch = e.touches[0]; const x = (touch.clientX - rect.left) * (canvas.width / rect.width); const y = (touch.clientY - rect.top) * (canvas.height / rect.height); const ctx = canvas.getContext('2d'); ctx.beginPath(); ctx.moveTo(x, y); canvas.dataset.drawing = 'true'; currentStrokeRef.current = { xs: [Math.round(x)], ys: [Math.round(y)] }; }}
                                onTouchMove={(e) => { e.preventDefault(); const canvas = e.currentTarget; if (canvas.dataset.drawing !== 'true') return; const rect = canvas.getBoundingClientRect(); const touch = e.touches[0]; const x = (touch.clientX - rect.left) * (canvas.width / rect.width); const y = (touch.clientY - rect.top) * (canvas.height / rect.height); const ctx = canvas.getContext('2d'); ctx.lineTo(x, y); ctx.strokeStyle = document.documentElement.classList.contains('dark') ? '#38bdf8' : '#0284c7'; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.stroke(); currentStrokeRef.current.xs.push(Math.round(x)); currentStrokeRef.current.ys.push(Math.round(y)); }}
                                onTouchEnd={(e) => { const canvas = e.currentTarget; canvas.dataset.drawing = 'false'; if (currentStrokeRef.current.xs.length > 1) { handwritingStrokesRef.current = [...handwritingStrokesRef.current, { ...currentStrokeRef.current }]; currentStrokeRef.current = { xs: [], ys: [] }; if (recognitionTimeoutRef.current) clearTimeout(recognitionTimeoutRef.current); recognitionTimeoutRef.current = setTimeout(() => { recognizeHandwriting(handwritingStrokesRef.current, canvas.width, canvas.height); }, 300); } }}
                            />
                        </div>
                        {handwritingSuggestions.length > 0 && (
                            <div className="border-t border-slate-100 dark:border-slate-700/50 p-3 bg-slate-50 dark:bg-slate-900/30 max-h-40 overflow-y-auto">
                                <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">Chọn Kanji phù hợp:</div>
                                <div className="grid grid-cols-6 gap-2">
                                    {handwritingSuggestions.map((kanji, idx) => (
                                        <button key={kanji.id || idx}
                                            onClick={() => { openKanjiDetail(kanji.character); const canvas = document.getElementById('handwriting-canvas'); if (canvas) { const ctx = canvas.getContext('2d'); ctx.clearRect(0, 0, canvas.width, canvas.height); } handwritingStrokesRef.current = []; setHandwritingSuggestions([]); setShowHandwritingPopup(false); }}
                                            className={`aspect-square rounded-xl border flex flex-col items-center justify-center text-lg font-japanese font-bold transition-all hover:scale-105 active:scale-95 cursor-pointer ${kanji.inDatabase === false ? 'bg-slate-100 dark:bg-slate-800 border-slate-200/50 dark:border-slate-700/50 text-slate-400' : 'bg-white dark:bg-slate-700 border-slate-200/80 dark:border-slate-650 text-slate-800 dark:text-white'}`}
                                        >
                                            <span>{kanji.character}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default KanjiNavHeader;
