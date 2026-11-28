import React, { useState } from 'react';
import { Award, AlertTriangle, ChevronDown, ChevronUp, Info, CheckCircle2, XCircle } from 'lucide-react';

/**
 * Displays JLPT official scaled scores (0..180, domain cutoffs 19/38) and collapsible per-Mondai breakdown.
 */
const JlptScoreBreakdownCard = ({ jlptScore = null }) => {
    const [showMondaiTable, setShowMondaiTable] = useState(false);
    if (!jlptScore || !Array.isArray(jlptScore.domains) || jlptScore.domains.length === 0) {
        return null;
    }

    const {
        level,
        isFullJlptExam,
        anyScaledFromLegacy,
        totalScore,
        maxScore,
        passThreshold,
        officialPassTotal,
        passed,
        failedByCutoffOnly,
        cutoffFailedLabels = [],
        domains
    } = jlptScore;

    return (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border-2 border-slate-200/80 dark:border-slate-800 p-4 sm:p-6 shadow-xs space-y-4">
            {/* Header Summary Row */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2.5">
                    <div className={`w-9 h-9 rounded-2xl flex items-center justify-center shrink-0 ${
                        passed ? 'bg-emerald-500 text-white' : 'bg-amber-500 text-white'
                    }`}>
                        <Award className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white flex items-center gap-2 flex-wrap">
                            <span>Thang điểm chuẩn JLPT {level}</span>
                            <span className={`px-2 py-0.5 rounded-lg text-[11px] font-black ${
                                passed
                                    ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                                    : 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300'
                            }`}>
                                {passed ? 'ĐẠT CHUẨN ĐỖ' : (failedByCutoffOnly ? 'TRƯỢT ĐIỂM LIỆT' : 'CHƯA ĐẠT CHUẨN')}
                            </span>
                        </h3>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                            {anyScaledFromLegacy
                                ? `Quy đổi theo trọng số từng Mondai (tự động co giãn đề cũ về chuẩn ${maxScore}đ)`
                                : `Áp dụng bảng trọng số từng Mondai chuẩn DungMori (mức đỗ ${level}: ≥ ${officialPassTotal}/180đ)`}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="text-right">
                        <div className="text-xl sm:text-2xl font-black font-mono text-slate-900 dark:text-white">
                            {totalScore} <span className="text-xs sm:text-sm text-slate-400 font-bold">/ {maxScore}</span>
                        </div>
                        <div className="text-[10px] font-bold text-slate-500">
                            Cần ≥ {passThreshold}/{maxScore} &amp; không liệt
                        </div>
                    </div>
                </div>
            </div>

            {/* Cutoff or Partial Alerts */}
            {failedByCutoffOnly && (
                <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/35 border border-rose-200 dark:border-rose-900/60 text-rose-800 dark:text-rose-200 text-xs font-bold flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                    <span>
                        Tổng điểm ({totalScore}) đủ ngưỡng đỗ, nhưng có phần chưa vượt điểm liệt: <strong>{cutoffFailedLabels.join(', ')}</strong>.
                    </span>
                </div>
            )}

            {!isFullJlptExam && (
                <div className="p-2.5 rounded-2xl bg-sky-50 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-900/50 text-sky-800 dark:text-sky-200 text-[11px] font-semibold flex items-center gap-2">
                    <Info className="w-3.5 h-3.5 text-sky-500 shrink-0" />
                    <span>
                        Bài thi hiện có {maxScore}/180 điểm tối đa (thiếu phần còn lại). Khi đủ Ngôn ngữ + Đọc + Nghe sẽ cộng đủ 180 điểm.
                    </span>
                </div>
            )}

            {/* Official Domain Bars */}
            <div className={`grid grid-cols-1 gap-3 ${domains.length >= 3 ? 'md:grid-cols-3' : domains.length === 2 ? 'md:grid-cols-2' : ''}`}>
                {domains.map((dom) => {
                    const pct = dom.max > 0 ? Math.min(100, Math.round((dom.score / dom.max) * 100)) : 0;
                    const cutoffPct = dom.max > 0 ? Math.min(100, Math.round((dom.minPass / dom.max) * 100)) : 32;
                    return (
                        <div
                            key={dom.id}
                            className={`rounded-2xl p-3.5 border space-y-2.5 ${
                                dom.passedCutoff
                                    ? 'bg-slate-50/70 dark:bg-slate-950/40 border-slate-200 dark:border-slate-800'
                                    : 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/60'
                            }`}
                        >
                            <div className="flex items-start justify-between gap-2">
                                <div>
                                    <div className="text-xs font-black text-slate-900 dark:text-white">{dom.label}</div>
                                    <div className="text-[10px] font-bold text-slate-400 font-japanese">{dom.ja} · {dom.correctCount}/{dom.totalQuestions} câu đúng</div>
                                </div>
                                <div className="text-right shrink-0">
                                    <span className={`text-base font-black font-mono ${dom.passedCutoff ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                                        {dom.score}
                                    </span>
                                    <span className="text-xs font-bold text-slate-400">/{dom.max}</span>
                                </div>
                            </div>

                            <div className="relative h-2.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                                <div
                                    className={`h-full rounded-full transition-all duration-500 ${dom.passedCutoff ? 'bg-emerald-500' : 'bg-rose-500'}`}
                                    style={{ width: `${pct}%` }}
                                />
                                <div
                                    className="absolute top-0 bottom-0 w-0.5 bg-slate-900/60 dark:bg-white/70"
                                    style={{ left: `${cutoffPct}%` }}
                                    title={`Điểm liệt: ${dom.minPass}/${dom.max}`}
                                />
                            </div>

                            <div className="flex items-center justify-between text-[10px] font-bold">
                                <span className="text-slate-500">Điểm liệt: &lt; {dom.minPass}/{dom.max}</span>
                                <span className={`inline-flex items-center gap-1 ${dom.passedCutoff ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                                    {dom.passedCutoff ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                                    <span>{dom.passedCutoff ? 'Qua điểm liệt' : 'Dưới điểm liệt'}</span>
                                </span>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Expandable Per-Mondai Detail Table */}
            <div className="pt-1">
                <button
                    type="button"
                    onClick={() => setShowMondaiTable((v) => !v)}
                    className="w-full py-2 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200/80 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-black flex items-center justify-center gap-1.5 cursor-pointer transition"
                >
                    {showMondaiTable ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    <span>{showMondaiTable ? 'Thu gọn bảng điểm từng Mondai' : 'Xem chi tiết hệ số & điểm từng Mondai'}</span>
                </button>

                {showMondaiTable && (
                    <div className="mt-3 overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
                        <table className="w-full text-left text-xs">
                            <thead className="bg-slate-50 dark:bg-slate-800/80 text-[10px] font-black uppercase text-slate-500">
                                <tr>
                                    <th className="py-2 px-3">Phần / Mondai</th>
                                    <th className="py-2 px-3 text-center">Đúng / Tổng</th>
                                    <th className="py-2 px-3 text-center">Điểm / Câu</th>
                                    <th className="py-2 px-3 text-right">Điểm quy đổi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {domains.flatMap((dom) => dom.mondais.map((m, idx) => (
                                    <tr key={`${dom.id}_${idx}`} className="bg-white dark:bg-slate-900">
                                        <td className="py-2 px-3">
                                            <span className="font-bold text-slate-800 dark:text-slate-100 font-japanese">
                                                問題{m.mondai} · {m.ja}
                                            </span>
                                            <span className="block text-[10px] text-slate-500">{dom.label} ({m.vi})</span>
                                        </td>
                                        <td className="py-2 px-3 text-center font-mono font-bold text-slate-700 dark:text-slate-300">
                                            {m.correctCount}/{m.totalQuestions}
                                        </td>
                                        <td className="py-2 px-3 text-center font-mono font-black text-amber-600 dark:text-amber-400">
                                            {m.scaledPerQuestion}đ
                                        </td>
                                        <td className="py-2 px-3 text-right font-mono font-black text-emerald-600 dark:text-emerald-400">
                                            {m.scaledEarned} / {m.scaledMax}
                                        </td>
                                    </tr>
                                )))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default React.memo(JlptScoreBreakdownCard);
