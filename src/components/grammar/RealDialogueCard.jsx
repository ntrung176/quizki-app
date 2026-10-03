import React from 'react';
import { MessageSquare, Volume2, User } from 'lucide-react';
import { speakExampleSentence } from '../../utils/audio';

const RealDialogueCard = ({ dialogues }) => {
    if (!dialogues || dialogues.length === 0) return null;

    return (
        <div className="bg-gradient-to-br from-teal-500/10 via-teal-500/5 to-transparent border border-teal-500/20 rounded-2xl p-5 mb-6 backdrop-blur-md shadow-sm">
            {/* Header */}
            <div className="flex items-center gap-2.5 mb-4">
                <div className="w-9 h-9 rounded-xl bg-teal-500/15 flex items-center justify-center text-teal-500">
                    <MessageSquare className="w-5 h-5" />
                </div>
                <div>
                    <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                        Hội thoại thực tế
                        <span className="text-sm">💬</span>
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Quan sát mẫu câu được vận dụng trong đời sống thực</p>
                </div>
            </div>

            {/* Dialogues list */}
            <div className="space-y-6">
                {dialogues.map((dlg, dIdx) => (
                    <div key={dIdx} className="bg-white/70 dark:bg-slate-800/70 border border-slate-200/80 dark:border-slate-700/80 rounded-xl p-4">
                        {/* Context Title */}
                        {dlg.context && (
                            <div className="text-xs font-bold text-teal-700 dark:text-teal-400 uppercase tracking-wider mb-3 flex items-center gap-1.5 border-b border-slate-200 dark:border-slate-700 pb-2">
                                📌 {dlg.context}
                            </div>
                        )}

                        {/* Dialogue Lines */}
                        <div className="space-y-3">
                            {dlg.lines?.map((line, lIdx) => {
                                const isWhoA = line.who === 'A' || line.who === '母' || line.who === '上司' || lIdx % 2 === 0;
                                return (
                                    <div
                                        key={lIdx}
                                        className={`flex items-start gap-3 ${
                                            isWhoA ? '' : 'flex-row-reverse'
                                        }`}
                                    >
                                        {/* Avatar */}
                                        <div
                                            className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 shadow-sm ${
                                                isWhoA
                                                    ? 'bg-teal-500/20 text-teal-600 dark:text-teal-300'
                                                    : 'bg-indigo-500/20 text-indigo-600 dark:text-indigo-300'
                                            }`}
                                        >
                                            {line.who || (isWhoA ? 'A' : 'B')}
                                        </div>

                                        {/* Speech Bubble */}
                                        <div
                                            className={`max-w-[85%] rounded-2xl p-3 text-sm relative group ${
                                                isWhoA
                                                    ? 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-tl-none'
                                                    : 'bg-teal-500/15 border border-teal-500/20 dark:bg-teal-950/40 rounded-tr-none'
                                            }`}
                                        >
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="font-japanese font-medium text-slate-800 dark:text-slate-100 text-sm">
                                                    {line.jp}
                                                </div>
                                                <button
                                                    onClick={() => speakExampleSentence(line.jp)}
                                                    className="p-1 rounded bg-slate-100 dark:bg-slate-700 hover:bg-teal-500 hover:text-white transition text-slate-500 shrink-0"
                                                    title="Nghe audio"
                                                >
                                                    <Volume2 className="w-3.5 h-3.5" />
                                                </button>
                                            </div>

                                            {line.vi && (
                                                <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                                                    {line.vi}
                                                </div>
                                            )}

                                            {line.note && (
                                                <div className="text-[11px] text-teal-600 dark:text-teal-400 mt-1 italic">
                                                    👉 {line.note}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default RealDialogueCard;
