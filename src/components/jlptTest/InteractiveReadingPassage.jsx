import React, { useState, useMemo } from 'react';
import { Volume2, BookOpen, Languages, Eye, EyeOff, Wand2, Loader2 } from 'lucide-react';
import SentenceBreakdownModal from './SentenceBreakdownModal';
import { buildInteractivePassageData } from '../../utils/jlptExplanationParser';

const InteractiveReadingPassage = ({
    passageHtml,
    passageData,
    explanationText,
    question,
    onAddFlashcard,
    isRealExam = false,
    onAnalyzePassage = null,
    isAnalyzing = false
}) => {
    const [selectedSentenceIdx, setSelectedSentenceIdx] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [showVietnamese, setShowVietnamese] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);

    // Build rich interactive passage data (only used outside real exam mode)
    const activePassageData = useMemo(() => {
        if (isRealExam) return null;
        return buildInteractivePassageData(passageHtml, explanationText || question?.explanation || question?.detail, passageData);
    }, [isRealExam, passageHtml, explanationText, question, passageData]);

    const sentences = useMemo(() => activePassageData?.sentences || [], [activePassageData]);
    const hasInteractiveSentences = !isRealExam && sentences.length > 0;
    const hasRichBreakdown = Boolean(activePassageData?.vietnamese) && sentences.some((s) => Boolean(s?.vi));

    // Structured layout markup (e.g. Mondai 14 情報検索 schedules, flyers, tables) should preserve authentic HTML table formatting
    const rawHtmlStr = String(passageHtml || '');
    const hasStructuredHtml = /<(table|thead|tbody|tr|th|td|ul|ol|figure|img)\b/i.test(rawHtmlStr);

    const speakPassage = (rate = 0.9) => {
        if (isRealExam || !('speechSynthesis' in window)) return;
        window.speechSynthesis.cancel();
        const text = activePassageData?.rawJapanese || activePassageData?.japanese?.replace(/<[^>]*>/g, '') || rawHtmlStr.replace(/<[^>]*>/g, '') || '';
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
        if (isRealExam) return;
        setSelectedSentenceIdx(idx);
        setIsModalOpen(true);
    };

    const passageGrammarPoints = useMemo(() => {
        if (isRealExam) return [];
        const list = [];
        sentences.forEach((s, sIdx) => {
            (s.grammar || []).forEach((g) => {
                if (!list.some((item) => item.point === g.point)) {
                    list.push({ ...g, sentenceIdx: sIdx });
                }
            });
        });
        if (list.length === 0 && activePassageData?.grammarPoints) {
            return activePassageData.grammarPoints.map((g) => ({ ...g, sentenceIdx: 0 }));
        }
        return list;
    }, [isRealExam, sentences, activePassageData]);

    const passageVocabPoints = useMemo(() => {
        if (isRealExam) return [];
        return activePassageData?.vocabList || [];
    }, [isRealExam, activePassageData]);

    const authenticPassageBody = (
        <div
            className="overflow-x-auto whitespace-pre-line leading-loose tracking-wide font-japanese text-[15px] sm:text-[17px] text-slate-900 dark:text-slate-100 select-text [&_table]:w-full [&_table]:my-2 [&_table]:border-collapse [&_th]:border [&_th]:border-slate-300 dark:[&_th]:border-slate-700 [&_th]:bg-slate-100 dark:[&_th]:bg-slate-800 [&_th]:px-2.5 [&_th]:py-1.5 [&_th]:text-left [&_td]:border [&_td]:border-slate-300 dark:[&_td]:border-slate-700 [&_td]:px-2.5 [&_td]:py-1.5"
            dangerouslySetInnerHTML={{ __html: rawHtmlStr || activePassageData?.japanese || '' }}
        />
    );

    // Authentic Real-Exam Mode: strictly show the original reading passage without translations, audio, or AI breakdown
    if (isRealExam) {
        return (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
                    <span className="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                        Đọc hiểu
                    </span>
                </div>
                {authenticPassageBody}
            </div>
        );
    }

    return (
        <div className="space-y-3">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
                {/* Header with Title & Practice Controls */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200/50">
                            Đọc hiểu
                        </span>
                        {(activePassageData?.title || activePassageData?.titleVi) && (
                            <h4 className="text-xs sm:text-sm font-black text-slate-800 dark:text-white">
                                {activePassageData.title} {activePassageData.titleVi && <span className="text-slate-400 font-normal">· {activePassageData.titleVi}</span>}
                            </h4>
                        )}
                    </div>

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

                        {activePassageData?.vietnamese && (
                            <button
                                type="button"
                                onClick={() => setShowVietnamese(!showVietnamese)}
                                className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer active:scale-95 ${
                                    showVietnamese
                                        ? 'bg-emerald-600 text-white shadow-xs'
                                        : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
                                }`}
                                title="Bật/tắt bản dịch tiếng Việt"
                            >
                                {showVietnamese ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                <span>{showVietnamese ? 'Ẩn bản dịch' : 'Hiện bản dịch'}</span>
                            </button>
                        )}

                        {onAnalyzePassage && (
                            <button
                                type="button"
                                disabled={isAnalyzing}
                                onClick={onAnalyzePassage}
                                className={`px-2.5 py-1.5 rounded-xl text-xs font-black transition flex items-center gap-1.5 cursor-pointer active:scale-95 disabled:opacity-60 ${
                                    hasRichBreakdown
                                        ? 'bg-sky-50 hover:bg-sky-100 dark:bg-sky-950/50 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800'
                                        : 'bg-emerald-500 hover:bg-emerald-400 border-b-2 border-emerald-700 text-white shadow-2xs'
                                }`}
                                title="Dùng AI dịch và phân tích từng câu, từ vựng & ngữ pháp cho bài đọc này"
                            >
                                {isAnalyzing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wand2 className="w-3.5 h-3.5" />}
                                <span>{isAnalyzing ? 'Đang phân tích...' : (hasRichBreakdown ? 'AI Phân tích lại' : 'AI Phân tích bài đọc')}</span>
                            </button>
                        )}
                    </div>
                </div>

                {/* Reading Passage Content */}
                {hasStructuredHtml ? (
                    authenticPassageBody
                ) : (
                    <div className="leading-loose font-japanese text-[16px] sm:text-[18px] text-slate-900 dark:text-slate-100 select-text">
                        {hasInteractiveSentences ? (
                            sentences.map((s, idx) => (
                                <span
                                    key={idx}
                                    onClick={() => handleSentenceClick(idx)}
                                    className={`inline transition-all duration-150 rounded px-1.5 py-0.5 cursor-pointer ${
                                        selectedSentenceIdx === idx && isModalOpen
                                            ? 'bg-amber-200/90 dark:bg-amber-950/80 ring-2 ring-amber-400 dark:ring-amber-500 font-medium'
                                            : 'hover:bg-emerald-100/70 dark:hover:bg-emerald-950/50 hover:ring-1 hover:ring-emerald-400 dark:hover:ring-emerald-600'
                                    }`}
                                    title="Bấm vào câu này để mở bảng phân tích (nghĩa câu · từ vựng · ngữ pháp)"
                                    dangerouslySetInnerHTML={{ __html: s.jp }}
                                />
                            ))
                        ) : (
                            authenticPassageBody
                        )}
                    </div>
                )}

                {/* Helpful Instruction Banner */}
                {hasInteractiveSentences && (
                    <div className="p-2.5 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-900/40 flex items-center justify-between gap-2 text-xs text-emerald-800 dark:text-emerald-300 font-medium flex-wrap">
                        <div className="flex items-center gap-2">
                            <BookOpen className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                            <span>
                                {hasStructuredHtml
                                    ? '💡 Mẹo: Bấm "Phân tích toàn bài" để xem từng câu, từ vựng & ngữ pháp trong bảng thông tin.'
                                    : '💡 Mẹo: Bấm trực tiếp vào từng câu trên bài đọc để xem phân tích chi tiết (nghĩa câu · từ vựng · ngữ pháp).'}
                            </span>
                        </div>
                        <button
                            type="button"
                            onClick={() => handleSentenceClick(0)}
                            className="px-2.5 py-1 rounded-lg text-[11px] font-black bg-emerald-600 hover:bg-emerald-700 text-white transition cursor-pointer shrink-0 shadow-2xs"
                        >
                            Phân tích toàn bài
                        </button>
                    </div>
                )}

                {/* Vietnamese Full Translation (Collapsible) */}
                {showVietnamese && activePassageData?.vietnamese && (
                    <div className="p-4 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40 space-y-2 animate-fade-in">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-300 uppercase tracking-wider">
                            <Languages className="w-3.5 h-3.5" />
                            <span>Bản dịch tiếng Việt</span>
                        </div>
                        <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-200 leading-relaxed font-sans font-medium whitespace-pre-line">
                            {activePassageData.vietnamese.toString().normalize('NFC')}
                        </p>
                    </div>
                )}

                {/* Bottom Grammar & Vocab Chips */}
                {(passageGrammarPoints.length > 0 || passageVocabPoints.length > 0) && (
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2.5">
                        {passageGrammarPoints.length > 0 && (
                            <div className="space-y-1.5">
                                <div className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                                    Ngữ pháp xuất hiện trong bài:
                                </div>
                                <div className="flex flex-wrap gap-1.5">
                                    {passageGrammarPoints.map((g, gIdx) => (
                                        <button
                                            key={gIdx}
                                            type="button"
                                            onClick={() => handleSentenceClick(g.sentenceIdx || 0)}
                                            className="px-2.5 py-1 rounded-lg text-xs font-bold bg-sky-50 dark:bg-sky-950/40 hover:bg-sky-100 dark:hover:bg-sky-900/50 text-sky-700 dark:text-sky-300 border border-sky-200/60 dark:border-sky-800/60 transition flex items-center gap-1 cursor-pointer"
                                            title={g.vi || g.meaning || g.structure || ''}
                                        >
                                            <BookOpen className="w-3 h-3" />
                                            <span>{g.point}</span>
                                            {(g.vi || g.meaning) && <span className="opacity-70 font-normal">({g.vi || g.meaning})</span>}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {passageVocabPoints.length > 0 && (
                            <div className="space-y-1.5 pt-1">
                                <div className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                                    Từ vựng quan trọng:
                                </div>
                                <div className="flex flex-wrap gap-1.5">
                                    {passageVocabPoints.slice(0, 12).map((v, vIdx) => (
                                        <span
                                            key={vIdx}
                                            className="px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 flex items-center gap-1"
                                        >
                                            <strong className="font-bold text-emerald-600 dark:text-emerald-400">{v.w}</strong>
                                            {v.read && v.read !== v.w && <span className="text-[11px] text-slate-400">({v.read})</span>}
                                            <span>: {v.vi}</span>
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
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
