import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Search, Heart, BookOpen, ChevronRight, X
} from 'lucide-react';
import { TopTabBar, PremiumLockedModal } from '../ui';
import { GRAMMAR_TABS } from '../../config/tabs';
import { showToast } from '../../utils/toast';

const JLPT_LEVEL_TABS = [
    { key: 'ALL', label: 'Tất cả' },
    { key: 'N5', label: 'N5 初級 I' },
    { key: 'N4', label: 'N4 初級 II' },
    { key: 'N3', label: 'N3 中級' },
    { key: 'N2', label: 'N2 上級' },
    { key: 'N1', label: 'N1 最上級' },
];

const GrammarCurriculumScreen = ({ isAdmin = false, profile = null }) => {
    const navigate = useNavigate();
    const [curriculum, setCurriculum] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedLevel, setSelectedLevel] = useState('N5');
    const [searchQuery, setSearchQuery] = useState('');
    const [showSavedOnly, setShowSavedOnly] = useState(false);
    const [showPremiumModal, setShowPremiumModal] = useState(false);

    const hasGrammarAccess = isAdmin || profile?.isPremiumUnlocked || profile?.isPremium || (profile?.unlockedSpecializedPackages || []).includes('grammar_zen') || (profile?.unlockedSpecializedPackages || []).includes('premium');
    const [savedTopics, setSavedTopics] = useState(() => {
        try {
            return JSON.parse(localStorage.getItem('quizki_saved_grammar_topics') || '[]');
        } catch {
            return [];
        }
    });

    useEffect(() => {
        const loadCurriculum = async () => {
            try {
                const res = await fetch('/data/grammar_hub_curriculum.json');
                if (res.ok) {
                    const data = await res.json();
                    setCurriculum(data);
                }
            } catch (err) {
                console.error('Error loading curriculum:', err);
            } finally {
                setLoading(false);
            }
        };
        loadCurriculum();
    }, []);

    const toggleSaveTopic = (e, topicId, titleVi) => {
        e.stopPropagation();
        setSavedTopics(prev => {
            let next;
            if (prev.includes(topicId)) {
                next = prev.filter(id => id !== topicId);
                showToast(`Đã bỏ lưu "${titleVi}"`, 'info');
            } else {
                next = [...prev, topicId];
                showToast(`Đã lưu "${titleVi}" vào danh sách yêu thích`);
            }
            localStorage.setItem('quizki_saved_grammar_topics', JSON.stringify(next));
            return next;
        });
    };

    // Filter topics
    const filteredTopics = useMemo(() => {
        return curriculum.filter(topic => {
            const matchesLevel = selectedLevel === 'ALL' || topic.level === selectedLevel;
            const matchesSaved = !showSavedOnly || savedTopics.includes(topic.id);
            const query = searchQuery.toLowerCase().trim();
            const matchesQuery = !query ||
                topic.titleVi.toLowerCase().includes(query) ||
                topic.titleJp?.toLowerCase().includes(query) ||
                topic.descVi?.toLowerCase().includes(query) ||
                topic.kanji?.includes(query) ||
                topic.reading?.toLowerCase().includes(query) ||
                topic.romaji?.toLowerCase().includes(query) ||
                (topic.patterns || []).some(p => p.pattern?.toLowerCase().includes(query) || p.meaning?.toLowerCase().includes(query));
            return matchesLevel && matchesSaved && matchesQuery;
        });
    }, [curriculum, selectedLevel, showSavedOnly, savedTopics, searchQuery]);

    const totalPatternsCount = useMemo(() => {
        return filteredTopics.reduce((acc, t) => acc + (t.patternsCount || (t.patterns || []).length), 0);
    }, [filteredTopics]);

    return (
        <div className="min-h-screen bg-[#fcfcfc] dark:bg-slate-950 text-slate-900 dark:text-white pb-24">
            {/* Top Bar Tabs */}
            <TopTabBar tabs={GRAMMAR_TABS} activeTab="grammar-curriculum" />

            <div className="max-w-6xl mx-auto px-4 mt-6 space-y-6 animate-fade-in">
                {/* Level selector tabs - Minimal Monochrome */}
                <div className="flex flex-col items-center gap-3">
                    <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-2.5">
                        {JLPT_LEVEL_TABS.map(tab => {
                            const isActive = selectedLevel === tab.key;
                            return (
                                <button
                                    key={tab.key}
                                    type="button"
                                    onClick={() => setSelectedLevel(tab.key)}
                                    className={`px-4 sm:px-5 py-2 rounded-2xl text-xs sm:text-sm font-bold transition-all duration-200 cursor-pointer ${
                                        isActive
                                            ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-950 border border-slate-900 dark:border-white shadow-sm font-black'
                                            : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:border-slate-400 dark:hover:border-slate-600'
                                    }`}
                                >
                                    {tab.label}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Search Bar & Stats Header - Minimal B&W */}
                <div className="bg-white dark:bg-slate-900 rounded-3xl p-4 sm:p-6 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="space-y-1 text-center md:text-left w-full md:w-auto">
                        <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center justify-center md:justify-start gap-2 flex-wrap">
                            <span>Lộ trình Ngữ pháp theo Chủ đề</span>
                            <span className="text-xs px-2.5 py-0.5 rounded-xl font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                                {filteredTopics.length} chủ đề • {totalPatternsCount} mẫu
                            </span>
                        </h2>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                            Học theo giáo trình chuẩn từ N5 đến N1 với hội thoại thực tế, giải thích chi tiết và phân tích lỗi sai.
                        </p>
                    </div>

                    <div className="flex items-center gap-2.5 w-full md:w-auto">
                        <div className="relative flex-1 md:w-80">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Tìm chủ đề, mẫu câu (ぶん)..."
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
                            title={showSavedOnly ? 'Hiển thị tất cả' : 'Chỉ hiển thị bài đã lưu'}
                        >
                            <Heart className={`w-4 h-4 transition-colors ${showSavedOnly ? 'fill-rose-500 text-rose-500' : 'text-slate-400'}`} />
                            <span className="hidden sm:inline">Đã lưu</span>
                        </button>
                    </div>
                </div>

                {/* Section Header */}
                <div className="flex items-center justify-between pt-1">
                    <h3 className="text-xs font-black tracking-wider uppercase text-slate-400 dark:text-slate-500">
                        {selectedLevel === 'ALL' ? 'TẤT CẢ CÁC BÀI HỌC' : `GIÁO TRÌNH CẤP ĐỘ ${selectedLevel}`}
                    </h3>
                    <span className="text-xs font-bold text-slate-400 font-mono">
                        {filteredTopics.length} bài học
                    </span>
                </div>

                {/* Grid of Topic Cards - Clean Minimal B&W */}
                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        {[1, 2, 3, 4, 5, 6].map(i => (
                            <div key={i} className="h-56 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 animate-pulse" />
                        ))}
                    </div>
                ) : filteredTopics.length === 0 ? (
                    <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-8">
                        <BookOpen className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                        <h3 className="text-base font-bold text-slate-700 dark:text-slate-300">Không tìm thấy chủ đề phù hợp</h3>
                        <p className="text-xs text-slate-400 mt-1">Thử tìm kiếm với từ khóa khác hoặc chuyển sang cấp độ khác</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        {filteredTopics.map((topic) => {
                            const isSaved = savedTopics.includes(topic.id);
                            const isLocked = topic.level !== 'N5' && !hasGrammarAccess;

                            return (
                                <div
                                    key={topic.id}
                                    onClick={() => {
                                        if (isLocked) {
                                            setShowPremiumModal(true);
                                            return;
                                        }
                                        navigate(`/grammar/curriculum/${topic.id}`);
                                    }}
                                    className="group relative bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 flex flex-col justify-between hover:border-slate-900 dark:hover:border-slate-400 hover:shadow-xl hover:-translate-y-1 transition-all duration-200 cursor-pointer"
                                >
                                    <div>
                                        {/* Top Row: Calligraphy Kanji stamp + Level & Heart Button */}
                                        <div className="flex items-start justify-between gap-3 mb-4">
                                            <div className="w-14 h-14 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-3xl font-black font-japanese text-slate-900 dark:text-white group-hover:bg-slate-900 group-hover:text-white dark:group-hover:bg-white dark:group-hover:text-slate-900 transition-colors shadow-xs select-none">
                                                {topic.kanji}
                                            </div>

                                            <div className="flex items-center gap-2">
                                                <span className={`px-2.5 py-1 rounded-xl text-[11px] font-extrabold border ${isLocked ? 'border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300' : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300'} flex items-center gap-1`}>
                                                    {isLocked && <span>🔒</span>}
                                                    <span>{topic.level}</span>
                                                </span>
                                                <span className="px-2 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-400 text-xs font-serif font-bold tracking-widest select-none">
                                                    {topic.numeral}
                                                </span>

                                                {/* Heart Save Button */}
                                                <button
                                                    type="button"
                                                    onClick={(e) => toggleSaveTopic(e, topic.id, topic.titleVi)}
                                                    className="p-1.5 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-all cursor-pointer active:scale-90"
                                                    title={isSaved ? "Bỏ lưu chủ đề" : "Lưu chủ đề yêu thích"}
                                                >
                                                    <Heart className={`w-4 h-4 transition-colors ${isSaved ? 'fill-rose-500 text-rose-500' : ''}`} />
                                                </button>
                                            </div>
                                        </div>

                                        {/* Subtitle: Reading · Bài X */}
                                        <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1 flex items-center gap-1.5 flex-wrap">
                                            <span>{topic.reading}</span>
                                            <span>•</span>
                                            <span>Bài {topic.bai}</span>
                                            {topic.romaji && (
                                                <>
                                                    <span>•</span>
                                                    <span className="font-mono">{topic.romaji}</span>
                                                </>
                                            )}
                                        </div>

                                        {/* Main Title */}
                                        <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-sky-400 transition-colors leading-snug line-clamp-1 mb-1.5">
                                            {topic.titleVi}
                                        </h3>

                                        {/* Description */}
                                        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed line-clamp-2 mb-4">
                                            {topic.descVi}
                                        </p>
                                    </div>

                                    {/* Bottom Info: Badges */}
                                    <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <span className="px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold">
                                                    Bài {topic.bai}
                                                </span>
                                                <span className="text-xs font-bold text-slate-600 dark:text-slate-400 font-mono">
                                                    {topic.patternsCount || (topic.patterns || []).length} mẫu
                                                </span>
                                            </div>

                                            <div className={`flex items-center gap-1 text-xs font-bold ${isLocked ? 'text-amber-600 dark:text-amber-400' : 'text-slate-600 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white group-hover:translate-x-1'} transition-all`}>
                                                <span>{isLocked ? 'Khóa Premium' : 'Xem chi tiết'}</span>
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

export default GrammarCurriculumScreen;
