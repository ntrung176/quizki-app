import React from 'react';
import { Volume2, Plus, Sparkles, Heart, ChevronRight, Check } from 'lucide-react';
import { speakJapanese } from '../../utils/audio';

// Map common Japanese POS abbreviations to friendly Vietnamese labels
export const POS_VIETNAMESE_MAP = {
    // Verbs
    'v1': 'Động từ nhóm 2',
    'v5': 'Động từ nhóm 1',
    'v5k': 'Động từ nhóm 1 (k)',
    'v5s': 'Động từ nhóm 1 (s)',
    'v5t': 'Động từ nhóm 1 (t)',
    'v5n': 'Động từ nhóm 1 (n)',
    'v5m': 'Động từ nhóm 1 (m)',
    'v5r': 'Động từ nhóm 1 (r)',
    'v5w': 'Động từ nhóm 1 (w)',
    'v5g': 'Động từ nhóm 1 (g)',
    'v5b': 'Động từ nhóm 1 (b)',
    'v5u': 'Động từ nhóm 1 (u)',
    'v5k-s': 'Động từ nhóm 1 (k-s)',
    'v5r-i': 'Động từ nhóm 1 (r-i)',
    'vk': 'Động từ Kuru (nhóm 3)',
    'vs': 'Động từ Suru (nhóm 3)',
    'vs-i': 'Động từ Suru (nhóm 3)',
    'vs-s': 'Động từ Suru (nhóm 3)',
    'vz': 'Động từ nhóm 2',
    'vi': 'Tự động từ',
    'vt': 'Tha động từ',
    'aux-v': 'Trợ động từ',
    // Adjectives
    'adj-i': 'Tính từ đuôi -i',
    'adj-na': 'Tính từ đuôi -na',
    'adj-no': 'Danh từ đuôi -no',
    'adj-pn': 'Tính từ bổ nghĩa',
    'adj-t': 'Tính từ dạng -taru',
    'adj-f': 'Tính từ dạng cố định',
    'aux-adj': 'Trợ tính từ',
    // Nouns
    'n': 'Danh từ',
    'n-adv': 'Danh từ phó từ',
    'n-t': 'Danh từ chỉ thời gian',
    'n-suf': 'Hậu tố danh từ',
    'n-pref': 'Tiền tố danh từ',
    // Adverbs & Particles
    'adv': 'Phó từ',
    'adv-to': 'Phó từ đuôi と',
    'prt': 'Trợ từ',
    'conj': 'Liên từ',
    'exp': 'Cụm từ',
    'int': 'Thán từ',
    'pn': 'Đại từ',
    'num': 'Số từ',
    'ctr': 'Lượng từ / Đơn vị đếm',
    'pref': 'Tiền tố',
    'suf': 'Hậu tố',
    'cop': 'Hệ từ'
};

export const formatPosTag = (pos) => {
    if (!pos) return '';
    const clean = String(pos).trim().toLowerCase();
    if (POS_VIETNAMESE_MAP[clean]) return POS_VIETNAMESE_MAP[clean];
    if (clean.startsWith('v5')) return 'Động từ nhóm 1';
    if (clean.startsWith('adj-i')) return 'Tính từ đuôi -i';
    if (clean.startsWith('adj-na')) return 'Tính từ đuôi -na';
    if (clean.startsWith('adj-no')) return 'Danh từ đuôi -no';
    if (clean.startsWith('n-')) return 'Danh từ';
    if (clean.startsWith('v1')) return 'Động từ nhóm 2';
    if (clean.startsWith('vs')) return 'Động từ Suru';
    return pos;
};

export const formatJlptLevel = (levelVal) => {
    if (!levelVal) return null;
    const str = String(levelVal).trim().toUpperCase();
    if (!str || str === 'NULL' || str === 'UNDEFINED') return null;
    const match = str.match(/(?:N+)?([1-5])/);
    return match ? `N${match[1]}` : str;
};

