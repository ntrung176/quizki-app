import React, { useMemo, useState } from 'react';
import { Save, Download, Layers, Loader2, Plus, Trash2, Code, Copy, Check, ClipboardPaste, Sparkles, Scissors, Wand2 } from 'lucide-react';
import ListeningQuestionEditorCard from './ListeningQuestionEditorCard';
import { splitListeningIntoMondaiTests, downloadJsonFile } from '../../services/ai/jlptAuthoringService';
import { parseGeminiExternalJsonBundle, mergeListeningScriptAndQuestions } from '../../services/ai/jlptLangReadingAuthoringService';
import { aiBatchAnalyzeReadingSections, hasRichReadingAnalysis } from '../../services/ai/jlptExplanationAiService';
import { buildGeminiWebExtractionPrompt } from '../jlptTest/jlptLevelBlueprints';
import { resolveQuestionMondai } from '../jlptTest/jlptYearlyConstants';
import { showToast } from '../../utils/toast';

const GEMINI_PROMPT_BUTTONS = [
    { part: 'vocab_grammar', label: 'Copy Prompt P1 (Từ vựng + Ngữ pháp)' },
    { part: 'reading', label: 'Copy Prompt P2 (Đọc hiểu 読解)' },
    { part: 'listening', label: 'Copy Prompt P3 (Nghe hiểu 聴解 · 0 cần MP3)' },
    { part: 'listening_script_explain', label: 'Copy Prompt Script + Giải thích Nghe (gửi Script cho Neon)' },
    { part: 'full_exam', label: 'Copy Prompt NGUYÊN ĐỀ (Cả 4 phần + Nghe)' },
    { part: 'all', label: 'Copy Prompt P1+P2 (Ngôn ngữ + Đọc)' }
];

const PROMPT_TOAST_NAMES = {
    vocab_grammar: 'P1: Từ vựng + Ngữ pháp',
    reading: 'P2: Đọc hiểu',
    listening: 'P3: Nghe hiểu (dùng PDF đề nghe + Script)',
    listening_script_explain: 'Script + Giải thích Nghe (chỉ cần gửi Script PDF cho Neon)',
    full_exam: 'Nguyên đề 4 phần (cả Nghe hiểu)',
    all: 'P1+P2: Ngôn ngữ + Đọc hiểu'
};

/**
 * Editor, JSON preview, and publish workspace for authored JLPT tests.
 */
