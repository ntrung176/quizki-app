import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight, RotateCcw, Volume2, Edit, CheckCircle, Heart, Layers, Eye, Edit3, Plus } from 'lucide-react';
import { getAuth } from 'firebase/auth';
import { TopTabBar } from '../ui';
import { GRAMMAR_TABS } from '../../config/tabs';
import { getGrammarNotebookById, getCachedGrammarNotebooks, findNotebookInAnyLocalStorage, saveGrammarNotebook, toggleNotebookItemSrs, saveAllNotebookItemsToSrs } from '../../utils/grammarNotebookService';
import { subscribeGrammarSrs, getCachedUserGrammarSrsData } from '../../utils/grammarService';
import { speakExampleSentence } from '../../utils/audio';
import { showToast } from '../../utils/toast';
import FuriganaText from '../ui/FuriganaText';

export const GrammarNotebookStudyScreen = () => {
    const navigate = useNavigate();
    const { notebookId } = useParams();
    const auth = getAuth();
    const [userId, setUserId] = useState(() => auth?.currentUser?.uid || null);

    // Sync auth state on mount / reload
    useEffect(() => {
        const unsub = auth.onAuthStateChanged(user => {
            if (user?.uid && user.uid !== userId) {
                setUserId(user.uid);
            }
        });
        return () => unsub?.();
    }, [userId]);

    const [notebook, setNotebook] = useState(() => {
        const cached = getCachedGrammarNotebooks(userId);
        return cached.find(nb => nb && nb.id === notebookId) || findNotebookInAnyLocalStorage(notebookId) || null;
    });
    const [loading, setLoading] = useState(() => !notebook);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isFlipped, setIsFlipped] = useState(false);
    const [isFinished, setIsFinished] = useState(false);
    const [srsMap, setSrsMap] = useState(() => (userId ? getCachedUserGrammarSrsData() || {} : {}));
    const [savingSrs, setSavingSrs] = useState(false);
    const [showRenameModal, setShowRenameModal] = useState(false);
    const [renameTitle, setRenameTitle] = useState('');

    useEffect(() => {
        let isMounted = true;
        const load = async () => {
            const localFound = notebook || findNotebookInAnyLocalStorage(notebookId);
            if (localFound && !notebook) {
                setNotebook(localFound);
                setLoading(false);
            }

            try {
                const data = await getGrammarNotebookById(userId, notebookId);
                if (!isMounted) return;

                if (data && data.items && data.items.length > 0) {
                    setNotebook(data);
                } else if (data) {
                    showToast('Sổ tay này chưa có mẫu ngữ pháp nào. Vui lòng thêm mẫu trước.', 'info');
                    navigate(`/grammar/notebook/${notebookId}/edit`);
                } else if (!localFound) {
                    showToast('Không tìm thấy sổ tay', 'error');
                    navigate('/grammar/notebook');
                }
            } catch (e) {
                console.warn('Error loading study notebook:', e);
            } finally {
                if (isMounted) setLoading(false);
            }
        };

        load();
        return () => { isMounted = false; };
    }, [notebookId, userId, navigate]);

    // Real-time SRS subscription for instant Heart button updates
    useEffect(() => {
        if (!userId) return;
        const unsub = subscribeGrammarSrs(userId, (freshSrs) => {
            if (freshSrs) setSrsMap(freshSrs);
        });
        return () => unsub?.();
    }, [userId]);

    const items = notebook?.items || [];
    const currentItem = items[currentIndex];
    const isCurrentItemBookmarked = Boolean(currentItem && srsMap[currentItem.id]);
    const isAllBookmarked = items.length > 0 && items.every(it => Boolean(srsMap[it.id]));

    // Keyboard navigation: Space (Flip), Left (Prev), Right (Next)
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

    const handleRestart = () => {
        setCurrentIndex(0);
        setIsFlipped(false);
        setIsFinished(false);
    };

    // Toggle single card SRS
    const handleToggleSrs = async () => {
        if (!userId) {
            showToast('Vui lòng đăng nhập để lưu ngữ pháp vào SRS.', 'warning');
            return;
        }
        if (!currentItem) return;

        setSavingSrs(true);
        try {
            const nextState = await toggleNotebookItemSrs(userId, currentItem, notebook?.title, isCurrentItemBookmarked, srsMap[currentItem.id]);
            showToast(
                nextState
                    ? `Đã thêm "${currentItem.pattern}" vào ôn tập SRS`
                    : `Đã xóa "${currentItem.pattern}" khỏi ôn tập SRS`,
                nextState ? 'success' : 'info'
            );
        } catch (e) {
            console.error('Error toggling SRS for item:', e);
            showToast('Lỗi khi cập nhật SRS', 'error');
        } finally {
            setSavingSrs(false);
        }
    };

    // Save all cards in notebook to SRS
    const handleSaveAllToSrs = async () => {
        if (!userId) {
            showToast('Vui lòng đăng nhập để lưu vào SRS.', 'warning');
            return;
        }
        if (items.length === 0) return;

        setSavingSrs(true);
        try {
            const result = await saveAllNotebookItemsToSrs(userId, items, notebook?.title, srsMap);
            const total = typeof result === 'object' ? result.total : result;
            const newlyAdded = typeof result === 'object' ? result.newlyAdded : 0;
            if (newlyAdded > 0) {
                showToast(`Đã thêm ${newlyAdded} mẫu mới vào ôn tập SRS (giữ nguyên chu kỳ các mẫu đã học)!`, 'success');
            } else {
                showToast(`Đã cập nhật toàn bộ ${total} mẫu vào ôn tập SRS (chu kỳ ôn tập được bảo toàn)!`, 'success');
            }
        } catch (e) {
            console.error('Error saving all items to SRS:', e);
            showToast('Lỗi khi lưu vào SRS', 'error');
        } finally {
            setSavingSrs(false);
        }
    };

    // Rename notebook directly from study screen
    const handleRenameNotebook = async () => {
        if (!renameTitle.trim() || !notebook) return;
        try {
            const updated = await saveGrammarNotebook(userId, {
                ...notebook,
                title: renameTitle.trim()
            });
            setNotebook(updated);
            showToast('Đã đổi tên sổ tay thành công!', 'success');
            setShowRenameModal(false);
        } catch (e) {
            console.error('Error renaming notebook:', e);
            showToast('Lỗi khi đổi tên sổ tay', 'error');
        }
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
                <div className="flex items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3 flex-wrap">
                    <button
                        type="button"
                        onClick={() => navigate('/grammar/notebook')}
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-sky-600 dark:text-slate-400 dark:hover:text-sky-400 transition-colors cursor-pointer"
                    >
                        <ChevronLeft className="w-4 h-4" />
                        <span className="hidden sm:inline">Sổ tay ngữ pháp</span>
                    </button>

                    <div className="flex items-center gap-2">
                        <span className="text-xs sm:text-sm font-black text-slate-700 dark:text-slate-300 truncate max-w-[150px] sm:max-w-xs">
                            {notebook.title}
                        </span>
                        <button
                            type="button"
                            onClick={() => {
                                setRenameTitle(notebook.title);
                                setShowRenameModal(true);
                            }}
                            className="p-1 rounded-lg text-slate-400 hover:text-sky-500 hover:bg-sky-50 dark:hover:bg-sky-950/40 transition-colors cursor-pointer"
                            title="Đổi tên sổ tay"
                        >
                            <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <span className="text-xs font-black text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/60 border border-sky-200 dark:border-sky-800 px-2.5 py-0.5 rounded-lg">
                            {currentIndex + 1} / {items.length}
                        </span>
                    </div>

                    <div className="flex items-center gap-2">
                        {/* Kanji & Grammar-style SRS Bookmark Button */}
                        <button
                            type="button"
                            onClick={handleToggleSrs}
                            disabled={savingSrs}
                            className={`py-2 px-3.5 sm:px-4 rounded-full font-black text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs select-none active:translate-y-0.5 active:border-b-2 ${
                                isCurrentItemBookmarked
                                    ? 'bg-rose-500 border-b-4 border-rose-700 text-white shadow-sm uppercase tracking-wider'
                                    : 'bg-white hover:bg-slate-50 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 border-2 border-b-4 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                            }`}
                            title={isCurrentItemBookmarked ? "Bỏ lưu mẫu này khỏi ôn tập SRS" : "Lưu mẫu này vào ôn tập SRS"}
                        >
                            <Heart className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${isCurrentItemBookmarked ? 'fill-white text-white' : 'text-slate-600 dark:text-slate-300 stroke-[2.2]'}`} />
                            <span>{isCurrentItemBookmarked ? 'ĐÃ LƯU' : 'Lưu ôn tập'}</span>
                        </button>

                        {/* Save all items in notebook to SRS */}
                        {items.length > 1 && (
                            <button
                                type="button"
                                onClick={handleSaveAllToSrs}
                                disabled={savingSrs}
                                className={`py-2 px-3 rounded-full font-black text-xs transition-all flex items-center justify-center gap-1 cursor-pointer select-none active:translate-y-0.5 active:border-b-2 ${
                                    isAllBookmarked
                                        ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                                        : 'bg-slate-100 hover:bg-slate-200 text-slate-600 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                                }`}
                                title="Lưu toàn bộ mẫu trong sổ vào danh sách ôn tập SRS"
                            >
                                <Layers className="w-3.5 h-3.5" />
                                <span className="hidden md:inline">{isAllBookmarked ? 'Đã lưu cả sổ' : `Lưu cả sổ (${items.length})`}</span>
                            </button>
                        )}

                        {/* Quick Add Pattern button */}
                        <button
                            type="button"
                            onClick={() => navigate(`/grammar/notebook/${notebook.id}/edit?action=add&scrollToBottom=true`)}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border-2 border-b-3 border-slate-200 dark:border-slate-700 text-sky-600 dark:text-sky-400 hover:border-sky-300 font-black text-xs transition-all cursor-pointer active:translate-y-0.5 select-none"
                            title="Thêm nhanh mẫu ngữ pháp vào sổ tay"
                        >
                            <Plus className="w-3.5 h-3.5 text-sky-500 stroke-[2.5]" />
                            <span className="hidden sm:inline">Thêm mẫu</span>
                        </button>

                        <button
                            type="button"
                            onClick={() => navigate(`/grammar/notebook/${notebook.id}/edit?scrollToBottom=true`)}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border-2 border-b-3 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-sky-300 font-black text-xs transition-all cursor-pointer active:translate-y-0.5 select-none"
                            title="Sửa sổ tay"
                        >
                            <Edit className="w-3.5 h-3.5 text-sky-500" />
                            <span className="hidden sm:inline">Sửa</span>
                        </button>
                    </div>
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
                                Bạn đã xem hết {items.length} mẫu ngữ pháp trong sổ tay <strong>{notebook.title}</strong>.
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
                    /* Study Flashcard with 3D Flip */
                    <div className="space-y-6">
                        <div className="perspective-1000 w-full select-none cursor-pointer">
                            <div
                                onClick={() => setIsFlipped(prev => !prev)}
                                className={`relative w-full h-[420px] sm:h-[450px] transition-transform duration-500 transform-style-preserve-3d ${
                                    isFlipped ? 'rotate-y-180' : ''
                                }`}
                            >
                                {/* FRONT SIDE: Huge pattern, clean connection formula, flip hint */}
                                <div
                                    className="absolute inset-0 backface-hidden bg-white/95 dark:bg-slate-900/95 backdrop-blur-xs border-2 border-b-4 border-slate-200 dark:border-slate-800 rounded-3xl p-4 sm:p-6 md:p-10 flex flex-col justify-between shadow-sm hover:border-sky-300 dark:hover:border-sky-700 transition-colors overflow-hidden w-full max-w-full"
                                    style={{ WebkitBackfaceVisibility: 'hidden', backfaceVisibility: 'hidden' }}
                                >
                                    <div className="flex items-center justify-between">
                                        <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-xl">
                                            Mặt trước (Mẫu câu)
                                        </span>
                                        <span className="text-xs text-slate-400 font-medium">
                                            Nhấn để lật thẻ (Space)
                                        </span>
                                    </div>

                                    <div className="my-auto py-4 text-center space-y-4">
                                        <div className="flex items-center justify-center gap-3.5 flex-wrap">
                                            <h2 className="text-4xl sm:text-6xl font-black text-slate-900 dark:text-white font-japanese tracking-tight break-words">
                                                {currentItem.pattern}
                                            </h2>
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    speakExampleSentence(currentItem.pattern);
                                                }}
                                                className="w-11 h-11 rounded-2xl bg-sky-50 dark:bg-sky-950/60 border-2 border-b-4 border-sky-200 dark:border-sky-800 text-sky-600 dark:text-sky-400 flex items-center justify-center transition-all active:translate-y-0.5 active:border-b-2 cursor-pointer shadow-xs shrink-0"
                                                title="Nghe phát âm"
                                            >
                                                <Volume2 className="w-5 h-5" />
                                            </button>
                                        </div>

                                        {currentItem.connection && (
                                            <div className="flex justify-center pt-1">
                                                <div className="inline-flex items-center gap-2 px-4 py-2 bg-sky-50/80 dark:bg-sky-950/50 border border-sky-200 dark:border-sky-800/80 rounded-2xl text-sm sm:text-base font-japanese font-bold text-sky-700 dark:text-sky-300 shadow-2xs max-w-full text-center break-words">
                                                    <span>{currentItem.connection}</span>
                                                </div>
                                            </div>
                                        )}

                                        <p className="text-xs text-slate-400 dark:text-slate-500 font-medium pt-2">
                                            Bấm vào thẻ hoặc nhấn Space để lật xem ý nghĩa & ví dụ
                                        </p>
                                    </div>

                                    <div className="flex items-center justify-center text-xs text-slate-400 gap-1.5 pt-2">
                                        <Eye className="w-4 h-4 text-sky-500" />
                                        <span>Nhấn để xem giải thích & ví dụ</span>
                                    </div>
                                </div>

                                {/* BACK SIDE: Meaning, Scope, Notes, Examples with Furigana */}
                                <div
                                    className="absolute inset-0 backface-hidden rotate-y-180 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xs border-2 border-b-4 border-slate-200 dark:border-slate-800 rounded-3xl p-4 sm:p-6 md:p-10 flex flex-col justify-between shadow-sm hover:border-sky-300 dark:hover:border-sky-700 transition-colors overflow-hidden w-full max-w-full"
                                    style={{ WebkitBackfaceVisibility: 'hidden', backfaceVisibility: 'hidden' }}
                                >
                                    <div className="flex items-center justify-between shrink-0">
                                        <span className="text-[11px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-3 py-1 rounded-xl border border-emerald-200 dark:border-emerald-800">
                                            Mặt sau (Ý nghĩa & Chi tiết)
                                        </span>
                                        <span className="text-xs text-slate-400 font-medium">
                                            Nhấn để lật lại (Space)
                                        </span>
                                    </div>

                                    <div
                                        className="flex-1 overflow-y-auto overflow-x-hidden w-full max-w-full min-w-0 custom-scrollbar my-2.5 sm:my-3 pr-1 space-y-3.5 text-left"
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        <div className="space-y-1">
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                                                Ý NGHĨA
                                            </span>
                                            <p className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 leading-snug break-words">
                                                {currentItem.meaning}
                                            </p>
                                        </div>

                                        {currentItem.usageScope && (
                                            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed break-words">
                                                <span className="font-bold text-slate-700 dark:text-slate-200 mr-1.5">Cách dùng:</span>
                                                {currentItem.usageScope}
                                            </div>
                                        )}

                                        {currentItem.notes && (
                                            <div className="p-3 bg-amber-500/10 dark:bg-amber-950/20 rounded-2xl border border-amber-500/30 text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300 leading-relaxed break-words">
                                                <span className="font-bold text-amber-600 dark:text-amber-400 mr-1.5">💡 Chú ý:</span>
                                                {currentItem.notes}
                                            </div>
                                        )}

                                        {currentItem.examples && currentItem.examples.length > 0 && (
                                            <div className="space-y-2 pt-1 border-t border-slate-100 dark:border-slate-800">
                                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                                                    VÍ DỤ TIÊU BIỂU
                                                </span>
                                                <div className="space-y-2">
                                                    {currentItem.examples.map((ex, exIdx) => {
                                                        const cleanJa = (ex.ja || '').replace(/<[^>]*>/g, '');
                                                        const cleanVi = (ex.vi || '').replace(/<[^>]*>/g, '');
                                                        return (
                                                            <div key={exIdx} className="p-3 bg-slate-50 dark:bg-slate-950/60 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-1 w-full max-w-full overflow-hidden">
                                                                <div className="flex items-start justify-between gap-2">
                                                                    <div className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-100 font-japanese leading-relaxed break-words min-w-0 flex-1">
                                                                        <FuriganaText text={cleanJa} />
                                                                    </div>
                                                                    <button
                                                                        type="button"
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            // Clean parenthesized furigana before TTS audio
                                                                            const audioJa = cleanJa.replace(/[\(（\[【][^\)）\]】]+[\)）\]】]/g, '').trim();
                                                                            speakExampleSentence(audioJa || cleanJa);
                                                                        }}
                                                                        className="p-1.5 rounded-xl bg-white dark:bg-slate-800 text-slate-400 hover:text-sky-500 border border-slate-200 dark:border-slate-700 transition-colors shrink-0 cursor-pointer shadow-2xs active:translate-y-0.5"
                                                                        title="Nghe câu ví dụ"
                                                                    >
                                                                        <Volume2 className="w-3.5 h-3.5" />
                                                                    </button>
                                                                </div>
                                                                {cleanVi && (
                                                                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed break-words">
                                                                        {cleanVi}
                                                                    </p>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex items-center justify-center text-xs text-slate-400 gap-1.5 pt-2 shrink-0">
                                        <RotateCcw className="w-3.5 h-3.5" />
                                        <span>Nhấn để xem lại mặt trước</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Navigation Control Buttons Only: Prev & Next */}
                        <div className="flex items-center justify-between gap-4 max-w-md mx-auto pt-2">
                            <button
                                type="button"
                                onClick={handlePrev}
                                disabled={currentIndex === 0}
                                className="flex-1 py-3 px-5 rounded-2xl bg-white dark:bg-slate-800 border-2 border-b-4 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-black text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer active:translate-y-0.5 active:border-b-2 disabled:opacity-30 disabled:cursor-not-allowed select-none shadow-xs hover:border-slate-300 dark:hover:border-slate-600"
                            >
                                <ChevronLeft className="w-4 h-4" />
                                <span>Thẻ trước</span>
                            </button>

                            <button
                                type="button"
                                onClick={handleNext}
                                className="flex-1 py-3 px-5 rounded-2xl bg-sky-500 hover:bg-sky-400 border-2 border-b-4 border-sky-700 text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer active:translate-y-0.5 active:border-b-2 select-none shadow-md"
                            >
                                <span>{currentIndex === items.length - 1 ? 'Hoàn thành' : 'Thẻ sau'}</span>
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Quick Rename Modal in Study Screen */}
            {showRenameModal && (
                <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
                    <div className="bg-white dark:bg-slate-900 border-2 border-b-4 border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
                        <h3 className="text-base font-black text-slate-900 dark:text-white">
                            Đổi tên sổ tay
                        </h3>
                        <input
                            type="text"
                            value={renameTitle}
                            onChange={(e) => setRenameTitle(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && renameTitle.trim()) {
                                    handleRenameNotebook();
                                }
                            }}
                            placeholder="Nhập tên mới..."
                            className="w-full text-sm font-bold px-4 py-3 bg-slate-50 dark:bg-slate-950 border-2 border-slate-200 dark:border-slate-800 rounded-2xl outline-none focus:border-sky-500 dark:text-white"
                            autoFocus
                        />
                        <div className="flex gap-2 justify-end pt-2">
                            <button
                                type="button"
                                onClick={() => setShowRenameModal(false)}
                                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                            >
                                Hủy
                            </button>
                            <button
                                type="button"
                                onClick={handleRenameNotebook}
                                disabled={!renameTitle.trim()}
                                className="px-5 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 border-b-2 border-sky-700 text-white text-xs font-black transition-all cursor-pointer disabled:opacity-50"
                            >
                                Lưu tên mới
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default GrammarNotebookStudyScreen;
