import React, { useState, useMemo } from 'react';
import { 
    CheckCircle2, XCircle, Lightbulb, BookOpen, 
    Volume2, Plus, ChevronDown, ChevronUp,
    Languages, ListChecks, HelpCircle
} from 'lucide-react';
import { parseJlptExplanation } from '../../utils/jlptExplanationParser';
import SentenceBreakdownModal from './SentenceBreakdownModal';
import { speakJapanese } from '../../utils/audio';

const QuestionExplanationCard = ({ 
    question = {}, 
    options = [], 
    correctAnswer = -1, 
    userAnswer = undefined,
    onAddFlashcard = null,
    className = '' 
}) => {
    const [isBreakdownModalOpen, setIsBreakdownModalOpen] = useState(false);
    const [breakdownSentenceIdx, setBreakdownSentenceIdx] = useState(0);
    const [playingVocab, setPlayingVocab] = useState(null);

    const rawExplanation = question.explanation || question.detail || question.grammarNote || '';
    
    // Resolve correct option index
    const correctIdx = useMemo(() => {
        if (typeof correctAnswer === 'number' && correctAnswer >= 0) return correctAnswer;
        if (typeof question.correctAnswer === 'number') return question.correctAnswer;
        if (typeof question.answer === 'number') return question.answer;
        if (typeof question.correct === 'number') return question.correct;
        if (typeof question.correct === 'string' && options.length > 0) {
            return options.findIndex(o => o.trim() === question.correct.trim());
        }
        return -1;
    }, [correctAnswer, question, options]);

    const parsed = useMemo(() => {
        const res = parseJlptExplanation(rawExplanation, options, correctIdx);
        if ((!res.sentences || res.sentences.length === 0) && question.passageData?.sentences?.length > 0) {
            res.sentences = question.passageData.sentences;
        }
        return res;
    }, [rawExplanation, options, correctIdx, question]);

    const correctLetter = correctIdx >= 0 ? String.fromCharCode(65 + correctIdx) : '';
    const correctOptionText = correctIdx >= 0 && options[correctIdx] ? options[correctIdx] : '';

    const handleSpeakVocab = (text, reading = '') => {
        if (!text) return;
        setPlayingVocab(text);
        speakJapanese(text, null, null, null, reading).finally(() => {
            setPlayingVocab(null);
        });
    };

    return (
        <div className={`mt-4 rounded-3xl bg-gradient-to-br from-indigo-50/90 via-slate-50 to-purple-50/50 dark:from-slate-900 dark:via-slate-900/90 dark:to-indigo-950/40 border-2 border-indigo-200/80 dark:border-indigo-800/60 p-4 sm:p-6 shadow-sm space-y-4 animate-fade-in ${className}`}>
            
            {/* 1. Header Banner */}
            <div className="flex flex-wrap sm:flex-nowrap items-start sm:items-center justify-between gap-2 sm:gap-3 border-b border-indigo-100 dark:border-indigo-900/60 pb-3">
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <div className="w-8 h-8 rounded-xl bg-slate-900 dark:bg-slate-800 text-[#f494bc] flex items-center justify-center shrink-0 shadow-xs border border-slate-700/50">
                        <BookOpen className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                        <h4 className="text-sm sm:text-base font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2 truncate">
                            <span>Phân Tích & Giải Thích Chi Tiết</span>
                        </h4>
                        <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 font-medium leading-tight truncate">
                            Lời giải chính xác và phân tích chuyên sâu cho câu hỏi này
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-start sm:self-center">
                    {parsed.sentences && parsed.sentences.length > 0 && (
                        <button
                            type="button"
                            onClick={() => {
                                setBreakdownSentenceIdx(0);
                                setIsBreakdownModalOpen(true);
                            }}
                            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#f494bc] hover:bg-[#f6a0c5] text-slate-950 text-xs font-black shadow-[0_4px_14px_rgba(244,148,188,0.35)] transition cursor-pointer active:scale-95"
                            title="Bật bảng phân tích chi tiết từng câu trong bài"
                        >
                            <Languages className="w-3.5 h-3.5" />
                            <span>Phân tích câu</span>
                        </button>
                    )}

                    {correctLetter && (
                        <div className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl bg-emerald-100 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 font-black text-xs sm:text-sm shrink-0 whitespace-nowrap shadow-2xs">
                            <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                            <span>Đáp án: {correctLetter}</span>
                        </div>
                    )}
                </div>
            </div>

            {/* 2. Correct Answer Card (Phương án đúng & Lý do đúng) */}
            <div className="bg-white dark:bg-slate-800/90 rounded-2xl p-4 sm:p-5 border border-emerald-200 dark:border-emerald-900/60 shadow-xs space-y-2.5">
                <div className="flex items-start gap-3">
                    <span className="w-7 h-7 rounded-xl bg-emerald-600 text-white font-black text-xs sm:text-sm flex items-center justify-center shrink-0 shadow-xs mt-0.5">
                        {correctLetter || '✓'}
                    </span>
                    <div className="space-y-1.5 flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-black uppercase text-emerald-700 dark:text-emerald-400 tracking-wider">
                                Lựa chọn chính xác:
                            </span>
                        </div>

                        {correctOptionText && (
                            <p 
                                className="font-japanese font-bold text-slate-900 dark:text-white text-sm sm:text-base leading-relaxed"
                                dangerouslySetInnerHTML={{ __html: correctOptionText }}
                            />
                        )}

                        {parsed.correctTranslation && (
                            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 font-medium italic">
                                Dịch: {parsed.correctTranslation}
                            </p>
                        )}

                        {parsed.correctQuote && (
                            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-750 text-xs text-slate-700 dark:text-slate-300 font-medium">
                                <strong className="text-slate-900 dark:text-white">Trích dẫn:</strong> {parsed.correctQuote}
                            </div>
                        )}

                        {parsed.correctReason && (
                            <div className="text-xs sm:text-sm text-slate-800 dark:text-slate-200 leading-relaxed font-medium pt-1 whitespace-pre-line">
                                <strong className="text-emerald-700 dark:text-emerald-400">Lý do đúng:</strong> {parsed.correctReason}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* 3. Phân tích các đáp án sai (Wrong options breakdown) */}
            {parsed.wrongReasons && parsed.wrongReasons.length > 0 && (
                <div className="space-y-2 pt-1">
                    <div className="flex items-center gap-2 px-1">
                        <XCircle className="w-4 h-4 text-rose-500 shrink-0" />
                        <span className="text-xs font-black uppercase text-slate-700 dark:text-slate-300 tracking-wider">
                            Vì sao các phương án khác chưa đúng?
                        </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {parsed.wrongReasons.map((item, idx) => (
                            <div 
                                key={idx}
                                className="bg-white/90 dark:bg-slate-800/70 rounded-2xl p-3.5 border border-rose-150 dark:border-rose-950/60 flex items-start gap-2.5 text-xs sm:text-sm shadow-2xs hover:border-rose-300 dark:hover:border-rose-800 transition-colors"
                            >
                                <span className="w-5.5 h-5.5 rounded-lg bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 font-black text-xs flex items-center justify-center shrink-0 mt-0.5 border border-rose-200 dark:border-rose-900">
                                    {item.option}
                                </span>
                                <div className="space-y-1.5 min-w-0 flex-1">
                                    <span className="font-black text-[11px] uppercase text-rose-600 dark:text-rose-400 block">
                                        Phương án {item.option} chưa đúng:
                                    </span>
                                    {item.quote && (
                                        <div className="p-1.5 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800 text-[11px] text-slate-600 dark:text-slate-300">
                                            <strong className="text-slate-800 dark:text-slate-200">Trích dẫn:</strong> 「{item.quote}」
                                        </div>
                                    )}
                                    {item.translation && /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i.test(item.translation) && (
                                        <p className="text-slate-500 dark:text-slate-400 font-normal text-xs italic">
                                            Dịch: {item.translation}
                                        </p>
                                    )}
                                    <p className="text-slate-700 dark:text-slate-200 font-medium leading-relaxed whitespace-pre-line">
                                        {item.text}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* 3b. Căn cứ & Phân tích chuyên sâu (Detailed step-by-step breakdown & calculation) */}
            {parsed.detailedExplanation && (
                <div className="space-y-2 pt-1">
                    <div className="flex items-center gap-2 px-1">
                        <ListChecks className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                        <span className="text-xs font-black uppercase text-slate-700 dark:text-slate-300 tracking-wider">
                            Căn cứ & Phân tích chuyên sâu:
                        </span>
                    </div>

                    <div className="bg-white/95 dark:bg-slate-800/90 rounded-2xl p-4 sm:p-5 border border-indigo-200/80 dark:border-indigo-900/60 shadow-2xs space-y-2">
                        <div className="text-xs sm:text-sm text-slate-700 dark:text-slate-200 leading-relaxed font-medium whitespace-pre-line pl-3 border-l-2 border-indigo-400 dark:border-indigo-600">
                            {parsed.detailedExplanation}
                        </div>
                    </div>
                </div>
            )}

            {/* 4. Tổng hợp Ngữ Pháp xuất hiện trong câu / bài */}
            {parsed.grammarPoints && parsed.grammarPoints.length > 0 && (
                <div className="space-y-2 pt-1">
                    <div className="flex items-center gap-2 px-1">
                        <BookOpen className="w-4 h-4 text-sky-500 shrink-0" />
                        <span className="text-xs font-black uppercase text-slate-700 dark:text-slate-300 tracking-wider">
                            Ngữ pháp trọng tâm:
                        </span>
                    </div>

                    <div className="grid grid-cols-1 gap-2.5">
                        {parsed.grammarPoints.map((g, gIdx) => (
                            <div 
                                key={gIdx}
                                className="p-3.5 rounded-2xl bg-white dark:bg-slate-800/90 border border-sky-200/80 dark:border-sky-900/60 shadow-2xs space-y-1.5"
                            >
                                <div className="flex items-center gap-2 flex-wrap">
                                    <span className="px-2.5 py-0.5 rounded-md text-xs font-black bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300 border border-sky-300/60">
                                        {g.point}
                                    </span>
                                    {g.meaning && (
                                        <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
                                            Ý nghĩa: {g.meaning}
                                        </span>
                                    )}
                                </div>

                                {g.structure && (
                                    <div className="text-xs font-medium text-slate-600 dark:text-slate-300">
                                        <strong className="text-slate-900 dark:text-white">Cấu trúc:</strong> {g.structure}
                                    </div>
                                )}

                                {g.usage && (
                                    <div className="text-xs font-medium text-slate-600 dark:text-slate-300">
                                        <strong className="text-slate-900 dark:text-white">Cách dùng:</strong> {g.usage}
                                    </div>
                                )}

                                {g.examples && g.examples.length > 0 && (
                                    <div className="pt-1 border-t border-slate-100 dark:border-slate-700/60 space-y-0.5">
                                        {g.examples.map((ex, exIdx) => (
                                            <div key={exIdx} className="text-xs font-japanese text-slate-700 dark:text-slate-300 font-medium">
                                                • {ex}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* 5. Tổng hợp Từ Vựng quan trọng */}
            {parsed.vocabList && parsed.vocabList.length > 0 && (
                <div className="space-y-2 pt-1">
                    <div className="flex items-center gap-2 px-1">
                        <Languages className="w-4 h-4 text-emerald-500 shrink-0" />
                        <span className="text-xs font-black uppercase text-slate-700 dark:text-slate-300 tracking-wider">
                            Tổng hợp từ vựng quan trọng:
                        </span>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        {parsed.vocabList.map((v, vIdx) => (
                            <div 
                                key={vIdx}
                                className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center gap-2 shadow-2xs"
                            >
                                <button
                                    type="button"
                                    onClick={() => handleSpeakVocab(v.w, v.read || '')}
                                    className="text-slate-400 hover:text-emerald-600 transition cursor-pointer"
                                    title="Nghe phát âm từ này"
                                >
                                    <Volume2 className={`w-3.5 h-3.5 ${playingVocab === v.w ? 'text-emerald-500 animate-pulse' : ''}`} />
                                </button>
                                <strong className="font-japanese text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                                    {v.w}
                                </strong>
                                {v.read && v.read !== v.w && (
                                    <span className="text-[11px] text-slate-400 font-japanese">
                                        ({v.read})
                                    </span>
                                )}
                                <span className="text-xs text-slate-600 dark:text-slate-300">
                                    : {v.vi}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* 6. Tips & Traps (Mẹo làm bài & Lưu ý ngữ pháp) */}
            {parsed.tips && (
                <div className="flex items-start gap-3 p-4 rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/40 dark:to-orange-950/30 border border-amber-200 dark:border-amber-900/60 text-amber-900 dark:text-amber-200 shadow-2xs">
                    <Lightbulb className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                    <div className="space-y-1 text-xs sm:text-sm font-medium leading-relaxed">
                        <span className="font-extrabold text-xs uppercase tracking-wider text-amber-800 dark:text-amber-300 block">
                            💡 Bí Quyết & Mẹo Làm Bài Nhanh
                        </span>
                        <p className="text-slate-700 dark:text-amber-100/90 font-medium">
                            {parsed.tips}
                        </p>
                    </div>
                </div>
            )}

            {/* 7. Translation (Dịch câu hỏi & Ngữ cảnh) */}
            {parsed.translation && !parsed.correctTranslation && (
                <div className="flex items-start gap-3 p-4 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-200/80 dark:border-indigo-900/50 text-slate-800 dark:text-slate-200 shadow-2xs">
                    <BookOpen className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
                    <div className="space-y-1 text-xs sm:text-sm leading-relaxed flex-1">
                        <span className="font-extrabold text-xs uppercase tracking-wider text-indigo-700 dark:text-indigo-300 block">
                            📖 Dịch Nghĩa Tiếng Việt
                        </span>
                        <p className="text-slate-700 dark:text-slate-300 font-medium">
                            {parsed.translation}
                        </p>
                    </div>
                </div>
            )}

            {/* 8. Fallback if unparsed raw explanation */}
            {!parsed.isStructured && rawExplanation && (
                <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                    <p className="whitespace-pre-line" dangerouslySetInnerHTML={{ __html: parsed.rawCleanText || rawExplanation }} />
                </div>
            )}

            {/* Sentence Breakdown Modal */}
            {parsed.sentences && parsed.sentences.length > 0 && (
                <SentenceBreakdownModal
                    isOpen={isBreakdownModalOpen}
                    onClose={() => setIsBreakdownModalOpen(false)}
                    sentences={parsed.sentences}
                    currentSentenceIdx={breakdownSentenceIdx}
                    onSentenceChange={(newIdx) => setBreakdownSentenceIdx(newIdx)}
                    onAddFlashcard={onAddFlashcard}
                />
            )}
        </div>
    );
};

export default React.memo(QuestionExplanationCard);
