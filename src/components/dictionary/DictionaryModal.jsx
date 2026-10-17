import React, { useState, useEffect, useRef, useTransition, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Search, X, Loader2, Folder, BookOpen, AlertTriangle, Check, ArrowLeft, ChevronRight } from 'lucide-react';
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
                    showToast('Lỗi tải dữ liệu từ điển: ' + err.message, 'error');
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
        const cardData = {
            front: entry.w || entry.r,
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
            const folderName = targetFolder ? (targetFolder.name || targetFolder.title) : (folderId === 'unfiled' ? 'Chưa phân loại' : 'học phần');
            showToast(`Đã lưu "${entry.w || entry.r}" vào ${folderName}!`, 'success');
        } catch (err) {
            console.error('Error saving quick card:', err);
            showToast('Lỗi lưu thẻ: ' + err.message, 'error');
        }
    };

    // Execute saving card with AI enrichment
    const executeAiSave = async (entry, folderId) => {
        if (!onSaveCard || !entry) return;
        if (!canUserUseAI || !onGeminiAssist) {
            executeSave(entry, folderId);
            return;
        }

        setAiLoadingWord(entry.w || entry.r);
        try {
            const aiPrompt = `Hãy tạo một thẻ học từ vựng tiếng Nhật chuẩn xác cao cho từ sau:
Từ: "${entry.w}" (Cách đọc Hiragana: "${entry.r || ''}")
Hán Việt: "${entry.hv || ''}"
Ý nghĩa tiếng Việt gốc: "${(entry.m || []).join('; ')}"
Câu ví dụ có sẵn: "${entry.ex?.ja || ''}" (Dịch: "${entry.translatedVi || entry.ex?.vi || entry.ex?.en || ''}")

Yêu cầu trả về JSON chuẩn theo format sau (chỉ trả về JSON thuần):
{
  "front": "${entry.w}",
  "reading": "${entry.r || ''}",
  "sinoVietnamese": "${entry.hv || ''}",
  "back": "Nghĩa tiếng Việt súc tích, tự nhiên nhất",
  "example": "Câu ví dụ tiếng Nhật tự nhiên, có kanji và ngữ cảnh thực tế",
  "exampleMeaning": "Bản dịch tiếng Việt của câu ví dụ",
  "synonym": "Từ đồng nghĩa hoặc từ trái nghĩa nếu có",
  "pos": "${(entry.p || []).join(' ')}",
  "level": "${entry.j || 'N3'}",
  "accent": "${entry.pi && entry.pi.length > 0 ? String(entry.pi[0]) : '0'}"
}`;

            const aiRes = await onGeminiAssist(aiPrompt);
            let parsed = null;
            if (aiRes) {
                if (typeof aiRes === 'object') {
                    parsed = aiRes;
                } else if (typeof aiRes === 'string') {
                    const cleanJson = aiRes.replace(/```json/g, '').replace(/```/g, '').trim();
                    try {
                        parsed = JSON.parse(cleanJson);
                    } catch {
                        parsed = null;
                    }
                }
            }

            const cardToSave = {
                front: parsed?.front || entry.w,
                back: parsed?.back || (entry.m ? entry.m.join('\n') : ''),
                reading: parsed?.reading || entry.r || '',
                sinoVietnamese: parsed?.sinoVietnamese || entry.hv || '',
                example: parsed?.example || entry.ex?.ja || '',
                exampleMeaning: parsed?.exampleMeaning || entry.translatedVi || entry.ex?.vi || entry.ex?.en || '',
                synonym: parsed?.synonym || (entry.ant ? `${entry.ant.w}${entry.ant.r ? ` (${entry.ant.r})` : ''}` : ''),
                pos: parsed?.pos || (entry.p ? entry.p.join(' ') : ''),
                level: parsed?.level || entry.j || '',
                accent: parsed?.accent || (entry.pi && entry.pi.length > 0 ? String(entry.pi[0]) : '0'),
                folderId: folderId || 'unfiled',
                action: 'stay'
            };

            await onSaveCard(cardToSave);
            setSavedWords(prev => new Set([...prev, entry.w || entry.r]));
            const targetFolder = (folders || []).find(f => f.id === folderId);
            const folderName = targetFolder ? (targetFolder.name || targetFolder.title) : (folderId === 'unfiled' ? 'Chưa phân loại' : 'học phần');
            showToast(`Đã dùng AI tạo và lưu "${entry.w}" vào ${folderName}!`, 'success');
        } catch (err) {
            console.error('AI Card creation error:', err);
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
        if (parentFolders && parentFolders.length > 0) return parentFolders;
        return (folders || []).filter(f => f.type === 'folder');
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

    // Study sets inside the currently active folder
    const studySetsInActiveFolder = useMemo(() => {
        if (!selectedModalFolderId) return [];
        return resolvedStudySets.filter(s => s.parentId === selectedModalFolderId);
    }, [resolvedStudySets, selectedModalFolderId]);

    // Standalone study sets that don't belong to any parent folder
    const rootStudySets = useMemo(() => {
        const parentIdSet = new Set(resolvedParentFolders.map(p => p.id));
        return resolvedStudySets.filter(s => !s.parentId || !parentIdSet.has(s.parentId));
    }, [resolvedStudySets, resolvedParentFolders]);

    // Instant search results across all study sets
    const searchedStudySets = useMemo(() => {
        if (!folderSearchQuery.trim()) return [];
        const q = folderSearchQuery.toLowerCase().trim();
        return resolvedStudySets.filter(item =>
            (item.name || item.title || '').toLowerCase().includes(q)
        );
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
        if (selectedFolderId === 'unfiled') return 'Chưa phân loại';
        const found = resolvedStudySets.find(f => f.id === selectedFolderId) || (folders || []).find(f => f.id === selectedFolderId);
        return found ? (found.name || found.title || 'Học phần') : 'Chưa phân loại';
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
                className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden relative"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header: Title & Close Button */}
                <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 bg-white dark:bg-slate-900">
                    <div className="min-w-0">
                        <div className="flex items-center gap-2">
                            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                                Từ điển tiếng Nhật
                            </h2>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                            266.000+ từ vựng • Cấp độ JLPT • Trọng âm Pitch Accent
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
                        title="Đóng (ESC)"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Search Bar Input */}
                <div className="p-4 bg-white dark:bg-slate-900 border-b border-slate-200/80 dark:border-slate-800">
                    <div className="relative">
                        <Search className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            ref={inputRef}
                            type="text"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Tra từ tiếng Nhật (Kanji, Hiragana, Romaji, Hán Việt)..."
                            className="w-full pl-11 pr-10 py-3 text-sm bg-slate-50 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 text-slate-900 dark:text-white placeholder:text-slate-400 transition-all font-medium"
                        />
                        {query && (
                            <button
                                type="button"
                                onClick={() => {
                                    setQuery('');
                                    inputRef.current?.focus();
                                }}
                                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                </div>

                {/* Download Progress Banner (only when initial install on empty database) */}
                {installProgress && !isReady && (
                    <div className="px-5 py-3 bg-blue-50 dark:bg-blue-950/40 border-b border-blue-100 dark:border-blue-900/50 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-2.5 min-w-0">
                            <Loader2 className="w-4 h-4 text-blue-600 animate-spin shrink-0" />
                            <span className="text-xs font-medium text-blue-900 dark:text-blue-200 truncate">
                                {installProgress.text}
                            </span>
                        </div>
                        <span className="text-xs font-bold text-blue-700 dark:text-blue-300 shrink-0">
                            {installProgress.percent}%
                        </span>
                    </div>
                )}

                {/* Results List */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3.5 bg-slate-50/50 dark:bg-slate-950/40">
                    {isSearching ? (
                        <div className="py-12 flex flex-col items-center justify-center gap-3 text-slate-400">
                            <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                            <span className="text-xs font-medium">Đang tìm kiếm trong 266.000+ từ...</span>
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
                            <p className="text-sm font-medium text-slate-600 dark:text-slate-300">Không tìm thấy từ "{query}" trong từ điển.</p>
                            <p className="text-xs text-slate-400 mt-1">Hãy thử gõ chữ Kanji, Hiragana, hoặc Romaji.</p>
                        </div>
                    ) : (
                        <div className="py-10 text-center text-slate-400 space-y-3">
                            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                                Nhập từ tiếng Nhật hoặc Hán Việt để tra cứu
                            </p>
                            <div className="flex flex-wrap justify-center gap-2 pt-1">
                                {['開始', '食べる', '勉強', '犬', '簡単', 'KHAI THỦY', 'arigatou'].map((sample) => (
                                    <button
                                        key={sample}
                                        type="button"
                                        onClick={() => setQuery(sample)}
                                        className="px-2.5 py-1 text-xs rounded-lg bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white border border-slate-200 dark:border-slate-800 transition-colors cursor-pointer"
                                    >
                                        {sample}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer status */}
                <div className="px-4 py-2 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
                    <div className="flex items-center gap-2.5 min-w-0">
                        <span>
                            {results.length > 0 ? `Tìm thấy ${results.length} kết quả` : 'Sẵn sàng tra cứu'}
                        </span>
                        {installProgress && isReady && (
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 text-[10px] font-medium border border-blue-100 dark:border-blue-900/40">
                                <Loader2 className="w-2.5 h-2.5 animate-spin" />
                                Đang đồng bộ dữ liệu ngầm ({installProgress.percent}%)
                            </span>
                        )}
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono">
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
                        className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 max-w-md w-full shadow-2xl animate-scale-in flex flex-col max-h-[85vh] overflow-hidden"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800 shrink-0">
                            <div className="flex items-center gap-2.5 min-w-0">
                                <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
                                    {selectedModalFolderId ? <BookOpen className="w-4 h-4" /> : <Folder className="w-4 h-4" />}
                                </div>
                                <div className="min-w-0">
                                    <h3 className="text-base font-bold text-slate-900 dark:text-white leading-tight truncate">
                                        {folderSearchQuery.trim()
                                            ? 'Tìm kiếm học phần'
                                            : (selectedModalFolderId 
                                                ? `Thư mục: ${activeFolder?.name || activeFolder?.title || 'Thư mục'}` 
                                                : 'Chọn thư mục lưu từ vựng')}
                                    </h3>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                                        {folderSearchQuery.trim()
                                            ? `Tìm thấy ${searchedStudySets.length} học phần phù hợp`
                                            : (selectedModalFolderId 
                                                ? 'Chọn một học phần bên trong thư mục này để lưu' 
                                                : 'Nhấp vào một thư mục để xem các học phần bên trong')}
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setSaveTarget(null)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer shrink-0"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Word Preview Card */}
                        <div className="my-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 shrink-0">
                            <div className="flex items-baseline justify-between gap-2">
                                <span className="font-bold text-base text-slate-900 dark:text-white">
                                    {saveTarget.entry.w || saveTarget.entry.r}
                                </span>
                                {saveTarget.entry.r && saveTarget.entry.w !== saveTarget.entry.r && (
                                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                                        {saveTarget.entry.r}
                                    </span>
                                )}
                            </div>
                            {saveTarget.entry.m && saveTarget.entry.m.length > 0 && (
                                <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 line-clamp-1">
                                    {saveTarget.entry.m.slice(0, 2).join('; ')}
                                </p>
                            )}
                        </div>

                        {/* Search Input for fast lookup */}
                        <div className="relative mb-2.5 shrink-0">
                            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                value={folderSearchQuery}
                                onChange={(e) => setFolderSearchQuery(e.target.value)}
                                placeholder="Tìm nhanh học phần theo tên..."
                                className="w-full pl-9 pr-7 py-2 text-xs bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                            />
                            {folderSearchQuery && (
                                <button
                                    type="button"
                                    onClick={() => setFolderSearchQuery('')}
                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                >
                                    <X className="w-3 h-3" />
                                </button>
                            )}
                        </div>

                        {/* List Area: Folders first, then Study Sets inside */}
                        <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 min-h-[160px] max-h-[38vh] custom-scrollbar">
                            {/* CASE 1: SEARCH ACTIVE */}
                            {folderSearchQuery.trim() ? (
                                searchedStudySets.length === 0 ? (
                                    <p className="text-center text-xs text-slate-400 py-8">
                                        Không tìm thấy học phần nào khớp với từ khóa "{folderSearchQuery}".
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
                                                className={`w-full text-left p-2.5 rounded-xl border transition-all flex items-center justify-between gap-2.5 cursor-pointer ${
                                                    isSelected
                                                        ? 'border-blue-500 bg-blue-50/70 dark:bg-blue-950/40 text-blue-900 dark:text-blue-100 shadow-xs ring-1 ring-blue-500/30'
                                                        : 'border-slate-200/80 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-700 dark:text-slate-300'
                                                }`}
                                            >
                                                <div className="flex items-center gap-2.5 min-w-0">
                                                    <span className={`p-2 rounded-xl shrink-0 ${
                                                        isSelected 
                                                            ? 'bg-blue-100 dark:bg-blue-900/60 text-blue-600 dark:text-blue-300' 
                                                            : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                                                    }`}>
                                                        <BookOpen className="w-4 h-4" />
                                                    </span>
                                                    <div className="min-w-0">
                                                        <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                                                            {item.name || item.title || 'Học phần'}
                                                        </div>
                                                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                                            <span className="text-[10px] text-slate-400">
                                                                {cardCount} từ
                                                            </span>
                                                            {parentName && (
                                                                <span className="text-[9px] font-medium text-slate-500 dark:text-slate-400">
                                                                    📁 {parentName}
                                                                </span>
                                                            )}
                                                            {isDup && (
                                                                <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300">
                                                                    Đã có từ này
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                                {isSelected && (
                                                    <Check className="w-4 h-4 text-blue-600 shrink-0" />
                                                )}
                                            </button>
                                        );
                                    })
                                )
                            ) : selectedModalFolderId ? (
                                /* CASE 2: INSIDE A FOLDER -> SHOW STUDY SETS (HỌC PHẦN) */
                                <div className="space-y-1.5">
                                    {/* Back to folders button */}
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setSelectedModalFolderId(null);
                                            setSelectedFolderId(null);
                                        }}
                                        className="w-full text-left p-2.5 px-3 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-blue-600 dark:text-blue-400 hover:text-blue-700 transition-all flex items-center gap-2 mb-2 font-bold text-xs cursor-pointer"
                                    >
                                        <ArrowLeft className="w-4 h-4 shrink-0" />
                                        <span>Quay lại danh sách thư mục</span>
                                    </button>

                                    <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider px-1 pt-1 mb-1.5 flex items-center justify-between">
                                        <span>Học phần trong thư mục ({studySetsInActiveFolder.length})</span>
                                        <span className="text-[10px] text-slate-400 font-normal">Nhấp để chọn</span>
                                    </div>

                                    {studySetsInActiveFolder.length === 0 ? (
                                        <div className="p-6 text-center bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200/80 dark:border-slate-800 my-2">
                                            <BookOpen className="w-7 h-7 text-slate-300 dark:text-slate-600 mx-auto mb-1.5" />
                                            <p className="text-xs font-bold text-slate-600 dark:text-slate-300">
                                                Thư mục này chưa có học phần nào
                                            </p>
                                            <p className="text-[10px] text-slate-400 mt-0.5">
                                                Bạn có thể quay lại để chọn thư mục khác.
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
                                                    className={`w-full text-left p-2.5 rounded-xl border transition-all flex items-center justify-between gap-2.5 cursor-pointer ${
                                                        isSelected
                                                            ? 'border-blue-500 bg-blue-50/70 dark:bg-blue-950/40 text-blue-900 dark:text-blue-100 shadow-xs ring-1 ring-blue-500/30'
                                                            : 'border-slate-200/80 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-700 dark:text-slate-300'
                                                    }`}
                                                >
                                                    <div className="flex items-center gap-2.5 min-w-0">
                                                        <span className={`p-2 rounded-xl shrink-0 ${
                                                            isSelected 
                                                                ? 'bg-blue-100 dark:bg-blue-900/60 text-blue-600 dark:text-blue-300' 
                                                                : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                                                        }`}>
                                                            <BookOpen className="w-4 h-4" />
                                                        </span>
                                                        <div className="min-w-0">
                                                            <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                                                                {item.name || item.title || 'Học phần'}
                                                            </div>
                                                            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                                                <span className="text-[10px] text-slate-400">
                                                                    {cardCount} từ vựng
                                                                </span>
                                                                {isDup && (
                                                                    <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300">
                                                                        ⚠️ Đã có từ này (Trùng)
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {isSelected && (
                                                        <Check className="w-4 h-4 text-blue-600 shrink-0" />
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
                                        <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider px-1 mb-2 flex items-center justify-between">
                                            <span>📁 Danh sách thư mục ({resolvedParentFolders.length})</span>
                                            <span className="text-[10px] text-slate-400 font-normal">Nhấp để mở</span>
                                        </div>

                                        {resolvedParentFolders.length === 0 ? (
                                            <p className="text-xs text-slate-400 italic py-2 px-1">
                                                Chưa có thư mục nào. Bạn có thể chọn học phần bên dưới hoặc tạo thư mục trong Thư viện.
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
                                                            className="w-full text-left p-3 rounded-2xl border border-slate-200/80 dark:border-slate-800 hover:border-blue-400 dark:hover:border-blue-500 hover:bg-blue-50/30 dark:hover:bg-slate-800/60 transition-all flex items-center justify-between gap-3 cursor-pointer group shadow-2xs hover:shadow-xs"
                                                        >
                                                            <div className="flex items-center gap-3 min-w-0">
                                                                <span className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-500 dark:text-amber-400 shrink-0 border border-amber-200/60 dark:border-amber-900/40">
                                                                    <Folder className="w-5 h-5" />
                                                                </span>
                                                                <div className="min-w-0">
                                                                    <div className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                                                        {folder.name || folder.title || 'Thư mục'}
                                                                    </div>
                                                                    <div className="flex items-center gap-2 mt-0.5">
                                                                        <span className="text-[11px] text-slate-500 dark:text-slate-400">
                                                                            {setsInFolder.length} học phần bên trong
                                                                        </span>
                                                                        {hasDupInFolder && (
                                                                            <span className="text-[9px] font-semibold px-1.5 py-0.2 rounded bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300">
                                                                                Có học phần trùng từ này
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center gap-1.5 text-slate-400 group-hover:text-blue-600 shrink-0">
                                                                <span className="text-xs font-semibold hidden sm:inline">Mở</span>
                                                                <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                                                            </div>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>

                                    {/* 2. ROOT STANDALONE STUDY SETS (If any exist without a parent folder) */}
                                    {rootStudySets.length > 0 && (
                                        <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                                            <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider px-1 mb-2">
                                                📚 Học phần chưa phân thư mục ({rootStudySets.length})
                                            </div>
                                            <div className="space-y-1.5">
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
                                                            className={`w-full text-left p-2.5 rounded-xl border transition-all flex items-center justify-between gap-2.5 cursor-pointer ${
                                                                isSelected
                                                                    ? 'border-blue-500 bg-blue-50/70 dark:bg-blue-950/40 text-blue-900 dark:text-blue-100 shadow-xs ring-1 ring-blue-500/30'
                                                                    : 'border-slate-200/80 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-700 dark:text-slate-300'
                                                            }`}
                                                        >
                                                            <div className="flex items-center gap-2.5 min-w-0">
                                                                <span className={`p-2 rounded-xl shrink-0 ${
                                                                    isSelected 
                                                                        ? 'bg-blue-100 dark:bg-blue-900/60 text-blue-600 dark:text-blue-300' 
                                                                        : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                                                                }`}>
                                                                    <BookOpen className="w-4 h-4" />
                                                                </span>
                                                                <div className="min-w-0">
                                                                    <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                                                                        {item.name || item.title || 'Học phần'}
                                                                    </div>
                                                                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                                                        <span className="text-[10px] text-slate-400">
                                                                            {cardCount} từ
                                                                        </span>
                                                                        {isDup && (
                                                                            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300">
                                                                                Đã có từ này
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            {isSelected && (
                                                                <Check className="w-4 h-4 text-blue-600 shrink-0" />
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
                            <div className="mt-3 p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 flex items-start gap-2 text-xs text-amber-800 dark:text-amber-200 shrink-0">
                                <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                                <div className="min-w-0">
                                    <span className="font-bold">Từ này đã có trong học phần "{selectedFolderName}"!</span>
                                    <p className="text-[11px] text-amber-700 dark:text-amber-300 mt-0.5">
                                        Nếu tiếp tục, hệ thống sẽ tạo thêm một thẻ trùng cho từ này.
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Action Buttons */}
                        <div className="flex items-center justify-between gap-2.5 pt-3 mt-2 border-t border-slate-100 dark:border-slate-800 shrink-0">
                            <button
                                type="button"
                                onClick={() => setSaveTarget(null)}
                                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                            >
                                Hủy
                            </button>
                            <button
                                type="button"
                                onClick={handleConfirmSave}
                                disabled={isSaving || !selectedFolderId}
                                className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500 transition-all cursor-pointer shadow-xs flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                                {isSaving ? (
                                    <>
                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                        <span>Đang lưu...</span>
                                    </>
                                ) : !selectedFolderId ? (
                                    <span>Chọn học phần để lưu</span>
                                ) : isDuplicateInSelectedFolder ? (
                                    <span>Vẫn lưu (Thêm thẻ trùng)</span>
                                ) : saveTarget.isAiAction ? (
                                    <span>Tạo thẻ AI & Lưu</span>
                                ) : (
                                    <span>Lưu vào học phần</span>
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
