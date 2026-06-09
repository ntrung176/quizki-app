import React from 'react';
import { X, ShieldAlert, Zap, Award, Sparkle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '../../router';

const PremiumLockedModal = ({ isOpen, onClose, pkgName = 'Premium' }) => {
    const navigate = useNavigate();

    if (!isOpen) return null;

    const handleUpgradeClick = () => {
        onClose();
        navigate(ROUTES.UPGRADE);
    };

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 animate-fade-in">
            {/* Backdrop with backdrop blur */}
            <div 
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-md transition-opacity duration-300"
                onClick={onClose}
            />

            {/* Modal Body */}
            <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl overflow-hidden shadow-2xl border border-slate-100 dark:border-slate-800 transition-all duration-300 transform scale-100 flex flex-col">
                {/* Background decorative glow */}
                <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 rounded-full blur-3xl -z-10" />
                <div className="absolute -bottom-10 -left-10 w-48 h-48 bg-gradient-to-tr from-sky-500/15 to-emerald-500/15 rounded-full blur-3xl -z-10" />

                {/* Close Button */}
                <button 
                    onClick={onClose}
                    className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors z-20 cursor-pointer"
                >
                    <X className="w-5 h-5" />
                </button>

                {/* Main Content */}
                <div className="p-8 text-center space-y-6">
                    {/* Icon Container with beautiful animations */}
                    <div className="relative w-20 h-20 mx-auto flex items-center justify-center">
                        <div className="absolute inset-0 bg-gradient-to-tr from-amber-500 to-rose-500 rounded-3xl opacity-20 blur-lg animate-pulse" />
                        <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-500 to-rose-500 flex items-center justify-center text-white shadow-xl shadow-amber-500/20">
                            <Sparkle className="w-8 h-8 animate-bounce" />
                        </div>
                    </div>

                    {/* Title */}
                    <div className="space-y-2">
                        <span className="inline-block px-3 py-1 text-[10px] font-black tracking-widest text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 rounded-full uppercase border border-amber-200/40">
                            Nội dung giới hạn
                        </span>
                        <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white leading-tight">
                            Yêu Cầu Gói Premium
                        </h3>
                    </div>

                    {/* Description */}
                    <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed max-w-sm mx-auto">
                        Bài học hoặc tính năng này được đánh dấu dành riêng cho hội viên <span className="font-bold text-slate-800 dark:text-slate-200">{pkgName}</span>. Nâng cấp ngay để mở khóa toàn bộ nội dung học tập không giới hạn!
                    </p>

                    {/* Perks List */}
                    <div className="bg-slate-50 dark:bg-slate-800/40 rounded-2xl p-4 border border-slate-100 dark:border-slate-800/80 text-left space-y-2.5 text-xs text-slate-600 dark:text-slate-300">
                        <div className="flex items-center gap-2">
                            <div className="w-4 h-4 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500 shrink-0">✓</div>
                            <span>Mở khoá toàn bộ các bài học, cấp độ Kanji & Ngữ pháp</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-4 h-4 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500 shrink-0">✓</div>
                            <span>Trọn bộ đề thi thử JLPT có giải thích chi tiết</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-4 h-4 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500 shrink-0">✓</div>
                            <span>Tự động phát âm, giải nghĩa ngữ cảnh bằng AI</span>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-col gap-2.5 pt-2">
                        <button
                            onClick={handleUpgradeClick}
                            className="w-full py-3.5 px-6 bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-600 hover:to-rose-600 text-white font-extrabold rounded-2xl transition-all duration-300 hover:shadow-lg hover:shadow-amber-500/25 active:scale-[0.98] cursor-pointer text-sm tracking-wide"
                        >
                            Nâng Cấp Tài Khoản
                        </button>
                        <button
                            onClick={onClose}
                            className="w-full py-3 px-6 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700/80 text-slate-600 dark:text-slate-350 font-bold rounded-2xl transition-all duration-200 cursor-pointer text-sm"
                        >
                            Để Sau
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PremiumLockedModal;
