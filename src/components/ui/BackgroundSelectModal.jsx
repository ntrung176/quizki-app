import React, { useEffect } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { X, Check, Sliders, Image, Moon, Sun } from 'lucide-react';
import { useAppBackground, BG_THEMES, BG_THEME_LIST } from '../../hooks/useAppBackground';

export default function BackgroundSelectModal({ isOpen, onClose, isDarkMode }) {
    const { t } = useLanguage();
    const { bgTheme, isAnimated, setBgTheme, setIsAnimated } = useAppBackground();

    // Close on Escape key
    useEffect(() => {
        if (!isOpen) return;
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/70 backdrop-blur-md animate-fade-in select-none">
            <div
                className="relative w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-rose-600 text-white flex items-center justify-center shadow-md shadow-red-500/20">
                            <span className="text-xl">⛩️</span>
                        </div>
                        <div>
                            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                {t('settings.general.bgThemeTitle', 'Hình nền không gian học tập')}
                            </h2>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                {t('settings.general.bgThemeSub', 'Chọn phong cách Cổng đỏ Nhật Bản hoặc nền công nghệ')}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                        title="Đóng"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body - Grid of Background Theme Cards */}
                <div className="p-6 space-y-6 overflow-y-auto">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {BG_THEME_LIST.map((item) => {
                            const isSelected = bgTheme === item.id;
                            return (
                                <div
                                    key={item.id}
                                    onClick={() => setBgTheme(item.id)}
                                    className={`relative rounded-xl border-2 p-4 cursor-pointer transition-all flex flex-col justify-between group overflow-hidden ${
                                        isSelected
                                            ? 'border-red-500 bg-red-50/40 dark:bg-red-950/20 shadow-md ring-2 ring-red-500/20'
                                            : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-800/40'
                                    }`}
                                >
                                    {/* Preview Banner Graphic */}
                                    <div className={`h-24 w-full rounded-lg mb-3 relative overflow-hidden bg-gradient-to-br ${item.gradient} border border-slate-700/20 flex items-center justify-center shadow-inner`}>
                                        {/* Visual Graphic Representation */}
                                        {item.id === BG_THEMES.TORII_STARS && (
                                            <div className="relative w-full h-full flex items-center justify-center">
                                                {/* Mini Moon */}
                                                <div className="absolute top-2 right-4 w-5 h-5 rounded-full bg-amber-200/90 shadow-[0_0_10px_rgba(254,243,199,0.5)]" />
                                                {/* Mini Stars */}
                                                <div className="absolute top-3 left-6 w-1 h-1 rounded-full bg-white opacity-80" />
                                                <div className="absolute top-6 left-1/3 w-1 h-1 rounded-full bg-white opacity-70" />
                                                <div className="absolute top-4 right-1/3 w-1.5 h-1.5 rounded-full bg-white opacity-90" />
                                                {/* Mini Mt. Fuji */}
                                                <div className="absolute bottom-0 inset-x-0 flex justify-center opacity-70">
                                                    <div className="w-24 h-10 border-b-[20px] border-b-slate-900 border-x-[36px] border-x-transparent" />
                                                </div>
                                                {/* Mini Torii Gate Icon */}
                                                <span className="text-3xl text-red-500 filter drop-shadow z-10 translate-y-1">⛩️</span>
                                            </div>
                                        )}

                                        {item.id === BG_THEMES.TORII_SUNSET && (
                                            <div className="relative w-full h-full flex items-center justify-center">
                                                {/* Sunset Sun */}
                                                <div className="absolute bottom-1 w-14 h-14 rounded-full bg-gradient-to-t from-red-500 to-amber-400 blur-xs opacity-90" />
                                                <span className="text-3xl text-rose-500 filter drop-shadow z-10 translate-y-1">⛩️</span>
                                            </div>
                                        )}

                                        {item.id === BG_THEMES.CYBER_TECH && (
                                            <div className="relative w-full h-full flex items-center justify-center">
                                                <div className="absolute inset-0 bg-[radial-gradient(#06b6d4_1.5px,transparent_1.5px)] [background-size:12px_12px] opacity-40" />
                                                <div className="w-12 h-12 rounded-full bg-cyan-500/20 blur-md" />
                                                <span className="text-2xl text-cyan-400 z-10">⚡</span>
                                            </div>
                                        )}

                                        {item.id === BG_THEMES.MINIMAL && (
                                            <div className="relative w-full h-full flex items-center justify-center">
                                                <div className="absolute inset-0 bg-[radial-gradient(#94a3b8_1px,transparent_1px)] [background-size:10px_10px] opacity-40" />
                                                <span className="text-2xl text-slate-400 z-10">🍃</span>
                                            </div>
                                        )}

                                        {/* Badge */}
                                        <span className="absolute top-2 left-2 text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-900/70 text-slate-200 backdrop-blur-xs">
                                            {item.badge}
                                        </span>

                                        {/* Selected Checkmark Badge */}
                                        {isSelected && (
                                            <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-red-600 text-white flex items-center justify-center shadow">
                                                <Check className="w-3.5 h-3.5 stroke-[3]" />
                                            </div>
                                        )}
                                    </div>

                                    {/* Card Info */}
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-lg">{item.icon}</span>
                                            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                                                {t(item.nameKey, item.id)}
                                            </h3>
                                        </div>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                                            {t(item.descKey, '')}
                                        </p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Animation Option (Only applicable or prominent for starry / dynamic themes) */}
                    <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 flex items-center justify-between gap-4">
                        <div className="space-y-0.5">
                            <div className="flex items-center gap-2">
                                <Sliders className="w-4 h-4 text-slate-600 dark:text-slate-300" />
                                <span className="text-sm font-bold text-slate-800 dark:text-slate-100">
                                    {t('settings.general.bgAnimationTitle', 'Hiệu ứng chuyển động (Animation)')}
                                </span>
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                {t('settings.general.bgAnimationSub', 'Bật/tắt chuyển động lấp lánh hoặc giữ hình nền tĩnh hoàn toàn (tiết kiệm pin & tập trung)')}
                            </p>
                        </div>

                        {/* Toggle Switch */}
                        <button
                            type="button"
                            onClick={() => setIsAnimated(!isAnimated)}
                            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                                isAnimated ? 'bg-red-600' : 'bg-slate-300 dark:bg-slate-700'
                            }`}
                            role="switch"
                            aria-checked={isAnimated}
                            title={isAnimated ? 'Đang bật chuyển động' : 'Đang bật chế độ nền tĩnh'}
                        >
                            <span
                                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                                    isAnimated ? 'translate-x-5' : 'translate-x-0'
                                }`}
                            />
                        </button>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 flex items-center justify-between">
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                        {isAnimated ? 'Chế độ: Động nhẹ nhàng' : 'Chế độ: Nền tĩnh (Zero Motion)'}
                    </span>
                    <button
                        onClick={onClose}
                        className="px-5 py-2 rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-xs font-bold hover:bg-slate-800 dark:hover:bg-white transition-all shadow-sm cursor-pointer"
                    >
                        Hoàn tất
                    </button>
                </div>
            </div>
        </div>
    );
}
