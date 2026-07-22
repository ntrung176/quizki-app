import React, { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Folder, Plus, Library, Trash2, X, Search, ChevronRight, Layers, GraduationCap, Play, FolderPlus, Edit3, FolderOpen, ArrowLeft, Move, Cpu } from 'lucide-react'
import { TopTabBar } from '../ui';
import { VOCAB_TABS } from '../../config/tabs';
import useMenuTransition from '../../hooks/useMenuTransition';

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
    onMoveStudySetToParentFolder
}) => {
    const navigate = useNavigate();
    const fadeWholePage = useMenuTransition();
    const [deletingFolder, setDeletingFolder] = useState(null); // Study Set deletion
    const [searchQuery, setSearchQuery] = useState('');

    // Study Set editing state
    const [editingStudySet, setEditingStudySet] = useState(null); // { id, name }

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

    // Close move menu on outside click
    useEffect(() => {
        const handleOutsideClick = () => {
            setActiveMenuStudySetId(null);
        };
        window.addEventListener('click', handleOutsideClick);
        return () => window.removeEventListener('click', handleOutsideClick);
    }, []);

    // Calculate counts and stats for Study Sets
    const unfiledCount = useMemo(() => {
        return allCards.filter(c => !cardFolders[c.id]).length;
    }, [allCards, cardFolders]);

    const foldersWithCounts = useMemo(() => {
        return folders.map(f => {
            const folderCards = allCards.filter(c => cardFolders[c.id] === f.id);
            const count = folderCards.length;

            // Calculate progress/mastery (cards with seenCount > 0)
            const masteredCount = folderCards.filter(c => (c.seenCount || 0) > 0).length;
            const masteredPct = count > 0 ? Math.round((masteredCount / count) * 100) : 0;

            return { ...f, count, masteredPct };
        });
    }, [folders, allCards, cardFolders]);

    // Choose the first folder as the featured folder to study (only from root level)
    const featuredFolder = useMemo(() => {
        const rootSets = foldersWithCounts.filter(f => !f.parentId);
        if (rootSets.length === 0) return null;
        // Sort root sets by creation time (newest first)
        const sortedRootSets = [...rootSets].sort((a, b) => {
            const timeA = a.createdAt?.seconds || (a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0) || (a.createdAt instanceof Date ? a.createdAt.getTime() : 0) || 0;
            const timeB = b.createdAt?.seconds || (b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0) || (b.createdAt instanceof Date ? b.createdAt.getTime() : 0) || 0;
            return timeB - timeA;
        });
        return sortedRootSets[0];
    }, [foldersWithCounts]);

    // Filter and sort Study Sets based on active parent folder and search query
    const filteredStudySets = useMemo(() => {
        const result = foldersWithCounts.filter(f => {
            // Match cards/vocab inside this study set if searching
            const folderCards = allCards.filter(c => cardFolders[c.id] === f.id);
            const matchesVocab = searchQuery
                ? folderCards.some(c => 
                    (c.front || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
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
                : !f.parentId;

            return matchesParent;
        });

        // Sắp xếp học phần theo thời gian tạo mới nhất trước đến cũ nhất
        return result.sort((a, b) => {
            const timeA = a.createdAt?.seconds || (a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0) || (a.createdAt instanceof Date ? a.createdAt.getTime() : 0) || 0;
            const timeB = b.createdAt?.seconds || (b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0) || (b.createdAt instanceof Date ? b.createdAt.getTime() : 0) || 0;
            return timeB - timeA;
        });
    }, [foldersWithCounts, activeParentFolderId, searchQuery, allCards, cardFolders]);

    // Parent Folders with Study Set counts
    const parentFoldersWithCounts = useMemo(() => {
        const result = parentFolders.map(pf => {
            const setsInside = folders.filter(f => f.parentId === pf.id);
            const setsCount = setsInside.length;
            const totalCards = setsInside.reduce((sum, f) => {
                const folderCards = allCards.filter(c => cardFolders[c.id] === f.id);
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

                const folderCards = allCards.filter(c => cardFolders[c.id] === f.id);
                return folderCards.some(c => 
                    (c.front || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
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
    }, [parentFolders, folders, allCards, cardFolders, searchQuery]);

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

    // Drag and Drop implementation
    const handleDragStart = (e, studySetId) => {
        e.stopPropagation();
        e.dataTransfer.setData('studySetId', studySetId);
        e.dataTransfer.effectAllowed = 'move';
        setDraggedStudySetId(studySetId);
    };

    const handleDragEnd = () => {
        setDraggedStudySetId(null);
        setDragOverFolderId(null);
        setDragOverRoot(false);
    };

    const handleDropOnFolder = async (e, parentFolderId) => {
        e.preventDefault();
        const studySetId = e.dataTransfer.getData('studySetId');
        if (studySetId && onMoveStudySetToParentFolder) {
            await onMoveStudySetToParentFolder(studySetId, parentFolderId);
        }
        setDragOverFolderId(null);
        setDraggedStudySetId(null);
    };

    const handleDropOnRoot = async (e) => {
        e.preventDefault();
        const studySetId = e.dataTransfer.getData('studySetId');
        if (studySetId && onMoveStudySetToParentFolder) {
            await onMoveStudySetToParentFolder(studySetId, 'root');
        }
        setDragOverRoot(false);
        setDraggedStudySetId(null);
    };

    const handleMoveViaDropdown = async (e, studySetId, parentFolderId) => {
        e.stopPropagation();
        if (onMoveStudySetToParentFolder) {
            await onMoveStudySetToParentFolder(studySetId, parentFolderId);
        }
        setActiveMenuStudySetId(null);
    };

    const activeFolderName = useMemo(() => {
        if (!activeParentFolderId) return '';
        const found = parentFolders.find(pf => pf.id === activeParentFolderId);
        return found ? found.name : '';
    }, [activeParentFolderId, parentFolders]);

    return (
        <div className="w-full pb-16 min-h-screen bg-transparent">
            <TopTabBar tabs={VOCAB_TABS} />

            <div className="max-w-6xl mx-auto px-4 md:px-8 mt-6 space-y-8 animate-fade-in">
                {/* Cyber-AI Header Banner */}
                <div className="relative overflow-hidden bg-white dark:bg-slate-900 border border-slate-200 dark:border-cyan-500/30 rounded-3xl p-6 md:p-8 text-slate-800 dark:text-slate-100 shadow-xl relative group">
                    <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/10 dark:bg-indigo-500/15 rounded-full blur-3xl pointer-events-none"></div>
                    <div className="absolute bottom-0 left-0 w-60 h-60 bg-cyan-500/10 dark:bg-cyan-600/15 rounded-full blur-3xl pointer-events-none"></div>

                    <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div className="space-y-2">
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-50 dark:bg-cyan-950/60 border border-cyan-200 dark:border-cyan-800/60 text-cyan-700 dark:text-cyan-400 text-xs font-mono font-bold uppercase tracking-wider">
                                <Cpu className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400 animate-spin-slow" />
                                <span>[NEURAL LIBRARY HUD]</span>
                            </div>
                            <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Thư viện Từ vựng</h1>
                            <p className="text-slate-600 dark:text-slate-300 text-sm max-w-xl font-medium">
                                Quản lý các thư mục, học phần học tập cá nhân và kéo thả để phân loại dễ dàng.
                            </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-3">
                            {/* Search Bar */}
                            <div className="relative w-full sm:w-60">
                                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                <input
                                    type="text"
                                    placeholder="Tìm kiếm học phần, thư mục..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-9 pr-8 py-2.5 text-xs font-medium rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-cyan-400 font-mono shadow-inner"
                                />
                                {searchQuery && (
                                    <button 
                                        onClick={() => setSearchQuery('')}
                                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                                    >
                                        <X className="w-3.5 h-3.5" />
                                    </button>
                                )}
                            </div>
                            {onAddParentFolder && (
                                <button
                                    onClick={() => setShowCreateFolderModal(true)}
                                    className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 rounded-xl text-xs font-mono font-bold transition-all flex items-center gap-1.5 shrink-0 border border-slate-200 dark:border-slate-700 cursor-pointer shadow-sm"
                                >
                                    <FolderPlus className="w-4 h-4 text-cyan-500" />
                                    Thư mục mới
                                </button>
                            )}
                            <button 
                                onClick={onNavigateToAdd}
                                className="px-4 py-2.5 bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-600 hover:to-indigo-700 text-white rounded-xl text-xs font-mono font-bold shadow-md transition-all flex items-center gap-1.5 shrink-0 hover:scale-105 active:scale-95 cursor-pointer"
                            >
                                <Plus className="w-4 h-4" />
                                Tạo học phần mới
                            </button>
                        </div>
                    </div>
                </div>

                {/* Breadcrumb Navigation when inside a Folder */}
                {activeParentFolderId && (
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-200/60 dark:border-gray-700 shadow-sm">
                        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 font-medium">
                            <button 
                                onClick={() => setActiveParentFolderId(null)}
                                className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors flex items-center gap-1 font-bold"
                            >
                                <Library className="w-4 h-4" />
                                Thư viện
                            </button>
                            <ChevronRight className="w-4 h-4 text-gray-400" />
                            <div className="flex items-center gap-1.5 bg-indigo-50 dark:bg-indigo-950/40 px-3 py-1 rounded-lg text-indigo-600 dark:text-indigo-400 font-bold">
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
                                        : 'bg-gray-50 dark:bg-gray-900/40 border-gray-300 dark:border-gray-700 text-gray-500 dark:text-gray-400'
                                }`}
                            >
                                <Move className="w-4 h-4 animate-bounce" />
                                Kéo học phần vào đây để đưa ra ngoài thư mục
                            </div>
                        )}

                        <button
                            onClick={() => setActiveParentFolderId(null)}
                            className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-650 text-gray-700 dark:text-gray-200 font-bold text-xs rounded-xl transition-all flex items-center gap-1 self-start sm:self-auto"
                        >
                            <ArrowLeft className="w-3.5 h-3.5" />
                            Quay lại Thư viện
                        </button>
                    </div>
                )}

                {/* Top Featured Banner (Matches Screenshot 3) - Only show at root level */}
                {!activeParentFolderId && !searchQuery && featuredFolder && (
                    <div className="bg-slate-900 dark:bg-slate-950 rounded-3xl p-6 md:p-8 text-white flex flex-col md:flex-row items-center justify-between gap-6 border border-slate-800 shadow-xl overflow-hidden relative">
                        <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-br from-indigo-500/10 to-sky-500/10 rounded-full blur-3xl transform translate-x-1/3 -translate-y-1/3 pointer-events-none" />

                        <div className="space-y-4 max-w-xl z-10 flex-1">
                            <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-500/20 border border-indigo-500/30 rounded-full text-[10px] font-bold text-indigo-300 tracking-wider uppercase">
                                Học phần đang học
                            </div>
                            <h2 className="text-2xl md:text-3xl font-black tracking-tight">{featuredFolder.name}</h2>
                            <p className="text-slate-400 text-xs md:text-sm font-medium">
                                {featuredFolder.count} Từ • Đã thuộc {featuredFolder.masteredPct}%
                            </p>
                            {/* Mastery Bar */}
                            <div className="w-full max-w-md h-2 bg-slate-800 rounded-full overflow-hidden">
                                <div 
                                    className="h-full bg-gradient-to-r from-indigo-400 to-sky-400 rounded-full transition-all duration-500"
                                    style={{ width: `${featuredFolder.masteredPct}%` }}
                                />
                            </div>
                            <button
                                onClick={() => onOpenStudySet(featuredFolder.id)}
                                className="px-6 py-2.5 bg-white hover:bg-slate-100 text-slate-900 rounded-xl text-xs font-black shadow-md hover:shadow-lg transition-all flex items-center gap-1.5 cursor-pointer"
                            >
                                <Play className="w-3.5 h-3.5 fill-current" />
                                TIẾP TỤC HỌC
                            </button>
                        </div>

                        {/* Visual Right graphic */}
                        <div className="shrink-0 w-28 h-28 rounded-2xl bg-slate-800/40 border border-slate-700/60 flex flex-col items-center justify-center shadow-[0_0_40px_rgba(99,102,241,0.1)] z-10">
                            <GraduationCap className="w-12 h-12 text-indigo-400 animate-pulse" />
                            <span className="text-[9px] tracking-[0.2em] text-slate-500 font-bold mt-2">ĐANG HỌC</span>
                        </div>
                    </div>
                )}

                {/* 1. PARENT FOLDERS GRID SECTION - Only show at root level */}
                {(!activeParentFolderId || searchQuery) && (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                                <Folder className="w-5 h-5 text-indigo-500" />
                                Thư mục quản lý ({parentFoldersWithCounts.length})
                            </h2>
                        </div>

                        {parentFoldersWithCounts.length === 0 ? (
                            <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-md text-slate-400 dark:text-slate-500 text-xs italic">
                                {searchQuery ? 'Không tìm thấy thư mục nào phù hợp.' : 'Chưa có thư mục nào. Bạn có thể nhấn "Thư mục mới" ở trên để phân loại học phần.'}
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
                                {parentFoldersWithCounts.map(folder => {
                                    const isDragOver = dragOverFolderId === folder.id;
                                    return (
                                        <div 
                                            key={folder.id}
                                            onClick={() => setActiveParentFolderId(folder.id)}
                                            onDragOver={(e) => { e.preventDefault(); setDragOverFolderId(folder.id); }}
                                            onDragLeave={() => setDragOverFolderId(null)}
                                            onDrop={(e) => handleDropOnFolder(e, folder.id)}
                                            className={`bg-white dark:bg-slate-900 border-l-4 border-l-cyan-500 border-y border-r border-slate-200 dark:border-slate-800 hover:border-cyan-400 dark:hover:border-cyan-500/50 p-5 rounded-r-2xl rounded-l-md cursor-pointer transition-all duration-200 hover:shadow-xl shadow-md flex flex-col justify-between group relative overflow-hidden h-36 ${
                                                isDragOver 
                                                    ? 'border-cyan-500 bg-cyan-50 dark:bg-slate-850 scale-102 ring-2 ring-cyan-500/20' 
                                                    : ''
                                            }`}
                                        >
                                            {/* Folder icon decoration background */}
                                            <div className="absolute right-0 bottom-0 translate-x-4 translate-y-4 opacity-5 group-hover:scale-110 transition-transform">
                                                <Folder className="w-24 h-24 text-cyan-500" />
                                            </div>

                                            <div className="space-y-3 relative z-10 w-full">
                                                <div className="flex items-start justify-between">
                                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
                                                        isDragOver 
                                                            ? 'bg-cyan-500 text-white' 
                                                            : 'bg-cyan-50 dark:bg-cyan-950/40 text-cyan-500 border border-cyan-200 dark:border-cyan-800/60'
                                                    }`}>
                                                        <FolderOpen className="w-5 h-5" />
                                                    </div>
                                                    <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setEditingParentFolder({ id: folder.id, name: folder.name });
                                                            }}
                                                            className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-400 hover:text-cyan-500"
                                                            title="Sửa tên thư mục"
                                                        >
                                                            <Edit3 className="w-3.5 h-3.5" />
                                                        </button>
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setDeletingParentFolder(folder);
                                                            }}
                                                            className="p-1 hover:bg-red-50 dark:hover:bg-red-950/30 rounded text-slate-400 hover:text-red-500"
                                                            title="Xóa thư mục"
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                </div>

                                                <div>
                                                    <h3 className="font-bold text-slate-900 dark:text-white leading-snug group-hover:text-cyan-500 transition-colors line-clamp-1">
                                                        {folder.name}
                                                    </h3>
                                                    <p className="text-[10px] font-mono text-slate-400 mt-0.5">
                                                        {folder.setsCount} Học phần • {folder.totalCards} Từ
                                                    </p>
                                                    {searchQuery && (() => {
                                                        const setsInside = folders.filter(f => f.parentId === folder.id);
                                                        const matchedCount = setsInside.reduce((sum, f) => {
                                                            const folderCards = allCards.filter(c => cardFolders[c.id] === f.id);
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
                                                                <span className="inline-block mt-1 text-[9px] font-mono font-bold text-cyan-600 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-950/45 px-2 py-0.5 rounded-lg border border-cyan-200 dark:border-cyan-800/40">
                                                                    Khớp {matchedCount} từ vựng
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
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2 flex-wrap">
                        <Layers className="w-5 h-5 text-cyan-500" />
                        {searchQuery ? 'Kết quả tìm kiếm học phần' : (activeParentFolderId ? 'Học phần trong thư mục này' : 'Học phần')} ({filteredStudySets.length})
                        {draggedStudySetId && (
                            <span className="text-xs bg-cyan-50 dark:bg-cyan-950/60 border border-cyan-200 dark:border-cyan-800/60 text-cyan-600 dark:text-cyan-400 font-mono font-bold px-3 py-1 rounded-full animate-pulse">
                                Kéo học phần thả vào các thư mục để sắp xếp
                            </span>
                        )}
                    </h2>

                    <p className="text-xs text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-900 px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-md flex items-center gap-2">
                        <span className="text-cyan-500 font-bold">💡 Mẹo:</span>
                        <span>Bạn có thể nhấn giữ và kéo thả các học phần vào các thư mục để sắp xếp và phân loại chúng dễ dàng hơn.</span>
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {/* Unfiled cards set - Only show at root level */}
                        {!activeParentFolderId && !searchQuery && unfiledCount > 0 && (
                            <div 
                                onClick={() => onOpenStudySet('unfiled')}
                                className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-md hover:border-cyan-400 dark:hover:border-cyan-500/50 cursor-pointer hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between group"
                            >
                                <div className="space-y-3">
                                    <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 flex items-center justify-center">
                                        <Layers className="w-5 h-5 text-amber-500" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold text-slate-900 dark:text-white leading-tight group-hover:text-cyan-500 transition-colors">
                                            Từ vựng lẻ
                                        </h3>
                                        <p className="text-xs text-slate-400 mt-1 font-medium">Các từ vựng chưa phân loại</p>
                                    </div>
                                </div>
                                <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs font-mono font-bold text-slate-500">
                                    <span>{unfiledCount} Từ</span>
                                    <ChevronRight className="w-4 h-4 text-slate-300 group-hover:translate-x-0.5 transition-transform" />
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
                                className="bg-white dark:bg-slate-900 rounded-3xl p-6 pt-5 border-t-4 border-t-emerald-500 border-x border-b border-slate-200 dark:border-slate-800 shadow-md hover:border-cyan-400 dark:hover:border-cyan-500/50 cursor-pointer hover:shadow-xl hover:-translate-y-1 transition-all duration-350 flex flex-col justify-between group relative overflow-hidden active:scale-98 cursor-grab"
                            >
                                <div className="space-y-4">
                                    <div className="flex items-start justify-between gap-3 w-full">
                                        <div className="flex-1 min-w-0">
                                            <h3 className="text-base font-extrabold text-slate-900 dark:text-white leading-snug group-hover:text-emerald-500 transition-colors line-clamp-2">
                                                {folder.name}
                                            </h3>
                                        </div>

                                        <div className="flex items-center gap-1 shrink-0 z-20 opacity-80 group-hover:opacity-100 transition-opacity">
                                            {onRenameFolder && (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setEditingStudySet({ id: folder.id, name: folder.name });
                                                    }}
                                                    className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-emerald-500 transition-colors"
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
                                                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-emerald-500 transition-colors"
                                                title="Thêm từ vựng nhanh vào học phần này"
                                            >
                                                <Plus className="w-3.5 h-3.5" />
                                            </button>

                                            {onDeleteFolder && (
                                                <button
                                                    onClick={(e) => handleDeleteFolder(e, folder)}
                                                    className="p-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 text-slate-400 hover:text-red-500 transition-colors"
                                                    title="Xoá học phần"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    {(folder.coverImage || folder.description) && (
                                        <div className="flex gap-3 items-start">
                                            {folder.coverImage && (
                                                <div className="w-16 h-12 rounded-lg overflow-hidden relative shrink-0">
                                                    <img src={folder.coverImage} alt={folder.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                                                </div>
                                            )}
                                            {folder.description && (
                                                <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed font-medium flex-1">
                                                    {folder.description}
                                                </p>
                                            )}
                                        </div>
                                    )}
                                    {searchQuery && (() => {
                                        const matchedCards = allCards.filter(c => cardFolders[c.id] === folder.id).filter(c => 
                                            (c.front || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                                            (c.back || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                                            (c.sinoVietnamese || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                                            (c.synonym || '').toLowerCase().includes(searchQuery.toLowerCase())
                                        );
                                        if (matchedCards.length > 0) {
                                            return (
                                                <div className="mt-2 flex flex-wrap gap-1 bg-emerald-50/50 dark:bg-emerald-950/20 p-2 rounded-xl border border-emerald-100 dark:border-emerald-900/30">
                                                    <span className="text-[10px] font-mono font-bold text-emerald-600 dark:text-emerald-400 block w-full mb-0.5">
                                                        Từ vựng khớp ({matchedCards.length}):
                                                    </span>
                                                    {matchedCards.slice(0, 2).map((c, idx) => (
                                                        <span key={idx} className="text-[10px] px-1.5 py-0.5 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300 rounded font-medium">
                                                            {c.front} ({c.back})
                                                        </span>
                                                    ))}
                                                    {matchedCards.length > 2 && (
                                                        <span className="text-[9px] text-slate-400 font-medium self-center ml-1 font-mono">
                                                            +{matchedCards.length - 2} khác
                                                        </span>
                                                    )}
                                                </div>
                                            );
                                        }
                                        return null;
                                    })()}
                                </div>

                                <div className="mt-5 space-y-2">
                                    <div className="flex items-center justify-between text-[10px] font-mono font-extrabold text-slate-500 uppercase tracking-wider">
                                        <span>{folder.count} Từ vựng</span>
                                        <span className="text-emerald-500">{folder.masteredPct}% Đã thuộc</span>
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
                            className="bg-white dark:bg-slate-900 rounded-3xl border-2 border-dashed border-slate-300 dark:border-slate-700 p-6 flex flex-col items-center justify-center text-center cursor-pointer hover:border-cyan-400 dark:hover:border-cyan-500 transition-all h-full min-h-[140px] group shadow-md"
                        >
                            <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                                <Plus className="w-5 h-5 text-cyan-500" />
                            </div>
                            <h3 className="font-bold text-slate-900 dark:text-white text-sm mb-0.5">Tạo học phần</h3>
                            <p className="text-[11px] text-slate-400 dark:text-slate-500 max-w-[150px] leading-relaxed font-medium">
                                Xây dựng một bộ từ vựng tùy chỉnh mới.
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
        </div>
    );
};

export default LibraryScreen;
