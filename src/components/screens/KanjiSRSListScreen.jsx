import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Trash2, ChevronLeft, BookOpen, Clock, CheckCircle, AlertCircle, Filter, X, Eye } from 'lucide-react';
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
    }, [kanjiWithSRS, filterLevel, filterStatus, searchQuery]);

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
        navigate(`${ROUTES.KANJI_LIST}?char=${encodeURIComponent(character)}`);
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
                <button
                    onClick={() => navigate(ROUTES.KANJI_REVIEW)}
                    className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-sm font-medium transition-colors"
                >
                    Ôn tập Kanji
                </button>
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
                    <button
                        onClick={() => setShowConfirmDelete(true)}
                        className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"
                    >
                        <Trash2 className="w-4 h-4" />
                        Xóa khỏi danh sách
                    </button>
                </div>
            )}

            {/* Kanji List by Level */}
            {kanjiWithSRS.length === 0 ? (
                <div className="text-center py-16 space-y-4">
                    <BookOpen className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto" />
                    <h3 className="text-lg font-medium text-gray-500 dark:text-gray-400">Chưa có Kanji nào</h3>
                    <p className="text-sm text-gray-400 dark:text-gray-500">
                        Hãy vào mục <strong>Học Kanji</strong> để thêm kanji vào danh sách ôn tập
                    </p>
                    <button
                        onClick={() => navigate(ROUTES.KANJI_STUDY)}
                        className="px-6 py-3 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl font-medium transition-colors"
                    >
                        Bắt đầu học Kanji
                    </button>
                </div>
            ) : filteredKanji.length === 0 ? (
                <div className="text-center py-12 space-y-3">
                    <Search className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto" />
                    <p className="text-gray-500 dark:text-gray-400">Không tìm thấy kanji nào phù hợp</p>
                </div>
            ) : (
                <div className="space-y-6">
                    {/* Select all button */}
                    <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                            {filteredKanji.length} kanji
                        </span>
                        <button
                            onClick={selectAllVisible}
                            className="text-xs text-cyan-600 dark:text-cyan-400 hover:underline font-medium"
                        >
                            {filteredKanji.every(k => selectedIds.has(k.id)) ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
                        </button>
                    </div>

                    {JLPT_LEVELS.map(level => {
                        const group = groupedByLevel[level];
                        if (!group || group.length === 0) return null;
                        const levelColor = LEVEL_COLORS[level];

                        return (
                            <div key={level}>
                                {/* Level header */}
                                <div className="flex items-center gap-2 mb-3">
                                    <span className={`px-3 py-1 ${levelColor.bg} text-white text-sm font-bold rounded-lg`}>
                                        {level}
                                    </span>
                                    <span className="text-sm text-gray-500 dark:text-gray-400">
                                        {group.length} kanji
                                    </span>
                                    <div className="flex-1 h-px bg-gray-200 dark:bg-slate-700"></div>
                                </div>

                                {/* Kanji grid */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                                    {group.map(kanji => {
                                        const isSelected = selectedIds.has(kanji.id);
                                        const StatusIcon = kanji.srsStatus.icon;

                                        return (
                                            <div
                                                key={kanji.id}
                                                className={`group relative flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer ${isSelected
                                                    ? 'bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-700 ring-1 ring-red-300'
                                                    : 'bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 hover:border-cyan-300 dark:hover:border-cyan-600 hover:shadow-md'
                                                    }`}
                                            >
                                                {/* Checkbox */}
                                                <div
                                                    onClick={(e) => { e.stopPropagation(); toggleSelect(kanji.id); }}
                                                    className="flex-shrink-0"
                                                >
                                                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${isSelected
                                                        ? 'bg-red-500 border-red-500 text-white'
                                                        : 'border-gray-300 dark:border-slate-600 group-hover:border-cyan-400'
                                                        }`}>
                                                        {isSelected && <span className="text-xs">✓</span>}
                                                    </div>
                                                </div>

                                                {/* Kanji character */}
                                                <div
                                                    onClick={() => openKanjiDetail(kanji.character)}
                                                    className="flex items-center gap-3 flex-1 min-w-0"
                                                >
                                                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center text-2xl font-bold font-japanese ${levelColor.light} ${levelColor.text}`}>
                                                        {kanji.character}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-bold text-cyan-600 dark:text-cyan-400 text-sm">
                                                                {kanji.sinoViet || '---'}
                                                            </span>
                                                            <span className="text-xs text-gray-400">{kanji.strokeCount} nét</span>
                                                        </div>
                                                        <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                                            {kanji.meaning}
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* SRS Status */}
                                                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                                                    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${kanji.srsStatus.bg} ${kanji.srsStatus.color}`}>
                                                        <StatusIcon className="w-3 h-3" />
                                                        {kanji.srsStatus.label}
                                                    </span>
                                                    {kanji.nextReview > 0 && kanji.reps > 0 && (
                                                        <span className="text-[10px] text-gray-400">
                                                            {(kanji.nextReview || 0) <= Date.now() ? 'Ngay bây giờ' : formatNextReview(kanji.nextReview)}
                                                        </span>
                                                    )}
                                                </div>

                                                {/* Quick view button */}
                                                <button
                                                    onClick={() => openKanjiDetail(kanji.character)}
                                                    className="opacity-0 group-hover:opacity-100 absolute top-1 right-1 p-1 text-gray-400 hover:text-cyan-500 transition-all"
                                                    title="Xem chi tiết"
                                                >
                                                    <Eye className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}

                    {/* Show ungrouped kanji (level = '?') */}
                    {groupedByLevel['?'] && groupedByLevel['?'].length > 0 && (
                        <div>
                            <div className="flex items-center gap-2 mb-3">
                                <span className="px-3 py-1 bg-gray-500 text-white text-sm font-bold rounded-lg">Khác</span>
                                <span className="text-sm text-gray-500">{groupedByLevel['?'].length} kanji</span>
                                <div className="flex-1 h-px bg-gray-200 dark:bg-slate-700"></div>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                                {groupedByLevel['?'].map(kanji => (
                                    <div
                                        key={kanji.id}
                                        onClick={() => openKanjiDetail(kanji.character)}
                                        className="flex items-center gap-3 p-3 rounded-xl bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 hover:border-cyan-300 hover:shadow-md transition-all cursor-pointer"
                                    >
                                        <div className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl font-bold font-japanese bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                                            {kanji.character}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <span className="font-bold text-cyan-600 text-sm">{kanji.sinoViet || '---'}</span>
                                            <div className="text-xs text-gray-500 truncate">{kanji.meaning}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
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
        </div>
    );
};

export default KanjiSRSListScreen;
