import React, { useState, useEffect } from 'react';
import { X, Volume2, Plus, Check, ChevronLeft, ChevronRight, BookOpen, Languages, Sparkles } from 'lucide-react';

const SentenceBreakdownModal = ({
    isOpen,
    onClose,
    sentences = [],
    currentSentenceIdx = 0,
    onSentenceChange,
    onAddFlashcard
}) => {
    const [addedWords, setAddedWords] = useState({});
    const [isPlaying, setIsPlaying] = useState(false);

    const sentence = sentences[currentSentenceIdx] || sentences[0];
    const totalSentences = sentences.length;

    useEffect(() => {
        setIsPlaying(false);
    }, [currentSentenceIdx]);

    if (!isOpen || !sentence) return null;

    const speakText = (text, rate = 0.9) => {
        if (!('speechSynthesis' in window)) return;
        window.speechSynthesis.cancel();
        const cleanText = text.replace(/<[^>]*>/g, '').replace(/（[^）]*）/g, '').trim();
        const utterance = new SpeechSynthesisUtterance(cleanText);
        utterance.lang = 'ja-JP';
        utterance.rate = rate;
        utterance.onstart = () => setIsPlaying(true);
        utterance.onend = () => setIsPlaying(false);
        utterance.onerror = () => setIsPlaying(false);
        window.speechSynthesis.speak(utterance);
    };

    const handleAddWord = (wObj, idx) => {
        const key = `${currentSentenceIdx}-${idx}-${wObj.w}`;
        setAddedWords(prev => ({ ...prev, [key]: true }));

        const cardData = {
            id: `vocab_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
            front: wObj.w || '',
            reading: wObj.read || wObj.w || '',
            back: wObj.vi || '',
            meaning: wObj.vi || '',
            contextJp: sentence.rawJp || sentence.jp || '',
            contextVi: sentence.vi || '',
            type: 'vocabulary',
            createdAt: new Date().toISOString()
        };

        if (onAddFlashcard) {
            onAddFlashcard(cardData);
        } else {
            // Save to localStorage custom deck
            try {
                const existing = JSON.parse(localStorage.getItem('quizki_custom_flashcards') || '[]');
                existing.unshift(cardData);
                localStorage.setItem('quizki_custom_flashcards', JSON.stringify(existing.slice(0, 500)));
                window.dispatchEvent(new CustomEvent('quizki_flashcards_updated', { detail: cardData }));
            } catch (e) {}
        }
    };

    const handlePrev = () => {
        if (currentSentenceIdx > 0 && onSentenceChange) {
            onSentenceChange(currentSentenceIdx - 1);
        }
    };

    const handleNext = () => {
        if (currentSentenceIdx < totalSentences - 1 && onSentenceChange) {
            onSentenceChange(currentSentenceIdx + 1);
        }
    };

    const cleanVi = (str) => {
        if (!str) return '';
        return str.toString().normalize('NFC').trim();
    };

    return (
        <div className="fixed inset-0 z-[100] bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-fade-in font-sans">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
                
                {/* 1. Header */}
                <div className="px-5 py-3.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-emerald-50/50 via-white to-sky-50/50 dark:from-slate-900 dark:to-slate-900 shrink-0">
                    <div className="flex items-center gap-2">
                        <span className="px-2.5 py-1 rounded-lg text-xs font-black bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                            文 {currentSentenceIdx + 1}/{totalSentences}
                        </span>
                        <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                            Phân tích câu
                        </span>
                    </div>

                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition cursor-pointer"
                        title="Đóng (Esc)"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* 2. Scrollable Body */}
                <div className="flex-1 overflow-y-auto p-5 space-y-5 custom-scrollbar">
                    
                    {/* Main Sentence Japanese with Furigana */}
                    <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 dark:bg-slate-950/50 border border-slate-200/80 dark:border-slate-800 space-y-3">
                        <div className="flex items-start justify-between gap-3">
                            <div 
                                className="text-lg sm:text-xl font-japanese font-medium text-slate-900 dark:text-slate-100 leading-loose flex-1"
                                dangerouslySetInnerHTML={{ __html: sentence.jp }}
                            />
                            <button
                                onClick={() => speakText(sentence.rawJp || sentence.jp)}
                                className={`p-2.5 rounded-xl transition-all cursor-pointer shrink-0 active:scale-90 ${
                                    isPlaying
                                        ? 'bg-emerald-500 text-white animate-pulse shadow-md shadow-emerald-500/20'
                                        : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 border border-slate-200 dark:border-slate-700 shadow-xs'
                                }`}
                                title="Nghe đọc câu này"
                            >
                                <Volume2 className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Vietnamese Translation */}
                        {sentence.vi && (
                            <div className="pt-3 border-t border-slate-200/60 dark:border-slate-800/80">
                                <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs">
                                    <p className="text-sm sm:text-base font-sans font-medium text-slate-800 dark:text-slate-100 leading-relaxed">
                                        “{cleanVi(sentence.vi)}”
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Vocabulary Breakdown Section */}
                    {sentence.vocab && sentence.vocab.length > 0 && (
                        <div className="space-y-2.5">
                            <div className="flex items-center gap-1.5 text-xs font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                                <Languages className="w-4 h-4" />
                                <span>語彙 · Từ vựng</span>
                            </div>

                            <div className="space-y-1.5">
                                {sentence.vocab.map((v, vIdx) => {
                                    const isAdded = !!addedWords[`${currentSentenceIdx}-${vIdx}-${v.w}`];
                                    return (
                                        <div
                                            key={vIdx}
                                            className="p-2.5 sm:p-3 rounded-xl bg-white dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3 hover:border-slate-200 dark:hover:border-slate-700 transition"
                                        >
                                            <div className="min-w-0 flex-1 flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-3">
                                                <div className="flex items-baseline gap-2 shrink-0">
                                                    <span className="font-japanese font-bold text-sm sm:text-base text-slate-900 dark:text-white">
                                                        {v.w}
                                                    </span>
                                                    {v.read && v.read !== v.w && (
                                                        <span className="font-japanese text-xs text-slate-400 dark:text-slate-500">
                                                            {v.read}
                                                        </span>
                                                    )}
                                                </div>
                                                <span className="text-xs sm:text-sm text-slate-700 dark:text-slate-200 font-sans font-medium truncate">
                                                    {cleanVi(v.vi)}
                                                </span>
                                            </div>

                                            <button
                                                onClick={() => handleAddWord(v, vIdx)}
                                                disabled={isAdded}
                                                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer shrink-0 active:scale-95 ${
                                                    isAdded
                                                        ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                                                        : 'bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 dark:bg-slate-700 dark:hover:bg-indigo-950/40 dark:hover:text-indigo-400 text-slate-700 dark:text-slate-300'
                                                }`}
                                                title={isAdded ? 'Đã thêm vào Flashcard' : 'Thêm vào bộ thẻ Flashcard'}
                                            >
                                                {isAdded ? (
                                                    <>
                                                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                                                        <span>Đã thêm</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <Plus className="w-3.5 h-3.5" />
                                                        <span>+ Thẻ</span>
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Grammar Breakdown Section */}
                    {sentence.grammar && sentence.grammar.length > 0 && (
                        <div className="space-y-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                            <div className="flex items-center gap-1.5 text-xs font-black text-sky-600 dark:text-sky-400 uppercase tracking-wider">
                                <BookOpen className="w-4 h-4" />
                                <span>文法 · Ngữ pháp</span>
                            </div>

                            <div className="space-y-2">
                                {sentence.grammar.map((g, gIdx) => (
                                    <div
                                        key={gIdx}
                                        className="p-3.5 rounded-xl bg-sky-50/50 dark:bg-sky-950/20 border border-sky-100 dark:border-sky-900/40 space-y-1"
                                    >
                                        <div className="font-bold text-xs sm:text-sm text-sky-800 dark:text-sky-300 flex items-center gap-1.5 font-sans">
                                            <span className="w-1.5 h-1.5 rounded-full bg-sky-500 shrink-0" />
                                            <span>{cleanVi(g.point)}</span>
                                        </div>
                                        <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 font-sans leading-relaxed pl-3 font-medium">
                                            {cleanVi(g.vi)}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* 3. Footer Navigation Buttons */}
                <div className="px-5 py-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-900/50 shrink-0">
                    <button
                        onClick={handlePrev}
                        disabled={currentSentenceIdx === 0}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                            currentSentenceIdx === 0
                                ? 'opacity-40 cursor-not-allowed bg-slate-100 dark:bg-slate-800 text-slate-400'
                                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer active:scale-95 shadow-xs'
                        }`}
                    >
                        <ChevronLeft className="w-4 h-4" />
                        <span>← 前の文</span>
                    </button>

                    <div className="text-[11px] font-bold text-slate-400 dark:text-slate-500">
                        {currentSentenceIdx + 1} / {totalSentences}
                    </div>

                    <button
                        onClick={handleNext}
                        disabled={currentSentenceIdx === totalSentences - 1}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                            currentSentenceIdx === totalSentences - 1
                                ? 'opacity-40 cursor-not-allowed bg-slate-100 dark:bg-slate-800 text-slate-400'
                                : 'bg-indigo-600 hover:bg-indigo-500 text-white cursor-pointer active:scale-95 shadow-md shadow-indigo-600/20'
                        }`}
                    >
                        <span>次の文 →</span>
                        <ChevronRight className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SentenceBreakdownModal;
