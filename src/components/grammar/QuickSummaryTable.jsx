import React from 'react';
import { Bookmark, Sparkles, Pin } from 'lucide-react';
import { speakExampleSentence } from '../../utils/audio';

const QuickSummaryTable = ({ headers = ['Mục', 'Tóm tắt'], rows = [], keySentence = '' }) => {
    if ((!rows || rows.length === 0) && !keySentence) return null;

    return (
        <div className="bg-gradient-to-br from-purple-500/10 via-purple-500/5 to-transparent border border-purple-500/20 rounded-2xl p-5 mb-6 backdrop-blur-md shadow-sm">
            {/* Header */}
            <div className="flex items-center gap-2.5 mb-4">
                <div className="w-9 h-9 rounded-xl bg-purple-500/15 flex items-center justify-center text-purple-500">
                    <Bookmark className="w-5 h-5" />
                </div>
                <div>
                    <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                        Bảng tổng kết 1 phút
                        <span className="text-sm">🗂️</span>
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Tóm tắt nhanh để ôn tập trước khi thi</p>
                </div>
            </div>

            {/* Key takeaway sentence */}
            {keySentence && (
                <div className="mb-4 bg-purple-500/15 border border-purple-500/30 rounded-xl p-3.5 flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2.5">
                        <Pin className="w-4 h-4 text-purple-600 dark:text-purple-400 mt-0.5 shrink-0" />
                        <div>
                            <div className="text-xs font-bold uppercase tracking-wider text-purple-700 dark:text-purple-300 mb-0.5">
                                Câu "Đinh" cốt lõi cần nhớ
                            </div>
                            <div className="text-sm font-semibold text-slate-800 dark:text-slate-100 font-japanese">
                                {keySentence}
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={() => speakExampleSentence(keySentence)}
                        className="p-1.5 rounded-lg bg-white/60 dark:bg-slate-800/60 hover:bg-purple-600 hover:text-white transition text-purple-600 dark:text-purple-300 shrink-0"
                        title="Nghe phát âm"
                    >
                        🔊
                    </button>
                </div>
            )}

            {/* Table */}
            {rows && rows.length > 0 && (
                <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700/80 bg-white/60 dark:bg-slate-800/60">
                    <table className="w-full text-left border-collapse text-xs sm:text-sm">
                        <thead>
                            <tr className="bg-purple-500/15 border-b border-purple-500/20 text-purple-900 dark:text-purple-300 font-bold">
                                <th className="p-3 w-1/3">{headers[0] || 'Mục'}</th>
                                <th className="p-3 w-2/3">{headers[1] || 'Nội dung'}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-slate-700/60">
                            {rows.map((row, idx) => (
                                <tr key={idx} className="hover:bg-purple-500/5 transition">
                                    <td className="p-3 font-semibold text-slate-700 dark:text-slate-300 align-top">
                                        {row[0]}
                                    </td>
                                    <td className="p-3 text-slate-600 dark:text-slate-300 font-medium">
                                        {row[1]}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default QuickSummaryTable;
