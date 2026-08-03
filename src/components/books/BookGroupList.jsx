import React from 'react';
import { BookOpen, Search, Plus, Edit, Trash2 } from 'lucide-react';
import { getGroupCategory } from './bookConstants';

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
        <div className="space-y-8">
            {/* Banner Header */}
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-extrabold tracking-tight text-slate-800 dark:text-white">
                    {t('books.vocabBooksTitle', 'Sách từ vựng')}
                </h1>
                <p className="text-slate-500 dark:text-slate-400 text-sm max-w-2xl leading-relaxed">
                    {t('books.vocabBooksSub', 'Tuyển tập các bộ sách cho hành trình học tiếng Nhật. Theo dõi tiến độ qua các giáo trình nền tảng và bộ từ vựng chuyên biệt.')}
                </p>
            </div>

            {/* Filters & Search Row */}
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-md">
                {/* Tabs / Filters */}
                <div className="flex flex-wrap gap-1.5 w-full sm:w-auto">
                    {(isEnglishMode ? [
                        { id: 'ALL', label: t('common.all', 'TẤT CẢ') },
                        { id: 'OXFORD', label: 'OXFORD 3000' },
                        { id: 'IELTS', label: 'IELTS' },
                        { id: 'TOEIC', label: 'TOEIC' },
                        { id: 'CUSTOM', label: t('books.custom', 'TÙY CHỈNH') }
                    ] : [
                        { id: 'ALL', label: t('common.all', 'TẤT CẢ') },
                        { id: 'JLPT', label: 'JLPT' },
                        { id: 'TEXTBOOK', label: t('books.curriculum', 'GIÁO TRÌNH') },
                        { id: 'CUSTOM', label: t('books.custom', 'TÙY CHỈNH') }
                    ]).map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveFilter(tab.id)}
                            className={`px-4 py-2 rounded-xl text-xs font-bold tracking-wider transition-all duration-200 cursor-pointer ${
                                activeFilter === tab.id
                                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm'
                                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                            }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
                {/* Search Bar */}
                <div className="relative w-full sm:w-72">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                        type="text"
                        placeholder={t('books.searchBooks', 'Tìm kiếm sách...')}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
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
                            className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 shadow-md overflow-hidden hover:shadow-xl hover:-translate-y-1 hover:border-cyan-400 dark:hover:border-cyan-500/50 transition-all duration-300 cursor-pointer flex flex-col group"
                            onClick={() => navigateTo({ group: group.id })}
                        >
                            {group.imageUrl ? (
                                <div className="h-32 sm:h-44 overflow-hidden relative">
                                    <img
                                        src={group.imageUrl}
                                        alt={group.name}
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                    />
                                    <div className="absolute top-3 left-3 sm:top-4 sm:left-4 flex gap-1.5">
                                        <span className={`px-2 py-0.5 sm:px-2.5 sm:py-1 text-[8px] sm:text-[9px] font-black uppercase tracking-wider rounded-lg shadow-sm ${
                                            isJLPT ? 'bg-sky-500 text-white' : isTextbook ? 'bg-indigo-500 text-white' : 'bg-emerald-500 text-white'
                                        }`}>
                                            {badgeText}
                                        </span>
                                        {levelBadge && (
                                            <span className="px-2 py-0.5 sm:px-2.5 sm:py-1 text-[8px] sm:text-[9px] font-black uppercase tracking-wider rounded-lg shadow-sm bg-slate-900/80 text-white backdrop-blur-sm">
                                                {levelBadge}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <div className="h-32 sm:h-44 bg-gradient-to-br from-slate-100 to-slate-200/50 dark:from-slate-700 dark:to-slate-800 flex items-center justify-center relative">
                                    <BookOpen className="w-8 h-8 sm:w-12 sm:h-12 text-slate-400 opacity-40" />
                                    <div className="absolute top-3 left-3 sm:top-4 sm:left-4 flex gap-1.5">
                                        <span className="px-2 py-0.5 sm:px-2.5 sm:py-1 text-[8px] sm:text-[9px] font-black uppercase tracking-wider bg-slate-400 text-white rounded-lg shadow-sm">
                                            {badgeText}
                                        </span>
                                    </div>
                                </div>
                            )}
                            <div className="p-3.5 sm:p-6 flex-1 flex flex-col justify-between space-y-3 sm:space-y-4">
                                <div className="space-y-1">
                                    <div className="flex items-start justify-between gap-2">
                                        <h2 className="text-base sm:text-xl font-bold text-slate-800 dark:text-white leading-tight group-hover:text-sky-500 transition-colors">
                                            {group.name}
                                        </h2>
                                        {isAdmin && (
                                            <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={(e) => { e.stopPropagation(); handleStartEditGroup(group); }}
                                                    className="p-1.5 text-slate-400 hover:text-sky-500 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer">
                                                    <Edit className="w-3.5 h-3.5" />
                                                </button>
                                                <button onClick={(e) => { e.stopPropagation(); handleDeleteGroup(group.id); }}
                                                    className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer">
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                    {group.subtitle && (
                                        <p className="text-xs sm:text-sm text-slate-400 dark:text-slate-500 font-medium line-clamp-2">
                                            {group.subtitle}
                                        </p>
                                    )}
                                </div>
                                <div className="space-y-1.5 pt-1 sm:pt-2">
                                    <div className="flex items-center justify-between text-[11px] sm:text-xs font-bold text-slate-600 dark:text-slate-300">
                                        <span>{t('books.progress', 'Tiến độ')}</span>
                                        <span className="text-sky-500 font-extrabold">{progress}%</span>
                                    </div>
                                    <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-gradient-to-r from-sky-400 to-indigo-500 rounded-full transition-all duration-500"
                                            style={{ width: `${progress}%` }}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
                {/* Admin Add Card */}
                {isAdmin && (
                    <div
                        onClick={() => { resetForm(); setShowAddGroup(true); }}
                        className="bg-transparent dark:bg-transparent rounded-3xl border-2 border-dashed border-slate-300 dark:border-slate-700 p-6 flex flex-col items-center justify-center text-center cursor-pointer hover:border-slate-400 dark:hover:border-slate-500 transition-all min-h-[320px] group"
                    >
                        <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                            <Plus className="w-6 h-6 text-slate-500 dark:text-slate-400" />
                        </div>
                        <h3 className="font-bold text-slate-700 dark:text-slate-300 text-lg mb-1">{t('books.addBookGroup', 'Thêm nhóm sách mới')}</h3>
                        <p className="text-xs text-slate-400 dark:text-slate-500 max-w-[200px] leading-relaxed">
                            {t('books.addBookGroupSub', 'Tạo bộ sưu tập tùy chỉnh cho mục tiêu học tập của bạn.')}
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default BookGroupList;
