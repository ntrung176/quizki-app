import React from 'react';
import { RotateCcw } from 'lucide-react';

const KanaQuizCompletionView = ({ score, onRetry, onClose }) => {
    return (
        <div className="text-center space-y-4 py-3 animate-fade-in w-full max-w-sm">
            <div className="text-5xl animate-bounce">🏆</div>
            <div>
                <h3 className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white">
                    Xuất Sắc!
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 font-medium mt-1">
                    Bạn đã hoàn thành phiên luyện phản xạ chữ Kana!
                </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200/60 dark:border-emerald-800/60 flex items-center justify-around">
                <div className="text-center">
                    <span className="text-[11px] text-slate-500 font-bold block">Tổng điểm</span>
                    <span className="text-xl sm:text-2xl font-black text-sky-600 dark:text-sky-400">{score} pts</span>
                </div>
                <div className="h-7 w-px bg-emerald-200 dark:bg-emerald-800" />
                <div className="text-center">
                    <span className="text-[11px] text-slate-500 font-bold block">Thưởng XP</span>
                    <span className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400">+40 XP</span>
                </div>
            </div>

            <div className="flex gap-2.5 pt-1">
                <button
                    type="button"
                    onClick={onRetry}
                    className="flex-1 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border-b-4 border-slate-300 dark:border-slate-700 active:translate-y-0.5 active:border-b-2 font-black uppercase tracking-wider text-slate-700 dark:text-slate-200 text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer select-none"
                >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Luyện lại</span>
                </button>
                <button
                    type="button"
                    onClick={onClose}
                    className="flex-1 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 border-b-4 border-emerald-700 active:translate-y-0.5 active:border-b-0 text-white font-black uppercase tracking-wider text-xs transition-all cursor-pointer select-none"
                >
                    <span>Hoàn tất</span>
                </button>
            </div>
        </div>
    );
};

export default KanaQuizCompletionView;

