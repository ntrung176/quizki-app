import React, { useState } from 'react';
import { X, Volume2, Sparkles, Plus, Check, BookOpen, ChevronRight } from 'lucide-react';
import { speakJapanese, speakExampleSentence } from '../../utils/audio';
import { formatJlptLevel, formatPosTag } from './HomeSearchCards';

export default function HomeVocabDetailModal({
    isOpen,
    onClose,
    entry,
    isSaved = false,
    onOpenSave,
    onOpenAiSave,
    canUserUseAI = true
}) {
    const [isPlayingWord, setIsPlayingWord] = useState(false);
    const [isPlayingExample, setIsPlayingExample] = useState(false);

    if (!isOpen || !entry) return null;

    const word = entry.w || entry.r || '';
    const reading = entry.r || '';
    const sinoViet = (entry.hv || '').toUpperCase();
    const meanings = Array.isArray(entry.m) ? entry.m : (entry.m ? [entry.m] : []);
    const level = formatJlptLevel(entry.j);
    const pos = Array.isArray(entry.p) && entry.p.length > 0 ? entry.p.map(formatPosTag).filter(Boolean).join(', ') : null;
    const exampleJa = entry.ex?.ja || '';
    const exampleVi = entry.ex?.vi || entry.ex?.en || '';

    const handlePlayWord = () => {
        setIsPlayingWord(true);
        speakJapanese(word, null, null, null, reading);
        setTimeout(() => setIsPlayingWord(false), 800);
    };

    const handlePlayExample = () => {
        if (!exampleJa) return;
        setIsPlayingExample(true);
        speakExampleSentence(exampleJa, 'ja');
        setTimeout(() => setIsPlayingExample(false), 1200);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
            <div className="bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden w-full max-w-lg max-h-[85vh] flex flex-col">
                {/* Header */}
                <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-850">
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-black uppercase tracking-wider text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/60 border border-sky-200 dark:border-sky-800 px-2.5 py-1 rounded-xl flex items-center gap-1.5">
                            <BookOpen className="w-3.5 h-3.5" />
                            Chi tiết Từ vựng
                        </span>
                        {level && (
                            <span className="text-xs font-black uppercase px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                                {level}
                            </span>
                        )}
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-750 rounded-xl text-slate-500 dark:text-slate-400 transition cursor-pointer"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body Content */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
                    {/* Word Display Banner */}
                    <div className="p-4 sm:p-5 rounded-2xl bg-sky-50/60 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-800/60 flex items-center justify-between gap-4">
                        <div className="min-w-0">
                            {reading && reading !== word && (
                                <p className="font-japanese text-sm text-slate-500 dark:text-slate-400 font-medium mb-0.5">
                                    {reading}
                                </p>
                            )}
                            <h2 className="font-japanese font-black text-2xl sm:text-3xl text-slate-900 dark:text-white tracking-tight">
                                {word}
                            </h2>
                            {sinoViet && (
                                <p className="text-xs font-black uppercase tracking-wider text-amber-600 dark:text-amber-400 mt-1">
                                    Hán Việt: {sinoViet}
                                </p>
                            )}
                        </div>
                        <button
                            type="button"
                            onClick={handlePlayWord}
                            className="w-12 h-12 rounded-2xl bg-sky-500 hover:bg-sky-600 text-white flex items-center justify-center shrink-0 shadow-md cursor-pointer active:scale-95 transition-transform"
                            title="Phát âm từ vựng"
                        >
                            <Volume2 className={`w-5 h-5 ${isPlayingWord ? 'animate-bounce' : ''}`} />
                        </button>
                    </div>

                    {/* Part of Speech */}
                    {pos && (
                        <div className="text-xs text-slate-500 dark:text-slate-400 italic">
                            Loại từ: <span className="font-semibold text-slate-700 dark:text-slate-300">{pos}</span>
                        </div>
                    )}

                    {/* Meanings List */}
                    <div className="space-y-2">
                        <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
                            Ý nghĩa ({meanings.length}):
                        </h4>
                        <div className="space-y-1.5">
                            {meanings.map((m, idx) => (
                                <div
                                    key={idx}
                                    className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-750 text-sm font-medium text-slate-800 dark:text-slate-200 flex items-start gap-2.5"
                                >
                                    <span className="w-5 h-5 rounded-full bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                                        {idx + 1}
                                    </span>
                                    <span className="flex-1 leading-relaxed">{m}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Example Sentence */}
                    {exampleJa && (
                        <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                            <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
                                Ví dụ minh họa:
                            </h4>
                            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-750 space-y-1.5">
                                <div className="flex items-start justify-between gap-3">
                                    <p className="font-japanese font-bold text-sm sm:text-base text-slate-900 dark:text-white leading-relaxed">
                                        {exampleJa}
                                    </p>
                                    <button
                                        type="button"
                                        onClick={handlePlayExample}
                                        className="p-2 rounded-xl text-slate-400 hover:text-sky-600 hover:bg-sky-50 dark:hover:bg-slate-700 transition cursor-pointer shrink-0"
                                        title="Nghe câu ví dụ"
                                    >
                                        <Volume2 className={`w-4 h-4 ${isPlayingExample ? 'animate-bounce' : ''}`} />
                                    </button>
                                </div>
                                {exampleVi && (
                                    <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 font-medium">
                                        {exampleVi}
                                    </p>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Actions */}
                <div className="p-3.5 sm:p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 flex items-center justify-between gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                    >
                        Đóng
                    </button>

                    <div className="flex items-center gap-2">
                        {canUserUseAI && onOpenAiSave && (
                            <button
                                type="button"
                                onClick={() => {
                                    onOpenAiSave(entry);
                                }}
                                className="px-3.5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95 transition"
                            >
                                <Sparkles className="w-4 h-4" />
                                <span className="hidden sm:inline">AI Giải Nghĩa & Lưu</span>
                            </button>
                        )}

                        <button
                            type="button"
                            onClick={() => {
                                onOpenSave(entry);
                            }}
                            className={`px-4 py-2.5 rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer active:scale-95 transition ${
                                isSaved
                                    ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-700'
                                    : 'bg-sky-500 hover:bg-sky-400 text-white border-b-2 border-sky-700 shadow-xs'
                            }`}
                        >
                            {isSaved ? (
                                <>
                                    <Check className="w-4 h-4" />
                                    <span>Đã lưu học phần</span>
                                </>
                            ) : (
                                <>
                                    <Plus className="w-4 h-4 stroke-[2.5]" />
                                    <span>Lưu vào học phần</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
