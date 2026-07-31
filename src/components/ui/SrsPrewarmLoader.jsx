import React from 'react';
import { Zap, Sparkles } from 'lucide-react';

/**
 * SrsPrewarmLoader - High-tech calculating & pre-warming screen before entering Card #1.
 * Prevents mobile UI freeze by ensuring WebKit AudioContext, Furigana parser, and card queues
 * are fully pre-warmed before transitioning to the active review card screen.
 */
const SrsPrewarmLoader = ({ title = "Từ Vựng", count = 0 }) => {
    return (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-900/90 backdrop-blur-md animate-fade-in text-white p-6">
            <div className="relative flex items-center justify-center mb-6">
                {/* Ambient pulsing glow rings */}
                <div className="absolute w-32 h-32 rounded-full bg-indigo-500/20 animate-ping" />
                <div className="absolute w-24 h-24 rounded-full bg-purple-500/30 animate-pulse" />
                <div className="relative w-20 h-20 bg-gradient-to-tr from-indigo-600 to-purple-600 rounded-3xl shadow-2xl flex items-center justify-center border border-white/20 animate-bounce">
                    <Zap className="w-10 h-10 text-amber-300 fill-amber-300 animate-pulse" />
                </div>
            </div>

            <h3 className="text-xl font-black tracking-wide text-center bg-gradient-to-r from-indigo-200 via-white to-purple-200 bg-clip-text text-transparent mb-2">
                Đang Tính Toán Dữ Liệu Ôn Tập {title}
            </h3>
            <p className="text-xs text-indigo-200/80 font-medium mb-6 text-center max-w-xs">
                Đang nạp âm thanh, Furigana & tối ưu {count} thẻ học...
            </p>

            {/* High-tech Loading Bar */}
            <div className="w-64 h-2 bg-slate-800 rounded-full overflow-hidden border border-slate-700/50 p-0.5 shadow-inner">
                <div className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-full animate-pulse w-full" />
            </div>

            <div className="flex items-center gap-1.5 mt-4 text-[11px] text-amber-300/90 font-mono">
                <Sparkles className="w-3.5 h-3.5 animate-spin" />
                <span>Đã sẵn sàng vào thẻ đầu tiên...</span>
            </div>
        </div>
    );
};

export default SrsPrewarmLoader;
