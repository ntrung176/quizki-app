import React, { useState, useEffect, useLayoutEffect, useRef, useCallback } from 'react';
import { Check, X, ArrowRight, CornerDownLeft, Sparkles, AlertCircle } from 'lucide-react';
import { calculateAnkiDiff, transformVietnameseTelex } from '../../utils/ankiDiff';
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

    // Kích hoạt con trỏ chuột đa tầng (0ms, 40ms, 120ms, 250ms) đảm bảo 100% con trỏ luôn nhấp nháy trong ô nhập
    useLayoutEffect(() => {
        setInput('');
        setHasChecked(false);
        setDiffResult(null);
        if (inputRef.current) {
            inputRef.current.value = '';
            inputRef.current.focus({ preventScroll: true });
        }
    }, [card?.id, card?.character, card?.front]);

    useEffect(() => {
        const focusInput = () => {
            if (inputRef.current && !hasChecked) {
                inputRef.current.focus({ preventScroll: true });
            }
        };
        focusInput();
        const t1 = setTimeout(focusInput, 40);
        const t2 = setTimeout(focusInput, 120);
        const t3 = setTimeout(focusInput, 250);
        return () => {
            clearTimeout(t1);
            clearTimeout(t2);
            clearTimeout(t3);
        };
    }, [card?.id, card?.character, card?.front, hasChecked]);

    // Xử lý nộp câu trả lời
    const handleSubmit = useCallback((e) => {
        if (e) e.preventDefault();
        if (hasChecked) return;

        const result = calculateAnkiDiff(input, card, { isReversed, expectedLanguage });
        setDiffResult(result);
        setHasChecked(true);

        if (result.isMatch) {
            try { playCorrectSound(); } catch (_) { }
        } else {
            try { playIncorrectSound(); } catch (_) { }
        }

        if (onCheck) {
            onCheck(result);
        }

        // Tự động lật thẻ để xem toàn bộ thông tin chi tiết
        if (onFlip) {
            onFlip();
        }
    }, [input, card, isReversed, hasChecked, onFlip, onCheck]);

    const isComposingRef = useRef(false);

    // Xử lý thay đổi input với bộ chuyển đổi Telex thời gian thực (Realtime Telex Engine)
    const handleChange = (e) => {
        const rawVal = e.target.value;
        const isVietnameseTarget = expectedLanguage === 'sino' || expectedLanguage === 'vi' || (!isReversed && expectedLanguage === 'auto');

        if (isVietnameseTarget && !isComposingRef.current) {
            const transformed = transformVietnameseTelex(rawVal);
            setInput(transformed);
        } else {
            setInput(rawVal);
        }
    };

    // Lắng nghe phím Enter khi đang gõ (tránh nuốt phím khi đang gõ tiếng Việt Telex/VNI IME)
    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            if (e.nativeEvent?.isComposing || e.isComposing || isComposingRef.current || e.keyCode === 229) {
                return;
            }
            e.preventDefault();
            if (!hasChecked) {
                handleSubmit();
            }
        }
    };

    return (
        <div className="w-full space-y-2.5 sm:space-y-3.5 animate-fade-in" data-tour-id="SRS_TYPING_PANEL">
            {/* Form nhập liệu: Luôn duy trì trong DOM để giữ con trỏ chuột và hook Unikey liên tục 100% thời gian */}
            <form onSubmit={handleSubmit} className={`relative w-full ${hasChecked ? 'hidden' : 'block'}`}>
                <div className="relative flex items-center group">
                    <input
                        ref={inputRef}
                        type="text"
                        value={input}
                        onChange={handleChange}
                        onKeyDown={handleKeyDown}
                        onCompositionStart={() => { isComposingRef.current = true; }}
                        onCompositionEnd={(e) => {
                            isComposingRef.current = false;
                            const isVietnameseTarget = expectedLanguage === 'sino' || expectedLanguage === 'vi' || (!isReversed && expectedLanguage === 'auto');
                            if (isVietnameseTarget) {
                                const transformed = transformVietnameseTelex(e.target.value);
                                setInput(transformed);
                            }
                        }}
                        placeholder={placeholder}
                        autoComplete="off"
                        className="w-full py-2.5 sm:py-3.5 pl-3.5 sm:pl-4.5 pr-24 sm:pr-28 rounded-xl sm:rounded-2xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 text-slate-850 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 font-medium text-sm sm:text-base md:text-lg focus:outline-none focus:border-indigo-500 dark:focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/15 dark:focus:ring-indigo-400/15 shadow-lg shadow-slate-200/50 dark:shadow-none transition-all cursor-text caret-indigo-600 dark:caret-indigo-400"
                    />
                    <div className="absolute right-2 flex items-center gap-1.5">
                        <button
                            type="submit"
                            className="px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-lg sm:rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-bold flex items-center gap-1.5 transition-all active:scale-95 shadow-md shadow-indigo-600/20 cursor-pointer"
                        >
                            <span>Kiểm tra</span>
                            <CornerDownLeft className="w-3.5 h-3.5 opacity-80" />
                        </button>
                    </div>
                </div>
                <p className="text-center text-[10px] sm:text-[11px] text-slate-400 dark:text-slate-500 mt-1.5">
                    ⌨️ Gõ đáp án và nhấn <kbd className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono text-[9px] sm:text-[10px] text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">Enter</kbd> để kiểm tra
                </p>
            </form>

            {/* Kết quả so sánh Diff Anki sau khi submit */}
            {hasChecked && (
                <div className="w-full bg-white dark:bg-slate-900/90 rounded-2xl border-2 border-slate-200/80 dark:border-slate-800 p-3 sm:p-4 md:p-5 shadow-xl animate-fade-in space-y-2.5 sm:space-y-3.5">
                    {/* Header kết quả */}
                    <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-2 sm:pb-2.5">
                        <div className="flex items-center gap-2">
                            {diffResult?.isMatch ? (
                                <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-extrabold text-xs sm:text-sm md:text-base">
                                    <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-emerald-500/15 flex items-center justify-center">
                                        <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-600 dark:text-emerald-400" />
                                    </div>
                                    <span>Chính xác!</span>
                                </div>
                            ) : (
                                <div className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400 font-extrabold text-xs sm:text-sm md:text-base">
                                    <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-rose-500/15 flex items-center justify-center">
                                        <X className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-rose-600 dark:text-rose-400" />
                                    </div>
                                    <span>Chưa chính xác</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Chi tiết So sánh ký tự */}
                    <div className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm">
                        {/* Bạn đã nhập */}
                        <div className="p-2 sm:p-2.5 md:p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/60 dark:border-slate-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-1.5">
                            <span className="text-slate-400 dark:text-slate-500 font-semibold text-[11px] sm:text-xs shrink-0">Bạn đã nhập:</span>
                            <div className="font-mono text-sm sm:text-base font-bold flex flex-wrap items-center gap-0.5">
                                {diffResult?.userTokens && diffResult.userTokens.length > 0 ? (
                                    diffResult.userTokens.map((token, idx) => (
                                        <span
                                            key={idx}
                                            className={`px-1 py-0.2 rounded ${token.type === 'correct'
                                                    ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                                                    : 'bg-rose-500/20 text-rose-600 dark:text-rose-400 line-through'
                                                }`}
                                        >
                                            {token.char}
                                        </span>
                                    ))
                                ) : (
                                    <span className="text-slate-400 italic text-[11px] sm:text-xs">(bỏ trống)</span>
                                )}
                            </div>
                        </div>

                        {/* Đáp án chuẩn */}
                        <div className="p-2 sm:p-2.5 md:p-3 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/30 flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-1.5">
                            <span className="text-indigo-600 dark:text-indigo-400 font-semibold text-[11px] sm:text-xs shrink-0">Đáp án chuẩn:</span>
                            <div className="font-mono text-sm sm:text-base font-bold flex flex-wrap items-center gap-0.5">
                                {diffResult?.targetTokens?.map((token, idx) => (
                                    <span
                                        key={idx}
                                        className={`px-1 py-0.2 rounded ${token.type === 'correct'
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
                    <div className="pt-0.5 text-center">
                        <p className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400">
                            💡 Nhấn phím <kbd className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono text-[9px] sm:text-[10px] text-indigo-600 dark:text-indigo-400 font-bold border border-slate-200 dark:border-slate-700">{diffResult?.isMatch ? '3 (Tốt) hoặc Space' : '1 (Quên rồi)'}</kbd> hoặc bấm nút bên dưới để tiếp tục
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default React.memo(SrsTypingInput);