export const formatGrammarStructure = (structure) => {
    if (!structure) return '';
    if (typeof structure === 'string') return structure;
    if (Array.isArray(structure)) {
        return structure
            .map(item => {
                if (!item) return '';
                if (typeof item === 'string') return item;
                if (typeof item === 'object') return item.text || item.content || item.formula || '';
                return String(item);
            })
            .filter(Boolean)
            .join(' ');
    }
    if (typeof structure === 'object') {
        return structure.text || structure.content || structure.raw || '';
    }
    return String(structure);
};

// JLPT badge styling using Duolingo-compliant colors (No purple/indigo)
const JLPT_BADGES = {
    N5: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
    N4: 'bg-teal-50 text-teal-700 dark:bg-teal-950/60 dark:text-teal-300 border-teal-200 dark:border-teal-800',
    N3: 'bg-sky-50 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300 border-sky-200 dark:border-sky-800',
    N2: 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800',
    N1: 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200 dark:border-rose-800',
};

const getBadgeClass = (level) => {
    if (!level) return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700';
    const clean = String(level).toUpperCase();
    if (clean.includes('N5')) return JLPT_BADGES.N5;
    if (clean.includes('N4')) return JLPT_BADGES.N4;
    if (clean.includes('N3')) return JLPT_BADGES.N3;
    if (clean.includes('N2')) return JLPT_BADGES.N2;
    if (clean.includes('N1')) return JLPT_BADGES.N1;
    return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700';
};

/**
 * VocabResultCard - Displays vocabulary item with click to open detail popup, audio, and save
 */
export const VocabResultCard = ({
    entry,
    isSaved = false,
    onSelectVocab,
    onOpenSave,
    onOpenAiSave,
    canUserUseAI = true
}) => {
    const word = entry.w || entry.r || '';
    const reading = entry.r || '';
    const meaningsText = Array.isArray(entry.m) ? entry.m.join(', ') : (entry.m || '');
    const posTag = Array.isArray(entry.p) && entry.p.length > 0 ? formatPosTag(entry.p[0]) : null;
    const level = formatJlptLevel(entry.j);
    const sinoViet = entry.hv ? entry.hv.toUpperCase() : null;

    const handlePlayAudio = (e) => {
        e.stopPropagation();
        speakJapanese(word, null, null, null, reading);
    };

    return (
        <div
            onClick={() => onSelectVocab?.(entry)}
            className="group relative flex items-start justify-between gap-3 p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-slate-850 hover:bg-sky-50/50 dark:hover:bg-slate-800/80 border border-slate-200 dark:border-slate-750 hover:border-sky-300 dark:hover:border-sky-600 transition-all duration-200 shadow-xs cursor-pointer"
        >
            <div className="flex-1 min-w-0 pr-1">
                {/* Word & Reading */}
                <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-japanese font-black text-lg sm:text-xl text-slate-900 dark:text-white group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors">
                        {word}
                    </span>
                    {reading && reading !== word && (
                        <span className="font-japanese text-xs sm:text-sm text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md font-medium">
                            {reading}
                        </span>
                    )}
                    {sinoViet && (
                        <span className="text-[10px] font-black uppercase text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-1.5 py-0.5 rounded border border-amber-200/60 dark:border-amber-900/40">
                            {sinoViet}
                        </span>
                    )}
                    {level && (
                        <span className={`text-[10px] font-black px-1.5 py-0.5 rounded border uppercase ${getBadgeClass(level)}`}>
                            {level}
                        </span>
                    )}
                    {posTag && (
                        <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500 italic">
                            ({posTag})
                        </span>
                    )}
                </div>

                {/* Meanings */}
                <p className="mt-1 text-xs sm:text-sm text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed">
                    {meaningsText || 'Đang cập nhật ý nghĩa...'}
                </p>
            </div>

            {/* Quick Action Buttons */}
            <div className="flex items-center gap-1.5 shrink-0 self-center">
                {/* Audio Button */}
                <button
                    type="button"
                    onClick={handlePlayAudio}
                    title="Phát âm từ vựng"
                    className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-500 hover:text-sky-600 hover:bg-sky-100/70 dark:text-slate-400 dark:hover:text-sky-400 dark:hover:bg-slate-750 transition-colors cursor-pointer active:scale-95"
                >
                    <Volume2 className="w-4 h-4" />
                </button>

                {/* AI Assist Button */}
                {canUserUseAI && onOpenAiSave && (
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            onOpenAiSave(entry);
                        }}
                        title="AI tạo ví dụ & lưu vào học phần"
                        className="w-9 h-9 rounded-xl flex items-center justify-center text-amber-600 dark:text-amber-400 hover:bg-amber-100/70 dark:hover:bg-amber-950/40 transition-colors cursor-pointer active:scale-95"
                    >
                        <Sparkles className="w-4 h-4" />
                    </button>
                )}

                {/* Save to Study Set Button */}
                <button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation();
                        onOpenSave(entry);
                    }}
                    title={isSaved ? "Từ này đã có trong học phần của bạn" : "Lưu vào học phần"}
                    className={`h-9 px-2.5 sm:px-3 rounded-xl flex items-center gap-1.5 text-xs font-bold transition-all cursor-pointer active:scale-95 border ${
                        isSaved
                            ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border-emerald-300 dark:border-emerald-700'
                            : 'bg-sky-500 hover:bg-sky-600 text-white border-b-2 border-sky-700 shadow-xs'
                    }`}
                >
                    {isSaved ? (
                        <>
                            <Check className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Đã lưu</span>
                        </>
                    ) : (
                        <>
                            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                            <span className="hidden sm:inline">Lưu</span>
                        </>
                    )}
                </button>
            </div>
        </div>
    );
};

