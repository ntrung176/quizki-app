import React, { useState } from 'react';
import { Volume2 } from 'lucide-react';
import { speakJapanese } from '../../utils/audio';

/**
 * Reusable bilingual Listening Script viewer (Situation, Spoken Question, Spoken Options & Dialogue lines).
 */
const ListeningScriptBox = ({
    question = {},
    correctIdx = -1,
    revealAnswer = true,
    compact = false
}) => {
    const [playingVocab, setPlayingVocab] = useState(null);
    const [showScriptVi, setShowScriptVi] = useState(true);

    const scriptLines = Array.isArray(question?.script) ? question.script : [];
    const spokenOpts = Array.isArray(question?.spokenOptions) ? question.spokenOptions : [];
    const hasContent = scriptLines.length > 0
        || Boolean(question?.stem)
        || Boolean(question?.spokenQuestion)
        || spokenOpts.length > 0;

    if (!hasContent) return null;

    const handleSpeakLine = (text) => {
        if (!text) return;
        setPlayingVocab(text);
        speakJapanese(text, null, null, null, '').finally(() => setPlayingVocab(null));
    };

    return (
        <div className={`bg-white dark:bg-slate-800/95 rounded-2xl border border-sky-200 dark:border-sky-900/60 shadow-xs space-y-3 ${compact ? 'p-3.5' : 'p-4 sm:p-5'}`}>
            <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-100 dark:border-slate-700/60">
                <div className="flex items-center gap-2">
                    <Volume2 className="w-4 h-4 text-sky-500 shrink-0" />
                    <span className="text-xs font-black uppercase text-sky-700 dark:text-sky-300 tracking-wider">
                        Script Hội Thoại (Nhật – Việt)
                    </span>
                </div>
                <button
                    type="button"
                    onClick={() => setShowScriptVi((v) => !v)}
                    className="px-2.5 py-1 rounded-xl bg-sky-50 hover:bg-sky-100 dark:bg-sky-950/50 text-sky-700 dark:text-sky-300 text-[11px] font-bold cursor-pointer transition"
                >
                    {showScriptVi ? 'Ẩn dịch Việt' : 'Hiện dịch Việt'}
                </button>
            </div>

            {(question?.stem || question?.spokenQuestion) && (
                <div className="p-3 rounded-xl bg-sky-50/60 dark:bg-sky-950/25 border border-sky-200/70 dark:border-sky-900/50 space-y-1 text-xs sm:text-sm font-japanese">
                    {question?.stem && (
                        <p className="text-slate-600 dark:text-slate-300 font-semibold">
                            <span className="text-[10px] font-sans font-black uppercase text-sky-700 dark:text-sky-400 mr-1.5">Tình huống:</span>
                            {question.stem}
                        </p>
                    )}
                    {question?.spokenQuestion && (
                        <p className="text-slate-900 dark:text-white font-bold">
                            <span className="text-[10px] font-sans font-black uppercase text-emerald-700 dark:text-emerald-400 mr-1.5">Câu hỏi:</span>
                            {question.spokenQuestion}
                        </p>
                    )}
                </div>
            )}

            {spokenOpts.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {spokenOpts.map((spOpt, sIdx) => {
                        const highlight = revealAnswer && correctIdx === sIdx;
                        return (
                            <div
                                key={sIdx}
                                className={`px-3 py-1.5 rounded-xl border text-xs font-japanese flex items-center gap-2 ${
                                    highlight
                                        ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-400 text-emerald-900 dark:text-emerald-100 font-bold'
                                        : 'bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                                }`}
                            >
                                <span className="font-sans font-black text-[11px] opacity-75">{sIdx + 1}.</span>
                                <span>{spOpt}</span>
                            </div>
                        );
                    })}
                </div>
            )}

            {scriptLines.length > 0 && (
                <div className="space-y-2">
                    {scriptLines.map((line, lIdx) => {
                        const sp = String(line.speaker || 'Narrator');
                        const badgeStyle = sp === 'M'
                            ? 'bg-sky-100 dark:bg-sky-950/70 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-800'
                            : sp === 'F'
                                ? 'bg-amber-100 dark:bg-amber-950/70 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                                : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600';
                        const spLabel = sp === 'M' ? 'Nam' : sp === 'F' ? 'Nữ' : 'Dẫn';

                        return (
                            <div key={lIdx} className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-50/80 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800">
                                <button
                                    type="button"
                                    onClick={() => handleSpeakLine(line.ja || line.text)}
                                    className="p-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-emerald-600 cursor-pointer shrink-0 mt-0.5"
                                    title="Nghe câu thoại này"
                                >
                                    <Volume2 className={`w-3.5 h-3.5 ${playingVocab === (line.ja || line.text) ? 'text-emerald-500 animate-pulse' : ''}`} />
                                </button>
                                <span className={`px-2 py-0.5 rounded-md text-[10px] font-black border shrink-0 mt-0.5 ${badgeStyle}`}>
                                    {spLabel}
                                </span>
                                <div className="flex-1 min-w-0 space-y-0.5">
                                    <p className="font-japanese text-xs sm:text-sm font-semibold text-slate-900 dark:text-white leading-relaxed">
                                        {line.ja || line.text}
                                    </p>
                                    {showScriptVi && line.vi && (
                                        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                                            {line.vi}
                                        </p>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default React.memo(ListeningScriptBox);
