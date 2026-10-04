import React, { useState, useMemo } from 'react';
import { 
    Brain, Sparkles, Lightbulb, Compass, ChevronDown, ChevronUp, 
    Volume2, BookOpen, Layers, CheckCircle2, GitBranch,
    Zap, AlertTriangle, ArrowRight, ShieldAlert, Star
} from 'lucide-react';
import { speakExampleSentence } from '../../utils/audio';

const BRANCH_THEMES = [
    {
        id: 'core',
        title: 'Bản Chất Ý Nghĩa & Tâm Lý',
        subtitle: 'Bản chất cốt lõi & cảm xúc của người nói',
        icon: Brain,
        color: 'from-blue-600 to-indigo-600',
        badgeBg: 'bg-blue-600 text-white',
        borderActive: 'border-blue-500',
        lightBg: 'bg-blue-50 dark:bg-blue-950/30',
        textColor: 'text-blue-600 dark:text-blue-400',
        ringColor: 'ring-blue-500'
    },
    {
        id: 'structure',
        title: 'Công Thức & Cách Nối',
        subtitle: 'Quy tắc chia động từ, tính từ và danh từ',
        icon: Layers,
        color: 'from-cyan-500 to-teal-600',
        badgeBg: 'bg-teal-600 text-white',
        borderActive: 'border-teal-500',
        lightBg: 'bg-teal-50 dark:bg-teal-950/30',
        textColor: 'text-teal-600 dark:text-teal-400',
        ringColor: 'ring-teal-500'
    },
    {
        id: 'context',
        title: 'Bối Cảnh & Tình Huống Dùng',
        subtitle: 'Văn phong báo chí, hội thoại và đời sống',
        icon: Compass,
        color: 'from-emerald-500 to-green-600',
        badgeBg: 'bg-emerald-600 text-white',
        borderActive: 'border-emerald-500',
        lightBg: 'bg-emerald-50 dark:bg-emerald-950/30',
        textColor: 'text-emerald-600 dark:text-emerald-400',
        ringColor: 'ring-emerald-500'
    },
    {
        id: 'comparison',
        title: 'So Sánh & Phân Biệt Sắc Thái',
        subtitle: 'Đối chiếu với các mẫu câu tương tự dễ nhầm',
        icon: Zap,
        color: 'from-purple-600 to-fuchsia-600',
        badgeBg: 'bg-purple-600 text-white',
        borderActive: 'border-purple-500',
        lightBg: 'bg-purple-50 dark:bg-purple-950/30',
        textColor: 'text-purple-600 dark:text-purple-400',
        ringColor: 'ring-purple-500'
    },
    {
        id: 'traps',
        title: 'Bẫy Đề Thi & Lỗi Hay Gặp',
        subtitle: 'Những lưu ý quan trọng để không bị mất điểm',
        icon: AlertTriangle,
        color: 'from-rose-500 to-pink-600',
        badgeBg: 'bg-rose-600 text-white',
        borderActive: 'border-rose-500',
        lightBg: 'bg-rose-50 dark:bg-rose-950/30',
        textColor: 'text-rose-600 dark:text-rose-400',
        ringColor: 'ring-rose-500'
    },
    {
        id: 'tips',
        title: 'Mẹo Nhớ Nhanh & Cụm Đi Kèm',
        subtitle: 'Collocations và mẹo khắc sâu phản xạ',
        icon: Lightbulb,
        color: 'from-amber-500 to-orange-600',
        badgeBg: 'bg-amber-600 text-white',
        borderActive: 'border-amber-500',
        lightBg: 'bg-amber-50 dark:bg-amber-950/30',
        textColor: 'text-amber-600 dark:text-amber-400',
        ringColor: 'ring-amber-500'
    }
];

function categorizeNode(parentBranch) {
    if (!parentBranch) return 'core';
    const lower = parentBranch.toLowerCase();
    if (lower.includes('cốt lõi') || lower.includes('core')) return 'core';
    if (lower.includes('cấu trúc') || lower.includes('structure') || lower.includes('chia') || lower.includes('nối') || lower.includes('form')) return 'structure';
    if (lower.includes('cách dùng') || lower.includes('bối cảnh') || lower.includes('usage') || lower.includes('situation') || lower.includes('tình huống')) return 'context';
    if (lower.includes('phân biệt') || lower.includes('distinguish') || lower.includes('so sánh') || lower.includes('compare') || lower.includes('contrast')) return 'comparison';
    if (lower.includes('lỗi') || lower.includes('bẫy') || lower.includes('trap') || lower.includes('mistake') || lower.includes('error')) return 'traps';
    if (lower.includes('mẹo') || lower.includes('cụm') || lower.includes('tip') || lower.includes('phrase') || lower.includes('collocation')) return 'tips';
    return 'core';
}

