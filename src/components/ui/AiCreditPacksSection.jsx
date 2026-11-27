import React from 'react';
import { Zap, ChevronRight, Sparkles, Coins, Info } from 'lucide-react';
import { DEFAULT_AI_PACKAGES } from '../../utils/adminSettings';
import { getDynamicFeatureCreditTable } from '../../utils/aiCreditManager';
import { useAiCredits } from '../../hooks/useAiCredits';

const formatVND = (amount) => new Intl.NumberFormat('vi-VN').format(Number(amount || 0)) + 'đ';

const CARD_THEMES = [
    {
        border: 'border-sky-300 dark:border-sky-800 border-b-sky-500 dark:border-b-sky-900',
        badge: 'bg-sky-500 text-white border-sky-700',
        iconBg: 'from-sky-400 to-cyan-500 border-sky-600',
        btn: 'from-sky-500 to-cyan-500 border-sky-700'
    },
    {
        border: 'border-emerald-400 dark:border-emerald-600 border-b-emerald-600 ring-2 ring-emerald-400/15',
        badge: 'bg-emerald-500 text-white border-emerald-700',
        iconBg: 'from-emerald-400 to-teal-500 border-emerald-600',
        btn: 'from-emerald-500 to-teal-500 border-emerald-700'
    },
    {
        border: 'border-amber-300 dark:border-amber-700 border-b-amber-500',
        badge: 'bg-amber-500 text-white border-amber-700',
        iconBg: 'from-amber-400 to-orange-500 border-amber-600',
        btn: 'from-amber-500 to-orange-500 border-amber-700'
    },
    {
        border: 'border-teal-300 dark:border-teal-700 border-b-teal-500',
        badge: 'bg-teal-600 text-white border-teal-800',
        iconBg: 'from-teal-500 to-emerald-600 border-teal-700',
        btn: 'from-teal-500 to-emerald-600 border-teal-700'
    }
];

/**
 * AI Credit Top-up Packs & Transparent Cost Table Section for /upgrade shop.
 */
