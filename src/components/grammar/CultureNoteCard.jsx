import React from 'react';
import { ShieldAlert, CheckCircle2, XCircle, Globe, Flame } from 'lucide-react';
import { speakExampleSentence } from '../../utils/audio';

const CultureNoteCard = ({ cultureNotes, traps = [], examples = [] }) => {
    if ((!cultureNotes || cultureNotes.length === 0) && traps.length === 0 && examples.length === 0) {
        return null;
    }

    return (
        <div className="bg-gradient-to-br from-rose-500/10 via-rose-500/5 to-transparent border border-rose-500/20 rounded-2xl p-5 mb-6 backdrop-blur-md shadow-sm">
            {/* Header */}
            <div className="flex items-center gap-2.5 mb-4">
                <div className="w-9 h-9 rounded-xl bg-rose-500/15 flex items-center justify-center text-rose-500">
                    <Globe className="w-5 h-5" />
                </div>
                <div>
                    <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                        Lưu ý văn hóa & Ngữ cảnh đời sống
                        <span className="text-sm">🇯🇵</span>
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Cách người Nhật tư duy & phân biệt Đúng (✅) vs Sai/Kém tự nhiên (❌)</p>
                </div>
            </div>

            {/* Cultural explanation blocks */}
            {cultureNotes && cultureNotes.map((note, idx) => (
                <div key={idx} className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed mb-4 bg-rose-500/10 rounded-xl p-3 border border-rose-500/15">
                    {note}
                </div>
            ))}

            {/* Traps & Mistakes list */}
            {traps && traps.length > 0 && (
                <div className="space-y-3 mb-4">
                    {traps.map((trap, idx) => (
                        <div key={idx} className="bg-white/80 dark:bg-slate-800/80 rounded-xl p-3.5 border border-slate-200 dark:border-slate-700">
                            <div className="flex items-start gap-2 mb-1.5 text-rose-600 dark:text-rose-400 text-sm font-semibold">
                                <XCircle className="w-4 h-4 mt-0.5 shrink-0" />
                                <span>{trap.wrong}</span>
                            </div>
                            <div className="flex items-start gap-2 text-emerald-600 dark:text-emerald-400 text-sm font-semibold mb-2">
                                <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
                                <span>{trap.correct}</span>
                            </div>
                            {trap.reason && (
                                <p className="text-xs text-slate-600 dark:text-slate-400 pl-6 border-l-2 border-slate-300 dark:border-slate-600">
                                    {trap.reason}
                                </p>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* Natural vs Unnatural examples */}
            {examples && examples.length > 0 && (
                <div className="space-y-2">
                    {examples.map((ex, idx) => {
                        const isCorrect = ex.jp?.includes('✅') || ex.kind === 'correct' || !ex.jp?.includes('❌');
                        return (
                            <div
                                key={idx}
                                className={`rounded-xl p-3 text-sm border flex items-start justify-between gap-3 ${
                                    isCorrect
                                        ? 'bg-emerald-500/10 border-emerald-500/20 text-slate-800 dark:text-slate-200'
                                        : 'bg-rose-500/10 border-rose-500/20 text-rose-700 dark:text-rose-300'
                                }`}
                            >
                                <div className="space-y-1">
                                    <div className="font-japanese font-medium flex items-center gap-2">
                                        {ex.jp}
                                    </div>
                                    {ex.vi && (
                                        <div className="text-xs text-slate-600 dark:text-slate-400">
                                            {ex.vi}
                                        </div>
                                    )}
                                    {ex.note && (
                                        <div className="text-[11px] text-slate-500 dark:text-slate-400 italic">
                                            {ex.note}
                                        </div>
                                    )}
                                </div>
                                <button
                                    onClick={() => speakExampleSentence(ex.jp?.replace(/[✅❌]/g, '').trim())}
                                    className="p-1.5 rounded-lg bg-slate-200/50 dark:bg-slate-700/50 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 transition"
                                    title="Nghe phát âm"
                                >
                                    🔊
                                </button>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default CultureNoteCard;
