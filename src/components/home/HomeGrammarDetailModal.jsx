import React, { useState } from 'react';
import { X, Heart, BookOpen, Volume2, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { speakExampleSentence } from '../../utils/audio';

export default function HomeGrammarDetailModal({
    isOpen,
    onClose,
    point,
    isBookmarked = false,
    onToggleBookmark
}) {
    const navigate = useNavigate();
    const [playingIndex, setPlayingIndex] = useState(null);

    if (!isOpen || !point) return null;

    const pattern = point.pattern || point.title || '';
    const meaning = point.meaningShort || point.meaning || point.meaningVi || '';
    const structure = point.structureRaw || point.structure || point.connection || '';
    const level = point.level || 'Custom';
    const notes = point.notes || point.usageScope || point.explanation || '';
    const examples = Array.isArray(point.examples) ? point.examples : [];

    const handlePlayAudio = (text, idx) => {
        if (!text) return;
        setPlayingIndex(idx);
        speakExampleSentence(text, 'ja');
        setTimeout(() => setPlayingIndex(null), 1200);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
            <div className="bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden w-full max-w-lg max-h-[85vh] flex flex-col">
                {/* Header */}
                <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-850">
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 px-2.5 py-1 rounded-xl flex items-center gap-1.5">
                            <BookOpen className="w-3.5 h-3.5" />
                            Chi tiết Ngữ pháp
                        </span>
                        {level && (
                            <span className="text-xs font-black uppercase px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                                {level}
                            </span>
                        )}
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-750 rounded-xl text-slate-500 dark:text-slate-400 transition cursor-pointer"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body Content */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
                    {/* Pattern Banner */}
                    <div className="p-5 rounded-3xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 space-y-2">
                        <h2 className="font-japanese font-black text-2xl sm:text-3xl text-emerald-700 dark:text-emerald-300 tracking-tight">
                            {pattern}
                        </h2>
                        <p className="text-sm sm:text-base font-semibold text-slate-800 dark:text-slate-200 leading-relaxed">
                            {meaning || 'Ý nghĩa đang cập nhật'}
                        </p>
                    </div>

                    {/* Structure Formula */}
                    {structure && (
                        <div className="space-y-2">
                            <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
                                Cấu trúc kết hợp:
                            </h4>
                            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-750 font-mono text-xs sm:text-sm text-emerald-700 dark:text-emerald-300 font-bold leading-relaxed break-words">
                                {structure}
                            </div>
                        </div>
                    )}

                    {/* Usage Note */}
                    {notes && (
                        <div className="space-y-2">
                            <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
                                Giải thích & Sắc thái:
                            </h4>
                            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-850 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800">
                                {notes}
                            </p>
                        </div>
                    )}

                    {/* Examples List */}
                    {examples.length > 0 && (
                        <div className="space-y-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                            <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
                                Câu ví dụ ({examples.length}):
                            </h4>
                            <div className="space-y-2">
                                {examples.map((ex, idx) => {
                                    const ja = typeof ex === 'string' ? ex : (ex.japanese || ex.ja || ex.sentence || '');
                                    const vi = typeof ex === 'object' ? (ex.meaning || ex.vietnamese || ex.vi || '') : '';
                                    return (
                                        <div
                                            key={idx}
                                            className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-750 space-y-1.5"
                                        >
                                            <div className="flex items-start justify-between gap-3">
                                                <p className="font-japanese font-bold text-sm sm:text-base text-slate-900 dark:text-white leading-relaxed">
                                                    {ja}
                                                </p>
                                                <button
                                                    type="button"
                                                    onClick={() => handlePlayAudio(ja, idx)}
                                                    className="p-1.5 rounded-xl text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-slate-700 transition cursor-pointer shrink-0"
                                                    title="Nghe câu ví dụ"
                                                >
                                                    <Volume2 className={`w-4 h-4 ${playingIndex === idx ? 'animate-bounce text-emerald-600' : ''}`} />
                                                </button>
                                            </div>
                                            {vi && (
                                                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 font-medium">
                                                    {vi}
                                                </p>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Actions */}
                <div className="p-3.5 sm:p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 flex items-center justify-between gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                    >
                        Quay lại
                    </button>

                    <div className="flex items-center gap-2">
                        {/* Bookmark to SRS Button */}
                        <button
                            type="button"
                            onClick={() => onToggleBookmark(point)}
                            className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition cursor-pointer active:scale-95 ${
                                isBookmarked
                                    ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-500 border border-rose-200 dark:border-rose-800'
                                    : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs'
                            }`}
                        >
                            <Heart className={`w-4 h-4 ${isBookmarked ? 'fill-rose-500 text-rose-500' : ''}`} />
                            <span>{isBookmarked ? 'Đã lưu SRS' : 'Lưu vào SRS'}</span>
                        </button>

                        {/* Full Screen View Button */}
                        <button
                            type="button"
                            onClick={() => {
                                onClose();
                                navigate(`/grammar/detail/${point.id}`);
                            }}
                            className="px-3.5 py-2.5 rounded-xl bg-slate-200 dark:bg-slate-750 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer active:scale-95"
                            title="Mở toàn màn hình"
                        >
                            <span className="hidden sm:inline">Trang đầy đủ</span>
                            <ExternalLink className="w-3.5 h-3.5" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
