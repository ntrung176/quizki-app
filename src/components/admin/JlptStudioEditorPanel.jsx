import React from 'react';
import { Save, Download, Layers, Loader2, Plus, Trash2, Code } from 'lucide-react';
import ListeningQuestionEditorCard from './ListeningQuestionEditorCard';
import { splitListeningIntoMondaiTests, downloadJsonFile } from '../../services/ai/jlptAuthoringService';

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
    setNonListeningSections
}) => {
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

                    {authorMode === 'yearly' && listeningQuestions.length > 0 && (
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

            {editorSubTab === 'listening' && (
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-500">
                            Chỉnh sửa trực tiếp câu hỏi, ảnh cắt từ PDF, mốc giây và script song ngữ trước khi xuất bản.
                        </span>
                        <button
                            type="button"
                            onClick={addBlankListeningQuestion}
                            className="px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs font-black flex items-center gap-1 cursor-pointer"
                        >
                            <Plus className="w-3.5 h-3.5" /> Thêm câu nghe
                        </button>
                    </div>

                    {listeningQuestions.length === 0 ? (
                        <div className="text-center py-8 text-xs text-slate-400 font-bold">
                            Chưa có câu nghe nào. Chọn Audio/PDF phía trên rồi bấm &quot;Tự động soạn toàn bộ data&quot; hoặc bấm &quot;Thêm câu nghe&quot;.
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
                    {nonListeningSections.length === 0 ? (
                        <div className="text-center py-8 text-xs text-slate-400 font-bold">
                            Chưa có phần Từ vựng / Ngữ pháp / Đọc hiểu (nạp PDF mục 3 phía trên rồi chạy AI).
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
                                                <span className="font-black text-slate-400 mr-1.5">#{qi + 1}</span>
                                                <span className="font-japanese text-slate-800 dark:text-slate-100" dangerouslySetInnerHTML={{ __html: q.question }} />
                                                <p className="text-[11px] text-emerald-600 font-bold mt-0.5">
                                                    Đáp án {String.fromCharCode(65 + (q.correctAnswer || 0))}: {q.options?.[q.correctAnswer || 0]}
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
