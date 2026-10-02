import React from 'react';
import { X, BookOpen, Sparkles, CheckCircle2, AlertTriangle, ArrowRight, Layers, Target, Compass } from 'lucide-react';
import { formatFuriganaRuby } from './JLPTDrillsTab';

const JLPTStrategyModal = ({
    isOpen,
    onClose,
    strategy,
    bai,
    level = 'N5',
    title
}) => {
    if (!isOpen || !strategy) return null;

    const { intro, steps = [], tips = [], grammarFocus = [], reviewFrom = [] } = strategy;

    return (
        <div className="fixed inset-0 z-[100] bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 animate-fade-in font-sans">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
                
                {/* 1. Header */}
                <div className="p-5 sm:p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-indigo-50/60 via-white to-sky-50/60 dark:from-slate-800 dark:to-slate-800 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-600/20 shrink-0">
                            <BookOpen className="w-5 h-5" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-400 border border-indigo-200/50">
                                    JLPT {level}
                                </span>
                                <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                                    Đề cương bài học #{bai}
                                </span>
                            </div>
                            <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white mt-0.5">
                                {(title || `Chiến lược & Đề cương Ôn tập Bài ${bai}`).normalize('NFC')}
                            </h3>
                        </div>
                    </div>

                    <button
                        onClick={onClose}
                        className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition cursor-pointer"
                        title="Đóng (Esc)"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* 2. Scrollable Body */}
                <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6 custom-scrollbar">
                    
                    {/* Intro Section */}
                    {intro && (
                        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-indigo-50/80 to-sky-50/50 dark:from-indigo-950/30 dark:to-sky-950/20 border border-indigo-100 dark:border-indigo-900/50 space-y-2">
                            <div className="flex items-center gap-2 text-xs font-black text-indigo-700 dark:text-indigo-400 uppercase tracking-wider">
                                <Target className="w-4 h-4" />
                                <span>Mục tiêu & Trọng tâm cốt lõi</span>
                            </div>
                            <p 
                                className="text-xs sm:text-sm text-slate-800 dark:text-slate-200 leading-relaxed font-medium"
                                dangerouslySetInnerHTML={{ __html: formatFuriganaRuby(intro) }}
                            />
                        </div>
                    )}

                    {/* Grammar Focus Pills */}
                    {grammarFocus && grammarFocus.length > 0 && (
                        <div className="space-y-2.5">
                            <div className="flex items-center gap-1.5 text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                                <Sparkles className="w-4 h-4 text-amber-500" />
                                <span>Ngữ pháp then chốt</span>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {grammarFocus.map((g, idx) => (
                                    <div
                                        key={idx}
                                        className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 text-xs sm:text-sm font-japanese font-bold text-slate-900 dark:text-white flex items-center gap-2"
                                    >
                                        <span className="w-2 h-2 rounded-full bg-indigo-500 shrink-0" />
                                        <span dangerouslySetInnerHTML={{ __html: formatFuriganaRuby(g) }} />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Steps Section */}
                    {steps && steps.length > 0 && (
                        <div className="space-y-3">
                            <div className="flex items-center gap-1.5 text-xs font-black text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
                                <Compass className="w-4 h-4 text-emerald-600" />
                                <span>Các bước giải quyết dạng bài</span>
                            </div>
                            <div className="space-y-2">
                                {steps.map((step, idx) => (
                                    <div
                                        key={idx}
                                        className="p-3.5 rounded-xl bg-white dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 flex items-start gap-3 shadow-xs"
                                    >
                                        <span className="w-6 h-6 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 font-black text-xs flex items-center justify-center shrink-0 mt-0.5">
                                            {idx + 1}
                                        </span>
                                        <p 
                                            className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-medium"
                                            dangerouslySetInnerHTML={{ __html: formatFuriganaRuby(step) }}
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Tips & Traps */}
                    {tips && tips.length > 0 && (
                        <div className="space-y-3">
                            <div className="flex items-center gap-1.5 text-xs font-black text-amber-700 dark:text-amber-400 uppercase tracking-wider">
                                <AlertTriangle className="w-4 h-4 text-amber-500" />
                                <span>Mẹo phân biệt & Bẫy thường gặp</span>
                            </div>
                            <div className="space-y-2">
                                {tips.map((tip, idx) => (
                                    <div
                                        key={idx}
                                        className="p-3.5 rounded-xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/40 text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-medium flex items-start gap-2.5"
                                    >
                                        <span className="text-amber-600 dark:text-amber-400 font-bold shrink-0">💡</span>
                                        <span dangerouslySetInnerHTML={{ __html: formatFuriganaRuby(tip) }} />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Review From Previous Lessons */}
                    {reviewFrom && reviewFrom.length > 0 && (
                        <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                            <div className="flex items-center gap-1.5 text-xs font-black text-sky-700 dark:text-sky-400 uppercase tracking-wider">
                                <Layers className="w-4 h-4 text-sky-600" />
                                <span>Ôn tập liên kết kiến thức</span>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                {reviewFrom.map((rev, idx) => (
                                    <div
                                        key={idx}
                                        className="p-3 rounded-xl bg-sky-50/40 dark:bg-sky-950/20 border border-sky-100 dark:border-sky-900/40 space-y-1.5"
                                    >
                                        <div className="text-xs font-black text-sky-800 dark:text-sky-300">
                                            Bài #{rev.bai}
                                        </div>
                                        <ul className="text-xs text-slate-600 dark:text-slate-400 space-y-1">
                                            {(rev.items || []).map((it, itIdx) => (
                                                <li key={itIdx} className="flex items-center gap-1.5 font-japanese">
                                                    <span className="w-1 h-1 rounded-full bg-sky-400" />
                                                    <span dangerouslySetInnerHTML={{ __html: formatFuriganaRuby(it) }} />
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* 3. Footer */}
                <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex justify-end bg-slate-50/50 dark:bg-slate-900/50 shrink-0">
                    <button
                        onClick={onClose}
                        className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-md shadow-indigo-600/20 transition cursor-pointer"
                    >
                        Đã hiểu đề cương
                    </button>
                </div>
            </div>
        </div>
    );
};

export default JLPTStrategyModal;
