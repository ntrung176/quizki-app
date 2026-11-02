import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight, RotateCcw, Volume2, Edit, CheckCircle, Sparkles, BookMarked, Eye, Layers } from 'lucide-react';
import { getAuth } from 'firebase/auth';
import { TopTabBar } from '../ui';
import { GRAMMAR_TABS } from '../../config/tabs';
import { getGrammarNotebookById } from '../../utils/grammarNotebookService';
import { speakExampleSentence } from '../../utils/audio';
import { showToast } from '../../utils/toast';

export const GrammarNotebookStudyScreen = () => {
    const navigate = useNavigate();
    const { notebookId } = useParams();
    const auth = getAuth();
    const userId = auth?.currentUser?.uid;

    const [notebook, setNotebook] = useState(null);
    const [loading, setLoading] = useState(true);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isFlipped, setIsFlipped] = useState(false);
    const [masteredIds, setMasteredIds] = useState(new Set());
    const [isFinished, setIsFinished] = useState(false);

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            try {
                const data = await getGrammarNotebookById(userId, notebookId);
                if (data && data.items && data.items.length > 0) {
                    setNotebook(data);
                } else if (data) {
                    showToast('Sổ tay này chưa có mẫu ngữ pháp nào. Vui lòng thêm mẫu trước.', 'info');
                    navigate(`/grammar/notebook/${notebookId}/edit`);
                } else {
                    showToast('Không tìm thấy sổ tay', 'error');
                    navigate('/grammar/notebook');
                }
            } catch (e) {
                console.error('Error loading study notebook:', e);
            } finally {
                setLoading(false);
            }
        };

        load();
    }, [notebookId, userId, navigate]);

    const items = notebook?.items || [];
    const currentItem = items[currentIndex];

    // Keyboard navigation
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (isFinished || items.length === 0) return;

            if (e.code === 'Space') {
                e.preventDefault();
                setIsFlipped(prev => !prev);
            } else if (e.code === 'ArrowRight') {
                e.preventDefault();
                handleNext();
            } else if (e.code === 'ArrowLeft') {
                e.preventDefault();
                handlePrev();
            } else if (e.key === '1') {
                handleScore(false);
            } else if (e.key === '2') {
                handleScore(true);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [currentIndex, isFinished, items.length, isFlipped]);

    const handleNext = () => {
        if (currentIndex < items.length - 1) {
            setIsFlipped(false);
            setCurrentIndex(prev => prev + 1);
        } else {
            setIsFinished(true);
        }
    };

    const handlePrev = () => {
        if (currentIndex > 0) {
            setIsFlipped(false);
            setCurrentIndex(prev => prev - 1);
        }
    };

    const handleScore = (isMastered) => {
        if (!currentItem) return;
        if (isMastered) {
            setMasteredIds(prev => new Set(prev).add(currentItem.id));
        } else {
            setMasteredIds(prev => {
                const next = new Set(prev);
                next.delete(currentItem.id);
                return next;
            });
        }
        handleNext();
    };

    const handleRestart = () => {
        setCurrentIndex(0);
        setIsFlipped(false);
        setIsFinished(false);
        setMasteredIds(new Set());
    };

    if (loading) {
        return (
            <div className="w-full min-h-screen pb-16">
                <TopTabBar tabs={GRAMMAR_TABS} />
                <div className="py-20 text-center text-slate-400 font-medium animate-pulse">
                    Đang nạp flashcard ngữ pháp...
                </div>
            </div>
        );
    }

    if (!notebook || items.length === 0) return null;

    return (
        <div className="w-full pb-20 bg-transparent min-h-screen">
            <TopTabBar tabs={GRAMMAR_TABS} />

            <div className="max-w-4xl mx-auto px-4 sm:px-6 mt-4 space-y-6 animate-fade-in">
                {/* Header Action Bar */}
                <div className="flex items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-3">
                    <button
                        type="button"
                        onClick={() => navigate('/grammar/notebook')}
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-sky-600 dark:text-slate-400 dark:hover:text-sky-400 transition-colors cursor-pointer"
                    >
                        <ChevronLeft className="w-4 h-4" />
                        <span>Sổ tay ngữ pháp</span>
                    </button>

                    <div className="flex items-center gap-2">
                        <span className="text-xs sm:text-sm font-black text-slate-700 dark:text-slate-300">
                            {notebook.title}
                        </span>
                        <span className="text-xs font-black text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/60 border border-sky-200 dark:border-sky-800 px-2.5 py-0.5 rounded-lg">
                            {currentIndex + 1} / {items.length}
                        </span>
                    </div>

                    <button
                        type="button"
                        onClick={() => navigate(`/grammar/notebook/${notebook.id}/edit`)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border-2 border-b-3 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-sky-300 font-black text-xs transition-all cursor-pointer active:translate-y-0.5"
                    >
                        <Edit className="w-3.5 h-3.5 text-sky-500" />
                        <span className="hidden sm:inline">Sửa sổ tay</span>
                    </button>
                </div>

                {isFinished ? (
                    /* Completed State */
                    <div className="bg-white/95 dark:bg-slate-900/95 border-2 border-b-4 border-slate-200 dark:border-slate-800 rounded-3xl p-8 sm:p-12 text-center space-y-6 shadow-sm">
                        <div className="w-20 h-20 rounded-full bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-inner">
                            <CheckCircle className="w-10 h-10" />
                        </div>
                        <div className="space-y-2">
                            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
                                Hoàn thành ôn tập! 🎉
                            </h2>
                            <p className="text-sm text-slate-500 dark:text-slate-400">
                                Bạn đã ôn hết {items.length} mẫu ngữ pháp trong sổ tay <strong>{notebook.title}</strong>.
                            </p>
                            <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                                Đã nhớ: {masteredIds.size} / {items.length} mẫu
                            </p>
                        </div>
                        <div className="flex flex-wrap items-center justify-center gap-3 pt-4">
                            <button
                                type="button"
                                onClick={handleRestart}
                                className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-sky-500 hover:bg-sky-400 border-2 border-b-4 border-sky-700 text-white font-black text-sm shadow-md transition-all cursor-pointer select-none active:translate-y-0.5 active:border-b-2"
                            >
                                <RotateCcw className="w-4 h-4" />
                                <span>Ôn tập lại từ đầu</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => navigate('/grammar/notebook')}
                                className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 font-bold text-sm transition-all cursor-pointer"
                            >
                                <span>Về danh sách sổ tay</span>
                            </button>
                        </div>
                    </div>
                ) : (
                    /* Study Flashcard */
                    <div className="space-y-6">
                        {/* 3D Tactile Flashcard */}
                        <div
                            onClick={() => setIsFlipped(prev => !prev)}
                            className="group relative w-full min-h-[360px] sm:min-h-[420px] bg-white/95 dark:bg-slate-900/95 backdrop-blur-xs border-2 border-b-4 border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-10 flex flex-col justify-between shadow-sm cursor-pointer hover:border-sky-300 dark:hover:border-sky-700 transition-all select-none"
                        >
                            {/* Card Top Pill Badge */}
                            <div className="flex items-center justify-between">
                                <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-xl">
                                    {isFlipped ? 'Mặt sau (Ý nghĩa & Chi tiết)' : 'Mặt trước (Mẫu câu & Công thức)'}
                                </span>
                                <span className="text-xs text-slate-400 font-medium">
                                    Nhấn để lật thẻ (Space)
                                </span>
                            </div>

                            {/* Card Main Body */}
                            {!isFlipped ? (
                                /* FRONT SIDE: Pattern, Connection, Scope */
                                <div className="my-auto py-8 text-center space-y-4">
                                    <div className="flex items-center justify-center gap-3">
                                        <h2 className="text-3xl sm:text-5xl font-black text-slate-900 dark:text-white font-japanese tracking-normal">
                                            {currentItem.pattern}
                                        </h2>
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                speakExampleSentence(currentItem.pattern);
                                            }}
                                            className="w-10 h-10 rounded-2xl bg-sky-50 dark:bg-sky-950/60 border-2 border-b-3 border-sky-200 dark:border-sky-800 text-sky-600 dark:text-sky-400 flex items-center justify-center transition-all active:translate-y-0.5 cursor-pointer shadow-2xs shrink-0"
                                            title="Nghe phát âm"
                                        >
                                            <Volume2 className="w-5 h-5" />
                                        </button>
                                    </div>

                                    {currentItem.connection && (
                                        <div className="inline-block mt-3 px-4 py-2 bg-slate-100 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700 text-sm sm:text-base font-japanese font-bold text-sky-600 dark:text-sky-300">
                                            {currentItem.connection}
                                        </div>
                                    )}

                                    {currentItem.usageScope && (
                                        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium max-w-lg mx-auto leading-relaxed pt-2">
                                            {currentItem.usageScope}
                                        </p>
                                    )}
                                </div>
                            ) : (
                                /* BACK SIDE: Meaning, Notes, Examples */
                                <div className="my-auto py-4 space-y-4 text-left">
                                    <div className="space-y-1">
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                                            Ý NGHĨA
                                        </span>
                                        <p className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400">
                                            {currentItem.meaning}
                                        </p>
                                    </div>

                                    {currentItem.notes && (
                                        <div className="p-3.5 bg-amber-500/10 dark:bg-amber-950/20 rounded-2xl border border-amber-500/30 text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300 leading-relaxed">
                                            <span className="font-bold text-amber-600 dark:text-amber-400 mr-1.5">💡 Chú ý:</span>
                                            {currentItem.notes}
                                        </div>
                                    )}

                                    {currentItem.examples && currentItem.examples.length > 0 && (
                                        <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                                                VÍ DỤ TIÊU BIỂU
                                            </span>
                                            <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar pr-1">
                                                {currentItem.examples.map((ex, exIdx) => (
                                                    <div key={exIdx} className="p-2.5 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-200 dark:border-slate-800 space-y-0.5">
                                                        <div className="flex items-center justify-between gap-2">
                                                            <p className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-100 font-japanese">
                                                                {ex.ja}
                                                            </p>
                                                            <button
                                                                type="button"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    speakExampleSentence(ex.ja);
                                                                }}
                                                                className="p-1 text-slate-400 hover:text-sky-500 transition-colors shrink-0 cursor-pointer"
                                                            >
                                                                <Volume2 className="w-3.5 h-3.5" />
                                                            </button>
                                                        </div>
                                                        <p className="text-xs text-slate-500 dark:text-slate-400">
                                                            {ex.vi}
                                                        </p>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Card Footer Indicator */}
                            <div className="flex items-center justify-center text-xs text-slate-400 gap-1 pt-2">
                                <Eye className="w-3.5 h-3.5" />
                                <span>{isFlipped ? 'Nhấn để xem mặt trước' : 'Nhấn để xem giải thích & ví dụ'}</span>
                            </div>
                        </div>

                        {/* Rating & Navigation Control Buttons */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            <button
                                type="button"
                                onClick={handlePrev}
                                disabled={currentIndex === 0}
                                className="py-3 rounded-2xl bg-white dark:bg-slate-800 border-2 border-b-4 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-black text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-all cursor-pointer active:translate-y-0.5 active:border-b-2 disabled:opacity-40 select-none"
                            >
                                <ChevronLeft className="w-4 h-4" />
                                <span>Câu trước</span>
                            </button>

                            <button
                                type="button"
                                onClick={() => handleScore(false)}
                                className="py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 border-2 border-b-4 border-amber-700 text-white font-black text-xs sm:text-sm shadow-xs transition-all cursor-pointer active:translate-y-0.5 active:border-b-2 select-none"
                            >
                                <span>Chưa nhớ (1)</span>
                            </button>

                            <button
                                type="button"
                                onClick={() => handleScore(true)}
                                className="py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 border-2 border-b-4 border-emerald-700 text-white font-black text-xs sm:text-sm shadow-xs transition-all cursor-pointer active:translate-y-0.5 active:border-b-2 select-none"
                            >
                                <span>Đã nhớ (2)</span>
                            </button>

                            <button
                                type="button"
                                onClick={handleNext}
                                className="py-3 rounded-2xl bg-white dark:bg-slate-800 border-2 border-b-4 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-black text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-all cursor-pointer active:translate-y-0.5 active:border-b-2 select-none"
                            >
                                <span>{currentIndex === items.length - 1 ? 'Hoàn thành' : 'Tiếp theo'}</span>
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default GrammarNotebookStudyScreen;

