import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
    Brain, Search, Sparkles, BookOpen, ChevronRight, 
    Volume2, X, Filter, Layers, CheckCircle2, Lightbulb,
    Compass, ArrowUpRight, ArrowLeft
} from 'lucide-react';
import { TopTabBar } from '../ui';
import { GRAMMAR_TABS } from '../../config/tabs';
import { speakExampleSentence } from '../../utils/audio';
import GrammarNuanceMindmapCard from '../grammar/GrammarNuanceMindmapCard';

const LEVEL_COLORS = {
    N5: { bg: 'bg-emerald-500', text: 'text-emerald-500', lightBg: 'bg-emerald-50 dark:bg-emerald-950/40', border: 'border-emerald-200 dark:border-emerald-800' },
    N4: { bg: 'bg-sky-500', text: 'text-sky-500', lightBg: 'bg-sky-50 dark:bg-sky-950/40', border: 'border-sky-200 dark:border-sky-800' },
    N3: { bg: 'bg-indigo-500', text: 'text-indigo-500', lightBg: 'bg-indigo-50 dark:bg-indigo-950/40', border: 'border-indigo-200 dark:border-indigo-800' },
    N2: { bg: 'bg-purple-500', text: 'text-purple-500', lightBg: 'bg-purple-50 dark:bg-purple-950/40', border: 'border-purple-200 dark:border-purple-800' },
    N1: { bg: 'bg-rose-500', text: 'text-rose-500', lightBg: 'bg-rose-50 dark:bg-rose-950/40', border: 'border-rose-200 dark:border-rose-800' },
};

