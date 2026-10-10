import React from 'react';
import { Lightbulb, MessageCircle, AlertCircle } from 'lucide-react';

const MentalModelCard = ({ mentalModel, meaning, formality, speechType, explanation }) => {
    if (!mentalModel && !explanation && !meaning) return null;

    return (
        <div className="bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/20 rounded-2xl p-5 mb-6 backdrop-blur-md shadow-lg shadow-amber-500/5">
            {/* Header */}
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-amber-500/20 flex items-center justify-center text-amber-500 shadow-inner">
                        <Lightbulb className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                            Ý nghĩa & Công thức tâm lý
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Mental Model & Sắc thái sử dụng</p>
                    </div>
                </div>

                {/* Formality / Tone Tags */}
                <div className="flex items-center gap-2">
                    {speechType && (
                        <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                            {speechType}
                        </span>
                    )}
                    {formality && (
                        <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                            {formality}
                        </span>
                    )}
                </div>
            </div>

            {/* Core Meaning */}
            {meaning && (
                <div className="mb-3 text-sm font-semibold text-amber-700 dark:text-amber-300">
                    💡 {meaning}
                </div>
            )}

            {/* Explanation text */}
            {explanation && (
                <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed mb-4">
                    {explanation}
                </p>
            )}

            {/* Mental Model Callout Box */}
            {mentalModel && (
                <div className="bg-amber-500/15 border-l-4 border-amber-500 rounded-r-xl p-3.5 flex items-start gap-3">
                    <span className="text-lg select-none">🔑</span>
                    <div>
                        <div className="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400 mb-0.5">
                            Công thức tâm lý (Mental Model)
                        </div>
                        <div className="text-sm font-medium text-slate-800 dark:text-slate-200">
                            {mentalModel}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MentalModelCard;
