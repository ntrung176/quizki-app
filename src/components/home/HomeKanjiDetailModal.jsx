import React from 'react';
import { X, Heart, BookOpen, Layers, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import openjlptKanjiVocab from '../../data/openjlptKanjiVocab.json' with { type: 'json' };

export default function HomeKanjiDetailModal({
    isOpen,
    onClose,
    kanji,
    isBookmarked = false,
    onToggleBookmark
}) {
    const navigate = useNavigate();

    if (!isOpen || !kanji) return null;

    const char = kanji.literal || kanji.character || '';
    const sinoViet = (kanji.sinoViet || '').toUpperCase();
    const meaningVi = kanji.meaningVi || (Array.isArray(kanji.meanings) ? kanji.meanings.join(', ') : kanji.meaning || '');
    const onyomi = Array.isArray(kanji.onyomi) ? kanji.onyomi : (kanji.onyomi ? kanji.onyomi.split('、') : []);
    const kunyomi = Array.isArray(kanji.kunyomi) ? kanji.kunyomi : (kanji.kunyomi ? kanji.kunyomi.split('、') : []);
    const level = kanji.level || (kanji.jlpt ? `N${kanji.jlpt}` : null);
    const strokeCount = kanji.stroke_count || kanji.strokeCount || null;
    const parts = Array.isArray(kanji.parts) ? kanji.parts : (kanji.parts ? String(kanji.parts).split(/[、,]/) : []);

    // Compound vocabulary words from openjlptKanjiVocab
    const compoundWords = (openjlptKanjiVocab && openjlptKanjiVocab[char]) ? openjlptKanjiVocab[char].slice(0, 8) : [];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
            <div className="bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden w-full max-w-lg max-h-[85vh] flex flex-col">
                {/* Header */}
                <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-850">
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-black uppercase tracking-wider text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 px-2.5 py-1 rounded-xl flex items-center gap-1.5">
                            <Layers className="w-3.5 h-3.5" />
                            Chi tiết Chữ Hán
                        </span>
                        {level && (
                            <span className="text-xs font-black uppercase px-2 py-0.5 rounded-lg bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                                {level}
                            </span>
                        )}
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-750 rounded-xl text-slate-500 dark:text-slate-400 transition cursor-pointer"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body Content */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
                    {/* Character Banner */}
                    <div className="p-5 rounded-3xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 flex items-center gap-5">
                        <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-white dark:bg-slate-850 border-2 border-amber-400 dark:border-amber-600 shadow-md flex items-center justify-center shrink-0">
                            <span className="font-japanese font-black text-4xl sm:text-5xl text-amber-600 dark:text-amber-400 select-none">
                                {char}
                            </span>
                        </div>
                        <div className="min-w-0 flex-1">
                            {sinoViet && (
                                <h3 className="font-black text-xl sm:text-2xl text-slate-900 dark:text-white tracking-wide">
                                    {sinoViet}
                                </h3>
                            )}
                            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mt-1">
                                {meaningVi || 'Ý nghĩa đang cập nhật'}
                            </p>
                            <div className="flex items-center gap-2 mt-2 flex-wrap">
                                {strokeCount && (
                                    <span className="text-xs font-bold text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2 py-0.5 rounded-lg">
                                        {strokeCount} nét
                                    </span>
                                )}
                                {level && (
                                    <span className="text-xs font-bold text-amber-600 dark:text-amber-400 bg-amber-100/70 dark:bg-amber-950/60 px-2 py-0.5 rounded-lg">
                                        Cấp độ {level}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Onyomi & Kunyomi */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800">
                            <h5 className="text-[11px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-400 mb-1.5">
                                Âm On (Onyomi)
                            </h5>
                            <p className="font-japanese font-bold text-base text-slate-900 dark:text-white">
                                {onyomi.length > 0 ? onyomi.join('、') : '---'}
                            </p>
                        </div>
                        <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800">
                            <h5 className="text-[11px] font-black uppercase tracking-wider text-teal-600 dark:text-teal-400 mb-1.5">
                                Âm Kun (Kunyomi)
                            </h5>
                            <p className="font-japanese font-bold text-base text-slate-900 dark:text-white">
                                {kunyomi.length > 0 ? kunyomi.join('、') : '---'}
                            </p>
                        </div>
                    </div>

                    {/* Radical Parts Breakdown */}
                    {parts.length > 0 && (
                        <div className="space-y-2">
                            <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
                                Bộ phận cấu thành:
                            </h4>
                            <div className="flex items-center gap-2 flex-wrap">
                                {parts.map((p, idx) => (
                                    <span
                                        key={idx}
                                        className="font-japanese font-bold text-base px-3 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700"
                                    >
                                        {p}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Compound Vocabulary Words */}
                    {compoundWords.length > 0 && (
                        <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                            <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
                                Từ ghép thông dụng ({compoundWords.length}):
                            </h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {compoundWords.map((cw, idx) => (
                                    <div
                                        key={idx}
                                        className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-750 flex items-start justify-between gap-2"
                                    >
                                        <div className="min-w-0">
                                            <p className="font-japanese font-bold text-sm text-slate-900 dark:text-white">
                                                {cw.word}
                                            </p>
                                            {cw.reading && (
                                                <p className="font-japanese text-[11px] text-slate-500 dark:text-slate-400">
                                                    {cw.reading}
                                                </p>
                                            )}
                                            <p className="text-xs text-slate-600 dark:text-slate-300 font-medium truncate mt-0.5">
                                                {cw.meaning || cw.meanings?.join(', ')}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Actions */}
                <div className="p-3.5 sm:p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 flex items-center justify-between gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                    >
                        Quay lại
                    </button>

                    <div className="flex items-center gap-2">
                        {/* Bookmark to SRS Button */}
                        <button
                            type="button"
                            onClick={() => onToggleBookmark(kanji)}
                            className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition cursor-pointer active:scale-95 ${
                                isBookmarked
                                    ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-500 border border-rose-200 dark:border-rose-800'
                                    : 'bg-amber-500 hover:bg-amber-400 text-white shadow-xs'
                            }`}
                        >
                            <Heart className={`w-4 h-4 ${isBookmarked ? 'fill-rose-500 text-rose-500' : ''}`} />
                            <span>{isBookmarked ? 'Đã lưu SRS' : 'Lưu vào SRS'}</span>
                        </button>

                        {/* Full Screen View Button */}
                        <button
                            type="button"
                            onClick={() => {
                                onClose();
                                navigate(`/kanji/list/${encodeURIComponent(char)}?from=list`);
                            }}
                            className="px-3.5 py-2.5 rounded-xl bg-slate-200 dark:bg-slate-750 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer active:scale-95"
                            title="Mở toàn màn hình"
                        >
                            <span className="hidden sm:inline">Trang đầy đủ</span>
                            <ExternalLink className="w-3.5 h-3.5" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
