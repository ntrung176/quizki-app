import React from 'react';
import { Cpu, Search, PenTool, RotateCcw, X, RefreshCw, Upload, Plus, Layers, CheckSquare, Square } from 'lucide-react';
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
    bulkSelectMode,
    setBulkSelectMode,
    selectedKanjiIds,
    handleBulkDeleteKanji
}) => {
    return (
        <div className="flex flex-col gap-4">
            {/* Cyber-AI Header Banner */}
            <div className="relative overflow-hidden bg-white dark:bg-slate-900 border border-slate-200 dark:border-cyan-500/30 rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-8 text-slate-800 dark:text-slate-100 shadow-xl group">
                <div className="absolute top-0 right-0 w-80 h-80 bg-cyan-500/10 dark:bg-cyan-500/15 rounded-full blur-3xl pointer-events-none"></div>
                <div className="absolute bottom-0 left-0 w-60 h-60 bg-indigo-500/10 dark:bg-indigo-600/15 rounded-full blur-3xl pointer-events-none"></div>

                <div className="relative z-10 space-y-1.5 sm:space-y-2">
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full bg-cyan-50 dark:bg-cyan-950/60 border border-cyan-200 dark:border-cyan-800/60 text-cyan-700 dark:text-cyan-400 text-[10px] sm:text-xs font-mono font-bold uppercase tracking-wider">
                        <Cpu className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400 animate-spin-slow" />
                        <span>[NEURAL KANJI DICTIONARY]</span>
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                        Tra cứu Kanji
                    </h1>
                    <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 font-medium max-w-2xl">
                        Khám phá và tra cứu hệ thống Kanji, nghĩa và âm Hán-Việt với bộ công cụ HUD hiện đại.
                    </p>
                </div>
            </div>

            {/* Search & Filters Row */}
            <div className="flex flex-col md:flex-row gap-3 sm:gap-4 items-stretch md:items-center">
                {/* Search Input */}
                <div className="relative flex-1" ref={searchInputRef}>
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => { setSearchQuery(e.target.value); setShowSearchResults(true); }}
                        onFocus={() => setShowSearchResults(true)}
                        placeholder="Tìm kiếm Kanji, nghĩa hoặc âm Hán-Việt..."
                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl sm:rounded-2xl px-4 py-2.5 sm:px-5 sm:py-3.5 pr-20 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:ring-2 focus:ring-cyan-500 dark:focus:ring-cyan-400/50 focus:border-cyan-400 shadow-md transition-all text-xs sm:text-sm font-medium"
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                        <button
                            onClick={() => setShowHandwritingPopup(!showHandwritingPopup)}
                            className={`p-2 rounded-xl transition-all hover:scale-105 cursor-pointer ${showHandwritingPopup ? 'bg-sky-100 dark:bg-sky-950 text-sky-600 dark:text-sky-400' : 'hover:bg-slate-100 dark:hover:bg-slate-700/50 text-gray-400'}`}
                            title="Vẽ Kanji để tìm kiếm"
                        >
                            <PenTool className="w-4 h-4" />
                        </button>
                        <Search className="w-4 h-4 text-gray-400" />
                    </div>

                    {/* Search Results Dropdown */}
                    {showSearchResults && searchQuery.trim() && (searchResults.length > 0 || vocabList.some(v => v.word?.includes(searchQuery) || (v.meaning && String(v.meaning).toLowerCase().includes(searchQuery.toLowerCase())) || v.reading?.includes(searchQuery))) && (
                        <div className="absolute z-50 w-full mt-2 bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/60 rounded-2xl shadow-2xl max-h-96 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-700/50 animate-in fade-in slide-in-from-top-2 duration-200">
                            {searchResults.length > 0 && (
                                <>
                                    <div className="px-4 py-2 text-[10px] font-bold text-slate-400 dark:text-slate-500 tracking-wider bg-slate-50/50 dark:bg-slate-850/50 flex items-center gap-1.5">
                                        <span className="w-4.5 h-4.5 rounded-lg bg-sky-100 dark:bg-sky-950 flex items-center justify-center text-[10px] text-sky-600 dark:text-sky-400 font-bold font-japanese">漢</span>
                                        KANJI ({searchResults.length})
                                    </div>
                                    {searchResults.slice(0, 10).map((kanji, idx) => (
                                        <button key={kanji.id || idx} onClick={() => { openKanjiDetail(kanji.character); setSearchQuery(''); setShowSearchResults(false); }}
                                            className="w-full px-4 py-3 flex items-center gap-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors text-left cursor-pointer">
                                            <span className="text-2xl font-japanese font-bold text-sky-600 dark:text-sky-400 w-10 text-center">{kanji.character}</span>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-bold text-slate-700 dark:text-slate-200 text-sm">{kanji.sinoViet || '---'}</span>
                                                    <span className="text-[9px] px-1.5 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300 rounded-md font-bold uppercase">{kanji.level}</span>
                                                </div>
                                                <div className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">{kanji.meaning}</div>
                                            </div>
                                        </button>
                                    ))}
                                </>
                            )}
                            {(() => {
                                const q = searchQuery.toLowerCase().trim();
                                const vocabResults = vocabList.filter(v => v.word?.includes(q) || (v.meaning && String(v.meaning).toLowerCase().includes(q)) || v.reading?.includes(q) || (v.sinoViet && String(v.sinoViet).toLowerCase().includes(q))).slice(0, 10);
                                if (vocabResults.length === 0) return null;
                                return (
                                    <>
                                        <div className="px-4 py-2 text-[10px] font-bold text-slate-400 dark:text-slate-500 tracking-wider bg-slate-50/50 dark:bg-slate-850/50 flex items-center gap-1.5">
                                            <span className="w-4.5 h-4.5 rounded-lg bg-orange-100 dark:bg-orange-950 flex items-center justify-center text-[10px] text-orange-600 dark:text-orange-400 font-bold font-japanese">語</span>
                                            TỪ VỰNG ({vocabResults.length})
                                        </div>
                                        {vocabResults.map((v, idx) => (
                                            <button key={v.id || idx} onClick={() => {
                                                const kanjiChar = v.word?.split('').find(ch => { const code = ch.charCodeAt(0); return code >= 0x4E00 && code <= 0x9FFF; });
                                                if (kanjiChar) { openKanjiDetail(kanjiChar); }
                                                setSearchQuery(''); setShowSearchResults(false);
                                            }}
                                                className="w-full px-4 py-3 flex items-center gap-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors text-left cursor-pointer">
                                                <span className="text-xl font-japanese font-bold text-orange-500 dark:text-orange-400 w-10 text-center">{v.word}</span>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">{v.reading}</span>
                                                        {v.sinoViet && <span className="text-[9px] font-bold text-amber-500 dark:text-amber-400 uppercase">{v.sinoViet}</span>}
                                                    </div>
                                                    <div className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">{v.meaning}</div>
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

                {/* JLPT Level Tags */}
                <div className="flex flex-wrap gap-2 items-center">
                    {[...JLPT_LEVELS, 'Bộ thủ', ...(isUserAdmin ? ['Mới thêm', 'Chưa có từ vựng', 'Đã có từ vựng'] : [])].map(level => {
                        const isActive = selectedLevel === level;
                        const isLocked = ['N3', 'N2', 'N1'].includes(level) && !isAdmin && !profile?.isPremiumUnlocked && !(profile?.unlockedSpecializedPackages || []).includes('kanji_zen');
                        return (
                            <button
                                key={level}
                                onClick={() => {
                                    if (isLocked) {
                                        setLockedPkgName('Thư viện Kanji Zen');
                                        setShowPremiumModal(true);
                                    } else {
                                        setSelectedLevel(level);
                                    }
                                }}
                                className={`px-4 py-2.5 rounded-xl font-bold text-xs tracking-wider transition-all duration-200 hover:scale-105 active:scale-95 shadow-sm border flex items-center gap-1.5 cursor-pointer ${isActive
                                    ? LEVEL_TAB_COLORS[level] + ' border-transparent'
                                    : 'bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700/50 border-slate-200/80 dark:border-slate-700/50'
                                    }`}
                            >
                                <span>{level}</span>
                                {isLocked && <span className="text-[10px]" title="Cấp độ Premium">🔒</span>}
                            </button>
                        );
                    })}
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

            {/* Admin Actions Bar */}
            {isUserAdmin && (
                <div className="flex items-center gap-2 flex-wrap bg-slate-50 dark:bg-slate-800/40 p-3 rounded-2xl border border-slate-200/80 dark:border-slate-700/60 shadow-sm">
                    <button
                        onClick={handleCDNSync}
                        disabled={syncingCDN}
                        className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                        <Upload className={`w-3.5 h-3.5 ${syncingCDN ? 'animate-spin' : ''}`} /> Đồng bộ CDN
                    </button>
                    <button
                        onClick={handleMigrateComponents}
                        disabled={migratingComponents}
                        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 ${migratingComponents ? 'animate-spin' : ''}`} /> Ghi đè Bộ thủ
                    </button>
                    <button
                        onClick={() => setShowAddKanjiModal(true)}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                        <Plus className="w-3.5 h-3.5" /> Thêm Kanji
                    </button>
                    <button
                        onClick={() => setShowAddVocabModal(true)}
                        className="px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                        <Plus className="w-3.5 h-3.5" /> Thêm Từ vựng
                    </button>
                    <button
                        onClick={() => setShowCategoryModal(true)}
                        className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                        <Layers className="w-3.5 h-3.5" /> Thêm Phân Loại
                    </button>
                    <button
                        onClick={handleSyncVocabToKanji}
                        className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                        <RefreshCw className="w-3.5 h-3.5" /> Đồng bộ Hán tự thiếu
                    </button>
                    <button
                        onClick={() => setBulkSelectMode(!bulkSelectMode)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${bulkSelectMode ? 'bg-rose-500 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200'}`}
                    >
                        {bulkSelectMode ? <CheckSquare className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5" />}
                        {bulkSelectMode ? 'Tắt Chọn Nhiều' : 'Chọn Nhiều'}
                    </button>
                    {bulkSelectMode && selectedKanjiIds.length > 0 && (
                        <button
                            onClick={handleBulkDeleteKanji}
                            className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                        >
                            Xóa ({selectedKanjiIds.length}) Kanji
                        </button>
                    )}
                </div>
            )}
        </div>
    );
};

export default KanjiNavHeader;
