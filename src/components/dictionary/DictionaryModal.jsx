import React, { useState, useEffect, useRef, useTransition, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Search, X, Loader2, Folder, BookOpen, AlertTriangle, Check, ArrowLeft, ChevronRight, Wand2, Sparkles, BookPlus } from 'lucide-react';
import DictionaryEntryCard from './DictionaryEntryCard';
import { 
    isDictionaryReady, 
    isDictionaryUpToDate, 
    isDictionarySyncing, 
    syncDictionary, 
    onSyncProgress, 
    searchDictionary 
} from '../../services/dictionaryService';
import { showToast } from '../../utils/toast';
import { useLanguage } from '../../context/LanguageContext';
import { ensureFuriganaFormat } from '../../utils/furiganaHelper';
import { sortStudySetsOldToNew } from '../../utils/studySetSorter';

const getCleanWord = (text) => {
    if (!text) return '';
    return String(text).split('（')[0].split('(')[0].trim().toLowerCase();
};

const DictionaryModal = ({
    isOpen,
    onClose,
    initialWord = '',
    folders = [],
    parentFolders = [],
    studySets = [],
    allCards = [],
    onSaveCard,
    onGeminiAssist,
    canUserUseAI = true
}) => {
    const { t, language } = useLanguage();
    const [query, setQuery] = useState(initialWord || '');
    const [results, setResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [isReady, setIsReady] = useState(() => {
        return typeof window !== 'undefined' && (
            localStorage.getItem('quizki_dict_ready') === 'true' ||
            localStorage.getItem('quizki_dict_version') !== null
        );
    });
    const [installProgress, setInstallProgress] = useState(null);
    const [aiLoadingWord, setAiLoadingWord] = useState(null);
    const [savedWords, setSavedWords] = useState(new Set());

    // Save Target State for Folder/Set Picker Modal: { entry, isAiAction }
    const [saveTarget, setSaveTarget] = useState(null);
    // Navigation state: null = root level (showing folders first), string = inside a folder
    const [selectedModalFolderId, setSelectedModalFolderId] = useState(null);
    // Selected target study set ID to save into
    const [selectedFolderId, setSelectedFolderId] = useState(null);
    const [folderSearchQuery, setFolderSearchQuery] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    const inputRef = useRef(null);
    const debounceTimeoutRef = useRef(null);
    const [, startTransition] = useTransition();

    // Check if dictionary database is ready on mount / open & sync in background if needed
    useEffect(() => {
        if (!isOpen) return;

        // Listen for sync progress updates (both background and active)
        const unsubscribe = onSyncProgress((prog) => {
            setInstallProgress(prog);
            if (prog?.percent === 100) {
                setIsReady(true);
                setTimeout(() => setInstallProgress(null), 1500);
            }
        });

        isDictionaryReady().then((ready) => {
            setIsReady(ready);
            if (!ready) {
                // First-time download for a fresh browser
                syncDictionary().catch((err) => {
                    console.error('Failed to install dictionary:', err);
                    showToast(t('dictionary.downloadError', 'Lỗi tải dữ liệu từ điển: {error}').replace('{error}', err.message), 'error');
                });
            } else if (!isDictionaryUpToDate() && !isDictionarySyncing()) {
                // Has existing data: silently update in the background, NEVER blocking search
                syncDictionary({ silent: true }).catch(() => {});
            }
        });

        if (initialWord) {
            setQuery(initialWord);
        }

        setTimeout(() => {
            inputRef.current?.focus();
        }, 80);

        return () => {
            unsubscribe();
        };
    }, [isOpen, initialWord]);

    // Debounced search when query changes - NEVER BLOCKED by background sync
    useEffect(() => {
        if (!isOpen) return;

        if (debounceTimeoutRef.current) {
            clearTimeout(debounceTimeoutRef.current);
        }

        const trimmed = query.trim();
        if (!trimmed) {
            setResults([]);
            setIsSearching(false);
            return;
        }

        setIsSearching(true);
        debounceTimeoutRef.current = setTimeout(async () => {
            try {
                const searchRes = await searchDictionary(trimmed, 40);
                startTransition(() => {
                    setResults(searchRes || []);
                    setIsSearching(false);
                });
            } catch (err) {
                console.error('Search error:', err);
                setIsSearching(false);
            }
        }, 120);

        return () => {
            if (debounceTimeoutRef.current) {
                clearTimeout(debounceTimeoutRef.current);
            }
        };
    }, [query, isOpen]);

    // Execute saving card directly
    const executeSave = async (entry, folderId) => {
        if (!onSaveCard || !entry) return;
        const meaningsStr = entry.m ? entry.m.join('\n') : '';
        const rawFront = entry.w || entry.r;
        const front = await ensureFuriganaFormat(rawFront, entry.r || '');
        const cardData = {
            front,
            back: meaningsStr,
            reading: entry.r || '',
            sinoVietnamese: entry.hv || '',
            example: entry.ex?.ja || '',
            exampleMeaning: entry.translatedVi || entry.ex?.vi || entry.ex?.en || '',
            synonym: entry.ant ? `${entry.ant.w}${entry.ant.r ? ` (${entry.ant.r})` : ''}` : '',
            pos: entry.p ? entry.p.join(' ') : '',
            level: entry.j || '',
            accent: entry.pi && entry.pi.length > 0 ? String(entry.pi[0]) : '0',
            folderId: folderId || 'unfiled',
            action: 'stay'
        };

        try {
            await onSaveCard(cardData);
            setSavedWords(prev => new Set([...prev, entry.w || entry.r]));
            const targetFolder = (folders || []).find(f => f.id === folderId);
            const folderName = targetFolder ? (targetFolder.name || targetFolder.title) : (folderId === 'unfiled' ? t('dictionary.uncategorized', 'Chưa phân loại') : t('dictionary.defaultStudySet', 'học phần'));
            showToast(t('dictionary.savedToFolder', 'Đã lưu "{word}" vào {folder}!').replace('{word}', front.split('（')[0]).replace('{folder}', folderName), 'success');
        } catch (err) {
            console.error('Error saving quick card:', err);
            showToast(t('dictionary.saveCardError', 'Lỗi lưu thẻ: {error}').replace('{error}', err.message), 'error');
        }
    };

    // Execute saving card with AI enrichment (identical to selection lookup "quét rồi thêm")
    const executeAiSave = async (entry, folderId) => {
        if (!onSaveCard || !entry) return;
        if (!canUserUseAI || !onGeminiAssist) {
            executeSave(entry, folderId);
            return;
        }

        setAiLoadingWord(entry.w || entry.r);
        try {
            const wordToAssist = entry.w || entry.r;
            const posStr = entry.p && entry.p.length > 0 ? entry.p[0] : '';
            const levelStr = entry.j || '';
            const rawMeaning = entry.m ? entry.m.join('\n') : '';

            // Call onGeminiAssist exactly like VocabularySelectionLookup ("quét rồi thêm"):
            // (frontText, contextPos, contextLevel, contextMeaning, targetLanguage)
            const aiResult = await onGeminiAssist(
                wordToAssist,
                posStr,
                levelStr,
                rawMeaning,
                'ja'
            );

            // Ensure Furigana format like selection lookup
            const rawFront = aiResult?.frontWithFurigana || aiResult?.front || entry.w || entry.r;
            const reading = aiResult?.reading || entry.r || '';
            const front = await ensureFuriganaFormat(rawFront, reading);

            // Refined concise meaning from AI (distilled 1-8 words) or fallback
            const back = aiResult?.meaning || aiResult?.back || (entry.m ? entry.m.slice(0, 2).join('; ') : '');

            // Short everyday collocation example from AI (5-12 words)
            const example = aiResult?.example || entry.ex?.ja || '';
            const exampleMeaning = aiResult?.exampleMeaning || entry.translatedVi || entry.ex?.vi || entry.ex?.en || '';

            const sinoVietnamese = aiResult?.sinoVietnamese || entry.hv || '';
            const synonym = aiResult?.synonym || (entry.ant ? `${entry.ant.w}${entry.ant.r ? ` (${entry.ant.r})` : ''}` : '');
            const pos = aiResult?.pos || (entry.p ? entry.p.join(' ') : '');
            const level = aiResult?.level || entry.j || '';
            const accent = aiResult?.accent !== undefined && aiResult?.accent !== '' ? String(aiResult.accent) : (entry.pi && entry.pi.length > 0 ? String(entry.pi[0]) : '0');

            const cardToSave = {
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
                folderId: folderId || 'unfiled',
                action: 'stay'
            };

            await onSaveCard(cardToSave);
            setSavedWords(prev => new Set([...prev, entry.w || entry.r]));
            const targetFolder = (folders || []).find(f => f.id === folderId);
            const folderName = targetFolder ? (targetFolder.name || targetFolder.title) : (folderId === 'unfiled' ? t('dictionary.uncategorized', 'Chưa phân loại') : t('dictionary.defaultStudySet', 'học phần'));
            showToast(t('dictionary.aiSavedToFolder', 'Đã dùng AI tạo và lưu "{word}" vào {folder}!').replace('{word}', front.split('（')[0]).replace('{folder}', folderName), 'success');
        } catch (err) {
            console.error('AI Card creation error:', err);
            // Fallback to quick save if AI fails
            executeSave(entry, folderId);
        } finally {
            setAiLoadingWord(null);
        }
    };

    // When clicking "Lưu nhanh" -> Open folder/study set popup starting at Root level
    const handleQuickAddClick = (entry) => {
        setFolderSearchQuery('');
        setSelectedModalFolderId(null); // start by showing folders first!
        setSelectedFolderId(null);
        setSaveTarget({
            entry,
            isAiAction: false
        });
    };

    // When clicking "Tạo thẻ học với AI" -> Open folder/study set popup starting at Root level
    const handleAddWithAiClick = (entry) => {
        setFolderSearchQuery('');
        setSelectedModalFolderId(null); // start by showing folders first!
        setSelectedFolderId(null);
        setSaveTarget({
            entry,
            isAiAction: true
        });
    };

    // Confirm save inside the popup
    const handleConfirmSave = async () => {
        if (!saveTarget || isSaving || !selectedFolderId) return;
        setIsSaving(true);
        try {
            const { entry, isAiAction } = saveTarget;
            setSaveTarget(null);

            if (isAiAction) {
                await executeAiSave(entry, selectedFolderId);
            } else {
                await executeSave(entry, selectedFolderId);
            }
        } finally {
            setIsSaving(false);
        }
    };

    // Resolved list of parent folders (directories: type === 'folder')
    const resolvedParentFolders = useMemo(() => {
        const raw = (parentFolders && parentFolders.length > 0) ? parentFolders : (folders || []).filter(f => f.type === 'folder');
        return sortStudySetsOldToNew(raw);
    }, [parentFolders, folders]);

    // Resolved list of study sets (type !== 'folder')
    const resolvedStudySets = useMemo(() => {
        if (studySets && studySets.length > 0) return studySets;
        return (folders || []).filter(f => f.type !== 'folder');
    }, [studySets, folders]);

    // Active folder when navigated inside
    const activeFolder = useMemo(() => {
        if (!selectedModalFolderId) return null;
        return resolvedParentFolders.find(f => f.id === selectedModalFolderId) || (folders || []).find(f => f.id === selectedModalFolderId);
    }, [resolvedParentFolders, folders, selectedModalFolderId]);

    // Study sets inside the currently active folder (sorted cũ -> mới + numeric)
    const studySetsInActiveFolder = useMemo(() => {
        if (!selectedModalFolderId) return [];
        const sets = resolvedStudySets.filter(s => s.parentId === selectedModalFolderId);
        return sortStudySetsOldToNew(sets);
    }, [resolvedStudySets, selectedModalFolderId]);

    // Standalone study sets that don't belong to any parent folder (sorted cũ -> mới + numeric)
    const rootStudySets = useMemo(() => {
        const parentIdSet = new Set(resolvedParentFolders.map(p => p.id));
        const sets = resolvedStudySets.filter(s => !s.parentId || !parentIdSet.has(s.parentId));
        return sortStudySetsOldToNew(sets);
    }, [resolvedStudySets, resolvedParentFolders]);

    // Instant search results across all study sets (sorted cũ -> mới + numeric)
    const searchedStudySets = useMemo(() => {
        if (!folderSearchQuery.trim()) return [];
        const q = folderSearchQuery.toLowerCase().trim();
        const matched = resolvedStudySets.filter(item =>
            (item.name || item.title || '').toLowerCase().includes(q)
        );
        return sortStudySetsOldToNew(matched);
    }, [resolvedStudySets, folderSearchQuery]);

    // Target word clean representation for duplicate checking
    const targetWordClean = useMemo(() => {
        if (!saveTarget?.entry) return '';
        return getCleanWord(saveTarget.entry.w || saveTarget.entry.r);
    }, [saveTarget]);

    // Check duplicate in currently selected folder
    const isDuplicateInSelectedFolder = useMemo(() => {
        if (!targetWordClean || !selectedFolderId) return false;
        return (allCards || []).some(c => {
            const cardFolder = c.folderId || 'unfiled';
            if (cardFolder !== selectedFolderId) return false;
            const fClean = getCleanWord(c.front);
            const rClean = getCleanWord(c.reading);
            return fClean === targetWordClean || (rClean && rClean === targetWordClean);
        });
    }, [targetWordClean, selectedFolderId, allCards]);

    // Name of currently selected folder
    const selectedFolderName = useMemo(() => {
        if (!selectedFolderId) return '';
        if (selectedFolderId === 'unfiled') return t('dictionary.uncategorized', 'Chưa phân loại');
        const found = resolvedStudySets.find(f => f.id === selectedFolderId) || (folders || []).find(f => f.id === selectedFolderId);
        return found ? (found.name || found.title || t('dictionary.defaultStudySet', 'Học phần')) : t('dictionary.uncategorized', 'Chưa phân loại');
    }, [resolvedStudySets, folders, selectedFolderId]);

    // Helper to get parent folder name
    const getParentFolderName = (pId) => {
        if (!pId) return '';
        const p = resolvedParentFolders.find(f => f.id === pId) || (folders || []).find(f => f.id === pId);
        return p ? (p.name || p.title) : '';
    };

    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-sm animate-fade-in">
            {/* Modal Container */}
            <div
                className="bg-white dark:bg-slate-950 border-2 border-b-8 border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden relative"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header: Title & Close Button */}
                <div className="p-4 sm:p-5 border-b-2 border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3 bg-white dark:bg-slate-900">
                    <div className="min-w-0">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border-2 border-b-4 border-emerald-200 dark:border-emerald-800 flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-black shrink-0">
                                <BookOpen className="w-5 h-5 stroke-[2.5px]" />
                            </div>
                            <div className="min-w-0">
                                <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white leading-tight">
                                    {t('dictionary.title', 'Từ điển tiếng Nhật')}
                                </h2>
                                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                                    {t('dictionary.subtitle', '266.000+ từ vựng • Cấp độ JLPT • Trọng âm Pitch Accent')}
                                </p>
                            </div>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        className="p-2 rounded-2xl border-2 border-b-4 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 active:translate-y-0.5 active:border-b-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-all cursor-pointer shrink-0"
                        title={t('common.close', 'Đóng') + ' (ESC)'}
                    >
                        <X className="w-5 h-5 stroke-[2.5px]" />
                    </button>
                </div>

                {/* Search Bar Input */}
                <div className="p-4 bg-white dark:bg-slate-900 border-b-2 border-slate-100 dark:border-slate-800">
                    <div className="relative">
                        <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-emerald-500 stroke-[2.5px]" />
                        <input
                            ref={inputRef}
                            type="text"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder={t('dictionary.searchPlaceholder', 'Tra từ tiếng Nhật (Kanji, Hiragana, Romaji, Hán Việt)...')}
                            className="w-full pl-12 pr-10 py-3.5 text-sm bg-slate-50 dark:bg-slate-800/80 rounded-2xl border-2 border-b-4 border-slate-200 dark:border-slate-700 focus:outline-none focus:border-emerald-500 focus:ring-0 text-slate-900 dark:text-white placeholder:text-slate-400 transition-all font-bold"
                        />
                        {query && (
                            <button
                                type="button"
                                onClick={() => {
                                    setQuery('');
                                    inputRef.current?.focus();
                                }}
                                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg"
                            >
                                <X className="w-4 h-4 stroke-[2.5px]" />
                            </button>
                        )}
                    </div>
                </div>

                {/* Download Progress Banner (only when initial install on empty database) */}
                {installProgress && !isReady && (
                    <div className="px-5 py-3 bg-sky-50 dark:bg-sky-950/40 border-b-2 border-sky-100 dark:border-sky-900/50 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-2.5 min-w-0">
                            <Loader2 className="w-4 h-4 text-sky-600 animate-spin shrink-0" />
                            <span className="text-xs font-bold text-sky-900 dark:text-sky-200 truncate">
                                {installProgress.text}
                            </span>
                        </div>
                        <span className="text-xs font-black text-sky-700 dark:text-sky-300 shrink-0">
                            {installProgress.percent}%
                        </span>
                    </div>
                )}

                {/* Results List */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3.5 bg-slate-50/60 dark:bg-slate-950/40 custom-scrollbar">
                    {isSearching ? (
                        <div className="py-12 flex flex-col items-center justify-center gap-3 text-slate-400">
                            <Loader2 className="w-7 h-7 animate-spin text-emerald-500" />
                            <span className="text-xs font-extrabold text-slate-500 animate-pulse">{t('dictionary.searching', 'Đang tìm kiếm trong 266.000+ từ...')}</span>
                        </div>
                    ) : results.length > 0 ? (
                        results.map((entry) => {
                            const isSaved = savedWords.has(entry.w || entry.r);

                            return (
                                <DictionaryEntryCard
                                    key={entry.id || `${entry.w}_${entry.r}`}
                                    entry={entry}
                                    onAddWithAi={handleAddWithAiClick}
                                    onQuickAdd={handleQuickAddClick}
                                    isAiLoading={aiLoadingWord === (entry.w || entry.r)}
                                    isSaved={isSaved}
                                />
                            );
                        })
                    ) : query.trim() ? (
                        <div className="py-12 text-center text-slate-400">
                            <p className="text-sm font-bold text-slate-600 dark:text-slate-300">{t('dictionary.noResults', 'Không tìm thấy từ "{query}" trong từ điển.').replace('{query}', query)}</p>
                            <p className="text-xs font-medium text-slate-400 mt-1">{t('dictionary.searchTip', 'Hãy thử gõ chữ Kanji, Hiragana, hoặc Romaji.')}</p>
                        </div>
                    ) : (
                        <div className="py-10 text-center text-slate-400 space-y-3">
                            <p className="text-sm font-black text-slate-700 dark:text-slate-300">
                                {t('dictionary.initialPrompt', 'Nhập từ tiếng Nhật hoặc Hán Việt để tra cứu')}
                            </p>
                            <div className="flex flex-wrap justify-center gap-2 pt-1">
                                {['開始', '食べる', '勉強', '犬', '簡単', 'KHAI THỦY', 'arigatou'].map((sample) => (
                                    <button
                                        key={sample}
                                        type="button"
                                        onClick={() => setQuery(sample)}
                                        className="px-3.5 py-1.5 text-xs font-extrabold rounded-xl bg-white dark:bg-slate-900 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-slate-700 hover:text-emerald-600 dark:text-slate-300 dark:hover:text-emerald-400 border-2 border-b-3 border-slate-200 dark:border-slate-800 hover:border-emerald-300 active:translate-y-0.5 active:border-b-1 transition-all cursor-pointer shadow-2xs"
                                    >
                                        {sample}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer status */}
                <div className="px-5 py-2.5 bg-white dark:bg-slate-900 border-t-2 border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
                    <div className="flex items-center gap-2.5 min-w-0">
                        <span className="font-bold">
                            {results.length > 0 ? t('dictionary.foundResults', 'Tìm thấy {count} kết quả').replace('{count}', results.length) : t('dictionary.readyToSearch', 'Sẵn sàng tra cứu')}
                        </span>
                        {installProgress && isReady && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-sky-50 dark:bg-sky-950/50 text-sky-600 dark:text-sky-400 text-[10px] font-bold border border-sky-100 dark:border-sky-900/40">
                                <Loader2 className="w-2.5 h-2.5 animate-spin" />
                                {t('dictionary.syncingBackground', 'Đang đồng bộ dữ liệu ngầm ({percent}%)').replace('{percent}', installProgress.percent)}
                            </span>
                        )}
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono font-bold">
                        QuizKi Yomitan Engine
                    </span>
                </div>
            </div>

            {/* POP-UP CHỌN HỌC PHẦN (HIỆN THƯ MỤC TRƯỚC -> CHỌN THƯ MỤC RA HỌC PHẦN) */}
            {saveTarget && (
                <div 
                    className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-4 bg-black/65 backdrop-blur-xs animate-fade-in"
                    onClick={() => setSaveTarget(null)}
                >
                    <div 
                        className="bg-white dark:bg-slate-900 rounded-3xl border-2 border-b-8 border-slate-200 dark:border-slate-800 p-5 sm:p-6 max-w-md w-full shadow-2xl animate-scale-in flex flex-col max-h-[85vh] overflow-hidden"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between gap-3 pb-3 border-b-2 border-slate-100 dark:border-slate-800 shrink-0">
                            <div className="flex items-center gap-2.5 min-w-0">
                                <div className="w-10 h-10 rounded-2xl bg-sky-50 dark:bg-sky-950/50 border-2 border-b-4 border-sky-200 dark:border-sky-800 flex items-center justify-center text-sky-600 dark:text-sky-400 shrink-0 font-black">
                                    {selectedModalFolderId ? <BookOpen className="w-5 h-5 stroke-[2.5px]" /> : <Folder className="w-5 h-5 stroke-[2.5px]" />}
                                </div>
                                <div className="min-w-0">
                                    <h3 className="text-base font-black text-slate-900 dark:text-white leading-tight truncate">
                                        {folderSearchQuery.trim()
                                            ? t('dictionary.picker.searchSetsTitle', 'Tìm kiếm học phần')
                                            : (selectedModalFolderId 
                                                ? t('dictionary.picker.folderTitle', 'Thư mục: {name}').replace('{name}', activeFolder?.name || activeFolder?.title || t('dictionary.defaultFolder', 'Thư mục')) 
                                                : t('dictionary.picker.chooseFolderTitle', 'Chọn thư mục lưu từ vựng'))}
                                    </h3>
                                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                                        {folderSearchQuery.trim()
                                            ? t('dictionary.picker.searchSetsSub', 'Tìm thấy {count} học phần phù hợp').replace('{count}', searchedStudySets.length)
                                            : (selectedModalFolderId 
                                                ? t('dictionary.picker.folderSub', 'Chọn một học phần bên trong thư mục này để lưu') 
                                                : t('dictionary.picker.rootSub', 'Nhấp vào một thư mục để xem các học phần bên trong'))}
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setSaveTarget(null)}
                                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer shrink-0 transition-colors"
                            >
                                <X className="w-5 h-5 stroke-[2.5px]" />
                            </button>
                        </div>

                        {/* Word Preview Card */}
                        <div className="my-3 p-3.5 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border-2 border-emerald-100 dark:border-emerald-900/40 shrink-0">
                            <div className="flex items-baseline justify-between gap-2">
                                <span className="font-black text-base text-slate-900 dark:text-white">
                                    {saveTarget.entry.w || saveTarget.entry.r}
                                </span>
                                {saveTarget.entry.r && saveTarget.entry.w !== saveTarget.entry.r && (
                                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                                        {saveTarget.entry.r}
                                    </span>
                                )}
                            </div>
                            {saveTarget.entry.m && saveTarget.entry.m.length > 0 && (
                                <p className="text-xs font-semibold text-slate-600 dark:text-slate-300 mt-1 line-clamp-1">
                                    {saveTarget.entry.m.slice(0, 2).join('; ')}
                                </p>
                            )}
                        </div>

                        {/* Search Input for fast lookup */}
                        <div className="relative mb-3 shrink-0">
                            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 stroke-[2.5px]" />
                            <input
                                type="text"
                                value={folderSearchQuery}
                                onChange={(e) => setFolderSearchQuery(e.target.value)}
                                placeholder={t('dictionary.picker.searchPlaceholder', 'Tìm nhanh học phần theo tên...')}
                                className="w-full pl-10 pr-8 py-2.5 text-xs font-bold bg-slate-50 dark:bg-slate-800/80 rounded-xl border-2 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-sky-500 transition-all"
                            />
                            {folderSearchQuery && (
                                <button
                                    type="button"
                                    onClick={() => setFolderSearchQuery('')}
                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                                >
                                    <X className="w-3.5 h-3.5 stroke-[2.5px]" />
                                </button>
                            )}
                        </div>

                        {/* List Area: Folders first, then Study Sets inside */}
                        <div className="flex-1 overflow-y-auto space-y-2 pr-1 min-h-[160px] max-h-[38vh] custom-scrollbar">
                            {/* CASE 1: SEARCH ACTIVE */}
                            {folderSearchQuery.trim() ? (
                                searchedStudySets.length === 0 ? (
                                    <p className="text-center text-xs font-bold text-slate-400 py-8">
                                        {t('dictionary.picker.noSetsFound', 'Không tìm thấy học phần nào khớp với từ khóa "{query}".').replace('{query}', folderSearchQuery)}
                                    </p>
                                ) : (
                                    searchedStudySets.map((item) => {
                                        const cardCount = (allCards || []).filter(c => c.folderId === item.id).length;
                                        const isDup = (allCards || []).some(c => {
                                            if (c.folderId !== item.id) return false;
                                            const fClean = getCleanWord(c.front);
                                            const rClean = getCleanWord(c.reading);
                                            return fClean === targetWordClean || (rClean && rClean === targetWordClean);
                                        });
                                        const isSelected = selectedFolderId === item.id;
                                        const parentName = getParentFolderName(item.parentId);

                                        return (
                                            <button
                                                key={item.id}
                                                type="button"
                                                onClick={() => setSelectedFolderId(item.id)}
                                                className={`w-full text-left p-3 rounded-2xl border-2 border-b-4 transition-all flex items-center justify-between gap-2.5 cursor-pointer active:translate-y-0.5 active:border-b-2 ${
                                                    isSelected
                                                        ? 'border-sky-500 bg-sky-50/80 dark:bg-sky-950/50 text-sky-900 dark:text-sky-100 shadow-xs'
                                                        : 'border-slate-200/80 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-700 dark:text-slate-300'
                                                }`}
                                            >
                                                <div className="flex items-center gap-2.5 min-w-0">
                                                    <span className={`p-2 rounded-xl shrink-0 ${
                                                        isSelected 
                                                            ? 'bg-sky-100 dark:bg-sky-900/60 text-sky-600 dark:text-sky-300' 
                                                            : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400'
                                                    }`}>
                                                        <BookOpen className="w-4 h-4 stroke-[2.5px]" />
                                                    </span>
                                                    <div className="min-w-0">
                                                        <div className="text-xs font-black text-slate-900 dark:text-white truncate">
                                                            {item.name || item.title || t('dictionary.defaultStudySet', 'Học phần')}
                                                        </div>
                                                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                                            <span className="text-[10px] font-bold text-slate-400">
                                                                {t('dictionary.picker.wordsCount', '{count} từ').replace('{count}', cardCount)}
                                                            </span>
                                                            {parentName && (
                                                                <span className="text-[9px] font-bold text-slate-500 dark:text-slate-400">
                                                                    📁 {parentName}
                                                                </span>
                                                            )}
                                                            {isDup && (
                                                                <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300">
                                                                    {t('dictionary.picker.alreadyExists', 'Đã có từ này')}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                                {isSelected && (
                                                    <Check className="w-4 h-4 text-sky-600 stroke-[3px] shrink-0" />
                                                )}
                                            </button>
                                        );
                                    })
                                )
                            ) : selectedModalFolderId ? (
                                /* CASE 2: INSIDE A FOLDER -> SHOW STUDY SETS (HỌC PHẦN) */
                                <div className="space-y-2">
                                    {/* Back to folders button */}
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setSelectedModalFolderId(null);
                                            setSelectedFolderId(null);
                                        }}
                                        className="w-full text-left p-2.5 px-3 rounded-2xl border-2 border-dashed border-sky-300 dark:border-sky-700 hover:bg-sky-50 dark:hover:bg-sky-950/40 text-sky-600 dark:text-sky-400 transition-all flex items-center gap-2 mb-2 font-black text-xs cursor-pointer active:translate-y-0.5"
                                    >
                                        <ArrowLeft className="w-4 h-4 stroke-[2.5px] shrink-0" />
                                        <span>{t('dictionary.picker.backToFolders', 'Quay lại danh sách thư mục')}</span>
                                    </button>

                                    <div className="text-[11px] font-black text-slate-400 uppercase tracking-wider px-1 pt-1 mb-1.5 flex items-center justify-between">
                                        <span>{t('dictionary.picker.setsInFolder', 'Học phần trong thư mục ({count})').replace('{count}', studySetsInActiveFolder.length)}</span>
                                        <span className="text-[10px] text-slate-400 font-bold">{t('dictionary.picker.clickToSelect', 'Nhấp để chọn')}</span>
                                    </div>

                                    {studySetsInActiveFolder.length === 0 ? (
                                        <div className="p-6 text-center bg-slate-50 dark:bg-slate-800/40 rounded-2xl border-2 border-slate-200/80 dark:border-slate-800 my-2">
                                            <BookOpen className="w-7 h-7 text-slate-300 dark:text-slate-600 mx-auto mb-1.5 stroke-[2px]" />
                                            <p className="text-xs font-black text-slate-600 dark:text-slate-300">
                                                {t('dictionary.picker.emptyFolder', 'Thư mục này chưa có học phần nào')}
                                            </p>
                                            <p className="text-[10px] font-bold text-slate-400 mt-0.5">
                                                {t('dictionary.picker.emptyFolderTip', 'Bạn có thể quay lại để chọn thư mục khác.')}
                                            </p>
                                        </div>
                                    ) : (
                                        studySetsInActiveFolder.map((item) => {
                                            const cardCount = (allCards || []).filter(c => c.folderId === item.id).length;
                                            const isDup = (allCards || []).some(c => {
                                                if (c.folderId !== item.id) return false;
                                                const fClean = getCleanWord(c.front);
                                                const rClean = getCleanWord(c.reading);
                                                return fClean === targetWordClean || (rClean && rClean === targetWordClean);
                                            });
                                            const isSelected = selectedFolderId === item.id;

                                            return (
                                                <button
                                                    key={item.id}
                                                    type="button"
                                                    onClick={() => setSelectedFolderId(item.id)}
                                                    className={`w-full text-left p-3 rounded-2xl border-2 border-b-4 transition-all flex items-center justify-between gap-2.5 cursor-pointer active:translate-y-0.5 active:border-b-2 ${
                                                        isSelected
                                                            ? 'border-sky-500 bg-sky-50/80 dark:bg-sky-950/50 text-sky-900 dark:text-sky-100 shadow-xs'
                                                            : 'border-slate-200/80 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-700 dark:text-slate-300'
                                                    }`}
                                                >
                                                    <div className="flex items-center gap-2.5 min-w-0">
                                                        <span className={`p-2 rounded-xl shrink-0 ${
                                                            isSelected 
                                                                ? 'bg-sky-100 dark:bg-sky-900/60 text-sky-600 dark:text-sky-300' 
                                                                : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400'
                                                        }`}>
                                                            <BookOpen className="w-4 h-4 stroke-[2.5px]" />
                                                        </span>
                                                        <div className="min-w-0">
                                                            <div className="text-xs font-black text-slate-900 dark:text-white truncate">
                                                                {item.name || item.title || t('dictionary.defaultStudySet', 'Học phần')}
                                                            </div>
                                                            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                                                <span className="text-[10px] font-bold text-slate-400">
                                                                    {t('dictionary.picker.wordsCount', '{count} từ').replace('{count}', cardCount)}
                                                                </span>
                                                                {isDup && (
                                                                    <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300">
                                                                        {t('dictionary.picker.duplicateWarningBadge', '⚠️ Đã có từ này (Trùng)')}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {isSelected && (
                                                        <Check className="w-4 h-4 text-sky-600 stroke-[3px] shrink-0" />
                                                    )}
                                                </button>
                                            );
                                        })
                                    )}
                                </div>
                            ) : (
                                /* CASE 3: ROOT LEVEL -> HIỆN THƯ MỤC TRƯỚC (FOLDERS FIRST) */
                                <div className="space-y-3">
                                    {/* 1. THƯ MỤC SECTION */}
                                    <div>
                                        <div className="text-[11px] font-black text-slate-400 uppercase tracking-wider px-1 mb-2 flex items-center justify-between">
                                            <span>{t('dictionary.picker.folderList', '📁 Danh sách thư mục ({count})').replace('{count}', resolvedParentFolders.length)}</span>
                                            <span className="text-[10px] text-slate-400 font-bold">{t('dictionary.picker.clickToOpen', 'Nhấp để mở')}</span>
                                        </div>

                                        {resolvedParentFolders.length === 0 ? (
                                            <p className="text-xs font-bold text-slate-400 italic py-2 px-1">
                                                {t('dictionary.picker.noFolders', 'Chưa có thư mục nào. Bạn có thể chọn học phần bên dưới hoặc tạo thư mục trong Thư viện.')}
                                            </p>
                                        ) : (
                                            <div className="space-y-2">
                                                {resolvedParentFolders.map((folder) => {
                                                    const setsInFolder = resolvedStudySets.filter(s => s.parentId === folder.id);
                                                    const hasDupInFolder = setsInFolder.some(s => (allCards || []).some(c => {
                                                        if (c.folderId !== s.id) return false;
                                                        const fClean = getCleanWord(c.front);
                                                        const rClean = getCleanWord(c.reading);
                                                        return fClean === targetWordClean || (rClean && rClean === targetWordClean);
                                                    }));

                                                    return (
                                                        <button
                                                            key={folder.id}
                                                            type="button"
                                                            onClick={() => {
                                                                setSelectedModalFolderId(folder.id);
                                                                setSelectedFolderId(null);
                                                            }}
                                                            className="w-full text-left p-3 rounded-2xl border-2 border-b-4 border-slate-200/80 dark:border-slate-800 hover:border-sky-400 dark:hover:border-sky-500 hover:bg-sky-50/30 dark:hover:bg-slate-800/60 transition-all flex items-center justify-between gap-3 cursor-pointer group active:translate-y-0.5 active:border-b-2 shadow-2xs hover:shadow-xs"
                                                        >
                                                            <div className="flex items-center gap-3 min-w-0">
                                                                <span className="p-2.5 rounded-2xl bg-amber-50 dark:bg-amber-950/60 text-amber-500 dark:text-amber-400 shrink-0 border-2 border-b-3 border-amber-200/60 dark:border-amber-900/40">
                                                                    <Folder className="w-5 h-5 stroke-[2.5px]" />
                                                                </span>
                                                                <div className="min-w-0">
                                                                    <div className="text-xs sm:text-sm font-black text-slate-900 dark:text-white truncate group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors">
                                                                        {folder.name || folder.title || t('dictionary.defaultFolder', 'Thư mục')}
                                                                    </div>
                                                                    <div className="flex items-center gap-2 mt-0.5">
                                                                        <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                                                                            {t('dictionary.picker.setsInside', '{count} học phần bên trong').replace('{count}', setsInFolder.length)}
                                                                        </span>
                                                                        {hasDupInFolder && (
                                                                            <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300">
                                                                                {t('dictionary.picker.hasDuplicate', 'Có học phần trùng từ này')}
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center gap-1.5 text-slate-400 group-hover:text-sky-600 shrink-0">
                                                                <span className="text-xs font-black hidden sm:inline">{t('dictionary.picker.open', 'Mở')}</span>
                                                                <ChevronRight className="w-4 h-4 stroke-[2.5px] transition-transform group-hover:translate-x-0.5" />
                                                            </div>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>

                                    {/* 2. ROOT STANDALONE STUDY SETS (If any exist without a parent folder) */}
                                    {rootStudySets.length > 0 && (
                                        <div className="pt-2 border-t-2 border-slate-100 dark:border-slate-800">
                                            <div className="text-[11px] font-black text-slate-400 uppercase tracking-wider px-1 mb-2">
                                                {t('dictionary.picker.rootSets', '📚 Học phần chưa phân thư mục ({count})').replace('{count}', rootStudySets.length)}
                                            </div>
                                            <div className="space-y-2">
                                                {rootStudySets.map((item) => {
                                                    const cardCount = (allCards || []).filter(c => c.folderId === item.id).length;
                                                    const isDup = (allCards || []).some(c => {
                                                        if (c.folderId !== item.id) return false;
                                                        const fClean = getCleanWord(c.front);
                                                        const rClean = getCleanWord(c.reading);
                                                        return fClean === targetWordClean || (rClean && rClean === targetWordClean);
                                                    });
                                                    const isSelected = selectedFolderId === item.id;

                                                    return (
                                                        <button
                                                            key={item.id}
                                                            type="button"
                                                            onClick={() => setSelectedFolderId(item.id)}
                                                            className={`w-full text-left p-3 rounded-2xl border-2 border-b-4 transition-all flex items-center justify-between gap-2.5 cursor-pointer active:translate-y-0.5 active:border-b-2 ${
                                                                isSelected
                                                                    ? 'border-sky-500 bg-sky-50/80 dark:bg-sky-950/50 text-sky-900 dark:text-sky-100 shadow-xs'
                                                                    : 'border-slate-200/80 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-700 dark:text-slate-300'
                                                            }`}
                                                        >
                                                            <div className="flex items-center gap-2.5 min-w-0">
                                                                <span className={`p-2 rounded-xl shrink-0 ${
                                                                    isSelected 
                                                                        ? 'bg-sky-100 dark:bg-sky-900/60 text-sky-600 dark:text-sky-300' 
                                                                        : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400'
                                                                }`}>
                                                                    <BookOpen className="w-4 h-4 stroke-[2.5px]" />
                                                                </span>
                                                                <div className="min-w-0">
                                                                    <div className="text-xs font-black text-slate-900 dark:text-white truncate">
                                                                        {item.name || item.title || t('dictionary.defaultStudySet', 'Học phần')}
                                                                    </div>
                                                                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                                                        <span className="text-[10px] font-bold text-slate-400">
                                                                            {t('dictionary.picker.wordsCount', '{count} từ').replace('{count}', cardCount)}
                                                                        </span>
                                                                        {isDup && (
                                                                            <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300">
                                                                                {t('dictionary.picker.alreadyExists', 'Đã có từ này')}
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            {isSelected && (
                                                                <Check className="w-4 h-4 text-sky-600 stroke-[3px] shrink-0" />
                                                            )}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Duplicate Alert Banner if selected folder already has this word */}
                        {isDuplicateInSelectedFolder && (
                            <div className="mt-3 p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border-2 border-amber-200 dark:border-amber-800 flex items-start gap-2.5 text-xs text-amber-800 dark:text-amber-200 shrink-0">
                                <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5 stroke-[2.5px]" />
                                <div className="min-w-0">
                                    <span className="font-black">{t('dictionary.picker.alreadyInSetBanner', 'Từ này đã có trong học phần "{name}"!').replace('{name}', selectedFolderName)}</span>
                                    <p className="text-[11px] font-semibold text-amber-700 dark:text-amber-300 mt-0.5">
                                        {t('dictionary.picker.alreadyInSetDesc', 'Nếu tiếp tục, hệ thống sẽ tạo thêm một thẻ trùng cho từ này.')}
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Action Buttons */}
                        <div className="flex items-center justify-between gap-3 pt-3 mt-3 border-t-2 border-slate-100 dark:border-slate-800 shrink-0">
                            <button
                                type="button"
                                onClick={() => setSaveTarget(null)}
                                className="px-4 py-2.5 rounded-2xl text-xs font-black text-slate-700 dark:text-slate-300 bg-white hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 border-2 border-b-4 border-slate-200 dark:border-slate-700 active:translate-y-0.5 active:border-b-2 transition-all cursor-pointer"
                            >
                                {t('common.cancel', 'Hủy')}
                            </button>
                            <button
                                type="button"
                                onClick={handleConfirmSave}
                                disabled={isSaving || !selectedFolderId}
                                className={`px-5 py-2.5 rounded-2xl text-xs font-black text-white border-b-4 active:translate-y-0.5 active:border-b-2 shadow-sm transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed ${
                                    saveTarget.isAiAction
                                        ? 'bg-sky-500 hover:bg-sky-400 border-sky-600'
                                        : 'bg-emerald-500 hover:bg-emerald-400 border-emerald-600'
                                }`}
                            >
                                {isSaving ? (
                                    <>
                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                        <span>{t('dictionary.picker.saving', 'Đang lưu...')}</span>
                                    </>
                                ) : !selectedFolderId ? (
                                    <span>{t('dictionary.picker.selectSetPrompt', 'Chọn học phần để lưu')}</span>
                                ) : isDuplicateInSelectedFolder ? (
                                    <span>{t('dictionary.picker.saveDuplicate', 'Vẫn lưu (Thêm thẻ trùng)')}</span>
                                ) : saveTarget.isAiAction ? (
                                    <>
                                        <Wand2 className="w-3.5 h-3.5 text-amber-200" />
                                        <span>{t('dictionary.picker.aiSaveBtn', 'Tạo thẻ AI & Lưu')}</span>
                                    </>
                                ) : (
                                    <>
                                        <Check className="w-3.5 h-3.5 stroke-[3px]" />
                                        <span>{t('dictionary.picker.saveBtn', 'Lưu vào học phần')}</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>,
        document.body
    );
};

export default DictionaryModal;