const GrammarNuanceMindmapCard = ({ nuances = [], pattern = '' }) => {
    // Categorize raw nodes into the 6 main pedagogical themes
    const categorizedData = useMemo(() => {
        const map = {
            core: [],
            structure: [],
            context: [],
            comparison: [],
            traps: [],
            tips: []
        };

        nuances.forEach(node => {
            const cat = categorizeNode(node.parentBranch);
            if (!map[cat]) map[cat] = [];
            map[cat].push(node);
        });

        return map;
    }, [nuances]);

    // Available themes that actually have data
    const activeThemes = useMemo(() => {
        return BRANCH_THEMES.filter(t => (categorizedData[t.id]?.length || 0) > 0);
    }, [categorizedData]);

    const [selectedThemeId, setSelectedThemeId] = useState(() => activeThemes[0]?.id || 'core');
    const currentTheme = activeThemes.find(t => t.id === selectedThemeId) || activeThemes[0] || BRANCH_THEMES[0];
    const currentThemeNodes = categorizedData[currentTheme.id] || [];

    if (!nuances || nuances.length === 0) return null;

    const coreSummary = nuances[0]?.coreMeaning || '';

    return (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-indigo-100 dark:border-indigo-950/60 p-4 sm:p-7 shadow-sm space-y-6">
            
            {/* 1. Header Banner */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
                <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-700 to-purple-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-indigo-500/20">
                        <Brain className="w-6 h-6" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white tracking-tight">
                                Bản Đồ Tư Duy Ngữ Pháp
                            </h3>
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-900/50">
                                {activeThemes.length} Trục Tư Duy
                            </span>
                        </div>
                        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                            Hệ thống hóa toàn diện bản chất ngữ pháp, công thức, cách dùng và bẫy thi của <strong>{pattern}</strong>
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-center">
                    <button
                        type="button"
                        onClick={() => speakExampleSentence(pattern)}
                        className="px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/80 text-indigo-600 dark:text-indigo-300 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer border border-indigo-200/60 dark:border-indigo-900/60 shadow-xs"
                    >
                        <Volume2 className="w-4 h-4" />
                        <span>Phát âm mẫu câu</span>
                    </button>
                </div>
            </div>

            {/* 2. Visual Center Mindmap Hub (Gốc trung tâm) */}
            <div className="relative p-5 sm:p-6 rounded-3xl bg-gradient-to-br from-indigo-900 via-slate-900 to-slate-950 text-white border border-indigo-500/30 shadow-xl overflow-hidden space-y-3 text-center">
                <div className="absolute -right-8 -top-8 w-40 h-40 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />
                <div className="absolute -left-8 -bottom-8 w-40 h-40 bg-purple-500/10 rounded-full blur-2xl pointer-events-none" />

                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-[11px] font-black uppercase tracking-widest">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span>TRUNG TÂM BẢN ĐỒ TƯ DUY</span>
                </span>

                <h2 className="text-3xl sm:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-indigo-100 to-indigo-300 font-japanese">
                    {pattern}
                </h2>

                {coreSummary && (
                    <p className="text-xs sm:text-sm text-indigo-200 font-bold max-w-xl mx-auto leading-relaxed bg-white/5 border border-white/10 p-2.5 rounded-2xl backdrop-blur-xs">
                        💡 {coreSummary}
                    </p>
                )}
            </div>

            {/* 3. Mindmap Branch Selector Tabs (6 Trục tư duy lớn - Rõ ràng, không bị cắt chữ) */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-2.5">
                {activeThemes.map((theme) => {
                    const Icon = theme.icon;
                    const isSelected = selectedThemeId === theme.id;
                    const count = categorizedData[theme.id]?.length || 0;

                    return (
                        <button
                            key={theme.id}
                            onClick={() => setSelectedThemeId(theme.id)}
                            className={`p-3 rounded-2xl border text-left transition-all duration-200 cursor-pointer flex flex-col justify-between gap-2 active:scale-95 ${
                                isSelected
                                    ? `bg-gradient-to-br ${theme.color} text-white shadow-md ring-2 ring-offset-2 ${theme.ringColor} border-transparent`
                                    : 'bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700/80 text-slate-700 dark:text-slate-300 hover:border-indigo-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                            }`}
                        >
                            <div className="flex items-center justify-between w-full">
                                <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                                    isSelected ? 'bg-white/20' : theme.lightBg
                                }`}>
                                    <Icon className={`w-4 h-4 ${isSelected ? 'text-white' : theme.textColor}`} />
                                </div>
                                <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${
                                    isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-500'
                                }`}>
                                    {count} ý
                                </span>
                            </div>

                            <div>
                                <h4 className={`text-xs font-black leading-tight ${isSelected ? 'text-white' : 'text-slate-900 dark:text-white'}`}>
                                    {theme.title}
                                </h4>
                            </div>
                        </button>
                    );
                })}
            </div>

            {/* 4. Active Theme Content Explorer (Hiển thị ĐẦY ĐỦ NỘI DUNG, KHÔNG CẮT BỚT BẰNG ...) */}
            <div className="space-y-4 pt-2">
                {/* Theme Title Banner */}
                <div className="flex items-center justify-between gap-3 px-1">
                    <div className="flex items-center gap-2">
                        <span className={`w-3 h-3 rounded-full bg-gradient-to-r ${currentTheme.color}`} />
                        <h4 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                            {currentTheme.title}
                        </h4>
                    </div>
                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                        {currentThemeNodes.length} khía cạnh phân tích
                    </span>
                </div>

                {/* Theme Nodes List - Detailed, Rich Cards */}
                <div className="space-y-4">
                    {currentThemeNodes.map((node, idx) => (
                        <div
                            key={node.key || idx}
                            className="bg-slate-50/90 dark:bg-slate-950/70 border border-slate-200/90 dark:border-slate-800 rounded-2xl sm:rounded-3xl p-4 sm:p-6 space-y-4 shadow-2xs hover:border-indigo-400/80 transition-colors"
                        >
                            {/* Node Header */}
                            <div className="flex items-start justify-between gap-3">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className={`w-6 h-6 rounded-lg text-xs font-black flex items-center justify-center shrink-0 ${currentTheme.badgeBg}`}>
                                            {idx + 1}
                                        </span>
                                        <h5 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white">
                                            {node.title || node.pattern}
                                        </h5>
                                    </div>

                                    {node.coreMeaning && (
                                        <p className="text-xs sm:text-sm font-bold text-indigo-600 dark:text-indigo-400 pl-8">
                                            💡 {node.coreMeaning}
                                        </p>
                                    )}
                                </div>
                            </div>

                            {/* Node Definition / Detailed Explanation (Full text, no ...) */}
                            {node.definition && (
                                <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                                    <p className="whitespace-pre-line">
                                        {node.definition.replace(/\*\*/g, '')}
                                    </p>
                                </div>
                            )}

                            {/* Nuance Tips Alert Box */}
                            {node.nuanceTips && (
                                <div className="flex items-start gap-3 p-3.5 sm:p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 text-amber-900 dark:text-amber-200 text-xs leading-relaxed font-medium">
                                    <Lightbulb className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                                    <div>
                                        <span className="font-extrabold text-[11px] uppercase tracking-wider block text-amber-800 dark:text-amber-300 mb-0.5">
                                            Lưu ý sắc thái & Ngữ cảnh
                                        </span>
                                        <p>{node.nuanceTips}</p>
                                    </div>
                                </div>
                            )}

                            {/* Example Sentences */}
                            {node.examples && node.examples.length > 0 && (
                                <div className="space-y-2.5 pt-1">
                                    <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                                        <BookOpen className="w-3.5 h-3.5 text-indigo-500" />
                                        <span>Ví dụ thực tế:</span>
                                    </span>
                                    <div className="space-y-2">
                                        {node.examples.map((ex, exIdx) => (
                                            <div
                                                key={exIdx}
                                                className="p-3.5 sm:p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 flex items-start justify-between gap-3 group"
                                            >
                                                <div className="space-y-1 flex-1">
                                                    <p className="text-sm sm:text-base font-bold text-slate-900 dark:text-white font-japanese leading-relaxed">
                                                        {ex.japanese}
                                                    </p>
                                                    {ex.reading && ex.reading !== ex.japanese && (
                                                        <p className="text-xs text-slate-400 font-japanese font-medium">
                                                            {ex.reading}
                                                        </p>
                                                    )}
                                                    <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 font-medium pt-0.5">
                                                        {ex.meaning}
                                                    </p>
                                                </div>

                                                <button
                                                    onClick={() => speakExampleSentence(ex.japanese)}
                                                    className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-indigo-600 hover:text-white dark:hover:bg-indigo-600 transition text-slate-500 dark:text-slate-400 cursor-pointer shadow-xs shrink-0"
                                                    title="Nghe phát âm"
                                                >
                                                    <Volume2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default GrammarNuanceMindmapCard;
