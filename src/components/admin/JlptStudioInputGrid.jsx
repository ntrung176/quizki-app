import React from 'react';
import { Upload, Music, FileText, CheckCircle2 } from 'lucide-react';
import { formatTimeShort } from '../../utils/jlptAudioProcessor';

/**
 * Input sources panel for JLPT Studio (MP3 audio, listening paper, lang/reading paper, answer key).
 */
const JlptStudioInputGrid = ({
    authorMode,
    audioFile,
    audioBuffer,
    audioUploadPct,
    isProcessing,
    audioUrl,
    autoUploadAudio,
    handleSelectAudio,
    handleUploadAudioNow,
    applyAudioUrlToAllListening,
    setAutoUploadAudio,
    listenFiles,
    setListenFiles,
    listenPasteText,
    setListenPasteText,
    langFiles,
    setLangFiles,
    langPasteText,
    setLangPasteText,
    answerFiles,
    setAnswerFiles,
    answerPasteText,
    setAnswerPasteText
}) => {
    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Audio MP3 Box */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl border-2 border-amber-200 dark:border-amber-900/60 p-5 space-y-3">
                <div className="flex items-center justify-between gap-2">
                    <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                        <Music className="w-4 h-4 text-amber-500" />
                        1. File Audio Nghe Hiểu (.mp3 / .wav / .m4a)
                    </h3>
                    {audioBuffer && (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-black font-mono">
                            {formatTimeShort(audioBuffer.duration)}
                        </span>
                    )}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <label className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 border-b-2 border-amber-700 text-white text-xs font-black cursor-pointer flex items-center gap-1.5">
                        <Upload className="w-3.5 h-3.5" />
                        <span>{audioFile ? audioFile.name : 'Chọn file MP3 từ máy'}</span>
                        <input type="file" accept="audio/*" className="hidden" onChange={(e) => handleSelectAudio(e.target.files?.[0])} />
                    </label>

                    {audioFile && (
                        <button
                            type="button"
                            disabled={isProcessing}
                            onClick={handleUploadAudioNow}
                            className="px-3 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 border-b-2 border-sky-700 text-white text-xs font-black cursor-pointer disabled:opacity-50"
                        >
                            Upload lên Storage {audioUploadPct > 0 && audioUploadPct < 100 ? `(${audioUploadPct}%)` : ''}
                        </button>
                    )}
                </div>

                <div>
                    <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">
                        Hoặc nhập URL MP3 sẵn (CDN / Storage / /audio/jlpt/...)
                    </label>
                    <input
                        type="text"
                        value={audioUrl}
                        onChange={(e) => applyAudioUrlToAllListening(e.target.value)}
                        placeholder="https://firebasestorage... hoặc /audio/jlpt/n3/2023-12.mp3"
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs font-mono text-slate-800 dark:text-white"
                    />
                </div>

                <label className="flex items-center gap-2 text-[11px] font-bold text-slate-600 dark:text-slate-300 cursor-pointer">
                    <input type="checkbox" checked={autoUploadAudio} onChange={(e) => setAutoUploadAudio(e.target.checked)} className="accent-emerald-500" />
                    <span>Tự động upload MP3 lên Firebase Storage khi chạy AI (nếu là file local)</span>
                </label>
            </div>

            {/* Listening Exam Paper Box */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl border-2 border-sky-200 dark:border-sky-900/60 p-5 space-y-3">
                <div className="flex items-center justify-between gap-2">
                    <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                        <FileText className="w-4 h-4 text-sky-500" />
                        2. Đề Nghe Hiểu &amp; Hình Vẽ (PDF / Ảnh / Text)
                    </h3>
                    {listenFiles.length > 0 && (
                        <span className="text-[11px] font-black text-sky-600">{listenFiles.length} file</span>
                    )}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <label className="px-3.5 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 border-b-2 border-sky-700 text-white text-xs font-black cursor-pointer flex items-center gap-1.5">
                        <Upload className="w-3.5 h-3.5" />
                        <span>Chọn PDF / Ảnh đề nghe</span>
                        <input type="file" multiple accept=".pdf,image/*,.txt" className="hidden" onChange={(e) => setListenFiles(Array.from(e.target.files || []))} />
                    </label>
                    {listenFiles.length > 0 && (
                        <button type="button" onClick={() => setListenFiles([])} className="text-[11px] font-bold text-rose-500 cursor-pointer">Xóa file</button>
                    )}
                </div>

                <textarea
                    rows={2}
                    value={listenPasteText}
                    onChange={(e) => setListenPasteText(e.target.value)}
                    placeholder="Hoặc dán text câu hỏi/lựa chọn phần Nghe vào đây (tùy chọn)..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs text-slate-800 dark:text-white"
                />
            </div>

            {/* Language Knowledge + Reading Box */}
            {authorMode === 'yearly' && (
                <div className="bg-white dark:bg-slate-900 rounded-3xl border-2 border-emerald-200 dark:border-emerald-900/60 p-5 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                        <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                            <FileText className="w-4 h-4 text-emerald-500" />
                            3. Đề Từ vựng · Ngữ pháp · Đọc hiểu (Tùy chọn)
                        </h3>
                        {langFiles.length > 0 && (
                            <span className="text-[11px] font-black text-emerald-600">{langFiles.length} file</span>
                        )}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <label className="px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 border-b-2 border-emerald-700 text-white text-xs font-black cursor-pointer flex items-center gap-1.5">
                            <Upload className="w-3.5 h-3.5" />
                            <span>Chọn PDF / Ảnh đề Ngôn ngữ &amp; Đọc</span>
                            <input type="file" multiple accept=".pdf,image/*,.txt" className="hidden" onChange={(e) => setLangFiles(Array.from(e.target.files || []))} />
                        </label>
                        {langFiles.length > 0 && (
                            <button type="button" onClick={() => setLangFiles([])} className="text-[11px] font-bold text-rose-500 cursor-pointer">Xóa file</button>
                        )}
                    </div>
                    <textarea
                        rows={2}
                        value={langPasteText}
                        onChange={(e) => setLangPasteText(e.target.value)}
                        placeholder="Hoặc dán text đề Từ vựng · Ngữ pháp · Đọc hiểu..."
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs text-slate-800 dark:text-white"
                    />
                </div>
            )}

            {/* Answer Key / Script Box */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl border-2 border-slate-200 dark:border-slate-800 p-5 space-y-3">
                <div className="flex items-center justify-between gap-2">
                    <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        {authorMode === 'yearly' ? '4.' : '3.'} File Đáp án / Script gốc (nếu có)
                    </h3>
                    {answerFiles.length > 0 && (
                        <span className="text-[11px] font-black text-emerald-600">{answerFiles.length} file</span>
                    )}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <label className="px-3.5 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 border-b-2 border-slate-900 text-white text-xs font-black cursor-pointer flex items-center gap-1.5">
                        <Upload className="w-3.5 h-3.5" />
                        <span>Chọn PDF / Text Đáp án - Script</span>
                        <input type="file" multiple accept=".pdf,image/*,.txt" className="hidden" onChange={(e) => setAnswerFiles(Array.from(e.target.files || []))} />
                    </label>
                    {answerFiles.length > 0 && (
                        <button type="button" onClick={() => setAnswerFiles([])} className="text-[11px] font-bold text-rose-500 cursor-pointer">Xóa file</button>
                    )}
                </div>
                <textarea
                    rows={2}
                    value={answerPasteText}
                    onChange={(e) => setAnswerPasteText(e.target.value)}
                    placeholder="Dán bảng đáp án hoặc script có sẵn (nếu bỏ trống AI & Whisper tự xử lý toàn bộ)..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs text-slate-800 dark:text-white"
                />
            </div>
        </div>
    );
};

export default JlptStudioInputGrid;