const JlptStudioEditorPanel = ({
    editorSubTab,
    setEditorSubTab,
    listeningQuestions,
    setListeningQuestions,
    totalLangQ,
    savingDb,
    handleSaveToApp,
    authorMode,
    handleSplitAndSaveMondais,
    currentTestPreview,
    level,
    examYear,
    examSession,
    addBlankListeningQuestion,
    firstListenPdf,
    listenImageFiles,
    setCropTargetIdx,
    nonListeningSections,
    setNonListeningSections,
    mondaiAudioUrls = {},
    audioUrl = '',
    onOpenMondaiSlicer = () => {}
}) => {
    const [copiedPromptType, setCopiedPromptType] = useState('');
    const [showGeminiImportBox, setShowGeminiImportBox] = useState(true);
    const [geminiJsonDraft, setGeminiJsonDraft] = useState('');
    const [importMergeMode, setImportMergeMode] = useState('append'); // 'append' | 'replace'
    const [readingAnalyzeState, setReadingAnalyzeState] = useState(null);

    const studioPassageStats = useMemo(() => {
        const seen = new Set();
        let total = 0;
        let missing = 0;
        (nonListeningSections || []).forEach((sec) => {
            (sec?.questions || []).forEach((q) => {
                const raw = String(q?.passage || '').trim();
                if (!raw || raw.replace(/<[^>]+>/g, '').trim().length < 20) return;
                const key = raw.replace(/\s+/g, ' ').trim();
                if (seen.has(key)) return;
                seen.add(key);
                total += 1;
                if (!hasRichReadingAnalysis(q)) missing += 1;
            });
        });
        return { total, missing };
    }, [nonListeningSections]);

    const handleStudioBatchAnalyzeReading = async () => {
        if (studioPassageStats.total === 0 || readingAnalyzeState) return;
        setReadingAnalyzeState({ percent: 5, detail: 'Đang chuẩn bị AI phân tích các bài đọc...' });
        try {
            const { updatedSections, analyzedCount } = await aiBatchAnalyzeReadingSections(nonListeningSections, {
                level,
                forceAll: studioPassageStats.missing === 0,
                onProgress: (p) => setReadingAnalyzeState(p)
            });
            setNonListeningSections(updatedSections);
            if (analyzedCount > 0) {
                showToast(`✨ Đã tạo phân tích chi tiết cho ${analyzedCount} bài đọc! Bấm "Lưu vào App" để lưu vĩnh viễn.`, 'success');
            } else {
                showToast('Tất cả bài đọc đều đã có dữ liệu phân tích.', 'info');
            }
        } catch (err) {
            showToast('Lỗi AI phân tích bài đọc: ' + err.message, 'error');
        } finally {
            setReadingAnalyzeState(null);
        }
    };

    const handleCopyGeminiPrompt = async (part) => {
        const promptText = buildGeminiWebExtractionPrompt({
            level,
            examYear,
            examSession,
            part
        });
        try {
            await navigator.clipboard.writeText(promptText);
            setCopiedPromptType(part);
            showToast(`Đã copy Prompt chuẩn ${level} (${PROMPT_TOAST_NAMES[part] || part}) — mở Gemini Pro Web (4 Neon) dán PDF & chạy ngay!`, 'success');
            setTimeout(() => setCopiedPromptType(''), 2500);
        } catch {
            showToast('Trình duyệt không cho phép auto-copy, hãy thử lại.', 'error');
        }
    };

    const handleImportGeminiJson = () => {
        if (!geminiJsonDraft.trim()) {
            return showToast('Hãy dán đoạn JSON mà Gemini Pro vừa xuất vào ô trước.', 'warning');
        }
        try {
            const { nonListeningSections: parsedSections, listeningQuestions: parsedListening } =
                parseGeminiExternalJsonBundle(geminiJsonDraft, level, mondaiAudioUrls);

            const langCount = parsedSections.reduce((s, sec) => s + (sec.questions?.length || 0), 0);
            const listenCount = parsedListening.length;

            if (langCount > 0) {
                if (nonListeningSections.length === 0) {
                    setNonListeningSections(parsedSections);
                } else if (importMergeMode === 'replace') {
                    // Replace only matching section types so importing P2 Reading doesn't delete P1 Vocab/Grammar
                    setNonListeningSections((prev) => {
                        const incomingByType = new Map(parsedSections.map((s) => [s.type, s]));
                        const updated = prev.map((sec) => (incomingByType.has(sec.type) ? incomingByType.get(sec.type) : sec));
                        parsedSections.forEach((inc) => {
                            if (!prev.some((s) => s.type === inc.type)) updated.push(inc);
                        });
                        return updated;
                    });
                } else {
                    setNonListeningSections((prev) => {
                        const merged = [...prev];
                        parsedSections.forEach((inc) => {
                            const existingIdx = merged.findIndex((s) => s.type === inc.type);
                            if (existingIdx !== -1) {
                                const existingSec = merged[existingIdx];
                                const existingNums = new Set((existingSec.questions || []).map((q) => q.questionNumber).filter(Boolean));
                                const appended = inc.questions.filter((q) => !q.questionNumber || !existingNums.has(q.questionNumber));
                                merged[existingIdx] = {
                                    ...existingSec,
                                    questions: [...(existingSec.questions || []), ...appended]
                                };
                            } else {
                                merged.push(inc);
                            }
                        });
                        return merged;
                    });
                }
            }

            if (listenCount > 0) {
                setListeningQuestions((prev) => mergeListeningScriptAndQuestions(prev, parsedListening, importMergeMode, mondaiAudioUrls, audioUrl));
            }

            if (listenCount > 0 && langCount === 0) setEditorSubTab('listening');
            else if (langCount > 0 && listenCount === 0) setEditorSubTab('reading');

            setGeminiJsonDraft('');
            showToast(
                `Đã nhập từ Gemini: ${langCount > 0 ? `${langCount} câu Ngôn ngữ/Đọc` : ''}${langCount > 0 && listenCount > 0 ? ' + ' : ''}${listenCount > 0 ? `${listenCount} câu Nghe hiểu` : ''}!`,
                'success'
            );
        } catch (err) {
            showToast(err.message, 'error');
        }
    };

    const mondaiSummaryCounts = useMemo(() => {
        const counts = new Map();
        listeningQuestions.forEach((q) => {
            const m = resolveQuestionMondai(q);
            counts.set(m, (counts.get(m) || 0) + 1);
        });
        return Array.from(counts.entries()).sort((a, b) => a[0] - b[0]);
    }, [listeningQuestions]);

    return (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border-2 border-slate-200 dark:border-slate-800 p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl">
                    {[
                        { id: 'listening', label: `Câu Nghe Hiểu (${listeningQuestions.length})` },
                        { id: 'reading', label: `Từ vựng & Đọc (${totalLangQ})` },
                        { id: 'json', label: 'Xem JSON Chuẩn' }
                    ].map((t) => (
                        <button
                            key={t.id}
                            type="button"
                            onClick={() => setEditorSubTab(t.id)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer ${
                                editorSubTab === t.id
                                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs'
                                    : 'text-slate-500 dark:text-slate-400'
                            }`}
                        >
                            {t.label}
                        </button>
                    ))}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <button
                        type="button"
                        disabled={savingDb}
                        onClick={handleSaveToApp}
                        className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 border-b-4 border-emerald-700 disabled:opacity-50 text-white text-xs font-black flex items-center gap-1.5 cursor-pointer"
                    >
                        {savingDb ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                        <span>Lưu vào App (Firestore)</span>
                    </button>

                    {(authorMode === 'yearly' || authorMode === 'append') && listeningQuestions.length > 0 && (
                        <button
                            type="button"
                            disabled={savingDb}
                            onClick={handleSplitAndSaveMondais}
                            className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 border-b-4 border-amber-700 disabled:opacity-50 text-white text-xs font-black flex items-center gap-1.5 cursor-pointer"
                        >
                            <Layers className="w-3.5 h-3.5" />
                            <span>Tách &amp; Lưu Menu Mondai</span>
                        </button>
                    )}

                    <button
                        type="button"
                        onClick={() => downloadJsonFile(currentTestPreview, `${currentTestPreview.id}.json`)}
                        className="px-3 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 border-b-4 border-sky-700 text-white text-xs font-black flex items-center gap-1.5 cursor-pointer"
                    >
                        <Download className="w-3.5 h-3.5" />
                        <span>Tải JSON</span>
                    </button>

                    {listeningQuestions.length > 0 && (
                        <button
                            type="button"
                            onClick={() => downloadJsonFile(splitListeningIntoMondaiTests(currentTestPreview), `mondai_${level.toLowerCase()}_${examYear}_${examSession}.json`)}
                            className="px-3 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 border-b-4 border-slate-900 text-white text-xs font-black flex items-center gap-1.5 cursor-pointer"
                        >
                            <Code className="w-3.5 h-3.5" />
                            <span>Tải JSON Mondai</span>
                        </button>
                    )}
                </div>
            </div>

            {/* Gemini Web (Pro / 4 Neon) Unified Prompt Copy & Direct JSON Paste Importer (P1, P2, P3 Nghe, Full 4-Phần) */}
            <div className="rounded-2xl border-2 border-sky-200 dark:border-sky-900/60 bg-sky-50/60 dark:bg-sky-950/25 p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                        <h4 className="text-xs sm:text-sm font-black text-sky-900 dark:text-sky-200 flex items-center gap-1.5">
                            <Sparkles className="w-4 h-4 text-sky-500" />
                            Soạn nhanh bằng Gemini Pro Web (4 Neon) — Hỗ trợ cả Đọc hiểu &amp; Nghe hiểu (chưa cần MP3)
                        </h4>
                        <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5">
                            Copy Prompt P1 / P2 / P3 (hoặc Nguyên đề) → dán PDF đề + Script/Đáp án lên <strong>Gemini 4 Neon (Cao)</strong> → dán JSON vào đây, rồi dùng nút <strong>Cắt Audio theo Mondai</strong> để gắn file nghe!
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={() => setShowGeminiImportBox((v) => !v)}
                        className="px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 border-b-2 border-emerald-700 text-white text-xs font-black flex items-center gap-1.5 cursor-pointer shrink-0"
                    >
                        <ClipboardPaste className="w-3.5 h-3.5" />
                        <span>{showGeminiImportBox ? 'Đóng ô dán JSON' : 'Dán JSON từ Gemini Pro'}</span>
                    </button>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    {GEMINI_PROMPT_BUTTONS.map((btn) => (
                        <button
                            key={btn.part}
                            type="button"
                            onClick={() => handleCopyGeminiPrompt(btn.part)}
                            className={`px-3 py-1.5 rounded-xl border text-[11px] font-black flex items-center gap-1.5 cursor-pointer transition ${
                                btn.part === 'listening' || btn.part === 'listening_script_explain' || btn.part === 'full_exam'
                                    ? 'bg-amber-50 dark:bg-amber-950/50 hover:bg-amber-100 border-amber-300 dark:border-amber-800 text-amber-800 dark:text-amber-200'
                                    : 'bg-white dark:bg-slate-900 hover:bg-sky-100/70 dark:hover:bg-slate-800 border-sky-300 dark:border-sky-800 text-sky-800 dark:text-sky-300'
                            }`}
                        >
                            {copiedPromptType === btn.part ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                            <span>{copiedPromptType === btn.part ? 'Đã copy Prompt!' : btn.label}</span>
                        </button>
                    ))}
                </div>

                {showGeminiImportBox && (
                    <div className="pt-2 border-t border-sky-200 dark:border-sky-800/70 space-y-2.5">
                        <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-bold">
                            <div className="flex items-center gap-4 text-slate-700 dark:text-slate-200">
                                <label className="flex items-center gap-1.5 cursor-pointer">
                                    <input
                                        type="radio"
                                        name="geminiMergeMode"
                                        checked={importMergeMode === 'append'}
                                        onChange={() => setImportMergeMode('append')}
                                        className="accent-emerald-500"
                                    />
                                    <span>Ghép thêm (dán lần lượt P1 → P2 → P3)</span>
                                </label>
                                <label className="flex items-center gap-1.5 cursor-pointer">
                                    <input
                                        type="radio"
                                        name="geminiMergeMode"
                                        checked={importMergeMode === 'replace'}
                                        onChange={() => setImportMergeMode('replace')}
                                        className="accent-amber-500"
                                    />
                                    <span>Thay thế phần tương ứng</span>
                                </label>
                            </div>
                            <button
                                type="button"
                                onClick={handleImportGeminiJson}
                                className="px-4 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 border-b-2 border-emerald-700 text-white text-xs font-black cursor-pointer"
                            >
                                Nhập JSON vào đề
                            </button>
                        </div>
                        <textarea
                            rows={6}
                            value={geminiJsonDraft}
                            onChange={(e) => setGeminiJsonDraft(e.target.value)}
                            placeholder='Dán nguyên khối JSON (kể cả bọc ```json ... ```) mà Gemini Web vừa tạo (Từ vựng / Đọc hiểu / Nghe hiểu / Nguyên đề) vào đây...'
                            className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs font-mono text-slate-800 dark:text-slate-100"
                        />
                    </div>
                )}
            </div>

            {editorSubTab === 'listening' && (
                <div className="space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-1.5">
                            <span className="text-xs font-bold text-slate-500 mr-1">
                                Phân bổ Mondai:
                            </span>
                            {mondaiSummaryCounts.length === 0 ? (
                                <span className="text-xs font-medium text-slate-400">Chưa có câu nghe</span>
                            ) : (
                                mondaiSummaryCounts.map(([mNum, count]) => (
                                    <span key={mNum} className="px-2 py-0.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-[11px] font-black">
                                        M{mNum}: {count} câu {mondaiAudioUrls?.[mNum] ? '🔊' : ''}
                                    </span>
                                ))
                            )}
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            <button
                                type="button"
                                onClick={onOpenMondaiSlicer}
                                className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 border-b-2 border-amber-700 text-white text-xs font-black flex items-center gap-1.5 cursor-pointer"
                            >
                                <Scissors className="w-3.5 h-3.5" />
                                <span>
                                    Cắt &amp; gắn Audio theo Mondai
                                    {Object.keys(mondaiAudioUrls || {}).length > 0 ? ` (${Object.keys(mondaiAudioUrls).length})` : ''}
                                </span>
                            </button>
                            <button
                                type="button"
                                onClick={addBlankListeningQuestion}
                                className="px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs font-black flex items-center gap-1 cursor-pointer"
                            >
                                <Plus className="w-3.5 h-3.5" /> Thêm câu nghe
                            </button>
                        </div>
                    </div>

                    {listeningQuestions.length === 0 ? (
                        <div className="text-center py-8 text-xs text-slate-400 font-bold">
                            Chưa có câu nghe nào. Copy Prompt P3 phía trên gửi Gemini 4 Neon để tạo toàn bộ câu hỏi Nghe, rồi bấm &quot;Cắt &amp; gắn Audio theo Mondai&quot;!
                        </div>
                    ) : (
                        listeningQuestions.map((q, qi) => (
                            <ListeningQuestionEditorCard
                                key={qi}
                                index={qi}
                                question={q}
                                level={level}
                                hasPdfVisuals={Boolean(firstListenPdf || listenImageFiles.length > 0)}
                                storagePrefix={`jlpt_images/${level.toLowerCase()}_${examYear}_${examSession}`}
                                onChange={(nextQ) => setListeningQuestions((prev) => prev.map((it, idx) => (idx === qi ? nextQ : it)))}
                                onDelete={() => setListeningQuestions((prev) => prev.filter((_, idx) => idx !== qi))}
                                onOpenPdfCropper={() => setCropTargetIdx(qi)}
                            />
                        ))
                    )}
                </div>
            )}

            {editorSubTab === 'reading' && (
                <div className="space-y-3">
                    {studioPassageStats.total > 0 && (
                        <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50">
                            <div className="text-xs font-bold text-emerald-800 dark:text-emerald-200">
                                {readingAnalyzeState
                                    ? readingAnalyzeState.detail
                                    : studioPassageStats.missing > 0
                                        ? `Có ${studioPassageStats.missing}/${studioPassageStats.total} bài đọc chưa có phân tích từng câu cho chế độ luyện tập.`
                                        : `✅ Đủ phân tích chi tiết cho cả ${studioPassageStats.total} bài đọc.`}
                            </div>
                            <button
                                type="button"
                                disabled={Boolean(readingAnalyzeState)}
                                onClick={handleStudioBatchAnalyzeReading}
                                className="px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 border-b-2 border-emerald-700 disabled:opacity-60 text-white text-xs font-black flex items-center gap-1.5 cursor-pointer"
                            >
                                {readingAnalyzeState ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wand2 className="w-3.5 h-3.5" />}
                                <span>
                                    {readingAnalyzeState
                                        ? `Đang tạo ${readingAnalyzeState.percent}%`
                                        : studioPassageStats.missing > 0
                                            ? `AI Tạo phân tích (${studioPassageStats.missing} bài)`
                                            : 'AI Phân tích lại tất cả bài đọc'}
                                </span>
                            </button>
                        </div>
                    )}

                    {nonListeningSections.length === 0 ? (
                        <div className="text-center py-6 text-xs text-slate-400 font-bold">
                            Chưa có phần Từ vựng / Ngữ pháp / Đọc hiểu. Copy Prompt P1/P2 hoặc Nguyên đề phía trên gửi Gemini Pro (Neon), rồi dán JSON vào ô nhập!
                        </div>
                    ) : (
                        nonListeningSections.map((sec, si) => (
                            <div key={si} className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-black text-emerald-600 uppercase">{sec.title} ({sec.questions?.length || 0} câu)</span>
                                    <button
                                        type="button"
                                        onClick={() => setNonListeningSections((prev) => prev.filter((_, idx) => idx !== si))}
                                        className="text-xs font-bold text-rose-500 cursor-pointer flex items-center gap-1"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" /> Xóa phần này
                                    </button>
                                </div>
                                <div className="space-y-1.5 max-h-72 overflow-y-auto">
                                    {(sec.questions || []).map((q, qi) => (
                                        <div key={qi} className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 text-xs flex items-start justify-between gap-3">
                                            <div className="min-w-0 flex-1">
                                                <span className="font-black text-slate-400 mr-1.5">#{q.questionNumber || qi + 1}{q.mondai ? ` (M${q.mondai})` : ''}</span>
                                                <span className="font-japanese text-slate-800 dark:text-slate-100" dangerouslySetInnerHTML={{ __html: q.question }} />
                                                <p className="text-[11px] text-emerald-600 font-bold mt-0.5">
                                                    Đáp án {(q.correctAnswer || 0) + 1}: {q.options?.[q.correctAnswer || 0]}
                                                </p>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => setNonListeningSections((prev) => prev.map((s, idx) => (idx === si ? { ...s, questions: s.questions.filter((_, qIdx) => qIdx !== qi) } : s)))}
                                                className="text-slate-400 hover:text-rose-500 cursor-pointer shrink-0"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}

            {editorSubTab === 'json' && (
                <pre className="bg-slate-950 text-sky-300 font-mono text-[11px] p-4 rounded-2xl max-h-96 overflow-auto">
                    {JSON.stringify(currentTestPreview, null, 2)}
                </pre>
            )}
        </div>
    );
};

export default JlptStudioEditorPanel;
