import React, { useState, useEffect, useLayoutEffect, useRef, useCallback } from 'react';
import { Check, X, CornerDownLeft } from 'lucide-react';
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
                        className="w-full py-2.5 sm:py-3.5 pl-3.5 sm:pl-4.5 pr-24 sm:pr-28 rounded-xl sm:rounded-2xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 text-slate-850 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 font-medium text-sm sm:text-base md:text-lg focus:outline-none focus:border-blue-500 dark:focus:border-blue-400 focus:ring-4 focus:ring-blue-500/15 dark:focus:ring-blue-400/15 shadow-lg shadow-slate-200/50 dark:shadow-none transition-all cursor-text caret-blue-600 dark:caret-blue-400"
                    />
                    <div className="absolute right-2 flex items-center gap-1.5">
                        <button
                            type="submit"
                            className="px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-lg sm:rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-bold flex items-center gap-1.5 transition-all active:scale-95 shadow-md shadow-blue-600/20 cursor-pointer"
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

            {/* Hiển thị kết quả Đúng / Sai & Đáp án đúng trên cùng 1 hàng gọn gàng */}
            {hasChecked && (() => {
                const correctAnswer = diffResult?.primaryTarget || card?.reading || card?.front || card?.back || card?.meaning || card?.character || '';
                return (
                    <div
                        className={`w-full py-2 sm:py-2.5 px-3 sm:px-4 rounded-xl sm:rounded-2xl border flex items-center justify-between gap-2 shadow-sm animate-fade-in ${
                            diffResult?.isMatch
                                ? 'bg-emerald-50/90 dark:bg-emerald-950/40 border-emerald-200/80 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-200'
                                : 'bg-rose-50/90 dark:bg-rose-950/40 border-rose-200/80 dark:border-rose-800/60 text-rose-800 dark:text-rose-200'
                        }`}
                    >
                        {/* Bên trái: Trạng thái Đúng / Sai */}
                        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                            {diffResult?.isMatch ? (
                                <>
                                    <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
                                        <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-600 dark:text-emerald-400 stroke-[2.5]" />
                                    </div>
                                    <span className="font-extrabold text-xs sm:text-sm text-emerald-700 dark:text-emerald-300 whitespace-nowrap">Chính xác!</span>
                                </>
                            ) : (
                                <>
                                    <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-rose-500/20 flex items-center justify-center shrink-0">
                                        <X className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-rose-600 dark:text-rose-400 stroke-[2.5]" />
                                    </div>
                                    <span className="font-extrabold text-xs sm:text-sm text-rose-700 dark:text-rose-300 whitespace-nowrap">Chưa đúng</span>
                                </>
                            )}
                        </div>

                        {/* Ở giữa: Đáp án đúng */}
                        {correctAnswer && (
                            <div className="flex items-center gap-1.5 min-w-0 max-w-[50%] sm:max-w-[55%] text-xs sm:text-sm">
                                <span className="text-slate-400 dark:text-slate-500 font-medium text-[11px] sm:text-xs shrink-0">
                                    Đáp án:
                                </span>
                                <span
                                    className={`font-bold font-japanese truncate px-2 py-0.5 rounded-md ${
                                        diffResult?.isMatch
                                            ? 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-200 border border-emerald-500/20'
                                            : 'bg-rose-500/15 text-rose-800 dark:text-rose-200 border border-rose-500/20'
                                    }`}
                                    title={correctAnswer}
                                >
                                    {correctAnswer}
                                </span>
                            </div>
                        )}

                        {/* Bên phải: Phím tắt */}
                        <div className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1 shrink-0 ml-auto">
                            <span className="hidden md:inline">💡 Nhấn</span>
                            <kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-800 font-mono text-[9px] sm:text-[10px] font-bold text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 shadow-xs">
                                {diffResult?.isMatch ? '3 / Space' : '1 (Quên)'}
                            </kbd>
                            <span className="hidden lg:inline">để tiếp tục</span>
                        </div>
                    </div>
                );
            })()}
        </div>
    );
};

export default React.memo(SrsTypingInput);
