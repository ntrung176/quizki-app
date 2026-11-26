import React, { useState, useRef, useEffect } from 'react';
import { Lightbulb, Keyboard } from 'lucide-react';

/**
 * Duolingo-style Typing Exercise Renderer
 * Supports Hiragana/Kanji/Hán-Việt input with optional hint reveal.
 */
const RoadmapTypingQuestion = ({
    value = '',
    onChange,
    hint = '',
    answerStatus = null,
    onSubmitEnter
}) => {
    const [showHint, setShowHint] = useState(false);
    const inputRef = useRef(null);

    useEffect(() => {
        setShowHint(false);
        const timer = setTimeout(() => {
            inputRef.current?.focus();
        }, 80);
        return () => clearTimeout(timer);
    }, [hint]);

    return (
        <div className="space-y-3 pt-1">
            <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                    <Keyboard className="w-5 h-5" />
                </div>
                <input
                    ref={inputRef}
                    type="text"
                    value={value}
                    disabled={!!answerStatus}
                    onChange={(e) => onChange(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && value.trim() && !answerStatus && onSubmitEnter) {
                            e.preventDefault();
                            onSubmitEnter();
                        }
                    }}
                    placeholder="Nhập câu trả lời bằng tiếng Nhật hoặc âm Hán Việt..."
                    className={`w-full pl-12 pr-4 py-4 rounded-2xl border-2 border-b-4 text-base sm:text-lg font-bold transition-all focus:outline-none ${
                        answerStatus === 'correct'
                            ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 text-emerald-800 dark:text-emerald-200'
                            : answerStatus === 'incorrect'
                            ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-500 text-rose-800 dark:text-rose-200'
                            : 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 focus:border-sky-500 dark:focus:border-sky-500 text-slate-900 dark:text-white'
                    }`}
                />
            </div>

            {hint && !answerStatus && (
                <div className="flex items-center justify-between gap-2 px-1">
                    <button
                        type="button"
                        onClick={() => setShowHint((prev) => !prev)}
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-600 dark:text-amber-400 hover:underline cursor-pointer"
                    >
                        <Lightbulb className="w-3.5 h-3.5" />
                        <span>{showHint ? 'Ẩn gợi ý' : 'Xem gợi ý chữ đầu'}</span>
                    </button>
                    {showHint && (
                        <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                            Gợi ý: {hint.slice(0, Math.max(2, Math.ceil(hint.length / 2)))}...
                        </span>
                    )}
                </div>
            )}
        </div>
    );
};

export default RoadmapTypingQuestion;
