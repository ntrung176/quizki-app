import React, { useState, useEffect, useRef } from 'react';
import {
    Bookmark, BookmarkCheck, Volume2, Type, Copy, Check,
    Sparkles, Globe, Loader2, AlertCircle, Plus
} from 'lucide-react';
import FuriganaRenderer from '../kaiwa/FuriganaRenderer';
import { speakExampleSentence } from '../../utils/audio';
import { translateFast, translateWithAI, detectSourceLanguage } from '../../services/sentenceTranslationService';
import { showToast } from '../../utils/toast';
import { AiCreditPill, AiCostTag } from '../ui/AiCreditBadge';

export default function HomeSentenceTranslateCard({
    query,
    onSaveCard = null,
    savedVocabSet = new Set()
}) {
    // Mode: 'fast' (Google Translate) | 'ai' (AI Contextual Translation)
    const [mode, setMode] = useState('fast');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    // Translation results
    const [fastResult, setFastResult] = useState(null);
    const [aiResult, setAiResult] = useState(null);

    // Audio & UI states
    const [isSpeakingOriginal, setIsSpeakingOriginal] = useState(false);
    const [isSpeakingTarget, setIsSpeakingTarget] = useState(false);
    const [copiedOriginal, setCopiedOriginal] = useState(false);
    const [copiedTarget, setCopiedTarget] = useState(false);
    const [showFurigana, setShowFurigana] = useState(true);

    const sourceLang = detectSourceLanguage(query);
    const targetLang = sourceLang === 'ja' ? 'vi' : 'ja';

    // Fetch translation when query or mode changes
    useEffect(() => {
        const text = query?.trim();
        if (!text) {
            setFastResult(null);
            setAiResult(null);
            setError(null);
            return;
        }

        let isMounted = true;

        const runTranslation = async () => {
            if (mode === 'fast') {
                if (fastResult && fastResult.text === text) return;
                setIsLoading(true);
                setError(null);
                try {
                    const res = await translateFast(text, sourceLang);
                    if (isMounted) {
                        setFastResult({ ...res, text });
                    }
                } catch (err) {
                    if (isMounted) setError(err.message || 'Lỗi dịch nhanh');
                } finally {
                    if (isMounted) setIsLoading(false);
                }
            } else {
                if (aiResult && aiResult.text === text) return;
                setIsLoading(true);
                setError(null);
                try {
                    const res = await translateWithAI(text, sourceLang);
                    if (isMounted) {
                        setAiResult({ ...res, text });
                    }
                } catch (err) {
                    if (isMounted) setError(err.message || 'Lỗi dịch AI');
                } finally {
                    if (isMounted) setIsLoading(false);
                }
            }
        };

        runTranslation();

        return () => {
            isMounted = false;
        };
    }, [query, mode, sourceLang]);

    const activeResult = mode === 'fast' ? fastResult : aiResult;

    // Pronunciation handler
    const handleSpeak = (text, lang, isOriginal = true) => {
        if (!text) return;
        if (isOriginal) {
            setIsSpeakingOriginal(true);
            speakExampleSentence(text, lang);
            setTimeout(() => setIsSpeakingOriginal(false), 2000);
        } else {
            setIsSpeakingTarget(true);
            speakExampleSentence(text, lang);
            setTimeout(() => setIsSpeakingTarget(false), 2000);
        }
    };

    // Copy handler
    const handleCopy = (text, isOriginal = true) => {
        if (!text) return;
        navigator.clipboard?.writeText(text);
        if (isOriginal) {
            setCopiedOriginal(true);
            setTimeout(() => setCopiedOriginal(false), 1500);
        } else {
            setCopiedTarget(true);
            setTimeout(() => setCopiedTarget(false), 1500);
        }
        showToast('Đã sao chép vào bộ nhớ tạm', 'success');
    };

    // Quick Save handler to Flashcard / Notebook
    const handleSave = () => {
        if (!onSaveCard) {
            showToast('Tính năng lưu thẻ khả dụng trong học phần', 'info');
            return;
        }
        const text = query.trim();
        const translation = activeResult?.translation || '';
        if (sourceLang === 'ja') {
            onSaveCard({
                front: text,
                back: translation,
                reading: aiResult?.romaji || '',
                example: text,
                exampleMeaning: translation
            });
        } else {
            onSaveCard({
                front: translation,
                back: text,
                reading: aiResult?.romaji || '',
                example: translation,
                exampleMeaning: text
            });
        }
    };

    // Furigana text candidate
    const originalFurigana = aiResult?.furigana || (sourceLang === 'ja' ? query : '');
    const targetFurigana = aiResult?.furigana || (targetLang === 'ja' ? activeResult?.translation : '');
    const currentRomaji = aiResult?.romaji || '';

    return (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border-2 border-emerald-500/30 dark:border-emerald-500/20 shadow-sm p-4 sm:p-5 transition-all space-y-4">
            {/* Header: CÂU GỐC */}
            <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                            Câu gốc ({sourceLang === 'ja' ? 'Tiếng Nhật' : 'Tiếng Việt'})
                        </h3>
                    </div>

                    {/* Action buttons on top right */}
                    <div className="flex items-center gap-1">
                        {/* Aa Furigana / Romaji Toggle */}
                        {sourceLang === 'ja' && (
                            <button
                                type="button"
                                onClick={() => setShowFurigana(prev => !prev)}
                                className={`p-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                                    showFurigana
                                        ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700'
                                        : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800'
                                }`}
                                title="Bật / Tắt phiên âm Furigana & Romaji"
                            >
                                <Type className="w-3.5 h-3.5" />
                                <span className="text-[11px] font-black">Aa</span>
                            </button>
                        )}

                        {/* Audio speaker for original sentence */}
                        <button
                            type="button"
                            onClick={() => handleSpeak(query, sourceLang, true)}
                            className={`p-1.5 rounded-xl transition cursor-pointer ${
                                isSpeakingOriginal
                                    ? 'bg-sky-100 text-sky-600 dark:bg-sky-950/60 dark:text-sky-400 animate-bounce'
                                    : 'text-slate-400 hover:text-sky-600 hover:bg-sky-50 dark:hover:bg-slate-800'
                            }`}
                            title="Nghe phát âm câu gốc"
                        >
                            <Volume2 className="w-4 h-4" />
                        </button>

                        {/* Copy button */}
                        <button
                            type="button"
                            onClick={() => handleCopy(query, true)}
                            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                            title="Sao chép câu gốc"
                        >
                            {copiedOriginal ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                        </button>

                        {/* Save / Bookmark button */}
                        {onSaveCard && (
                            <button
                                type="button"
                                onClick={handleSave}
                                className="p-1.5 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-slate-800 transition cursor-pointer"
                                title="Lưu câu vào sổ học tập"
                            >
                                <Bookmark className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                </div>

                {/* Original sentence text display */}
                <div className="pt-0.5">
                    {sourceLang === 'ja' ? (
                        <div className="leading-relaxed">
                            {showFurigana && originalFurigana ? (
                                <FuriganaRenderer
                                    text={originalFurigana}
                                    showFurigana={showFurigana}
                                    className="text-lg sm:text-xl font-bold font-japanese text-slate-900 dark:text-white"
                                />
                            ) : (
                                <p className="text-lg sm:text-xl font-bold font-japanese text-slate-900 dark:text-white">
                                    {query}
                                </p>
                            )}

                            {showFurigana && currentRomaji && (
                                <p className="text-xs sm:text-sm text-slate-400 dark:text-slate-500 font-mono mt-1 select-all">
                                    {currentRomaji}
                                </p>
                            )}
                        </div>
                    ) : (
                        <p className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white leading-relaxed">
                            {query}
                        </p>
                    )}
                </div>
            </div>

            {/* Subtle Divider */}
            <div className="border-t border-slate-100 dark:border-slate-800/80" />

            {/* Section: BẢN DỊCH */}
            <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                            Bản dịch ({targetLang === 'ja' ? 'Tiếng Nhật' : 'Tiếng Việt'})
                        </h3>
                        <AiCreditPill featureId="sentence_translate" compact />
                    </div>

                    {/* Mode Segmented Switch: Dịch nhanh vs Dịch AI */}
                    <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl border border-slate-200 dark:border-slate-700/80 gap-1">
                        <button
                            type="button"
                            onClick={() => setMode('fast')}
                            className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all flex items-center gap-1.5 cursor-pointer ${
                                mode === 'fast'
                                    ? 'bg-sky-500 text-white shadow-xs'
                                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                            }`}
                        >
                            <Globe className="w-3.5 h-3.5" />
                            <span>Dịch nhanh</span>
                        </button>

                        <button
                            type="button"
                            onClick={() => setMode('ai')}
                            className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all flex items-center gap-1.5 cursor-pointer ${
                                mode === 'ai'
                                    ? 'bg-emerald-500 text-white shadow-xs'
                                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                            }`}
                        >
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>Dịch AI</span>
                            <AiCostTag featureId="sentence_translate" darkBg={mode === 'ai'} />
                        </button>
                    </div>
                </div>

                {/* Translation Content */}
                <div className="min-h-[50px] flex flex-col justify-center">
                    {isLoading ? (
                        <div className="flex items-center gap-2.5 py-3 text-slate-500 dark:text-slate-400 text-xs font-medium">
                            <Loader2 className="w-4 h-4 animate-spin text-emerald-500" />
                            <span>{mode === 'ai' ? 'AI đang phân tích ngữ cảnh và dịch câu...' : 'Đang dịch nhanh qua Google Translate...'}</span>
                        </div>
                    ) : error ? (
                        <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 flex items-center justify-between text-xs text-rose-600 dark:text-rose-400">
                            <div className="flex items-center gap-2">
                                <AlertCircle className="w-4 h-4 shrink-0" />
                                <span>{error}</span>
                            </div>
                            <button
                                type="button"
                                onClick={() => setMode(mode === 'fast' ? 'ai' : 'fast')}
                                className="underline font-bold ml-2 cursor-pointer"
                            >
                                Thử chế độ khác
                            </button>
                        </div>
                    ) : activeResult?.translation ? (
                        <div className="space-y-2">
                            {targetLang === 'ja' ? (
                                <div className="leading-relaxed">
                                    {showFurigana && targetFurigana ? (
                                        <FuriganaRenderer
                                            text={targetFurigana}
                                            showFurigana={showFurigana}
                                            className="text-base sm:text-lg font-bold font-japanese text-slate-900 dark:text-white"
                                        />
                                    ) : (
                                        <p className="text-base sm:text-lg font-bold font-japanese text-slate-900 dark:text-white">
                                            {activeResult.translation}
                                        </p>
                                    )}

                                    {showFurigana && currentRomaji && (
                                        <p className="text-xs sm:text-sm text-slate-400 dark:text-slate-500 font-mono mt-1 select-all">
                                            {currentRomaji}
                                        </p>
                                    )}
                                </div>
                            ) : (
                                <p className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 leading-relaxed">
                                    {activeResult.translation}
                                </p>
                            )}

                            {/* AI Grammar & Nuance Explanation Callout */}
                            {mode === 'ai' && activeResult.explanation && (
                                <div className="p-3 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 text-xs text-emerald-800 dark:text-emerald-300 flex items-start gap-2.5 leading-relaxed mt-2">
                                    <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                                    <div>
                                        <span className="font-bold block text-[11px] uppercase tracking-wider text-emerald-700 dark:text-emerald-400 mb-0.5">
                                            Phân tích ngữ cảnh & sắc thái:
                                        </span>
                                        <span>{activeResult.explanation}</span>
                                    </div>
                                </div>
                            )}

                            {/* Action Footer for Translation */}
                            <div className="flex items-center justify-end gap-1.5 pt-1">
                                <button
                                    type="button"
                                    onClick={() => handleSpeak(activeResult.translation, targetLang, false)}
                                    className={`p-1.5 rounded-xl transition cursor-pointer ${
                                        isSpeakingTarget
                                            ? 'bg-sky-100 text-sky-600 dark:bg-sky-950/60 dark:text-sky-400 animate-bounce'
                                            : 'text-slate-400 hover:text-sky-600 hover:bg-sky-50 dark:hover:bg-slate-800'
                                    }`}
                                    title="Nghe phát âm bản dịch"
                                >
                                    <Volume2 className="w-4 h-4" />
                                </button>

                                <button
                                    type="button"
                                    onClick={() => handleCopy(activeResult.translation, false)}
                                    className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                                    title="Sao chép bản dịch"
                                >
                                    {copiedTarget ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>
                    ) : null}
                </div>
            </div>
        </div>
    );
}
