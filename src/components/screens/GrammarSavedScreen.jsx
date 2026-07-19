import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import LoadingIndicator from '../ui/LoadingIndicator';
import { Search, Trash2, BookOpen, Clock, CheckCircle, AlertCircle, Filter, X, Eye, Folder, FolderPlus, Edit, Plus, Bookmark } from 'lucide-react';
import { db, appId } from '../../config/firebase';
import { collection, getDocs, doc, deleteDoc, writeBatch } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getSharedGrammarPointsList, getSharedGrammarSrs, getCachedUserGrammarSrsData, updateCachedUserGrammarSrs, subscribeGrammarSrs } from '../../utils/grammarService';
import { ROUTES } from '../../router';
import { showToast, showConfirm } from '../../utils/toast';
import { TopTabBar } from '../ui';
import { GRAMMAR_TABS } from '../../config/tabs';

const JLPT_LEVELS = ['N5', 'N4', 'N3', 'N2', 'N1'];

const LEVEL_COLORS = {
    N5: { bg: 'bg-emerald-500', text: 'text-emerald-500', border: 'border-emerald-500', light: 'bg-emerald-50 dark:bg-emerald-950/20' },
    N4: { bg: 'bg-sky-500', text: 'text-sky-500', border: 'border-sky-500', light: 'bg-sky-50 dark:bg-sky-950/20' },
    N3: { bg: 'bg-sky-500', text: 'text-sky-500', border: 'border-sky-500', light: 'bg-sky-50 dark:bg-sky-950/20' },
    N2: { bg: 'bg-amber-500', text: 'text-amber-500', border: 'border-amber-500', light: 'bg-amber-50 dark:bg-amber-950/20' },
    N1: { bg: 'bg-rose-500', text: 'text-rose-500', border: 'border-rose-500', light: 'bg-rose-50 dark:bg-rose-950/20' },
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

const GrammarSavedScreen = () => {
    const user = getAuth().currentUser;
    const userId = user?.uid;
    const navigate = useNavigate();
    
    const [grammarList, setGrammarList] = useState([]);
    const [srsData, setSrsData] = useState(() => (userId ? getCachedUserGrammarSrsData() || {} : {}));
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterLevel, setFilterLevel] = useState('all');
    const [filterStatus, setFilterStatus] = useState('all');
    const [selectedIds, setSelectedIds] = useState(new Set());
    const [deleting, setDeleting] = useState(false);
    const [showConfirmDelete, setShowConfirmDelete] = useState(false);

    // Folders
    const [folders, setFolders] = useState([]);
    const [cardFolders, setCardFolders] = useState({});
    const [filterFolder, setFilterFolder] = useState('all');
    const [showFolderManager, setShowFolderManager] = useState(false);
    const [showMoveModal, setShowMoveModal] = useState(null);
    const [showBatchMoveModal, setShowBatchMoveModal] = useState(false);
    const [newFolderName, setNewFolderName] = useState('');
    const [editingFolderId, setEditingFolderId] = useState(null);
    const [editingFolderName, setEditingFolderName] = useState('');

    const [recentlyViewed, setRecentlyViewed] = useState([]);
    const [studyHistory, setStudyHistory] = useState([]);

    const formatTimeAgo = (timestamp) => {
        if (!timestamp) return '';
        const diff = Date.now() - timestamp;
        const mins = Math.floor(diff / 60000);
        if (mins < 1) return 'Vừa xong';
        if (mins < 60) return `${mins} phút trước`;
        const hours = Math.floor(mins / 60);
        if (hours < 24) return `${hours} giờ trước`;
        const days = Math.floor(hours / 24);
        if (days === 1) return 'Hôm qua';
        return `${days} ngày trước`;
    };

    useEffect(() => {
        const foldersKey = userId ? `grammar_srs_folders_${userId}` : 'grammar_srs_folders';
        const cardFoldersKey = userId ? `grammar_srs_card_folders_${userId}` : 'grammar_srs_card_folders';
        
        try {
            const savedFolders = localStorage.getItem(foldersKey);
            setFolders(savedFolders ? JSON.parse(savedFolders) : []);
        } catch (e) { setFolders([]); }
        
        try {
            const savedCardFolders = localStorage.getItem(cardFoldersKey);
            setCardFolders(savedCardFolders ? JSON.parse(savedCardFolders) : {});
        } catch (e) { setCardFolders({}); }
    }, [userId]);

    useEffect(() => {
        const loadHistoryAndRecents = () => {
            const recentsKey = userId ? `grammar_recently_viewed_${userId}` : 'grammar_recently_viewed';
            const historyKey = userId ? `grammar_study_history_${userId}` : 'grammar_study_history';
            
            try {
                setRecentlyViewed(JSON.parse(localStorage.getItem(recentsKey)) || []);
            } catch (e) { setRecentlyViewed([]); }

            try {
                setStudyHistory(JSON.parse(localStorage.getItem(historyKey)) || []);
            } catch (e) { setStudyHistory([]); }
        };

        loadHistoryAndRecents();

        const handleRecentsChange = () => {
            try {
                const recentsKey = userId ? `grammar_recently_viewed_${userId}` : 'grammar_recently_viewed';
                setRecentlyViewed(JSON.parse(localStorage.getItem(recentsKey)) || []);
            } catch (e) {}
        };
        const handleHistoryChange = () => {
            try {
                const historyKey = userId ? `grammar_study_history_${userId}` : 'grammar_study_history';
                setStudyHistory(JSON.parse(localStorage.getItem(historyKey)) || []);
            } catch (e) {}
        };

        window.addEventListener('grammar_recently_viewed_changed', handleRecentsChange);
        window.addEventListener('grammar_history_changed', handleHistoryChange);
        return () => {
            window.removeEventListener('grammar_recently_viewed_changed', handleRecentsChange);
            window.removeEventListener('grammar_history_changed', handleHistoryChange);
        };
    }, [userId]);

    useEffect(() => {
        const load = async () => {
            try {
                const [gps, srs] = await Promise.all([
                    getSharedGrammarPointsList(),
                    userId ? getSharedGrammarSrs(userId) : Promise.resolve({})
                ]);
                setGrammarList(gps || []);
                if (userId && srs) {
                    setSrsData(srs);
                }
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        load();

        // Real-time listener for cross-device sync
        let unsubSrs = () => {};
        if (userId) {
            unsubSrs = subscribeGrammarSrs(userId, (freshSrs) => {
                setSrsData(freshSrs);
            });
        }
        return () => unsubSrs();
    }, [userId]);

    const savedItems = useMemo(() => {
        return grammarList.filter(g => !!srsData[g.id]);
    }, [grammarList, srsData]);

    const filteredItems = useMemo(() => {
        return savedItems.filter(item => {
            const matchesSearch = searchQuery.trim() === '' || 
                (item.pattern && item.pattern.toLowerCase().includes(searchQuery.toLowerCase())) ||
                (item.meaningShort && item.meaningShort.toLowerCase().includes(searchQuery.toLowerCase())) ||
                (item.meaning && item.meaning.toLowerCase().includes(searchQuery.toLowerCase()));

            const itemLevel = item.level || item.jlpt || 'N5';
            const matchesLevel = filterLevel === 'all' || itemLevel.toUpperCase().includes(filterLevel.toUpperCase());

            const status = getSrsStatus(srsData[item.id]);
            const matchesStatus = filterStatus === 'all' || 
                (filterStatus === 'due' && status.label === 'Cần ôn') ||
                (filterStatus === 'learning' && status.label === 'Đang học') ||
                (filterStatus === 'mastered' && status.label === 'Đã thuộc') ||
                (filterStatus === 'new' && status.label === 'Mới');

            const itemFolder = cardFolders[item.id] || 'unassigned';
            const matchesFolder = filterFolder === 'all' || 
                (filterFolder === 'unassigned' && itemFolder === 'unassigned') ||
                (itemFolder === filterFolder);

            return matchesSearch && matchesLevel && matchesStatus && matchesFolder;
        });
    }, [savedItems, srsData, searchQuery, filterLevel, filterStatus, filterFolder, cardFolders]);

    const handleSelectAll = () => {
        if (selectedIds.size === filteredItems.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(filteredItems.map(i => i.id)));
        }
    };

    const handleSelectOne = (id) => {
        const next = new Set(selectedIds);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setSelectedIds(next);
    };

    const deleteGrammarSRS = async (idsToDelete) => {
        if (!userId) return;
        setDeleting(true);
        try {
            const batch = writeBatch(db);
            idsToDelete.forEach(id => {
                const srsRef = doc(db, `artifacts/${appId}/users/${userId}/grammarSRS`, id);
                batch.delete(srsRef);
            });
            await batch.commit();
            
            // Update local state
            setSrsData(prev => {
                const updated = { ...prev };
                idsToDelete.forEach(id => {
                    delete updated[id];
                    updateCachedUserGrammarSrs(userId, id, null);
                });
                return updated;
            });

            setSelectedIds(prev => {
                const next = new Set(prev);
                idsToDelete.forEach(id => next.delete(id));
                return next;
            });
            showToast(`Đã xoá ${idsToDelete.length} mục ra khỏi SRS`);
        } catch (e) {
            console.error('Delete saved grammar error:', e);
            showToast('Lỗi khi xoá dữ liệu');
        } finally {
            setDeleting(false);
        }
    };

    const handleBatchDelete = async () => {
        if (selectedIds.size === 0) return;
        if (await showConfirm(`Bạn có chắc chắn muốn xoá ${selectedIds.size} cấu trúc ngữ pháp đã chọn khỏi danh sách ôn tập?`, { type: 'danger', confirmText: 'Xoá' })) {
            deleteGrammarSRS(Array.from(selectedIds));
        }
    };

    const createFolder = () => {
        if (!newFolderName.trim()) return;
        const newFolderObj = {
            id: `folder_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            name: newFolderName.trim(),
            createdAt: Date.now()
        };
        const updated = [...folders, newFolderObj];
        setFolders(updated);
        localStorage.setItem(userId ? `grammar_srs_folders_${userId}` : 'grammar_srs_folders', JSON.stringify(updated));
        setNewFolderName('');
    };

    const saveCardFolders = (updatedCardFolders) => {
        setCardFolders(updatedCardFolders);
        localStorage.setItem(userId ? `grammar_srs_card_folders_${userId}` : 'grammar_srs_card_folders', JSON.stringify(updatedCardFolders));
    };

    const moveCardToFolder = (cardId, folderId) => {
        const next = { ...cardFolders };
        if (folderId === 'unassigned') {
            delete next[cardId];
        } else {
            next[cardId] = folderId;
        }
        saveCardFolders(next);
        showToast('Đã di chuyển học phần');
    };

    const moveSelectedToFolder = (folderId) => {
        const next = { ...cardFolders };
        selectedIds.forEach(id => {
            if (folderId === 'unassigned') {
                delete next[id];
            } else {
                next[id] = folderId;
            }
        });
        saveCardFolders(next);
        setSelectedIds(new Set());
        setShowBatchMoveModal(false);
        showToast(`Đã di chuyển ${selectedIds.size} học phần`);
    };

    const deleteFolder = async (folderId) => {
        if (await showConfirm('Xoá thư mục này? Các cấu trúc bên trong sẽ không bị xoá, chúng sẽ được chuyển về mặc định.', { type: 'danger', confirmText: 'Xoá' })) {
            const nextFolders = folders.filter(f => f.id !== folderId);
            setFolders(nextFolders);
            localStorage.setItem(userId ? `grammar_srs_folders_${userId}` : 'grammar_srs_folders', JSON.stringify(nextFolders));
            
            const nextCardFolders = { ...cardFolders };
            Object.keys(nextCardFolders).forEach(key => {
                if (nextCardFolders[key] === folderId) {
                    delete nextCardFolders[key];
                }
            });
            saveCardFolders(nextCardFolders);
            
            if (filterFolder === folderId) setFilterFolder('all');
            showToast('Đã xoá thư mục');
        }
    };

    const renameFolder = () => {
        if (!editingFolderName.trim() || !editingFolderId) return;
        const next = folders.map(f => f.id === editingFolderId ? { ...f, name: editingFolderName.trim() } : f);
        setFolders(next);
        localStorage.setItem(userId ? `grammar_srs_folders_${userId}` : 'grammar_srs_folders', JSON.stringify(next));
        setEditingFolderId(null);
        setEditingFolderName('');
    };

    if (loading) {
        return (
            <div className="w-full pb-8">
                <TopTabBar tabs={GRAMMAR_TABS} />
                <div className="animate-fade-in">
                    <LoadingIndicator text="Đang tải danh sách đã lưu..." />
                </div>
            </div>
        );
    }

    return (
        <div className="w-full pb-8">
            <TopTabBar tabs={GRAMMAR_TABS} />

            <div className="max-w-7xl mx-auto px-4 mt-6 animate-fade-in">
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                    <div className="lg:col-span-3 space-y-6">
                        <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-sm border border-gray-200/60 dark:border-slate-700/60 space-y-4">
                            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                                <h1 className="text-xl font-extrabold text-gray-800 dark:text-white flex items-center gap-2">
                                    <Bookmark className="w-6 h-6 text-indigo-500 fill-indigo-500/20" />
                                    Ngữ pháp đã lưu ({savedItems.length})
                                </h1>

                                <div className="flex items-center gap-2.5 w-full md:w-auto">
                                    <div className="relative flex-1 md:w-64">
                                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                        <input
                                            type="text"
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            placeholder="Tìm mẫu câu hoặc ý nghĩa..."
                                            className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-750 rounded-xl outline-none text-slate-800 dark:text-slate-100 placeholder:text-gray-400"
                                        />
                                    </div>
                                    <button 
                                        onClick={() => setShowFolderManager(!showFolderManager)}
                                        className={`p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:scale-105 active:scale-95 transition-transform shrink-0 ${showFolderManager ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border-indigo-200' : 'bg-white dark:bg-slate-800 text-slate-655'}`}
                                    >
                                        <Folder className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>

                            {showFolderManager && (
                                <div className="bg-slate-50 dark:bg-slate-905/40 rounded-2xl p-4 border border-slate-200/65 dark:border-slate-700/50 space-y-4">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-sm font-extrabold text-slate-700 dark:text-slate-350">Quản lý thư mục</h3>
                                        <span className="text-[10px] bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-2 py-0.5 rounded-full font-bold">Thư mục đã tạo</span>
                                    </div>
                                    
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="text"
                                            value={newFolderName}
                                            onChange={(e) => setNewFolderName(e.target.value)}
                                            placeholder="Tên thư mục mới..."
                                            className="flex-1 px-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-750 rounded-xl outline-none"
                                        />
                                        <button onClick={createFolder} className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1">
                                            <Plus className="w-3.5 h-3.5" /> Tạo
                                        </button>
                                    </div>

                                    {folders.length > 0 ? (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                            {folders.map(f => (
                                                <div key={f.id} className="flex items-center justify-between p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-750 rounded-xl">
                                                    {editingFolderId === f.id ? (
                                                        <div className="flex items-center gap-1.5 w-full">
                                                            <input
                                                                type="text"
                                                                value={editingFolderName}
                                                                onChange={(e) => setEditingFolderName(e.target.value)}
                                                                className="flex-1 px-2 py-0.5 text-xs border border-slate-200 rounded outline-none"
                                                            />
                                                            <button onClick={renameFolder} className="text-[10px] font-bold text-indigo-600">Lưu</button>
                                                            <button onClick={() => setEditingFolderId(null)} className="text-[10px] font-bold text-gray-500">Huỷ</button>
                                                        </div>
                                                    ) : (
                                                        <>
                                                            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 truncate">{f.name}</span>
                                                            <div className="flex items-center gap-1.5 shrink-0 ml-2">
                                                                <button onClick={() => { setEditingFolderId(f.id); setEditingFolderName(f.name); }} className="text-slate-400 hover:text-indigo-600"><Edit className="w-3.5 h-3.5" /></button>
                                                                <button onClick={() => deleteFolder(f.id)} className="text-slate-400 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
                                                            </div>
                                                        </>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-[11px] text-slate-400 text-center italic py-2">Chưa tạo thư mục nào</p>
                                    )}
                                </div>
                            )}

                            <div className="flex flex-wrap items-center gap-2">
                                <div className="flex items-center gap-1 text-xs text-gray-400 font-bold uppercase tracking-wider shrink-0 mr-2">
                                    <Filter className="w-3.5 h-3.5" /> Lọc theo:
                                </div>
                                <select 
                                    value={filterLevel} 
                                    onChange={(e) => setFilterLevel(e.target.value)}
                                    className="px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-300 font-semibold"
                                >
                                    <option value="all">Tất cả cấp độ</option>
                                    {JLPT_LEVELS.map(lvl => <option key={lvl} value={lvl}>{lvl}</option>)}
                                </select>

                                <select 
                                    value={filterStatus} 
                                    onChange={(e) => setFilterStatus(e.target.value)}
                                    className="px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-300 font-semibold"
                                >
                                    <option value="all">Tất cả trạng thái</option>
                                    <option value="due">Cần ôn tập</option>
                                    <option value="learning">Đang học</option>
                                    <option value="mastered">Đã thuộc</option>
                                    <option value="new">Mới lưu</option>
                                </select>

                                <select 
                                    value={filterFolder} 
                                    onChange={(e) => setFilterFolder(e.target.value)}
                                    className="px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-300 font-semibold max-w-[180px] truncate"
                                >
                                    <option value="all">Tất cả thư mục</option>
                                    <option value="unassigned">Chưa xếp nhóm</option>
                                    {folders.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                                </select>
                            </div>
                        </div>

                        {selectedIds.size > 0 && (
                            <div className="bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-150 dark:border-indigo-900/40 rounded-2xl p-4 flex items-center justify-between gap-4 animate-scale-up">
                                <span className="text-xs font-bold text-indigo-700 dark:text-indigo-400">
                                    Đã chọn {selectedIds.size} / {filteredItems.length} cấu trúc
                                </span>
                                <div className="flex items-center gap-2">
                                    <button 
                                        onClick={() => setShowBatchMoveModal(true)}
                                        className="px-3.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-850 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold flex items-center gap-1.5"
                                    >
                                        <Folder className="w-3.5 h-3.5" /> Chuyển nhóm
                                    </button>
                                    <button 
                                        onClick={handleBatchDelete}
                                        className="px-3.5 py-1.5 bg-red-50 hover:bg-red-100 dark:bg-red-950 dark:hover:bg-red-900/60 text-red-600 dark:text-red-400 rounded-xl text-xs font-bold flex items-center gap-1.5 border border-red-200 dark:border-red-900/30"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" /> Xoá khỏi SRS
                                    </button>
                                </div>
                            </div>
                        )}

                        {filteredItems.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {filteredItems.map(item => {
                                    const srs = srsData[item.id];
                                    const status = getSrsStatus(srs);
                                    const statusIcon = React.createElement(status.icon, { className: 'w-3.5 h-3.5' });
                                    const itemLevel = item.level || item.jlpt || 'N5';
                                    const isSelected = selectedIds.has(item.id);

                                    return (
                                        <div 
                                            key={item.id} 
                                            onClick={() => navigate(`/grammar/detail/${item.id}?tb=${item.textbookId || ''}&ls=${item.lessonId || ''}&from=saved`)}
                                            className={`bg-white dark:bg-slate-800 border rounded-2xl p-4 shadow-sm hover:shadow-md hover:border-slate-300 dark:hover:border-slate-600 transition-all duration-300 flex items-start gap-3 cursor-pointer group relative ${isSelected ? 'border-indigo-500 dark:border-indigo-500 bg-indigo-50/5' : 'border-gray-200/60 dark:border-slate-700/60'}`}
                                        >
                                            <div onClick={(e) => { e.stopPropagation(); handleSelectOne(item.id); }} className="pt-0.5 select-none relative z-10">
                                                <div className={`w-4 h-4 rounded-md border flex items-center justify-center transition-all ${isSelected ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-300 dark:border-slate-655 bg-white dark:bg-slate-900'}`}>
                                                    {isSelected && <div className="w-1.5 h-1.5 bg-white rounded-full"></div>}
                                                </div>
                                            </div>

                                            <div className="flex-1 min-w-0 space-y-2">
                                                <div className="flex items-center justify-between gap-2.5">
                                                    <span className={`px-2 py-0.5 text-[9px] font-black tracking-wide rounded-md text-white ${LEVEL_COLORS[itemLevel]?.bg || 'bg-slate-500'}`}>
                                                        {itemLevel}
                                                    </span>
                                                    
                                                    <div className="flex items-center gap-2 relative z-10 shrink-0">
                                                        <select
                                                            value={cardFolders[item.id] || 'unassigned'}
                                                            onChange={(e) => { e.stopPropagation(); moveCardToFolder(item.id, e.target.value); }}
                                                            className="text-[10px] bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md py-0.5 px-1 font-bold text-slate-500 max-w-[100px] outline-none"
                                                        >
                                                            <option value="unassigned">Chưa nhóm</option>
                                                            {folders.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                                                        </select>

                                                        <button
                                                            onClick={async (e) => {
                                                                e.stopPropagation();
                                                                if (await showConfirm(`Bạn có chắc muốn xoá "${item.pattern}" khỏi danh sách ôn tập?`, { type: 'danger', confirmText: 'Xoá' })) {
                                                                    deleteGrammarSRS([item.id]);
                                                                }
                                                            }}
                                                            className="p-1 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
                                                            title="Xoá khỏi danh sách ôn tập"
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                </div>

                                                <div className="space-y-1">
                                                    <h3 className="font-bold text-slate-800 dark:text-white text-base group-hover:text-indigo-650 dark:group-hover:text-indigo-400 transition-colors leading-tight font-japanese">
                                                        {item.pattern}
                                                    </h3>
                                                    <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1">
                                                        {item.meaningShort || item.meaning}
                                                    </p>
                                                </div>

                                                <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-750/70 text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                                                    <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full ${status.bg} ${status.color}`}>
                                                        {statusIcon}
                                                        {status.label}
                                                    </div>
                                                    {srs && (
                                                        <span>
                                                            Kỳ sau: {formatNextReview(srs.nextReview)}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="bg-white dark:bg-slate-800 rounded-3xl p-12 shadow-sm border border-gray-200/60 dark:border-slate-700/60 text-center space-y-4">
                                <Bookmark className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto" />
                                <div className="space-y-1">
                                    <h3 className="font-extrabold text-slate-700 dark:text-slate-300 text-base">Không tìm thấy cấu trúc ngữ pháp nào</h3>
                                    <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
                                        Không tìm thấy kết quả khớp với bộ lọc tìm kiếm hiện tại. Thử đổi từ khoá hoặc xoá bộ lọc.
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="space-y-6">
                        <div className="bg-white dark:bg-slate-800 rounded-3xl p-5 border border-slate-200/65 dark:border-slate-700/60 shadow-sm space-y-5">
                            <h3 className="font-extrabold text-gray-800 dark:text-white text-sm flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-750">
                                Xem gần đây
                            </h3>
                            {recentlyViewed.length > 0 ? (
                                <div className="space-y-3">
                                    {recentlyViewed.slice(0, 5).map(id => {
                                        const found = grammarList.find(g => g.id === id);
                                        if (!found) return null;
                                        return (
                                            <div 
                                                key={id}
                                                onClick={() => navigate(`/grammar/detail/${id}`)}
                                                className="flex items-center justify-between p-2.5 hover:bg-slate-50 dark:hover:bg-slate-900 rounded-xl cursor-pointer border border-transparent hover:border-slate-100 transition-all"
                                            >
                                                <div className="min-w-0">
                                                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate font-japanese">{found.pattern}</p>
                                                    <p className="text-[10px] text-slate-400 truncate">{found.meaningShort || found.meaning}</p>
                                                </div>
                                                <span className="text-[9px] font-black text-white px-1.5 py-0.5 rounded bg-indigo-500">
                                                    {found.level || found.jlpt || 'N5'}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <p className="text-[10px] text-slate-400 text-center italic py-2">Chưa xem mẫu câu nào gần đây</p>
                            )}
                        </div>

                        <div className="bg-white dark:bg-slate-800 rounded-3xl p-5 border border-slate-200/65 dark:border-slate-700/60 shadow-sm space-y-5">
                            <h3 className="font-extrabold text-gray-800 dark:text-white text-sm flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-750">
                                Lịch sử ôn tập
                            </h3>
                            {studyHistory.length > 0 ? (
                                <div className="space-y-3.5">
                                    {studyHistory.slice(0, 5).map(act => (
                                        <div key={act.id} className="space-y-1">
                                            <div className="flex items-center justify-between gap-2">
                                                <p className="text-xs font-bold text-slate-800 dark:text-slate-250 truncate">{act.title}</p>
                                                <span className="text-[9px] text-slate-400 shrink-0 font-medium">{formatTimeAgo(act.timestamp)}</span>
                                            </div>
                                            {act.details && <p className="text-[10px] text-slate-450 leading-relaxed">{act.details}</p>}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-[10px] text-slate-400 text-center italic py-2">Chưa có lịch sử học tập</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Batch Move Modal */}
            {showBatchMoveModal && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-850 rounded-3xl p-6 max-w-sm w-full border border-slate-200 dark:border-slate-700 shadow-2xl space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="font-extrabold text-slate-800 dark:text-white text-base">Di chuyển {selectedIds.size} học phần</h3>
                            <button onClick={() => setShowBatchMoveModal(false)} className="text-slate-400 hover:text-slate-650"><X className="w-5 h-5" /></button>
                        </div>
                        <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
                            <button 
                                onClick={() => moveSelectedToFolder('unassigned')}
                                className="w-full text-left p-3 hover:bg-slate-50 dark:hover:bg-slate-900 rounded-xl text-xs font-bold border border-slate-100 dark:border-slate-800"
                            >
                                Không đưa vào nhóm nào (Mặc định)
                            </button>
                            {folders.map(f => (
                                <button 
                                    key={f.id}
                                    onClick={() => moveSelectedToFolder(f.id)}
                                    className="w-full text-left p-3 hover:bg-slate-50 dark:hover:bg-slate-900 rounded-xl text-xs font-bold border border-slate-100 dark:border-slate-800"
                                >
                                    Thư mục: {f.name}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default GrammarSavedScreen;
