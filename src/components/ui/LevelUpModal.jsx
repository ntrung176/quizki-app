import React from 'react';
import { Trophy } from 'lucide-react';

const LevelUpModal = ({ levelUpInfo, onClose }) => {
    if (!levelUpInfo) return null;

    return (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-lg z-[9999] flex items-center justify-center p-4 animate-fade-in">
            <div className="relative bg-gradient-to-b from-slate-900 via-indigo-950 to-slate-900 border border-indigo-500/40 rounded-3xl shadow-[0_20px_50px_rgba(99,102,241,0.4),_inset_0_1px_0_rgba(255,255,255,0.1)] max-w-sm w-full p-8 text-center overflow-visible scale-100 animate-scale-up">

                {/* Floating/rotating glow element behind */}
                <div className="absolute -inset-1 bg-gradient-to-r from-pink-500 via-sky-500 to-indigo-500 rounded-[26px] blur-2xl opacity-40 animate-pulse -z-10" />

                {/* Celebration sparkles */}
                <div className="absolute inset-0 pointer-events-none opacity-40">
                    <span className="absolute top-4 left-6 text-2xl animate-bounce">✨</span>
                    <span className="absolute top-12 right-6 text-xl animate-ping">⭐</span>
                    <span className="absolute bottom-12 left-4 text-2xl animate-bounce">🎉</span>
                    <span className="absolute bottom-6 right-8 text-xl animate-pulse">✨</span>
                </div>

                {/* Trophy Container */}
                <div className="relative flex justify-center mb-8">
                    <div className="relative">
                        <div className="absolute inset-0 bg-gradient-to-tr from-amber-400 to-yellow-300 rounded-full blur-2xl opacity-75 animate-ping" />
                        <div className="relative bg-gradient-to-tr from-amber-500 via-yellow-400 to-orange-500 p-6 rounded-full border-4 border-yellow-300 shadow-[0_15px_30px_rgba(245,158,11,0.5)] transform hover:scale-110 hover:rotate-6 transition-all duration-300">
                            <Trophy className="w-16 h-16 text-white stroke-[2.5] drop-shadow-[0_4px_8px_rgba(0,0,0,0.3)]" />
                        </div>
                    </div>
                </div>

                {/* Level badge circle */}
                <div className="inline-flex items-center justify-center w-32 h-32 rounded-full bg-slate-950/90 border-4 border-yellow-400 shadow-[0_10px_25px_rgba(0,0,0,0.5),_inset_0_2px_4px_rgba(255,255,255,0.1)] mb-6">
                    <div className="text-center">
                        <span className="block text-[10px] font-black text-amber-400 uppercase tracking-widest leading-none mb-1">CẤP ĐỘ</span>
                        <span className="block text-5xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white via-slate-100 to-slate-400 leading-none drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">
                            {levelUpInfo.level}
                        </span>
                    </div>
                </div>

                {/* Content Section */}
                <div className="space-y-3 mb-8">
                    <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-100 to-amber-400 tracking-wide uppercase drop-shadow-md">
                        Thăng Cấp!
                    </h2>
                    <p className="text-indigo-200 text-[10px] font-black uppercase tracking-widest leading-none">
                        Danh hiệu mới của bạn:
                    </p>
                    <div className="relative inline-block mt-2">
                        <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-2xl blur opacity-30 animate-pulse" />
                        <h3 className="relative text-xl font-extrabold text-emerald-400 bg-slate-950/80 border border-emerald-500/30 px-6 py-2.5 rounded-2xl tracking-wide">
                            🛡️ {levelUpInfo.title}
                        </h3>
                    </div>
                    <p className="text-slate-400 text-xs mt-4 leading-relaxed px-2">
                        Chúc mừng bạn đã chinh phục cột mốc mới! Tiếp tục tích lũy XP để mở khóa thêm nhiều đặc quyền hấp dẫn.
                    </p>
                </div>

                {/* Button */}
                <button
                    onClick={onClose}
                    className="w-full py-4 px-6 font-black text-sm uppercase tracking-wider rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-yellow-500 hover:from-amber-600 hover:via-orange-600 hover:to-yellow-600 text-white shadow-[0_6px_20px_rgba(245,158,11,0.3)] hover:shadow-[0_8px_25px_rgba(245,158,11,0.5)] transform hover:scale-[1.03] active:scale-[0.97] transition-all duration-200 outline-none cursor-pointer border border-yellow-400/20"
                >
                    Tuyệt vời! Tiếp tục
                </button>
            </div>
        </div>
    );
};

export default LevelUpModal;
