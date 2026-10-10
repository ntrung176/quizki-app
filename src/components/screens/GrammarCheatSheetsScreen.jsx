import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Bookmark, Search, BookOpen, ChevronRight, Heart, X
} from 'lucide-react';
import { TopTabBar, PremiumLockedModal } from '../ui';
import { GRAMMAR_TABS } from '../../config/tabs';
import { showToast } from '../../utils/toast';

const CATEGORIES = [
    { id: 'all', label: 'Tất cả' },
    { id: 'Ngữ pháp Cốt lõi', label: 'Cốt lõi & Trợ từ' },
    { id: 'Giao tiếp & Công sở', label: 'Kính ngữ & Công sở' },
    { id: 'Biến chia Thể', label: 'Thể & Biến chia' },
    { id: 'Động từ', label: 'Động từ' },
    { id: 'Sắc thái & Cảm xúc', label: 'Sắc thái & Suy đoán' },
    { id: 'Ngữ pháp Nâng cao', label: 'Nâng cao & Thời gian' },
    { id: 'Văn phong', label: 'Văn phong' }
];

const GrammarCheatSheetsScreen = ({ isAdmin = false, profile = null }) => {
    const navigate = useNavigate();
    const [sheets, setSheets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [showSavedOnly, setShowSavedOnly] = useState(false);
    const [showPremiumModal, setShowPremiumModal] = useState(false);

    const hasGrammarAccess = isAdmin || profile?.isPremiumUnlocked || profile?.isPremium || (profile?.unlockedSpecializedPackages || []).includes('grammar_zen') || (profile?.unlockedSpecializedPackages || []).includes('premium');
    const [savedSheets, setSavedSheets] = useState(() => {
        try {
            return JSON.parse(localStorage.getItem('quizki_saved_grammar_sheets') || '[]');
        } catch {
            return [];
        }
    });

    useEffect(() => {
        const loadSheets = async () => {
            try {
                const res = await fetch('/data/grammar_cheatsheets.json');
                if (res.ok) {
                    const data = await res.json();
                    setSheets(data);
                }
            } catch (err) {
                console.error('Error loading cheatsheets:', err);
            } finally {
                setLoading(false);
            }
        };
        loadSheets();
    }, []);

    const toggleSaveSheet = (e, sheetId, title) => {
        e.stopPropagation();
        setSavedSheets(prev => {
            let next;
            if (prev.includes(sheetId)) {
                next = prev.filter(id => id !== sheetId);
                showToast(`Đã bỏ lưu "${title}"`, 'info');
            } else {
                next = [...prev, sheetId];
                showToast(`Đã lưu "${title}" vào sổ tay yêu thích`);
            }
            localStorage.setItem('quizki_saved_grammar_sheets', JSON.stringify(next));
            return next;
        });
    };

    const filteredSheets = useMemo(() => {
        return sheets.filter(sheet => {
            const matchesCat = selectedCategory === 'all' || sheet.category === selectedCategory;
            const matchesSaved = !showSavedOnly || savedSheets.includes(sheet.id);
            const query = searchQuery.toLowerCase().trim();
            const matchesQuery = !query ||
                sheet.title.toLowerCase().includes(query) ||
                sheet.titleJp?.toLowerCase().includes(query) ||
                sheet.summary?.toLowerCase().includes(query) ||
                sheet.badge?.toLowerCase().includes(query) ||
                sheet.level?.toLowerCase().includes(query);
            return matchesCat && matchesSaved && matchesQuery;
        });
    }, [sheets, selectedCategory, showSavedOnly, savedSheets, searchQuery]);

    return (
        <div className="min-h-screen bg-[#fcfcfc] dark:bg-slate-950 text-slate-900 dark:text-white pb-24">
            {/* Top Bar Tabs */}
            <TopTabBar tabs={GRAMMAR_TABS} activeTab="grammar-cheatsheets" />

            <div className="max-w-6xl mx-auto px-4 mt-6 space-y-6 animate-fade-in">
                {/* Category Filter Chips - Minimal Monochrome */}
                <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar justify-start sm:justify-center">
                    {CATEGORIES.map(cat => {
                        const isActive = selectedCategory === cat.id;
                        return (
                            <button
                                key={cat.id}
                                onClick={() => setSelectedCategory(cat.id)}
                                className={`px-4 py-2 rounded-2xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all duration-200 cursor-pointer shrink-0 ${
                                    isActive
                                        ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-950 border border-slate-900 dark:border-white shadow-sm font-black'
                                        : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:border-slate-400 dark:hover:border-slate-600'
                                }`}
                            >
                                {cat.label}
                            </button>
                        );
                    })}
                </div>

                {/* Search Bar & Header Card - Minimal B&W */}
                <div className="bg-white dark:bg-slate-900 rounded-3xl p-4 sm:p-6 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="space-y-1 text-center md:text-left w-full md:w-auto">
                        <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center justify-center md:justify-start gap-2 flex-wrap">
                            <span>Sổ tay Chuyên đề Ngữ pháp</span>
                            <span className="text-xs px-2.5 py-0.5 rounded-xl font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                                {filteredSheets.length} chuyên đề
                            </span>
                        </h2>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                            Bảng tra cứu quy tắc biến chia thể, trợ từ, ma trận so sánh sắc thái và kính ngữ công sở.
                        </p>
                    </div>

                    <div className="flex items-center gap-2.5 w-full md:w-auto">
                        <div className="relative flex-1 md:w-80">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Tìm trợ từ, kính ngữ, thể bị động..."
                                className="w-full pl-10 pr-10 py-2.5 sm:py-3 text-xs sm:text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl outline-none text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:border-slate-900 dark:focus:border-white focus:ring-1 focus:ring-slate-900 dark:focus:ring-white transition-all"
                            />
                            {searchQuery && (
                                <button
                                    type="button"
                                    onClick={() => setSearchQuery('')}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            )}
                        </div>

                        {/* Saved Filter Button */}
                        <button
                            onClick={() => setShowSavedOnly(prev => !prev)}
                            className={`px-4 py-2.5 sm:py-3 rounded-2xl border text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shrink-0 ${
                                showSavedOnly
                                    ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800 text-rose-600 dark:text-rose-400 shadow-xs'
                                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:border-slate-400 dark:hover:border-slate-600'
                            }`}
                            title={showSavedOnly ? 'Hiển thị tất cả' : 'Chỉ hiển thị sổ tay đã lưu'}
                        >
                            <Heart className={`w-4 h-4 transition-colors ${showSavedOnly ? 'fill-rose-500 text-rose-500' : 'text-slate-400'}`} />
                            <span className="hidden sm:inline">Đã lưu</span>
                        </button>
                    </div>
                </div>

                {/* Section Header */}
                <div className="flex items-center justify-between pt-1">
                    <h3 className="text-xs font-black tracking-wider uppercase text-slate-400 dark:text-slate-500">
                        {selectedCategory === 'all' ? 'TẤT CẢ CHUYÊN ĐỀ TRA CỨU' : `DANH MỤC: ${selectedCategory.toUpperCase()}`}
                    </h3>
                    <span className="text-xs font-bold text-slate-400 font-mono">
                        {filteredSheets.length} chuyên đề
                    </span>
                </div>

                {/* Grid of Cheat Sheet Cards - Clean Minimal B&W */}
                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        {[1, 2, 3, 4, 5, 6].map(i => (
                            <div key={i} className="h-56 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 animate-pulse" />
                        ))}
                    </div>
                ) : filteredSheets.length === 0 ? (
                    <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-8">
                        <Bookmark className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                        <h3 className="text-base font-bold text-slate-700 dark:text-slate-300">Không tìm thấy chuyên đề phù hợp</h3>
                        <p className="text-xs text-slate-400 mt-1">Thử tìm kiếm với từ khóa khác</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        {filteredSheets.map((sheet) => {
                            const isSaved = savedSheets.includes(sheet.id);
                            const isLocked = (!sheet.level || (!sheet.level.includes('N5') && sheet.level !== 'N5')) && !hasGrammarAccess;

                            return (
                                <div
                                    key={sheet.id}
                                    onClick={() => {
                                        if (isLocked) {
                                            setShowPremiumModal(true);
                                            return;
                                        }
                                        navigate(`/grammar/cheatsheets/${sheet.id}`);
                                    }}
                                    className="group relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 hover:border-slate-900 dark:hover:border-slate-400 hover:shadow-xl hover:-translate-y-1 transition-all duration-200 flex flex-col justify-between cursor-pointer"
                                >
                                    <div>
                                        {/* Top Header: Icon + Level + Heart Button */}
                                        <div className="flex items-start justify-between gap-3 mb-4">
                                            <div className="w-12 h-12 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-2xl group-hover:bg-slate-900 group-hover:text-white dark:group-hover:bg-white dark:group-hover:text-slate-900 transition-colors shadow-xs select-none">
                                                {sheet.icon || '📖'}
                                            </div>

                                            <div className="flex items-center gap-2">
                                                {sheet.level && (
                                                    <span className={`px-2.5 py-1 rounded-xl text-[11px] font-extrabold border ${isLocked ? 'border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300' : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300'} flex items-center gap-1`}>
                                                        {isLocked && <span>🔒</span>}
                                                        <span>{sheet.level}</span>
                                                    </span>
                                                )}

                                                {/* Heart Save Button */}
                                                <button
                                                    type="button"
                                                    onClick={(e) => toggleSaveSheet(e, sheet.id, sheet.title)}
                                                    className="p-1.5 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-all cursor-pointer active:scale-90"
                                                    title={isSaved ? "Bỏ lưu sổ tay" : "Lưu sổ tay yêu thích"}
                                                >
                                                    <Heart className={`w-4 h-4 transition-colors ${isSaved ? 'fill-rose-500 text-rose-500' : ''}`} />
                                                </button>
                                            </div>
                                        </div>

                                        {/* Category Title */}
                                        <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                                            {sheet.category}
                                        </div>

                                        {/* Sheet Title */}
                                        <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-sky-400 transition-colors leading-snug line-clamp-1 mb-1.5">
                                            {sheet.title}
                                        </h3>

                                        {/* Summary */}
                                        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed line-clamp-2 mb-4">
                                            {sheet.summary}
                                        </p>
                                    </div>

                                    {/* Footer Info */}
                                    <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                                                {sheet.sections?.length || 0} bảng quy tắc
                                            </span>

                                            <div className={`flex items-center gap-1 text-xs font-bold ${isLocked ? 'text-amber-600 dark:text-amber-400' : 'text-slate-600 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white group-hover:translate-x-1'} transition-all`}>
                                                <span>{isLocked ? 'Khóa Premium' : 'Xem bảng tra cứu'}</span>
                                                <ChevronRight className="w-3.5 h-3.5" />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            <PremiumLockedModal
                isOpen={showPremiumModal}
                onClose={() => setShowPremiumModal(false)}
                packageName="Thư viện Ngữ pháp Chuyên sâu"
            />
        </div>
    );
};

export default GrammarCheatSheetsScreen;
