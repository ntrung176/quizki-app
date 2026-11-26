import React from 'react';
import { RotateCcw } from 'lucide-react';
import FuriganaText from '../../ui/FuriganaText';

/**
 * Duolingo-style Interactive Word-Bank Sentence Builder
 * Users tap shuffled Japanese chips from the tray to assemble a sentence in the answer slots.
 */
const RoadmapWordBankQuestion = ({
    bankTokens = [],
    selectedTokenIds = [],
    answerStatus = null,
    onAddToken,
    onRemoveToken,
    onClearTokens
}) => {
    const selectedSet = new Set(selectedTokenIds);
    const tokenById = new Map(bankTokens.map((tok) => [tok.id, tok]));

    return (
        <div className="space-y-5 pt-1">
            {/* 1. Sentence Construction Tray */}
            <div
                className={`min-h-[84px] p-4 rounded-3xl border-2 transition-all flex flex-wrap items-center gap-2 ${
                    answerStatus === 'correct'
                        ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-400 dark:border-emerald-700'
                        : answerStatus === 'incorrect'
                        ? 'bg-rose-50/70 dark:bg-rose-950/30 border-rose-400 dark:border-rose-700'
                        : 'bg-slate-50/80 dark:bg-slate-900/70 border-slate-200 dark:border-slate-800'
                }`}
            >
                {selectedTokenIds.length === 0 ? (
                    <span className="text-xs sm:text-sm font-semibold text-slate-400 dark:text-slate-500 select-none">
                        Chạm vào các thẻ từ bên dưới theo đúng thứ tự để ghép câu...
                    </span>
                ) : (
                    selectedTokenIds.map((tokId) => {
                        const tok = tokenById.get(tokId);
                        if (!tok) return null;
                        return (
                            <button
                                key={tokId}
                                type="button"
                                disabled={!!answerStatus}
                                onClick={() => onRemoveToken(tokId)}
                                className={`px-3.5 py-2 rounded-2xl border-2 border-b-4 font-bold text-sm sm:text-base transition-all select-none active:translate-y-0.5 active:border-b-2 ${
                                    answerStatus === 'correct'
                                        ? 'bg-emerald-500 border-emerald-400 border-b-emerald-700 text-white'
                                        : answerStatus === 'incorrect'
                                        ? 'bg-rose-500 border-rose-400 border-b-rose-700 text-white'
                                        : 'bg-white dark:bg-slate-800 border-sky-400 dark:border-sky-600 border-b-sky-600 text-slate-900 dark:text-white cursor-pointer shadow-xs'
                                }`}
                            >
                                <FuriganaText text={tok.text} compact nowrap />
                            </button>
                        );
                    })
                )}

                {selectedTokenIds.length > 0 && !answerStatus && (
                    <button
                        type="button"
                        onClick={onClearTokens}
                        title="Xếp lại từ đầu"
                        className="ml-auto p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition cursor-pointer"
                    >
                        <RotateCcw className="w-4 h-4" />
                    </button>
                )}
            </div>

            {/* 2. Word Bank Pool */}
            <div className="flex flex-wrap items-center justify-center gap-2.5 sm:gap-3 pt-1">
                {bankTokens.map((tok) => {
                    const isUsed = selectedSet.has(tok.id);
                    return (
                        <button
                            key={tok.id}
                            type="button"
                            disabled={isUsed || !!answerStatus}
                            onClick={() => onAddToken(tok)}
                            className={`px-4 py-2.5 rounded-2xl border-2 border-b-4 font-bold text-sm sm:text-base transition-all select-none ${
                                isUsed
                                    ? 'bg-slate-200/70 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 border-b-slate-200 dark:border-b-slate-800 text-transparent cursor-default'
                                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 border-b-slate-300 dark:border-b-slate-800 text-slate-800 dark:text-slate-100 hover:border-sky-400 dark:hover:border-sky-600 active:translate-y-0.5 active:border-b-2 cursor-pointer shadow-xs'
                            }`}
                        >
                            <span className={isUsed ? 'invisible' : ''}>
                                <FuriganaText text={tok.text} compact nowrap />
                            </span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
};

export default RoadmapWordBankQuestion;
