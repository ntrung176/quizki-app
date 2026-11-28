import React, { useMemo, useState } from 'react';
import { Sparkles, Search, CheckCircle2, Headphones, Layers } from 'lucide-react';
import {
    JLPT_LEVELS, JLPT_YEARS, JLPT_SESSIONS, testHasListening, getLevelExamBlueprint
} from '../jlptTest/jlptYearlyConstants';

/**
 * Target mode, existing-exam picker (append/edit), and exam metadata bar for JLPT Studio.
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
    customTitle,
    setCustomTitle,
    defaultTitle,
    isPremium,
    setIsPremium,
    existingTests = [],
    targetTestId = '',
    onSelectTargetTest = () => {},
    targetOldTest = null,
    loadingOldTest = false,
    attachToYearly = true,
    setAttachToYearly = () => {},
    replaceOldListening = true,
    setReplaceOldListening = () => {}
}) => {
    const [oldSearch, setOldSearch] = useState('');
    const [onlyMissingAudio, setOnlyMissingAudio] = useState(() => !targetTestId);

    React.useEffect(() => {
        if (targetOldTest && testHasListening(targetOldTest)) {
            setOnlyMissingAudio(false);
        }
    }, [targetOldTest]);

    const candidateOldTests = useMemo(() => {
        const q = oldSearch.trim().toLowerCase();
        return (existingTests || [])
            .filter((t) => {
                if (!t || !t.id) return false;
                if (t.category === 'mondai_listening') return false;
                if (level && t.level && t.level !== level) return false;
                if (onlyMissingAudio && testHasListening(t)) return false;
                if (q) {
                    const hit = (t.title || '').toLowerCase().includes(q)
                        || String(t.id).toLowerCase().includes(q)
                        || (t.bookTitle || '').toLowerCase().includes(q);
                    if (!hit) return false;
                }
                return true;
            })
            .slice(0, 80);
    }, [existingTests, level, onlyMissingAudio, oldSearch]);

    const preservedSections = useMemo(
        () => (targetOldTest?.sections || []).filter((s) => s.type !== 'listening'),
        [targetOldTest]
    );

    const blueprint = useMemo(
        () => getLevelExamBlueprint(level, examYear),
        [level, examYear]
    );

    return (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border-2 border-slate-200 dark:border-slate-800 p-5 space-y-4 shadow-xs">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-emerald-500" />
                        Studio Soạn Đề Các Năm (2010–2025) &amp; Nghe Theo Mondai
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        Copy Prompt → Gửi PDF lên Gemini Pro (Neon) để lấy JSON → Dán JSON vào đề &amp; Cắt Audio thủ công theo Mondai.
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl">
                    {[
                        { id: 'yearly', label: 'Đề Các Năm (2010–2025)' },
                        { id: 'mondai', label: 'Nghe Theo Mondai' },
                        { id: 'append', label: 'Sửa / Ghép Đề Cũ' }
                    ].map((m) => (
                        <button
                            key={m.id}
                            type="button"
                            onClick={() => setAuthorMode(m.id)}
                            className={`px-3 py-2 rounded-xl text-xs font-black transition cursor-pointer ${
                                authorMode === m.id
                                    ? 'bg-emerald-500 text-white border-b-2 border-emerald-700'
                                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                            }`}
                        >
                            {m.label}
                        </button>
                    ))}
                </div>
            </div>

            {authorMode === 'append' && (
                <div className="rounded-2xl border-2 border-sky-200 dark:border-sky-900/60 bg-sky-50/50 dark:bg-sky-950/20 p-4 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-xs font-black text-sky-800 dark:text-sky-300 flex items-center gap-1.5">
                            <Headphones className="w-4 h-4 text-sky-500" />
                            Chọn đề cũ để xem/sửa câu đang có hoặc ghép/chạy lại phần Nghe AI (giữ nguyên Từ vựng / Ngữ pháp / Đọc hiểu)
                        </span>
                        <label className="flex items-center gap-1.5 text-[11px] font-bold text-slate-600 dark:text-slate-300 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={onlyMissingAudio}
                                onChange={(e) => setOnlyMissingAudio(e.target.checked)}
                                className="accent-sky-500"
                            />
                            <span>Chỉ hiện đề đang thiếu Nghe</span>
                        </label>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                        <div className="relative">
                            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                            <input
                                type="text"
                                value={oldSearch}
                                onChange={(e) => setOldSearch(e.target.value)}
                                placeholder={`Lọc tên / ID đề ${level}...`}
                                className="w-full pl-8 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs font-bold text-slate-800 dark:text-white"
                            />
                        </div>

                        <select
                            value={targetTestId}
                            onChange={(e) => onSelectTargetTest(e.target.value)}
                            className="md:col-span-2 w-full px-3 py-2 rounded-xl border border-sky-300 dark:border-sky-800 bg-white dark:bg-slate-950 text-xs font-bold text-slate-800 dark:text-white"
                        >
                            <option value="">-- Chọn đề {level} cần bổ sung Nghe ({candidateOldTests.length} đề khớp) --</option>
                            {candidateOldTests.map((t) => {
                                const qCount = t.questionCount || (t.sections || []).reduce((s, sec) => s + (sec.questions?.length || 0), 0);
                                const audioTag = testHasListening(t) ? 'Đã có Nghe' : 'Thiếu Nghe';
                                return (
                                    <option key={t.id} value={t.id}>
                                        [{t.level}] {t.title} ({qCount} câu · {audioTag})
                                    </option>
                                );
                            })}
                        </select>
                    </div>

                    {loadingOldTest && (
                        <p className="text-[11px] font-bold text-sky-600">Đang tải toàn bộ câu hỏi gốc của đề cũ...</p>
                    )}

                    {targetOldTest && !loadingOldTest && (
                        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[11px]">
                            <div className="flex flex-wrap items-center gap-1.5 text-emerald-700 dark:text-emerald-300 font-bold">
                                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                                <span>Đang chọn ID: <code className="font-mono">{targetOldTest.id}</code></span>
                                <span>•</span>
                                <span className="flex items-center gap-1">
                                    <Layers className="w-3 h-3" />
                                    Giữ nguyên {preservedSections.length} phần cũ ({preservedSections.reduce((s, sec) => s + (sec.questions?.length || 0), 0)} câu)
                                </span>
                            </div>

                            <div className="flex flex-wrap items-center gap-3">
                                <label className="flex items-center gap-1.5 font-bold text-slate-600 dark:text-slate-300 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={attachToYearly}
                                        onChange={(e) => setAttachToYearly(e.target.checked)}
                                        className="accent-emerald-500"
                                    />
                                    <span>Gắn vào Đề Các Năm ({examYear}-T{Number(examSession)})</span>
                                </label>
                                <label className="flex items-center gap-1.5 font-bold text-slate-600 dark:text-slate-300 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={replaceOldListening}
                                        onChange={(e) => setReplaceOldListening(e.target.checked)}
                                        className="accent-amber-500"
                                    />
                                    <span>Thay phần Nghe cũ (nếu có)</span>
                                </label>
                            </div>
                        </div>
                    )}
                </div>
            )}

            <div className={`grid grid-cols-2 sm:grid-cols-3 ${authorMode === 'mondai' ? 'lg:grid-cols-6' : 'lg:grid-cols-5'} gap-3`}>
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

                {authorMode === 'mondai' && (
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

            <div className="rounded-2xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 px-3.5 py-2.5 space-y-1.5">
                <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
                    <span className="font-black text-emerald-700 dark:text-emerald-400">
                        Chuẩn form JLPT {blueprint.level} · {blueprint.eraLabel}
                    </span>
                    <span className="text-slate-500 dark:text-slate-400 font-medium">
                        {blueprint.blueprint.bookletNote}
                    </span>
                </div>
                {authorMode !== 'mondai' && (
                    <div className="text-[11px] font-bold text-sky-700 dark:text-sky-400">
                        Ngôn ngữ &amp; Đọc hiểu: {blueprint.langReadingSummary}
                    </div>
                )}
                <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[10px] font-black uppercase text-amber-700 dark:text-amber-400 mr-1">Nghe:</span>
                    {blueprint.listeningSummaryPills.map((pill) => (
                        <span key={pill} className="px-2 py-0.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-[10px] font-bold text-slate-700 dark:text-slate-300">
                            {pill}
                        </span>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default JlptStudioMetaCard;
