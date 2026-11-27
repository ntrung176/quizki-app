import React, { useState, useEffect } from 'react';
import { Settings, Sparkles, Info, Zap, Coins, Save, RotateCcw, Loader2, ShieldCheck } from 'lucide-react';
import { AI_FEATURES, OPENROUTER_MODELS } from '../../utils/adminSettings';
import {
    AI_FEATURE_CREDITS,
    getEditableAiCreditFeatures,
    getFeatureCreditCost,
    WELCOME_AI_CREDITS,
    PREMIUM_INCLUDED_CREDITS
} from '../../utils/aiCreditManager';

const FEATURE_DEFAULTS = {
    vocab_gen: 'openai/gpt-4o-mini',
    grammar_gen: 'google/gemini-2.5-flash',
    vocab_sino_viet: 'google/gemini-3.1-flash-lite',
    more_examples: 'openai/gpt-4o-mini',
    ocr_image: 'openai/gpt-4o-mini',
    grammar_check: 'openai/gpt-4o-mini',
    kaiwa_agent: 'google/gemini-2.5-flash'
};

const AdminAiSection = ({
    adminConfig,
    handleChangeFeatureModel,
    handleSaveFeatureCosts,
    savingConfig
}) => {
    const editableFeatures = getEditableAiCreditFeatures();

    const buildInitialCosts = () => {
        const map = {};
        editableFeatures.forEach((f) => {
            const configured = adminConfig?.aiFeatureCosts?.[f.id];
            map[f.id] = configured !== undefined && configured !== null
                ? Number(configured)
                : getFeatureCreditCost(f.id);
        });
        return map;
    };

    const [draftCosts, setDraftCosts] = useState(buildInitialCosts);
    const [savingCosts, setSavingCosts] = useState(false);

    useEffect(() => {
        setDraftCosts(buildInitialCosts());
    }, [adminConfig?.aiFeatureCosts]);

    const handleCostInput = (featureId, rawVal) => {
        const num = Math.max(0, Math.min(50, Math.floor(Number(rawVal) || 0)));
        setDraftCosts((prev) => ({ ...prev, [featureId]: num }));
    };

    const handleStepCost = (featureId, delta) => {
        setDraftCosts((prev) => {
            const cur = Number(prev[featureId] ?? getFeatureCreditCost(featureId));
            return { ...prev, [featureId]: Math.max(0, Math.min(50, cur + delta)) };
        });
    };

    const hasUnsavedCosts = editableFeatures.some((f) => {
        const saved = adminConfig?.aiFeatureCosts?.[f.id] ?? AI_FEATURE_CREDITS[f.id]?.cost ?? 1;
        return Number(draftCosts[f.id]) !== Number(saved);
    });

    const handleSaveAllCosts = async () => {
        if (!handleSaveFeatureCosts) return;
        setSavingCosts(true);
        try {
            await handleSaveFeatureCosts(draftCosts);
        } finally {
            setSavingCosts(false);
        }
    };

    const handleResetDefaults = async () => {
        const defaults = {};
        editableFeatures.forEach((f) => {
            defaults[f.id] = AI_FEATURE_CREDITS[f.id]?.cost ?? 1;
        });
        setDraftCosts(defaults);
        if (handleSaveFeatureCosts) {
            setSavingCosts(true);
            try {
                await handleSaveFeatureCosts(defaults);
            } finally {
                setSavingCosts(false);
            }
        }
    };

    return (
        <div className="space-y-5">
            {/* Per-Feature Model Selector + Quick Credit Cost */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl border-2 border-slate-200 dark:border-slate-700/80 p-5 space-y-4 shadow-sm">
                <div className="flex items-center gap-3 border-b-2 border-slate-100 dark:border-slate-800 pb-3.5">
                    <div className="w-10 h-10 rounded-2xl bg-sky-500 border-b-4 border-sky-700 text-white flex items-center justify-center shrink-0">
                        <Settings className="w-5 h-5" />
                    </div>
                    <div>
                        <p className="font-black text-slate-900 dark:text-white text-base">
                            Cấu hình mô hình cho từng tính năng AI
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                            Chọn model tối ưu riêng cho từng nghiệp vụ và chỉnh số Credit AI tiêu hao
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    {AI_FEATURES.map((feature) => {
                        const currentValue = adminConfig?.aiFeatureModels?.[feature.id] || FEATURE_DEFAULTS[feature.id] || 'google/gemini-2.5-flash';
                        const creditCost = Number(draftCosts[feature.id] ?? getFeatureCreditCost(feature.id));
                        return (
                            <div
                                key={feature.id}
                                className="p-4 rounded-2xl border-2 border-slate-200/80 dark:border-slate-700/80 bg-slate-50/70 dark:bg-slate-800/50 flex flex-col justify-between gap-3 hover:border-emerald-400 dark:hover:border-emerald-600 transition-all"
                            >
                                <div>
                                    <div className="flex items-center justify-between gap-2">
                                        <p className="font-extrabold text-sm text-slate-800 dark:text-white flex items-center gap-2">
                                            <Sparkles className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                                            <span>{feature.label}</span>
                                        </p>
                                        <div className="inline-flex items-center gap-1 bg-amber-100 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-800 rounded-xl px-1.5 py-0.5 shrink-0">
                                            <button
                                                type="button"
                                                onClick={() => handleStepCost(feature.id, -1)}
                                                className="w-5 h-5 rounded-md bg-white/80 dark:bg-slate-900 text-amber-700 dark:text-amber-300 font-black text-xs hover:bg-white cursor-pointer"
                                                title="Giảm 1 Credit"
                                            >
                                                -
                                            </button>
                                            <Zap className="w-3 h-3 fill-amber-500 text-amber-500 ml-0.5" />
                                            <input
                                                type="number"
                                                min={0}
                                                max={50}
                                                value={creditCost}
                                                onChange={(e) => handleCostInput(feature.id, e.target.value)}
                                                className="w-8 text-center bg-transparent text-xs font-black text-amber-800 dark:text-amber-200 outline-none"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => handleStepCost(feature.id, 1)}
                                                className="w-5 h-5 rounded-md bg-white/80 dark:bg-slate-900 text-amber-700 dark:text-amber-300 font-black text-xs hover:bg-white cursor-pointer"
                                                title="Tăng 1 Credit"
                                            >
                                                +
                                            </button>
                                        </div>
                                    </div>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                                        {feature.description}
                                    </p>
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">
                                        Mô hình hoạt động
                                    </label>
                                    <select
                                        value={currentValue}
                                        disabled={savingConfig}
                                        onChange={(e) => handleChangeFeatureModel(feature.id, e.target.value)}
                                        className="w-full px-3 py-2 bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 rounded-xl outline-none text-xs text-slate-800 dark:text-white focus:border-emerald-500 transition-all font-bold cursor-pointer"
                                    >
                                        {OPENROUTER_MODELS.map(model => (
                                            <option key={model.value} value={model.value}>{model.label}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Editable AI Credit Cost Matrix (All User-Facing AI Features) */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl border-2 border-slate-200 dark:border-slate-700/80 p-5 space-y-4 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-slate-100 dark:border-slate-800 pb-3.5">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-amber-500 border-b-4 border-amber-700 text-white flex items-center justify-center shrink-0">
                            <Coins className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="font-black text-slate-900 dark:text-white text-base">
                                Chỉnh sửa Credit AI tốn cho mỗi tính năng
                            </p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                Tân thủ: {WELCOME_AI_CREDITS} Credit • Premium 1 Năm: +{PREMIUM_INCLUDED_CREDITS.premium_1y} • Premium 3 Năm: +{PREMIUM_INCLUDED_CREDITS.premium_3y.toLocaleString()} (Tối đa 50 Credit/lượt)
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={handleResetDefaults}
                            disabled={savingCosts}
                            className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border-2 border-b-4 border-slate-300 dark:border-slate-700 active:translate-y-0.5 active:border-b-2 text-xs font-extrabold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 cursor-pointer transition-all disabled:opacity-50"
                        >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>Mặc định</span>
                        </button>
                        <button
                            type="button"
                            onClick={handleSaveAllCosts}
                            disabled={savingCosts || !hasUnsavedCosts}
                            className={`px-4 py-2 rounded-xl border-b-4 active:translate-y-0.5 active:border-b-2 text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50 ${
                                hasUnsavedCosts
                                    ? 'bg-emerald-500 hover:bg-emerald-400 border-emerald-700 text-white shadow-sm'
                                    : 'bg-emerald-100 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300'
                            }`}
                        >
                            {savingCosts ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                            <span>{hasUnsavedCosts ? 'Lưu định mức Credit' : 'Đã đồng bộ'}</span>
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                    {editableFeatures.map((item) => {
                        const val = Number(draftCosts[item.id] ?? item.cost);
                        const savedVal = Number(adminConfig?.aiFeatureCosts?.[item.id] ?? AI_FEATURE_CREDITS[item.id]?.cost ?? 1);
                        const isDirty = val !== savedVal;
                        return (
                            <div
                                key={item.id}
                                className={`flex items-center justify-between gap-2.5 px-3.5 py-2.5 rounded-2xl border-2 transition-all ${
                                    isDirty
                                        ? 'bg-amber-50/70 dark:bg-amber-950/20 border-amber-400 dark:border-amber-700'
                                        : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700/80'
                                }`}
                            >
                                <div className="min-w-0">
                                    <p className="text-xs font-extrabold text-slate-800 dark:text-slate-100 truncate">
                                        {item.shortLabel}
                                    </p>
                                    <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                                        {item.estimateText}
                                    </p>
                                </div>
                                <div className="flex items-center gap-1 shrink-0 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-1.5 py-1">
                                    <button
                                        type="button"
                                        onClick={() => handleStepCost(item.id, -1)}
                                        className="w-5 h-5 rounded-md bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 font-black text-xs cursor-pointer"
                                    >
                                        -
                                    </button>
                                    <input
                                        type="number"
                                        min={0}
                                        max={50}
                                        value={val}
                                        onChange={(e) => handleCostInput(item.id, e.target.value)}
                                        className="w-9 text-center bg-transparent text-xs font-black text-slate-900 dark:text-white outline-none tabular-nums"
                                    />
                                    <span className="text-[11px] text-amber-500 font-black">⚡</span>
                                    <button
                                        type="button"
                                        onClick={() => handleStepCost(item.id, 1)}
                                        className="w-5 h-5 rounded-md bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 font-black text-xs cursor-pointer"
                                    >
                                        +
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Security & Sync Note */}
            <div className="bg-sky-50 dark:bg-sky-950/40 border-2 border-sky-200 dark:border-sky-800/70 rounded-2xl p-4 flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-sky-500 text-white flex items-center justify-center shrink-0">
                    <ShieldCheck className="w-4 h-4" />
                </div>
                <p className="text-xs sm:text-sm text-sky-800 dark:text-sky-200 font-medium leading-relaxed">
                    Mọi thay đổi định mức Credit AI có hiệu lực ngay lập tức trên toàn hệ thống. Firestore Rules đã khóa chặt quyền tạo/xóa profile và chặn mọi hình thức tự tăng Credit từ client.
                </p>
            </div>
        </div>
    );
};

export default AdminAiSection;
