import React from 'react';
import { createPortal } from 'react-dom';
import { Layers, Keyboard, X, Sparkles, CheckCircle2, ChevronRight, Zap } from 'lucide-react';

const SrsModeSelectModal = ({
    isOpen,
    onClose,
    onSelectMode,
    cardCount = 0,
    title = 'Chọn chế độ ôn tập',
    subtitle = 'Lựa chọn phương pháp ôn tập phù hợp với bạn'
}) => {
    if (!isOpen) return null;

    const handleSelect = (mode) => {
        onSelectMode(mode);
        onClose();
    };

    return createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" onClick={onClose}>
            {/* Backdrop */}
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-fade-in" />

            {/* Modal Content */}
            <div
                className="relative bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-md p-6 sm:p-7 space-y-6 border border-slate-200 dark:border-slate-800 animate-scale-in text-slate-850 dark:text-slate-100 z-10"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-start justify-between">
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                                <Sparkles className="w-5 h-5" />
                            </span>
                            <h3 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white">
                                {title}
                            </h3>
                        </div>
                        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1.5 font-medium">
                            {subtitle} {cardCount > 0 && <span className="font-bold text-indigo-600 dark:text-indigo-400">({cardCount} thẻ)</span>}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* 2 Options */}
                <div className="space-y-3.5">
                    {/* Option 1: Flashcard */}
                    <button
                        onClick={() => handleSelect('flashcard')}
                        className="w-full text-left p-4 sm:p-4.5 rounded-2xl border-2 border-slate-200/80 dark:border-slate-800 hover:border-indigo-500 dark:hover:border-indigo-500 bg-white dark:bg-slate-850 hover:bg-indigo-50/30 dark:hover:bg-indigo-950/30 transition-all duration-200 flex items-center gap-4 group cursor-pointer shadow-sm hover:shadow-md active:scale-[0.98]"
                    >
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-sky-500 text-white flex items-center justify-center shrink-0 shadow-md group-hover:scale-105 transition-transform">
                            <Layers className="w-6 h-6" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                                <span className="font-extrabold text-base text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                                    Lật thẻ ghi nhớ
                                </span>
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                                    Nhanh gọn
                                </span>
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed line-clamp-2">
                                Xem câu hỏi, tự nhẩm và lật mặt sau thẻ để đối chiếu đáp án.
                            </p>
                        </div>
                        <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors shrink-0" />
                    </button>

                    {/* Option 2: Anki Typing */}
                    <button
                        onClick={() => handleSelect('typing')}
                        className="w-full text-left p-4 sm:p-4.5 rounded-2xl border-2 border-slate-200/80 dark:border-slate-800 hover:border-emerald-500 dark:hover:border-emerald-500 bg-white dark:bg-slate-850 hover:bg-emerald-50/30 dark:hover:bg-emerald-950/30 transition-all duration-200 flex items-center gap-4 group cursor-pointer shadow-sm hover:shadow-md active:scale-[0.98]"
                    >
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center shrink-0 shadow-md group-hover:scale-105 transition-transform">
                            <Keyboard className="w-6 h-6" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                                <span className="font-extrabold text-base text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                                    Gõ câu trả lời (Typing)
                                </span>
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                                    Nhớ sâu
                                </span>
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed line-clamp-2">
                                Nhìn nghĩa tiếng Việt, gõ từ (chấp nhận cả Kanji & Hiragana) và so sánh diff từng ký tự.
                            </p>
                        </div>
                        <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors shrink-0" />
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default SrsModeSelectModal;
