import React from 'react';
import { BookOpen, Search, Plus, Edit, Trash2 } from 'lucide-react';
import { getGroupCategory } from './bookConstants';
import BookThumbnail from './BookThumbnail';

const BookGroupList = ({
    t,
    isEnglishMode,
    activeFilter,
    setActiveFilter,
    searchQuery,
    setSearchQuery,
    filteredGroups,
    loading,
    getGroupProgress,
    navigateTo,
    isAdmin,
    handleStartEditGroup,
    handleDeleteGroup,
    resetForm,
    setShowAddGroup
}) => {
    return (
        <div className="space-y-6">
            {/* Header with Search */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div className="flex flex-col gap-1.5">
                    <h1 className="text-3xl font-extrabold tracking-tight text-slate-800 dark:text-white">
                        {t('books.vocabBooksTitle', 'Sách từ vựng')}
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 text-sm max-w-2xl leading-relaxed">
                        {t('books.vocabBooksSub', 'Tuyển tập các bộ sách cho hành trình học tiếng Nhật. Theo dõi tiến độ qua các giáo trình nền tảng và bộ từ vựng chuyên biệt.')}
                    </p>
                </div>
                {/* Search Bar */}
                <div className="relative w-full sm:w-72 shrink-0">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                        type="text"
                        placeholder={t('books.searchBooks', 'Tìm kiếm sách...')}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20 shadow-xs"
                    />
                </div>
            </div>

            {filteredGroups.length === 0 && !loading && (
                <div className="text-center py-16 text-slate-400 dark:text-slate-500 bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 shadow-sm">
                    <BookOpen className="w-16 h-16 mx-auto mb-4 opacity-30 text-slate-400" />
                    <p className="text-lg font-semibold">Không tìm thấy sách nào</p>
                    <p className="text-sm mt-1">Thử điều chỉnh bộ lọc hoặc từ khóa tìm kiếm.</p>
                </div>
            )}

            {/* Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-6">
                {filteredGroups.map(group => {
                    const progress = getGroupProgress(group);
                    const category = getGroupCategory(group);
                    const isTextbook = category === 'TEXTBOOK';
                    const isJLPT = category === 'JLPT';
                    const badgeText = isTextbook ? t('books.curriculum', 'GIÁO TRÌNH') : isJLPT ? 'JLPT' : t('books.custom', 'TÙY CHỈNH');
                    let levelBadge = '';
                    if (group.name.includes('Daichi')) levelBadge = 'SƠ CẤP';
                    else if (group.name.includes('Irodori')) levelBadge = 'TRÌNH ĐỘ A2';
                    else if (group.name.includes('Mimikara')) levelBadge = 'TRÌNH ĐỘ N2';

                    return (
                        <div
                            key={group.id}
                            className="rounded-2xl border border-slate-700/20 dark:border-slate-700/60 shadow-sm overflow-hidden hover:shadow-xl hover:-translate-y-1 hover:border-slate-400 dark:hover:border-slate-400 transition-all duration-300 cursor-pointer flex flex-col justify-between group relative"
                            onClick={() => navigateTo({ group: group.id })}
                        >
                            <BookThumbnail 
                                item={group}
                                name={group.name} 
                                subtitle={group.subtitle} 
                                progress={progress}
                                className="h-44 sm:h-48"
                            />

                            {isAdmin && (
                                <div className="absolute top-2.5 right-2.5 flex items-center gap-1 z-20 opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 backdrop-blur-xs p-1 rounded-xl">
                                    <button onClick={(e) => { e.stopPropagation(); handleStartEditGroup(group); }}
                                        className="p-1.5 text-white/90 hover:text-white hover:bg-white/20 rounded-lg transition-colors cursor-pointer"
                                        title="Chỉnh sửa nhóm">
                                        <Edit className="w-3.5 h-3.5" />
                                    </button>
                                    <button onClick={(e) => { e.stopPropagation(); handleDeleteGroup(group.id); }}
                                        className="p-1.5 text-red-300 hover:text-red-200 hover:bg-white/20 rounded-lg transition-colors cursor-pointer"
                                        title="Xoá nhóm">
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            )}
                        </div>
                    );
                })}
                {/* Admin Add Card */}
                {isAdmin && (
                    <div
                        onClick={() => { resetForm(); setShowAddGroup(true); }}
                        className="bg-transparent dark:bg-transparent rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 p-6 flex flex-col items-center justify-center text-center cursor-pointer hover:border-slate-400 dark:hover:border-slate-500 transition-all h-44 sm:h-48 group"
                    >
                        <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                            <Plus className="w-5 h-5 text-slate-500 dark:text-slate-400" />
                        </div>
                        <h3 className="font-bold text-slate-700 dark:text-slate-300 text-sm mb-0.5">{t('books.addBookGroup', 'Thêm nhóm sách mới')}</h3>
                        <p className="text-[11px] text-slate-400 dark:text-slate-500 max-w-[200px] leading-relaxed">
                            {t('books.addBookGroupSub', 'Tạo bộ sưu tập tùy chỉnh')}
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default BookGroupList;
