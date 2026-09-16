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
        <div className={`min-h-screen bg-slate-50/50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 p-4 sm:p-6 md:p-8 max-w-7xl mx-auto space-y-6 sm:space-y-8 ${fadeWholePage ? 'animate-fade-in' : ''}`}>
            {/* HERO BANNER */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-violet-800 via-purple-700 to-indigo-700 text-white p-6 sm:p-8 shadow-2xl shadow-violet-700/20">
                {/* Decorative IPA Watermark in background */}
                <div className="absolute -right-8 -bottom-10 text-9xl font-black text-white/5 font-serif select-none pointer-events-none">
                    /ə/ /iː/
                </div>

                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="space-y-2 max-w-2xl">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-xs font-bold tracking-wide uppercase">
                            <span className="font-serif font-black">/ə/</span>
                            <span>Nhập môn Tiếng Anh • English IPA Phonetics Studio</span>
                        </div>
                        <h1 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight text-white">
                            Bảng Phiên Âm Quốc Tế (IPA 44 Âm)
                        </h1>
                        <p className="text-xs sm:text-sm text-purple-100 leading-relaxed font-medium">
                            Nắm vững chuẩn 44 âm Oxford (12 nguyên âm đơn, 8 nguyên âm đôi, 24 phụ âm vô thanh & hữu thanh) cùng phương pháp phân biệt cặp âm tương phản.
                        </p>
                    </div>

                    {/* Quick CTA Actions */}
                    <div className="flex flex-wrap items-center gap-3">
                        <button
                            type="button"
                            onClick={() => setIsQuizModalOpen(true)}
                            className="px-5 py-3.5 rounded-2xl bg-white text-purple-950 hover:bg-purple-50 font-black text-xs sm:text-sm shadow-xl hover:shadow-2xl transition-all hover:-translate-y-0.5 active:translate-y-0 flex items-center gap-2 cursor-pointer"
                        >
                            <Ear className="w-4 h-4 fill-amber-500 text-amber-500" />
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
                            <span className="text-xs text-purple-100">
                                Đã thuộc <strong className="text-white font-black">{stats.mastered}</strong> / {stats.total} âm ({stats.percentage}%)
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
                {IPA_CATEGORIES.map(cat => (
                    <button
                        key={cat.id}
                        type="button"
                        onClick={() => {
                            setActiveCategory(cat.id);
                            setSearchQuery('');
                        }}
                        className={`px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm whitespace-nowrap transition-all cursor-pointer ${
                            activeCategory === cat.id
                                ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-md shadow-violet-500/25'
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
                        placeholder="Tìm theo ký tự hoặc từ (VD: cat, sheep, æ)..."
                        className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium focus:outline-violet-500 text-slate-800 dark:text-slate-100"
                    />
                </div>

                <div className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400 self-start sm:self-auto">
                    <Lightbulb className="w-4 h-4 text-amber-500" />
                    <span>Bấm vào thẻ âm để <strong>xem khẩu hình miệng</strong> và <strong>so sánh cặp âm tối thiểu</strong></span>
                </div>
            </div>

            {/* IPA CARD GRID */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
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
