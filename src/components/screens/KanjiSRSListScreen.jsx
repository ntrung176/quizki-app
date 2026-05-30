import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import LoadingIndicator from '../ui/LoadingIndicator';
import { 
    Search, Trash2, ChevronLeft, ChevronRight, BookOpen, Clock, 
    CheckCircle, AlertCircle, Filter, X, Eye, Folder, FolderPlus, 
    FolderOpen, Edit, Plus, List, Bell, Bookmark, ArrowRight, History, Sparkles 
} from 'lucide-react';
import { db, appId } from '../../config/firebase';
import { collection, getDocs, doc, deleteDoc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { ROUTES } from '../../router';
import { showToast, showConfirm } from '../../utils/toast';
import { getJotobaKanjiData } from '../../data/jotobaKanjiData';
import { TopTabBar } from '../ui';
import { KANJI_TABS } from '../../config/tabs';

const JLPT_LEVELS = ['N5', 'N4', 'N3', 'N2', 'N1'];

const LEVEL_COLORS = {
    N5: { bg: 'bg-emerald-500', text: 'text-emerald-500', border: 'border-emerald-500', light: 'bg-emerald-50 dark:bg-emerald-950/20' },
    N4: { bg: 'bg-sky-500', text: 'text-sky-500', border: 'border-sky-500', light: 'bg-sky-50 dark:bg-sky-950/20' },
    N3: { bg: 'bg-violet-500', text: 'text-violet-500', border: 'border-violet-500', light: 'bg-violet-50 dark:bg-violet-950/20' },
    N2: { bg: 'bg-amber-500', text: 'text-amber-500', border: 'border-amber-500', light: 'bg-amber-50 dark:bg-amber-950/20' },
    N1: { bg: 'bg-rose-500', text: 'text-rose-500', border: 'border-rose-500', light: 'bg-rose-50 dark:bg-rose-950/20' },
};

const LEVEL_LABELS = {
    N5: 'Cơ bản',
    N4: 'Sơ cấp',
    N3: 'Trung cấp',
    N2: 'Trung-Cao',
    N1: 'Cao cấp'
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

    const user = getAuth().currentUser;
    const userId = user?.uid;

    // Load data
    useEffect(() => {
        const load = async () => {
            try {
                const fetchTasks = [
                    getDocs(collection(db, 'kanji')).then(snap =>
                        snap.docs.map(d => ({ id: d.id, ...d.data() }))
                    )
                ];

                if (userId) {
                    fetchTasks.push(
                        getDocs(collection(db, `artifacts/${appId}/users/${userId}/kanjiSRS`)).then(snap => {
                            const srs = {};
                            snap.docs.forEach(d => { srs[d.id] = d.data(); });
                            return srs;
                        })
                    );
                }

                const results = await Promise.all(fetchTasks);
                setKanjiList(results[0]);
                if (userId && results[1]) {
                    setSrsData(results[1]);
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

    // Folder CRUD
    const createFolder = useCallback((name, parentId = null) => {
        if (!name.trim()) return;
        setFolders(prev => [...prev, { id: `kfolder_${Date.now()}`, name: name.trim(), parentId }]);
    }, []);
    const renameFolder = useCallback((id, newName) => {
        if (!newName.trim()) return;
        setFolders(prev => prev.map(f => f.id === id ? { ...f, name: newName.trim() } : f));
    }, []);
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
    }, [folders, getRecursiveCardCount]);

    // Sub-folders of current folder
    const currentSubFolders = useMemo(() => {
        if (!currentFolder || currentFolder.startsWith('jlpt_')) return [];
        return folders
            .filter(f => f.parentId === currentFolder)
            .map(f => ({ ...f, count: getRecursiveCardCount(f.id), subFolderCount: folders.filter(sf => sf.parentId === f.id).length }));
    }, [currentFolder, folders, getRecursiveCardCount]);

    const isInFolderBrowseMode = useMemo(() => {
        if (searchQuery.trim() !== '' || filterLevel !== 'all' || filterStatus !== 'all' || filterFolder !== 'all') return false;
        if (currentFolder === null) return true;
        if (currentFolder.startsWith('jlpt_')) return false;
        if (currentFolder === '__all__' || currentFolder === 'unfiled') return false;
        const hasSubFolders = folders.some(f => f.parentId === currentFolder);
        return hasSubFolders;
    }, [currentFolder, searchQuery, filterLevel, filterStatus, filterFolder, folders]);

    const currentFolderName = useMemo(() => {
        if (!currentFolder) return null;
        if (currentFolder === '__all__') return 'Tất cả Kanji';
        if (currentFolder === 'unfiled') return 'Chưa phân loại';
        if (currentFolder.startsWith('jlpt_')) return currentFolder.replace('jlpt_', '');
        const f = folders.find(f => f.id === currentFolder);
        return f?.name || 'Thư mục';
    }, [currentFolder, folders]);

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

    const openFolder = useCallback((folderId) => {
        setCurrentFolder(folderId);
        setSelectedIds(new Set());
        setShowNewSubFolderInput(false);
    }, []);

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

        if (filterLevel !== 'all') {
            result = result.filter(k => k.level === filterLevel);
        }

        if (filterStatus !== 'all') {
            result = result.filter(k => k.srsStatus.label === filterStatus);
        }

        if (filterFolder !== 'all') {
            if (filterFolder === 'none') {
                result = result.filter(k => !kanjiCardFolders[k.id]);
            } else {
                result = result.filter(k => kanjiCardFolders[k.id] === filterFolder);
            }
        }

        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase().trim();
            result = result.filter(k =>
                k.character.includes(query) ||
                k.sinoViet?.toLowerCase().includes(query) ||
                k.meaning?.toLowerCase().includes(query)
            );
        }

        result.sort((a, b) => {
            const levelOrder = { N5: 0, N4: 1, N3: 2, N2: 3, N1: 4 };
            const levelDiff = (levelOrder[a.level] ?? 5) - (levelOrder[b.level] ?? 5);
            if (levelDiff !== 0) return levelDiff;
            return (a.strokeCount || 999) - (b.strokeCount || 999);
        });

        return result;
    }, [kanjiWithSRS, filterLevel, filterStatus, searchQuery, filterFolder, kanjiCardFolders]);

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
        const targetList = currentFolder ? currentFolderKanji : filteredKanji;
        const allIds = targetList.map(k => k.id);
        const allSelected = allIds.every(id => selectedIds.has(id));
        if (allSelected) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(allIds));
        }
    };

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
            showToast('Lỗi khi xóa: ' + e.message, 'error');
        } finally {
            setDeleting(false);
        }
    };

    const openKanjiDetail = (character) => {
        navigate(`${ROUTES.KANJI_LIST}/${character}`);
    };

    // Stats
    const stats = useMemo(() => {
        const total = kanjiWithSRS.length;
        const due = kanjiWithSRS.filter(k => (k.nextReview || 0) <= Date.now() && k.reps > 0).length;
        const newCards = kanjiWithSRS.filter(k => k.reps === 0).length;
        const mastered = kanjiWithSRS.filter(k => k.interval >= 1440 * 7).length;
        return { total, due, newCards, mastered };
    }, [kanjiWithSRS]);

    // Recently reviewed/saved cards (sorted by lastReview desc)
    const recentlyAccessed = useMemo(() => {
        return [...kanjiWithSRS]
            .filter(k => k.srs?.lastReview)
            .sort((a, b) => (b.srs?.lastReview || 0) - (a.srs?.lastReview || 0))
            .slice(0, 3);
    }, [kanjiWithSRS]);

    if (loading) {
        return (
            <div className="w-full pb-8">
                <TopTabBar tabs={KANJI_TABS} />
                <LoadingIndicator text="Đang tải thư viện Kanji..." />
            </div>
        );
    }

    return (
        <div className="w-full pb-10 bg-slate-50/50 min-h-screen dark:bg-slate-900/10">
            <TopTabBar tabs={KANJI_TABS} />
            
            <div className="max-w-6xl mx-auto space-y-6 px-4 md:px-8 mt-6">
                
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-extrabold text-slate-800 dark:text-white tracking-tight flex items-center gap-2">
                            Thư viện Kanji
                        </h1>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1.5">
                            Quản lý và ôn tập các Hán tự bạn đã lưu trữ theo cấp độ.
                        </p>
                    </div>
                    
                    {/* User profile & actions */}
                    <div className="flex items-center gap-3 self-end md:self-center">
                        <button className="p-2.5 bg-white dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700 rounded-full text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:shadow-sm transition-all relative">
                            <Bell className="w-5 h-5" />
                            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full"></span>
                        </button>
                        
                        <div className="flex items-center gap-2 bg-white dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700 rounded-full pl-2 pr-3 py-1 shadow-sm">
                            <div className="w-7 h-7 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-700 dark:text-slate-300 overflow-hidden">
                                {user?.photoURL ? (
                                    <img src={user.photoURL} alt="Avatar" className="w-full h-full object-cover" />
                                ) : (
                                    user?.displayName?.charAt(0) || user?.email?.charAt(0).toUpperCase() || 'U'
                                )}
                            </div>
                            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                {user?.displayName || 'User'}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Search and Filters */}
                {isInFolderBrowseMode && (
                    <div className="flex flex-col md:flex-row gap-3 items-center w-full">
                        <div className="relative flex-1 w-full">
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Tìm kiếm thư mục hoặc Kanji..."
                                className="w-full bg-white dark:bg-slate-800 border border-slate-200/70 dark:border-slate-700 rounded-2xl px-4 py-3 pl-11 text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 shadow-sm text-sm"
                            />
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            {searchQuery && (
                                <button onClick={() => setSearchQuery('')} className="absolute right-4 top-1/2 -translate-y-1/2">
                                    <X className="w-4 h-4 text-slate-400 hover:text-slate-600" />
                                </button>
                            )}
                        </div>
                        
                        <div className="flex gap-2 w-full md:w-auto">
                            <button
                                onClick={() => setShowFolderManager(true)}
                                className="px-4 py-3 bg-white dark:bg-slate-800 border border-slate-200/70 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-2xl text-sm font-semibold hover:bg-slate-50 transition-all flex items-center justify-center gap-2 shadow-sm w-full md:w-auto cursor-pointer"
                            >
                                <FolderPlus className="w-4 h-4 text-slate-500" /> Quản lý thư mục
                            </button>
                            
                            <button
                                onClick={() => navigate(ROUTES.KANJI_REVIEW)}
                                className="px-5 py-3 bg-[#2E5B70] hover:bg-[#234757] text-white rounded-2xl text-sm font-bold transition-all flex items-center justify-center gap-2 shadow-md w-full md:w-auto cursor-pointer"
                            >
                                Ôn tập ngay
                            </button>
                        </div>
                    </div>
                )}

                {/* Selection Controls */}
                {selectedIds.size > 0 && (
                    <div className="bg-red-50/80 dark:bg-red-950/20 border border-red-200/50 dark:border-red-800/30 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-sm">
                        <div className="flex items-center gap-3">
                            <span className="text-sm font-bold text-red-700 dark:text-red-400">
                                Đã chọn {selectedIds.size} Kanji
                            </span>
                            <button
                                onClick={() => setSelectedIds(new Set())}
                                className="text-xs text-red-500 hover:text-red-700 font-semibold underline"
                            >
                                Bỏ chọn
                            </button>
                        </div>
                        <div className="flex items-center gap-2 w-full sm:w-auto">
                            <button
                                onClick={() => folders.length > 0 ? setShowBatchMoveModal(true) : setShowFolderManager(true)}
                                className="flex-1 sm:flex-none px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                            >
                                <Folder className="w-3.5 h-3.5" /> Di chuyển
                            </button>
                            <button
                                onClick={() => setShowConfirmDelete(true)}
                                className="flex-1 sm:flex-none px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                            >
                                <Trash2 className="w-3.5 h-3.5" /> Xóa bỏ
                            </button>
                        </div>
                    </div>
                )}

                {/* ====== MAIN CONTENT ====== */}
                {isInFolderBrowseMode ? (
                    /* ====== LIBRARY FOLDER BROWSE MODE ====== */
                    <div className="space-y-8">
                        {/* Folder Navigation Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            
                            {/* Left Column: Big "Tất cả Kanji" card */}
                            <div className="md:col-span-1">
                                <button
                                    onClick={() => openFolder('__all__')}
                                    className="w-full text-left bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-200/50 dark:border-slate-700 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 shadow-sm flex flex-col justify-between h-[230px] relative group cursor-pointer"
                                >
                                    <div>
                                        <div className="w-12 h-12 rounded-2xl bg-sky-50 dark:bg-sky-950/40 flex items-center justify-center mb-4">
                                            <Bookmark className="w-6 h-6 text-sky-600" />
                                        </div>
                                        <h3 className="text-xl font-bold text-slate-800 dark:text-white">Tất cả Kanji</h3>
                                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                                            {stats.total} ký tự đang được theo dõi
                                        </p>
                                    </div>
                                    
                                    <div className="flex items-center justify-between mt-auto w-full">
                                        <div className="flex items-center gap-1">
                                            {kanjiWithSRS.slice(0, 3).map((k, i) => (
                                                <span key={i} className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-sm font-bold font-japanese text-slate-700 dark:text-slate-300">
                                                    {k.character}
                                                </span>
                                            ))}
                                            {stats.total > 3 && (
                                                <span className="text-xs font-semibold text-slate-400 pl-1">
                                                    +{stats.total - 3}
                                                </span>
                                            )}
                                        </div>
                                        
                                        <div className="w-8 h-8 rounded-full bg-slate-50 dark:bg-slate-700 flex items-center justify-center text-slate-500 dark:text-slate-400 group-hover:bg-[#2E5B70] group-hover:text-white transition-all">
                                            <ChevronRight className="w-4 h-4" />
                                        </div>
                                    </div>
                                </button>
                            </div>

                            {/* Right Column: 2x2 Grid of Level Cards */}
                            <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {JLPT_LEVELS.filter(lvl => lvl === 'N5' || lvl === 'N3' || lvl === 'N1' || lvl === 'N4' || lvl === 'N2').slice(0, 4).map(level => {
                                    const cfg = LEVEL_COLORS[level];
                                    const count = jlptFolderCounts[level] || 0;
                                    // Calculate progress %
                                    const levelCards = kanjiWithSRS.filter(k => k.level === level);
                                    const levelMastered = levelCards.filter(k => k.interval >= 1440 * 7).length;
                                    const progress = levelCards.length > 0 ? Math.round((levelMastered / levelCards.length) * 100) : 0;
                                    
                                    return (
                                        <button
                                            key={level}
                                            onClick={() => openFolder(`jlpt_${level}`)}
                                            className="text-left bg-white dark:bg-slate-800 rounded-3xl p-5 border border-slate-200/50 dark:border-slate-700 hover:shadow-lg transition-all shadow-sm flex flex-col justify-between h-[108px] group cursor-pointer"
                                        >
                                            <div className="flex justify-between items-start w-full">
                                                <div>
                                                    <h4 className="text-sm font-bold text-slate-800 dark:text-white">
                                                        {level}: {LEVEL_LABELS[level]}
                                                    </h4>
                                                    <p className="text-xs text-slate-400 mt-0.5">
                                                        {count} Hán tự
                                                    </p>
                                                </div>
                                                <div className={`w-8 h-8 rounded-xl ${cfg.light} flex items-center justify-center font-bold text-xs ${cfg.text}`}>
                                                    {level}
                                                </div>
                                            </div>
                                            
                                            {/* Progress bar */}
                                            <div className="w-full space-y-1">
                                                <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                                                    <div className={`h-full ${cfg.bg} rounded-full transition-all`} style={{ width: `${progress}%` }}></div>
                                                </div>
                                            </div>
                                        </button>
                                    );
                                })}

                                {/* Add new folder card */}
                                <button
                                    onClick={() => setShowFolderManager(true)}
                                    className="text-left bg-transparent rounded-3xl p-5 border-2 border-dashed border-slate-200 hover:border-[#2E5B70]/50 hover:bg-white dark:hover:bg-slate-800 transition-all flex flex-col items-center justify-center h-[108px] group cursor-pointer"
                                >
                                    <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 group-hover:bg-[#2E5B70] group-hover:text-white transition-all mb-2">
                                        <Plus className="w-4 h-4" />
                                    </div>
                                    <span className="text-xs font-bold text-slate-500 group-hover:text-[#2E5B70] transition-colors">
                                        Thư mục mới
                                    </span>
                                </button>
                            </div>
                        </div>

                        {/* Custom Folders Section */}
                        {rootCustomFolders.length > 0 && (
                            <div className="space-y-3">
                                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">
                                    Thư mục cá nhân
                                </h3>
                                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                                    {rootCustomFolders.map(f => (
                                        <button
                                            key={f.id}
                                            onClick={() => openFolder(f.id)}
                                            className="text-left bg-white dark:bg-slate-800 border border-slate-200/50 dark:border-slate-700 rounded-2xl p-4 hover:shadow-md transition-all shadow-sm flex items-center gap-3 group cursor-pointer"
                                        >
                                            <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/30 flex items-center justify-center text-amber-500">
                                                <Folder className="w-5 h-5 fill-amber-400/20" />
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <h4 className="text-sm font-bold text-slate-800 dark:text-white truncate">{f.name}</h4>
                                                <p className="text-[11px] text-slate-400 font-semibold">{f.count} Kanji</p>
                                            </div>
                                            <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 transition-colors" />
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Bottom Columns */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-4">
                            
                            {/* Left Column: Recent accesses */}
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-base font-bold text-slate-800 dark:text-white">
                                        Xem gần đây
                                    </h3>
                                    <button 
                                        onClick={() => openFolder('__all__')}
                                        className="text-xs font-bold text-sky-600 hover:underline flex items-center gap-0.5"
                                    >
                                        Xem tất cả <ChevronRight className="w-3.5 h-3.5" />
                                    </button>
                                </div>

                                <div className="space-y-3">
                                    {recentlyAccessed.length > 0 ? (
                                        recentlyAccessed.map(kanji => {
                                            const levelColor = LEVEL_COLORS[kanji.level] || { text: 'text-gray-500', light: 'bg-gray-50 font-japanese' };
                                            return (
                                                <div 
                                                    key={kanji.id}
                                                    onClick={() => openKanjiDetail(kanji.character)}
                                                    className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700/50 rounded-2xl p-4 flex items-center justify-between hover:shadow-md transition-all cursor-pointer group"
                                                >
                                                    <div className="flex items-center gap-3.5">
                                                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl font-bold font-japanese ${levelColor.light} ${levelColor.text}`}>
                                                            {kanji.character}
                                                        </div>
                                                        <div>
                                                            <div className="flex items-center gap-2">
                                                                <h4 className="text-sm font-extrabold text-slate-800 dark:text-white font-japanese uppercase tracking-wide">
                                                                    {kanji.character} {getJotobaKanjiData(kanji.character)?.kunyomi?.join(' ') || kanji.sinoViet || ''}
                                                                </h4>
                                                                <span className="text-xs text-slate-400">({kanji.sinoViet})</span>
                                                            </div>
                                                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">
                                                                {kanji.meaning} • JLPT {kanji.level}
                                                            </p>
                                                        </div>
                                                    </div>

                                                    <Bookmark className="w-5 h-5 text-[#2E5B70] fill-[#2E5B70] flex-shrink-0" />
                                                </div>
                                            );
                                        })
                                    ) : (
                                        <div className="bg-white dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50 rounded-2xl p-8 text-center text-slate-400 text-xs font-semibold">
                                            Chưa có hoạt động học gần đây.
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Right Column: Recommendations & Timeline */}
                            <div className="space-y-6">
                                {/* Recommendation Card */}
                                <div className="space-y-3">
                                    <h3 className="text-base font-bold text-slate-800 dark:text-white">
                                        Gợi ý ôn tập
                                    </h3>
                                    
                                    <div className="bg-sky-50/50 dark:bg-sky-950/20 border border-sky-100/50 dark:border-sky-900/30 rounded-2xl p-5 space-y-3">
                                        <div className="flex items-center gap-2">
                                            <span className="bg-sky-100 dark:bg-sky-900 text-sky-800 dark:text-sky-300 text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider">
                                                Quy tắc 80/20
                                            </span>
                                        </div>
                                        
                                        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                                            "Bạn đã thuộc 80% bộ thủ của N3. Hãy dành 15 phút hôm nay để hoàn thành nốt 20% còn lại."
                                        </p>
                                        
                                        <button 
                                            onClick={() => navigate(ROUTES.KANJI_REVIEW)}
                                            className="text-xs font-bold text-[#2E5B70] dark:text-[#5aa9cc] hover:underline inline-flex items-center gap-1 cursor-pointer"
                                        >
                                            Bắt đầu ngay <ArrowRight className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </div>

                                {/* Study Timeline */}
                                <div className="space-y-3">
                                    <h3 className="text-base font-bold text-slate-800 dark:text-white">
                                        Lịch sử học tập
                                    </h3>

                                    <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700/50 rounded-2xl p-5 space-y-4">
                                        <div className="relative border-l border-slate-100 dark:border-slate-700 pl-4 ml-1.5 space-y-4">
                                            
                                            <div className="relative">
                                                <span className="absolute -left-5.5 top-1 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-4 ring-emerald-50 dark:ring-emerald-950"></span>
                                                <div className="text-xs font-bold text-slate-700 dark:text-slate-300">Hoàn thành N5: Chương 4</div>
                                                <div className="text-[10px] text-slate-400 font-semibold mt-0.5">2h trước</div>
                                            </div>

                                            <div className="relative">
                                                <span className="absolute -left-5.5 top-1 w-2.5 h-2.5 rounded-full bg-rose-500 ring-4 ring-rose-50 dark:ring-rose-950"></span>
                                                <div className="text-xs font-bold text-slate-700 dark:text-slate-300">Đã lưu 12 từ mới N1</div>
                                                <div className="text-[10px] text-slate-400 font-semibold mt-0.5">Hôm qua</div>
                                            </div>

                                            <div className="relative">
                                                <span className="absolute -left-5.5 top-1 w-2.5 h-2.5 rounded-full bg-purple-500 ring-4 ring-purple-50 dark:ring-purple-950"></span>
                                                <div className="text-xs font-bold text-slate-700 dark:text-slate-300">Học từ mới N3</div>
                                                <div className="text-[10px] text-slate-400 font-semibold mt-0.5">3 ngày trước</div>
                                            </div>

                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    /* ====== KANJI LIST VIEWER MODE (inside sub-folders, search, etc) ====== */
                    <div className="space-y-4 bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-200/50 dark:border-slate-700 shadow-sm">
                        
                        {/* Breadcrumbs */}
                        <div className="flex flex-wrap items-center gap-1.5 text-xs font-semibold">
                            <button 
                                onClick={goBackToFolders}
                                className="p-2 flex items-center justify-center rounded-xl bg-slate-50 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 transition-all font-bold"
                            >
                                <ChevronLeft className="w-4 h-4 mr-0.5" /> Thư mục
                            </button>
                            <span className="text-slate-300">/</span>
                            
                            {currentFolder && currentFolder.startsWith('jlpt_') ? (
                                <span className={`px-2 py-0.5 rounded-md font-bold ${LEVEL_COLORS[currentFolder.replace('jlpt_', '')]?.text || 'text-slate-700'} bg-slate-50 dark:bg-slate-700`}>
                                    Cấp độ {currentFolderName}
                                </span>
                            ) : currentFolder ? (
                                <>
                                    {getFolderPath(currentFolder).map((seg, i, arr) => (
                                        <React.Fragment key={seg.id}>
                                            {i > 0 && <span className="text-slate-300">/</span>}
                                            {i < arr.length - 1 ? (
                                                <button onClick={() => openFolder(seg.id)} className="text-sky-600 hover:underline">{seg.name}</button>
                                            ) : (
                                                <span className="text-slate-500 font-bold">{seg.name}</span>
                                            )}
                                        </React.Fragment>
                                    ))}
                                </>
                            ) : (
                                <span className="text-slate-500 font-bold">Tìm kiếm kết quả</span>
                            )}
                        </div>

                        {/* Actions bar inside list view */}
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 pb-1 border-b border-slate-100 dark:border-slate-700">
                            <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">
                                Hiển thị {currentFolder ? currentFolderKanji.length : filteredKanji.length} ký tự
                            </span>
                            
                            <button 
                                onClick={selectAllVisible}
                                className="text-xs font-bold text-sky-600 hover:underline"
                            >
                                {(currentFolder ? currentFolderKanji : filteredKanji).every(k => selectedIds.has(k.id)) ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
                            </button>
                        </div>

                        {/* Cards List Grid */}
                        {(currentFolder ? currentFolderKanji : filteredKanji).length === 0 ? (
                            <div className="text-center py-16 space-y-4">
                                <Search className="w-12 h-12 text-slate-300 mx-auto" />
                                <h4 className="text-slate-500 font-semibold text-sm">Không tìm thấy Kanji nào</h4>
                                <button 
                                    onClick={goBackToFolders} 
                                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all"
                                >
                                    Quay lại thư viện
                                </button>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                {(currentFolder ? currentFolderKanji : filteredKanji).map(kanji => {
                                    const isSelected = selectedIds.has(kanji.id);
                                    const StatusIcon = kanji.srsStatus.icon;
                                    const levelColor = LEVEL_COLORS[kanji.level] || { bg: 'bg-gray-500', text: 'text-gray-500', light: 'bg-gray-50' };
                                    
                                    // Mastery progress representation (interval max value benchmark 30 days = 43200 mins)
                                    const strengthPercent = Math.min(100, Math.round((kanji.interval / 43200) * 100));

                                    return (
                                        <div 
                                            key={kanji.id}
                                            className={`group relative flex items-center justify-between p-3.5 rounded-2xl border transition-all cursor-pointer ${
                                                isSelected 
                                                    ? 'bg-red-50/50 dark:bg-red-950/20 border-red-300 dark:border-red-700/50 shadow-sm' 
                                                    : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 hover:shadow-sm'
                                            }`}
                                        >
                                            {/* Checkbox trigger block */}
                                            <div 
                                                onClick={(e) => { e.stopPropagation(); toggleSelect(kanji.id); }} 
                                                className="absolute left-2.5 top-2.5 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                                            >
                                                <div className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-colors bg-white ${
                                                    isSelected ? 'bg-red-500 border-red-500 text-white' : 'border-slate-300'
                                                }`}>
                                                    {isSelected && <span className="text-[10px]">✓</span>}
                                                </div>
                                            </div>

                                            {/* Kanji Character Box */}
                                            <div 
                                                onClick={() => openKanjiDetail(kanji.character)} 
                                                className="flex items-center gap-3.5 flex-1 min-w-0"
                                            >
                                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl font-bold font-japanese ${levelColor.light} ${levelColor.text}`}>
                                                    {kanji.character}
                                                </div>
                                                
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-extrabold text-slate-800 dark:text-white text-sm">{kanji.sinoViet || '---'}</span>
                                                        <span className="text-[10px] text-slate-400 font-semibold">{kanji.strokeCount} nét</span>
                                                    </div>
                                                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                                                        {kanji.meaning}
                                                    </p>
                                                    
                                                    {/* Mini progress line representing mastery */}
                                                    <div className="w-16 h-1 bg-slate-100 dark:bg-slate-700 rounded-full mt-2 overflow-hidden">
                                                        <div className="h-full bg-cyan-500 rounded-full" style={{ width: `${strengthPercent}%` }}></div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Status Badge & Review countdown */}
                                            <div className="flex flex-col items-end gap-1.5 pl-2 flex-shrink-0">
                                                <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${kanji.srsStatus.bg} ${kanji.srsStatus.color}`}>
                                                    <StatusIcon className="w-3 h-3" />
                                                    {kanji.srsStatus.label}
                                                </span>
                                                
                                                {kanji.nextReview > 0 && kanji.reps > 0 && (
                                                    <span className="text-[9px] text-slate-400 font-semibold">
                                                        {(kanji.nextReview || 0) <= Date.now() ? 'Cần ôn' : formatNextReview(kanji.nextReview)}
                                                    </span>
                                                )}
                                            </div>

                                            {/* Menu buttons on hover */}
                                            <div className="opacity-0 group-hover:opacity-100 absolute top-2.5 right-2.5 flex gap-1 transition-all bg-white/90 dark:bg-slate-800/90 rounded-lg p-0.5 shadow-sm border border-slate-100 dark:border-slate-700">
                                                <button 
                                                    onClick={(e) => { e.stopPropagation(); setShowMoveModal(kanji.id); }}
                                                    className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-slate-50 rounded"
                                                    title="Chuyển thư mục"
                                                >
                                                    <Folder className="w-3.5 h-3.5" />
                                                </button>
                                                <button 
                                                    onClick={(e) => { e.stopPropagation(); openKanjiDetail(kanji.character); }}
                                                    className="p-1 text-slate-400 hover:text-sky-600 hover:bg-slate-50 rounded"
                                                    title="Chi tiết"
                                                >
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

                {/* Confirm Delete Dialog */}
                {showConfirmDelete && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                        <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 w-[420px] max-w-full shadow-2xl space-y-4 border border-slate-100 dark:border-slate-700">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-950/30 flex items-center justify-center">
                                    <Trash2 className="w-5 h-5 text-red-600" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-slate-800 dark:text-white">Xóa khỏi ôn tập</h3>
                                    <p className="text-xs text-slate-400">Không thể hoàn tác hành động này</p>
                                </div>
                            </div>
                            
                            <p className="text-sm text-slate-600 dark:text-slate-300">
                                Bạn có chắc chắn muốn xóa {selectedIds.size} Hán tự đã chọn khỏi danh sách ôn tập? Dữ liệu tiến độ học (SRS) của chúng sẽ bị mất hoàn toàn.
                            </p>

                            <div className="flex gap-2.5 pt-2">
                                <button
                                    onClick={() => setShowConfirmDelete(false)}
                                    className="flex-1 py-3 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-2xl font-bold text-sm transition-all"
                                    disabled={deleting}
                                >
                                    Hủy bỏ
                                </button>
                                <button
                                    onClick={handleDeleteSelected}
                                    className="flex-1 py-3 bg-red-600 hover:bg-red-500 text-white rounded-2xl font-bold text-sm transition-all flex items-center justify-center gap-2"
                                    disabled={deleting}
                                >
                                    {deleting ? 'Đang xóa...' : 'Xóa bỏ'}
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
                        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                            <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 w-[360px] max-w-full shadow-2xl space-y-4 border border-slate-100 dark:border-slate-700">
                                <h3 className="text-base font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                    <Folder className="w-5 h-5 text-indigo-500" /> Di chuyển {selectedIds.size} Kanji
                                </h3>
                                <div className="max-h-[260px] overflow-y-auto divide-y divide-slate-100 dark:divide-slate-700">
                                    <button 
                                        onClick={() => batchMoveToFolder('none')}
                                        className="w-full text-left flex items-center gap-3 py-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors px-1"
                                    >
                                        <Folder className="w-4 h-4 text-slate-400" />
                                        <span className="text-sm text-slate-500 italic">Chưa phân loại</span>
                                    </button>
                                    {flatTree.map(f => (
                                        <button 
                                            key={f.id} 
                                            onClick={() => batchMoveToFolder(f.id)}
                                            className="w-full text-left flex items-center gap-2 py-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors px-1"
                                            style={{ paddingLeft: `${4 + f.depth * 16}px` }}
                                        >
                                            <Folder className={`w-4 h-4 ${f.depth > 0 ? 'text-amber-400' : 'text-indigo-400'}`} />
                                            <span className="text-sm text-slate-700 dark:text-slate-300 font-semibold">{f.name}</span>
                                        </button>
                                    ))}
                                    {folders.length === 0 && (
                                        <p className="text-center text-xs text-slate-400 py-6">Chưa có thư mục tùy chỉnh nào.</p>
                                    )}
                                </div>
                                <button 
                                    onClick={() => setShowBatchMoveModal(false)} 
                                    className="w-full py-2.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-bold hover:bg-slate-200"
                                >
                                    Hủy bỏ
                                </button>
                            </div>
                        </div>
                    );
                })()}

                {/* Move Single Folder Modal */}
                {showMoveModal && (() => {
                    const buildTree = (parentId = null, depth = 0) => {
                        return folders.filter(f => (f.parentId || null) === parentId)
                            .flatMap(f => [{ ...f, depth }, ...buildTree(f.id, depth + 1)]);
                    };
                    const flatTree = buildTree();
                    return (
                        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                            <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 w-[360px] max-w-full shadow-2xl space-y-4 border border-slate-100 dark:border-slate-700">
                                <h3 className="text-base font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                    <Folder className="w-5 h-5 text-indigo-500" /> Chọn thư mục lưu trữ
                                </h3>
                                <div className="max-h-[260px] overflow-y-auto divide-y divide-slate-100 dark:divide-slate-700">
                                    <button 
                                        onClick={() => moveKanjiToFolder(showMoveModal, 'none')}
                                        className={`w-full text-left flex items-center gap-3 py-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors px-1 ${!kanjiCardFolders[showMoveModal] ? 'bg-indigo-50/50' : ''}`}
                                    >
                                        <Folder className="w-4 h-4 text-slate-400" />
                                        <span className="text-sm text-slate-500 italic">Chưa phân loại</span>
                                    </button>
                                    {flatTree.map(f => (
                                        <button 
                                            key={f.id} 
                                            onClick={() => moveKanjiToFolder(showMoveModal, f.id)}
                                            className={`w-full text-left flex items-center gap-2 py-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors px-1 ${kanjiCardFolders[showMoveModal] === f.id ? 'bg-indigo-50/50' : ''}`}
                                            style={{ paddingLeft: `${4 + f.depth * 16}px` }}
                                        >
                                            <Folder className={`w-4 h-4 ${f.depth > 0 ? 'text-amber-400' : 'text-indigo-400'}`} />
                                            <span className="text-sm text-slate-700 dark:text-slate-300 font-semibold flex-1">{f.name}</span>
                                            {kanjiCardFolders[showMoveModal] === f.id && <span className="text-[10px] text-indigo-500 font-bold">Lưu ở đây</span>}
                                        </button>
                                    ))}
                                </div>
                                <button 
                                    onClick={() => setShowMoveModal(null)} 
                                    className="w-full py-2.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-bold hover:bg-slate-200"
                                >
                                    Hủy bỏ
                                </button>
                            </div>
                        </div>
                    );
                })()}

                {/* Folder Manager Modal */}
                {showFolderManager && (() => {
                    const buildTree = (parentId = null, depth = 0) => {
                        return folders
                            .filter(f => (f.parentId || null) === parentId)
                            .flatMap(f => [{ ...f, depth }, ...buildTree(f.id, depth + 1)]);
                    };
                    const flatTree = buildTree();
                    return (
                        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                            <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 w-[440px] max-w-full shadow-2xl space-y-4 border border-slate-100 dark:border-slate-700">
                                <h3 className="text-base font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                    <FolderPlus className="w-5 h-5 text-sky-500" /> Quản lý thư mục Kanji
                                </h3>
                                
                                <div className="flex gap-2">
                                    <input 
                                        type="text" 
                                        value={newFolderName}
                                        onChange={(e) => setNewFolderName(e.target.value)}
                                        onKeyDown={(e) => { if (e.key === 'Enter' && newFolderName.trim()) { createFolder(newFolderName); setNewFolderName(''); } }}
                                        placeholder="Tên thư mục mới..."
                                        className="flex-1 bg-slate-50 dark:bg-slate-700 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-sky-500"
                                    />
                                    <button 
                                        onClick={() => { if (newFolderName.trim()) { createFolder(newFolderName); setNewFolderName(''); } }}
                                        className="px-4 py-2 bg-[#2E5B70] text-white rounded-xl text-xs font-bold hover:bg-[#20404f]"
                                    >
                                        Thêm
                                    </button>
                                </div>
                                
                                <div className="max-h-[260px] overflow-y-auto space-y-1 divide-y divide-slate-50 dark:divide-slate-700/50">
                                    {flatTree.length === 0 ? (
                                        <p className="text-center text-xs text-slate-400 py-6">Chưa có thư mục nào.</p>
                                    ) : flatTree.map(f => {
                                        const count = getRecursiveCardCount(f.id);
                                        return (
                                            <div 
                                                key={f.id} 
                                                className="flex items-center gap-2 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-700/30 group px-1 rounded-lg"
                                                style={{ paddingLeft: `${4 + f.depth * 16}px` }}
                                            >
                                                {f.depth > 0 && <span className="text-slate-300">└</span>}
                                                <Folder className={`w-4 h-4 flex-shrink-0 ${f.depth > 0 ? 'text-amber-400' : 'text-indigo-500'}`} />
                                                
                                                {editingFolderId === f.id ? (
                                                    <input 
                                                        type="text" 
                                                        value={editingFolderName}
                                                        onChange={(e) => setEditingFolderName(e.target.value)}
                                                        onBlur={() => { renameFolder(f.id, editingFolderName); setEditingFolderId(null); }}
                                                        onKeyDown={(e) => { if (e.key === 'Enter') { renameFolder(f.id, editingFolderName); setEditingFolderId(null); } }}
                                                        className="flex-1 bg-white border border-sky-400 rounded px-2 py-0.5 text-xs focus:outline-none"
                                                        autoFocus 
                                                    />
                                                ) : (
                                                    <span className="flex-1 text-xs font-semibold text-slate-700 dark:text-slate-300 truncate">{f.name}</span>
                                                )}
                                                
                                                <span className="text-[10px] text-slate-400 font-bold mr-1">{count} từ</span>
                                                
                                                <button 
                                                    onClick={() => { setEditingFolderId(f.id); setEditingFolderName(f.name); }}
                                                    className="p-1 text-slate-400 hover:text-sky-600 transition-colors"
                                                    title="Đổi tên"
                                                >
                                                    <Edit className="w-3.5 h-3.5" />
                                                </button>
                                                <button 
                                                    onClick={() => createFolder('Thư mục con', f.id)}
                                                    className="p-1 text-slate-400 hover:text-emerald-600 transition-colors"
                                                    title="Thư mục con"
                                                >
                                                    <FolderPlus className="w-3.5 h-3.5" />
                                                </button>
                                                <button 
                                                    onClick={async () => { if (await showConfirm(`Xóa thư mục "${f.name}"?`, { type: 'danger', confirmText: 'Xóa' })) deleteFolder(f.id); }}
                                                    className="p-1 text-slate-400 hover:text-red-600 transition-colors"
                                                    title="Xóa"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                                <button 
                                    onClick={() => setShowFolderManager(false)} 
                                    className="w-full py-2.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-bold hover:bg-slate-200"
                                >
                                    Đóng
                                </button>
                            </div>
                        </div>
                    );
                })()}

            </div>
        </div>
    );
};

export default KanjiSRSListScreen;
