import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { Search, Trash2, ChevronLeft, ChevronRight, ChevronDown, BookOpen, Clock, CheckCircle, AlertCircle, Filter, X, Eye, Folder, FolderPlus, Edit, Plus, List, Heart, Bookmark, ArrowRight } from 'lucide-react'
import { db, appId } from '../../config/firebase';
import { collection, getDocs, getDoc, doc, deleteDoc, writeBatch } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getSharedKanjiList, getSharedKanjiSrs, getCachedKanjiList, getCachedUserSrsData, updateCachedUserSrs, subscribeKanjiSrs } from '../../utils/kanjiService';
import { ROUTES } from '../../router';
import { showToast, showConfirm } from '../../utils/toast';
import { getJotobaKanjiData } from '../../data/jotobaKanjiData';
import { TopTabBar } from '../ui';
import LoadingIndicator from '../ui/LoadingIndicator';
import { useLanguage } from '../../context/LanguageContext';
import { KANJI_TABS } from '../../config/tabs';
import { parseNextReviewMs, isSrsCardDue, normalizeSRSState, getLearnAheadLimitMs } from '../../utils/srs';

const JLPT_LEVELS = ['N5', 'N4', 'N3', 'N2', 'N1'];

const LEVEL_COLORS = {
    N5: { bg: 'bg-emerald-500', text: 'text-emerald-500', border: 'border-emerald-500', light: 'bg-emerald-50 dark:bg-emerald-950/20' },
    N4: { bg: 'bg-sky-500', text: 'text-sky-500', border: 'border-sky-500', light: 'bg-sky-50 dark:bg-sky-950/20' },
    N3: { bg: 'bg-sky-500', text: 'text-sky-500', border: 'border-sky-500', light: 'bg-sky-50 dark:bg-sky-950/20' },
    N2: { bg: 'bg-amber-500', text: 'text-amber-500', border: 'border-amber-500', light: 'bg-amber-50 dark:bg-amber-950/20' },
    N1: { bg: 'bg-rose-500', text: 'text-rose-500', border: 'border-rose-500', light: 'bg-rose-50 dark:bg-rose-950/20' },
};

const LEVEL_LABELS = {
    N5: 'Basic',
    N4: 'Elementary',
    N3: 'Intermediate',
    N2: 'Advanced',
    N1: 'Fluent'
};

