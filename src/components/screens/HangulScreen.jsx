import React, { useState, useEffect, useMemo } from 'react';
import { 
    Volume2, CheckCircle2, Play, BookOpen, PenTool, 
    RotateCcw, Trophy, ArrowRight, Zap, Lightbulb, Search, Eye, Filter
} from 'lucide-react';
import { speakKorean } from '../../utils/audio';
import { 
    HANGUL_CATEGORIES, HANGUL_DICTIONARY, getHangulList 
} from '../../data/hangulData';
import HangulCardModal from '../hangul/HangulCardModal';
import HangulQuizModal from '../hangul/HangulQuizModal';
import useMenuTransition from '../../hooks/useMenuTransition';

const HangulScreen = ({ awardXP }) => {
    const fadeWholePage = useMenuTransition();

    const [activeCategory, setActiveCategory] = useState('basic_consonants');
    const [selectedHangulId, setSelectedHangulId] = useState(null);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [isQuizModalOpen, setIsQuizModalOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    // Mastered Hangul list stored in localStorage
    const [masteredList, setMasteredList] = useState(() => {
        try {
            return JSON.parse(localStorage.getItem('quizki_hangul_mastered_list') || '[]');
        } catch (_) {
            return [];
        }
    });

    useEffect(() => {
        try {
            localStorage.setItem('quizki_hangul_mastered_list', JSON.stringify(masteredList));
        } catch (_) {}
    }, [masteredList]);

    const toggleMastery = (hangulKey) => {
        setMasteredList(prev => {
            if (prev.includes(hangulKey)) {
                return prev.filter(k => k !== hangulKey);
            } else {
                return [...prev, hangulKey];
            }
        });
    };

    // Calculate all characters for current category
    const currentHangulList = useMemo(() => {
        return getHangulList(activeCategory);
    }, [activeCategory]);

    // Filtered by search if any
    const filteredHangulList = useMemo(() => {
        if (!searchQuery.trim()) return currentHangulList;
        const q = searchQuery.trim().toLowerCase();
        const allList = Object.values(HANGUL_DICTIONARY);
        return allList.filter(item => 
            item.romaji.toLowerCase().includes(q) || 
            item.char.includes(q) || 
            item.name.toLowerCase().includes(q) ||
            (item.mnemonic && item.mnemonic.toLowerCase().includes(q))
        );
    }, [currentHangulList, searchQuery]);

    // Mastery statistics
    const stats = useMemo(() => {
        const total = currentHangulList.length;
        const mastered = currentHangulList.filter(item => 
            masteredList.includes(item.id)
        ).length;
        const percentage = total > 0 ? Math.round((mastered / total) * 100) : 0;
        return { total, mastered, percentage };
    }, [currentHangulList, masteredList]);

    const handleOpenDetail = (id) => {
        setSelectedHangulId(id);
        setIsDetailModalOpen(true);
    };

    const handlePlayAudio = (char, e) => {
        if (e) e.stopPropagation();
        speakKorean(char);
    };

    const selectedHangulItem = selectedHangulId ? HANGUL_DICTIONARY[selectedHangulId] : null;

    // Prev / Next navigation
    const handleNextChar = () => {
        const idx = currentHangulList.findIndex(k => k.id === selectedHangulId);
        if (idx !== -1 && idx + 1 < currentHangulList.length) {
            setSelectedHangulId(currentHangulList[idx + 1].id);
        }
    };

    const handlePrevChar = () => {
        const idx = currentHangulList.findIndex(k => k.id === selectedHangulId);
        if (idx > 0) {
            setSelectedHangulId(currentHangulList[idx - 1].id);
        }
    };

    const currentCategoryName = HANGUL_CATEGORIES.find(c => c.id === activeCategory)?.name || 'Bảng chữ cái';

    return (
        <div className={`min-h-screen bg-slate-50/50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 p-4 sm:p-6 md:p-8 max-w-7xl mx-auto space-y-6 sm:space-y-8 ${fadeWholePage ? 'animate-fade-in' : ''}`}>
            {/* HERO BANNER */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-cyan-700 via-sky-600 to-blue-700 text-white p-6 sm:p-8 shadow-2xl shadow-cyan-600/20">
                {/* Decorative Korean Watermark in background */}
                <div className="absolute -right-8 -bottom-10 text-9xl font-black text-white/5 font-sans select-none pointer-events-none">
                    한글
                </div>

                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="space-y-2 max-w-2xl">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-xs font-bold tracking-wide uppercase">
                            <span className="font-sans font-black">가</span>
                            <span>Nhập môn Tiếng Hàn • Korean Hangul Studio</span>
                        </div>
                        <h1 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight text-white">
                            Bảng Chữ Cái Tiếng Hàn (Hangul)
                        </h1>
                        <p className="text-xs sm:text-sm text-sky-100 leading-relaxed font-medium">
                            Chinh phục trọn bộ 14 phụ âm cơ bản, 5 phụ âm căng, 21 nguyên âm và 7 nhóm quy tắc biến âm Batchim cùng mini-game luyện phản xạ.
                        </p>
                    </div>

                    {/* Quick CTA Actions */}
                    <div className="flex flex-wrap items-center gap-3">
                        <button
                            type="button"
                            onClick={() => setIsQuizModalOpen(true)}
                            className="px-5 py-3.5 rounded-2xl bg-white text-sky-900 hover:bg-sky-50 font-black text-xs sm:text-sm shadow-xl hover:shadow-2xl transition-all hover:-translate-y-0.5 active:translate-y-0 flex items-center gap-2 cursor-pointer"
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
                                Tiến độ thuần thục {currentCategoryName}:
                            </span>
                            <span className="text-xs text-sky-100">
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

            {/* CATEGORY SELECTOR TABS */}
            <div className="flex items-center p-1.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-sm gap-1 overflow-x-auto">
                {HANGUL_CATEGORIES.map(cat => (
                    <button
                        key={cat.id}
                        type="button"
                        onClick={() => {
                            setActiveCategory(cat.id);
                            setSearchQuery('');
                        }}
                        className={`px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm whitespace-nowrap transition-all cursor-pointer ${
                            activeCategory === cat.id
                                ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-md shadow-cyan-500/25'
                                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                    >
                        {cat.name}
                    </button>
                ))}
            </div>

            {/* SEARCH & QUICK INSTRUCTION BAR */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
                <div className="relative w-full sm:w-72">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Tìm theo romaji (VD: k, a, giyeok)..."
                        className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium focus:outline-cyan-500 text-slate-800 dark:text-slate-100"
                    />
                </div>

                <div className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400 self-start sm:self-auto">
                    <Lightbulb className="w-4 h-4 text-amber-500" />
                    <span>Bấm vào thẻ chữ để <strong>xem quy tắc phát âm</strong> và <strong>từ vựng ví dụ</strong></span>
                </div>
            </div>

            {/* HANGUL CARD GRID */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-7 gap-3 sm:gap-4">
                {filteredHangulList.map(item => {
                    const isMastered = masteredList.includes(item.id);
                    const char = item.char;

                    return (
                        <div
                            key={item.id}
                            onClick={() => handleOpenDetail(item.id)}
                            className={`relative h-28 sm:h-32 rounded-2xl border-2 flex flex-col items-center justify-center p-2.5 transition-all duration-200 cursor-pointer select-none group hover:shadow-lg hover:-translate-y-1 ${
                                isMastered
                                    ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-400/60 dark:border-emerald-500/40 shadow-xs'
                                    : 'bg-white dark:bg-slate-800/80 border-slate-200/90 dark:border-slate-700/80 hover:border-cyan-400 dark:hover:border-cyan-500'
                            }`}
                        >
                            {/* Top Corner Mastery Toggle & Audio Trigger */}
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
                                className="absolute top-2.5 right-2.5 w-6 h-6 rounded-lg bg-slate-100 dark:bg-slate-700/80 text-slate-500 hover:text-cyan-600 hover:bg-cyan-50 flex items-center justify-center transition cursor-pointer z-10"
                                title="Nghe âm"
                            >
                                <Volume2 className="w-3.5 h-3.5" />
                            </button>

                            {/* Centered Character & Romaji */}
                            <div className="flex-1 w-full flex flex-col items-center justify-center pt-2 text-center">
                                <span className={`font-black font-sans text-slate-900 dark:text-white group-hover:scale-110 transition-transform leading-none flex items-center justify-center ${
                                    char.length > 2 ? 'text-xl sm:text-2xl tracking-tight' : 'text-3xl sm:text-4xl'
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

            {/* CHARACTER DETAIL MODAL */}
            {selectedHangulItem && (
                <HangulCardModal
                    isOpen={isDetailModalOpen}
                    item={selectedHangulItem}
                    onClose={() => setIsDetailModalOpen(false)}
                    onNext={handleNextChar}
                    onPrev={handlePrevChar}
                    isMastered={masteredList.includes(selectedHangulId)}
                    onToggleMastery={() => toggleMastery(selectedHangulId)}
                />
            )}

            {/* MINI-GAME QUIZ MODAL */}
            <HangulQuizModal
                isOpen={isQuizModalOpen}
                onClose={() => setIsQuizModalOpen(false)}
                hangulList={currentHangulList}
                awardXP={awardXP}
            />
        </div>
    );
};

export default HangulScreen;
