import React, { useState, useEffect, useMemo } from 'react';
import { 
    Volume2, CheckCircle2, Play, BookOpen, PenTool, 
    RotateCcw, Trophy, ArrowRight, Zap, Lightbulb, Search, Eye, Filter
} from 'lucide-react';
import { speakJapanese } from '../../utils/audio';
import { 
    KANA_ROWS, DAKUON_ROWS, YOON_GROUPS, KANA_DICTIONARY, getKanaList 
} from '../../data/kanaData';
import KanaCardModal from '../kana/KanaCardModal';
import KanaQuizModal from '../kana/KanaQuizModal';
import useMenuTransition from '../../hooks/useMenuTransition';

const KanaScreen = ({ awardXP }) => {
    const fadeWholePage = useMenuTransition();

    const [activeSyllabary, setActiveSyllabary] = useState('hiragana'); // 'hiragana' | 'katakana'
    const [activeCategory, setActiveCategory] = useState('main'); // 'main' | 'dakuon' | 'yoon'
    const [selectedKanaId, setSelectedKanaId] = useState(null);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [isQuizModalOpen, setIsQuizModalOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    // Mastered Kana list stored in localStorage
    const [masteredList, setMasteredList] = useState(() => {
        try {
            return JSON.parse(localStorage.getItem('quizki_kana_mastered_list') || '[]');
        } catch (_) {
            return [];
        }
    });

    useEffect(() => {
        try {
            localStorage.setItem('quizki_kana_mastered_list', JSON.stringify(masteredList));
        } catch (_) {}
    }, [masteredList]);

    const toggleMastery = (kanaKey) => {
        const fullKey = `${activeSyllabary}_${kanaKey}`;
        setMasteredList(prev => {
            if (prev.includes(fullKey)) {
                return prev.filter(k => k !== fullKey);
            } else {
                return [...prev, fullKey];
            }
        });
    };

    // Calculate all characters for current category
    const currentKanaList = useMemo(() => {
        return getKanaList(activeSyllabary, activeCategory);
    }, [activeSyllabary, activeCategory]);

    // Filtered by search if any
    const filteredKanaList = useMemo(() => {
        if (!searchQuery.trim()) return currentKanaList;
        const q = searchQuery.trim().toLowerCase();
        return currentKanaList.filter(item => 
            item.romaji.toLowerCase().includes(q) || 
            item.char.includes(q) || 
            (item.mnemonic && item.mnemonic.toLowerCase().includes(q))
        );
    }, [currentKanaList, searchQuery]);

    // Active rows structure based on category
    const rowsConfig = useMemo(() => {
        if (activeCategory === 'main') return KANA_ROWS;
        if (activeCategory === 'dakuon') return DAKUON_ROWS;
        return [];
    }, [activeCategory]);

    // Mastery statistics
    const stats = useMemo(() => {
        const total = currentKanaList.length;
        const mastered = currentKanaList.filter(item => 
            masteredList.includes(`${activeSyllabary}_${item.id}`)
        ).length;
        const percentage = total > 0 ? Math.round((mastered / total) * 100) : 0;
        return { total, mastered, percentage };
    }, [currentKanaList, masteredList, activeSyllabary]);

    const handleOpenDetail = (id) => {
        setSelectedKanaId(id);
        setIsDetailModalOpen(true);
    };

    const handlePlayAudio = (char, e) => {
        if (e) e.stopPropagation();
        speakJapanese(char);
    };

    const handlePlayRow = (vowels, e) => {
        if (e) e.stopPropagation();
        const chars = vowels
            .filter(v => v && KANA_DICTIONARY[v])
            .map(v => activeSyllabary === 'hiragana' ? KANA_DICTIONARY[v].hira : KANA_DICTIONARY[v].kata);

        let delay = 0;
        chars.forEach(c => {
            setTimeout(() => speakJapanese(c), delay);
            delay += 600;
        });
    };

    const selectedKanaItem = selectedKanaId ? KANA_DICTIONARY[selectedKanaId] : null;

    // Prev / Next Character navigation
    const handleNextChar = () => {
        const idx = currentKanaList.findIndex(k => k.id === selectedKanaId);
        if (idx !== -1 && idx + 1 < currentKanaList.length) {
            setSelectedKanaId(currentKanaList[idx + 1].id);
        }
    };

    const handlePrevChar = () => {
        const idx = currentKanaList.findIndex(k => k.id === selectedKanaId);
        if (idx > 0) {
            setSelectedKanaId(currentKanaList[idx - 1].id);
        }
    };

    return (
        <div className={`space-y-3.5 sm:space-y-6 md:space-y-8 w-full min-w-0 font-sans ${fadeWholePage ? 'animate-fade-in' : ''}`}>
            {/* HERO BANNER - Clean Duolingo Style Cockpit */}
            <div className="relative overflow-hidden rounded-3xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 p-5 sm:p-7 shadow-xs w-full max-w-full min-w-0">
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4 sm:gap-6 w-full min-w-0">
                    <div className="space-y-2 max-w-2xl min-w-0">
                        <div className="inline-flex max-w-full items-center gap-2 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold tracking-wide uppercase truncate">
                            <span className="font-japanese font-black shrink-0">あ</span>
                            <span className="truncate">Nhập môn Tiếng Nhật • Japanese Kana</span>
                        </div>
                        <h1 className="text-xl sm:text-2xl md:text-3xl font-black tracking-tight text-slate-900 dark:text-white leading-tight break-words max-w-full">
                            Bảng Chữ Cái Hiragana & Katakana
                        </h1>
                        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed font-medium line-clamp-2 sm:line-clamp-none">
                            Chinh phục trọn bộ 46 âm cơ bản, âm đục, âm ghép cùng chế độ luyện phản xạ siêu tốc.
                        </p>
                    </div>

                    {/* Quick CTA Actions */}
                    <div className="flex flex-wrap items-center gap-3 shrink-0 w-full sm:w-auto">
                        <button
                            type="button"
                            onClick={() => setIsQuizModalOpen(true)}
                            className="w-full sm:w-auto px-5 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 active:translate-y-0.5 active:border-b-0 border-b-4 border-emerald-700 text-white font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer select-none shadow-xs"
                        >
                            <Zap className="w-4 h-4 fill-current" />
                            <span>Luyện phản xạ</span>
                        </button>
                    </div>
                </div>

                {/* Progress Metric Bar */}
                <div className="relative z-10 mt-5 pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-4 w-full min-w-0">
                    <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200/80 dark:border-amber-800/80 flex items-center justify-center font-bold text-amber-600 shrink-0">
                            <Trophy className="w-4 h-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                Đã thuộc <strong className="text-slate-900 dark:text-white font-black">{stats.mastered}</strong> / {stats.total} ({stats.percentage}%)
                            </span>
                        </div>
                    </div>

                    {/* Progress Bar Container */}
                    <div className="w-full sm:w-56 bg-slate-200 dark:bg-slate-800 rounded-full h-3.5 overflow-hidden p-0.5 border border-slate-300/40 dark:border-slate-700/60 shrink-0">
                        <div
                            className="bg-emerald-500 h-full rounded-full transition-all duration-500 shadow-xs"
                            style={{ width: `${stats.percentage}%` }}
                        />
                    </div>
                </div>
            </div>

            {/* SYLLABARY & CATEGORY SELECTOR TABS */}
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5 sm:gap-4 w-full max-w-full min-w-0">
                {/* Switcher: Hiragana vs Katakana */}
                <div className="grid grid-cols-2 p-1.5 rounded-2xl bg-white dark:bg-slate-900 border-2 border-b-4 border-slate-200 dark:border-slate-800 shadow-xs gap-1.5 w-full md:w-auto min-w-0 max-w-full">
                    <button
                        type="button"
                        onClick={() => setActiveSyllabary('hiragana')}
                        className={`px-4 py-2 rounded-xl font-black text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-all cursor-pointer min-w-0 ${
                            activeSyllabary === 'hiragana'
                                ? 'bg-emerald-500 text-white border-b-2 border-emerald-700 shadow-xs'
                                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                        }`}
                    >
                        <span className="truncate">Hiragana <span className="hidden xs:inline text-[11px] font-normal opacity-80">(Chữ mềm)</span></span>
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveSyllabary('katakana')}
                        className={`px-4 py-2 rounded-xl font-black text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-all cursor-pointer min-w-0 ${
                            activeSyllabary === 'katakana'
                                ? 'bg-emerald-500 text-white border-b-2 border-emerald-700 shadow-xs'
                                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                        }`}
                    >
                        <span className="truncate">Katakana <span className="hidden xs:inline text-[11px] font-normal opacity-80">(Chữ cứng)</span></span>
                    </button>
                </div>

                {/* Sub-Category Filter: 50 Âm / Âm Đục / Âm Ghép */}
                <div className="w-full md:w-auto min-w-0 max-w-full overflow-x-auto no-scrollbar scroll-smooth">
                    <div className="inline-flex items-center p-1.5 rounded-2xl bg-white dark:bg-slate-900 border-2 border-b-4 border-slate-200 dark:border-slate-800 gap-1 w-max min-w-full sm:min-w-0 shadow-xs">
                        <button
                            type="button"
                            onClick={() => setActiveCategory('main')}
                            className={`flex-1 sm:flex-initial px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs font-black transition-all cursor-pointer whitespace-nowrap shrink-0 text-center ${
                                activeCategory === 'main'
                                    ? 'bg-emerald-500 text-white border-b-2 border-emerald-700 shadow-xs'
                                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                            }`}
                        >
                            50 Âm Cơ Bản (Gojūon)
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveCategory('dakuon')}
                            className={`flex-1 sm:flex-initial px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs font-black transition-all cursor-pointer whitespace-nowrap shrink-0 text-center ${
                                activeCategory === 'dakuon'
                                    ? 'bg-emerald-500 text-white border-b-2 border-emerald-700 shadow-xs'
                                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                            }`}
                        >
                            Âm Đục (濁音)
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveCategory('yoon')}
                            className={`flex-1 sm:flex-initial px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs font-black transition-all cursor-pointer whitespace-nowrap shrink-0 text-center ${
                                activeCategory === 'yoon'
                                    ? 'bg-emerald-500 text-white border-b-2 border-emerald-700 shadow-xs'
                                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                            }`}
                        >
                            Âm Ghép (拗音)
                        </button>
                    </div>
                </div>
            </div>

            {/* SEARCH & QUICK INSTRUCTION BAR */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5 sm:gap-3 bg-white dark:bg-slate-900 p-3 sm:p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs w-full max-w-full min-w-0">
                <div className="relative w-full sm:w-72 min-w-0">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Tìm theo romaji (VD: ka, shi, a)..."
                        className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium focus:outline-emerald-500 text-slate-800 dark:text-slate-100 min-w-0"
                    />
                </div>

                <div className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400 self-start sm:self-auto min-w-0 max-w-full">
                    <Lightbulb className="w-4 h-4 text-amber-500 shrink-0" />
                    <span className="text-[11px] sm:text-xs truncate">Bấm thẻ để <strong>tập viết</strong> & xem <strong>mẹo nhớ</strong></span>
                </div>
            </div>

            {/* MATRIX GRID / ROW RENDERING */}
            {activeCategory !== 'yoon' && !searchQuery.trim() ? (
                /* 50-SOUND MATRIX DISPLAY (Row by Row) */
                <div className="space-y-2.5 sm:space-y-4 w-full max-w-full min-w-0">
                    {rowsConfig.map(row => (
                        <div
                            key={row.id}
                            className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl border border-slate-200/90 dark:border-slate-800/90 p-2 sm:p-4 md:p-5 shadow-xs space-y-2 sm:space-y-3 w-full max-w-full min-w-0 overflow-hidden"
                        >
                            {/* Row Title & Audio Row Button */}
                            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-1.5 sm:pb-2 gap-2 min-w-0">
                                <span className="font-bold text-xs sm:text-sm text-slate-800 dark:text-slate-200 truncate min-w-0">
                                    {row.name}
                                </span>
                                <button
                                    type="button"
                                    onClick={(e) => handlePlayRow(row.vowels, e)}
                                    className="px-2 sm:px-3 py-1 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 font-bold text-[10px] sm:text-xs flex items-center gap-1 sm:gap-1.5 transition-all cursor-pointer shrink-0"
                                    title="Nghe phát âm cả hàng"
                                >
                                    <Volume2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                                    <span>Nghe cả hàng</span>
                                </button>
                            </div>

                            {/* 5 Vowels Grid for this Row */}
                            <div className="grid grid-cols-5 gap-1 sm:gap-2.5 md:gap-3.5 w-full max-w-full min-w-0">
                                {row.vowels.map((vowelKey, vIdx) => {
                                    if (!vowelKey) {
                                        return (
                                            <div
                                                key={`empty-${vIdx}`}
                                                className="h-16 xs:h-18 sm:h-24 md:h-32 rounded-xl sm:rounded-2xl bg-slate-50/40 dark:bg-slate-950/30 border border-dashed border-slate-200 dark:border-slate-800/40 flex items-center justify-center opacity-30 min-w-0 w-full"
                                            />
                                        );
                                    }

                                    const item = KANA_DICTIONARY[vowelKey];
                                    if (!item) return null;

                                    const char = activeSyllabary === 'hiragana' ? item.hira : item.kata;
                                    const isMastered = masteredList.includes(`${activeSyllabary}_${vowelKey}`);

                                    return (
                                        <div
                                            key={vowelKey}
                                            onClick={() => handleOpenDetail(vowelKey)}
                                            className={`relative h-16 xs:h-18 sm:h-24 md:h-32 rounded-xl sm:rounded-2xl border sm:border-2 flex flex-col items-center justify-center p-0.5 sm:p-2 transition-all duration-200 cursor-pointer select-none group hover:shadow-lg hover:-translate-y-0.5 min-w-0 w-full overflow-hidden ${
                                                isMastered
                                                    ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-400/60 dark:border-emerald-500/40 shadow-xs'
                                                    : 'bg-white dark:bg-slate-800/80 border-slate-200/90 dark:border-slate-700/80 hover:border-emerald-400 dark:hover:border-emerald-500'
                                            }`}
                                        >
                                            {/* Top Corner Mastery Toggle */}
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    toggleMastery(vowelKey);
                                                }}
                                                className="absolute top-0.5 left-0.5 sm:top-2 sm:left-2 p-0.5 sm:p-1 transition cursor-pointer z-10"
                                                title={isMastered ? 'Đã thuộc' : 'Đánh dấu đã thuộc'}
                                            >
                                                {isMastered ? (
                                                    <CheckCircle2 className="w-3 h-3 sm:w-4 sm:h-4 text-emerald-500 fill-emerald-500/20" />
                                                ) : (
                                                    <div className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 rounded-full border border-slate-300 dark:border-slate-600 hover:border-emerald-500 transition" />
                                                )}
                                            </button>

                                            {/* Top Corner Audio Trigger */}
                                            <button
                                                type="button"
                                                onClick={(e) => handlePlayAudio(char, e)}
                                                className="absolute top-0.5 right-0.5 sm:top-2 sm:right-2 w-4 h-4 sm:w-6 sm:h-6 rounded-md sm:rounded-lg bg-slate-100 dark:bg-slate-700/80 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 flex items-center justify-center transition cursor-pointer z-10"
                                                title="Nghe âm"
                                            >
                                                <Volume2 className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5" />
                                            </button>

                                            {/* Centered Character & Romaji */}
                                            <div className="flex-1 w-full flex flex-col items-center justify-center pt-2 sm:pt-2 text-center min-w-0">
                                                <span className={`font-black font-japanese text-slate-900 dark:text-white group-hover:scale-110 transition-transform leading-none flex items-center justify-center ${
                                                    char.length > 1 ? 'text-xs xs:text-sm sm:text-xl md:text-3xl tracking-tight' : 'text-base xs:text-lg sm:text-2xl md:text-4xl'
                                                }`}>
                                                    {char}
                                                </span>

                                                <span className="text-[8px] xs:text-[9px] sm:text-xs font-mono font-bold text-slate-500 dark:text-slate-400 mt-0.5 sm:mt-1 truncate max-w-full">
                                                    /{item.romaji}/
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                /* YOON & SEARCH GRID (Card list format) */
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5 sm:gap-3.5 md:gap-4">
                    {filteredKanaList.map(item => {
                        const isMastered = masteredList.includes(`${activeSyllabary}_${item.id}`);
                        const char = item.char;

                        return (
                            <div
                                key={item.id}
                                onClick={() => handleOpenDetail(item.id)}
                                className={`relative h-28 sm:h-32 rounded-2xl border-2 flex flex-col items-center justify-center p-2.5 transition-all duration-200 cursor-pointer select-none group hover:shadow-lg hover:-translate-y-1 ${
                                    isMastered
                                        ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-400/60 dark:border-emerald-500/40'
                                        : 'bg-white dark:bg-slate-800/80 border-slate-200/90 dark:border-slate-700/80 hover:border-emerald-400 dark:hover:border-emerald-500'
                                }`}
                            >
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        toggleMastery(item.id);
                                    }}
                                    className="absolute top-2.5 left-2.5 p-1 transition cursor-pointer z-10"
                                    title={isMastered ? 'Đã thuộc' : 'Đánh dấu đã thuộc'}
                                >
                                    {isMastered ? (
                                        <CheckCircle2 className="w-4 h-4 text-emerald-500 fill-emerald-500/20" />
                                    ) : (
                                        <div className="w-3.5 h-3.5 rounded-full border-2 border-slate-300 dark:border-slate-600 hover:border-emerald-500 transition" />
                                    )}
                                </button>

                                <button
                                    type="button"
                                    onClick={(e) => handlePlayAudio(char, e)}
                                    className="absolute top-2.5 right-2.5 w-6 h-6 rounded-lg bg-slate-100 dark:bg-slate-700/80 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 flex items-center justify-center transition cursor-pointer z-10"
                                    title="Nghe âm"
                                >
                                    <Volume2 className="w-3.5 h-3.5" />
                                </button>

                                <div className="flex-1 w-full flex flex-col items-center justify-center pt-2 text-center">
                                    <span className={`font-black font-japanese text-slate-900 dark:text-white group-hover:scale-110 transition-transform leading-none flex items-center justify-center ${
                                        char.length > 1 ? 'text-2xl sm:text-3xl tracking-tight' : 'text-3xl sm:text-4xl'
                                    }`}>
                                        {char}
                                    </span>

                                    <span className="text-xs font-mono font-bold text-slate-500 dark:text-slate-400 mt-2">
                                        /{item.romaji}/
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* CHARACTER DETAIL & WRITING MODAL */}
            {selectedKanaItem && (
                <KanaCardModal
                    isOpen={isDetailModalOpen}
                    item={selectedKanaItem}
                    type={activeSyllabary}
                    onClose={() => setIsDetailModalOpen(false)}
                    onNext={handleNextChar}
                    onPrev={handlePrevChar}
                    isMastered={masteredList.includes(`${activeSyllabary}_${selectedKanaId}`)}
                    onToggleMastery={() => toggleMastery(selectedKanaId)}
                />
            )}

            {/* MINI-GAME QUIZ MODAL */}
            <KanaQuizModal
                isOpen={isQuizModalOpen}
                onClose={() => setIsQuizModalOpen(false)}
                targetType={activeSyllabary}
                kanaList={currentKanaList}
                awardXP={awardXP}
            />
        </div>
    );
};

export default KanaScreen;