const getSrsStatus = (srs, t = (k, d) => d) => {
    if (!srs) return { label: t('kanji.notLearned', 'Chưa học'), color: 'text-gray-400', bg: 'bg-gray-100 dark:bg-slate-700', icon: AlertCircle };
    const norm = normalizeSRSState(srs);
    const interval = norm.interval || 0;
    const reps = norm.reps || 0;
    const lastReview = srs.lastReview;
    const state = norm.state ? String(norm.state).toUpperCase() : 'NEW';
    const now = Date.now();
    const reviewMs = parseNextReviewMs(srs.nextReview);
    const isDue = reviewMs > 0 && reviewMs <= now;

    if (isDue) return { label: t('kanji.due', 'Cần ôn'), color: 'text-orange-500', bg: 'bg-orange-50 dark:bg-orange-900/30', icon: Clock };
    
    if (state === 'NEW' || state === 'LEARNING' || state === 'RELEARNING') {
        if (reps > 0 || lastReview) {
            return { label: t('kanji.apprenticeStage', 'Sơ cấp'), color: 'text-yellow-500', bg: 'bg-yellow-50 dark:bg-yellow-900/30', icon: BookOpen };
        }
        return { label: t('kanji.notLearned', 'Chưa học'), color: 'text-slate-400', bg: 'bg-slate-100 dark:bg-slate-700', icon: AlertCircle };
    }
    
    const daysInterval = interval >= 1440 ? Math.round(interval / 1440) : interval;
    if (daysInterval >= 21) {
        return { label: t('kanji.expertStage', 'Chuyên gia'), color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-900/30', icon: CheckCircle };
    }
    if (daysInterval >= 7) {
        return { label: t('kanji.masterStage', 'Cao cấp'), color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-900/30', icon: CheckCircle };
    }
    return { label: t('kanji.guruStage', 'Trung cấp'), color: 'text-cyan-500', bg: 'bg-cyan-50 dark:bg-cyan-900/30', icon: Clock };
};

const formatNextReview = (nextReview, t = (k, d) => d) => {
    const reviewMs = parseNextReviewMs(nextReview);
    if (!reviewMs) return '';
    const now = Date.now();
    const diff = reviewMs - now;
    if (diff <= 0) return t('kanji.rightNow', 'Ngay bây giờ');
    const minutes = Math.floor(diff / 60000);
    if (minutes < 60) return t('kanji.inMinutes', '{count} phút').replace('{count}', minutes);
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return t('kanji.inHours', '{count} giờ').replace('{count}', hours);
    const days = Math.floor(hours / 24);
    if (days < 30) return t('kanji.inDays', '{count} ngày').replace('{count}', days);
    return t('kanji.inMonths', '{count} tháng').replace('{count}', Math.floor(days / 30));
};

const KanjiSRSListScreen = () => {
    const { t } = useLanguage();
    const user = getAuth().currentUser;
    const userId = user?.uid;
    const navigate = useNavigate();
    const [kanjiList, setKanjiList] = useState(() => getCachedKanjiList() || []);
    const [srsData, setSrsData] = useState(() => (userId ? getCachedUserSrsData() || {} : {}));
    const [loading, setLoading] = useState(() => {
        const hasKanji = !!getCachedKanjiList();
        const hasSrs = userId ? !!getCachedUserSrsData() : true;
        return !(hasKanji && hasSrs);
    });
    const [searchQuery, setSearchQuery] = useState('');
    const [filterLevel, setFilterLevel] = useState('all');
    const [filterStatus, setFilterStatus] = useState('all');
    const [visibleLimit, setVisibleLimit] = useState(50);
    const [selectedKanjiChar, setSelectedKanjiChar] = useState(null);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [selectedIds, setSelectedIds] = useState(new Set());
    const [deleting, setDeleting] = useState(false);
    const [showConfirmDelete, setShowConfirmDelete] = useState(false);

    // Folder management — with parentId for nesting
    const [folders, setFolders] = useState([]);
    const [kanjiCardFolders, setKanjiCardFolders] = useState({});

    // Load folders & cardFolders when userId changes
    useEffect(() => {
        const foldersKey = userId ? `kanji_srs_folders_${userId}` : 'kanji_srs_folders';
        const cardFoldersKey = userId ? `kanji_srs_card_folders_${userId}` : 'kanji_srs_card_folders';
        
        try {
            const savedFolders = localStorage.getItem(foldersKey);
            setFolders(savedFolders ? JSON.parse(savedFolders) : []);
        } catch (e) {
            setFolders([]);
        }
        
        try {
            const savedCardFolders = localStorage.getItem(cardFoldersKey);
            setKanjiCardFolders(savedCardFolders ? JSON.parse(savedCardFolders) : {});
        } catch (e) {
            setKanjiCardFolders({});
        }
    }, [userId]);
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

    const [recentlyViewed, setRecentlyViewed] = useState([]);
    const [studyHistory, setStudyHistory] = useState([]);

    const formatTimeAgo = (timestamp) => {
        if (!timestamp) return '';
        const diff = Date.now() - timestamp;
        const mins = Math.floor(diff / 60000);
        if (mins < 1) return t('kanji.justNow', 'Vừa xong');
        if (mins < 60) return t('kanji.minutesAgo', '{count} phút trước').replace('{count}', mins);
        const hours = Math.floor(mins / 60);
        if (hours < 24) return t('kanji.hoursAgo', '{count} giờ trước').replace('{count}', hours);
        const days = Math.floor(hours / 24);
        if (days === 1) return t('kanji.yesterday', 'Hôm qua');
        return t('kanji.daysAgo', '{count} ngày trước').replace('{count}', days);
    };

    // Load Recently Viewed and Study History
    useEffect(() => {
        const loadHistoryAndRecents = async () => {
            const recentsKey = userId ? `kanji_recently_viewed_${userId}` : 'kanji_recently_viewed';
            const historyKey = userId ? `kanji_study_history_${userId}` : 'kanji_study_history';
            
            let localRecents = [];
            try {
                localRecents = JSON.parse(localStorage.getItem(recentsKey)) || [];
            } catch (e) { console.error(e); }

            let localHistory = [];
            try {
                localHistory = JSON.parse(localStorage.getItem(historyKey)) || [];
            } catch (e) { console.error(e); }

            setRecentlyViewed(localRecents);
            setStudyHistory(localHistory);

            if (userId) {
                try {
                    const recentDocRef = doc(db, `artifacts/${appId}/users/${userId}/settings`, 'kanjiRecent');
                    const recentSnap = await getDoc(recentDocRef);
                    if (recentSnap.exists()) {
                        const fbRecents = recentSnap.data().characters || [];
                        if (fbRecents.length > 0) {
                            setRecentlyViewed(fbRecents.slice(0, 10));
                            localStorage.setItem(recentsKey, JSON.stringify(fbRecents.slice(0, 15)));
                        }
                    }
                } catch (err) {
                    console.warn('Could not load recent Kanji from Firebase:', err.message);
                }

                try {
                    const historyDocRef = doc(db, `artifacts/${appId}/users/${userId}/settings`, 'kanjiHistory');
                    const historySnap = await getDoc(historyDocRef);
                    if (historySnap.exists()) {
                        const fbHistory = historySnap.data().activities || [];
                        if (fbHistory.length > 0) {
                            setStudyHistory(fbHistory.slice(0, 10));
                            localStorage.setItem(historyKey, JSON.stringify(fbHistory.slice(0, 50)));
                        }
                    }
                } catch (err) {
                    console.warn('Could not load history from Firebase:', err.message);
                }
            }
        };

        loadHistoryAndRecents();

        const handleRecentsChange = () => {
            try {
                const recentsKey = userId ? `kanji_recently_viewed_${userId}` : 'kanji_recently_viewed';
                const updated = JSON.parse(localStorage.getItem(recentsKey)) || [];
                setRecentlyViewed(updated);
            } catch (e) {}
        };
        const handleHistoryChange = () => {
            try {
                const historyKey = userId ? `kanji_study_history_${userId}` : 'kanji_study_history';
                const updated = JSON.parse(localStorage.getItem(historyKey)) || [];
                setStudyHistory(updated);
            } catch (e) {}
        };

        window.addEventListener('kanji_recently_viewed_changed', handleRecentsChange);
        window.addEventListener('kanji_history_changed', handleHistoryChange);
        return () => {
            window.removeEventListener('kanji_recently_viewed_changed', handleRecentsChange);
            window.removeEventListener('kanji_history_changed', handleHistoryChange);
        };
    }, [userId]);

    // Load data
    useEffect(() => {
        const load = async () => {
            try {
                const [kanjiData, srs] = await Promise.all([
                    getSharedKanjiList(),
                    userId ? getSharedKanjiSrs(userId) : Promise.resolve({})
                ]);
                setKanjiList(kanjiData);
                if (userId && srs) {
                    setSrsData(srs);
                }
            } catch (e) {
                console.error('Error loading data:', e);
            } finally {
                setLoading(false);
            }
        };
        load();

        // Real-time listener for cross-device sync
        let unsubSrs = () => {};
        if (userId) {
            unsubSrs = subscribeKanjiSrs(userId, (freshSrs) => {
                setSrsData(freshSrs);
            });
        }
        return () => unsubSrs();
    }, [userId]);

    // Listen to cache updates and sync state across all screens
    useEffect(() => {
        const handleCacheUpdate = (e) => {
            const { type, data } = e.detail;
            if (type === 'kanji') {
                setKanjiList(prev => {
                    const idx = prev.findIndex(k => k.id === data.id);
                    if (idx !== -1) {
                        return prev.map(k => k.id === data.id ? { ...k, ...data } : k);
                    } else {
                        return [...prev, data];
                    }
                });
            } else if (type === 'kanji-delete') {
                setKanjiList(prev => prev.filter(k => k.id !== data));
            }
        };

        window.addEventListener('kanji-cache-updated', handleCacheUpdate);
        return () => window.removeEventListener('kanji-cache-updated', handleCacheUpdate);
    }, []);

    // Reset visible limit on filter changes
    useEffect(() => {
        setVisibleLimit(50);
    }, [filterLevel, filterStatus, searchQuery, currentFolder]);

    // Save folders to localStorage
    useEffect(() => {
        if (!userId) return;
        const foldersKey = userId ? `kanji_srs_folders_${userId}` : 'kanji_srs_folders';
        localStorage.setItem(foldersKey, JSON.stringify(folders));
    }, [folders, userId]);
    useEffect(() => {
        if (!userId) return;
        const cardFoldersKey = userId ? `kanji_srs_card_folders_${userId}` : 'kanji_srs_card_folders';
        localStorage.setItem(cardFoldersKey, JSON.stringify(kanjiCardFolders));
    }, [kanjiCardFolders, userId]);

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
            const kanjiDoc = kanjiList.find(k => k.id === id || k.character === id);
            const char = kanjiDoc?.character || (id.length === 1 ? id : '?');
            const jData = char !== '?' ? getJotobaKanjiData(char) : null;
            const srs = srsData[id];
            return {
                id,
                character: char,
                sinoViet: kanjiDoc?.sinoViet || jData?.sinoViet || '',
                meaning: kanjiDoc?.meaning || jData?.meaningVi || jData?.meanings?.join(', ') || '',
                level: kanjiDoc?.level || jData?.level || 'N5',
                strokeCount: jData?.stroke_count || kanjiDoc?.strokeCount || 0,
                srs,
                srsStatus: getSrsStatus(srs, t),
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
        if (currentFolder === '__all__') return t('kanji.allKanjiTitle', 'Tất cả Kanji');
        if (currentFolder === 'unfiled') return t('kanji.unfiledFolder', 'Chưa phân loại');
        if (currentFolder.startsWith('jlpt_')) return currentFolder.replace('jlpt_', '');
        const f = folders.find(f => f.id === currentFolder);
        return f?.name || t('kanji.folderBack', 'Thư mục');
    }, [currentFolder, folders]);

    const currentFolderKanji = useMemo(() => {
        if (!currentFolder) return [];
        let list = [];
        if (currentFolder === '__all__') {
            list = [...kanjiWithSRS];
        } else if (currentFolder === 'unfiled') {
            list = kanjiWithSRS.filter(k => !kanjiCardFolders[k.id]);
        } else if (currentFolder.startsWith('jlpt_')) {
            const level = currentFolder.replace('jlpt_', '');
            list = kanjiWithSRS.filter(k => k.level === level);
        } else {
            list = kanjiWithSRS.filter(k => kanjiCardFolders[k.id] === currentFolder);
        }

        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase().trim();
            list = list.filter(k =>
                k.character.includes(query) ||
                k.sinoViet?.toLowerCase().includes(query) ||
                k.meaning?.toLowerCase().includes(query)
            );
        }
        return list;
    }, [currentFolder, kanjiWithSRS, kanjiCardFolders, searchQuery]);

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

    // Filter and search (unified multi-criteria filter)
    const filteredKanji = useMemo(() => {
        let result = [...kanjiWithSRS];

        // 1. Current Folder filter
        if (currentFolder && currentFolder !== '__all__') {
            if (currentFolder === 'unfiled') {
                result = result.filter(k => !kanjiCardFolders[k.id]);
            } else if (currentFolder.startsWith('jlpt_')) {
                const level = currentFolder.replace('jlpt_', '');
                result = result.filter(k => k.level === level);
            } else {
                result = result.filter(k => kanjiCardFolders[k.id] === currentFolder);
            }
        }

        // 2. Custom folder filter dropdown
        if (filterFolder !== 'all') {
            if (filterFolder === 'none') {
                result = result.filter(k => !kanjiCardFolders[k.id]);
            } else {
                result = result.filter(k => kanjiCardFolders[k.id] === filterFolder);
            }
        }

        // 3. Level filter
        if (filterLevel !== 'all') {
            result = result.filter(k => k.level === filterLevel);
        }

        // 4. Status filter
        if (filterStatus !== 'all') {
            const now = Date.now();
            result = result.filter(k => {
                const norm = normalizeSRSState(k.srs);
                const reps = norm.reps || 0;
                const lastReview = k.srs?.lastReview;
                const state = norm.state ? String(norm.state).toUpperCase() : 'NEW';
                const interval = norm.interval || 0;
                const reviewMs = parseNextReviewMs(k.srs?.nextReview);
                const isDue = reviewMs > 0 && reviewMs <= now;

                if (filterStatus === 'due') {
                    return isDue;
                }
                if (filterStatus === 'new') {
                    return (state === 'NEW' || state === 'LEARNING' || state === 'RELEARNING') && !(reps > 0 || lastReview);
                }
                if (filterStatus === 'learning') {
                    return (state === 'NEW' || state === 'LEARNING' || state === 'RELEARNING') && (reps > 0 || lastReview);
                }
                // REVIEW state
                if (state === 'REVIEW') {
                    const daysInterval = interval >= 1440 ? Math.round(interval / 1440) : interval;
                    if (filterStatus === 'shortTerm') {
                        return daysInterval < 7;
                    }
                    if (filterStatus === 'longTerm') {
                        return daysInterval >= 7 && daysInterval < 21;
                    }
                    if (filterStatus === 'expert') {
                        return daysInterval >= 21;
                    }
                }
                return false;
            });
        }

        // 5. Search query filter
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
    }, [kanjiWithSRS, currentFolder, kanjiCardFolders, filterLevel, filterStatus, searchQuery, filterFolder]);

    const displayedKanjiList = filteredKanji;

    const visibleKanjiList = useMemo(() => {
        return displayedKanjiList.slice(0, visibleLimit);
    }, [displayedKanjiList, visibleLimit]);

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
        const allIds = visibleKanjiList.map(k => k.id);
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
            const idsArray = Array.from(selectedIds);
            const batchSize = 500;
            for (let i = 0; i < idsArray.length; i += batchSize) {
                const batch = writeBatch(db);
                const chunk = idsArray.slice(i, i + batchSize);
                chunk.forEach(id => {
                    batch.delete(doc(db, `artifacts/${appId}/users/${userId}/kanjiSRS`, id));
                });
                await batch.commit();
            }
            setSrsData(prev => {
                const next = { ...prev };
                selectedIds.forEach(id => {
                    delete next[id];
                    updateCachedUserSrs(userId, id, null);
                });
                return next;
            });
            setSelectedIds(new Set());
            setShowConfirmDelete(false);
            showToast('Đã xóa thành công!', 'success');
        } catch (e) {
            console.error('Error deleting SRS data:', e);
            showToast(t('common.error', 'Lỗi:') + ' ' + e.message, 'error');
        } finally {
            setDeleting(false);
        }
    };

    const handleDeleteSingleKanji = async (character) => {
        if (!userId || !character) return;
        const kanjiDoc = kanjiList.find(k => k.character === character);
        const targetId = kanjiDoc?.id || character;
        const actualId = srsData[targetId] ? targetId : Object.keys(srsData).find(k => k === character || (kanjiDoc && k === kanjiDoc.id));
        if (!actualId) {
            showToast('Không tìm thấy dữ liệu SRS cho chữ này', 'error');
            return;
        }

        const confirmed = await showConfirm(t('kanji.deleteConfirmSingle', 'Remove Kanji "{char}" from SRS review? Its learning progress will be permanently lost.').replace('{char}', character), {
            type: 'danger',
            confirmText: t('kanji.deleteBtn', 'Xóa bỏ')
        });
        if (!confirmed) return;

        setDeleting(true);
        try {
            await deleteDoc(doc(db, `artifacts/${appId}/users/${userId}/kanjiSRS`, actualId));
            setSrsData(prev => {
                const next = { ...prev };
                delete next[actualId];
                updateCachedUserSrs(userId, actualId, null);
                return next;
            });
            setSelectedIds(prev => {
                const next = new Set(prev);
                next.delete(actualId);
                return next;
            });
            setShowDetailModal(false);
            setSelectedKanjiChar(null);
            showToast(t('kanji.deleteSingleSuccess', 'Removed "{char}" from review list!').replace('{char}', character), 'success');
        } catch (e) {
            console.error('Error deleting single kanji SRS:', e);
            showToast(t('common.error', 'Lỗi:') + ' ' + e.message, 'error');
        } finally {
            setDeleting(false);
        }
    };

    const openKanjiDetail = (character) => {
        setSelectedKanjiChar(character);
        setShowDetailModal(true);
    };

    // Stats
    const stats = useMemo(() => {
        const total = kanjiWithSRS.length;
        const now = Date.now();
        
        let due = 0, newCards = 0, learning = 0, shortTerm = 0, longTerm = 0, expert = 0;
        
        kanjiWithSRS.forEach(k => {
            const norm = normalizeSRSState(k.srs);
            const reps = norm.reps || 0;
            const lastReview = k.srs?.lastReview;
            const state = norm.state ? String(norm.state).toUpperCase() : 'NEW';
            const interval = norm.interval || 0;
            const reviewMs = parseNextReviewMs(k.srs?.nextReview);
            const isDue = reviewMs > 0 && reviewMs <= now;
            
            if (isDue) {
                due++;
            }
            
            if (state === 'NEW' || state === 'LEARNING' || state === 'RELEARNING') {
                if (reps > 0 || lastReview) {
                    learning++; // Sơ cấp (Mới học/Đang học)
                } else {
                    newCards++; // Thẻ mới (Chưa học)
                }
            } else {
                // REVIEW state
                const daysInterval = interval >= 1440 ? Math.round(interval / 1440) : interval;
                if (daysInterval >= 21) expert++;
                else if (daysInterval >= 7) longTerm++;
                else shortTerm++;
            }
        });

        return { total, due, newCards, learning, shortTerm, longTerm, expert };
    }, [kanjiWithSRS]);

    // Recently viewed cards resolved to full details
    const recentlyAccessed = useMemo(() => {
        return recentlyViewed.map(char => {
            const kanjiDoc = kanjiList.find(k => k.character === char);
            const jData = getJotobaKanjiData(char);
            if (!kanjiDoc && !jData) return null;
            const srs = srsData[kanjiDoc?.id || ''];
            return {
                id: kanjiDoc?.id || `temp_${char}`,
                character: char,
                sinoViet: kanjiDoc?.sinoViet || jData?.sinoViet || '',
                meaning: kanjiDoc?.meaning || jData?.meaningVi || jData?.meanings?.join(', ') || '',
                level: kanjiDoc?.level || jData?.level || 'N5',
                srs,
                isSaved: !!srs
            };
        }).filter(Boolean).slice(0, 3);
    }, [recentlyViewed, kanjiList, srsData]);

    // Dynamic study recommendation
    const recommendation = useMemo(() => {
        // 1. Check due cards
        const now = Date.now();
        const threshold = now + getLearnAheadLimitMs();
        const dueCount = kanjiWithSRS.filter(k => isSrsCardDue(k.srs, threshold)).length;
        if (dueCount > 0) {
            return {
                tag: t('kanji.dueOption', 'Cần ôn'),
                content: t('kanji.dueNotifDesc', 'You have {count} kanji characters due for review.').replace('{count}', dueCount),
                actionText: t('kanji.reviewNow', 'Bắt đầu ôn tập'),
                onClick: () => navigate(ROUTES.KANJI_REVIEW)
            };
        }

        // 2. Check lapsed cards
        const lapsedCards = kanjiWithSRS.filter(k => k.srs?.isLapsed);
        if (lapsedCards.length > 0) {
            const sampleChars = lapsedCards.slice(0, 3).map(k => k.character).join(', ');
            const targetChar = lapsedCards[0].character;
            return {
                tag: t('kanji.focusReview', 'Ôn tập trọng tâm'),
                content: t('kanji.lapsedDesc', 'You are struggling with {count} Kanji (e.g. {sampleChars}). Review their details!').replace('{count}', lapsedCards.length).replace('{sampleChars}', sampleChars),
                actionText: t('kanji.viewCharAction', 'View character {char}').replace('{char}', targetChar),
                onClick: () => navigate(`${ROUTES.KANJI_LIST}/${targetChar}`)
            };
        }

        // 3. Check new cards in SRS not yet studied
        const newCardsCount = kanjiWithSRS.filter(k => k.reps === 0).length;
        if (newCardsCount > 0) {
            return {
                tag: t('kanji.newOption', 'Thẻ mới'),
                content: t('kanji.newCardsNotifDesc', 'You have added {count} new Kanji. Start studying now!').replace('{count}', newCardsCount),
                actionText: t('kanji.learnNow', 'Bắt đầu học'),
                onClick: () => navigate(ROUTES.KANJI_REVIEW)
            };
        }

        // 4. Level progress
        const jlptStats = JLPT_LEVELS.map(level => {
            const totalInDb = kanjiList.filter(k => k.level === level).length || 1;
            const srsCount = kanjiWithSRS.filter(k => k.level === level).length;
            const percent = Math.round((srsCount / totalInDb) * 100);
            return { level, srsCount, totalInDb, percent };
        });

        const startedLevel = jlptStats.find(s => s.percent > 0 && s.percent < 100);
        if (startedLevel) {
            return {
                tag: t('kanji.conquerLevel', 'Chinh phục {level}').replace('{level}', startedLevel.level),
                content: t('kanji.levelProgressDesc', 'Saved {count}/{total} ({percent}%) of level {level} to SRS. Continue studying remaining characters!').replace('{count}', startedLevel.srsCount).replace('{total}', startedLevel.totalInDb).replace('{percent}', startedLevel.percent).replace('{level}', startedLevel.level),
                actionText: t('kanji.viewLevelKanji', 'View level {level} Kanji').replace('{level}', startedLevel.level),
                onClick: () => {
                    navigate(`${ROUTES.KANJI_LIST}?level=${startedLevel.level}`);
                }
            };
        }

        // 5. Default fallback
        return {
            tag: '80/20 Rule',
            content: t('kanji.srsRuleTip', 'Spaced Repetition (SRS) helps you remember 5x longer. Keep up your daily study habit!'),
            actionText: t('kanji.allKanjiTitle', 'Xem danh sách Kanji'),
            onClick: () => navigate(ROUTES.KANJI_LIST)
        };
    }, [kanjiWithSRS, kanjiList, navigate]);

    if (loading) {
        return (
            <div className="w-full pb-8">
                <TopTabBar tabs={KANJI_TABS} />
                <LoadingIndicator text={t('kanji.loadingLibrary', 'Đang tải thư viện Kanji...')} />
            </div>
        );
    }

    return (
        <div className="w-full pb-10 bg-slate-50/50 min-h-screen dark:bg-slate-900/10">
            <TopTabBar tabs={KANJI_TABS} />

            <div className="max-w-6xl mx-auto space-y-6 px-4 md:px-8 mt-6 animate-fade-in">

                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-extrabold text-slate-800 dark:text-white tracking-tight flex items-center gap-2">
                            {t('kanji.kanjiLibrary', 'Thư viện Kanji')}
                        </h1>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1.5">
                            {t('kanji.kanjiLibrarySub', 'Quản lý và ôn tập các Hán tự bạn đã lưu trữ theo cấp độ.')}
                        </p>
                    </div>
                </div>

                {/* Search and Filters */}
                <div className="space-y-3">
                    <div className="flex flex-col md:flex-row gap-3 items-center w-full">
                        <div className="relative flex-1 w-full">
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder={t('kanji.searchKanjiPlaceholder', 'Tìm kiếm thư mục, chữ Hán, Âm Hán Việt, ý nghĩa...')}
                                className="w-full bg-white dark:bg-slate-800 border border-slate-200/70 dark:border-slate-700 rounded-2xl px-4 py-3 pl-11 text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 shadow-sm text-sm"
                            />
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            {searchQuery && (
                                <button onClick={() => setSearchQuery('')} className="absolute right-4 top-1/2 -translate-y-1/2">
                                    <X className="w-4 h-4 text-slate-400 hover:text-slate-600" />
                                </button>
                            )}
                        </div>

                        <div className="flex gap-2.5 w-full md:w-auto shrink-0">
                            <button
                                onClick={() => setShowFolderManager(true)}
                                className="px-4 py-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border-b-4 border-slate-300 dark:border-slate-700 active:translate-y-0.5 active:border-b-2 text-slate-700 dark:text-slate-200 rounded-2xl text-xs sm:text-sm font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer select-none w-full md:w-auto"
                            >
                                <FolderPlus className="w-4 h-4 text-slate-500" /> {t('kanji.manageFolders', 'Quản lý thư mục')}
                            </button>

                            <button
                                onClick={() => navigate(ROUTES.KANJI_REVIEW)}
                                className="px-5 py-3 bg-amber-500 hover:bg-amber-400 border-b-4 border-amber-700 active:translate-y-0.5 active:border-b-0 text-white rounded-2xl text-xs sm:text-sm font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer select-none w-full md:w-auto"
                            >
                                {t('kanji.reviewNow', 'Ôn tập ngay')}
                            </button>
                        </div>
                    </div>

                    {/* Compact Dropdown Filters for Status and JLPT Level */}
                    <div className="flex flex-wrap items-center gap-3 pt-1">
                        {/* Status Dropdown */}
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-400 uppercase font-mono shrink-0">{t('kanji.statusFilterLabel', 'Trạng thái:')}</span>
                            <div className="relative">
                                <select
                                    value={filterStatus}
                                    onChange={(e) => {
                                        setFilterStatus(e.target.value);
                                        if (currentFolder === null) setCurrentFolder('__all__');
                                    }}
                                    className="appearance-none bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-slate-700 font-semibold rounded-xl text-xs pl-3 pr-8 py-2 cursor-pointer focus:outline-none focus:ring-2 focus:ring-sky-500/20 shadow-sm transition-all"
                                >
                                    <option value="all">{t('kanji.allOption', 'Tất cả ({count})').replace('{count}', stats.total)}</option>
                                    <option value="due">{t('kanji.dueOption', '🔥 Cần ôn ({count})').replace('{count}', stats.due)}</option>
                                    <option value="learning">{t('kanji.learningOption', '📖 Sơ cấp ({count})').replace('{count}', stats.learning)}</option>
                                    <option value="shortTerm">{t('kanji.shortTermOption', '⚡ Trung cấp ({count})').replace('{count}', stats.shortTerm)}</option>
                                    <option value="longTerm">{t('kanji.longTermOption', '🌟 Cao cấp ({count})').replace('{count}', stats.longTerm)}</option>
                                    <option value="expert">{t('kanji.expertOption', '🏆 Chuyên gia ({count})').replace('{count}', stats.expert)}</option>
                                    <option value="new">{t('kanji.newOption', '🆕 Thẻ mới ({count})').replace('{count}', stats.newCards)}</option>
                                </select>
                                <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                            </div>
                        </div>

                        {/* JLPT Level Dropdown */}
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-400 uppercase font-mono shrink-0">{t('kanji.levelFilterLabel', 'Trình độ:')}</span>
                            <div className="relative">
                                <select
                                    value={filterLevel}
                                    onChange={(e) => {
                                        setFilterLevel(e.target.value);
                                        if (currentFolder === null) setCurrentFolder('__all__');
                                    }}
                                    className="appearance-none bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-slate-700 font-semibold rounded-xl text-xs pl-3 pr-8 py-2 cursor-pointer focus:outline-none focus:ring-2 focus:ring-sky-500/20 shadow-sm transition-all"
                                >
                                    <option value="all">{t('common.all', 'Tất cả')}</option>
                                    {JLPT_LEVELS.map(lvl => (
                                        <option key={lvl} value={lvl}>{lvl}</option>
                                    ))}
                                </select>
                                <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Selection Controls */}
                {selectedIds.size > 0 && (
                    <div className="bg-red-50/80 dark:bg-red-950/20 border border-red-200/50 dark:border-red-800/30 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-sm">
                        <div className="flex items-center gap-3">
                            <span className="text-sm font-bold text-red-700 dark:text-red-400">
                                {t('kanji.selectedKanjiCount', 'Đã chọn {count} Kanji').replace('{count}', selectedIds.size)}
                            </span>
                            <button
                                onClick={() => setSelectedIds(new Set())}
                                className="text-xs text-red-500 hover:text-red-700 font-semibold underline"
                            >
                                {t('kanji.deselectBtn', 'Bỏ chọn')}
                            </button>
                        </div>
                        <div className="flex items-center gap-2 w-full sm:w-auto">
                            <button
                                onClick={() => folders.length > 0 ? setShowBatchMoveModal(true) : setShowFolderManager(true)}
                                className="flex-1 sm:flex-none px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                            >
                                <Folder className="w-3.5 h-3.5" /> {t('kanji.moveBtn', 'Di chuyển')}
                            </button>
                            <button
                                onClick={() => setShowConfirmDelete(true)}
                                className="flex-1 sm:flex-none px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                            >
                                <Trash2 className="w-3.5 h-3.5" /> {t('kanji.deleteBtn', 'Xóa bỏ')}
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
                                        <div className="w-12 h-12 rounded-2xl bg-pink-50 dark:bg-pink-950/40 flex items-center justify-center mb-4">
                                            <Heart className="w-6 h-6 text-pink-500 fill-pink-500" />
                                        </div>
                                        <h3 className="text-xl font-bold text-slate-800 dark:text-white">{t('kanji.allKanjiTitle', 'Tất cả Kanji')}</h3>
                                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                                            {t('kanji.charsMonitoredCount', '{count} ký tự đang được theo dõi').replace('{count}', stats.total)}
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
                                                        {t('kanji.charsUnitBadge', '{count} Hán tự').replace('{count}', count)}
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
                                        {t('kanji.newFolderBtn', 'Thư mục mới')}
                                    </span>
                                </button>
                            </div>
                        </div>

                        {/* Custom Folders Section */}
                        {rootCustomFolders.length > 0 && (
                            <div className="space-y-3">
                                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">
                                    {t('kanji.personalFoldersHeader', 'Thư mục cá nhân')}
                                </h3>
                                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                                    {rootCustomFolders.map(f => (
                                        <button
                                            key={f.id}
                                            onClick={() => openFolder(f.id)}
                                            className="text-left bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 hover:shadow-md transition-all shadow-sm flex items-center gap-3 group cursor-pointer"
                                        >
                                            <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800/40 flex items-center justify-center text-amber-500">
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
                                        {t('kanji.recentlyViewed', 'Xem gần đây')}
                                    </h3>
                                    <button 
                                        onClick={() => openFolder('__all__')}
                                        className="text-xs font-bold text-sky-600 hover:underline flex items-center gap-0.5"
                                    >
                                        {t('kanji.viewAllBtn', 'Xem tất cả')} <ChevronRight className="w-3.5 h-3.5" />
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
                                                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex items-center justify-between hover:shadow-md transition-all cursor-pointer group"
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

                                                    {kanji.isSaved ? (
                                                        <Heart className="w-5 h-5 text-pink-500 fill-pink-500 flex-shrink-0" />
                                                    ) : (
                                                        <Heart className="w-5 h-5 text-slate-300 dark:text-slate-600 flex-shrink-0 hover:text-pink-500 transition-colors" />
                                                    )}
                                                </div>
                                            );
                                        })
                                    ) : (
                                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 text-center text-slate-400 text-xs font-semibold">
                                            {t('kanji.noRecentActivity', 'Chưa có hoạt động học gần đây.')}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Right Column: Recommendations & Timeline */}
                            <div className="space-y-6">
                                {/* Recommendation Card */}
                                <div className="space-y-3">
                                    <h3 className="text-base font-bold text-slate-800 dark:text-white">
                                        {t('kanji.reviewRecommendations', 'Gợi ý ôn tập')}
                                    </h3>

                                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-3 shadow-md">
                                        <div className="flex items-center gap-2">
                                            <span className="bg-sky-100 dark:bg-sky-950 text-sky-800 dark:text-sky-300 text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider font-mono">
                                                {recommendation.tag}
                                            </span>
                                        </div>

                                        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                                            {recommendation.content}
                                        </p>

                                        <button 
                                            onClick={recommendation.onClick}
                                            className="text-xs font-bold text-[#2E5B70] dark:text-[#5aa9cc] hover:underline inline-flex items-center gap-1 cursor-pointer"
                                        >
                                            {recommendation.actionText} <ArrowRight className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </div>

                                {/* Study Timeline */}
                                <div className="space-y-3">
                                    <h3 className="text-base font-bold text-slate-800 dark:text-white">
                                        {t('kanji.studyHistoryHeader', 'Lịch sử học tập')}
                                    </h3>

                                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4 shadow-md">
                                        <div className="relative border-l border-slate-100 dark:border-slate-700 pl-4 ml-1.5 space-y-4">
                                            {studyHistory.length > 0 ? (
                                                studyHistory.slice(0, 5).map((item) => {
                                                    let dotBg = 'bg-sky-500';
                                                    let ringClass = 'ring-sky-50 dark:ring-sky-950';
                                                    if (item.type === 'lesson') {
                                                        dotBg = 'bg-emerald-500';
                                                        ringClass = 'ring-emerald-50 dark:ring-emerald-950';
                                                    } else if (item.type === 'save') {
                                                        dotBg = 'bg-emerald-500';
                                                        ringClass = 'ring-emerald-50 dark:ring-emerald-950';
                                                    } else if (item.type === 'review') {
                                                        dotBg = 'bg-sky-500';
                                                        ringClass = 'ring-sky-50 dark:ring-sky-950';
                                                    }

                                                    return (
                                                        <div key={item.id} className="relative">
                                                            <span className={`absolute -left-5.5 top-1 w-2.5 h-2.5 rounded-full ${dotBg} ring-4 ${ringClass}`}></span>
                                                            <div className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                                                {item.title}
                                                            </div>
                                                            {item.details && (
                                                                <div className="text-[10px] text-slate-400 font-semibold mt-0.5">
                                                                    {item.details}
                                                                </div>
                                                            )}
                                                            <div className="text-[9px] text-slate-350 dark:text-slate-500 mt-0.5">
                                                                {formatTimeAgo(item.timestamp)}
                                                            </div>
                                                        </div>
                                                    );
                                                })
                                            ) : (
                                                <div className="text-center text-slate-400 text-xs py-4">
                                                    {t('kanji.noStudyHistory', 'Chưa có hoạt động học tập nào.')}
                                                </div>
                                            )}
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
                                <ChevronLeft className="w-4 h-4 mr-0.5" /> {t('kanji.folderBack', 'Thư mục')}
                            </button>
                            <span className="text-slate-300">/</span>

                            {currentFolder && currentFolder.startsWith('jlpt_') ? (
                                <span className={`px-2 py-0.5 rounded-md font-bold ${LEVEL_COLORS[currentFolder.replace('jlpt_', '')]?.text || 'text-slate-700'} bg-slate-50 dark:bg-slate-700`}>
                                    {t('kanji.levelFolderTitle', 'Cấp độ {name}').replace('{name}', currentFolderName)}
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
                                <span className="text-slate-500 font-bold">{t('kanji.searchResultsTitle', 'Tìm kiếm kết quả')}</span>
                            )}
                        </div>

                        {/* Actions bar inside list view */}
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 pb-1 border-b border-slate-100 dark:border-slate-700">
                            <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">
                                {t('kanji.showingCharsCount', 'Hiển thị {visible} / {total} ký tự').replace('{visible}', visibleKanjiList.length).replace('{total}', displayedKanjiList.length)}
                            </span>

                            <button 
                                onClick={selectAllVisible}
                                className="text-xs font-bold text-sky-600 hover:underline"
                            >
                                {visibleKanjiList.every(k => selectedIds.has(k.id)) ? t('common.deselectAll', 'Bỏ chọn tất cả') : t('common.selectAll', 'Chọn tất cả')}
                            </button>
                        </div>

                        {/* Cards List Grid */}
                        {displayedKanjiList.length === 0 ? (
                            <div className="text-center py-16 space-y-4">
                                <Search className="w-12 h-12 text-slate-300 mx-auto" />
                                <h4 className="text-slate-500 font-semibold text-sm">{t('kanji.noKanjiFound', 'Không tìm thấy Kanji nào')}</h4>
                                <button 
                                    onClick={goBackToFolders} 
                                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all"
                                >
                                    {t('kanji.backToLibraryBtn', 'Quay lại thư viện')}
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                    {visibleKanjiList.map(kanji => {
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
                                                className={`absolute left-2.5 top-2.5 z-20 p-1 -m-1 cursor-pointer transition-opacity ${
                                                    isSelected || selectedIds.size > 0 
                                                        ? 'opacity-100' 
                                                        : 'opacity-100 sm:opacity-0 sm:group-hover:opacity-100'
                                                }`}
                                                title={isSelected ? t('kanji.deselectThisKanji', 'Bỏ chọn') : t('kanji.selectThisKanji', 'Chọn Kanji này')}
                                            >
                                                <div className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-all ${
                                                    isSelected 
                                                        ? 'bg-red-500 border-red-500 text-white shadow-xs scale-105' 
                                                        : 'bg-white/95 dark:bg-slate-700/95 border-slate-300 dark:border-slate-500 hover:border-slate-400'
                                                }`}>
                                                    {isSelected && <span className="text-[10px] font-bold">✓</span>}
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
                                                        <span className="text-[10px] text-slate-400 font-semibold">{t('kanji.strokesCount', '{count} nét').replace('{count}', kanji.strokeCount)}</span>
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
                                                        {(kanji.nextReview || 0) <= Date.now() ? t('kanji.due', 'Cần ôn') : formatNextReview(kanji.nextReview, t)}
                                                    </span>
                                                )}
                                            </div>

                                            {/* Menu buttons on hover */}
                                            <div className="opacity-0 group-hover:opacity-100 absolute top-2.5 right-2.5 flex gap-1 transition-all bg-white/90 dark:bg-slate-800/90 rounded-lg p-0.5 shadow-sm border border-slate-100 dark:border-slate-700">
                                                <button 
                                                    onClick={(e) => { e.stopPropagation(); setShowMoveModal(kanji.id); }}
                                                    className="p-1 text-slate-400 hover:text-emerald-600 hover:bg-slate-50 rounded"
                                                    title={t('kanji.moveFolderTooltip', 'Chuyển thư mục')}
                                                >
                                                    <Folder className="w-3.5 h-3.5" />
                                                </button>
                                                <button 
                                                    onClick={(e) => { e.stopPropagation(); openKanjiDetail(kanji.character); }}
                                                    className="p-1 text-slate-400 hover:text-sky-600 hover:bg-slate-50 rounded"
                                                    title={t('kanji.detailsTooltip', 'Chi tiết')}
                                                >
                                                    <Eye className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                                </div>

                                {displayedKanjiList.length > visibleLimit && (
                                    <div className="flex justify-center pt-2">
                                        <button 
                                            onClick={() => setVisibleLimit(prev => prev + 50)}
                                            className="px-6 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-650 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl transition-all shadow-sm flex items-center gap-2 cursor-pointer"
                                        >
                                            {t('kanji.loadMoreKanji', 'Xem thêm ({count} Kanji còn lại)').replace('{count}', displayedKanjiList.length - visibleLimit)}
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>

        {/* Confirm Delete Dialog */}
                {showConfirmDelete && createPortal(
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                        <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 w-[420px] max-w-full shadow-2xl space-y-4 border border-slate-100 dark:border-slate-700">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-950/30 flex items-center justify-center">
                                    <Trash2 className="w-5 h-5 text-red-600" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-slate-800 dark:text-white">{t('kanji.deleteModalTitle', 'Xóa khỏi ôn tập')}</h3>
                                    <p className="text-xs text-slate-400">{t('kanji.deleteModalSub', 'Không thể hoàn tác hành động này')}</p>
                                </div>
                            </div>

                            <p className="text-sm text-slate-600 dark:text-slate-300">
                                {t('kanji.deleteConfirmBody', 'Bạn có chắc chắn muốn xóa {count} Hán tự đã chọn khỏi danh sách ôn tập?').replace('{count}', selectedIds.size)}
                            </p>

                            <div className="flex gap-2.5 pt-2">
                                <button
                                    onClick={() => setShowConfirmDelete(false)}
                                    className="flex-1 py-3 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-2xl font-bold text-sm transition-all"
                                    disabled={deleting}
                                >{t('common.cancel', 'Hủy bỏ')}</button>
                                <button
                                    onClick={handleDeleteSelected}
                                    className="flex-1 py-3 bg-red-600 hover:bg-red-500 text-white rounded-2xl font-bold text-sm transition-all flex items-center justify-center gap-2"
                                    disabled={deleting}
                                >
                                    {deleting ? t('kanji.deletingBtn', 'Đang xóa...') : t('kanji.confirmDeleteBtn', 'Xóa bỏ')}
                                </button>
                            </div>
                        </div>
                    </div>,
                    document.body
                )}

                {/* Batch Move to Folder Modal */}
                {showBatchMoveModal && (() => {
                    const buildTree = (parentId = null, depth = 0) => {
                        return folders.filter(f => (f.parentId || null) === parentId)
                            .flatMap(f => [{ ...f, depth }, ...buildTree(f.id, depth + 1)]);
                    };
                    const flatTree = buildTree();
                    return createPortal(
                        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                            <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 w-[360px] max-w-full shadow-2xl space-y-4 border border-slate-100 dark:border-slate-700">
                                <h3 className="text-base font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                    <Folder className="w-5 h-5 text-emerald-500" /> {t('kanji.moveModalTitle', 'Di chuyển {count} Kanji').replace('{count}', selectedIds.size)}
                                </h3>
                                <div className="max-h-[260px] overflow-y-auto divide-y divide-slate-100 dark:divide-slate-700">
                                    <button 
                                        onClick={() => batchMoveToFolder('none')}
                                        className="w-full text-left flex items-center gap-3 py-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors px-1"
                                    >
                                        <Folder className="w-4 h-4 text-slate-400" />
                                        <span className="text-sm text-slate-500 italic">{t('kanji.unfiledFolder', 'Chưa phân loại')}</span>
                                    </button>
                                    {flatTree.map(f => (
                                        <button 
                                            key={f.id} 
                                            onClick={() => batchMoveToFolder(f.id)}
                                            className="w-full text-left flex items-center gap-2 py-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors px-1"
                                            style={{ paddingLeft: `${4 + f.depth * 16}px` }}
                                        >
                                            <Folder className={`w-4 h-4 ${f.depth > 0 ? 'text-amber-400' : 'text-emerald-400'}`} />
                                            <span className="text-sm text-slate-700 dark:text-slate-300 font-semibold">{f.name}</span>
                                        </button>
                                    ))}
                                    {folders.length === 0 && (
                                        <p className="text-center text-xs text-slate-400 py-6">{t('kanji.noCustomFolders', 'Chưa có thư mục tùy chỉnh nào.')}</p>
                                    )}
                                </div>
                                <button 
                                    onClick={() => setShowBatchMoveModal(false)} 
                                    className="w-full py-2.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-bold hover:bg-slate-200"
                                >{t('common.cancel', 'Hủy bỏ')}</button>
                            </div>
                        </div>,
                        document.body
                    );
                })()}

                {/* Move Single Folder Modal */}
                {showMoveModal && (() => {
                    const buildTree = (parentId = null, depth = 0) => {
                        return folders.filter(f => (f.parentId || null) === parentId)
                            .flatMap(f => [{ ...f, depth }, ...buildTree(f.id, depth + 1)]);
                    };
                    const flatTree = buildTree();
                    return createPortal(
                        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                            <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 w-[360px] max-w-full shadow-2xl space-y-4 border border-slate-100 dark:border-slate-700">
                                <h3 className="text-base font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                    <Folder className="w-5 h-5 text-emerald-500" /> {t('kanji.selectStorageFolder', 'Chọn thư mục lưu trữ')}
                                </h3>
                                <div className="max-h-[260px] overflow-y-auto divide-y divide-slate-100 dark:divide-slate-700">
                                    <button 
                                        onClick={() => moveKanjiToFolder(showMoveModal, 'none')}
                                        className={`w-full text-left flex items-center gap-3 py-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors px-1 ${!kanjiCardFolders[showMoveModal] ? 'bg-emerald-50/50' : ''}`}
                                    >
                                        <Folder className="w-4 h-4 text-slate-400" />
                                        <span className="text-sm text-slate-500 italic">{t('kanji.unfiledFolder', 'Chưa phân loại')}</span>
                                    </button>
                                    {flatTree.map(f => (
                                        <button 
                                            key={f.id} 
                                            onClick={() => moveKanjiToFolder(showMoveModal, f.id)}
                                            className={`w-full text-left flex items-center gap-2 py-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors px-1 ${kanjiCardFolders[showMoveModal] === f.id ? 'bg-emerald-50/50' : ''}`}
                                            style={{ paddingLeft: `${4 + f.depth * 16}px` }}
                                        >
                                            <Folder className={`w-4 h-4 ${f.depth > 0 ? 'text-amber-400' : 'text-emerald-400'}`} />
                                            <span className="text-sm text-slate-700 dark:text-slate-300 font-semibold flex-1">{f.name}</span>
                                            {kanjiCardFolders[showMoveModal] === f.id && <span className="text-[10px] text-emerald-500 font-bold">{t('kanji.savedHereBadge', 'Lưu ở đây')}</span>}
                                        </button>
                                    ))}
                                </div>
                                <button 
                                    onClick={() => setShowMoveModal(null)} 
                                    className="w-full py-2.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-bold hover:bg-slate-200"
                                >{t('common.cancel', 'Hủy bỏ')}</button>
                            </div>
                        </div>,
                        document.body
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
                    return createPortal(
                        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                            <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 w-[440px] max-w-full shadow-2xl space-y-4 border border-slate-100 dark:border-slate-700">
                                <h3 className="text-base font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                    <FolderPlus className="w-5 h-5 text-sky-500" /> {t('kanji.manageFoldersModalTitle', 'Quản lý thư mục Kanji')}
                                </h3>

                                <div className="flex gap-2">
                                    <input 
                                        type="text" 
                                        value={newFolderName}
                                        onChange={(e) => setNewFolderName(e.target.value)}
                                        onKeyDown={(e) => { if (e.key === 'Enter' && newFolderName.trim()) { createFolder(newFolderName); setNewFolderName(''); } }}
                                        placeholder={t('kanji.newFolderNameInput', 'Tên thư mục mới...')}
                                        className="flex-1 bg-slate-50 dark:bg-slate-700 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-sky-500"
                                    />
                                    <button 
                                        onClick={() => { if (newFolderName.trim()) { createFolder(newFolderName); setNewFolderName(''); } }}
                                        className="px-4 py-2 bg-[#2E5B70] text-white rounded-xl text-xs font-bold hover:bg-[#20404f]"
                                    >{t('kanji.addFolderBtn', 'Thêm')}</button>
                                </div>

                                <div className="max-h-[260px] overflow-y-auto space-y-1 divide-y divide-slate-50 dark:divide-slate-700/50">
                                    {flatTree.length === 0 ? (
                                        <p className="text-center text-xs text-slate-400 py-6">{t('kanji.noCustomFolders', 'Chưa có thư mục nào.')}</p>
                                    ) : flatTree.map(f => {
                                        const count = getRecursiveCardCount(f.id);
                                        return (
                                            <div 
                                                key={f.id} 
                                                className="flex items-center gap-2 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-700/30 group px-1 rounded-lg"
                                                style={{ paddingLeft: `${4 + f.depth * 16}px` }}
                                            >
                                                {f.depth > 0 && <span className="text-slate-300">└</span>}
                                                <Folder className={`w-4 h-4 flex-shrink-0 ${f.depth > 0 ? 'text-amber-400' : 'text-emerald-500'}`} />

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

                                                <span className="text-[10px] text-slate-400 font-bold mr-1">{t('common.wordsUnit', 'từ').replace('{count}', count)}</span>

                                                <button 
                                                    onClick={() => { setEditingFolderId(f.id); setEditingFolderName(f.name); }}
                                                    className="p-1 text-slate-400 hover:text-sky-600 transition-colors"
                                                    title={t('kanji.renameFolderTooltip', 'Đổi tên')}
                                                >
                                                    <Edit className="w-3.5 h-3.5" />
                                                </button>
                                                <button 
                                                    onClick={() => createFolder(t('kanji.subfolderDefaultName', 'Thư mục con'), f.id)}
                                                    className="p-1 text-slate-400 hover:text-emerald-600 transition-colors"
                                                    title={t('kanji.subfolderTooltip', 'Thư mục con')}
                                                >
                                                    <FolderPlus className="w-3.5 h-3.5" />
                                                </button>
                                                <button 
                                                    onClick={async () => { if (await showConfirm(t('kanji.deleteFolderConfirmMsg', 'Xóa thư mục "{name}"?').replace('{name}', f.name), { type: 'danger', confirmText: t('common.delete', 'Xóa') })) deleteFolder(f.id); }}
                                                    className="p-1 text-slate-400 hover:text-red-600 transition-colors"
                                                    title={t('kanji.deleteFolderTooltip', 'Xóa')}
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
                                >{t('common.close', 'Đóng')}</button>
                            </div>
                        </div>,
                        document.body
                    );
                })()}

                {/* Local Kanji Detail Modal */}
                {showDetailModal && selectedKanjiChar && createPortal(
                    (() => {
                        const kanjiDoc = kanjiList.find(k => k.character === selectedKanjiChar);
                        const jData = getJotobaKanjiData(selectedKanjiChar);
                        const srs = kanjiDoc ? srsData[kanjiDoc.id] : null;
                        const status = getSrsStatus(srs, t);
                        const StatusIcon = status.icon;
                        const sinoViet = kanjiDoc?.sinoViet || jData?.sinoViet || '---';
                        const meaning = kanjiDoc?.meaning || jData?.meaningVi || jData?.meanings?.join(', ') || '---';
                        const onyomi = kanjiDoc?.onyomi || jData?.onyomi?.join(', ') || '---';
                        const kunyomi = kanjiDoc?.kunyomi || jData?.kunyomi?.join(', ') || '---';
                        const strokeCount = kanjiDoc?.strokeCount || jData?.stroke_count || '?';
                        const level = kanjiDoc?.level || jData?.level || 'N5';
                        const levelColor = LEVEL_COLORS[level] || { bg: 'bg-gray-500', text: 'text-gray-500', light: 'bg-gray-50' };

                        return (
                            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                                <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-7 w-[520px] max-w-full max-h-[90vh] overflow-y-auto shadow-2xl space-y-5 border-2 border-b-4 border-slate-200 dark:border-slate-800 animate-scale-in">
                                    {/* Top Bar */}
                                    <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                                        <div className="flex items-center gap-2">
                                            <span className="px-3 py-1 rounded-xl text-xs font-black uppercase tracking-wider bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                                                {t('kanji.levelBadge', 'Cấp độ {level}').replace('{level}', level)}
                                            </span>
                                            <span className="text-xs text-slate-400 font-bold">{t('kanji.strokesCount', '{count} nét').replace('{count}', strokeCount)}</span>
                                        </div>
                                        <button
                                            onClick={() => { setShowDetailModal(false); setSelectedKanjiChar(null); }}
                                            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-2xl border border-slate-200 dark:border-slate-700 transition-all cursor-pointer"
                                        >
                                            <X className="w-5 h-5 stroke-[2.5]" />
                                        </button>
                                    </div>

                                    {/* Main Character Header */}
                                    <div className="flex items-center gap-5">
                                        <div className="w-24 h-24 rounded-3xl border-2 border-b-4 border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-5xl font-black font-japanese shadow-xs">
                                            {selectedKanjiChar}
                                        </div>
                                        <div className="space-y-1">
                                            <h2 className="text-2xl font-black text-slate-800 dark:text-white uppercase tracking-wider">{sinoViet}</h2>
                                            <p className="text-sm font-bold text-slate-500 dark:text-slate-400">{meaning}</p>
                                            <div className="pt-1 flex items-center gap-2">
                                                <span className={`inline-flex items-center gap-1.5 text-xs font-black px-3 py-1 rounded-full border ${status.bg} ${status.color}`}>
                                                    <StatusIcon className="w-3.5 h-3.5 stroke-[2.5]" />
                                                    {status.label}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Readings Details */}
                                    <div className="grid grid-cols-2 gap-3 bg-slate-50 dark:bg-slate-800/60 p-4.5 rounded-2xl border-2 border-slate-200 dark:border-slate-700 shadow-xs">
                                        <div>
                                            <span className="text-[10px] uppercase font-mono font-black text-slate-400">{t('kanji.onyomiLabel', 'Âm Ôn')} (Onyomi)</span>
                                            <p className="text-sm font-black text-slate-800 dark:text-slate-100 mt-0.5">{onyomi}</p>
                                        </div>
                                        <div>
                                            <span className="text-[10px] uppercase font-mono font-black text-slate-400">{t('kanji.kunyomiLabel', 'Âm Kun')} (Kunyomi)</span>
                                            <p className="text-sm font-black text-slate-800 dark:text-slate-100 mt-0.5">{kunyomi}</p>
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex flex-col gap-2.5 pt-2">
                                        <button
                                            type="button"
                                            disabled={deleting}
                                            onClick={() => handleDeleteSingleKanji(selectedKanjiChar)}
                                            className="w-full py-3.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/30 dark:hover:bg-rose-950/50 text-rose-600 dark:text-rose-400 border-2 border-b-4 border-rose-300 dark:border-rose-800 rounded-2xl font-black text-xs tracking-wider uppercase transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs active:translate-y-0.5 active:border-b-2 disabled:opacity-50 select-none"
                                        >
                                            <Trash2 className="w-4 h-4 stroke-[2.5]" />
                                            <span>{deleting ? t('kanji.deletingBtn', 'Đang xóa...') : t('kanji.removeFromSrsAction', 'Xóa khỏi danh sách ôn tập')}</span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => { setShowDetailModal(false); setSelectedKanjiChar(null); }}
                                            className="w-full py-3.5 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border-2 border-b-4 border-slate-200 dark:border-slate-700 rounded-2xl font-black text-xs tracking-wider uppercase transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs active:translate-y-0.5 active:border-b-2 select-none"
                                        >
                                            {t('common.back', 'Quay lại')}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })(),
                    document.body
                )}

        </div>
    );
};

export default KanjiSRSListScreen;
