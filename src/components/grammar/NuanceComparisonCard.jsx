import React from 'react';
import { Scale, ArrowRightLeft, Check, HelpCircle } from 'lucide-react';

const NuanceComparisonCard = ({ comparisons, title = "Phân biệt sắc thái & Mẫu câu tương tự" }) => {
    if (!comparisons || comparisons.length === 0) return null;

    return (
        <div className="bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 mb-6 backdrop-blur-md shadow-sm">
            {/* Header */}
            <div className="flex items-center gap-2.5 mb-4">
                <div className="w-9 h-9 rounded-xl bg-indigo-500/15 flex items-center justify-center text-indigo-500">
                    <Scale className="w-5 h-5" />
                </div>
                <div>
                    <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                        {title}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Trực quan hóa sự khác biệt giữa các cấu trúc dễ nhầm</p>
                </div>
            </div>

            {/* List / Table */}
            <div className="space-y-3">
                {comparisons.map((item, idx) => (
                    <div
                        key={idx}
                        className="bg-white dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 rounded-xl p-4 transition hover:border-indigo-500/30"
                    >
                        {/* Pattern Header */}
                        <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
                            <div className="flex items-center gap-2">
                                <span className="px-2.5 py-0.5 rounded-lg text-xs font-bold bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 font-mono">
                                    {item.pattern || item.lhs || `Mẫu ${idx + 1}`}
                                </span>
                                {item.formality && (
                                    <span className="text-xs text-slate-500 dark:text-slate-400">
                                        ({item.formality})
                                    </span>
                                )}
                            </div>
                            {item.level && (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                                    {item.level}
                                </span>
                            )}
                        </div>

                        {/* Distinction & Note */}
                        <div className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                            {item.note || item.distinction || item.explanation || item.rhs}
                        </div>

                        {/* Sample sentence if present */}
                        {item.sample && (
                            <div className="mt-2.5 pt-2.5 border-t border-slate-100 dark:border-slate-700/50 text-xs text-slate-600 dark:text-slate-400 font-mono">
                                💬 {item.sample}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default NuanceComparisonCard;
