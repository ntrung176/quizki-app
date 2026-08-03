import React from 'react';
import { Bookmark, Check, Sparkle, Plus } from 'lucide-react';
import { LEVEL_COLORS } from './kanjiConstants';
import { getJotobaKanjiData } from '../../data/jotobaKanjiData';

const KanjiGridList = ({
    selectedLevel,
    currentKanjiList,
    displayedKanjiList,
    completedCount,
    kanjiMap,
    userKanjiSRS,
    toggleKanjiSRS,
    openKanjiDetail,
    bulkSelectMode,
    selectedKanjiIds,
    toggleKanjiSelection,
    visibleLimit,
    setVisibleLimit
}) => {
    return (
        <div className="space-y-6">
            {/* Progress Overview Bar Section */}
            {selectedLevel !== 'Bộ thủ' && currentKanjiList.length > 0 && (
                <div className="flex flex-col md:flex-row md:items-center justify-between bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-md gap-4">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <Sparkle className="w-4 h-4 text-amber-500" />
                            <h3 className="font-extrabold text-slate-800 dark:text-white text-base">Tiến độ cấp độ {selectedLevel}</h3>
                        </div>
                        <p className="text-xs text-slate-400 dark:text-slate-500">
                            Đã lưu <span className="font-bold text-sky-500">{completedCount}</span> / {currentKanjiList.length} chữ Kanji trong danh sách ôn tập.
                        </p>
                    </div>
                    <div className="flex items-center gap-3 w-full md:w-64">
                        <div className="flex-1 h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden p-0.5 border border-slate-200/50 dark:border-slate-700/50">
                            <div
                                className="h-full bg-gradient-to-r from-sky-400 to-indigo-500 rounded-full transition-all duration-500 shadow-sm"
                                style={{ width: `${Math.round((completedCount / (currentKanjiList.length || 1)) * 100)}%` }}
                            />
                        </div>
                        <span className="text-xs font-black text-slate-700 dark:text-slate-300 w-10 text-right">
                            {Math.round((completedCount / (currentKanjiList.length || 1)) * 100)}%
                        </span>
                    </div>
                </div>
            )}

            {/* Kanji Cards Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
                {displayedKanjiList.map((char, index) => {
                    const kanjiDoc = kanjiMap.get(char);
                    const jData = getJotobaKanjiData(char);

                    const sinoViet = kanjiDoc?.sinoViet || jData?.sinoViet || '';
                    const meaning = kanjiDoc?.meaning || jData?.meaningVi || jData?.meanings?.join(', ') || '';
                    const strokeCount = kanjiDoc?.strokeCount || jData?.stroke_count || '';
                    const isSRSAdded = kanjiDoc ? userKanjiSRS.has(kanjiDoc.id) : false;
                    const isSelected = kanjiDoc && selectedKanjiIds.includes(kanjiDoc.id);

                    const levelStyle = LEVEL_COLORS[selectedLevel] || LEVEL_COLORS.N5;

                    return (
                        <div
                            key={kanjiDoc?.id || `${char}_${index}`}
                            onClick={() => {
                                if (bulkSelectMode && kanjiDoc?.id) {
                                    toggleKanjiSelection(kanjiDoc.id);
                                } else {
                                    openKanjiDetail(char);
                                }
                            }}
                            className={`group relative bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl border p-4 sm:p-5 flex flex-col justify-between items-center text-center cursor-pointer transition-all duration-300 hover:shadow-xl hover:-translate-y-1 ${
                                isSelected
                                    ? 'border-sky-500 ring-2 ring-sky-500/30 bg-sky-50/50 dark:bg-sky-950/20'
                                    : 'border-slate-200 dark:border-slate-800 hover:border-sky-400 dark:hover:border-sky-500/50'
                            }`}
                        >
                            {/* Checkbox for bulk select */}
                            {bulkSelectMode && kanjiDoc?.id && (
                                <div className="absolute top-2.5 left-2.5 z-10" onClick={e => e.stopPropagation()}>
                                    <input
                                        type="checkbox"
                                        checked={isSelected}
                                        onChange={() => toggleKanjiSelection(kanjiDoc.id)}
                                        className="w-4 h-4 rounded border-slate-300 text-sky-500 focus:ring-sky-500"
                                    />
                                </div>
                            )}

                            {/* SRS Bookmark Button / Badge */}
                            <div className="absolute top-2.5 right-2.5 z-10 flex items-center gap-1">
                                {strokeCount && (
                                    <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border border-slate-200/50 dark:border-slate-700/50">
                                        {strokeCount} nét
                                    </span>
                                )}
                                {kanjiDoc && (
                                    <button
                                        onClick={(e) => toggleKanjiSRS(e, char)}
                                        className={`p-1 rounded-lg transition-all ${
                                            isSRSAdded
                                                ? 'text-amber-500 bg-amber-50 dark:bg-amber-950/40'
                                                : 'text-slate-300 hover:text-amber-500 hover:bg-slate-100 dark:hover:bg-slate-800'
                                        }`}
                                        title={isSRSAdded ? 'Đã thêm vào SRS' : 'Lưu Kanji vào SRS'}
                                    >
                                        <Bookmark className={`w-3.5 h-3.5 ${isSRSAdded ? 'fill-amber-500' : ''}`} />
                                    </button>
                                )}
                            </div>

                            {/* Kanji Character Display */}
                            <div className="my-2 flex flex-col items-center">
                                <span className="text-4xl sm:text-5xl font-japanese font-black text-slate-800 dark:text-slate-100 group-hover:scale-110 group-hover:text-sky-500 transition-all duration-300">
                                    {char}
                                </span>
                                {sinoViet && (
                                    <span className="mt-1.5 text-xs sm:text-sm font-bold text-sky-600 dark:text-sky-400 tracking-wide uppercase">
                                        {sinoViet}
                                    </span>
                                )}
                            </div>

                            {/* Meaning */}
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1 w-full font-medium mt-1">
                                {meaning || 'Chưa có thông tin'}
                            </p>
                        </div>
                    );
                })}
            </div>

            {/* Load More Button */}
            {selectedLevel !== 'Bộ thủ' && displayedKanjiList.length < currentKanjiList.length && (
                <div className="flex justify-center pt-4">
                    <button
                        onClick={() => setVisibleLimit(prev => prev + 100)}
                        className="px-6 py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl text-xs font-bold transition-all shadow-md hover:shadow-lg hover:scale-105 active:scale-95 flex items-center gap-2 cursor-pointer"
                    >
                        <Plus className="w-4 h-4" /> Xem thêm Kanji ({currentKanjiList.length - displayedKanjiList.length} còn lại)
                    </button>
                </div>
            )}
        </div>
    );
};

export default KanjiGridList;
