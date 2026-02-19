import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Trash2, ChevronLeft, ChevronRight, BookOpen, Clock, CheckCircle, AlertCircle, Filter, X, Eye, Folder, FolderPlus, FolderOpen, Edit, Plus, List } from 'lucide-react';
import { db, appId } from '../../config/firebase';
import { collection, getDocs, doc, deleteDoc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { ROUTES } from '../../router';
import { JOTOBA_KANJI_DATA, getJotobaKanjiData } from '../../data/jotobaKanjiData';

const JLPT_LEVELS = ['N5', 'N4', 'N3', 'N2', 'N1'];

const LEVEL_COLORS = {
    N5: { bg: 'bg-emerald-500', text: 'text-emerald-500', border: 'border-emerald-500', light: 'bg-emerald-50 dark:bg-emerald-900/20' },
    N4: { bg: 'bg-sky-500', text: 'text-sky-500', border: 'border-sky-500', light: 'bg-sky-50 dark:bg-sky-900/20' },
    N3: { bg: 'bg-violet-500', text: 'text-violet-500', border: 'border-violet-500', light: 'bg-violet-50 dark:bg-violet-900/20' },
    N2: { bg: 'bg-amber-500', text: 'text-amber-500', border: 'border-amber-500', light: 'bg-amber-50 dark:bg-amber-900/20' },
    N1: { bg: 'bg-rose-500', text: 'text-rose-500', border: 'border-rose-500', light: 'bg-rose-50 dark:bg-rose-900/20' },
};

const getSrsStatus = (srs) => {
    if (!srs) return { label: 'Chưa ôn', color: 'text-gray-400', bg: 'bg-gray-100 dark:bg-gray-700', icon: AlertCircle };
    const interval = srs.interval || 0;
    const reps = srs.reps || 0;
    const now = Date.now();
    const isDue = (srs.nextReview || 0) <= now;

    if (reps === 0 && interval === 0) return { label: 'Mới', color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-900/30', icon: BookOpen };
    if (isDue) return { label: 'Cần ôn', color: 'text-orange-500', bg: 'bg-orange-50 dark:bg-orange-900/30', icon: Clock };
    if (interval < 60) return { label: 'Đang học', color: 'text-yellow-500', bg: 'bg-yellow-50 dark:bg-yellow-900/30', icon: BookOpen };
    if (interval < 1440 * 7) return { label: 'Ngắn hạn', color: 'text-cyan-500', bg: 'bg-cyan-50 dark:bg-cyan-900/30', icon: Clock };
    return { label: 'Đã thuộc', color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-900/30', icon: CheckCircle };
};

const formatNextReview = (nextReview) => {
    if (!nextReview) return '';
    const now = Date.now();
    const diff = nextReview - now;
    if (diff <= 0) return 'Ngay bây giờ';
    const minutes = Math.floor(diff / 60000);
    if (minutes < 60) return `${minutes} phút`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} giờ`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days} ngày`;
    return `${Math.floor(days / 30)} tháng`;
};

const KanjiSRSListScreen = () => {
    const navigate = useNavigate();
    const [kanjiList, setKanjiList] = useState([]);
    const [srsData, setSrsData] = useState({});
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterLevel, setFilterLevel] = useState('all');
    const [filterStatus, setFilterStatus] = useState('all');
    const [selectedIds, setSelectedIds] = useState(new Set());
    const [deleting, setDeleting] = useState(false);
    const [showConfirmDelete, setShowConfirmDelete] = useState(false);

    // Folder management — with parentId for nesting
    const [folders, setFolders] = useState(() => {
        const saved = localStorage.getItem('kanji_srs_folders');
        return saved ? JSON.parse(saved) : [];
    });
    const [kanjiCardFolders, setKanjiCardFolders] = useState(() => {
        const saved = localStorage.getItem('kanji_srs_card_folders');
        return saved ? JSON.parse(saved) : {};
    });
    const [filterFolder, setFilterFolder] = useState('all');
    const [showFolderManager, setShowFolderManager] = useState(false);
    const [showMoveModal, setShowMoveModal] = useState(null);
    const [showBatchMoveModal, setShowBatchMoveModal] = useState(false);
    const [newFolderName, setNewFolderName] = useState('');
    const [editingFolderId, setEditingFolderId] = useState(null);
    const [editingFolderName, setEditingFolderName] = useState('');
    // Folder browse state
    const [currentFolder, setCurrentFolder] = useState(null);
    const [showNewSubFolderInput, setShowNewSubFolderInput] = useState(false);
    const [newSubFolderInput, setNewSubFolderInput] = useState('');

    const userId = getAuth().currentUser?.uid;

    // Load data
    useEffect(() => {
        const load = async () => {
            try {
                const kanjiSnap = await getDocs(collection(db, 'kanji'));
                const kanjiData = kanjiSnap.docs.map(d => ({ id: d.id, ...d.data() }));
                setKanjiList(kanjiData);

                if (userId) {
                    const srsSnap = await getDocs(collection(db, `artifacts/${appId}/users/${userId}/kanjiSRS`));
                    const srs = {};
                    srsSnap.docs.forEach(d => { srs[d.id] = d.data(); });
                    setSrsData(srs);
                }
            } catch (e) {
                console.error('Error loading data:', e);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [userId]);

    // Save folders to localStorage
    useEffect(() => {
        localStorage.setItem('kanji_srs_folders', JSON.stringify(folders));
    }, [folders]);
    useEffect(() => {
        localStorage.setItem('kanji_srs_card_folders', JSON.stringify(kanjiCardFolders));
    }, [kanjiCardFolders]);

    // Folder CRUD — with parentId for nesting
    const createFolder = useCallback((name, parentId = null) => {
        if (!name.trim()) return;
        setFolders(prev => [...prev, { id: `kfolder_${Date.now()}`, name: name.trim(), parentId }]);
    }, []);
    const renameFolder = useCallback((id, newName) => {
        if (!newName.trim()) return;
        setFolders(prev => prev.map(f => f.id === id ? { ...f, name: newName.trim() } : f));
    }, []);
    // Get all descendant folder IDs
    const getDescendantIds = useCallback((parentId, allFolders) => {
        const children = allFolders.filter(f => f.parentId === parentId);
        let ids = children.map(f => f.id);
        children.forEach(c => { ids = [...ids, ...getDescendantIds(c.id, allFolders)]; });
        return ids;
    }, []);
    const deleteFolder = useCallback((id) => {
        setFolders(prev => {
            const idsToDelete = [id, ...getDescendantIds(id, prev)];
            return prev.filter(f => !idsToDelete.includes(f.id));
        });
        setKanjiCardFolders(prev => {
            const next = { ...prev };
            const idsToDelete = [id, ...getDescendantIds(id, folders)];
            Object.keys(next).forEach(cid => { if (idsToDelete.includes(next[cid])) delete next[cid]; });
            return next;
        });
        if (filterFolder === id) setFilterFolder('all');
        if (currentFolder === id) setCurrentFolder(null);
    }, [filterFolder, currentFolder, folders, getDescendantIds]);
    const moveKanjiToFolder = useCallback((kanjiId, folderId) => {
        setKanjiCardFolders(prev => {
            const next = { ...prev };
            if (folderId === 'none') delete next[kanjiId];
            else next[kanjiId] = folderId;
            return next;
        });
        setShowMoveModal(null);
    }, []);
    const batchMoveToFolder = useCallback((folderId) => {
        setKanjiCardFolders(prev => {
            const next = { ...prev };
            selectedIds.forEach(id => {
                if (folderId === 'none') delete next[id];
                else next[id] = folderId;
            });
            return next;
        });
        setShowBatchMoveModal(false);
        setSelectedIds(new Set());
    }, [selectedIds]);
    const getFolderName = useCallback((kanjiId) => {
        const folderId = kanjiCardFolders[kanjiId];
        if (!folderId) return null;
        const folder = folders.find(f => f.id === folderId);
        return folder?.name || null;
    }, [kanjiCardFolders, folders]);

    // Nested folder helpers
    const getRecursiveCardCount = useCallback((folderId) => {
        let count = Object.values(kanjiCardFolders).filter(fId => fId === folderId).length;
        const children = folders.filter(f => f.parentId === folderId);
        children.forEach(c => { count += getRecursiveCardCount(c.id); });
        return count;
    }, [folders, kanjiCardFolders]);

    const getFolderPath = useCallback((folderId) => {
        const path = [];
        let current = folderId;
        while (current) {
            const f = folders.find(f => f.id === current);
            if (!f) break;
            path.unshift({ id: f.id, name: f.name });
            current = f.parentId || null;
        }
        return path;
    }, [folders]);

    // Merge kanji data with SRS info
    const kanjiWithSRS = useMemo(() => {
        const srsKanjiIds = Object.keys(srsData);
        return srsKanjiIds.map(id => {
            const kanjiDoc = kanjiList.find(k => k.id === id);
            const jData = kanjiDoc ? getJotobaKanjiData(kanjiDoc.character) : null;
            const srs = srsData[id];
            return {
                id,
                character: kanjiDoc?.character || '?',
                sinoViet: kanjiDoc?.sinoViet || jData?.sinoViet || '',
                meaning: kanjiDoc?.meaning || jData?.meaningVi || jData?.meanings?.join(', ') || '',
                level: kanjiDoc?.level || jData?.level || '?',
                strokeCount: jData?.stroke_count || kanjiDoc?.strokeCount || 0,
                srs,
                srsStatus: getSrsStatus(srs),
                nextReview: srs?.nextReview || 0,
                reps: srs?.reps || 0,
                interval: srs?.interval || 0,
            };
        }).filter(k => k.character !== '?');
    }, [kanjiList, srsData]);

    // JLPT default folder counts
    const jlptFolderCounts = useMemo(() => {
        const counts = {};
        JLPT_LEVELS.forEach(level => {
            counts[level] = kanjiWithSRS.filter(k => k.level === level).length;
        });
        return counts;
    }, [kanjiWithSRS]);

    // Root custom folders with counts
    const rootCustomFolders = useMemo(() => {
        return folders.filter(f => !f.parentId).map(f => ({
            ...f,
            count: getRecursiveCardCount(f.id),
            subFolderCount: folders.filter(sf => sf.parentId === f.id).length
        }));
    }, [folders, kanjiCardFolders, getRecursiveCardCount]);

    // Sub-folders of current folder
    const currentSubFolders = useMemo(() => {
        if (!currentFolder || currentFolder.startsWith('jlpt_')) return [];
        return folders
            .filter(f => f.parentId === currentFolder)
            .map(f => ({ ...f, count: getRecursiveCardCount(f.id), subFolderCount: folders.filter(sf => sf.parentId === f.id).length }));
    }, [currentFolder, folders, getRecursiveCardCount]);

    // Unfiled kanji count
    const unfiledKanjiCount = useMemo(() => {
        return kanjiWithSRS.filter(k => !kanjiCardFolders[k.id]).length;
    }, [kanjiWithSRS, kanjiCardFolders]);

    // Is folder browse mode active? (root or inside folder with sub-folders, no search/filter)
    const isInFolderBrowseMode = useMemo(() => {
        if (searchQuery.trim() !== '' || filterLevel !== 'all' || filterStatus !== 'all' || filterFolder !== 'all') return false;
        if (currentFolder === null) return true;
        if (currentFolder.startsWith('jlpt_')) return false; // JLPT folders go to card list
        if (currentFolder === '__all__' || currentFolder === 'unfiled') return false;
        const hasSubFolders = folders.some(f => f.parentId === currentFolder);
        return hasSubFolders;
    }, [currentFolder, searchQuery, filterLevel, filterStatus, filterFolder, folders]);

    // Current folder name for breadcrumb
    const currentFolderName = useMemo(() => {
        if (!currentFolder) return null;
        if (currentFolder === '__all__') return 'Tất cả Kanji';
        if (currentFolder === 'unfiled') return 'Chưa phân loại';
        if (currentFolder.startsWith('jlpt_')) return currentFolder.replace('jlpt_', '');
        const f = folders.find(f => f.id === currentFolder);
        return f?.name || 'Thư mục';
    }, [currentFolder, folders]);

    // Cards in current folder
    const currentFolderKanji = useMemo(() => {
        if (!currentFolder) return [];
        if (currentFolder === '__all__') return [...kanjiWithSRS];
        if (currentFolder === 'unfiled') return kanjiWithSRS.filter(k => !kanjiCardFolders[k.id]);
        if (currentFolder.startsWith('jlpt_')) {
            const level = currentFolder.replace('jlpt_', '');
            return kanjiWithSRS.filter(k => k.level === level);
        }
        return kanjiWithSRS.filter(k => kanjiCardFolders[k.id] === currentFolder);
    }, [currentFolder, kanjiWithSRS, kanjiCardFolders]);

    // Open folder
    const openFolder = useCallback((folderId) => {
        setCurrentFolder(folderId);
        setSelectedIds(new Set());
        setShowNewSubFolderInput(false);
    }, []);

    // Go back
    const goBackToFolders = useCallback(() => {
        if (currentFolder && !currentFolder.startsWith('jlpt_') && currentFolder !== '__all__' && currentFolder !== 'unfiled') {
            const current = folders.find(f => f.id === currentFolder);
            if (current?.parentId) {
                setCurrentFolder(current.parentId);
            } else {
                setCurrentFolder(null);
            }
        } else {
            setCurrentFolder(null);
        }
        setSelectedIds(new Set());
        setShowNewSubFolderInput(false);
    }, [currentFolder, folders]);

    // Filter and search
    const filteredKanji = useMemo(() => {
        let result = [...kanjiWithSRS];

        // Filter by level
        if (filterLevel !== 'all') {
            result = result.filter(k => k.level === filterLevel);
        }

        // Filter by status
        if (filterStatus !== 'all') {
            result = result.filter(k => k.srsStatus.label === filterStatus);
        }

        // Filter by folder
        if (filterFolder !== 'all') {
            if (filterFolder === 'none') {
                result = result.filter(k => !kanjiCardFolders[k.id]);
            } else {
                result = result.filter(k => kanjiCardFolders[k.id] === filterFolder);
            }
        }

        // Search
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase().trim();
            result = result.filter(k =>
                k.character.includes(query) ||
                k.sinoViet?.toLowerCase().includes(query) ||
                k.meaning?.toLowerCase().includes(query)
            );
        }

        // Sort by stroke count within level groups
        result.sort((a, b) => {
            const levelOrder = { N5: 0, N4: 1, N3: 2, N2: 3, N1: 4 };
            const levelDiff = (levelOrder[a.level] ?? 5) - (levelOrder[b.level] ?? 5);
            if (levelDiff !== 0) return levelDiff;
            return (a.strokeCount || 999) - (b.strokeCount || 999);
        });

        return result;
    }, [kanjiWithSRS, filterLevel, filterStatus, searchQuery, filterFolder, kanjiCardFolders]);

    // Group by level for display
    const groupedByLevel = useMemo(() => {
        const groups = {};
        filteredKanji.forEach(k => {
            if (!groups[k.level]) groups[k.level] = [];
            groups[k.level].push(k);
        });
        return groups;
    }, [filteredKanji]);

    // Stats
    const stats = useMemo(() => {
        const total = kanjiWithSRS.length;
        const due = kanjiWithSRS.filter(k => (k.nextReview || 0) <= Date.now() && k.reps > 0).length;
        const newCards = kanjiWithSRS.filter(k => k.reps === 0).length;
        const mastered = kanjiWithSRS.filter(k => k.interval >= 1440 * 7).length;
        return { total, due, newCards, mastered };
    }, [kanjiWithSRS]);

    // Toggle selection
    const toggleSelect = (id) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    // Select all visible
    const selectAllVisible = () => {
        const allIds = filteredKanji.map(k => k.id);
        const allSelected = allIds.every(id => selectedIds.has(id));
        if (allSelected) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(allIds));
        }
    };

    // Delete selected
    const handleDeleteSelected = async () => {
        if (!userId || selectedIds.size === 0) return;
        setDeleting(true);
        try {
            for (const id of selectedIds) {
                await deleteDoc(doc(db, `artifacts/${appId}/users/${userId}/kanjiSRS`, id));
            }
            setSrsData(prev => {
                const next = { ...prev };
                selectedIds.forEach(id => delete next[id]);
                return next;
            });
            setSelectedIds(new Set());
            setShowConfirmDelete(false);
        } catch (e) {
            console.error('Error deleting SRS data:', e);
            alert('Lỗi khi xóa: ' + e.message);
        } finally {
            setDeleting(false);
        }
    };

    // Navigate to kanji detail
    const openKanjiDetail = (character) => {
        navigate(`${ROUTES.KANJI_LIST}/${character}`);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[calc(100vh-120px)]">
                <div className="text-center space-y-3">
                    <div className="animate-spin w-10 h-10 border-4 border-cyan-500 border-t-transparent rounded-full mx-auto"></div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Đang tải danh sách Kanji...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto space-y-6 p-4 lg:p-8">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                        <BookOpen className="w-6 h-6 text-cyan-500" />
                        Kanji đã lưu
                    </h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        Quản lý danh sách Kanji trong hệ thống ôn tập
                    </p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => setShowFolderManager(true)}
                        className="px-3 py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 hover:border-cyan-300 dark:hover:border-cyan-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5"
                    >
                        <FolderPlus className="w-4 h-4" /> Thư mục
                    </button>
                    <button
                        onClick={() => navigate(ROUTES.KANJI_REVIEW)}
                        className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-sm font-medium transition-colors"
                    >
                        Ôn tập Kanji
                    </button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-gray-200 dark:border-slate-700 shadow-sm">
                    <div className="text-2xl font-bold text-cyan-500">{stats.total}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">Tổng Kanji</div>
                </div>
                <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-gray-200 dark:border-slate-700 shadow-sm">
                    <div className="text-2xl font-bold text-orange-500">{stats.due}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">Cần ôn</div>
                </div>
                <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-gray-200 dark:border-slate-700 shadow-sm">
                    <div className="text-2xl font-bold text-blue-500">{stats.newCards}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">Chưa ôn</div>
                </div>
                <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-gray-200 dark:border-slate-700 shadow-sm">
                    <div className="text-2xl font-bold text-emerald-500">{stats.mastered}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">Đã thuộc</div>
                </div>
            </div>

            {/* Search & Filter Bar */}
            <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-gray-200 dark:border-slate-700 shadow-sm space-y-3">
                {/* Search */}
                <div className="relative">
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Tìm bằng Kanji, Hán Việt, hoặc nghĩa..."
                        className="w-full bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg px-4 py-2.5 pl-10 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-cyan-500 focus:border-transparent text-sm"
                    />
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    {searchQuery && (
                        <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2">
                            <X className="w-4 h-4 text-gray-400 hover:text-gray-600" />
                        </button>
                    )}
                </div>

                {/* Filters */}
                <div className="flex flex-wrap items-center gap-2">
                    <Filter className="w-4 h-4 text-gray-400" />

                    {/* Level filter */}
                    <button
                        onClick={() => setFilterLevel('all')}
                        className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${filterLevel === 'all' ? 'bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-800' : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-slate-600'}`}
                    >
                        Tất cả
                    </button>
                    {JLPT_LEVELS.map(level => (
                        <button
                            key={level}
                            onClick={() => setFilterLevel(filterLevel === level ? 'all' : level)}
                            className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${filterLevel === level ? `${LEVEL_COLORS[level].bg} text-white` : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-slate-600'}`}
                        >
                            {level}
                        </button>
                    ))}

                    <span className="text-gray-300 dark:text-gray-600">|</span>

                    {/* Status filter */}
                    {['Mới', 'Cần ôn', 'Đang học', 'Ngắn hạn', 'Đã thuộc'].map(status => (
                        <button
                            key={status}
                            onClick={() => setFilterStatus(filterStatus === status ? 'all' : status)}
                            className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${filterStatus === status ? 'bg-cyan-500 text-white' : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-slate-600'}`}
                        >
                            {status}
                        </button>
                    ))}

                    <span className="text-gray-300 dark:text-gray-600">|</span>

                    {/* Folder filter */}
                    <button
                        onClick={() => setFilterFolder('all')}
                        className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${filterFolder === 'all' ? 'bg-indigo-500 text-white' : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-slate-600'}`}
                    >
                        Tất cả thư mục
                    </button>
                    <button
                        onClick={() => setFilterFolder(filterFolder === 'none' ? 'all' : 'none')}
                        className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${filterFolder === 'none' ? 'bg-gray-600 text-white' : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-slate-600'}`}
                    >
                        Chưa phân loại
                    </button>
                    {folders.map(f => (
                        <button
                            key={f.id}
                            onClick={() => setFilterFolder(filterFolder === f.id ? 'all' : f.id)}
                            className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${filterFolder === f.id ? 'bg-indigo-500 text-white' : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-slate-600'}`}
                        >
                            {f.name}
                        </button>
                    ))}
                </div>
            </div>

            {/* Selection Controls */}
            {selectedIds.size > 0 && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <span className="text-sm font-medium text-red-700 dark:text-red-300">
                            Đã chọn {selectedIds.size} kanji
                        </span>
                        <button
                            onClick={() => setSelectedIds(new Set())}
                            className="text-xs text-red-500 hover:text-red-700 underline"
                        >
                            Bỏ chọn tất cả
                        </button>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => folders.length > 0 ? setShowBatchMoveModal(true) : setShowFolderManager(true)}
                            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium flex items-center gap-1.5 transition-colors"
                        >
                            <Folder className="w-4 h-4" /> Chuyển thư mục
                        </button>
                        <button
                            onClick={() => setShowConfirmDelete(true)}
                            className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"
                        >
                            <Trash2 className="w-4 h-4" />
                            Xóa khỏi danh sách
                        </button>
                    </div>
                </div>
            )}

            {/* ====== MAIN CONTENT ====== */}
            {kanjiWithSRS.length === 0 ? (
                <div className="text-center py-16 space-y-4">
                    <BookOpen className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto" />
                    <h3 className="text-lg font-medium text-gray-500 dark:text-gray-400">Ch&#432;a c&#243; Kanji n&#224;o</h3>
                    <p className="text-sm text-gray-400 dark:text-gray-500">
                        H&#227;y v&#224;o m&#7909;c <strong>H&#7885;c Kanji</strong> &#273;&#7875; th&#234;m kanji v&#224;o danh s&#225;ch &#244;n t&#7853;p
                    </p>
                    <button onClick={() => navigate(ROUTES.KANJI_STUDY)}
                        className="px-6 py-3 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl font-medium transition-colors">
                        B&#7855;t &#273;&#7847;u h&#7885;c Kanji
                    </button>
                </div>
            ) : isInFolderBrowseMode ? (
                /* ====== FOLDER BROWSE MODE ====== */
                <div className="space-y-4">
                    {/* Breadcrumb when inside a custom folder */}
                    {currentFolder !== null && (
                        <div className="flex items-center gap-1.5 text-sm flex-wrap">
                            <button onClick={() => setCurrentFolder(null)}
                                className="flex items-center gap-1 text-cyan-600 dark:text-cyan-400 hover:underline font-medium">
                                <ChevronLeft className="w-4 h-4" /> Th&#432; m&#7909;c g&#7889;c
                            </button>
                            {getFolderPath(currentFolder).map((seg, i, arr) => (
                                <React.Fragment key={seg.id}>
                                    <span className="text-gray-400">/</span>
                                    {i < arr.length - 1 ? (
                                        <button onClick={() => openFolder(seg.id)} className="text-cyan-600 dark:text-cyan-400 hover:underline font-medium">{seg.name}</button>
                                    ) : (
                                        <span className="font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1">
                                            <Folder className="w-3.5 h-3.5 text-amber-500" /> {seg.name}
                                        </span>
                                    )}
                                </React.Fragment>
                            ))}
                        </div>
                    )}

                    {/* Info bar */}
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-500 dark:text-gray-400 flex-1">
                            {currentFolder === null
                                ? `${kanjiWithSRS.length} Kanji \u00b7 ${rootCustomFolders.length} th\u01b0 m\u1ee5c t\u00f9y ch\u1ec9nh`
                                : `${currentSubFolders.length} th\u01b0 m\u1ee5c con \u00b7 ${currentFolderKanji.length} kanji`
                            }
                        </span>
                        {currentFolder !== null && (
                            showNewSubFolderInput ? (
                                <div className="flex gap-1.5 items-center">
                                    <input type="text" value={newSubFolderInput}
                                        onChange={(e) => setNewSubFolderInput(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && newSubFolderInput.trim()) {
                                                createFolder(newSubFolderInput.trim(), currentFolder);
                                                setNewSubFolderInput(''); setShowNewSubFolderInput(false);
                                            }
                                            if (e.key === 'Escape') setShowNewSubFolderInput(false);
                                        }}
                                        autoFocus placeholder="T\u00ean th\u01b0 m\u1ee5c con..."
                                        className="px-2 py-1 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:ring-1 focus:ring-cyan-500 w-40"
                                    />
                                    <button onClick={() => {
                                        if (newSubFolderInput.trim()) { createFolder(newSubFolderInput.trim(), currentFolder); setNewSubFolderInput(''); setShowNewSubFolderInput(false); }
                                    }} className="px-2 py-1 bg-emerald-600 text-white rounded text-xs font-medium"><Plus className="w-3.5 h-3.5" /></button>
                                    <button onClick={() => setShowNewSubFolderInput(false)} className="text-gray-400 hover:text-gray-600"><X className="w-3.5 h-3.5" /></button>
                                </div>
                            ) : (
                                <button onClick={() => setShowNewSubFolderInput(true)}
                                    className="px-3 py-1.5 text-xs font-medium rounded-lg bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors flex items-center gap-1">
                                    <FolderPlus className="w-3.5 h-3.5" /> Th\u01b0 m\u1ee5c con
                                </button>
                            )
                        )}
                    </div>

                    {/* Folder Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                        {/* At root: show "All kanji" tile */}
                        {currentFolder === null && (
                            <button onClick={() => openFolder('__all__')}
                                className="flex flex-col items-center gap-2 p-5 rounded-xl bg-gradient-to-br from-cyan-50 to-cyan-100 dark:from-cyan-900/30 dark:to-cyan-800/20 border-2 border-cyan-200 dark:border-cyan-700 hover:border-cyan-400 dark:hover:border-cyan-500 hover:shadow-lg transition-all cursor-pointer group">
                                <div className="w-14 h-14 rounded-xl bg-cyan-500/10 dark:bg-cyan-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                                    <List className="w-7 h-7 text-cyan-500" />
                                </div>
                                <span className="text-sm font-bold text-cyan-700 dark:text-cyan-300">T&#7845;t c&#7843; Kanji</span>
                                <span className="text-xs text-cyan-500 dark:text-cyan-400 font-medium">{kanjiWithSRS.length}</span>
                            </button>
                        )}

                        {/* At root: JLPT N5-N1 tiles */}
                        {currentFolder === null && JLPT_LEVELS.map(level => {
                            const colors = LEVEL_COLORS[level];
                            const count = jlptFolderCounts[level];
                            if (count === 0) return null;
                            return (
                                <button key={level} onClick={() => openFolder(`jlpt_${level}`)}
                                    className={`flex flex-col items-center gap-2 p-5 rounded-xl border-2 border-gray-200 dark:border-slate-700 hover:shadow-lg transition-all cursor-pointer group ${colors.light} hover:border-opacity-80`}>
                                    <div className={`w-14 h-14 rounded-xl ${colors.bg} bg-opacity-10 dark:bg-opacity-20 flex items-center justify-center group-hover:scale-110 transition-transform`}>
                                        <span className={`text-2xl font-bold ${colors.text}`}>{level}</span>
                                    </div>
                                    <span className={`text-sm font-bold ${colors.text}`}>{level}</span>
                                    <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">{count} kanji</span>
                                </button>
                            );
                        })}

                        {/* Custom folder tiles (root or sub-folders) */}
                        {(currentFolder === null ? rootCustomFolders : currentSubFolders).map(f => (
                            <button key={f.id} onClick={() => openFolder(f.id)}
                                className="flex flex-col items-center gap-2 p-5 rounded-xl bg-white dark:bg-slate-800 border-2 border-gray-200 dark:border-slate-700 hover:border-cyan-400 dark:hover:border-cyan-500 hover:shadow-lg transition-all cursor-pointer group">
                                <div className="w-14 h-14 rounded-xl bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                                    <Folder className="w-7 h-7 text-amber-500" />
                                </div>
                                <span className="text-sm font-bold text-gray-700 dark:text-gray-200 truncate max-w-full">{f.name}</span>
                                <div className="flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500 font-medium">
                                    <span>{f.count} kanji</span>
                                    {f.subFolderCount > 0 && <span>&#183; {f.subFolderCount} th&#432; m&#7909;c</span>}
                                </div>
                            </button>
                        ))}

                    </div>

                    {/* Cards directly in this custom folder (if it has sub-folders AND cards) */}
                    {currentFolder !== null && currentFolderKanji.length > 0 && (
                        <>
                            <div className="flex items-center gap-2">
                                <div className="flex-1 h-px bg-gray-200 dark:bg-slate-700"></div>
                                <span className="text-xs text-gray-400 font-medium">Kanji trong th&#432; m&#7909;c n&#224;y ({currentFolderKanji.length})</span>
                                <div className="flex-1 h-px bg-gray-200 dark:bg-slate-700"></div>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                                {currentFolderKanji.map(kanji => {
                                    const isSelected = selectedIds.has(kanji.id);
                                    const levelColor = LEVEL_COLORS[kanji.level] || { bg: 'bg-gray-500', text: 'text-gray-500', light: 'bg-gray-50 dark:bg-gray-900/20' };
                                    return (
                                        <div key={kanji.id}
                                            onClick={() => toggleSelect(kanji.id)}
                                            className={`flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer transition-all ${isSelected
                                                ? 'bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-700'
                                                : 'bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 hover:border-cyan-300'}`}>
                                            <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 ${isSelected ? 'bg-red-500 border-red-500 text-white' : 'border-gray-300 dark:border-slate-600'}`}>
                                                {isSelected && <span className="text-[10px]">&#10003;</span>}
                                            </div>
                                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-xl font-bold font-japanese ${levelColor.light} ${levelColor.text}`}>
                                                {kanji.character}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <span className="font-bold text-cyan-600 dark:text-cyan-400 text-sm">{kanji.sinoViet || '---'}</span>
                                                <div className="text-xs text-gray-500 dark:text-gray-400 truncate">{kanji.meaning}</div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </>
                    )}

                    {/* Empty folder */}
                    {currentFolder !== null && currentSubFolders.length === 0 && currentFolderKanji.length === 0 && (
                        <div className="text-center py-12 space-y-3">
                            <Folder className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto" />
                            <p className="text-gray-500 dark:text-gray-400">Th&#432; m&#7909;c n&#224;y tr&#7889;ng</p>
                            <p className="text-sm text-gray-400">T&#7841;o th&#432; m&#7909;c con ho&#7863;c chuy&#7875;n kanji v&#224;o &#273;&#226;y</p>
                        </div>
                    )}
                </div>
            ) : (
                /* ====== KANJI LIST MODE (inside JLPT folder, custom leaf folder, search/filter active) ====== */
                <div className="space-y-4">
                    {/* Breadcrumb */}
                    {currentFolder !== null && (
                        <div className="flex items-center gap-2 text-sm">
                            <button onClick={goBackToFolders}
                                className="flex items-center gap-1 text-cyan-600 dark:text-cyan-400 hover:underline font-medium">
                                <ChevronLeft className="w-4 h-4" /> Th&#432; m&#7909;c
                            </button>
                            <span className="text-gray-400">/</span>
                            {currentFolder.startsWith('jlpt_') ? (
                                <span className={`font-medium ${LEVEL_COLORS[currentFolder.replace('jlpt_', '')]?.text || 'text-gray-700'} flex items-center gap-1`}>
                                    {currentFolderName}
                                </span>
                            ) : (
                                <>
                                    {getFolderPath(currentFolder).map((seg, i, arr) => (
                                        <React.Fragment key={seg.id}>
                                            {i > 0 && <span className="text-gray-400">/</span>}
                                            {i < arr.length - 1 ? (
                                                <button onClick={() => openFolder(seg.id)} className="text-cyan-600 dark:text-cyan-400 hover:underline font-medium">{seg.name}</button>
                                            ) : (
                                                <span className="font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1">
                                                    <Folder className="w-3.5 h-3.5 text-amber-500" /> {seg.name}
                                                </span>
                                            )}
                                        </React.Fragment>
                                    ))}
                                </>
                            )}
                            <span className="text-xs text-gray-400 ml-2">
                                {currentFolder ? currentFolderKanji.length : filteredKanji.length} kanji
                            </span>
                        </div>
                    )}

                    {/* Select all */}
                    <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                            {currentFolder ? currentFolderKanji.length : filteredKanji.length} kanji
                        </span>
                        <button onClick={selectAllVisible}
                            className="text-xs text-cyan-600 dark:text-cyan-400 hover:underline font-medium">
                            {(currentFolder ? currentFolderKanji : filteredKanji).every(k => selectedIds.has(k.id)) ? 'B&#7887; ch&#7885;n t&#7845;t c&#7843;' : 'Ch&#7885;n t&#7845;t c&#7843;'}
                        </button>
                    </div>

                    {/* Kanji grid */}
                    {(currentFolder ? currentFolderKanji : filteredKanji).length === 0 ? (
                        <div className="text-center py-12 space-y-3">
                            <Search className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto" />
                            <p className="text-gray-500 dark:text-gray-400">Kh&#244;ng t&#236;m th&#7845;y kanji n&#224;o</p>
                            {currentFolder && (
                                <button onClick={goBackToFolders} className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-sm font-medium">
                                    Quay l&#7841;i th&#432; m&#7909;c
                                </button>
                            )}
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                            {(currentFolder ? currentFolderKanji : filteredKanji).map(kanji => {
                                const isSelected = selectedIds.has(kanji.id);
                                const StatusIcon = kanji.srsStatus.icon;
                                const levelColor = LEVEL_COLORS[kanji.level] || { bg: 'bg-gray-500', text: 'text-gray-500', light: 'bg-gray-50 dark:bg-gray-900/20' };
                                return (
                                    <div key={kanji.id}
                                        className={`group relative flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer ${isSelected
                                            ? 'bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-700 ring-1 ring-red-300'
                                            : 'bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 hover:border-cyan-300 dark:hover:border-cyan-600 hover:shadow-md'}`}>
                                        <div onClick={(e) => { e.stopPropagation(); toggleSelect(kanji.id); }} className="flex-shrink-0">
                                            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${isSelected ? 'bg-red-500 border-red-500 text-white' : 'border-gray-300 dark:border-slate-600 group-hover:border-cyan-400'}`}>
                                                {isSelected && <span className="text-xs">&#10003;</span>}
                                            </div>
                                        </div>
                                        <div onClick={() => openKanjiDetail(kanji.character)} className="flex items-center gap-3 flex-1 min-w-0">
                                            <div className={`w-12 h-12 rounded-lg flex items-center justify-center text-2xl font-bold font-japanese ${levelColor.light} ${levelColor.text}`}>
                                                {kanji.character}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-bold text-cyan-600 dark:text-cyan-400 text-sm">{kanji.sinoViet || '---'}</span>
                                                    <span className="text-xs text-gray-400">{kanji.strokeCount} n&#233;t</span>
                                                </div>
                                                <div className="text-xs text-gray-500 dark:text-gray-400 truncate">{kanji.meaning}</div>
                                                {getFolderName(kanji.id) && (
                                                    <div className="flex items-center gap-1 mt-0.5">
                                                        <Folder className="w-3 h-3 text-indigo-400" />
                                                        <span className="text-[10px] text-indigo-500 dark:text-indigo-400 font-medium">{getFolderName(kanji.id)}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-end gap-1 flex-shrink-0">
                                            <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${kanji.srsStatus.bg} ${kanji.srsStatus.color}`}>
                                                <StatusIcon className="w-3 h-3" />
                                                {kanji.srsStatus.label}
                                            </span>
                                            {kanji.nextReview > 0 && kanji.reps > 0 && (
                                                <span className="text-[10px] text-gray-400">
                                                    {(kanji.nextReview || 0) <= Date.now() ? 'Ngay b\u00e2y gi\u1edd' : formatNextReview(kanji.nextReview)}
                                                </span>
                                            )}
                                        </div>
                                        <div className="opacity-0 group-hover:opacity-100 absolute top-1 right-1 flex gap-0.5 transition-all bg-white/80 dark:bg-slate-800/80 rounded-lg p-0.5 backdrop-blur-sm">
                                            <button onClick={(e) => { e.stopPropagation(); setShowMoveModal(kanji.id); }}
                                                className="p-1 text-gray-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded transition-colors" title="Chuy&#7875;n th&#432; m&#7909;c">
                                                <Folder className="w-3.5 h-3.5" />
                                            </button>
                                            <button onClick={() => openKanjiDetail(kanji.character)}
                                                className="p-1 text-gray-400 hover:text-cyan-500 hover:bg-cyan-50 dark:hover:bg-cyan-900/30 rounded transition-colors" title="Xem chi ti&#7871;t">
                                                <Eye className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {showConfirmDelete && (
                <div className="fixed inset-0 bg-black/50 dark:bg-black/70 z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-xl p-6 w-[400px] max-w-[90vw] shadow-2xl space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                                <Trash2 className="w-5 h-5 text-red-500" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Xóa Kanji khỏi ôn tập</h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                    Bạn có chắc muốn xóa {selectedIds.size} kanji khỏi danh sách ôn tập?
                                </p>
                            </div>
                        </div>

                        <div className="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-3">
                            <div className="flex flex-wrap gap-2">
                                {[...selectedIds].slice(0, 20).map(id => {
                                    const k = kanjiWithSRS.find(k => k.id === id);
                                    return k ? (
                                        <span key={id} className="inline-flex items-center gap-1 px-2 py-1 bg-white dark:bg-slate-600 rounded-lg text-sm border border-gray-200 dark:border-slate-500">
                                            <span className="font-japanese text-lg">{k.character}</span>
                                            <span className="text-gray-400 text-xs">{k.sinoViet}</span>
                                        </span>
                                    ) : null;
                                })}
                                {selectedIds.size > 20 && (
                                    <span className="text-xs text-gray-400 self-center">+{selectedIds.size - 20} kanji khác</span>
                                )}
                            </div>
                        </div>

                        <p className="text-xs text-orange-600 dark:text-orange-400">
                            ⚠️ Thao tác này sẽ xóa toàn bộ dữ liệu ôn tập (SRS) của các kanji đã chọn. Bạn có thể thêm lại từ mục Học Kanji.
                        </p>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowConfirmDelete(false)}
                                className="flex-1 py-2.5 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 text-gray-700 dark:text-gray-300 rounded-lg font-medium transition-colors"
                                disabled={deleting}
                            >
                                Hủy
                            </button>
                            <button
                                onClick={handleDeleteSelected}
                                disabled={deleting}
                                className="flex-1 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-lg font-medium flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                            >
                                {deleting ? (
                                    <>
                                        <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                                        Đang xóa...
                                    </>
                                ) : (
                                    <>
                                        <Trash2 className="w-4 h-4" />
                                        Xóa {selectedIds.size} kanji
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Batch Move to Folder Modal */}
            {showBatchMoveModal && (() => {
                const buildTree = (parentId = null, depth = 0) => {
                    return folders.filter(f => (f.parentId || null) === parentId)
                        .flatMap(f => [{ ...f, depth }, ...buildTree(f.id, depth + 1)]);
                };
                const flatTree = buildTree();
                return (
                    <div className="fixed inset-0 bg-black/50 dark:bg-black/70 z-50 flex items-center justify-center p-4">
                        <div className="bg-white dark:bg-slate-800 rounded-xl p-5 w-[350px] max-w-[90vw] shadow-2xl space-y-3">
                            <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                <Folder className="w-5 h-5 text-indigo-500" /> Chuy&#7875;n {selectedIds.size} kanji v&#224;o th&#432; m&#7909;c
                            </h3>
                            <div className="max-h-[300px] overflow-y-auto space-y-0.5">
                                <button onClick={() => batchMoveToFolder('none')}
                                    className="w-full text-left flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors">
                                    <Folder className="w-4 h-4 text-gray-400" />
                                    <span className="text-sm text-gray-500 italic">Ch&#432;a ph&#226;n lo&#7841;i</span>
                                </button>
                                {flatTree.map(f => (
                                    <button key={f.id} onClick={() => batchMoveToFolder(f.id)}
                                        className="w-full text-left flex items-center gap-2 p-2.5 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                                        style={{ paddingLeft: `${12 + f.depth * 20}px` }}>
                                        {f.depth > 0 && <span className="text-gray-300 text-xs">&#9492;</span>}
                                        <Folder className={`w-4 h-4 ${f.depth > 0 ? 'text-amber-400' : 'text-indigo-400'}`} />
                                        <span className="text-sm text-gray-700 dark:text-gray-300">{f.name}</span>
                                    </button>
                                ))}
                                {folders.length === 0 && (
                                    <p className="text-center text-sm text-gray-400 py-4">Ch&#432;a c&#243; th&#432; m&#7909;c n&#224;o</p>
                                )}
                            </div>
                            <button onClick={() => setShowBatchMoveModal(false)} className="w-full py-2 bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300 rounded-lg text-sm font-medium hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors">
                                &#272;&#243;ng
                            </button>
                        </div>
                    </div>
                );
            })()}

            {/* Move Single Kanji to Folder Modal */}
            {showMoveModal && (() => {
                const buildTree = (parentId = null, depth = 0) => {
                    return folders.filter(f => (f.parentId || null) === parentId)
                        .flatMap(f => [{ ...f, depth }, ...buildTree(f.id, depth + 1)]);
                };
                const flatTree = buildTree();
                return (
                    <div className="fixed inset-0 bg-black/50 dark:bg-black/70 z-50 flex items-center justify-center p-4">
                        <div className="bg-white dark:bg-slate-800 rounded-xl p-5 w-[350px] max-w-[90vw] shadow-2xl space-y-3">
                            <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                <Folder className="w-5 h-5 text-indigo-500" /> Chuy&#7875;n v&#224;o th&#432; m&#7909;c
                            </h3>
                            <div className="max-h-[300px] overflow-y-auto space-y-0.5">
                                <button onClick={() => moveKanjiToFolder(showMoveModal, 'none')}
                                    className={`w-full text-left flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors ${!kanjiCardFolders[showMoveModal] ? 'bg-indigo-50 dark:bg-indigo-900/20' : ''}`}>
                                    <Folder className="w-4 h-4 text-gray-400" />
                                    <span className="text-sm text-gray-500 italic">Ch&#432;a ph&#224;n lo&#7841;i</span>
                                </button>
                                {flatTree.map(f => (
                                    <button key={f.id} onClick={() => moveKanjiToFolder(showMoveModal, f.id)}
                                        className={`w-full text-left flex items-center gap-2 p-2.5 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors ${kanjiCardFolders[showMoveModal] === f.id ? 'bg-indigo-50 dark:bg-indigo-900/20' : ''}`}
                                        style={{ paddingLeft: `${12 + f.depth * 20}px` }}>
                                        {f.depth > 0 && <span className="text-gray-300 text-xs">&#9492;</span>}
                                        <Folder className={`w-4 h-4 ${f.depth > 0 ? 'text-amber-400' : 'text-indigo-400'}`} />
                                        <span className="text-sm text-gray-700 dark:text-gray-300 flex-1">{f.name}</span>
                                        {kanjiCardFolders[showMoveModal] === f.id && <span className="text-xs text-indigo-500 ml-auto">&#10003; Hi&#7879;n t&#7841;i</span>}
                                    </button>
                                ))}
                            </div>
                            <button onClick={() => setShowMoveModal(null)} className="w-full py-2 bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300 rounded-lg text-sm font-medium hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors">
                                &#272;&#243;ng
                            </button>
                        </div>
                    </div>
                );
            })()}

            {/* Folder Manager Modal */}
            {showFolderManager && (() => {
                // Build hierarchical tree
                const buildTree = (parentId = null, depth = 0) => {
                    return folders
                        .filter(f => (f.parentId || null) === parentId)
                        .flatMap(f => [{ ...f, depth }, ...buildTree(f.id, depth + 1)]);
                };
                const flatTree = buildTree();
                return (
                    <div className="fixed inset-0 bg-black/50 dark:bg-black/70 z-50 flex items-center justify-center p-4">
                        <div className="bg-white dark:bg-slate-800 rounded-xl p-5 w-[450px] max-w-[90vw] shadow-2xl space-y-4">
                            <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                <FolderPlus className="w-5 h-5 text-cyan-500" /> Qu&#7843;n l&#253; th&#43; m&#7909;c Kanji
                            </h3>
                            {/* Create new root folder */}
                            <div className="flex gap-2">
                                <input type="text" value={newFolderName}
                                    onChange={(e) => setNewFolderName(e.target.value)}
                                    onKeyDown={(e) => { if (e.key === 'Enter' && newFolderName.trim()) { createFolder(newFolderName); setNewFolderName(''); } }}
                                    placeholder="T&#234;n th&#43; m&#7909;c m&#7899;i..."
                                    className="flex-1 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                                />
                                <button onClick={() => { if (newFolderName.trim()) { createFolder(newFolderName); setNewFolderName(''); } }}
                                    className="px-3 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-sm font-medium transition-colors">
                                    <Plus className="w-4 h-4" />
                                </button>
                            </div>
                            {/* Folder tree */}
                            <div className="max-h-[350px] overflow-y-auto space-y-0.5">
                                {flatTree.length === 0 ? (
                                    <p className="text-center text-sm text-gray-400 py-4">Ch&#43;a c&#243; th&#43; m&#7909;c n&#224;o</p>
                                ) : flatTree.map(f => {
                                    const count = getRecursiveCardCount(f.id);
                                    return (
                                        <div key={f.id} className="flex items-center gap-1.5 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 group"
                                            style={{ paddingLeft: `${8 + f.depth * 20}px` }}>
                                            {f.depth > 0 && <span className="text-gray-300 dark:text-gray-600 text-xs">&#9492;</span>}
                                            <Folder className={`w-4 h-4 flex-shrink-0 ${f.depth > 0 ? 'text-amber-400' : 'text-indigo-500'}`} />
                                            {editingFolderId === f.id ? (
                                                <input type="text" value={editingFolderName}
                                                    onChange={(e) => setEditingFolderName(e.target.value)}
                                                    onBlur={() => { renameFolder(f.id, editingFolderName); setEditingFolderId(null); }}
                                                    onKeyDown={(e) => { if (e.key === 'Enter') { renameFolder(f.id, editingFolderName); setEditingFolderId(null); } }}
                                                    className="flex-1 bg-white dark:bg-slate-600 border border-cyan-400 rounded px-2 py-1 text-sm text-gray-900 dark:text-white focus:ring-1 focus:ring-cyan-500"
                                                    autoFocus />
                                            ) : (
                                                <span className="flex-1 text-sm text-gray-700 dark:text-gray-300 truncate">{f.name}</span>
                                            )}
                                            <span className="text-xs text-gray-400 mr-0.5">{count}</span>
                                            <button onClick={() => { setEditingFolderId(f.id); setEditingFolderName(f.name); }}
                                                className="p-1 text-gray-400 hover:text-cyan-500 opacity-0 group-hover:opacity-100 transition-all" title="&#272;&#7893;i t&#234;n">
                                                <Edit className="w-3.5 h-3.5" />
                                            </button>
                                            <button onClick={() => createFolder('Th&#43; m&#7909;c con', f.id)}
                                                className="p-1 text-gray-400 hover:text-emerald-500 opacity-0 group-hover:opacity-100 transition-all" title="T&#7841;o th&#43; m&#7909;c con">
                                                <FolderPlus className="w-3.5 h-3.5" />
                                            </button>
                                            <button onClick={() => { if (window.confirm(`X&#243;a th&#43; m&#7909;c "${f.name}"?`)) deleteFolder(f.id); }}
                                                className="p-1 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all" title="X&#243;a">
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                            <button onClick={() => setShowFolderManager(false)} className="w-full py-2 bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300 rounded-lg text-sm font-medium hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors">
                                &#272;&#243;ng
                            </button>
                        </div>
                    </div>
                );
            })()}
        </div>
    );
};

export default KanjiSRSListScreen;
