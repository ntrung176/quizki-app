import React, { useState } from 'react';
import { Sparkles, Check, X, Loader2 } from 'lucide-react';
import { showToast } from '../../utils/toast';

const InlineMnemonicEditor = ({
    initialText = '',
    card = null,
    onSave,
    onCancel,
    onGeminiAssist = null
}) => {
    const [text, setText] = useState(initialText || '');
    const [isSaving, setIsSaving] = useState(false);
    const [isGeneratingAi, setIsGeneratingAi] = useState(false);

    const handleSave = async (e) => {
        if (e) e.stopPropagation();
        if (isSaving) return;
        setIsSaving(true);
        try {
            const cleanText = text.trim();
            await onSave(cleanText);
            showToast('Đã lưu mẹo nhớ thành công! 🎉', 'success');
        } catch (err) {
            console.error('Error saving mnemonic:', err);
            showToast('Lỗi khi lưu mẹo nhớ: ' + (err?.message || err), 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const handleAiAssist = async (e) => {
        if (e) e.stopPropagation();
        if (isGeneratingAi) return;
        setIsGeneratingAi(true);
        showToast('AI đang suy nghĩ mẹo nhớ cho từ này...', 'info', 2500);
        try {
            if (onGeminiAssist && card) {
                const frontText = card.front || card.word || card.character || card.kanji || '';
                const meaningText = card.back || card.meaning || card.sinoVietnamese || '';
                const res = await onGeminiAssist(
                    frontText,
                    card.pos || '',
                    card.level || '',
                    meaningText,
                    false
                );
                if (res && (res.mnemonic || res.explanation || res.nuance)) {
                    const aiVal = res.mnemonic || res.explanation || res.nuance;
                    setText(prev => prev ? `${prev}\n💡 AI Gợi ý: ${aiVal}` : `💡 ${aiVal}`);
                    showToast('Đã tạo gợi ý từ AI!', 'success');
                } else {
                    showToast('AI không trả về gợi ý phù hợp, bạn có thể tự nhập mẹo nhớ.', 'warning');
                }
            } else {
                const frontText = card?.front || card?.word || card?.character || card?.kanji || '';
                const meaningText = card?.back || card?.meaning || card?.sinoVietnamese || '';
                const fallbackStory = `Tưởng tượng "${frontText}" (${card?.reading ? card.reading + ' - ' : ''}${meaningText}): Nhớ hình ảnh gắn liền với nghĩa để thuộc lâu hơn!`;
                setText(prev => prev ? `${prev}\n💡 Gợi ý: ${fallbackStory}` : `💡 ${fallbackStory}`);
            }
        } catch (err) {
            console.warn('AI mnemonic error:', err);
            showToast('Không thể kết nối AI, bạn có thể tự nhập mẹo nhớ.', 'warning');
        } finally {
            setIsGeneratingAi(false);
        }
    };

    return (
        <div 
            className="w-full text-left mt-1.5 p-3 bg-amber-500/15 border border-amber-500/35 rounded-2xl space-y-2 shadow-md animate-fade-in"
            onClick={e => e.stopPropagation()}
        >
            <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                    💡 Nhập Mẹo Nhớ Cá Nhân:
                </span>
                <button
                    type="button"
                    onClick={handleAiAssist}
                    disabled={isGeneratingAi}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800 hover:bg-amber-200 transition-colors disabled:opacity-50 cursor-pointer"
                >
                    {isGeneratingAi ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                        <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    )}
                    AI Gợi ý
                </button>
            </div>

            <textarea
                value={text}
                onChange={e => setText(e.target.value)}
                placeholder="Nhập mẹo nhớ / câu chuyện gợi nhớ riêng của bạn tại đây..."
                rows={3}
                className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-800/80 rounded-xl text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-amber-500/50 resize-none leading-relaxed"
                autoFocus
            />

            <div className="flex items-center justify-end gap-2 pt-1">
                <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); if (onCancel) onCancel(); }}
                    className="px-3 py-1 text-xs font-bold text-slate-500 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                >
                    Hủy
                </button>
                <button
                    type="button"
                    onClick={handleSave}
                    disabled={isSaving}
                    className="flex items-center gap-1.5 px-4 py-1.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white text-xs font-bold rounded-lg shadow-sm transition-all disabled:opacity-50 cursor-pointer"
                >
                    {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                    Lưu
                </button>
            </div>
        </div>
    );
};

export default InlineMnemonicEditor;
