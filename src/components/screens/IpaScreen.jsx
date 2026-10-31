import React, { useState, useEffect, useMemo } from 'react';
import { 
    Volume2, CheckCircle2, Play, BookOpen, PenTool, 
    RotateCcw, Trophy, ArrowRight, Zap, Lightbulb, Search, Eye, Filter, Ear
} from 'lucide-react';
import { speakEnglish } from '../../utils/audio';
import { 
    IPA_CATEGORIES, IPA_DICTIONARY, getIpaList 
} from '../../data/ipaData';
import IpaCardModal from '../ipa/IpaCardModal';
import IpaQuizModal from '../ipa/IpaQuizModal';
import useMenuTransition from '../../hooks/useMenuTransition';

const IpaScreen = ({ awardXP }) => {
    const fadeWholePage = useMenuTransition();

    const [activeCategory, setActiveCategory] = useState('monophthongs');
    const [selectedIpaId, setSelectedIpaId] = useState(null);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [isQuizModalOpen, setIsQuizModalOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    // Mastered IPA list stored in localStorage
    const [masteredList, setMasteredList] = useState(() => {
        try {
            return JSON.parse(localStorage.getItem('quizki_ipa_mastered_list') || '[]');
        } catch (_) {
            return [];
        }
    });

    useEffect(() => {
        try {
            localStorage.setItem('quizki_ipa_mastered_list', JSON.stringify(masteredList));
        } catch (_) {}
    }, [masteredList]);

    const toggleMastery = (ipaKey) => {
        setMasteredList(prev => {
            if (prev.includes(ipaKey)) {
                return prev.filter(k => k !== ipaKey);
            } else {
                return [...prev, ipaKey];
            }
        });
    };

    // Current category items
    const currentIpaList = useMemo(() => {
        return getIpaList(activeCategory);
    }, [activeCategory]);

    // Filtered by search
    const filteredIpaList = useMemo(() => {
        if (!searchQuery.trim()) return currentIpaList;
        const q = searchQuery.trim().toLowerCase();
        const allList = Object.values(IPA_DICTIONARY);
        return allList.filter(item => 
            item.char.toLowerCase().includes(q) || 
            item.keyWord.toLowerCase().includes(q) || 
            item.name.toLowerCase().includes(q) ||
            item.keyWordMeaning.toLowerCase().includes(q)
        );
    }, [currentIpaList, searchQuery]);

    // Mastery statistics
    const stats = useMemo(() => {
        const total = currentIpaList.length;
        const mastered = currentIpaList.filter(item => 
            masteredList.includes(item.id)
        ).length;
        const percentage = total > 0 ? Math.round((mastered / total) * 100) : 0;
        return { total, mastered, percentage };
    }, [currentIpaList, masteredList]);

    const handleOpenDetail = (id) => {
        setSelectedIpaId(id);
        setIsDetailModalOpen(true);
    };

    const handlePlayAudio = (keyWord, e) => {
        if (e) e.stopPropagation();
        speakEnglish(keyWord);
    };

    const selectedIpaItem = selectedIpaId ? IPA_DICTIONARY[selectedIpaId] : null;

    // Prev / Next navigation
    const handleNextChar = () => {
        const idx = currentIpaList.findIndex(k => k.id === selectedIpaId);
        if (idx !== -1 && idx + 1 < currentIpaList.length) {
            setSelectedIpaId(currentIpaList[idx + 1].id);
        }
    };

    const handlePrevChar = () => {
        const idx = currentIpaList.findIndex(k => k.id === selectedIpaId);
        if (idx > 0) {
            setSelectedIpaId(currentIpaList[idx - 1].id);
        }
    };

    const currentCategoryName = IPA_CATEGORIES.find(c => c.id === activeCategory)?.name || 'Bảng phiên âm IPA';

    return (
        <div className={`space-y-3.5 sm:space-y-6 md:space-y-8 w-full min-w-0 font-sans ${fadeWholePage ? 'animate-fade-in' : ''}`}>
            {/* HERO BANNER - Clean Duolingo Style Cockpit */}
            <div className="relative overflow-hidden rounded-3xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 p-5 sm:p-7 shadow-xs w-full max-w-full min-w-0">
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4 sm:gap-6 w-full min-w-0">
                    <div className="space-y-2 max-w-2xl min-w-0">
                        <div className="inline-flex max-w-full items-center gap-2 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold tracking-wide uppercase truncate">
                            <span className="font-serif font-black shrink-0">/ə/</span>
                            <span className="truncate">Nhập môn Tiếng Anh • English IPA Phonetics</span>
                        </div>
                        <h1 className="text-xl sm:text-2xl md:text-3xl font-black tracking-tight text-slate-900 dark:text-white leading-tight break-words max-w-full">
                            Bảng Phiên Âm Quốc Tế (IPA 44 Âm)
                        </h1>
                        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed font-medium line-clamp-2 sm:line-clamp-none">
                            Nắm vững 44 âm Oxford (12 nguyên âm đơn, 8 nguyên âm đôi, 24 phụ âm) cùng phương pháp phân biệt cặp âm tương phản.
                        </p>
                    </div>

                    {/* Quick CTA Actions */}
                    <div className="flex flex-wrap items-center gap-3 shrink-0 w-full sm:w-auto">
                        <button
                            type="button"
                            onClick={() => setIsQuizModalOpen(true)}
                            className="w-full sm:w-auto px-5 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 active:translate-y-0.5 active:border-b-0 border-b-4 border-emerald-700 text-white font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer select-none shadow-xs"
                        >
                            <Ear className="w-4 h-4 fill-current" />
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
                    <div className="w-full sm:w-56 bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden border border-slate-200/60 dark:border-slate-700/60 shrink-0">
                        <div
                            className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                            style={{ width: `${stats.percentage}%` }}
                        />
                    </div>
                </div>
            </div>

            {/* CATEGORY SELECTOR TABS */}
            <div className="w-full min-w-0 max-w-full overflow-x-auto no-scrollbar scroll-smooth">
                <div className="inline-flex items-center p-1.5 rounded-2xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 shadow-xs gap-1.5 w-max min-w-full sm:min-w-0">
                    {IPA_CATEGORIES.map(cat => (
                        <button
                            key={cat.id}
                            type="button"
                            onClick={() => {
                                setActiveCategory(cat.id);
                                setSearchQuery('');
                            }}
                            className={`px-3.5 py-2 rounded-xl font-bold text-xs sm:text-sm whitespace-nowrap transition-all cursor-pointer ${
                                activeCategory === cat.id
                                    ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xs'
                                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                            }`}
                        >
                            {cat.name}
                        </button>
                    ))}
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
                        placeholder="Tìm theo ký tự hoặc từ (VD: cat, sheep, æ)..."
                        className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium focus:outline-violet-500 text-slate-800 dark:text-slate-100 min-w-0"
                    />
                </div>

                <div className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400 self-start sm:self-auto min-w-0 max-w-full">
                    <Lightbulb className="w-4 h-4 text-amber-500 shrink-0" />
                    <span className="text-[11px] sm:text-xs truncate">Bấm thẻ để <strong>xem khẩu hình</strong> & <strong>cặp âm</strong></span>
                </div>
            </div>

            {/* IPA CARD GRID */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2.5 sm:gap-4 w-full max-w-full min-w-0">
                {filteredIpaList.map(item => {
                    const isMastered = masteredList.includes(item.id);

                    return (
                        <div
                            key={item.id}
                            onClick={() => handleOpenDetail(item.id)}
                            className={`relative h-28 sm:h-32 rounded-2xl border-2 flex flex-col items-center justify-center p-2.5 transition-all duration-200 cursor-pointer select-none group hover:shadow-lg hover:-translate-y-1 ${
                                isMastered
                                    ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-400/60 dark:border-emerald-500/40 shadow-xs'
                                    : 'bg-white dark:bg-slate-800/80 border-slate-200/90 dark:border-slate-700/80 hover:border-violet-400 dark:hover:border-violet-500'
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
                                onClick={(e) => handlePlayAudio(item.keyWord, e)}
                                className="absolute top-2.5 right-2.5 w-6 h-6 rounded-lg bg-slate-100 dark:bg-slate-700/80 text-slate-500 hover:text-violet-600 hover:bg-violet-50 flex items-center justify-center transition cursor-pointer z-10"
                                title="Nghe âm mẫu"
                            >
                                <Volume2 className="w-3.5 h-3.5" />
                            </button>

                            {/* Centered IPA Symbol & Key word */}
                            <div className="flex-1 w-full flex flex-col items-center justify-center pt-2 text-center">
                                <span className="font-black font-serif text-3xl sm:text-4xl text-slate-900 dark:text-white group-hover:scale-110 transition-transform leading-none flex items-center justify-center">
                                    /{item.char}/
                                </span>

                                <div className="text-xs font-bold text-slate-500 dark:text-slate-400 mt-2 flex items-center gap-1">
                                    <span className="text-violet-600 dark:text-violet-400 font-medium">{item.keyWord}</span>
                                    <span className="text-[10px] text-slate-400 font-normal">({item.keyWordMeaning})</span>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* CHARACTER DETAIL MODAL */}
            {selectedIpaItem && (
                <IpaCardModal
                    isOpen={isDetailModalOpen}
                    item={selectedIpaItem}
                    onClose={() => setIsDetailModalOpen(false)}
                    onNext={handleNextChar}
                    onPrev={handlePrevChar}
                    isMastered={masteredList.includes(selectedIpaId)}
                    onToggleMastery={() => toggleMastery(selectedIpaId)}
                />
            )}

            {/* MINI-GAME QUIZ MODAL */}
            <IpaQuizModal
                isOpen={isQuizModalOpen}
                onClose={() => setIsQuizModalOpen(false)}
                ipaList={currentIpaList}
                awardXP={awardXP}
            />
        </div>
    );
};

export default IpaScreen;
