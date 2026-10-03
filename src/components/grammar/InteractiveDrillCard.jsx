import React, { useState } from 'react';
import { Target, HelpCircle, Eye, CheckCircle2, ChevronDown, ChevronUp } from 'lucide-react';

const InteractiveDrillCard = ({ exercises }) => {
    if (!exercises || exercises.length === 0) return null;

    // Track user revealed answers
    const [revealed, setRevealed] = useState({});
    const [showHints, setShowHints] = useState({});

    const toggleReveal = (idx) => {
        setRevealed(prev => ({ ...prev, [idx]: !prev[idx] }));
    };

    const toggleHint = (idx) => {
        setShowHints(prev => ({ ...prev, [idx]: !prev[idx] }));
    };

    return (
        <div className="bg-gradient-to-br from-blue-500/10 via-blue-500/5 to-transparent border border-blue-500/20 rounded-2xl p-5 mb-6 backdrop-blur-md shadow-sm">
            {/* Header */}
            <div className="flex items-center gap-2.5 mb-4">
                <div className="w-9 h-9 rounded-xl bg-blue-500/15 flex items-center justify-center text-blue-500">
                    <Target className="w-5 h-5" />
                </div>
                <div>
                    <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                        Luyện tập tương tác tại chỗ
                        <span className="text-sm">🎯</span>
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Tự kiểm tra kiến thức vừa học & xem đáp án giải thích</p>
                </div>
            </div>

            {/* Exercises List */}
            <div className="space-y-4">
                {exercises.map((ex, idx) => {
                    const isRevealed = !!revealed[idx];
                    const isHintShown = !!showHints[idx];

                    return (
                        <div
                            key={idx}
                            className="bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/80 rounded-xl p-4 shadow-sm"
                        >
                            {/* Question Kind Badge & Number */}
                            <div className="flex items-center justify-between gap-2 mb-2.5">
                                <div className="flex items-center gap-2">
                                    <span className="w-6 h-6 rounded-full bg-blue-500/15 text-blue-600 dark:text-blue-400 text-xs font-bold flex items-center justify-center">
                                        {idx + 1}
                                    </span>
                                    <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                                        {ex.kind === 'fill' ? 'Điền vào chỗ trống' : ex.kind === 'transform' ? 'Chuyển đổi câu' : 'Dịch câu'}
                                    </span>
                                </div>

                                {ex.hint && (
                                    <button
                                        onClick={() => toggleHint(idx)}
                                        className="text-xs text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1 font-medium"
                                    >
                                        <HelpCircle className="w-3.5 h-3.5" />
                                        {isHintShown ? 'Ẩn gợi ý' : 'Gợi ý'}
                                    </button>
                                )}
                            </div>

                            {/* Hint display */}
                            {isHintShown && ex.hint && (
                                <div className="mb-3 p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-800 dark:text-amber-300">
                                    💡 <strong>Gợi ý:</strong> {ex.hint}
                                </div>
                            )}

                            {/* Question Content */}
                            <div className="text-sm font-medium text-slate-800 dark:text-slate-100 font-japanese leading-relaxed mb-3">
                                {ex.q || (
                                    <div>
                                        {ex.from && <div className="mb-1"><strong>Gốc:</strong> {ex.from}</div>}
                                        {ex.vi && <div><strong>Dịch sang tiếng Nhật:</strong> {ex.vi}</div>}
                                    </div>
                                )}
                            </div>

                            {/* Actions & Answer */}
                            <div className="pt-2 border-t border-slate-100 dark:border-slate-700/60 flex flex-col gap-2">
                                <button
                                    onClick={() => toggleReveal(idx)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition self-start ${
                                        isRevealed
                                            ? 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200'
                                            : 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm'
                                    }`}
                                >
                                    <Eye className="w-3.5 h-3.5" />
                                    {isRevealed ? 'Ẩn đáp án' : 'Xem đáp án & Giải thích'}
                                </button>

                                {isRevealed && (
                                    <div className="mt-2 p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-sm animate-fadeIn">
                                        <div className="font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 mb-1.5 font-japanese">
                                            <CheckCircle2 className="w-4 h-4 shrink-0" />
                                            <span>
                                                {ex.answers ? ex.answers.join(' / ') : ex.to || ex.jp}
                                            </span>
                                        </div>
                                        {ex.explain && (
                                            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed pl-5 border-l-2 border-emerald-500/40">
                                                {ex.explain}
                                            </p>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default InteractiveDrillCard;
