import React, { useState, useEffect, useMemo } from 'react';
import { 
    Volume2, CheckCircle2, Play, BookOpen, PenTool, 
    RotateCcw, Trophy, ArrowRight, Zap, Lightbulb, Eye, Filter
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
        <div className={`space-y-3 sm:space-y-4 md:space-y-5 w-full min-w-0 font-sans ${fadeWholePage ? 'animate-fade-in' : ''}`}>
            {/* HERO BANNER - Compact Duolingo Style Cockpit */}
            <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900 border-2 border-b-4 border-slate-200 dark:border-slate-800 p-3 sm:p-4 shadow-xs w-full max-w-full min-w-0">
                <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 w-full min-w-0">
                    <div className="space-y-1.5 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/80 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-[11px] font-black uppercase tracking-wide">
                                <span className="font-japanese font-black">あ</span>
                                <span>Bảng Chữ Cái Kana</span>
                            </div>
                            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                Đã thuộc <strong className="text-emerald-600 dark:text-emerald-400 font-black">{stats.mastered}</strong> / {stats.total} ({stats.percentage}%)
                            </span>
                        </div>
                        {/* Progress Bar Container */}
                        <div className="w-full sm:w-60 bg-slate-100 dark:bg-slate-800 rounded-full h-2.5 overflow-hidden border border-slate-200 dark:border-slate-700/60 shrink-0">
                            <div
                                className="bg-emerald-500 h-full rounded-full transition-all duration-500 shadow-xs"
                                style={{ width: `${stats.percentage}%` }}
                            />
                        </div>
                    </div>

                    {/* Quick CTA Actions */}
                    <div className="flex items-center gap-2 shrink-0">
                        <button
                            type="button"
                            onClick={() => setIsQuizModalOpen(true)}
                            className="w-full sm:w-auto px-4 py-2 sm:px-5 sm:py-2.5 rounded-xl sm:rounded-2xl bg-emerald-500 hover:bg-emerald-400 active:translate-y-0.5 active:border-b-0 border-b-4 border-emerald-700 text-white font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer select-none shadow-xs"
                        >
                            <Zap className="w-4 h-4 fill-current" />
                            <span>Luyện phản xạ</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* SYLLABARY & CATEGORY SELECTOR TABS + HINT */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 w-full max-w-full min-w-0">
                <div className="flex items-center gap-2 flex-wrap min-w-0">
                    {/* Switcher: Hiragana vs Katakana */}
                    <div className="grid grid-cols-2 p-1 rounded-xl sm:rounded-2xl bg-white dark:bg-slate-900 border-2 border-b-4 border-slate-200 dark:border-slate-800 shadow-xs gap-1">
                        <button
                            type="button"
                            onClick={() => setActiveSyllabary('hiragana')}
                            className={`px-3 py-1.5 rounded-lg sm:rounded-xl font-black text-xs sm:text-sm flex items-center justify-center gap-1 transition-all cursor-pointer min-w-0 ${
                                activeSyllabary === 'hiragana'
                                    ? 'bg-emerald-500 text-white border-b-2 border-emerald-700 shadow-xs'
                                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                            }`}
                        >
                            <span>Hiragana</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveSyllabary('katakana')}
                            className={`px-3 py-1.5 rounded-lg sm:rounded-xl font-black text-xs sm:text-sm flex items-center justify-center gap-1 transition-all cursor-pointer min-w-0 ${
                                activeSyllabary === 'katakana'
                                    ? 'bg-emerald-500 text-white border-b-2 border-emerald-700 shadow-xs'
                                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                            }`}
                        >
                            <span>Katakana</span>
                        </button>
                    </div>

                    {/* Sub-Category Filter: 50 Âm / Âm Đục / Âm Ghép */}
                    <div className="inline-flex items-center p-1 rounded-xl sm:rounded-2xl bg-white dark:bg-slate-900 border-2 border-b-4 border-slate-200 dark:border-slate-800 gap-1 shadow-xs overflow-x-auto no-scrollbar">
                        <button
                            type="button"
                            onClick={() => setActiveCategory('main')}
                            className={`px-2.5 sm:px-3 py-1.5 rounded-lg sm:rounded-xl text-xs font-black transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                                activeCategory === 'main'
                                    ? 'bg-emerald-500 text-white border-b-2 border-emerald-700 shadow-xs'
                                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                            }`}
                        >
                            50 Âm cơ bản
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveCategory('dakuon')}
                            className={`px-2.5 sm:px-3 py-1.5 rounded-lg sm:rounded-xl text-xs font-black transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                                activeCategory === 'dakuon'
                                    ? 'bg-emerald-500 text-white border-b-2 border-emerald-700 shadow-xs'
                                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                            }`}
                        >
                            Âm đục
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveCategory('yoon')}
                            className={`px-2.5 sm:px-3 py-1.5 rounded-lg sm:rounded-xl text-xs font-black transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                                activeCategory === 'yoon'
                                    ? 'bg-emerald-500 text-white border-b-2 border-emerald-700 shadow-xs'
                                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                            }`}
                        >
                            Âm ghép
                        </button>
                    </div>
                </div>

                {/* Quick Hint */}
                <div className="flex items-center gap-1.5 text-[11px] sm:text-xs font-medium text-slate-500 dark:text-slate-400 shrink-0">
                    <Lightbulb className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    <span>Bấm thẻ để <strong>tập viết</strong> & xem <strong>mẹo nhớ</strong></span>
                </div>
            </div>

            {/* MATRIX GRID / ROW RENDERING */}
            {activeCategory !== 'yoon' ? (
                /* 50-SOUND MATRIX DISPLAY (Row by Row) */
                <div className="space-y-2 sm:space-y-3 w-full max-w-full min-w-0">
                    {rowsConfig.map(row => (
                        <div
                            key={row.id}
                            className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800/90 p-2 sm:p-2.5 md:p-3 shadow-xs space-y-1.5 sm:space-y-2 w-full max-w-full min-w-0 overflow-hidden"
                        >
                            {/* Row Title & Audio Row Button */}
                            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-1 sm:pb-1.5 gap-2 min-w-0">
                                <span className="font-bold text-xs sm:text-sm text-slate-800 dark:text-slate-200 truncate min-w-0">
                                    {row.name}
                                </span>
                                <button
                                    type="button"
                                    onClick={(e) => handlePlayRow(row.vowels, e)}
                                    className="px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 font-bold text-[10px] sm:text-[11px] flex items-center gap-1 sm:gap-1.5 transition-all cursor-pointer shrink-0"
                                    title="Nghe phát âm cả hàng"
                                >
                                    <Volume2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                                    <span>Nghe cả hàng</span>
                                </button>
                            </div>

                            {/* 5 Vowels Grid for this Row */}
                            <div className="grid grid-cols-5 gap-1 sm:gap-2 md:gap-2.5 w-full max-w-full min-w-0">
                                {row.vowels.map((vowelKey, vIdx) => {
                                    if (!vowelKey) {
                                        return (
                                            <div
                                                key={`empty-${vIdx}`}
                                                className="h-14 xs:h-15 sm:h-16 md:h-[72px] rounded-xl sm:rounded-2xl bg-slate-50/40 dark:bg-slate-950/30 border border-dashed border-slate-200 dark:border-slate-800/40 flex items-center justify-center opacity-30 min-w-0 w-full"
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
                                            className={`relative h-14 xs:h-15 sm:h-16 md:h-[72px] rounded-xl sm:rounded-2xl border sm:border-2 flex flex-col items-center justify-center p-0.5 sm:p-1.5 transition-all duration-200 cursor-pointer select-none group hover:shadow-md hover:-translate-y-0.5 min-w-0 w-full overflow-hidden ${
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
                                                className="absolute top-0.5 left-0.5 sm:top-1 sm:left-1 p-0.5 transition cursor-pointer z-10"
                                                title={isMastered ? 'Đã thuộc' : 'Đánh dấu đã thuộc'}
                                            >
                                                {isMastered ? (
                                                    <CheckCircle2 className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-emerald-500 fill-emerald-500/20" />
                                                ) : (
                                                    <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full border border-slate-300 dark:border-slate-600 hover:border-emerald-500 transition" />
                                                )}
                                            </button>

                                            {/* Top Corner Audio Trigger */}
                                            <button
                                                type="button"
                                                onClick={(e) => handlePlayAudio(char, e)}
                                                className="absolute top-0.5 right-0.5 sm:top-1 sm:right-1 w-4 h-4 sm:w-5 sm:h-5 rounded-md bg-slate-100 dark:bg-slate-700/80 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 flex items-center justify-center transition cursor-pointer z-10"
                                                title="Nghe âm"
                                            >
                                                <Volume2 className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                                            </button>

                                            {/* Centered Character & Romaji */}
                                            <div className="flex-1 w-full flex flex-col items-center justify-center pt-1 text-center min-w-0">
                                                <span className={`font-black font-japanese text-slate-900 dark:text-white group-hover:scale-105 transition-transform leading-none flex items-center justify-center ${
                                                    char.length > 1 ? 'text-sm sm:text-base md:text-xl tracking-tight' : 'text-base xs:text-lg sm:text-xl md:text-2xl'
                                                }`}>
                                                    {char}
                                                </span>

                                                <span className="text-[8px] xs:text-[9px] sm:text-[10px] font-mono font-bold text-slate-400 dark:text-slate-500 mt-0.5 truncate max-w-full">
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
                /* YOON GRID (Card list format) */
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2 sm:gap-2.5 md:gap-3">
                    {currentKanaList.map(item => {
                        const isMastered = masteredList.includes(`${activeSyllabary}_${item.id}`);
                        const char = item.char;

                        return (
                            <div
                                key={item.id}
                                onClick={() => handleOpenDetail(item.id)}
                                className={`relative h-16 sm:h-18 md:h-20 rounded-xl sm:rounded-2xl border-2 flex flex-col items-center justify-center p-1.5 transition-all duration-200 cursor-pointer select-none group hover:shadow-md hover:-translate-y-0.5 ${
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
                                    className="absolute top-1 left-1 p-0.5 transition cursor-pointer z-10"
                                    title={isMastered ? 'Đã thuộc' : 'Đánh dấu đã thuộc'}
                                >
                                    {isMastered ? (
                                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 fill-emerald-500/20" />
                                    ) : (
                                        <div className="w-3 h-3 rounded-full border border-slate-300 dark:border-slate-600 hover:border-emerald-500 transition" />
                                    )}
                                </button>

                                <button
                                    type="button"
                                    onClick={(e) => handlePlayAudio(char, e)}
                                    className="absolute top-1 right-1 w-5 h-5 rounded-md bg-slate-100 dark:bg-slate-700/80 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 flex items-center justify-center transition cursor-pointer z-10"
                                    title="Nghe âm"
                                >
                                    <Volume2 className="w-3 h-3" />
                                </button>

                                <div className="flex-1 w-full flex flex-col items-center justify-center pt-1 text-center">
                                    <span className={`font-black font-japanese text-slate-900 dark:text-white group-hover:scale-105 transition-transform leading-none flex items-center justify-center ${
                                        char.length > 1 ? 'text-lg sm:text-xl md:text-2xl tracking-tight' : 'text-xl sm:text-2xl'
                                    }`}>
                                        {char}
                                    </span>

                                    <span className="text-[9px] sm:text-[10px] font-mono font-bold text-slate-400 dark:text-slate-500 mt-1">
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
                masteredList={masteredList}
                awardXP={awardXP}
            />
        </div>
    );
};

export default KanaScreen;
