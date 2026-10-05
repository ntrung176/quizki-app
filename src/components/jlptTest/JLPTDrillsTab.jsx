import React, { useState, useEffect, useMemo } from 'react';
import { 
    Zap, BookOpen, Volume2, Play, CheckCircle2, 
    Search, Filter, ArrowRight, RotateCcw, Check, X,
    HelpCircle, Headphones, CheckCircle, XCircle, Lightbulb
} from 'lucide-react';
import { LEVEL_GRADIENTS } from './jlptConstants';

export const formatFuriganaRuby = (text) => {
    if (!text) return '';
    // Normalize to NFC to fix Vietnamese decomposed combining accents
    const normalized = String(text).normalize('NFC');
    // Match Japanese Kanji/Kana followed by [furigana] -> <ruby>Kanji<rt>furigana</rt></ruby>
    return normalized.replace(/([\u4e00-\u9faf\u3040-\u309f\u30a0-\u30ff々〆ヶ]+)\[([^\[\]]+)\]/g, '<ruby class="font-japanese">$1<rt class="text-[10px] text-indigo-600 dark:text-indigo-400 font-normal px-0.5">$2</rt></ruby>');
};

const JLPTDrillsTab = ({
    selectedLevel = 'all',
    searchQuery = '',
    onStartDrillTest
}) => {
    const [drills, setDrills] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeDrillModal, setActiveDrillModal] = useState(null); // Selected drill for modal view
    const [modalTab, setModalTab] = useState('cards'); // 'cards' | 'know'
    const [activeCardIdx, setActiveCardIdx] = useState(0);
    const [selectedChoiceIdx, setSelectedChoiceIdx] = useState(null);
    const [showAnswer, setShowAnswer] = useState(false);
    const [isPlayingAudio, setIsPlayingAudio] = useState(false);

    useEffect(() => {
        fetch('/data/drills_data.json')
            .then(res => res.ok ? res.json() : [])
            .then(data => {
                if (Array.isArray(data)) setDrills(data);
                setLoading(false);
            })
            .catch(() => setLoading(false));
    }, []);

    const filteredDrills = useMemo(() => {
        return drills.filter(d => {
            if (selectedLevel !== 'all' && d.level !== selectedLevel) return false;
            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase().normalize('NFC');
                const matchTitle = (d.titleVi || '').toLowerCase().normalize('NFC').includes(q);
                const matchBai = `bài ${d.bai}`.includes(q) || `#${d.bai}`.includes(q);
                const matchKnow = (d.know || []).some(k => (k.jp || '').toLowerCase().includes(q) || (k.vi || '').toLowerCase().normalize('NFC').includes(q));
                if (!matchTitle && !matchBai && !matchKnow) return false;
            }
            return true;
        });
    }, [drills, selectedLevel, searchQuery]);

    const handleOpenDrill = (drill) => {
        setActiveDrillModal(drill);
        setModalTab('cards');
        setActiveCardIdx(0);
        setSelectedChoiceIdx(null);
        setShowAnswer(false);
    };

    const speakText = (text, rate = 0.9) => {
        if (!('speechSynthesis' in window)) return;
        window.speechSynthesis.cancel();
        const cleanText = String(text || '').replace(/<[^>]*>/g, '').replace(/\[[^\]]*\]/g, '').replace(/＿/g, '').trim();
        if (!cleanText) return;
        const utterance = new SpeechSynthesisUtterance(cleanText);
        utterance.lang = 'ja-JP';
        utterance.rate = rate;
        utterance.onstart = () => setIsPlayingAudio(true);
        utterance.onend = () => setIsPlayingAudio(false);
        utterance.onerror = () => setIsPlayingAudio(false);
        window.speechSynthesis.speak(utterance);
    };

    const currentCard = activeDrillModal?.cards?.[activeCardIdx];
    const totalCards = activeDrillModal?.cards?.length || 0;

    // Derived card data
    const questionStem = currentCard?.t1?.stem || currentCard?.t3?.target || currentCard?.stem || currentCard?.prompt || currentCard?.front || currentCard?.jp || '';
    const vietnameseMeaning = (currentCard?.vi || currentCard?.vietnamese || '').normalize('NFC');
    const choices = currentCard?.t1?.choices || currentCard?.choices || [];
    const correctChoiceIdx = currentCard?.t1?.answer ?? currentCard?.answer ?? 0;
    const completedSentence = currentCard?.t3?.target || (currentCard?.t1?.stem && choices[correctChoiceIdx] ? currentCard.t1.stem.replace('＿', choices[correctChoiceIdx]) : questionStem);
    const explanation = (currentCard?.why || currentCard?.explain || currentCard?.explanation || '').normalize('NFC');

    const handleSelectChoice = (ci) => {
        setSelectedChoiceIdx(ci);
        setShowAnswer(true);
    };

    const handleNextCard = () => {
        if (activeCardIdx < totalCards - 1) {
            setActiveCardIdx(prev => prev + 1);
            setSelectedChoiceIdx(null);
            setShowAnswer(false);
        } else {
            setActiveDrillModal(null);
        }
    };

    const handlePrevCard = () => {
        if (activeCardIdx > 0) {
            setActiveCardIdx(prev => prev - 1);
            setSelectedChoiceIdx(null);
            setShowAnswer(false);
        }
    };

    return (
        <div className="space-y-6 animate-fade-in font-sans">
            
            {/* Minimal Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl sm:rounded-3xl p-3.5 sm:p-4 shadow-xs">
                <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                        <Zap className="w-4 h-4" />
                    </div>
                    <h2 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                        <span>Luyện phản xạ ngữ pháp</span>
                        <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                            {filteredDrills.length} bài ôn {selectedLevel !== 'all' ? `(${selectedLevel})` : ''}
                        </span>
                    </h2>
                </div>
            </div>

            {/* Drills Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredDrills.map((drill) => {
                    const lvlGradient = LEVEL_GRADIENTS[drill.level] || LEVEL_GRADIENTS.N5;
                    return (
                        <div
                            key={drill.id || drill.bai}
                            onClick={() => handleOpenDrill(drill)}
                            className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 hover:border-amber-400 dark:hover:border-amber-500 rounded-3xl p-5 transition-all duration-200 shadow-xs hover:shadow-md cursor-pointer flex flex-col justify-between group"
                        >
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className={`px-2.5 py-1 rounded-xl bg-gradient-to-r ${lvlGradient} text-white font-black text-xs shadow-xs`}>
                                            {drill.level}
                                        </div>
                                        <span className="text-xs font-bold text-slate-400 dark:text-slate-500">
                                            Bài #{drill.bai}
                                        </span>
                                    </div>
                                    <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-lg">
                                        {drill.cardsCount || drill.cards?.length || 0} thẻ phản xạ
                                    </span>
                                </div>

                                <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white group-hover:text-amber-600 transition">
                                    {(drill.titleVi || `Luyện phản xạ Bài ${drill.bai}`).normalize('NFC')}
                                </h3>

                                {/* Grammar points preview */}
                                {drill.know && drill.know.length > 0 && (
                                    <div className="space-y-1.5 pt-1">
                                        {drill.know.slice(0, 3).map((k, kIdx) => (
                                            <div key={kIdx} className="text-xs font-japanese text-slate-600 dark:text-slate-300 flex items-center gap-1.5 truncate">
                                                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                                                <span className="font-bold">{k.jp}</span>
                                                <span className="text-slate-400 font-normal">· {(k.vi || '').normalize('NFC')}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                                <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                                    61 bài phản xạ ngữ pháp
                                </span>
                                <span className="px-3 py-1 rounded-xl bg-[#f494bc] group-hover:bg-[#f6a0c5] text-slate-950 font-black text-xs flex items-center gap-1 shadow-[0_3px_10px_rgba(244,148,188,0.35)] transition-all">
                                    <span>Luyện phản xạ</span>
                                    <ArrowRight className="w-3.5 h-3.5" />
                                </span>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Drill Flashcard / Reflex Modal */}
            {activeDrillModal && (
                <div className="fixed inset-0 z-[100] bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-fade-in font-sans">
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
                        
                        {/* Modal Header */}
                        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-amber-50/70 via-white to-orange-50/70 dark:from-slate-900 dark:to-slate-900">
                            <div>
                                <div className="flex items-center gap-2">
                                    <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400">
                                        {activeDrillModal.level} · Bài #{activeDrillModal.bai}
                                    </span>
                                    {modalTab === 'cards' && (
                                        <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                                            Thẻ {activeCardIdx + 1}/{totalCards}
                                        </span>
                                    )}
                                </div>
                                <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white mt-1">
                                    {(activeDrillModal.titleVi || '').normalize('NFC')}
                                </h3>
                            </div>
                            <button
                                onClick={() => setActiveDrillModal(null)}
                                className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition cursor-pointer"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Modal Sub-Tabs */}
                        <div className="flex items-center gap-2 px-5 py-2 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/30">
                            <button
                                onClick={() => setModalTab('cards')}
                                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                                    modalTab === 'cards'
                                        ? 'bg-[#f494bc] text-slate-950 font-black shadow-xs'
                                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'
                                }`}
                            >
                                <Zap className="w-3.5 h-3.5" />
                                <span>Thẻ Phản Xạ ({totalCards})</span>
                            </button>

                            {activeDrillModal.know && activeDrillModal.know.length > 0 && (
                                <button
                                    onClick={() => setModalTab('know')}
                                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                                        modalTab === 'know'
                                            ? 'bg-[#f494bc] text-slate-950 font-black shadow-xs'
                                            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'
                                    }`}
                                >
                                    <BookOpen className="w-3.5 h-3.5" />
                                    <span>Điểm Ngữ Pháp ({activeDrillModal.know.length})</span>
                                </button>
                            )}
                        </div>

                        {/* Modal Body */}
                        <div className="p-5 sm:p-6 flex-1 overflow-y-auto space-y-5 custom-scrollbar">
                            
                            {/* TAB 1: Reflex Cards */}
                            {modalTab === 'cards' && (
                                <>
                                    {currentCard ? (
                                        <div className="space-y-4">
                                            
                                            {/* Vietnamese Context Meaning */}
                                            {vietnameseMeaning && (
                                                <div className="p-4 rounded-2xl bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-900/40 text-center space-y-1">
                                                    <span className="text-[10px] font-black uppercase text-amber-700 dark:text-amber-400 tracking-wider block">
                                                        Ý nghĩa cần diễn đạt (Tiếng Việt)
                                                    </span>
                                                    <p className="text-sm sm:text-base font-bold text-slate-900 dark:text-white leading-relaxed font-sans">
                                                        "{vietnameseMeaning}"
                                                    </p>
                                                </div>
                                            )}

                                            {/* Question Card Box */}
                                            <div 
                                                onClick={() => !showAnswer && setShowAnswer(true)}
                                                className="p-5 sm:p-6 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border-2 border-dashed border-amber-300 dark:border-amber-700 min-h-[140px] flex flex-col justify-center text-center space-y-3 cursor-pointer select-none transition-all hover:bg-amber-50/30"
                                            >
                                                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                                                    {showAnswer ? 'Câu hoàn chỉnh' : 'Điền vào chỗ trống (Bấm để lật)'}
                                                </span>

                                                <div className="flex items-center justify-center gap-2">
                                                    <div 
                                                        className="text-lg sm:text-2xl font-japanese font-medium text-slate-900 dark:text-white leading-loose"
                                                        dangerouslySetInnerHTML={{ 
                                                            __html: showAnswer 
                                                                ? formatFuriganaRuby(completedSentence) 
                                                                : formatFuriganaRuby(questionStem) 
                                                        }}
                                                    />
                                                    {showAnswer && (
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                speakText(completedSentence);
                                                            }}
                                                            className={`p-2 rounded-xl transition cursor-pointer shrink-0 ${
                                                                isPlayingAudio
                                                                    ? 'bg-amber-500 text-white animate-pulse'
                                                                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-amber-600 shadow-xs'
                                                            }`}
                                                            title="Nghe phát âm"
                                                        >
                                                            <Volume2 className="w-5 h-5" />
                                                        </button>
                                                    )}
                                                </div>

                                                {/* Explanation Box */}
                                                {showAnswer && explanation && (
                                                    <div className="pt-3 border-t border-slate-200 dark:border-slate-800 text-left space-y-1.5 animate-fade-in">
                                                        <div className="flex items-center gap-1.5 text-xs font-black text-amber-700 dark:text-amber-400">
                                                            <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
                                                            <span>Giải thích & Mẹo ngữ pháp:</span>
                                                        </div>
                                                        <p 
                                                            className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-japanese font-sans"
                                                            dangerouslySetInnerHTML={{ __html: formatFuriganaRuby(explanation) }}
                                                        />
                                                    </div>
                                                )}
                                            </div>

                                            {/* Choice Buttons for Interactive Multiple Choice Drill */}
                                            {choices.length > 0 && (
                                                <div className="space-y-2 pt-1">
                                                    <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                                                        Chọn đáp án chính xác:
                                                    </div>
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                        {choices.map((ch, ci) => {
                                                            const isSelected = selectedChoiceIdx === ci;
                                                            const isCorrect = ci === correctChoiceIdx;

                                                            let btnStyle = 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-amber-400 text-slate-800 dark:text-slate-200';
                                                            if (showAnswer) {
                                                                if (isCorrect) {
                                                                    btnStyle = 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 text-emerald-800 dark:text-emerald-300 font-bold shadow-xs';
                                                                } else if (isSelected && !isCorrect) {
                                                                    btnStyle = 'bg-rose-50 dark:bg-rose-950/40 border-rose-400 text-rose-700 dark:text-rose-400 line-through';
                                                                } else {
                                                                    btnStyle = 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 text-slate-400 opacity-60';
                                                                }
                                                            }

                                                            return (
                                                                <button
                                                                    key={ci}
                                                                    onClick={() => handleSelectChoice(ci)}
                                                                    className={`p-3 sm:p-3.5 rounded-2xl border-2 text-left text-xs sm:text-sm font-japanese transition flex items-center justify-between gap-2 cursor-pointer active:scale-98 ${btnStyle}`}
                                                                >
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="w-5 h-5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-[11px] font-bold flex items-center justify-center shrink-0">
                                                                            {String.fromCharCode(65 + ci)}
                                                                        </span>
                                                                        <span dangerouslySetInnerHTML={{ __html: formatFuriganaRuby(ch) }} />
                                                                    </div>
                                                                    {showAnswer && isCorrect && (
                                                                        <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                                                                    )}
                                                                    {showAnswer && isSelected && !isCorrect && (
                                                                        <X className="w-4 h-4 text-rose-500 shrink-0" />
                                                                    )}
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="text-center py-12 text-slate-500">
                                            Đã hoàn thành tất cả thẻ trong bài học!
                                        </div>
                                    )}
                                </>
                            )}

                            {/* TAB 2: Grammar Knowledge Overview */}
                            {modalTab === 'know' && (
                                <div className="space-y-4">
                                    {activeDrillModal.know?.map((k, kIdx) => (
                                        <div
                                            key={kIdx}
                                            className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200/90 dark:border-slate-700/80 shadow-xs space-y-3"
                                        >
                                            {/* Grammar Header */}
                                            <div className="flex items-center justify-between gap-3 pb-2.5 border-b border-slate-100 dark:border-slate-700/60">
                                                <div className="flex items-center gap-2.5 flex-wrap">
                                                    <span className="w-6 h-6 rounded-lg bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 font-black text-xs flex items-center justify-center shrink-0">
                                                        {kIdx + 1}
                                                    </span>
                                                    <h4 
                                                        className="font-japanese font-black text-base sm:text-lg text-slate-900 dark:text-white"
                                                        dangerouslySetInnerHTML={{ __html: formatFuriganaRuby(k.jp) }}
                                                    />
                                                </div>
                                                {k.point && (
                                                    <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300 shrink-0">
                                                        {k.point}
                                                    </span>
                                                )}
                                            </div>

                                            {/* Meaning / Explanation (Vietnamese) */}
                                            {k.vi && (
                                                <div className="space-y-0.5">
                                                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">
                                                        Ý nghĩa ngữ pháp:
                                                    </span>
                                                    <p className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-100 leading-relaxed font-sans">
                                                        {(k.vi || '').normalize('NFC')}
                                                    </p>
                                                </div>
                                            )}

                                            {/* Grammar Structure & Example (k.gloss) */}
                                            {k.gloss && (
                                                <div className="p-3 sm:p-3.5 rounded-xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40 text-xs text-slate-700 dark:text-slate-300 font-japanese leading-relaxed space-y-1">
                                                    <span className="text-[10px] font-black uppercase text-amber-700 dark:text-amber-400 tracking-wider block">
                                                        Cấu trúc kết hợp & Ví dụ mẫu:
                                                    </span>
                                                    <div 
                                                        className="leading-relaxed whitespace-pre-line"
                                                        dangerouslySetInnerHTML={{ __html: formatFuriganaRuby(k.gloss) }} 
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Modal Footer */}
                        {modalTab === 'cards' && (
                            <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-900/50 shrink-0">
                                <button
                                    onClick={handlePrevCard}
                                    disabled={activeCardIdx === 0}
                                    className="px-4 py-2 rounded-xl text-xs font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 disabled:opacity-40 cursor-pointer shadow-xs active:scale-95 transition"
                                >
                                    ← Thẻ trước
                                </button>

                                <button
                                    onClick={() => setShowAnswer(!showAnswer)}
                                    className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 hover:bg-amber-200 transition cursor-pointer active:scale-95"
                                >
                                    {showAnswer ? 'Ẩn đáp án' : 'Lật xem đáp án'}
                                </button>

                                <button
                                    onClick={handleNextCard}
                                    className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-500 text-white transition cursor-pointer shadow-md shadow-amber-600/20 active:scale-95"
                                >
                                    {activeCardIdx < totalCards - 1 ? 'Thẻ tiếp →' : 'Hoàn thành ✓'}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default JLPTDrillsTab;
