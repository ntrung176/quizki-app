import React from 'react';
import { BookOpen, Search, Plus, Edit, Trash2, Sparkles, FileText } from 'lucide-react';
import { getGroupCategory } from './bookConstants';
import BookThumbnail from './BookThumbnail';
import { useLanguage } from '../../context/LanguageContext';

const BookGroupList = ({
    t: propT,
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
    setShowAddGroup,
    setShowBlankFillerModal,
    setShowAiPdfModal
}) => {
    const { t: langT } = useLanguage();
    const t = propT || langT;
    return (
        <div className="space-y-6">
            {/* Admin Quick Action Toolbar */}
            {isAdmin && (
                <div className="flex items-center gap-3 flex-wrap bg-white dark:bg-slate-900 p-4 rounded-3xl border-2 border-b-4 border-slate-200 dark:border-slate-800 shadow-xs">
                    <span className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-1.5 mr-1">
                        🛠️ Quản trị Kho Sách:
                    </span>
                    {setShowBlankFillerModal && (
                        <button
                            type="button"
                            onClick={() => setShowBlankFillerModal(true)}
                            className="px-3.5 py-2 bg-teal-500 hover:bg-teal-600 text-white rounded-2xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 border-b-4 border-teal-700 active:translate-y-0.5 active:border-b-2 shadow-xs cursor-pointer"
                        >
                            <Sparkles className="w-3.5 h-3.5" /> ✨ AI Lắp từ vào ví dụ
                        </button>
                    )}
                    {setShowAiPdfModal && (
                        <button
                            type="button"
                            onClick={() => setShowAiPdfModal(true)}
                            className="px-3.5 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 border-b-4 border-emerald-700 active:translate-y-0.5 active:border-b-2 shadow-xs cursor-pointer"
                        >
                            <FileText className="w-3.5 h-3.5" /> 🚀 Soạn từ PDF (AI)
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={() => { resetForm(); setShowAddGroup(true); }}
                        className="px-4 py-2 bg-sky-500 hover:bg-sky-600 text-white rounded-2xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 border-b-4 border-sky-700 active:translate-y-0.5 active:border-b-2 shadow-xs cursor-pointer ml-auto"
                    >
                        <Plus className="w-4 h-4" /> Thêm nhóm sách
                    </button>
                </div>
            )}

            {/* Header with Search */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div className="flex flex-col gap-1.5">
                    <h1 className="text-3xl font-black tracking-tight text-slate-850 dark:text-white">
                        {t('books.vocabBooksTitle', 'Sách từ vựng')}
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 text-sm font-semibold max-w-2xl leading-relaxed">
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
                        className="w-full pl-10 pr-4 py-2.5 rounded-2xl text-xs font-bold bg-white dark:bg-slate-900 border-2 border-b-4 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:border-sky-400 shadow-xs"
                    />
                </div>
            </div>

            {filteredGroups.length === 0 && !loading && (
                <div className="text-center py-16 text-slate-400 dark:text-slate-500 bg-white dark:bg-slate-900 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800 shadow-xs">
                    <BookOpen className="w-16 h-16 mx-auto mb-4 opacity-30 text-slate-400" />
                    <p className="text-lg font-black text-slate-700 dark:text-slate-200">Không tìm thấy sách nào</p>
                    <p className="text-xs font-bold text-slate-400 mt-1">Thử điều chỉnh bộ lọc hoặc từ khóa tìm kiếm.</p>
                </div>
            )}

            {/* Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
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
                            className="bg-white dark:bg-slate-900 rounded-3xl border-2 border-b-4 border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden hover:border-sky-400 dark:hover:border-sky-500 hover:-translate-y-1 transition-all duration-300 cursor-pointer flex flex-col justify-between group relative"
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
                                <div className="absolute top-2.5 right-2.5 flex items-center gap-1 z-20 opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 backdrop-blur-xs p-1.5 rounded-2xl">
                                    <button onClick={(e) => { e.stopPropagation(); handleStartEditGroup(group); }}
                                        className="p-1.5 text-white/90 hover:text-white hover:bg-white/20 rounded-xl transition-colors cursor-pointer"
                                        title="Chỉnh sửa nhóm">
                                        <Edit className="w-3.5 h-3.5" />
                                    </button>
                                    <button onClick={(e) => { e.stopPropagation(); handleDeleteGroup(group.id); }}
                                        className="p-1.5 text-red-300 hover:text-red-200 hover:bg-white/20 rounded-xl transition-colors cursor-pointer"
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
                        className="bg-white/50 dark:bg-slate-900/50 rounded-3xl border-2 border-dashed border-slate-300 dark:border-slate-700 p-6 flex flex-col items-center justify-center text-center cursor-pointer hover:border-emerald-400 dark:hover:border-emerald-500 transition-all h-44 sm:h-48 group shadow-xs"
                    >
                        <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border-2 border-b-3 border-emerald-300 dark:border-emerald-700 flex items-center justify-center mb-2.5 group-hover:scale-105 transition-transform text-emerald-600 dark:text-emerald-400">
                            <Plus className="w-6 h-6" />
                        </div>
                        <h3 className="font-black text-slate-750 dark:text-slate-200 text-sm mb-0.5">{t('books.addBookGroup', 'Thêm nhóm sách mới')}</h3>
                        <p className="text-[11px] font-bold text-slate-400 dark:text-slate-500 max-w-[200px] leading-relaxed">
                            {t('books.addBookGroupSub', 'Tạo bộ sưu tập tùy chỉnh')}
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default BookGroupList;
