import React from 'react';
import { Bot, Settings } from 'lucide-react';
import { AI_FEATURES, OPENROUTER_MODELS } from '../../utils/adminSettings';

const AdminAiSection = ({ adminConfig, handleChangeFeatureModel }) => {
    return (
        <div className="space-y-4">
            {/* AI Provider Selection */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                        <Bot className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <div>
                        <p className="font-bold text-gray-800 dark:text-white">AI Provider: OpenRouter</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Sử dụng các mô hình AI chất lượng cao thông qua OpenRouter</p>
                    </div>
                </div>
            </div>

            {/* Cấu hình Model theo tính năng */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 space-y-4">
                <div className="flex items-center gap-3 border-b border-gray-100 dark:border-gray-700 pb-3">
                    <div className="w-10 h-10 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                        <Settings className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <div>
                        <p className="font-bold text-gray-800 dark:text-white">Cấu hình mô hình cho từng tính năng AI</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Chọn mô hình hoạt động riêng biệt cho từng nghiệp vụ</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {AI_FEATURES.map((feature) => {
                        const FEATURE_DEFAULTS = {
                            vocab_gen: 'openai/gpt-4o-mini',
                            grammar_gen: 'google/gemini-2.5-flash',
                            vocab_sino_viet: 'google/gemini-3.1-flash-lite',
                            more_examples: 'openai/gpt-4o-mini',
                            ocr_image: 'openai/gpt-4o-mini',
                            grammar_check: 'openai/gpt-4o-mini'
                        };
                        const currentValue = adminConfig?.aiFeatureModels?.[feature.id] || FEATURE_DEFAULTS[feature.id] || 'google/gemini-2.5-flash';
                        return (
                            <div key={feature.id} className="p-4 rounded-xl border border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/10 flex flex-col justify-between gap-3 hover:border-indigo-500/20 transition-all duration-200">
                                <div>
                                    <p className="font-bold text-sm text-gray-800 dark:text-white flex items-center gap-2">
                                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                                        {feature.label}
                                    </p>
                                    <p className="text-xs text-gray-400 mt-1 leading-relaxed min-h-[32px]">
                                        {feature.description}
                                    </p>
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Mô hình hoạt động</label>
                                    <select
                                        value={currentValue}
                                        onChange={(e) => handleChangeFeatureModel(feature.id, e.target.value)}
                                        className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg outline-none text-xs dark:text-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium"
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

            {/* Info note */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
                <p className="text-sm text-blue-700 dark:text-blue-300">
                    <strong>💡 Lưu ý:</strong> AI được kiểm soát bằng hệ thống lượt sử dụng. Tất cả người dùng có thể dùng AI trong giới hạn lượt. Quản lý lượt ở tab <strong>Gói & Lượt AI</strong>.
                </p>
            </div>
        </div>
    );
};

export default AdminAiSection;
