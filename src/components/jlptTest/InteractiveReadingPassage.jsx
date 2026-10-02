import React, { useState } from 'react';
import { Volume2, BookOpen, Languages, Sparkles, ChevronDown, ChevronUp, Eye, EyeOff } from 'lucide-react';
import SentenceBreakdownModal from './SentenceBreakdownModal';

const InteractiveReadingPassage = ({
    passageHtml,
    passageData,
    onAddFlashcard
}) => {
    const [selectedSentenceIdx, setSelectedSentenceIdx] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [showVietnamese, setShowVietnamese] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);

    const sentences = passageData?.sentences || [];
    const hasInteractiveSentences = sentences.length > 0;

    const speakPassage = (rate = 0.9) => {
        if (!('speechSynthesis' in window)) return;
        window.speechSynthesis.cancel();
        const text = passageData?.rawJapanese || passageData?.japanese?.replace(/<[^>]*>/g, '') || '';
        if (!text) return;
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'ja-JP';
        utterance.rate = rate;
        utterance.onstart = () => setIsPlaying(true);
        utterance.onend = () => setIsPlaying(false);
        utterance.onerror = () => setIsPlaying(false);
        window.speechSynthesis.speak(utterance);
    };

    const handleSentenceClick = (idx) => {
        setSelectedSentenceIdx(idx);
        setIsModalOpen(true);
    };

    // Extract all grammar points used in sentences
    const passageGrammarPoints = [];
    sentences.forEach((s, sIdx) => {
        (s.grammar || []).forEach(g => {
            passageGrammarPoints.push({
                ...g,
                sentenceIdx: sIdx
            });
        });
    });

    return (
        <div className="space-y-3">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
                
                {/* Header with Title & Action Controls */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200/50">
                            Đọc hiểu
                        </span>
                        {(passageData?.title || passageData?.titleVi) && (
                            <h4 className="text-xs sm:text-sm font-black text-slate-800 dark:text-white">
                                {passageData.title} {passageData.titleVi && <span className="text-slate-400 font-normal">· {passageData.titleVi}</span>}
                            </h4>
                        )}
                    </div>

                    {/* Audio & Translation Buttons */}
                    <div className="flex items-center gap-2 shrink-0 flex-wrap">
                        <button
                            type="button"
                            onClick={() => speakPassage(0.95)}
                            className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer active:scale-95 ${
                                isPlaying 
                                    ? 'bg-emerald-500 text-white animate-pulse' 
                                    : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
                            }`}
                            title="Nghe đọc toàn bộ đoạn văn"
                        >
                            <Volume2 className="w-3.5 h-3.5" />
                            <span>Nghe</span>
                        </button>

                        <button
                            type="button"
                            onClick={() => speakPassage(0.75)}
                            className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition flex items-center gap-1.5 cursor-pointer active:scale-95"
                            title="Nghe đọc tốc độ chậm"
                        >
                            <Volume2 className="w-3.5 h-3.5" />
                            <span>Nghe chậm</span>
                        </button>

                        {passageData?.vietnamese && (
                            <button
                                type="button"
                                onClick={() => setShowVietnamese(!showVietnamese)}
                                className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer active:scale-95 ${
                                    showVietnamese
                                        ? 'bg-indigo-600 text-white shadow-xs'
                                        : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
                                }`}
                                title="Bật/tắt bản dịch tiếng Việt"
                            >
                                {showVietnamese ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                <span>{showVietnamese ? 'Ẩn bản dịch' : 'Hiện bản dịch'}</span>
                            </button>
                        )}
                    </div>
                </div>

                {/* Interactive Paragraph Text */}
                <div className="leading-loose font-japanese text-[16px] sm:text-[18px] text-slate-900 dark:text-slate-100 select-text">
                    {hasInteractiveSentences ? (
                        sentences.map((s, idx) => (
                            <span
                                key={idx}
                                onClick={() => handleSentenceClick(idx)}
                                className={`inline transition-all duration-150 rounded px-1 py-0.5 cursor-pointer ${
                                    selectedSentenceIdx === idx && isModalOpen
                                        ? 'bg-amber-100 dark:bg-amber-950/60 ring-2 ring-amber-400 dark:ring-amber-500 font-medium'
                                        : 'hover:bg-emerald-50 dark:hover:bg-emerald-950/40 hover:ring-1 hover:ring-emerald-300 dark:hover:ring-emerald-700'
                                }`}
                                title="Bấm vào để mở bảng phân tích câu (từ vựng, ngữ pháp, dịch)"
                                dangerouslySetInnerHTML={{ __html: s.jp }}
                            />
                        ))
                    ) : (
                        <div dangerouslySetInnerHTML={{ __html: passageHtml || passageData?.japanese || '' }} />
                    )}
                </div>

                {/* Helpful Instruction Banner */}
                {hasInteractiveSentences && (
                    <div className="p-2.5 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40 flex items-center gap-2 text-xs text-emerald-800 dark:text-emerald-300 font-medium">
                        <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        <span>
                            💡 <strong>Mẹo:</strong> Bấm vào từng câu trên bài đọc để xem phân tích chi tiết (nghĩa câu · từ vựng · ngữ pháp).
                        </span>
                    </div>
                )}

                {/* Vietnamese Full Translation (Collapsible) */}
                {showVietnamese && passageData?.vietnamese && (
                    <div className="p-4 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40 space-y-2 animate-fade-in">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-700 dark:text-indigo-300 uppercase tracking-wider">
                            <Languages className="w-3.5 h-3.5" />
                            <span>Bản dịch tiếng Việt</span>
                        </div>
                        <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-200 leading-relaxed font-sans font-medium whitespace-pre-line">
                            {passageData.vietnamese.toString().normalize('NFC')}
                        </p>
                    </div>
                )}

                {/* Bottom Grammar Chips */}
                {passageGrammarPoints.length > 0 && (
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
                        <div className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                            Ngữ pháp xuất hiện trong bài
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                            {passageGrammarPoints.map((g, gIdx) => (
                                <button
                                    key={gIdx}
                                    type="button"
                                    onClick={() => handleSentenceClick(g.sentenceIdx)}
                                    className="px-2.5 py-1 rounded-lg text-xs font-bold bg-sky-50 dark:bg-sky-950/40 hover:bg-sky-100 text-sky-700 dark:text-sky-300 border border-sky-200/60 dark:border-sky-800/60 transition flex items-center gap-1 cursor-pointer"
                                >
                                    <BookOpen className="w-3 h-3" />
                                    <span>{g.point}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Sentence Breakdown Modal */}
            <SentenceBreakdownModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                sentences={sentences}
                currentSentenceIdx={selectedSentenceIdx || 0}
                onSentenceChange={(newIdx) => setSelectedSentenceIdx(newIdx)}
                onAddFlashcard={onAddFlashcard}
            />
        </div>
    );
};

export default InteractiveReadingPassage;