const GrammarNuancesScreen = () => {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const [nuancesData, setNuancesData] = useState({});
    const [loading, setLoading] = useState(true);
    const [selectedLevel, setSelectedLevel] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedPatternKey, setSelectedPatternKey] = useState(null);
    const [displayLimit, setDisplayLimit] = useState(24);

    useEffect(() => {
        const loadNuances = async () => {
            try {
                const res = await fetch('/data/grammar_nuances.json');
                if (res.ok) {
                    const data = await res.json();
                    setNuancesData(data);
                }
            } catch (err) {
                console.error('Error loading grammar nuances:', err);
            } finally {
                setLoading(false);
            }
        };
        loadNuances();
    }, []);

    // Format patterns array with metadata
    const patternsList = useMemo(() => {
        return Object.entries(nuancesData).map(([rawKey, nodes]) => {
            if (!Array.isArray(nodes) || nodes.length === 0) return null;
            const firstNode = nodes[0] || {};
            
            // Extract level from key (e.g. n2-001 -> N2)
            let lvl = 'N3';
            if (firstNode.key) {
                const prefix = firstNode.key.split('-')[0].toUpperCase();
                if (['N1', 'N2', 'N3', 'N4', 'N5'].includes(prefix)) {
                    lvl = prefix;
                }
            }

            return {
                pattern: firstNode.pattern || rawKey,
                reading: firstNode.reading || '',
                coreMeaning: firstNode.coreMeaning || firstNode.title || '',
                definition: firstNode.definition || '',
                level: lvl,
                nodes: nodes,
                nodeCount: nodes.length,
                rawKey: rawKey,
                examples: firstNode.examples || []
            };
        }).filter(Boolean);
    }, [nuancesData]);

    // Filter patterns
    const filteredPatterns = useMemo(() => {
        return patternsList.filter(item => {
            if (selectedLevel !== 'all' && item.level !== selectedLevel) return false;

            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase().trim();
                const matchPattern = item.pattern.toLowerCase().includes(q);
                const matchReading = (item.reading || '').toLowerCase().includes(q);
                const matchMeaning = (item.coreMeaning || '').toLowerCase().includes(q);
                const matchDef = (item.definition || '').toLowerCase().includes(q);
                const matchNodes = item.nodes.some(n => 
                    (n.title || '').toLowerCase().includes(q) || 
                    (n.definition || '').toLowerCase().includes(q) ||
                    (n.examples || []).some(ex => (ex.japanese || '').includes(q) || (ex.meaning || '').toLowerCase().includes(q))
                );

                if (!matchPattern && !matchReading && !matchMeaning && !matchDef && !matchNodes) {
                    return false;
                }
            }

            return true;
        });
    }, [patternsList, selectedLevel, searchQuery]);

    const activePatternObj = useMemo(() => {
        if (!selectedPatternKey) return null;
        return patternsList.find(p => p.rawKey === selectedPatternKey || p.pattern === selectedPatternKey) || null;
    }, [patternsList, selectedPatternKey]);

    const speakText = (text) => {
        if (text) {
            speakExampleSentence(text, 'ja-JP');
        }
    };

    return (
        <div className="grammar-nuances-screen min-h-screen bg-[#FAFBFD] dark:bg-slate-950 font-sans text-slate-900 dark:text-slate-100 pb-24">
            {/* 1. Navigation Top Bar */}
            <TopTabBar tabs={GRAMMAR_TABS} />

            <div className="max-w-6xl mx-auto px-3.5 sm:px-5 md:px-8 mt-2 space-y-6 sm:space-y-8 animate-fade-in">
                {/* 2. Hero Banner & Stats */}
                <div className="p-6 sm:p-8 bg-gradient-to-br from-indigo-900 via-slate-900 to-indigo-950 text-white rounded-3xl border border-indigo-800/50 shadow-xl relative overflow-hidden space-y-6">
                    <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div className="space-y-2 max-w-2xl">
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-black uppercase tracking-wider">
                                <Brain className="w-4 h-4 text-amber-400" />
                                <span>Thư Viện Bản Đồ Tư Duy & Sắc Thái Ngữ Pháp</span>
                            </div>
                            <h1 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight text-white">
                                752 Bản Đồ Tư Duy & 18.400+ Nhánh Nuance
                            </h1>
                            <p className="text-xs sm:text-sm text-indigo-200/90 font-medium leading-relaxed">
                                Phân tích cấu trúc tâm lý, ngữ cảnh thực tế, và so sánh sắc thái đối chiếu của 384 mẫu câu JLPT từ N5 đến N1.
                            </p>
                        </div>

                        {/* Total Stats Pills */}
                        <div className="grid grid-cols-2 gap-3 shrink-0">
                            <div className="bg-white/10 backdrop-blur-md p-3.5 rounded-2xl border border-white/10 text-center">
                                <p className="text-2xl sm:text-3xl font-black text-amber-400">384</p>
                                <p className="text-[10px] uppercase font-bold text-indigo-200 mt-0.5">Mẫu câu cốt lõi</p>
                            </div>
                            <div className="bg-white/10 backdrop-blur-md p-3.5 rounded-2xl border border-white/10 text-center">
                                <p className="text-2xl sm:text-3xl font-black text-emerald-400">18.445</p>
                                <p className="text-[10px] uppercase font-bold text-indigo-200 mt-0.5">Nhánh tư duy & ví dụ</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 3. Search & Level Filters */}
                <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-4 sm:p-5 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
                    {/* Level Selector */}
                    <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-2xl w-full md:w-auto">
                        {[
                            { key: 'all', label: 'Tất cả cấp độ' },
                            { key: 'N5', label: 'N5' },
                            { key: 'N4', label: 'N4' },
                            { key: 'N3', label: 'N3' },
                            { key: 'N2', label: 'N2' },
                            { key: 'N1', label: 'N1' },
                        ].map(lvl => (
                            <button
                                key={lvl.key}
                                onClick={() => {
                                    setSelectedLevel(lvl.key);
                                    setDisplayLimit(24);
                                }}
                                className={`px-3.5 sm:px-4 py-2 text-xs sm:text-sm font-extrabold rounded-xl transition-all cursor-pointer ${
                                    selectedLevel === lvl.key
                                        ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                                        : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
                                }`}
                            >
                                {lvl.label}
                            </button>
                        ))}
                    </div>

                    {/* Search Input */}
                    <div className="relative w-full md:w-80">
                        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => {
                                setSearchQuery(e.target.value);
                                setDisplayLimit(24);
                            }}
                            placeholder="Tìm mẫu câu (VD: ものの, あげく, わけ...)"
                            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 rounded-2xl pl-9 pr-8 py-2.5 text-xs sm:text-sm font-medium text-slate-800 dark:text-slate-200 focus:outline-none focus:border-indigo-500"
                        />
                        {searchQuery && (
                            <button 
                                onClick={() => setSearchQuery('')}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                            >
                                <X className="w-3.5 h-3.5" />
                            </button>
                        )}
                    </div>
                </div>

                {/* 4. Pattern Grid */}
                {loading ? (
                    <div className="py-20 text-center space-y-3">
                        <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
                        <p className="text-xs font-bold text-slate-400">Đang tải thư viện sơ đồ tư duy...</p>
                    </div>
                ) : filteredPatterns.length === 0 ? (
                    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-12 text-center space-y-3">
                        <Brain className="w-12 h-12 text-slate-300 mx-auto" />
                        <h3 className="text-base font-bold text-slate-700 dark:text-slate-300">Không tìm thấy mẫu câu phù hợp</h3>
                        <p className="text-xs text-slate-400">Thử tìm kiếm với từ khóa khác hoặc chuyển sang cấp độ khác</p>
                    </div>
                ) : (
                    <div className="space-y-6">
                        <div className="flex items-center justify-between text-xs font-bold text-slate-400 px-1">
                            <span>Hiển thị {Math.min(filteredPatterns.length, displayLimit)} / {filteredPatterns.length} mẫu câu tư duy</span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
                            {filteredPatterns.slice(0, displayLimit).map(item => {
                                const lvlColor = LEVEL_COLORS[item.level] || LEVEL_COLORS.N3;

                                return (
                                    <div
                                        key={item.rawKey}
                                        onClick={() => setSelectedPatternKey(item.rawKey)}
                                        className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-5 hover:border-indigo-500 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200 cursor-pointer flex flex-col justify-between group relative overflow-hidden"
                                    >
                                        <div className="space-y-3">
                                            {/* Header Tags */}
                                            <div className="flex items-center justify-between gap-2">
                                                <div className="flex items-center gap-2">
                                                    <span className={`px-2.5 py-0.5 rounded-lg text-[11px] font-black text-white ${lvlColor.bg}`}>
                                                        {item.level}
                                                    </span>
                                                    {item.reading && (
                                                        <span className="text-xs text-slate-400 font-japanese">
                                                            {item.reading}
                                                        </span>
                                                    )}
                                                </div>

                                                <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/60 flex items-center gap-1">
                                                    <Brain className="w-3 h-3" />
                                                    <span>{item.nodeCount} nhánh</span>
                                                </span>
                                            </div>

                                            {/* Pattern Title */}
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white font-japanese group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                                                        {item.pattern}
                                                    </h3>
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            speakText(item.pattern);
                                                        }}
                                                        className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-indigo-600 flex items-center justify-center transition-colors cursor-pointer"
                                                        title="Nghe phát âm mẫu câu"
                                                    >
                                                        <Volume2 className="w-3 h-3" />
                                                    </button>
                                                </div>

                                                {item.coreMeaning && (
                                                    <p className="text-xs font-semibold text-slate-600 dark:text-slate-300 mt-1 line-clamp-2">
                                                        💡 {item.coreMeaning}
                                                    </p>
                                                )}
                                            </div>

                                            {/* Preview Node / Definition */}
                                            {item.definition && (
                                                <p className="text-xs text-slate-500 dark:text-slate-400 font-normal leading-relaxed line-clamp-2 bg-slate-50 dark:bg-slate-950/60 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800/80">
                                                    {item.definition.replace(/\*\*/g, '')}
                                                </p>
                                            )}
                                        </div>

                                        {/* Bottom Action */}
                                        <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs font-bold text-indigo-600 dark:text-indigo-400">
                                            <span className="flex items-center gap-1">
                                                <span>Xem bản đồ tư duy</span>
                                                <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                                            </span>
                                            <ArrowUpRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-600" />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Load More Button */}
                        {filteredPatterns.length > displayLimit && (
                            <div className="text-center pt-4">
                                <button
                                    onClick={() => setDisplayLimit(prev => prev + 24)}
                                    className="px-6 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-indigo-500 text-slate-700 dark:text-slate-200 hover:text-indigo-600 font-bold text-xs sm:text-sm rounded-2xl shadow-xs transition-all cursor-pointer"
                                >
                                    Xem thêm 24 mẫu câu ({filteredPatterns.length - displayLimit} mẫu còn lại)
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Modal Detail for Active Mindmap */}
            {activePatternObj && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 animate-fade-in">
                    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl p-5 sm:p-7 space-y-6">
                        {/* Modal Header */}
                        <div className="flex items-start justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <span className={`px-2.5 py-0.5 rounded-lg text-xs font-black text-white ${LEVEL_COLORS[activePatternObj.level]?.bg || 'bg-indigo-600'}`}>
                                        {activePatternObj.level}
                                    </span>
                                    <span className="text-xs font-bold text-slate-500">
                                        {activePatternObj.nodeCount} nhánh phân tích sắc thái
                                    </span>
                                </div>
                                <h2 className="text-2xl sm:text-3xl font-black text-indigo-600 dark:text-indigo-400 font-japanese">
                                    {activePatternObj.pattern}
                                </h2>
                                {activePatternObj.coreMeaning && (
                                    <p className="text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-300 mt-1">
                                        💡 {activePatternObj.coreMeaning}
                                    </p>
                                )}
                            </div>

                            <button
                                onClick={() => setSelectedPatternKey(null)}
                                className="w-9 h-9 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-white flex items-center justify-center transition-colors cursor-pointer shrink-0"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Mindmap Card Component */}
                        <GrammarNuanceMindmapCard 
                            nuances={activePatternObj.nodes} 
                            pattern={activePatternObj.pattern} 
                        />
                    </div>
                </div>
            )}
        </div>
    );
};

export default GrammarNuancesScreen;
