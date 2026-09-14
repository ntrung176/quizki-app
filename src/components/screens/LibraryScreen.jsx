import React, { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Folder, Plus, Library, Trash2, X, Search, ChevronRight, Layers, GraduationCap, Play, FolderPlus, Edit3, FolderOpen, ArrowLeft, Move, Cpu, Sparkles, BookOpen, ExternalLink } from 'lucide-react'
import { TopTabBar } from '../ui';
import { VOCAB_TABS } from '../../config/tabs';
import useMenuTransition from '../../hooks/useMenuTransition';
import { useLanguage } from '../../context/LanguageContext';
import { useTargetLanguage } from '../../context/TargetLanguageContext';
import { isVocabCardMastered } from '../../utils/srs';
import EditCardModal from '../cards/EditCardModal';
import FuriganaText from '../ui/FuriganaText';
import { showToast } from '../../utils/toast';

const LibraryScreen = ({ 
    allCards = [], 
    folders = [], 
    cardFolders = {}, 
    onOpenStudySet, 
    onNavigateToAdd, 
    onDeleteFolder,
    onRenameFolder,
    parentFolders = [],
    onAddParentFolder,
    onRenameParentFolder,
    onDeleteParentFolder,
    onMoveStudySetToParentFolder,
    onSaveChanges,
    onUpdateCard,
    onGeminiAssist,
    canUserUseAI
}) => {
    const navigate = useNavigate();
    const { t } = useLanguage();
    const { targetLanguage } = useTargetLanguage();

    const filteredAllCards = useMemo(() => {
        return (allCards || []).filter(c => (c.targetLanguage || 'ja') === targetLanguage);
    }, [allCards, targetLanguage]);

    const fadeWholePage = useMenuTransition();
    const [deletingFolder, setDeletingFolder] = useState(null); // Study Set deletion
    const [searchQuery, setSearchQuery] = useState('');

    // Study Set editing state
    const [editingStudySet, setEditingStudySet] = useState(null); // { id, name }
    const [movingStudySet, setMovingStudySet] = useState(null); // { id, name, parentId }

    // Direct card editing popup state
    const [editingCard, setEditingCard] = useState(null);
    const [isSearchDropdownOpen, setIsSearchDropdownOpen] = useState(false);
    const [expandedMatchSetIds, setExpandedMatchSetIds] = useState(new Set());
    const searchContainerRef = useRef(null);

    // Parent Folder states
    const [activeParentFolderId, setActiveParentFolderId] = useState(null);
    const [dragOverFolderId, setDragOverFolderId] = useState(null);
    const [dragOverRoot, setDragOverRoot] = useState(false);
    const [showCreateFolderModal, setShowCreateFolderModal] = useState(false);
    const [newFolderName, setNewFolderName] = useState('');
    const [editingParentFolder, setEditingParentFolder] = useState(null); // { id, name }
    const [deletingParentFolder, setDeletingParentFolder] = useState(null); // { id, name }
    const [activeMenuStudySetId, setActiveMenuStudySetId] = useState(null); // For mobile/dropdown move action
    const [draggedStudySetId, setDraggedStudySetId] = useState(null); // Track if a study set is being dragged

    // Close move menu and search dropdown on outside click
    useEffect(() => {
        const handleOutsideClick = (e) => {
            setActiveMenuStudySetId(null);
            if (searchContainerRef.current && !searchContainerRef.current.contains(e.target)) {
                setIsSearchDropdownOpen(false);
            }
        };
        window.addEventListener('click', handleOutsideClick);
        return () => window.removeEventListener('click', handleOutsideClick);
    }, []);

    // Calculate counts and stats for Study Sets
    const unfiledCount = useMemo(() => {
        return filteredAllCards.filter(c => !cardFolders[c.id] && (!c.folderId || c.folderId === 'unfiled')).length;
    }, [filteredAllCards, cardFolders]);

    const foldersWithCounts = useMemo(() => {
        return folders.map(f => {
            const folderCards = filteredAllCards.filter(c => cardFolders[c.id] === f.id || c.folderId === f.id);
            const count = folderCards.length;

            // Calculate progress/mastery (cards memorized / mastered)
            const masteredCount = folderCards.filter(c => isVocabCardMastered(c)).length;
            const masteredPct = count > 0 ? Math.round((masteredCount / count) * 100) : 0;

            return { ...f, count, masteredPct };
        });
    }, [folders, filteredAllCards, cardFolders]);

    const existingParentIds = useMemo(() => new Set((parentFolders || []).map(p => p.id)), [parentFolders]);

    // Choose the first folder as the featured folder to study (only from root level)
    const featuredFolder = useMemo(() => {
        const rootSets = foldersWithCounts.filter(f => !f.parentId || !existingParentIds.has(f.parentId));
        if (rootSets.length === 0) return null;
        // Sort root sets by creation time (newest first)
        const sortedRootSets = [...rootSets].sort((a, b) => {
            const timeA = a.createdAt?.seconds || (a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0) || (a.createdAt instanceof Date ? a.createdAt.getTime() : 0) || 0;
            const timeB = b.createdAt?.seconds || (b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0) || (b.createdAt instanceof Date ? b.createdAt.getTime() : 0) || 0;
            return timeB - timeA;
        });
        return sortedRootSets[0];
    }, [foldersWithCounts, existingParentIds]);

    // Toggle expand for matched cards in a study set
    const toggleExpandMatchSet = useCallback((setId) => {
        setExpandedMatchSetIds(prev => {
            const next = new Set(prev);
            if (next.has(setId)) {
                next.delete(setId);
            } else {
                next.add(setId);
            }
            return next;
        });
    }, []);

    // Get Study Set info for a specific card
    const getCardStudySetInfo = useCallback((card) => {
        if (!card) return { id: 'unfiled', name: 'Chưa phân loại', parentName: null };
        const folderId = cardFolders[card.id] || card.folderId;
        if (!folderId || folderId === 'unfiled') {
            return { id: 'unfiled', name: 'Chưa phân loại', parentName: null };
        }
        const folder = folders.find(f => f.id === folderId);
        if (!folder) {
            return { id: 'unfiled', name: 'Chưa phân loại', parentName: null };
        }
        const parentFolder = folder.parentId ? parentFolders.find(p => p.id === folder.parentId) : null;
        return {
            id: folder.id,
            name: folder.name,
            parentName: parentFolder?.name || null
        };
    }, [cardFolders, folders, parentFolders]);

    // Global matched cards across all study sets for the search dropdown
    const globalMatchedCards = useMemo(() => {
        if (!searchQuery || !searchQuery.trim()) return [];
        const query = searchQuery.trim().toLowerCase();
        return filteredAllCards.filter(c => 
            (c.front || '').toLowerCase().includes(query) ||
            (c.reading || '').toLowerCase().includes(query) ||
            (c.frontWithFurigana || '').toLowerCase().includes(query) ||
            (c.back || '').toLowerCase().includes(query) ||
            (c.sinoVietnamese || '').toLowerCase().includes(query) ||
            (c.synonym || '').toLowerCase().includes(query) ||
            (c.example || '').toLowerCase().includes(query) ||
            (c.exampleMeaning || '').toLowerCase().includes(query)
        );
    }, [filteredAllCards, searchQuery]);

    // Filter and sort Study Sets based on active parent folder and search query
    const filteredStudySets = useMemo(() => {
        const result = foldersWithCounts.filter(f => {
            // Match cards/vocab inside this study set if searching
            const folderCards = filteredAllCards.filter(c => cardFolders[c.id] === f.id || c.folderId === f.id);
            const matchesVocab = searchQuery
                ? folderCards.some(c => 
                    (c.front || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                    (c.reading || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                    (c.frontWithFurigana || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                    (c.back || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                    (c.sinoVietnamese || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                    (c.synonym || '').toLowerCase().includes(searchQuery.toLowerCase())
                  )
                : false;

            // Match search
            const matchesSearch = searchQuery 
                ? (f.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                  (f.description || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                  matchesVocab
                : true;

            if (!matchesSearch) return false;

            // If there's a search query, search globally (ignore parentId)
            if (searchQuery) return true;

            // Match parent folder
            const matchesParent = activeParentFolderId 
                ? f.parentId === activeParentFolderId 
                : (!f.parentId || !existingParentIds.has(f.parentId));

            return matchesParent;
        });

        // Sắp xếp học phần theo thời gian tạo mới nhất trước đến cũ nhất
        return result.sort((a, b) => {
            const timeA = a.createdAt?.seconds || (a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0) || (a.createdAt instanceof Date ? a.createdAt.getTime() : 0) || 0;
            const timeB = b.createdAt?.seconds || (b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0) || (b.createdAt instanceof Date ? b.createdAt.getTime() : 0) || 0;
            return timeB - timeA;
        });
    }, [foldersWithCounts, activeParentFolderId, searchQuery, filteredAllCards, cardFolders, existingParentIds]);

    // Parent Folders with Study Set counts
    const parentFoldersWithCounts = useMemo(() => {
        const result = parentFolders.map(pf => {
            const setsInside = folders.filter(f => f.parentId === pf.id);
            const setsCount = setsInside.length;
            const totalCards = setsInside.reduce((sum, f) => {
                const folderCards = filteredAllCards.filter(c => cardFolders[c.id] === f.id || c.folderId === f.id);
                return sum + folderCards.length;
            }, 0);
            return { ...pf, setsCount, totalCards, setsInside };
        }).filter(pf => {
            // Apply search filter if any
            if (!searchQuery) return true;

            // 1. Matches folder name directly
            const matchesFolderName = (pf.name || '').toLowerCase().includes(searchQuery.toLowerCase());
            if (matchesFolderName) return true;

            // 2. Matches any study set inside this folder (by set name/desc or its vocabulary)
            const matchesSetOrVocab = pf.setsInside.some(f => {
                const matchesSetName = (f.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                                      (f.description || '').toLowerCase().includes(searchQuery.toLowerCase());
                if (matchesSetName) return true;

                const folderCards = filteredAllCards.filter(c => cardFolders[c.id] === f.id || c.folderId === f.id);
                return folderCards.some(c => 
                    (c.front || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                    (c.reading || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                    (c.frontWithFurigana || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                    (c.back || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                    (c.sinoVietnamese || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                    (c.synonym || '').toLowerCase().includes(searchQuery.toLowerCase())
                );
            });

            return matchesSetOrVocab;
        });

        // Sắp xếp thư mục theo thời gian tạo mới nhất trước đến cũ nhất
        return result.sort((a, b) => {
            const timeA = a.createdAt?.seconds || (a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0) || (a.createdAt instanceof Date ? a.createdAt.getTime() : 0) || 0;
            const timeB = b.createdAt?.seconds || (b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0) || (b.createdAt instanceof Date ? b.createdAt.getTime() : 0) || 0;
            return timeB - timeA;
        });
    }, [parentFolders, folders, filteredAllCards, cardFolders, searchQuery]);

    // Handlers
    const handleCreateParentFolder = async (e) => {
        e.preventDefault();
        if (!newFolderName.trim() || !onAddParentFolder) return;
        await onAddParentFolder(newFolderName.trim());
        setNewFolderName('');
        setShowCreateFolderModal(false);
    };

    const handleRenameParentFolder = async (e) => {
        e.preventDefault();
        if (!editingParentFolder || !editingParentFolder.name.trim() || !onRenameParentFolder) return;
        await onRenameParentFolder(editingParentFolder.id, editingParentFolder.name.trim());
        setEditingParentFolder(null);
    };

    const handleRenameStudySet = async (e) => {
        e.preventDefault();
        if (!editingStudySet || !editingStudySet.name.trim() || !onRenameFolder) return;
        await onRenameFolder(editingStudySet.id, { name: editingStudySet.name.trim() });
        setEditingStudySet(null);
    };

    const handleDeleteParentFolderConfirm = async () => {
        if (!deletingParentFolder || !onDeleteParentFolder) return;
        await onDeleteParentFolder(deletingParentFolder.id);
        setDeletingParentFolder(null);
        if (activeParentFolderId === deletingParentFolder.id) {
            setActiveParentFolderId(null);
        }
    };

    const handleDeleteFolder = (e, folder) => {
        e.stopPropagation();
        setDeletingFolder(folder);
    };

    const confirmDelete = () => {
        if (deletingFolder && onDeleteFolder) {
            onDeleteFolder(deletingFolder.id);
        }
        setDeletingFolder(null);
    };

    // Drag and Drop implementation (HTML5 D&D with fallback formats)
    const handleDragStart = (e, studySetId) => {
        e.stopPropagation();
        try {
            e.dataTransfer.setData('studySetId', studySetId);
            e.dataTransfer.setData('text/plain', studySetId);
            e.dataTransfer.effectAllowed = 'move';
        } catch (err) {
            console.warn('DragStart setData warning:', err);
        }
        setDraggedStudySetId(studySetId);
    };

    const handleDragEnd = () => {
        setDraggedStudySetId(null);
        setDragOverFolderId(null);
        setDragOverRoot(false);
    };

    const handleDropOnFolder = async (e, parentFolderId) => {
        e.preventDefault();
        e.stopPropagation();
        const studySetId = e.dataTransfer.getData('studySetId') || e.dataTransfer.getData('text/plain') || draggedStudySetId;
        if (studySetId && onMoveStudySetToParentFolder) {
            await onMoveStudySetToParentFolder(studySetId, parentFolderId);
        }
        setDragOverFolderId(null);
        setDraggedStudySetId(null);
    };

    const handleDropOnRoot = async (e) => {
        e.preventDefault();
        e.stopPropagation();
        const studySetId = e.dataTransfer.getData('studySetId') || e.dataTransfer.getData('text/plain') || draggedStudySetId;
        if (studySetId && onMoveStudySetToParentFolder) {
            await onMoveStudySetToParentFolder(studySetId, 'root');
        }
        setDragOverRoot(false);
        setDraggedStudySetId(null);
    };

    const handleMoveStudySetToParent = async (studySetId, targetFolderId) => {
        if (onMoveStudySetToParentFolder) {
            await onMoveStudySetToParentFolder(studySetId, targetFolderId);
        }
        setMovingStudySet(null);
    };

    const activeFolderName = useMemo(() => {
        if (!activeParentFolderId) return '';
        const found = parentFolders.find(pf => pf.id === activeParentFolderId);
        return found ? found.name : '';
    }, [activeParentFolderId, parentFolders]);

    return (
        <div className="w-full pb-16 min-h-screen bg-transparent">
            <TopTabBar tabs={VOCAB_TABS} />

            <div className="max-w-6xl mx-auto px-4 md:px-8 mt-6 space-y-7 animate-fade-in">
                {/* Header Section with Full-Width Search Bar */}
                <div className="space-y-4">
                    <div className="space-y-1">
                        <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                            {t('library.vocabTitle', 'Thư viện Từ vựng')}
                        </h1>
                        <p className="text-slate-500 dark:text-slate-400 text-xs md:text-sm font-medium">
                            {t('library.vocabSub', 'Quản lý các thư mục, học phần học tập cá nhân và kéo thả để phân loại dễ dàng.')}
                        </p>
                    </div>

                    {/* Full-width Search Bar with Auto-suggest Dropdown */}
                    <div ref={searchContainerRef} className="relative w-full">
                        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <input
                            type="text"
                            placeholder={t('common.searchPlaceholder', 'Tìm kiếm từ vựng, học phần...')}
                            value={searchQuery}
                            onChange={(e) => {
                                setSearchQuery(e.target.value);
                                setIsSearchDropdownOpen(true);
                            }}
                            onFocus={() => setIsSearchDropdownOpen(true)}
                            className="w-full pl-10 pr-10 py-3 text-xs sm:text-sm font-medium rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 shadow-sm transition-all"
                        />
                        {searchQuery && (
                            <button 
                                type="button"
                                onClick={() => {
                                    setSearchQuery('');
                                    setIsSearchDropdownOpen(false);
                                }}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        )}

                        {/* Sổ ra danh sách từ vựng liên quan khi gõ tìm kiếm */}
                        {isSearchDropdownOpen && searchQuery.trim().length > 0 && (
                            <div className="absolute top-full mt-2 inset-x-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-2xl z-50 overflow-hidden animate-fade-in divide-y divide-slate-100 dark:divide-slate-800/60 font-sans">
                                <div className="px-4 py-2.5 bg-slate-50/90 dark:bg-slate-800/50 flex items-center justify-between">
                                    <div className="flex items-center gap-1.5">
                                        <Sparkles className="w-3.5 h-3.5 text-cyan-500 animate-pulse" />
                                        <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                                            Từ vựng khớp ({globalMatchedCards.length})
                                        </span>
                                    </div>
                                    <span className="text-[10px] text-slate-400 font-medium italic">
                                        Bấm vào từ để chỉnh sửa trực tiếp
                                    </span>
                                </div>

                                <div className="max-h-[340px] overflow-y-auto p-2 space-y-1.5 custom-scrollbar">
                                    {globalMatchedCards.length === 0 ? (
                                        <div className="py-8 text-center text-xs text-slate-400 dark:text-slate-500 italic">
                                            Không tìm thấy từ vựng nào khớp với &quot;{searchQuery}&quot;
                                        </div>
                                    ) : (
                                        globalMatchedCards.slice(0, 50).map((c) => {
                                            const setInfo = getCardStudySetInfo(c);
                                            return (
                                                <div
                                                    key={c.id}
                                                    onClick={() => {
                                                        setEditingCard(c);
                                                        setIsSearchDropdownOpen(false);
                                                    }}
                                                    className="w-full text-left p-2.5 rounded-xl bg-slate-50/70 dark:bg-slate-800/40 hover:bg-cyan-50/80 dark:hover:bg-cyan-950/40 border border-slate-100 dark:border-slate-800/70 hover:border-cyan-300 dark:hover:border-cyan-800 transition-all flex items-center justify-between gap-3 group cursor-pointer"
                                                >
                                                    <div className="min-w-0 flex-1 space-y-0.5">
                                                        <div className="flex items-center gap-2 flex-wrap">
                                                            <span className="font-japanese font-bold text-sm text-slate-900 dark:text-white group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors">
                                                                <FuriganaText text={c.frontWithFurigana || c.front} />
                                                            </span>
                                                            {c.sinoVietnamese && (
                                                                <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-1.5 py-0.2 rounded border border-amber-200/50 dark:border-amber-800/40">
                                                                    {c.sinoVietnamese}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-1 font-medium">
                                                            {c.back}
                                                        </p>
                                                        <div className="flex items-center gap-1.5 text-[10px] text-slate-500 dark:text-slate-400">
                                                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-200/60 dark:bg-slate-700/60 text-slate-700 dark:text-slate-300 font-medium">
                                                                <Folder className="w-2.5 h-2.5 text-cyan-500 shrink-0" />
                                                                <span className="truncate max-w-[140px] sm:max-w-[200px]">{setInfo.name}</span>
                                                            </span>
                                                            {setInfo.parentName && (
                                                                <span className="text-slate-400 text-[9px]">
                                                                    (trong {setInfo.parentName})
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>

                                                    <div className="shrink-0 flex items-center gap-1.5">
                                                        <button
                                                            type="button"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setEditingCard(c);
                                                                setIsSearchDropdownOpen(false);
                                                            }}
                                                            className="px-2.5 py-1.5 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg text-[11px] font-bold flex items-center gap-1 shadow-xs transition-transform active:scale-95 cursor-pointer"
                                                            title="Chỉnh sửa từ vựng này"
                                                        >
                                                            <Edit3 className="w-3 h-3" />
                                                            <span>Sửa</span>
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        })
                                    )}
                                    {globalMatchedCards.length > 50 && (
                                        <p className="text-center text-[10px] text-slate-400 italic py-1 font-medium">
                                            Hiển thị 50 / {globalMatchedCards.length} từ vựng khớp...
                                        </p>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Breadcrumb Navigation when inside a Folder */}
                {activeParentFolderId && (
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                        <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 font-medium">
                            <button 
                                onClick={() => setActiveParentFolderId(null)}
                                className="hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors flex items-center gap-1 font-bold"
                            >
                                <Library className="w-4 h-4" />
                                {t('tabs.library', 'Thư viện')}
                            </button>
                            <ChevronRight className="w-4 h-4 text-slate-400" />
                            <div className="flex items-center gap-1.5 bg-cyan-50 dark:bg-cyan-950/40 px-3 py-1 rounded-lg text-cyan-600 dark:text-cyan-400 font-bold">
                                <FolderOpen className="w-4 h-4" />
                                <span>{activeFolderName}</span>
                            </div>
                        </div>

                        {/* Drag and Drop zone to move set back to root */}
                        {draggedStudySetId && (
                            <div 
                                onDragOver={(e) => { e.preventDefault(); setDragOverRoot(true); }}
                                onDragLeave={() => setDragOverRoot(false)}
                                onDrop={handleDropOnRoot}
                                className={`px-6 py-2.5 rounded-xl border-2 border-dashed text-xs font-bold transition-all flex items-center gap-2 ${
                                    dragOverRoot 
                                        ? 'bg-amber-50 dark:bg-amber-950/20 border-amber-500 text-amber-600 dark:text-amber-400 scale-102' 
                                        : 'bg-slate-50 dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-500 dark:text-slate-400'
                                }`}
                            >
                                <Move className="w-4 h-4 animate-bounce" />
                                Kéo học phần vào đây để đưa ra ngoài thư mục
                            </div>
                        )}

                        <button
                            onClick={() => setActiveParentFolderId(null)}
                            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-xl transition-all flex items-center gap-1 self-start sm:self-auto"
                        >
                            <ArrowLeft className="w-3.5 h-3.5" />
                            {t('common.back', 'Quay lại')}
                        </button>
                    </div>
                )}

                {/* 1. PARENT FOLDERS GRID SECTION - Only show at root level */}
                {(!activeParentFolderId || searchQuery) && (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between gap-3">
                            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                <Folder className="w-5 h-5 text-cyan-500" />
                                <span>{t('library.managedFolders', 'Thư mục quản lý')}</span>
                                <span className="text-xs font-mono font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                                    ({parentFoldersWithCounts.length})
                                </span>
                            </h2>

                            {onAddParentFolder && (
                                <button
                                    onClick={() => setShowCreateFolderModal(true)}
                                    className="px-3.5 py-1.5 sm:px-4 sm:py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 border border-slate-200 dark:border-slate-700 cursor-pointer shadow-xs active:scale-95"
                                >
                                    <FolderPlus className="w-4 h-4 text-cyan-500" />
                                    <span>{t('library.newFolder', '+ Thư mục mới')}</span>
                                </button>
                            )}
                        </div>

                        {parentFoldersWithCounts.length === 0 ? (
                            <div className="p-6 sm:p-8 text-center bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 shadow-md text-slate-400 dark:text-slate-500 text-xs italic">
                                {searchQuery ? 'Không tìm thấy thư mục nào phù hợp.' : 'Chưa có thư mục nào. Bạn có thể nhấn "+ Thư mục mới" ở trên để phân loại học phần.'}
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-5">
                                {parentFoldersWithCounts.map(folder => {
                                    const isDragOver = dragOverFolderId === folder.id;
                                    return (
                                        <div 
                                            key={folder.id}
                                            onClick={() => setActiveParentFolderId(folder.id)}
                                            onDragOver={(e) => { e.preventDefault(); setDragOverFolderId(folder.id); }}
                                            onDragLeave={() => setDragOverFolderId(null)}
                                            onDrop={(e) => handleDropOnFolder(e, folder.id)}
                                            className={`bg-white dark:bg-slate-900 border-l-4 border-l-cyan-500 border-y border-r border-slate-200 dark:border-slate-800 hover:border-cyan-400 dark:hover:border-cyan-500/50 p-3 sm:p-5 rounded-r-xl sm:rounded-r-2xl rounded-l-md cursor-pointer transition-all duration-200 hover:shadow-xl shadow-md flex flex-col justify-between group relative overflow-hidden h-28 sm:h-36 ${
                                                isDragOver 
                                                    ? 'border-cyan-500 bg-cyan-50 dark:bg-slate-850 scale-102 ring-2 ring-cyan-500/20' 
                                                    : ''
                                            }`}
                                        >
                                            {/* Folder icon decoration background */}
                                            <div className="absolute right-0 bottom-0 translate-x-4 translate-y-4 opacity-5 group-hover:scale-110 transition-transform">
                                                <Folder className="w-16 h-16 sm:w-24 sm:h-24 text-cyan-500" />
                                            </div>

                                            <div className="space-y-1.5 sm:space-y-3 relative z-10 w-full">
                                                <div className="flex items-start justify-between">
                                                    <div className={`w-7 h-7 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl flex items-center justify-center transition-colors ${
                                                        isDragOver 
                                                            ? 'bg-cyan-500 text-white' 
                                                            : 'bg-cyan-50 dark:bg-cyan-950/40 text-cyan-500 border border-cyan-200 dark:border-cyan-800/60'
                                                    }`}>
                                                        <FolderOpen className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
                                                    </div>
                                                    <div className="flex gap-1 opacity-90 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setEditingParentFolder({ id: folder.id, name: folder.name });
                                                            }}
                                                            className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-400 hover:text-cyan-500"
                                                            title="Sửa tên thư mục"
                                                        >
                                                            <Edit3 className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                                                        </button>
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setDeletingParentFolder(folder);
                                                            }}
                                                            className="p-1 hover:bg-red-50 dark:hover:bg-red-950/30 rounded text-slate-400 hover:text-red-500"
                                                            title="Xóa thư mục"
                                                        >
                                                            <Trash2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                                                        </button>
                                                    </div>
                                                </div>

                                                <div>
                                                    <h3 className="font-extrabold text-xs sm:text-sm text-slate-900 dark:text-white leading-tight group-hover:text-cyan-500 transition-colors line-clamp-1">
                                                        {folder.name}
                                                    </h3>
                                                    <p className="text-[9px] sm:text-[10px] font-mono text-slate-400 mt-0.5">
                                                        {folder.setsCount} {t('library.setsUnit', 'Học phần')} • {folder.totalCards} {t('library.wordsUnit', 'Từ')}
                                                    </p>
                                                    {searchQuery && (() => {
                                                        const setsInside = folders.filter(f => f.parentId === folder.id);
                                                        const matchedCount = setsInside.reduce((sum, f) => {
                                                            const folderCards = filteredAllCards.filter(c => cardFolders[c.id] === f.id || c.folderId === f.id);
                                                            const matches = folderCards.filter(c => 
                                                                (c.front || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                                                                (c.back || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                                                                (c.sinoVietnamese || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                                                                (c.synonym || '').toLowerCase().includes(searchQuery.toLowerCase())
                                                            );
                                                            return sum + matches.length;
                                                        }, 0);
                                                        if (matchedCount > 0) {
                                                            return (
                                                                <span className="inline-block mt-1 text-[8px] sm:text-[9px] font-mono font-bold text-cyan-600 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-950/45 px-1.5 py-0.5 rounded-lg border border-cyan-200 dark:border-cyan-800/40">
                                                                    Khớp {matchedCount} từ
                                                                </span>
                                                            );
                                                        }
                                                        return null;
                                                    })()}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}

                {/* 2. STUDY SETS LIST GRID */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                        <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2 flex-wrap">
                            <Layers className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-500" />
                            <span>{searchQuery ? 'Kết quả tìm kiếm học phần' : (activeParentFolderId ? 'Học phần trong thư mục này' : t('library.studySets', 'Học phần'))}</span>
                            <span className="text-xs font-mono font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                                ({filteredStudySets.length})
                            </span>
                            {draggedStudySetId && (
                                <span className="text-[10px] sm:text-xs bg-cyan-50 dark:bg-cyan-950/60 border border-cyan-200 dark:border-cyan-800/60 text-cyan-600 dark:text-cyan-400 font-mono font-bold px-2.5 py-0.5 rounded-full animate-pulse">
                                    Kéo thả học phần vào thư mục
                                </span>
                            )}
                        </h2>

                        <button 
                            onClick={onNavigateToAdd}
                            className="px-3.5 py-1.5 sm:px-4 sm:py-2 bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-500/20 transition-all flex items-center gap-1.5 shrink-0 hover:scale-105 active:scale-95 cursor-pointer"
                        >
                            <Plus className="w-4 h-4" />
                            <span>{t('library.newSet', '+ Tạo học phần mới')}</span>
                        </button>
                    </div>

                    <p className="text-[11px] sm:text-xs text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-900 px-3.5 py-2.5 rounded-xl sm:rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-2">
                        {t('library.dragTip', '💡 Mẹo: Nhấn icon Di chuyển hoặc kéo thả học phần vào các thư mục để sắp xếp dễ dàng hơn.')}
                    </p>

                    <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-6">
                        {/* Unfiled cards set - Only show at root level */}
                        {!activeParentFolderId && !searchQuery && unfiledCount > 0 && (
                            <div 
                                onClick={() => onOpenStudySet('unfiled')}
                                className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl p-3.5 sm:p-6 border border-slate-200 dark:border-slate-800 shadow-md hover:border-cyan-400 dark:hover:border-cyan-500/50 cursor-pointer hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between group"
                            >
                                <div className="space-y-2.5 sm:space-y-3">
                                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 flex items-center justify-center">
                                        <Layers className="w-4 h-4 sm:w-5 sm:h-5 text-amber-500" />
                                    </div>
                                    <div>
                                        <h3 className="text-sm sm:text-lg font-bold text-slate-900 dark:text-white leading-tight group-hover:text-cyan-500 transition-colors">
                                            Từ vựng lẻ
                                        </h3>
                                        <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5 sm:mt-1 font-medium">Các từ vựng chưa phân loại</p>
                                    </div>
                                </div>
                                <div className="mt-4 sm:mt-6 pt-3 sm:pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] sm:text-xs font-mono font-bold text-slate-500">
                                    <span>{unfiledCount} {t('library.wordsUnit', 'Từ')}</span>
                                    <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-300 group-hover:translate-x-0.5 transition-transform" />
                                </div>
                            </div>
                        )}

                        {filteredStudySets.map(folder => (
                            <div 
                                key={folder.id}
                                onClick={() => onOpenStudySet(folder.id)}
                                draggable="true"
                                onDragStart={(e) => handleDragStart(e, folder.id)}
                                onDragEnd={handleDragEnd}
                                className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl p-3.5 sm:p-6 pt-3 sm:pt-5 border-t-4 border-t-emerald-500 border-x border-b border-slate-200 dark:border-slate-800 shadow-md hover:border-cyan-400 dark:hover:border-cyan-500/50 cursor-pointer hover:shadow-xl hover:-translate-y-1 transition-all duration-350 flex flex-col justify-between group relative overflow-hidden active:scale-98 cursor-grab"
                            >
                                <div className="space-y-2 sm:space-y-3">
                                    {/* Top row: Icon & Action buttons */}
                                    <div className="flex items-center justify-between gap-1.5 w-full">
                                        <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
                                            <Layers className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                        </div>

                                        <div className="flex items-center gap-0.5 sm:gap-1 shrink-0 z-20 opacity-90 sm:opacity-80 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setMovingStudySet({ id: folder.id, name: folder.name, parentId: folder.parentId });
                                                }}
                                                className="p-1 sm:p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-indigo-500 transition-colors flex items-center justify-center cursor-pointer"
                                                title="Di chuyển học phần vào thư mục"
                                            >
                                                <Move className="w-3.5 h-3.5" />
                                            </button>

                                            {onRenameFolder && (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setEditingStudySet({ id: folder.id, name: folder.name });
                                                    }}
                                                    className="p-1 sm:p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-emerald-500 transition-colors flex items-center justify-center cursor-pointer"
                                                    title="Sửa tên học phần"
                                                >
                                                    <Edit3 className="w-3.5 h-3.5" />
                                                </button>
                                            )}

                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    navigate(`/vocab/edit-set/${folder.id}`);
                                                }}
                                                className="p-1 sm:p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-emerald-500 transition-colors flex items-center justify-center cursor-pointer"
                                                title="Thêm từ vựng nhanh vào học phần này"
                                            >
                                                <Plus className="w-3.5 h-3.5" />
                                            </button>

                                            {onDeleteFolder && (
                                                <button
                                                    onClick={(e) => handleDeleteFolder(e, folder)}
                                                    className="p-1 sm:p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 text-slate-400 hover:text-red-500 transition-colors flex items-center justify-center cursor-pointer"
                                                    title="Xoá học phần"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    {/* Study set Title */}
                                    <div>
                                        <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white leading-snug group-hover:text-emerald-500 transition-colors line-clamp-2">
                                            {folder.name}
                                        </h3>
                                    </div>

                                    {(folder.coverImage || folder.description) && (
                                        <div className="flex gap-2.5 items-start">
                                            {folder.coverImage && (
                                                <div className="w-12 h-9 sm:w-16 sm:h-12 rounded-lg overflow-hidden relative shrink-0">
                                                    <img src={folder.coverImage} alt={folder.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                                                </div>
                                            )}
                                            {folder.description && (
                                                <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed font-medium flex-1">
                                                    {folder.description}
                                                </p>
                                            )}
                                        </div>
                                    )}
                                    {searchQuery && (() => {
                                        const matchedCards = filteredAllCards.filter(c => cardFolders[c.id] === folder.id || c.folderId === folder.id).filter(c => 
                                            (c.front || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                                            (c.reading || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                                            (c.frontWithFurigana || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                                            (c.back || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                                            (c.sinoVietnamese || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                                            (c.synonym || '').toLowerCase().includes(searchQuery.toLowerCase())
                                        );
                                        if (matchedCards.length > 0) {
                                            const isExpanded = expandedMatchSetIds.has(folder.id);
                                            const displayCards = isExpanded ? matchedCards : matchedCards.slice(0, 3);
                                            return (
                                                <div className="mt-2.5 flex flex-wrap gap-1.5 bg-emerald-50/70 dark:bg-emerald-950/30 p-2.5 rounded-xl border border-emerald-200/60 dark:border-emerald-900/40">
                                                    <div className="flex items-center justify-between w-full mb-1">
                                                        <span className="text-[10px] font-mono font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                                                            <Sparkles className="w-3 h-3 text-emerald-500" />
                                                            Từ vựng khớp ({matchedCards.length}):
                                                        </span>
                                                        <span className="text-[9px] text-emerald-600/80 dark:text-emerald-400/80 italic font-medium">Bấm để sửa</span>
                                                    </div>
                                                    {displayCards.map((c, idx) => (
                                                        <button
                                                            key={c.id || idx}
                                                            type="button"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setEditingCard(c);
                                                            }}
                                                            className="text-[11px] px-2 py-1 bg-white dark:bg-slate-900 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 text-emerald-900 dark:text-emerald-200 rounded-lg font-medium border border-emerald-200 dark:border-emerald-800 transition-all hover:scale-105 active:scale-95 flex items-center gap-1.5 shadow-xs cursor-pointer group/btn"
                                                            title="Bấm để chỉnh sửa trực tiếp từ vựng này"
                                                        >
                                                            <span className="font-japanese font-bold"><FuriganaText text={c.frontWithFurigana || c.front} /></span>
                                                            <span className="text-slate-500 dark:text-slate-400 text-[10px]">({c.back})</span>
                                                            <Edit3 className="w-2.5 h-2.5 text-emerald-600 dark:text-emerald-400 opacity-60 group-hover/btn:opacity-100 shrink-0" />
                                                        </button>
                                                    ))}
                                                    {matchedCards.length > 3 && (
                                                        <button
                                                            type="button"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                toggleExpandMatchSet(folder.id);
                                                            }}
                                                            className="text-[10px] px-2 py-1 bg-emerald-100/80 dark:bg-emerald-900/60 hover:bg-emerald-200 dark:hover:bg-emerald-800 text-emerald-800 dark:text-emerald-300 rounded-md font-mono font-bold transition-colors self-center cursor-pointer"
                                                        >
                                                            {isExpanded ? 'Thu gọn' : `+${matchedCards.length - 3} khác`}
                                                        </button>
                                                    )}
                                                </div>
                                            );
                                        }
                                        return null;
                                    })()}
                                </div>

                                <div className="mt-4 sm:mt-5 space-y-1.5 sm:space-y-2">
                                    <div className="flex items-center justify-between text-[9px] sm:text-[10px] font-mono font-extrabold text-slate-500 uppercase tracking-wider">
                                        <span>{folder.count} {t('library.wordsUnit', 'Từ')}</span>
                                        <span className="text-emerald-500">{folder.masteredPct}% {t('common.mastered', 'Đã thuộc')}</span>
                                    </div>
                                    <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                        <div 
                                            className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full"
                                            style={{ width: `${folder.masteredPct}%` }}
                                        />
                                    </div>
                                </div>
                            </div>
                        ))}

                        {/* Add Collection dashed card */}
                        <div
                            onClick={onNavigateToAdd}
                            className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl border-2 border-dashed border-slate-300 dark:border-slate-700 p-3.5 sm:p-6 flex flex-col items-center justify-center text-center cursor-pointer hover:border-cyan-400 dark:hover:border-cyan-500 transition-all h-full min-h-[130px] sm:min-h-[140px] group shadow-md"
                        >
                            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center mb-2 sm:mb-3 group-hover:scale-110 transition-transform">
                                <Plus className="w-4 h-4 sm:w-5 sm:h-5 text-cyan-500" />
                            </div>
                            <h3 className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm mb-0.5">{t('library.createSetCard', 'Tạo học phần')}</h3>
                            <p className="text-[10px] sm:text-[11px] text-slate-400 dark:text-slate-500 max-w-[150px] leading-relaxed font-medium">
                                {t('library.createSetCardSub', 'Xây dựng một bộ từ vựng tùy chỉnh mới.')}
                            </p>
                        </div>
                    </div>

                    {/* Empty State */}
                    {((activeParentFolderId && filteredStudySets.length === 0) || 
                      (!activeParentFolderId && (
                          searchQuery 
                              ? filteredStudySets.length === 0 
                              : (parentFolders.length === 0 && filteredStudySets.length === 0 && unfiledCount === 0)
                      ))) && (
                        <div className="py-16 flex flex-col items-center justify-center text-center bg-white dark:bg-gray-800 rounded-3xl border border-gray-200 dark:border-gray-700 animate-fade-in">
                            <div className="w-14 h-14 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4">
                                <Library className="w-7 h-7 text-gray-400" />
                            </div>
                            <h2 className="text-lg font-bold text-gray-800 dark:text-white mb-2">
                                {searchQuery ? 'Không tìm thấy kết quả' : 'Thư mục trống'}
                            </h2>
                            <p className="text-gray-500 dark:text-gray-400 max-w-xs text-xs font-medium">
                                {searchQuery 
                                    ? 'Không tìm thấy học phần nào phù hợp với tìm kiếm của bạn.'
                                    : (activeParentFolderId 
                                        ? 'Thư mục này chưa chứa học phần nào. Hãy kéo thả học phần bên ngoài vào đây hoặc bấm di chuyển.' 
                                        : 'Bạn chưa có học phần cá nhân nào. Hãy bấm "Tạo học phần mới" nhé!')}
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* MOVE STUDY SET TO FOLDER MODAL (Perfect for Mobile Touch & Desktop) */}
            {movingStudySet && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-3.5 sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in font-sans">
                    <div className="relative bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl shadow-2xl w-full max-w-md p-5 sm:p-6 space-y-4 border border-slate-200 dark:border-slate-800">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 flex items-center justify-center shrink-0">
                                    <Move className="w-5 h-5 text-indigo-500" />
                                </div>
                                <div className="min-w-0">
                                    <h3 className="font-extrabold text-base sm:text-lg text-slate-900 dark:text-white truncate">Di chuyển học phần</h3>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">"{movingStudySet.name}"</p>
                                </div>
                            </div>
                            <button onClick={() => setMovingStudySet(null)} className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                            Chọn thư mục đích để chuyển học phần này vào:
                        </p>

                        <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar pr-1">
                            {/* Option: Root Level (Gốc) */}
                            <button
                                type="button"
                                onClick={() => handleMoveStudySetToParent(movingStudySet.id, 'root')}
                                className={`w-full p-3 min-h-[48px] rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                                    !movingStudySet.parentId
                                        ? 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-500 text-indigo-700 dark:text-indigo-300 font-bold'
                                        : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 hover:border-indigo-400'
                                }`}
                            >
                                <div className="flex items-center gap-2.5">
                                    <Library className="w-4 h-4 text-indigo-500 shrink-0" />
                                    <span className="text-xs font-semibold">Gốc (Không thuộc thư mục nào)</span>
                                </div>
                                {!movingStudySet.parentId && <span className="text-[10px] font-mono bg-indigo-500 text-white px-2 py-0.5 rounded-full font-bold">Hiện tại</span>}
                            </button>

                            {/* Options: Parent Folders */}
                            {parentFolders.map(pf => {
                                const isCurrent = movingStudySet.parentId === pf.id;
                                return (
                                    <button
                                        key={pf.id}
                                        type="button"
                                        onClick={() => handleMoveStudySetToParent(movingStudySet.id, pf.id)}
                                        className={`w-full p-3 min-h-[48px] rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                                            isCurrent
                                                ? 'bg-cyan-50 dark:bg-cyan-950/40 border-cyan-500 text-cyan-700 dark:text-cyan-300 font-bold'
                                                : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 hover:border-cyan-400'
                                        }`}
                                    >
                                        <div className="flex items-center gap-2.5 min-w-0">
                                            <FolderOpen className="w-4 h-4 text-cyan-500 shrink-0" />
                                            <span className="text-xs font-semibold truncate">{pf.name}</span>
                                        </div>
                                        {isCurrent && <span className="text-[10px] font-mono bg-cyan-500 text-white px-2 py-0.5 rounded-full font-bold shrink-0">Hiện tại</span>}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            {/* CREATE PARENT FOLDER MODAL */}
            {showCreateFolderModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowCreateFolderModal(false)}></div>
                    <form onSubmit={handleCreateParentFolder} className="relative bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4 border border-gray-200 dark:border-slate-700 animate-scale-up">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 flex items-center justify-center flex-shrink-0">
                                <FolderPlus className="w-5 h-5 text-indigo-500" />
                            </div>
                            <div>
                                <h3 className="font-bold text-lg text-gray-800 dark:text-white">Thư mục mới</h3>
                                <p className="text-xs text-gray-400">Tạo thư mục để gom nhóm các học phần.</p>
                            </div>
                        </div>
                        <input
                            type="text"
                            placeholder="Nhập tên thư mục..."
                            value={newFolderName}
                            onChange={(e) => setNewFolderName(e.target.value)}
                            required
                            autoFocus
                            className="w-full bg-white dark:bg-gray-905 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-gray-850 dark:text-white"
                        />
                        <div className="flex gap-3 pt-2">
                            <button
                                type="button"
                                onClick={() => setShowCreateFolderModal(false)}
                                className="flex-1 py-2.5 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 font-bold rounded-xl hover:bg-gray-200 dark:hover:bg-slate-650 transition-colors text-xs"
                            >
                                Huỷ
                            </button>
                            <button
                                type="submit"
                                className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-colors text-xs shadow-md"
                            >
                                Tạo thư mục
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* RENAME PARENT FOLDER MODAL */}
            {editingParentFolder && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setEditingParentFolder(null)}></div>
                    <form onSubmit={handleRenameParentFolder} className="relative bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4 border border-gray-200 dark:border-slate-700 animate-scale-up">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 flex items-center justify-center flex-shrink-0">
                                <Folder className="w-5 h-5 text-indigo-500" />
                            </div>
                            <div>
                                <h3 className="font-bold text-lg text-gray-800 dark:text-white">Đổi tên thư mục</h3>
                                <p className="text-xs text-gray-400">Thay đổi tên gọi của thư mục.</p>
                            </div>
                        </div>
                        <input
                            type="text"
                            placeholder="Nhập tên mới..."
                            value={editingParentFolder.name}
                            onChange={(e) => setEditingParentFolder({ ...editingParentFolder, name: e.target.value })}
                            required
                            autoFocus
                            className="w-full bg-white dark:bg-gray-905 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-gray-850 dark:text-white"
                        />
                        <div className="flex gap-3 pt-2">
                            <button
                                type="button"
                                onClick={() => setEditingParentFolder(null)}
                                className="flex-1 py-2.5 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 font-bold rounded-xl hover:bg-gray-200 dark:hover:bg-slate-650 transition-colors text-xs"
                            >
                                Huỷ
                            </button>
                            <button
                                type="submit"
                                className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-colors text-xs shadow-md"
                            >
                                Lưu thay đổi
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* DELETE PARENT FOLDER MODAL */}
            {deletingParentFolder && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setDeletingParentFolder(null)}></div>
                    <div className="relative bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4 border border-gray-200 dark:border-slate-700 animate-scale-up">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center flex-shrink-0">
                                <Trash2 className="w-5 h-5 text-red-500" />
                            </div>
                            <div>
                                <h3 className="font-bold text-lg text-gray-800 dark:text-white">Xóa thư mục</h3>
                                <p className="text-xs text-gray-400">Thao tác này không thể hoàn tác.</p>
                            </div>
                        </div>
                        <p className="text-gray-600 dark:text-gray-300 text-sm font-medium">
                            Bạn có chắc muốn xóa thư mục <strong>"{deletingParentFolder.name}"</strong>? 
                            Các học phần bên trong thư mục này sẽ **không** bị xóa, chúng sẽ quay về danh sách học phần riêng lẻ bên ngoài.
                        </p>
                        <div className="flex gap-3 pt-2">
                            <button
                                onClick={() => setDeletingParentFolder(null)}
                                className="flex-1 py-2.5 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 font-bold rounded-xl hover:bg-gray-200 dark:hover:bg-slate-650 transition-colors text-xs"
                            >
                                Huỷ
                            </button>
                            <button
                                onClick={handleDeleteParentFolderConfirm}
                                className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl transition-colors text-xs shadow-md"
                            >
                                Xác nhận xóa
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Study Set Confirmation Modal */}
            {deletingFolder && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setDeletingFolder(null)}>
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm"></div>
                    <div className="relative bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4 border border-gray-200 dark:border-slate-700 animate-scale-up"
                        onClick={e => e.stopPropagation()}>
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center flex-shrink-0">
                                <Trash2 className="w-5 h-5 text-red-500" />
                            </div>
                            <div>
                                <h3 className="font-bold text-lg text-gray-800 dark:text-white">Xoá học phần</h3>
                                <p className="text-xs text-gray-500 dark:text-gray-400">Thao tác này không thể hoàn tác.</p>
                            </div>
                        </div>
                        <p className="text-gray-600 dark:text-gray-300 text-sm font-medium">
                            Bạn có chắc muốn xoá học phần <strong>"{deletingFolder.name}"</strong>? Toàn bộ từ vựng trong học phần này cũng sẽ bị xoá vĩnh viễn.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setDeletingFolder(null)}
                                className="flex-1 py-2.5 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 font-bold rounded-xl hover:bg-gray-200 dark:hover:bg-slate-650 transition-colors text-xs"
                            >
                                Huỷ
                            </button>
                            <button
                                onClick={confirmDelete}
                                className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl transition-colors text-xs"
                            >
                                Xoá
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* RENAME STUDY SET MODAL */}
            {editingStudySet && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setEditingStudySet(null)}></div>
                    <form onSubmit={handleRenameStudySet} className="relative bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4 border border-gray-200 dark:border-slate-700 animate-scale-up">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 flex items-center justify-center flex-shrink-0">
                                <Layers className="w-5 h-5 text-indigo-500" />
                            </div>
                            <div>
                                <h3 className="font-bold text-lg text-gray-800 dark:text-white">Đổi tên học phần</h3>
                                <p className="text-xs text-gray-400">Thay đổi tên gọi của học phần này.</p>
                            </div>
                        </div>
                        <input
                            type="text"
                            placeholder="Nhập tên mới..."
                            value={editingStudySet.name}
                            onChange={(e) => setEditingStudySet({ ...editingStudySet, name: e.target.value })}
                            required
                            autoFocus
                            className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-gray-800 dark:text-white"
                        />
                        <div className="flex gap-3 pt-2">
                            <button
                                type="button"
                                onClick={() => setEditingStudySet(null)}
                                className="flex-1 py-2.5 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 font-bold rounded-xl hover:bg-gray-200 dark:hover:bg-slate-650 transition-colors text-xs"
                            >
                                Huỷ
                            </button>
                            <button
                                type="submit"
                                className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-colors text-xs shadow-md"
                            >
                                Lưu thay đổi
                            </button>
                        </div>
                    </form>
                </div>
            )}
            {/* EDIT VOCABULARY CARD MODAL POPUP */}
            {editingCard && (
                <EditCardModal
                    card={editingCard}
                    onSave={async (cardIdOrData, updatedData) => {
                        if (onSaveChanges) {
                            await onSaveChanges(cardIdOrData, updatedData);
                        } else if (onUpdateCard) {
                            await onUpdateCard(cardIdOrData, 'all', updatedData);
                        }
                        setEditingCard(null);
                        showToast('Đã cập nhật từ vựng thành công!', 'success');
                    }}
                    onClose={() => setEditingCard(null)}
                    onGeminiAssist={onGeminiAssist}
                    allCards={allCards}
                    canUserUseAI={canUserUseAI}
                />
            )}
        </div>
    );
};

export default LibraryScreen;
