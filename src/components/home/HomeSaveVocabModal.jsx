import React, { useState, useMemo } from 'react';
import { X, Folder, BookOpen, ChevronRight, Check, ArrowLeft, Loader2, Sparkles, BookPlus } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { showToast } from '../../utils/toast';
import { ensureFuriganaFormat } from '../../utils/furiganaHelper';
import { sortStudySetsOldToNew } from '../../utils/studySetSorter';

const getCleanWord = (text) => {
    if (!text) return '';
    return String(text).split('（')[0].split('(')[0].trim().toLowerCase();
};

const HomeSaveVocabModal = ({
    isOpen,
    onClose,
    targetEntry = null,
    isAiAction = false,
    folders = [],
    parentFolders = [],
    allCards = [],
    onSaveCard,
    onGeminiAssist,
    canUserUseAI = true,
    onSuccess
}) => {
    const { t } = useLanguage();
    const [selectedModalFolderId, setSelectedModalFolderId] = useState(null);
    const [selectedFolderId, setSelectedFolderId] = useState(null);
    const [folderSearchQuery, setFolderSearchQuery] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    // Filtered study sets and parent folders
    const resolvedParentFolders = useMemo(() => parentFolders || [], [parentFolders]);
    const resolvedStudySets = useMemo(() => sortStudySetsOldToNew(folders || []), [folders]);

    const targetWordClean = useMemo(() => {
        if (!targetEntry) return '';
        return getCleanWord(targetEntry.w || targetEntry.r);
    }, [targetEntry]);

    // Sets without parent folder
    const rootStudySets = useMemo(() => {
        return resolvedStudySets.filter(s => !s.parentId);
    }, [resolvedStudySets]);

    // Sets inside currently selected parent folder
    const currentFolderSets = useMemo(() => {
        if (!selectedModalFolderId) return [];
        return resolvedStudySets.filter(s => s.parentId === selectedModalFolderId);
    }, [resolvedStudySets, selectedModalFolderId]);

    // Search results across all study sets
    const searchedSets = useMemo(() => {
        const q = folderSearchQuery.trim().toLowerCase();
        if (!q) return [];
        return resolvedStudySets.filter(s => {
            const title = (s.name || s.title || '').toLowerCase();
            return title.includes(q);
        });
    }, [resolvedStudySets, folderSearchQuery]);

    if (!isOpen || !targetEntry) return null;

    const handleConfirmSave = async () => {
        if (!onSaveCard || !targetEntry) return;
        setIsSaving(true);

        const folderId = selectedFolderId || 'unfiled';
        const meaningsStr = targetEntry.m ? targetEntry.m.join('\n') : '';
        const rawFront = targetEntry.w || targetEntry.r;

        try {
            if (isAiAction && canUserUseAI && onGeminiAssist) {
                // Call Gemini Assist to create a rich card
                const wordToAssist = targetEntry.w || targetEntry.r;
                const posStr = targetEntry.p && targetEntry.p.length > 0 ? targetEntry.p[0] : '';
                const levelStr = targetEntry.j || '';

                const aiResult = await onGeminiAssist(
                    wordToAssist,
                    posStr,
                    levelStr,
                    meaningsStr,
                    'ja'
                );

                const aiRawFront = aiResult?.frontWithFurigana || aiResult?.front || rawFront;
                const reading = aiResult?.reading || targetEntry.r || '';
                const front = await ensureFuriganaFormat(aiRawFront, reading);

                const back = aiResult?.meaning || aiResult?.back || (targetEntry.m ? targetEntry.m.slice(0, 2).join('; ') : '');
                const example = aiResult?.example || targetEntry.ex?.ja || '';
                const exampleMeaning = aiResult?.exampleMeaning || targetEntry.translatedVi || targetEntry.ex?.vi || targetEntry.ex?.en || '';
                const sinoVietnamese = aiResult?.sinoVietnamese || targetEntry.hv || '';
                const synonym = aiResult?.synonym || (targetEntry.ant ? `${targetEntry.ant.w}${targetEntry.ant.r ? ` (${targetEntry.ant.r})` : ''}` : '');
                const pos = aiResult?.pos || (targetEntry.p ? targetEntry.p.join(' ') : '');
                const level = aiResult?.level || targetEntry.j || '';
                const accent = aiResult?.accent !== undefined && aiResult?.accent !== '' ? String(aiResult.accent) : (targetEntry.pi && targetEntry.pi.length > 0 ? String(targetEntry.pi[0]) : '0');

                const cardData = {
                    front,
                    back,
                    reading,
                    sinoVietnamese,
                    example,
                    exampleMeaning,
                    synonym,
                    pos,
                    level,
                    accent,
                    folderId,
                    action: 'stay'
                };

                await onSaveCard(cardData);
            } else {
                // Standard quick save
                const front = await ensureFuriganaFormat(rawFront, targetEntry.r || '');
                const cardData = {
                    front,
                    back: meaningsStr,
                    reading: targetEntry.r || '',
                    sinoVietnamese: targetEntry.hv || '',
                    example: targetEntry.ex?.ja || '',
                    exampleMeaning: targetEntry.translatedVi || targetEntry.ex?.vi || targetEntry.ex?.en || '',
                    synonym: targetEntry.ant ? `${targetEntry.ant.w}${targetEntry.ant.r ? ` (${targetEntry.ant.r})` : ''}` : '',
                    pos: targetEntry.p ? targetEntry.p.join(' ') : '',
                    level: targetEntry.j || '',
                    accent: targetEntry.pi && targetEntry.pi.length > 0 ? String(targetEntry.pi[0]) : '0',
                    folderId,
                    action: 'stay'
                };

                await onSaveCard(cardData);
            }

            const targetFolder = (folders || []).find(f => f.id === folderId);
            const folderName = targetFolder ? (targetFolder.name || targetFolder.title) : (folderId === 'unfiled' ? 'Chưa phân loại' : 'học phần');
            showToast(`Đã lưu "${targetEntry.w || targetEntry.r}" vào ${folderName}!`, 'success');

            if (onSuccess) onSuccess(targetEntry);
            onClose();
        } catch (err) {
            console.error('Save card error:', err);
            showToast(`Lỗi lưu thẻ: ${err.message}`, 'error');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in font-sans">
            <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-lg shadow-2xl border-2 border-b-6 border-slate-200 dark:border-slate-800 p-6 relative max-h-[90vh] flex flex-col">
                {/* Close Button */}
                <button
                    type="button"
                    onClick={onClose}
                    className="absolute right-4 top-4 w-9 h-9 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 rounded-xl transition-all flex items-center justify-center cursor-pointer active:scale-95"
                >
                    <X className="w-4 h-4" />
                </button>

                {/* Header */}
                <div className="pr-10 mb-4">
                    <div className="flex items-center gap-2">
                        <span className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
                            {isAiAction ? <Sparkles className="w-5 h-5" /> : <BookPlus className="w-5 h-5" />}
                        </span>
                        <div>
                            <h3 className="text-lg font-black text-slate-900 dark:text-white">
                                {isAiAction ? 'Tạo thẻ với AI & Lưu' : 'Lưu từ vựng vào học phần'}
                            </h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold">
                                Chọn học phần để lưu từ: <span className="font-black text-emerald-600 dark:text-emerald-400">{targetEntry.w || targetEntry.r}</span>
                                {targetEntry.hv && <span className="text-slate-400 ml-1">({targetEntry.hv})</span>}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Search Bar for Folders */}
                <div className="mb-4">
                    <input
                        type="text"
                        value={folderSearchQuery}
                        onChange={(e) => setFolderSearchQuery(e.target.value)}
                        placeholder="Tìm kiếm học phần hoặc thư mục..."
                        className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border-2 border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-white placeholder:text-slate-400 outline-none focus:border-emerald-500 transition-all"
                    />
                </div>

                {/* Breadcrumb if inside folder */}
                {selectedModalFolderId && !folderSearchQuery.trim() && (
                    <button
                        type="button"
                        onClick={() => setSelectedModalFolderId(null)}
                        className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline mb-3 cursor-pointer"
                    >
                        <ArrowLeft className="w-3.5 h-3.5" />
                        <span>Quay lại danh sách thư mục</span>
                    </button>
                )}

                {/* Folder / Study Set List (Scrollable) */}
                <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 min-h-[180px] max-h-[300px] custom-scrollbar">
                    {/* Default Option: Chưa phân loại (Unfiled) */}
                    <button
                        type="button"
                        onClick={() => setSelectedFolderId('unfiled')}
                        className={`w-full text-left p-3 rounded-2xl border-2 border-b-4 transition-all flex items-center justify-between gap-3 cursor-pointer active:translate-y-0.5 active:border-b-2 ${
                            selectedFolderId === 'unfiled'
                                ? 'border-emerald-500 bg-emerald-50/80 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-100 shadow-xs'
                                : 'border-slate-200/80 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-700 dark:text-slate-300'
                        }`}
                    >
                        <div className="flex items-center gap-3">
                            <span className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                                🗂️
                            </span>
                            <div>
                                <div className="text-xs sm:text-sm font-black text-slate-900 dark:text-white">
                                    Chưa phân loại (Unfiled)
                                </div>
                                <div className="text-[10px] text-slate-400 font-bold">
                                    Thêm vào danh sách từ vựng tự do
                                </div>
                            </div>
                        </div>
                        {selectedFolderId === 'unfiled' && (
                            <Check className="w-4 h-4 text-emerald-600 stroke-[3px] shrink-0" />
                        )}
                    </button>

                    {/* SEARCH RESULTS MODE */}
                    {folderSearchQuery.trim() ? (
                        searchedSets.length === 0 ? (
                            <p className="text-xs text-slate-400 italic text-center py-4">Không tìm thấy học phần nào khớp với từ khóa</p>
                        ) : (
                            searchedSets.map(set => {
                                const cardCount = (allCards || []).filter(c => c.folderId === set.id).length;
                                const isSelected = selectedFolderId === set.id;
                                return (
                                    <button
                                        key={set.id}
                                        type="button"
                                        onClick={() => setSelectedFolderId(set.id)}
                                        className={`w-full text-left p-3 rounded-2xl border-2 border-b-4 transition-all flex items-center justify-between gap-3 cursor-pointer active:translate-y-0.5 active:border-b-2 ${
                                            isSelected
                                                ? 'border-emerald-500 bg-emerald-50/80 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-100 shadow-xs'
                                                : 'border-slate-200/80 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-700 dark:text-slate-300'
                                        }`}
                                    >
                                        <div className="flex items-center gap-3 min-w-0">
                                            <span className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600">
                                                <BookOpen className="w-4 h-4" />
                                            </span>
                                            <div className="min-w-0">
                                                <div className="text-xs sm:text-sm font-black text-slate-900 dark:text-white truncate">
                                                    {set.name || set.title || 'Học phần'}
                                                </div>
                                                <div className="text-[10px] text-slate-400 font-bold">
                                                    {cardCount} từ
                                                </div>
                                            </div>
                                        </div>
                                        {isSelected && (
                                            <Check className="w-4 h-4 text-emerald-600 stroke-[3px] shrink-0" />
                                        )}
                                    </button>
                                );
                            })
                        )
                    ) : selectedModalFolderId ? (
                        /* INSIDE A FOLDER MODE */
                        currentFolderSets.length === 0 ? (
                            <p className="text-xs text-slate-400 italic text-center py-4">Thư mục này chưa có học phần nào</p>
                        ) : (
                            currentFolderSets.map(set => {
                                const cardCount = (allCards || []).filter(c => c.folderId === set.id).length;
                                const isSelected = selectedFolderId === set.id;
                                return (
                                    <button
                                        key={set.id}
                                        type="button"
                                        onClick={() => setSelectedFolderId(set.id)}
                                        className={`w-full text-left p-3 rounded-2xl border-2 border-b-4 transition-all flex items-center justify-between gap-3 cursor-pointer active:translate-y-0.5 active:border-b-2 ${
                                            isSelected
                                                ? 'border-emerald-500 bg-emerald-50/80 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-100 shadow-xs'
                                                : 'border-slate-200/80 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-700 dark:text-slate-300'
                                        }`}
                                    >
                                        <div className="flex items-center gap-3 min-w-0">
                                            <span className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600">
                                                <BookOpen className="w-4 h-4" />
                                            </span>
                                            <div className="min-w-0">
                                                <div className="text-xs sm:text-sm font-black text-slate-900 dark:text-white truncate">
                                                    {set.name || set.title || 'Học phần'}
                                                </div>
                                                <div className="text-[10px] text-slate-400 font-bold">
                                                    {cardCount} từ
                                                </div>
                                            </div>
                                        </div>
                                        {isSelected && (
                                            <Check className="w-4 h-4 text-emerald-600 stroke-[3px] shrink-0" />
                                        )}
                                    </button>
                                );
                            })
                        )
                    ) : (
                        /* ROOT LEVEL: FOLDERS & ROOT SETS */
                        <>
                            {resolvedParentFolders.map(folder => {
                                const setsInFolder = resolvedStudySets.filter(s => s.parentId === folder.id);
                                return (
                                    <button
                                        key={folder.id}
                                        type="button"
                                        onClick={() => setSelectedModalFolderId(folder.id)}
                                        className="w-full text-left p-3 rounded-2xl border-2 border-b-4 border-slate-200/80 dark:border-slate-800 hover:border-emerald-400 hover:bg-emerald-50/20 dark:hover:bg-slate-800/60 transition-all flex items-center justify-between gap-3 cursor-pointer group active:translate-y-0.5 active:border-b-2"
                                    >
                                        <div className="flex items-center gap-3 min-w-0">
                                            <span className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-500 border border-amber-200 dark:border-amber-900/40">
                                                <Folder className="w-4 h-4" />
                                            </span>
                                            <div className="min-w-0">
                                                <div className="text-xs sm:text-sm font-black text-slate-900 dark:text-white truncate group-hover:text-emerald-600">
                                                    {folder.name || folder.title || 'Thư mục'}
                                                </div>
                                                <div className="text-[10px] text-slate-400 font-bold">
                                                    {setsInFolder.length} học phần bên trong
                                                </div>
                                            </div>
                                        </div>
                                        <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 transition-transform group-hover:translate-x-0.5" />
                                    </button>
                                );
                            })}

                            {rootStudySets.map(set => {
                                const cardCount = (allCards || []).filter(c => c.folderId === set.id).length;
                                const isSelected = selectedFolderId === set.id;
                                return (
                                    <button
                                        key={set.id}
                                        type="button"
                                        onClick={() => setSelectedFolderId(set.id)}
                                        className={`w-full text-left p-3 rounded-2xl border-2 border-b-4 transition-all flex items-center justify-between gap-3 cursor-pointer active:translate-y-0.5 active:border-b-2 ${
                                            isSelected
                                                ? 'border-emerald-500 bg-emerald-50/80 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-100 shadow-xs'
                                                : 'border-slate-200/80 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-700 dark:text-slate-300'
                                        }`}
                                    >
                                        <div className="flex items-center gap-3 min-w-0">
                                            <span className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600">
                                                <BookOpen className="w-4 h-4" />
                                            </span>
                                            <div className="min-w-0">
                                                <div className="text-xs sm:text-sm font-black text-slate-900 dark:text-white truncate">
                                                    {set.name || set.title || 'Học phần'}
                                                </div>
                                                <div className="text-[10px] text-slate-400 font-bold">
                                                    {cardCount} từ
                                                </div>
                                            </div>
                                        </div>
                                        {isSelected && (
                                            <Check className="w-4 h-4 text-emerald-600 stroke-[3px] shrink-0" />
                                        )}
                                    </button>
                                );
                            })}
                        </>
                    )}
                </div>

                {/* Footer Buttons */}
                <div className="mt-5 pt-4 border-t-2 border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isSaving}
                        className="px-4 py-2.5 rounded-2xl font-black text-xs text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
                    >
                        Hủy
                    </button>
                    <button
                        type="button"
                        onClick={handleConfirmSave}
                        disabled={isSaving || !selectedFolderId}
                        className="px-6 py-2.5 rounded-2xl font-black text-xs uppercase tracking-wider text-white bg-emerald-500 hover:bg-emerald-400 border-2 border-emerald-600 border-b-4 active:border-b-2 active:translate-y-0.5 disabled:opacity-50 transition-all cursor-pointer flex items-center gap-2 shadow-sm"
                    >
                        {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                        <span>{isAiAction ? 'Tạo AI & Lưu' : 'Xác nhận Lưu'}</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default HomeSaveVocabModal;
