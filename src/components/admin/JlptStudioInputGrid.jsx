import React from 'react';
import { Upload, Music, Image as ImageIcon, Scissors } from 'lucide-react';
import { formatTimeShort } from '../../utils/jlptAudioProcessor';

/**
 * Streamlined audio slicing & optional illustration PDF/image input bar for JLPT Studio.
 */
const JlptStudioInputGrid = ({
    audioFile,
    audioBuffer,
    audioUploadPct,
    uploadingAudio = false,
    audioUrl,
    handleSelectAudio,
    handleUploadAudioNow,
    applyAudioUrlToAllListening,
    listenFiles = [],
    setListenFiles = () => {},
    onOpenMondaiSlicer = () => {},
    mondaiAudioUrls = {}
}) => {
    const slicedCount = Object.keys(mondaiAudioUrls || {}).length;

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* 1. Listening Audio & Manual Mondai Slicer */}
            <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-3xl border-2 border-amber-200 dark:border-amber-900/60 p-5 space-y-3">
                <div className="flex items-center justify-between gap-2">
                    <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                        <Music className="w-4 h-4 text-amber-500" />
                        1. Audio Nghe Hiểu &amp; Cắt theo Mondai (.mp3 / .wav / .m4a)
                    </h3>
                    {audioBuffer && (
                        <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-black font-mono">
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

                    <button
                        type="button"
                        disabled={uploadingAudio}
                        onClick={onOpenMondaiSlicer}
                        className="px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 border-b-2 border-emerald-700 text-white text-xs font-black cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                        title="Cắt file audio dài thành từng file riêng cho từng Mondai (M1..M5)"
                    >
                        <Scissors className="w-3.5 h-3.5" />
                        <span>
                            Cắt Audio theo Mondai
                            {slicedCount > 0 ? ` (${slicedCount} M)` : ''}
                        </span>
                    </button>

                    {audioFile && (
                        <button
                            type="button"
                            disabled={uploadingAudio}
                            onClick={handleUploadAudioNow}
                            className="px-3 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 border-b-2 border-sky-700 text-white text-xs font-black cursor-pointer disabled:opacity-50"
                        >
                            {uploadingAudio && audioUploadPct > 0 && audioUploadPct < 100
                                ? `Đang upload (${audioUploadPct}%)...`
                                : 'Upload file MP3 gốc'}
                        </button>
                    )}
                </div>

                <div>
                    <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">
                        Hoặc nhập URL MP3 chung sẵn có (CDN / Storage / /audio/jlpt/...)
                    </label>
                    <input
                        type="text"
                        value={audioUrl}
                        onChange={(e) => applyAudioUrlToAllListening(e.target.value)}
                        placeholder="https://firebasestorage... hoặc /audio/jlpt/n3/2023-12.mp3"
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs font-mono text-slate-800 dark:text-white"
                    />
                </div>
            </div>

            {/* 2. Optional PDF/Image File Only for Cropping Figures */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl border-2 border-sky-200 dark:border-sky-900/60 p-5 flex flex-col justify-between gap-3">
                <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                        <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                            <ImageIcon className="w-4 h-4 text-sky-500" />
                            2. Cắt hình minh họa (tùy chọn)
                        </h3>
                        {listenFiles.length > 0 && (
                            <span className="text-[11px] font-black text-sky-600">{listenFiles.length} file</span>
                        )}
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                        Nạp PDF/Ảnh đề Nghe nếu muốn cắt hình câu 2番 trực tiếp từ đề (hoặc dán <kbd className="px-1 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-[10px] font-mono">Ctrl+V</kbd> ảnh ngay trên từng thẻ câu nghe).
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <label className="px-3.5 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 border-b-2 border-sky-700 text-white text-xs font-black cursor-pointer flex items-center gap-1.5">
                        <Upload className="w-3.5 h-3.5" />
                        <span>Chọn PDF / Ảnh đề nghe</span>
                        <input
                            type="file"
                            multiple
                            accept=".pdf,image/*"
                            className="hidden"
                            onChange={(e) => setListenFiles(Array.from(e.target.files || []))}
                        />
                    </label>
                    {listenFiles.length > 0 && (
                        <button
                            type="button"
                            onClick={() => setListenFiles([])}
                            className="text-[11px] font-bold text-rose-500 hover:underline cursor-pointer"
                        >
                            Xóa file
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default JlptStudioInputGrid;