/**
 * KanjiResultCard - Displays Kanji character box with Sino-Vietnamese, meanings, Onyomi/Kunyomi, SRS heart & popup detail
 */
export const KanjiResultCard = ({
    kanji,
    isBookmarked = false,
    onToggleBookmark,
    onSelectKanji
}) => {
    const char = kanji.literal || kanji.character || '';
    const sinoViet = (kanji.sinoViet || '').toUpperCase();
    const meaningVi = kanji.meaningVi || (Array.isArray(kanji.meanings) ? kanji.meanings.join(', ') : kanji.meaning || '');
    const onyomiStr = Array.isArray(kanji.onyomi) ? kanji.onyomi.join('、') : (kanji.onyomi || '');
    const kunyomiStr = Array.isArray(kanji.kunyomi) ? kanji.kunyomi.join('、') : (kanji.kunyomi || '');
    const level = formatJlptLevel(kanji.level || kanji.jlpt);
    const strokeCount = kanji.stroke_count || kanji.strokeCount || null;

    return (
        <div
            onClick={() => onSelectKanji?.(kanji)}
            className="group relative flex items-center justify-between gap-3 p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-slate-850 hover:bg-amber-50/40 dark:hover:bg-slate-800/80 border border-slate-200 dark:border-slate-750 hover:border-amber-300 dark:hover:border-amber-600 transition-all duration-200 cursor-pointer shadow-xs"
        >
            <div className="flex items-center gap-3.5 min-w-0">
                {/* Big Kanji Badge Box */}
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-amber-500/10 dark:bg-amber-500/15 border-2 border-amber-400 dark:border-amber-600/60 flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform">
                    <span className="font-japanese font-black text-2xl sm:text-3xl text-amber-600 dark:text-amber-400 select-none">
                        {char}
                    </span>
                </div>

                {/* Details */}
                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                        {sinoViet && (
                            <span className="font-black text-sm sm:text-base text-slate-900 dark:text-white tracking-wide">
                                {sinoViet}
                            </span>
                        )}
                        {level && (
                            <span className={`text-[10px] font-black px-1.5 py-0.5 rounded border uppercase ${getBadgeClass(level)}`}>
                                {level}
                            </span>
                        )}
                        {strokeCount && (
                            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                                {strokeCount} nét
                            </span>
                        )}
                    </div>

                    <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 font-medium truncate mt-0.5">
                        {meaningVi || 'Ý nghĩa đang cập nhật'}
                    </p>

                    {/* Readings */}
                    {(onyomiStr || kunyomiStr) && (
                        <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-500 dark:text-slate-400 font-japanese truncate">
                            {onyomiStr && (
                                <span>
                                    <span className="text-slate-400 mr-1">On:</span>
                                    <span className="font-medium text-amber-600 dark:text-amber-400">{onyomiStr}</span>
                                </span>
                            )}
                            {kunyomiStr && (
                                <span>
                                    <span className="text-slate-400 mr-1">Kun:</span>
                                    <span className="font-medium text-teal-600 dark:text-teal-400">{kunyomiStr}</span>
                                </span>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-1.5 shrink-0">
                {/* Heart Bookmark Button */}
                <button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation();
                        onToggleBookmark(kanji);
                    }}
                    title={isBookmarked ? "Đã lưu trong SRS ôn tập" : "Lưu vào SRS ôn tập"}
                    className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all cursor-pointer active:scale-95 ${
                        isBookmarked
                            ? 'text-rose-500 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800'
                            : 'text-slate-400 hover:text-rose-500 hover:bg-rose-50/60 dark:hover:bg-slate-750'
                    }`}
                >
                    <Heart className={`w-4 h-4 ${isBookmarked ? 'fill-rose-500 text-rose-500' : ''}`} />
                </button>

                {/* View Details Navigation Button */}
                <button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation();
                        onSelectKanji?.(kanji);
                    }}
                    title="Xem chi tiết nét vẽ & từ ghép"
                    className="h-9 px-2.5 sm:px-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center gap-1 text-xs font-bold transition-all cursor-pointer active:scale-95"
                >
                    <span className="hidden sm:inline">Chi tiết</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                </button>
            </div>
        </div>
    );
};

/**
 * GrammarResultCard - Displays Grammar pattern title, JLPT tag, meaning, structure, SRS heart & popup detail
 */
export const GrammarResultCard = ({
    point,
    isBookmarked = false,
    onToggleBookmark,
    onSelectGrammar
}) => {
    const pattern = point.pattern || point.title || '';
    const meaning = point.meaningShort || point.meaning || point.meaningVi || '';
    const structure = formatGrammarStructure(point.structureRaw || point.structure || point.connection);
    const level = formatJlptLevel(point.level);

    return (
        <div
            onClick={() => onSelectGrammar?.(point)}
            className="group relative flex items-start justify-between gap-3 p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-slate-850 hover:bg-emerald-50/40 dark:hover:bg-slate-800/80 border border-slate-200 dark:border-slate-750 hover:border-emerald-300 dark:hover:border-emerald-600 transition-all duration-200 cursor-pointer shadow-xs"
        >
            <div className="flex-1 min-w-0 pr-1">
                <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-japanese font-black text-base sm:text-lg text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                        {pattern}
                    </span>
                    {level && (
                        <span className={`text-[10px] font-black px-1.5 py-0.5 rounded border uppercase ${getBadgeClass(level)}`}>
                            {level}
                        </span>
                    )}
                </div>

                <p className="mt-1 text-xs sm:text-sm text-slate-600 dark:text-slate-300 font-medium line-clamp-2 leading-relaxed">
                    {meaning || 'Ý nghĩa đang cập nhật'}
                </p>

                {structure && (
                    <div className="mt-1.5 inline-block text-[11px] font-mono text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/80 dark:border-emerald-800/60 px-2 py-0.5 rounded-md truncate max-w-full">
                        {structure}
                    </div>
                )}
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-1.5 shrink-0 self-center">
                {/* Heart Bookmark Button */}
                <button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation();
                        onToggleBookmark(point);
                    }}
                    title={isBookmarked ? "Đã lưu trong SRS ôn tập" : "Lưu vào SRS ôn tập"}
                    className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all cursor-pointer active:scale-95 ${
                        isBookmarked
                            ? 'text-rose-500 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800'
                            : 'text-slate-400 hover:text-rose-500 hover:bg-rose-50/60 dark:hover:bg-slate-750'
                    }`}
                >
                    <Heart className={`w-4 h-4 ${isBookmarked ? 'fill-rose-500 text-rose-500' : ''}`} />
                </button>

                {/* View Details Navigation Button */}
                <button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation();
                        onSelectGrammar?.(point);
                    }}
                    title="Xem chi tiết cách dùng & ví dụ"
                    className="h-9 px-2.5 sm:px-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center gap-1 text-xs font-bold transition-all cursor-pointer active:scale-95"
                >
                    <span className="hidden sm:inline">Chi tiết</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                </button>
            </div>
        </div>
    );
};
