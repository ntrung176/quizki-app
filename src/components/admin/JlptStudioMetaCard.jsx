import React from 'react';
import { Sparkles } from 'lucide-react';
import {
    JLPT_LEVELS, JLPT_YEARS, JLPT_SESSIONS
} from '../jlptTest/jlptYearlyConstants';
import { RECOMMENDED_INGESTOR_MODELS } from '../../services/ai/aiPdfIngestorService';

/**
 * Target mode & exam metadata selector bar for JLPT Studio.
 */
const JlptStudioMetaCard = ({
    authorMode,
    setAuthorMode,
    level,
    setLevel,
    examYear,
    setExamYear,
    examSession,
    setExamSession,
    mondaiNumber,
    setMondaiNumber,
    mondaiChoices,
    aiModel,
    setAiModel,
    customTitle,
    setCustomTitle,
    defaultTitle,
    isPremium,
    setIsPremium
}) => {
    return (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border-2 border-slate-200 dark:border-slate-800 p-5 space-y-4 shadow-xs">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-emerald-500" />
                        Studio Soạn Đề Các Năm (2010–2025) &amp; Nghe Theo Mondai
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        Nạp PDF/Ảnh đề + Audio MP3 → Whisper bóc transcript có mốc giây → AI tách câu hỏi, script song ngữ Nhật–Việt và đáp án.
                    </p>
                </div>

                <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl">
                    {[
                        { id: 'yearly', label: 'Đề Các Năm (2010–2025)' },
                        { id: 'mondai', label: 'Nghe Theo Mondai' }
                    ].map((m) => (
                        <button
                            key={m.id}
                            type="button"
                            onClick={() => setAuthorMode(m.id)}
                            className={`px-3.5 py-2 rounded-xl text-xs font-black transition cursor-pointer ${
                                authorMode === m.id
                                    ? 'bg-emerald-500 text-white border-b-2 border-emerald-700'
                                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800'
                            }`}
                        >
                            {m.label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                <div>
                    <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Cấp độ JLPT</label>
                    <select
                        value={level}
                        onChange={(e) => setLevel(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs font-black text-slate-800 dark:text-white"
                    >
                        {JLPT_LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
                    </select>
                </div>

                <div>
                    <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Năm đề thi</label>
                    <select
                        value={examYear}
                        onChange={(e) => setExamYear(Number(e.target.value))}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs font-black text-slate-800 dark:text-white"
                    >
                        {JLPT_YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
                    </select>
                </div>

                <div>
                    <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Kỳ thi</label>
                    <select
                        value={examSession}
                        onChange={(e) => setExamSession(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs font-black text-slate-800 dark:text-white"
                    >
                        {JLPT_SESSIONS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
                    </select>
                </div>

                {authorMode === 'mondai' ? (
                    <div>
                        <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Mondai ({level})</label>
                        <select
                            value={mondaiNumber}
                            onChange={(e) => setMondaiNumber(Number(e.target.value))}
                            className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs font-bold text-slate-800 dark:text-white"
                        >
                            {mondaiChoices.map((m) => (
                                <option key={m.mondai} value={m.mondai}>M{m.mondai}: {m.vi}</option>
                            ))}
                        </select>
                    </div>
                ) : (
                    <div>
                        <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Model AI</label>
                        <select
                            value={aiModel}
                            onChange={(e) => setAiModel(e.target.value)}
                            className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs font-bold text-slate-800 dark:text-white"
                        >
                            {RECOMMENDED_INGESTOR_MODELS.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                        </select>
                    </div>
                )}

                <div className="col-span-2 flex items-end gap-3">
                    <div className="flex-1">
                        <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Tên hiển thị (tùy chọn)</label>
                        <input
                            type="text"
                            value={customTitle}
                            onChange={(e) => setCustomTitle(e.target.value)}
                            placeholder={defaultTitle}
                            className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs font-bold text-slate-800 dark:text-white"
                        />
                    </div>
                    <label className="flex items-center gap-1.5 pb-2 text-xs font-bold text-slate-600 dark:text-slate-300 cursor-pointer shrink-0">
                        <input type="checkbox" checked={isPremium} onChange={(e) => setIsPremium(e.target.checked)} className="w-4 h-4 accent-amber-500" />
                        <span>VIP</span>
                    </label>
                </div>
            </div>
        </div>
    );
};

export default JlptStudioMetaCard;
