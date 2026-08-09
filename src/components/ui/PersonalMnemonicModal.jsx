import React, { useState, useEffect } from 'react';
import { X, Sparkles, Save, Loader2, Lightbulb, AlertTriangle } from 'lucide-react';
import { showToast } from '../../utils/toast';

const PersonalMnemonicModal = ({
    isOpen,
    onClose,
    card,
    onSaveMnemonic,
    onGeminiAssist = null
}) => {
    const [mnemonicText, setMnemonicText] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [isGeneratingAi, setIsGeneratingAi] = useState(false);

    useEffect(() => {
        if (card) {
            setMnemonicText(card.userMnemonic || card.customMnemonic || card.mnemonic || '');
        } else {
            setMnemonicText('');
        }
    }, [card, isOpen]);

    if (!isOpen || !card) return null;

    const frontText = card.front || card.word || card.character || card.kanji || '';
    const readingText = card.reading || card.kana || card.onyomi || '';
    const meaningText = card.back || card.meaning || card.sinoVietnamese || card.meaningVi || '';
    const isLeech = card.isLeech || (card.srsLapseCount >= 3) || (card.lapseCount >= 3);
    const lapseCount = card.srsLapseCount || card.lapseCount || 3;

    const handleSave = async () => {
        if (isSaving) return;
        setIsSaving(true);
        try {
            await onSaveMnemonic(mnemonicText.trim());
            showToast('Đã lưu mẹo nhớ cá nhân thành công! 🎉', 'success');
            onClose();
        } catch (e) {
            console.error('Error saving personal mnemonic:', e);
            showToast('Lỗi khi lưu mẹo nhớ: ' + (e?.message || e), 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const handleGenerateAiMnemonic = async () => {
        if (isGeneratingAi) return;
        setIsGeneratingAi(true);
        showToast('AI đang suy nghĩ mẹo nhớ ngắn gọn, dễ thuộc cho từ này...', 'info', 3000);
        try {
            if (onGeminiAssist) {
                const res = await onGeminiAssist(
                    frontText,
                    card.pos || '',
                    card.level || '',
                    meaningText || '',
                    false
                );
                if (res && (res.mnemonic || res.nuance || res.explanation)) {
                    const aiSuggested = res.mnemonic || res.explanation || res.nuance;
                    setMnemonicText(prev => prev ? `${prev}\n💡 AI Gợi ý: ${aiSuggested}` : `💡 ${aiSuggested}`);
                    showToast('Đã tạo gợi ý từ AI thành công!', 'success');
                } else {
                    showToast('AI không trả về gợi ý phù hợp, hãy thử tự viết câu chuyện nhé!', 'warning');
                }
            } else {
                // Default fallback template if AI assist prop is not passed directly
                const fallbackStory = `Tưởng tượng "${frontText}" (${readingText ? readingText + ' - ' : ''}${meaningText}): Nhớ hình ảnh gắn liền với nghĩa để khắc sâu vào trí nhớ!`;
                setMnemonicText(prev => prev ? `${prev}\n💡 Gợi ý: ${fallbackStory}` : `💡 ${fallbackStory}`);
            }
        } catch (e) {
            console.warn('AI mnemonic assist error:', e);
            showToast('Không thể kết nối AI, bạn có thể tự nhập mẹo nhớ.', 'warning');
        } finally {
            setIsGeneratingAi(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-fade-in">
            <div 
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5 relative text-left"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-start justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
                    <div>
                        <div className="flex items-center gap-2">
                            <Lightbulb className="w-5 h-5 text-amber-500 animate-pulse" />
                            <h3 className="text-lg font-bold text-slate-800 dark:text-white">
                                Sửa Mẹo Nhớ Cá Nhân
                            </h3>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                            Tạo câu chuyện / hình ảnh gợi nhớ riêng giúp bạn thuộc từ này lâu hơn.
                        </p>
                    </div>
                    <button 
                        onClick={onClose}
                        className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Card Info Banner */}
                <div className="bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-4 border border-slate-200/60 dark:border-slate-700/60 space-y-1.5">
                    {isLeech && (
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-red-500/15 text-red-600 dark:text-red-400 border border-red-500/30 mb-1">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            TỪ KHÓ NHỚ (Bị quên {lapseCount} lần)
                        </div>
                    )}
                    <div className="flex items-baseline gap-2 flex-wrap">
                        <span className="text-xl font-bold text-slate-900 dark:text-white font-japanese">
                            {frontText}
                        </span>
                        {readingText && (
                            <span className="text-sm font-semibold text-sky-600 dark:text-sky-400 font-japanese">
                                ({readingText})
                            </span>
                        )}
                    </div>
                    {meaningText && (
                        <p className="text-xs font-bold text-slate-600 dark:text-slate-300">
                            {meaningText}
                        </p>
                    )}
                </div>

                {/* Textarea Input */}
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                            Mẹo nhớ / Câu chuyện của bạn:
                        </label>
                        <button
                            type="button"
                            onClick={handleGenerateAiMnemonic}
                            disabled={isGeneratingAi}
                            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800 hover:bg-amber-100 transition-colors disabled:opacity-50 cursor-pointer"
                        >
                            {isGeneratingAi ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                                <Sparkles className="w-3.5 h-3.5" />
                            )}
                            AI Gợi ý mẹo nhớ
                        </button>
                    </div>

                    <textarea
                        value={mnemonicText}
                        onChange={e => setMnemonicText(e.target.value)}
                        placeholder="Ví dụ: Từ này có bộ THỦ (tay) đứng trước bộ MỤC (mắt), tưởng tượng lấy tay che mắt khi nhìn mặt trời..."
                        rows={4}
                        className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-amber-500/50 resize-none leading-relaxed"
                        autoFocus
                    />
                </div>

                {/* Footer Actions */}
                <div className="flex items-center justify-end gap-3 pt-2">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                    >
                        Hủy
                    </button>
                    <button
                        type="button"
                        onClick={handleSave}
                        disabled={isSaving}
                        className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white text-xs font-bold rounded-xl shadow-md transition-all disabled:opacity-50 cursor-pointer"
                    >
                        {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        Lưu Mẹo Nhớ
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PersonalMnemonicModal;
