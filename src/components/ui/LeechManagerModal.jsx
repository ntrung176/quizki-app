import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { X, Flame, RotateCcw, Play, CheckCircle2, BookOpen, AlertTriangle, Sparkles, Filter } from 'lucide-react';
import { isLeechCard } from '../../utils/srs';
import FuriganaText from './FuriganaText';
import { useLanguage } from '../../context/LanguageContext';

const LeechManagerModal = ({ 
    isOpen, 
    onClose, 
    vocabCards = [], 
    kanjiItems = [], 
    grammarItems = [],
    scopeType = 'all', // 'all', 'vocab', 'kanji', 'grammar'
    onStartLeechReview,
    onResetLeechCount 
}) => {
    const { t } = useLanguage();
    const [selectedTab, setSelectedTab] = useState(scopeType);

    // Sync tab if scopeType changes
    const activeTab = scopeType !== 'all' ? scopeType : selectedTab;

    // Extract leech items
    const leechVocab = useMemo(() => vocabCards.filter(c => isLeechCard(c)), [vocabCards]);
    const leechKanji = useMemo(() => kanjiItems.filter(k => isLeechCard(k)), [kanjiItems]);
    const leechGrammar = useMemo(() => grammarItems.filter(g => isLeechCard(g)), [grammarItems]);

    const currentCount = useMemo(() => {
        if (scopeType === 'vocab') return leechVocab.length;
        if (scopeType === 'kanji') return leechKanji.length;
        if (scopeType === 'grammar') return leechGrammar.length;
        return leechVocab.length + leechKanji.length + leechGrammar.length;
    }, [scopeType, leechVocab, leechKanji, leechGrammar]);

    const titleText = useMemo(() => {
        if (scopeType === 'vocab') return `${t('modals.leechTitle', 'Quản Lý Thẻ Khó Thuộc')} (${t('nav.vocab', 'Từ vựng')})`;
        if (scopeType === 'kanji') return `${t('modals.leechTitle', 'Quản Lý Thẻ Khó Thuộc')} (${t('nav.kanji', 'Kanji')})`;
        if (scopeType === 'grammar') return `${t('modals.leechTitle', 'Quản Lý Thẻ Khó Thuộc')} (${t('nav.grammar', 'Ngữ pháp')})`;
        return t('modals.leechTitle', 'Quản Lý Thẻ Khó Thuộc (Leech Manager)');
    }, [scopeType, t]);

    const displayedItems = useMemo(() => {
        if (activeTab === 'vocab') return leechVocab.map(item => ({ ...item, leechType: 'vocab' }));
        if (activeTab === 'kanji') return leechKanji.map(item => ({ ...item, leechType: 'kanji' }));
        if (activeTab === 'grammar') return leechGrammar.map(item => ({ ...item, leechType: 'grammar' }));
        
        return [
            ...leechVocab.map(item => ({ ...item, leechType: 'vocab' })),
            ...leechKanji.map(item => ({ ...item, leechType: 'kanji' })),
            ...leechGrammar.map(item => ({ ...item, leechType: 'grammar' }))
        ];
    }, [activeTab, leechVocab, leechKanji, leechGrammar]);

    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-fade-in">
            <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl border border-rose-200 dark:border-rose-900/50 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                
                {/* Header */}
                <div className="px-6 py-5 bg-gradient-to-r from-rose-500/10 via-amber-500/10 to-transparent border-b border-rose-100 dark:border-rose-900/30 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-center font-bold shadow-inner">
                            🩸
                        </div>
                        <div>
                            <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                                {titleText}
                            </h2>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                Phát hiện {currentCount} thẻ bị quên từ 4 lần trở lên. Hãy tập trung xử lý để không bị tắc nghẽn bài học!
                            </p>
                        </div>
                    </div>

                    <button 
                        onClick={onClose}
                        className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Filter Tabs & Review All Button */}
                <div className="px-6 py-3 bg-slate-50/50 dark:bg-slate-950/50 border-b border-slate-200/60 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
                    {scopeType === 'all' ? (
                        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                            <button
                                onClick={() => setSelectedTab('all')}
                                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                                    activeTab === 'all' 
                                        ? 'bg-rose-600 text-white shadow-md' 
                                        : 'bg-slate-200/70 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-300'
                                }`}
                            >
                                Tất cả ({leechVocab.length + leechKanji.length + leechGrammar.length})
                            </button>
                            <button
                                onClick={() => setSelectedTab('vocab')}
                                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                                    activeTab === 'vocab' 
                                        ? 'bg-rose-600 text-white shadow-md' 
                                        : 'bg-slate-200/70 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-300'
                                }`}
                            >
                                Từ vựng ({leechVocab.length})
                            </button>
                            <button
                                onClick={() => setSelectedTab('kanji')}
                                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                                    activeTab === 'kanji' 
                                        ? 'bg-rose-600 text-white shadow-md' 
                                        : 'bg-slate-200/70 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-300'
                                }`}
                            >
                                Kanji ({leechKanji.length})
                            </button>
                            <button
                                onClick={() => setSelectedTab('grammar')}
                                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                                    activeTab === 'grammar' 
                                        ? 'bg-rose-600 text-white shadow-md' 
                                        : 'bg-slate-200/70 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-300'
                                }`}
                            >
                                Ngữ pháp ({leechGrammar.length})
                            </button>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-rose-600 dark:text-rose-400 bg-rose-500/10 px-3 py-1 rounded-lg border border-rose-500/20">
                                🩸 Thẻ Khó {titleText.replace('Quản Lý Thẻ ', '')} ({displayedItems.length})
                            </span>
                        </div>
                    )}

                    {displayedItems.length > 0 && onStartLeechReview && (
                        <button
                            onClick={() => {
                                onClose();
                                onStartLeechReview(displayedItems);
                            }}
                            className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-rose-600 to-amber-600 text-white text-xs font-bold shadow-md hover:scale-105 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer ml-auto"
                        >
                            <Play className="w-3.5 h-3.5 fill-white" />
                            Ôn Tập Riêng Thẻ Khó
                        </button>
                    )}
                </div>

                {/* List Body */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3">
                    {displayedItems.length === 0 ? (
                        <div className="py-12 text-center space-y-3">
                            <div className="w-14 h-14 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto text-2xl">
                                ✨
                            </div>
                            <h3 className="text-base font-bold text-slate-800 dark:text-white">
                                Không có thẻ khó thuộc nào!
                            </h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                                Tuyệt vời! Bạn đang ghi nhớ bài học rất tốt và chưa bị lặp lại lỗi sai nào quá 4 lần.
                            </p>
                        </div>
                    ) : (
                        displayedItems.map((item) => {
                            const lapseCount = item.lapseCount || item.srsLapseCount || 4;
                            const wordText = item.frontWithFurigana || item.front || item.kanji || item.title || item.pattern || '';
                            const meaningText = item.meaning || item.back || item.meaningVi || item.meaning_vi || '';
                            const typeLabel = item.leechType === 'vocab' ? 'Từ vựng' : item.leechType === 'kanji' ? 'Kanji' : 'Ngữ pháp';
                            const badgeColor = item.leechType === 'vocab' ? 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400' : item.leechType === 'kanji' ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400' : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400';

                            return (
                                <div 
                                    key={`${item.leechType}-${item.id}`}
                                    className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-slate-850 border border-slate-200/80 dark:border-slate-800 gap-3 hover:border-rose-300 dark:hover:border-rose-900/60 transition-all shadow-sm"
                                >
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider ${badgeColor}`}>
                                                {typeLabel}
                                            </span>
                                            <span className="text-xs font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1">
                                                🩸 Lapsed {lapseCount} lần
                                            </span>
                                        </div>
                                        <div className="text-base sm:text-lg font-bold text-slate-900 dark:text-white font-japanese">
                                            <FuriganaText text={wordText} />
                                        </div>
                                        {meaningText && (
                                            <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                                                {meaningText}
                                            </p>
                                        )}
                                    </div>

                                    {/* Action button */}
                                    {onResetLeechCount && (
                                        <button
                                            onClick={() => onResetLeechCount(item)}
                                            className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 hover:border-emerald-500 dark:hover:border-emerald-500 text-slate-700 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shrink-0 self-end sm:self-center"
                                            title="Đặt lại số lần quên nếu bạn đã ghi nhớ từ này"
                                        >
                                            <RotateCcw className="w-3.5 h-3.5" />
                                            Đã Thuộc (Reset)
                                        </button>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 bg-slate-50 dark:bg-slate-950 border-t border-slate-200/80 dark:border-slate-800 flex justify-between items-center text-xs text-slate-500 dark:text-slate-400">
                    <span>Mẹo: Hãy thêm câu ví dụ hoặc phân tích Hán Việt để thuộc thẻ lâu hơn.</span>
                    <button 
                        onClick={onClose}
                        className="px-4 py-2 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-white font-bold rounded-xl transition-all cursor-pointer"
                    >
                        Đóng
                    </button>
                </div>

            </div>
        </div>,
        document.body
    );
};

export default LeechManagerModal;