const AiCreditPacksSection = ({
    packages = [],
    onSelectPackage
}) => {
    useAiCredits(); // Re-render cleanly when Admin updates per-feature credit costs
    const creditPackages = (packages && packages.length > 0) ? packages : DEFAULT_AI_PACKAGES;
    const featureCreditTable = getDynamicFeatureCreditTable();

    return (
        <div id="ai-credit-packs" className="max-w-5xl lg:max-w-6xl mx-auto mt-6 mb-12 space-y-8">
            {/* Section Header */}
            <div className="text-center space-y-2">
                <div className="inline-flex items-center gap-2 bg-sky-50 dark:bg-sky-950/50 text-sky-700 dark:text-sky-300 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider border-2 border-sky-200 dark:border-sky-800">
                    <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-400" />
                    Gói Nạp Bổ Sung Credit AI
                </div>
                <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                    Nạp thêm Credit AI theo nhu cầu
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 max-w-2xl mx-auto font-medium">
                    Mua lẻ bất cứ lúc nào — Credit không hết hạn, dùng cho Hội thoại Kaiwa AI 1-1, Quét ảnh OCR, Dịch AI & Tạo thẻ thông minh.
                </p>
            </div>

            {/* AI Credit Top-up Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 items-stretch">
                {creditPackages.map((pkg, idx) => {
                    const theme = CARD_THEMES[idx % CARD_THEMES.length];
                    const credits = Number(pkg.cards || 0);
                    const price = Number(pkg.salePrice || 0);
                    const unitCost = credits > 0 ? Math.round(price / credits) : 0;
                    const estKaiwaTurns = Math.floor(credits / 3);

                    return (
                        <div
                            key={pkg.id || idx}
                            onClick={() => onSelectPackage(pkg)}
                            className={`relative rounded-3xl border-2 border-b-[6px] p-5 bg-white dark:bg-slate-900 flex flex-col justify-between transition-all duration-200 hover:-translate-y-1 hover:shadow-xl cursor-pointer overflow-hidden ${theme.border}`}
                        >
                            {pkg.badge && (
                                <div className={`absolute top-0 right-0 text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-bl-2xl border-b-2 border-l-2 ${theme.badge}`}>
                                    {pkg.badge}
                                </div>
                            )}

                            <div>
                                <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${theme.iconBg} border-2 border-b-4 text-white flex items-center justify-center mb-4 shadow-md`}>
                                    <Zap className="w-6 h-6 fill-amber-200 text-white" />
                                </div>

                                <p className="text-xs font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
                                    {pkg.name}
                                </p>

                                <div className="mt-1 flex items-baseline gap-1.5">
                                    <span className="text-3xl font-black text-slate-900 dark:text-white tabular-nums">
                                        {credits.toLocaleString()}
                                    </span>
                                    <span className="text-xs font-black text-amber-600 dark:text-amber-400 uppercase">
                                        Credit AI
                                    </span>
                                </div>

                                <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 leading-relaxed min-h-[38px] font-medium">
                                    {pkg.description || `Tương đương ~${estKaiwaTurns.toLocaleString()} lượt thoại Kaiwa AI hoặc ${credits.toLocaleString()} thẻ AI.`}
                                </p>
                            </div>

                            <div className="pt-4 mt-4 border-t-2 border-slate-100 dark:border-slate-800 space-y-3">
                                <div className="flex items-center justify-between gap-2">
                                    <div>
                                        <p className="text-xl font-black text-slate-900 dark:text-white">
                                            {formatVND(price)}
                                        </p>
                                        {pkg.originalPrice > price && (
                                            <p className="text-xs text-slate-400 line-through font-bold">
                                                {formatVND(pkg.originalPrice)}
                                            </p>
                                        )}
                                    </div>
                                    {unitCost > 0 && (
                                        <span className="text-[11px] font-extrabold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-1 rounded-xl border border-emerald-200 dark:border-emerald-800">
                                            ~{unitCost}đ/⚡
                                        </span>
                                    )}
                                </div>

                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onSelectPackage(pkg);
                                    }}
                                    className={`w-full py-2.5 px-4 rounded-2xl bg-gradient-to-r ${theme.btn} text-white font-black text-xs uppercase tracking-wider border-2 border-b-4 active:translate-y-0.5 active:border-b-2 transition-all flex items-center justify-center gap-1.5 cursor-pointer`}
                                >
                                    <span>Mua ngay</span>
                                    <ChevronRight className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Transparent Credit Usage Guide */}
            <div className="rounded-3xl border-2 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 shadow-sm space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-slate-100 dark:border-slate-800 pb-3.5">
                    <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-2xl bg-amber-500 border-b-4 border-amber-700 text-white flex items-center justify-center shrink-0">
                            <Coins className="w-4 h-4" />
                        </div>
                        <div>
                            <h3 className="font-black text-sm sm:text-base text-slate-900 dark:text-white">
                                Bảng chi phí Credit AI minh bạch cho từng tính năng
                            </h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                Hệ thống chỉ trừ Credit khi AI xử lý thành công. Tính năng SRS, Flashcard, Kanji & Đề thi không tốn Credit.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                    {featureCreditTable.map((item) => (
                        <div
                            key={item.id}
                            className="flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/70"
                        >
                            <div className="min-w-0">
                                <p className="text-xs font-extrabold text-slate-800 dark:text-slate-100 flex items-center gap-1.5 truncate">
                                    <Sparkles className="w-3 h-3 text-emerald-500 shrink-0" />
                                    <span className="truncate">{item.shortLabel}</span>
                                </p>
                                <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                                    {item.estimateText}
                                </p>
                            </div>
                            <span className={`px-2.5 py-1 rounded-xl text-xs font-black shrink-0 border ${
                                item.tier === 'heavy'
                                    ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-300 border-rose-200 dark:border-rose-800'
                                    : item.tier === 'medium'
                                        ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                                        : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                            }`}>
                                {item.cost} ⚡
                            </span>
                        </div>
                    ))}
                </div>

                <div className="flex items-center gap-2 text-xs text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800/70 rounded-2xl px-3.5 py-2.5 font-medium">
                    <Info className="w-4 h-4 shrink-0 text-sky-500" />
                    <span>
                        Gói <strong>Premium 1 Năm</strong> mở khóa toàn bộ app và tặng sẵn <strong>800 Credit AI</strong>; Gói <strong>Premium 3 Năm</strong> tặng sẵn <strong>3.000 Credit AI</strong>. Khi dùng hết, bạn chỉ cần nạp thêm Credit ở trên mà không phải gia hạn lại gói!
                    </span>
                </div>
            </div>
        </div>
    );
};

export default AiCreditPacksSection;
