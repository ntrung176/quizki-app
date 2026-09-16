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
        <div className={`min-h-screen bg-slate-50/50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 p-4 sm:p-6 md:p-8 max-w-7xl mx-auto space-y-6 sm:space-y-8 ${fadeWholePage ? 'animate-fade-in' : ''}`}>
            {/* HERO BANNER */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-700 via-indigo-600 to-sky-600 text-white p-6 sm:p-8 shadow-2xl shadow-indigo-600/20">
                {/* Decorative Japanese Watermark in background */}
                <div className="absolute -right-8 -bottom-10 text-9xl font-black text-white/5 font-japanese select-none pointer-events-none">
                    あア
                </div>

                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="space-y-2 max-w-2xl">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-xs font-bold tracking-wide uppercase">
                            <span className="font-japanese font-black">あ</span>
                            <span>Nhập môn Tiếng Nhật • Japanese Kana Studio</span>
                        </div>
                        <h1 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight text-white">
                            Bảng Chữ Cái Hiragana & Katakana
                        </h1>
                        <p className="text-xs sm:text-sm text-indigo-100 leading-relaxed font-medium">
                            Chinh phục trọn bộ 46 âm cơ bản, âm đục, âm ghép cùng công cụ hướng dẫn nét vẽ và chế độ mini-game luyện phản xạ siêu tốc.
                        </p>
                    </div>

                    {/* Quick CTA Actions */}
                    <div className="flex flex-wrap items-center gap-3">
                        <button
                            type="button"
                            onClick={() => setIsQuizModalOpen(true)}
                            className="px-5 py-3.5 rounded-2xl bg-white text-indigo-900 hover:bg-indigo-50 font-black text-xs sm:text-sm shadow-xl hover:shadow-2xl transition-all hover:-translate-y-0.5 active:translate-y-0 flex items-center gap-2 cursor-pointer"
                        >
                            <Zap className="w-4 h-4 fill-amber-500 text-amber-500" />
                            <span>Luyện phản xạ (Game)</span>
                        </button>
                    </div>
                </div>

                {/* Progress Metric Bar */}
                <div className="relative z-10 mt-6 pt-5 border-t border-white/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center font-bold text-white shrink-0">
                            <Trophy className="w-4 h-4 text-white" />
                        </div>
                        <div>
                            <span className="text-xs font-bold block text-white">
                                Tiến độ thuần thục {activeSyllabary === 'hiragana' ? 'Hiragana' : 'Katakana'} ({activeCategory === 'main' ? '50 âm cơ bản' : activeCategory === 'dakuon' ? 'Âm đục' : 'Âm ghép'}):
                            </span>
                            <span className="text-xs text-indigo-100">
                                Đã thuộc <strong className="text-white font-black">{stats.mastered}</strong> / {stats.total} ký tự ({stats.percentage}%)
                            </span>
                        </div>
                    </div>

                    {/* Progress Bar Container */}
                    <div className="w-full sm:w-64 bg-black/25 rounded-full h-3 overflow-hidden p-0.5 border border-white/20 shrink-0">
                        <div
                            className="bg-gradient-to-r from-emerald-400 to-teal-300 h-full rounded-full transition-all duration-500 shadow-sm"
                            style={{ width: `${stats.percentage}%` }}
                        />
                    </div>
                </div>
            </div>

            {/* SYLLABARY & CATEGORY SELECTOR TABS */}
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
                {/* Switcher: Hiragana vs Katakana */}
                <div className="flex items-center p-1.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-sm gap-1.5">
                    <button
                        type="button"
                        onClick={() => setActiveSyllabary('hiragana')}
                        className={`flex-1 sm:flex-initial px-5 py-2.5 rounded-xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
                            activeSyllabary === 'hiragana'
                                ? 'bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-md shadow-indigo-500/25'
                                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                    >
                        <span>Hiragana (Chữ mềm)</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveSyllabary('katakana')}
                        className={`flex-1 sm:flex-initial px-5 py-2.5 rounded-xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
                            activeSyllabary === 'katakana'
                                ? 'bg-gradient-to-r from-sky-600 to-cyan-500 text-white shadow-md shadow-sky-500/25'
                                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                    >
                        <span>Katakana (Chữ cứng)</span>
                    </button>
                </div>

                {/* Sub-Category Filter: 50 Âm / Âm Đục / Âm Ghép */}
                <div className="flex items-center p-1 rounded-2xl bg-slate-100 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 gap-1 overflow-x-auto">
                    <button
                        type="button"
                        onClick={() => setActiveCategory('main')}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                            activeCategory === 'main'
                                ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-xs'
                                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                        }`}
                    >
                        50 Âm Cơ Bản (Gojūon)
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveCategory('dakuon')}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                            activeCategory === 'dakuon'
                                ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-xs'
                                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                        }`}
                    >
                        Âm Đục & Bán Đục (濁音)
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveCategory('yoon')}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                            activeCategory === 'yoon'
                                ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-xs'
                                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                        }`}
                    >
                        Âm Ghép (拗音)
                    </button>
                </div>
            </div>

            {/* SEARCH & QUICK INSTRUCTION BAR */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
                <div className="relative w-full sm:w-72">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Tìm theo romaji (VD: ka, shi, a)..."
                        className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium focus:outline-indigo-500 text-slate-800 dark:text-slate-100"
                    />
                </div>

                <div className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400 self-start sm:self-auto">
                    <Lightbulb className="w-4 h-4 text-amber-500" />
                    <span>Bấm vào thẻ chữ để <strong>tập viết nét</strong> và xem <strong>mẹo nhớ</strong></span>
                </div>
            </div>

            {/* MATRIX GRID / ROW RENDERING */}
            {activeCategory !== 'yoon' && !searchQuery.trim() ? (
                /* 50-SOUND MATRIX DISPLAY (Row by Row) */
                <div className="space-y-4">
                    {rowsConfig.map(row => (
                        <div
                            key={row.id}
                            className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800/90 p-4 sm:p-5 shadow-xs space-y-3"
                        >
                            {/* Row Title & Audio Row Button */}
                            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
                                <span className="font-bold text-xs sm:text-sm text-slate-800 dark:text-slate-200">
                                    {row.name}
                                </span>
                                <button
                                    type="button"
                                    onClick={(e) => handlePlayRow(row.vowels, e)}
                                    className="px-3 py-1 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
                                    title="Nghe phát âm cả hàng"
                                >
                                    <Volume2 className="w-3.5 h-3.5" />
                                    <span>Nghe cả hàng</span>
                                </button>
                            </div>

                            {/* 5 Vowels Grid for this Row */}
                            <div className="grid grid-cols-5 gap-2.5 sm:gap-3.5">
                                {row.vowels.map((vowelKey, vIdx) => {
                                    if (!vowelKey) {
                                        return (
                                            <div
                                                key={`empty-${vIdx}`}
                                                className="h-24 sm:h-28 rounded-2xl bg-slate-50/40 dark:bg-slate-950/30 border border-dashed border-slate-200 dark:border-slate-800/40 flex items-center justify-center opacity-30"
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
                                            className={`relative h-28 sm:h-32 rounded-2xl border-2 flex flex-col items-center justify-center p-2.5 transition-all duration-200 cursor-pointer select-none group hover:shadow-lg hover:-translate-y-1 ${
                                                isMastered
                                                    ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-400/60 dark:border-emerald-500/40 shadow-xs'
                                                    : 'bg-white dark:bg-slate-800/80 border-slate-200/90 dark:border-slate-700/80 hover:border-indigo-400 dark:hover:border-indigo-500'
                                            }`}
                                        >
                                            {/* Top Corner Mastery Toggle & Audio Trigger */}
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    toggleMastery(vowelKey);
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
                                                className="absolute top-2.5 right-2.5 w-6 h-6 rounded-lg bg-slate-100 dark:bg-slate-700/80 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 flex items-center justify-center transition cursor-pointer z-10"
                                                title="Nghe âm"
                                            >
                                                <Volume2 className="w-3.5 h-3.5" />
                                            </button>

                                            {/* Centered Character & Romaji */}
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
                        </div>
                    ))}
                </div>
            ) : (
                /* YOON & SEARCH GRID (Card list format) */
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
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
                                        : 'bg-white dark:bg-slate-800/80 border-slate-200/90 dark:border-slate-700/80 hover:border-indigo-400 dark:hover:border-indigo-500'
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
                                    className="absolute top-2.5 right-2.5 w-6 h-6 rounded-lg bg-slate-100 dark:bg-slate-700/80 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 flex items-center justify-center transition cursor-pointer z-10"
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
