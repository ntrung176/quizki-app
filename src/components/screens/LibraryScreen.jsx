import React, { useMemo, useState } from 'react';
import { BookOpen, Folder, Plus, Library, Trash2, X, Search, ChevronRight, Layers, GraduationCap, Play } from 'lucide-react';
import { TopTabBar } from '../ui';
import { VOCAB_TABS } from '../../config/tabs';

const LibraryScreen = ({ allCards = [], folders = [], cardFolders = {}, onOpenStudySet, onNavigateToAdd, onDeleteFolder }) => {
    const [deletingFolder, setDeletingFolder] = useState(null); // folder object being confirmed for delete
    const [searchQuery, setSearchQuery] = useState('');
    
    // Calculate counts and mastery statistics
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

    const filteredFolders = useMemo(() => {
        return foldersWithCounts.filter(f => 
            (f.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
            (f.description || '').toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [foldersWithCounts, searchQuery]);

    // Choose the first folder as the featured folder to study
    const featuredFolder = useMemo(() => {
        if (foldersWithCounts.length === 0) return null;
        // Find the one with most cards or first one
        return foldersWithCounts[0];
    }, [foldersWithCounts]);

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

    return (
        <div className="w-full pb-8 min-h-screen bg-gray-50 dark:bg-gray-900 animate-fade-in">
            <TopTabBar tabs={VOCAB_TABS} />
            
            <div className="max-w-6xl mx-auto px-4 md:px-8 mt-6 space-y-8">
                {/* Modern Premium Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1">
                        <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">Thư viện Từ vựng</h1>
                        <p className="text-gray-500 dark:text-gray-400 text-sm max-w-xl">
                            Quản lý các học phần học tập cá nhân và theo dõi mức độ ghi nhớ của bạn.
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        {/* Search Bar */}
                        <div className="relative w-full sm:w-60">
                            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                            <input
                                type="text"
                                placeholder="Tìm kiếm học phần..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-9 pr-4 py-2 text-xs rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                            />
                        </div>
                        <button 
                            onClick={onNavigateToAdd}
                            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black shadow-md shadow-indigo-100 dark:shadow-none transition-all flex items-center gap-1.5 shrink-0"
                        >
                            <Plus className="w-4 h-4" />
                            Tạo học phần mới
                        </button>
                    </div>
                </div>

                {/* Top Featured Banner (Matches Screenshot 3) */}
                {featuredFolder && (
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
                                className="px-6 py-2.5 bg-white hover:bg-slate-100 text-slate-900 rounded-xl text-xs font-black shadow-md hover:shadow-lg transition-all flex items-center gap-1.5"
                            >
                                <Play className="w-3.5 h-3.5 fill-current" />
                                Tiếp tục ôn tập
                            </button>
                        </div>

                        {/* Visual Right graphic */}
                        <div className="shrink-0 w-28 h-28 rounded-2xl bg-slate-800/40 border border-slate-700/60 flex flex-col items-center justify-center shadow-[0_0_40px_rgba(99,102,241,0.1)] z-10">
                            <GraduationCap className="w-12 h-12 text-indigo-400 animate-pulse" />
                            <span className="text-[9px] tracking-[0.2em] text-slate-500 font-bold mt-2">ĐANG HỌC</span>
                        </div>
                    </div>
                )}

                {/* Library Sets Grid */}
                <div className="space-y-4">
                    <h2 className="text-lg font-bold text-gray-800 dark:text-gray-200">Danh sách Học phần</h2>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {/* Unfiled cards set */}
                        {unfiledCount > 0 && (
                            <div 
                                onClick={() => onOpenStudySet('unfiled')}
                                className="bg-white dark:bg-gray-800 rounded-3xl p-6 border border-gray-200 dark:border-gray-700/60 cursor-pointer hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between group"
                            >
                                <div className="space-y-3">
                                    <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/40 flex items-center justify-center">
                                        <Layers className="w-5 h-5 text-amber-500" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold text-gray-800 dark:text-white leading-tight group-hover:text-indigo-500 transition-colors">
                                            Từ vựng lẻ
                                        </h3>
                                        <p className="text-xs text-gray-400 mt-1">Các từ vựng chưa phân loại</p>
                                    </div>
                                </div>
                                <div className="mt-6 pt-4 border-t border-gray-100 dark:border-gray-700/60 flex items-center justify-between text-xs font-bold text-gray-500">
                                    <span>{unfiledCount} Từ</span>
                                    <ChevronRight className="w-4 h-4 text-gray-300 group-hover:translate-x-0.5 transition-transform" />
                                </div>
                            </div>
                        )}

                        {/* Folders */}
                        {filteredFolders.map(folder => (
                            <div 
                                key={folder.id}
                                onClick={() => onOpenStudySet(folder.id)}
                                className="bg-white dark:bg-gray-800 rounded-3xl p-6 border border-gray-200 dark:border-gray-750 cursor-pointer hover:shadow-xl hover:-translate-y-1 transition-all duration-350 flex flex-col justify-between group relative overflow-hidden"
                            >
                                <div className="space-y-3">
                                    <div className="flex items-start justify-between">
                                        {folder.coverImage ? (
                                            <div className="w-full h-24 rounded-2xl overflow-hidden mb-2 relative">
                                                <img src={folder.coverImage} alt={folder.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                                            </div>
                                        ) : (
                                            <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 flex items-center justify-center">
                                                <Folder className="w-5 h-5 text-indigo-500" />
                                            </div>
                                        )}
                                        {onDeleteFolder && (
                                            <button
                                                onClick={(e) => handleDeleteFolder(e, folder)}
                                                className={`p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-50 dark:hover:bg-red-950/30 text-gray-400 hover:text-red-500 z-10 ${folder.coverImage ? 'absolute top-8 right-8 bg-white/80 dark:bg-slate-800/80 backdrop-blur shadow-sm p-2 rounded-xl' : ''}`}
                                                title="Xoá học phần"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold text-gray-800 dark:text-white leading-tight group-hover:text-indigo-500 transition-colors pr-6">
                                            {folder.name}
                                        </h3>
                                        {folder.description && (
                                            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 line-clamp-2 leading-relaxed">
                                                {folder.description}
                                            </p>
                                        )}
                                    </div>
                                </div>

                                <div className="mt-6 space-y-3">
                                    {/* Progress */}
                                    <div className="flex items-center justify-between text-[11px] font-bold text-gray-500">
                                        <span>{folder.count} Từ</span>
                                        <span className="text-indigo-500">{folder.masteredPct}%</span>
                                    </div>
                                    <div className="w-full h-1 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                                        <div 
                                            className="h-full bg-gradient-to-r from-indigo-500 to-sky-400 rounded-full"
                                            style={{ width: `${folder.masteredPct}%` }}
                                        />
                                    </div>
                                </div>
                            </div>
                        ))}

                        {/* Add Collection dashed card */}
                        <div
                            onClick={onNavigateToAdd}
                            className="bg-transparent dark:bg-transparent rounded-3xl border-2 border-dashed border-gray-300 dark:border-gray-700 p-6 flex flex-col items-center justify-center text-center cursor-pointer hover:border-gray-400 dark:hover:border-gray-600 transition-all min-h-[190px] group"
                        >
                            <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-850 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                                <Plus className="w-5 h-5 text-gray-500" />
                            </div>
                            <h3 className="font-bold text-gray-700 dark:text-gray-300 text-sm mb-0.5">Tạo học phần</h3>
                            <p className="text-[11px] text-gray-400 dark:text-gray-500 max-w-[150px] leading-relaxed">
                                Xây dựng một bộ từ vựng tùy chỉnh mới.
                            </p>
                        </div>
                    </div>

                    {/* Empty State */}
                    {folders.length === 0 && unfiledCount === 0 && (
                        <div className="py-20 flex flex-col items-center justify-center text-center bg-white dark:bg-gray-800 rounded-3xl border border-gray-200 dark:border-gray-750">
                            <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4">
                                <Library className="w-8 h-8 text-gray-400" />
                            </div>
                            <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-2">Thư viện trống</h2>
                            <p className="text-gray-500 dark:text-gray-400 max-w-sm text-sm">
                                Bạn chưa có học phần nào. Bấm nút "Tạo học phần mới" để bắt đầu thiết kế bộ từ vựng nhé!
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* Delete Confirmation Modal */}
            {deletingFolder && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setDeletingFolder(null)}>
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm"></div>
                    <div className="relative bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4 border border-gray-200 dark:border-slate-700"
                        onClick={e => e.stopPropagation()}>
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center flex-shrink-0">
                                <Trash2 className="w-5 h-5 text-red-500" />
                            </div>
                            <div>
                                <h3 className="font-bold text-lg text-gray-800 dark:text-white">Xoá học phần</h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Thao tác này không thể hoàn tác.</p>
                            </div>
                        </div>
                        <p className="text-gray-600 dark:text-gray-300">
                            Bạn có chắc muốn xoá học phần <strong>"{deletingFolder.name}"</strong>? Các từ vựng trong học phần sẽ trở thành từ vựng lẻ.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setDeletingFolder(null)}
                                className="flex-1 py-2.5 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 font-bold rounded-xl hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors"
                            >
                                Huỷ
                            </button>
                            <button
                                onClick={confirmDelete}
                                className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl transition-colors"
                            >
                                Xoá
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default LibraryScreen;
