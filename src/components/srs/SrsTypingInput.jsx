import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Check, X, ArrowRight, CornerDownLeft, Sparkles, AlertCircle } from 'lucide-react';
import { calculateAnkiDiff } from '../../utils/ankiDiff';
import { playCorrectSound, playIncorrectSound } from '../../utils/soundEffects';

const SrsTypingInput = ({
    card,
    isFlipped,
    onCheck,
    onFlip,
    isReversed = false,
    expectedLanguage = 'auto',
    onQuickRate,
    placeholder = 'Nhập câu trả lời (cách đọc / nghĩa)...'
}) => {
    const [input, setInput] = useState('');
    const [hasChecked, setHasChecked] = useState(false);
    const [diffResult, setDiffResult] = useState(null);
    const inputRef = useRef(null);

    // Reset input state khi chuyển sang thẻ mới
    useEffect(() => {
        setInput('');
        setHasChecked(false);
        setDiffResult(null);
        const timer = setTimeout(() => {
            if (inputRef.current) {
                inputRef.current.focus();
            }
        }, 100);
        return () => clearTimeout(timer);
    }, [card?.id, card?.character, card?.front]);

    // Xử lý nộp câu trả lời
    const handleSubmit = useCallback((e) => {
        if (e) e.preventDefault();
        if (hasChecked) return;

        const result = calculateAnkiDiff(input, card, { isReversed, expectedLanguage });
        setDiffResult(result);
        setHasChecked(true);

        if (result.isMatch) {
            try { playCorrectSound(); } catch (_) {}
        } else {
            try { playIncorrectSound(); } catch (_) {}
        }

        if (onCheck) {
            onCheck(result);
        }

        // Tự động lật thẻ để xem toàn bộ thông tin chi tiết nếu chưa lật
        if (!isFlipped && onFlip) {
            onFlip();
        }
    }, [input, card, isReversed, hasChecked, isFlipped, onFlip, onCheck]);

    // Lắng nghe phím Enter khi đang gõ
    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            if (!hasChecked) {
                handleSubmit();
            }
        }
    };

    return (
        <div className="w-full space-y-3.5 animate-fade-in" data-tour-id="SRS_TYPING_PANEL">
            {!hasChecked ? (
                /* Ô nhập liệu trước khi submit */
                <form onSubmit={handleSubmit} className="relative w-full">
                    <div className="relative flex items-center group">
                        <input
                            ref={inputRef}
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder={placeholder}
                            autoComplete="off"
                            autoCorrect="off"
                            autoCapitalize="off"
                            spellCheck="false"
                            className="w-full py-3.5 pl-4.5 pr-28 rounded-2xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 text-slate-850 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 font-medium text-base sm:text-lg focus:outline-none focus:border-indigo-500 dark:focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10 dark:focus:ring-indigo-400/10 shadow-lg shadow-slate-200/50 dark:shadow-none transition-all"
                        />
                        <div className="absolute right-2 flex items-center gap-1.5">
                            <button
                                type="submit"
                                className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-bold flex items-center gap-1.5 transition-all active:scale-95 shadow-md shadow-indigo-600/20 cursor-pointer"
                            >
                                <span>Kiểm tra</span>
                                <CornerDownLeft className="w-3.5 h-3.5 opacity-80" />
                            </button>
                        </div>
                    </div>
                    <p className="text-center text-[11px] text-slate-400 dark:text-slate-500 mt-2">
                        ⌨️ Gõ đáp án và nhấn <kbd className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono text-[10px] text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">Enter</kbd> để kiểm tra
                    </p>
                </form>
            ) : (
                /* Kết quả so sánh Diff Anki sau khi submit */
                <div className="w-full bg-white dark:bg-slate-900/90 rounded-2xl border-2 border-slate-200/80 dark:border-slate-800 p-4 sm:p-5 shadow-xl animate-fade-in space-y-3.5">
                    {/* Header kết quả */}
                    <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-2.5">
                        <div className="flex items-center gap-2">
                            {diffResult?.isMatch ? (
                                <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-extrabold text-sm sm:text-base">
                                    <div className="w-6 h-6 rounded-full bg-emerald-500/15 flex items-center justify-center">
                                        <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                                    </div>
                                    <span>Chính xác!</span>
                                </div>
                            ) : (
                                <div className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400 font-extrabold text-sm sm:text-base">
                                    <div className="w-6 h-6 rounded-full bg-rose-500/15 flex items-center justify-center">
                                        <X className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                                    </div>
                                    <span>Chưa chính xác</span>
                                </div>
                            )}
                        </div>
                        <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider font-mono">
                            ANKI TYPE DIFF
                        </span>
                    </div>

                    {/* Chi tiết So sánh ký tự */}
                    <div className="space-y-2 text-xs sm:text-sm">
                        {/* Bạn đã nhập */}
                        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/60 dark:border-slate-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                            <span className="text-slate-400 dark:text-slate-500 font-semibold text-xs shrink-0">Bạn đã nhập:</span>
                            <div className="font-mono text-base font-bold flex flex-wrap items-center gap-0.5">
                                {diffResult?.userTokens && diffResult.userTokens.length > 0 ? (
                                    diffResult.userTokens.map((token, idx) => (
                                        <span
                                            key={idx}
                                            className={`px-1 py-0.5 rounded ${
                                                token.type === 'correct'
                                                    ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                                                    : 'bg-rose-500/20 text-rose-600 dark:text-rose-400 line-through'
                                            }`}
                                        >
                                            {token.char}
                                        </span>
                                    ))
                                ) : (
                                    <span className="text-slate-400 italic text-xs">(bỏ trống)</span>
                                )}
                            </div>
                        </div>

                        {/* Đáp án chuẩn */}
                        <div className="p-3 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/30 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                            <span className="text-indigo-600 dark:text-indigo-400 font-semibold text-xs shrink-0">Đáp án chuẩn:</span>
                            <div className="font-mono text-base font-bold flex flex-wrap items-center gap-0.5">
                                {diffResult?.targetTokens?.map((token, idx) => (
                                    <span
                                        key={idx}
                                        className={`px-1 py-0.5 rounded ${
                                            token.type === 'correct'
                                                ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                                                : 'bg-sky-500/20 text-sky-600 dark:text-sky-400 underline'
                                        }`}
                                    >
                                        {token.char}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Gợi ý đánh giá SRS */}
                    <div className="pt-1 text-center">
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                            💡 Nhấn phím <kbd className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono text-[10px] text-indigo-600 dark:text-indigo-400 font-bold border border-slate-200 dark:border-slate-700">{diffResult?.isMatch ? '3 (Tốt) hoặc Space' : '1 (Quên rồi)'}</kbd> hoặc bấm nút bên dưới để tiếp tục
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SrsTypingInput;
