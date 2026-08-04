import React from 'react';
import { Plus, Edit, Trash2, FolderPlus, ChevronUp, ChevronDown, ChevronRight, Lock, Unlock, Layers } from 'lucide-react';

const BookView = ({
    currentGroup,
    currentBook,
    groupId,
    bookId,
    searchQuery,
    getBookProgress,
    navigateTo,
    isAdmin,
    resetForm,
    setShowAddBook,
    handleStartEditBook,
    handleDeleteBook,
    setShowAddChapter,
    setShowAddLesson,
    handleDeleteChapter,
    handleDeleteLesson,
    handleToggleLessonPremium,
    handleReorderChapter,
    handleReorderLesson,
    getLessonProgressInfo,
    showTOC,
    profile,
    setLockedPkgName,
    setShowPremiumModal,
    InlineEditName
}) => {
    // Level 2: Books list in group
    if (groupId && !bookId) {
        const filteredBooks = (currentGroup?.books || []).filter(book => 
            (book.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
            (book.subtitle || '').toLowerCase().includes(searchQuery.toLowerCase())
        );

        return (
            <div className="space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-extrabold text-slate-800 dark:text-white tracking-tight">{currentGroup?.name}</h1>
                        {currentGroup?.subtitle && <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">{currentGroup.subtitle}</p>}
                    </div>
                    {isAdmin && (
                        <button onClick={() => { resetForm(); setShowAddBook(true); }}
                            className="flex items-center gap-2 px-4 py-2 bg-sky-500 hover:bg-sky-600 text-white rounded-xl font-bold transition-all shadow-sm cursor-pointer">
                            <Plus className="w-4 h-4" /> Thêm sách
                        </button>
                    )}
                </div>

                {/* Books Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredBooks.map(book => {
                        const progress = getBookProgress(groupId, book);
                        let bookLevel = book.subtitle || '';
                        if (book.name.includes('N5')) bookLevel = 'TRÌNH ĐỘ N5';
                        else if (book.name.includes('N4')) bookLevel = 'TRÌNH ĐỘ N4';
                        else if (book.name.includes('N3')) bookLevel = 'TRÌNH ĐỘ N3';
                        else if (book.name.includes('N2')) bookLevel = 'TRÌNH ĐỘ N2';
                        else if (book.name.includes('N1')) bookLevel = 'TRÌNH ĐỘ N1';

                        return (
                            <div key={book.id}
                                onClick={() => navigateTo({ group: groupId, book: book.id })}
                                className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200/60 dark:border-slate-700/60 p-6 cursor-pointer hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between min-h-[220px] group relative overflow-hidden"
                            >
                                <div className="absolute inset-x-0 top-0 h-1.5" style={{ backgroundColor: book.color || '#4F87FF' }} />
                                <div className="space-y-4">
                                    <div className="flex items-start justify-between gap-4">
                                        <div>
                                            {bookLevel && (
                                                <span className="inline-block px-2.5 py-0.5 text-[9px] font-black bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300 rounded mb-2">
                                                    {bookLevel}
                                                </span>
                                            )}
                                            <h3 className="text-xl font-extrabold text-slate-800 dark:text-white leading-snug group-hover:text-sky-500 transition-colors">
                                                {book.name}
                                            </h3>
                                        </div>
                                        {isAdmin && (
                                            <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={(e) => { e.stopPropagation(); handleStartEditBook(book); }}
                                                    className="p-1.5 text-slate-400 hover:text-sky-500 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer">
                                                    <Edit className="w-3.5 h-3.5" />
                                                </button>
                                                <button onClick={(e) => { e.stopPropagation(); handleDeleteBook(book.id); }}
                                                    className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer">
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                    {book.description && (
                                        <p className="text-xs text-slate-400 dark:text-slate-500 line-clamp-2">
                                            {book.description}
                                        </p>
                                    )}
                                </div>
                                <div className="space-y-3 mt-4">
                                    <div className="flex items-center justify-between text-xs">
                                        <span className="text-slate-400 font-medium">
                                            {book.wordCount || 0} từ vựng
                                        </span>
                                        <span className="text-sky-500 font-black">{progress}%</span>
                                    </div>
                                    <div className="w-full h-1 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-gradient-to-r from-sky-400 to-indigo-500 rounded-full transition-all duration-500"
                                            style={{ width: `${progress}%` }}
                                        />
                                    </div>
                                </div>
                            </div>
                        );
                    })}

                    {/* Admin Add Book */}
                    {isAdmin && (
                        <div
                            onClick={() => { resetForm(); setShowAddBook(true); }}
                            className="bg-transparent dark:bg-transparent rounded-3xl border-2 border-dashed border-slate-300 dark:border-slate-700 p-6 flex flex-col items-center justify-center text-center cursor-pointer hover:border-slate-400 dark:hover:border-slate-500 transition-all min-h-[220px] group"
                        >
                            <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                                <Plus className="w-5 h-5 text-slate-500 dark:text-slate-400" />
                            </div>
                            <h3 className="font-bold text-slate-700 dark:text-slate-300 mb-1">Thêm sách mới</h3>
                            <p className="text-xs text-slate-400 dark:text-slate-500 max-w-[200px] leading-relaxed">
                                Tạo một cuốn sách thuộc nhóm này.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // Level 3: Chapters & Lessons list inside a book
    const chapters = currentBook?.chapters || [];
    return (
        <div className="flex gap-6">
            <div className="flex-1 space-y-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-xl font-bold text-gray-900 dark:text-white">{currentBook?.name}</h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{chapters.length} chương</p>
                    </div>
                    {isAdmin && (
                        <button onClick={() => { resetForm(); setShowAddChapter(true); }}
                            className="flex items-center gap-2 px-3 py-2 bg-sky-500 hover:bg-sky-600 text-white rounded-xl text-sm font-medium cursor-pointer">
                            <FolderPlus className="w-4 h-4" /> Thêm chương
                        </button>
                    )}
                </div>

                {chapters.map((chapter, ci) => (
                    <div key={chapter.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
                        <div className="flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-700/50">
                            <h3 className="font-bold text-gray-900 dark:text-white text-sm flex-1">
                                📖 <InlineEditName type="chapter" id={chapter.id} currentName={chapter.name} />
                            </h3>
                            <div className="flex items-center gap-0.5">
                                {isAdmin && (
                                    <>
                                        <button onClick={() => handleReorderChapter(ci, -1)} disabled={ci === 0}
                                            className={`p-1 rounded transition-colors ${ci === 0 ? 'text-gray-200 dark:text-gray-600 cursor-not-allowed' : 'text-gray-400 hover:text-sky-500 cursor-pointer'}`}
                                            title="Di chuyển lên">
                                            <ChevronUp className="w-3.5 h-3.5" />
                                        </button>
                                        <button onClick={() => handleReorderChapter(ci, 1)} disabled={ci === chapters.length - 1}
                                            className={`p-1 rounded transition-colors ${ci === chapters.length - 1 ? 'text-gray-200 dark:text-gray-600 cursor-not-allowed' : 'text-gray-400 hover:text-sky-500 cursor-pointer'}`}
                                            title="Di chuyển xuống">
                                            <ChevronDown className="w-3.5 h-3.5" />
                                        </button>
                                        <button onClick={() => { resetForm(); navigateTo({ group: groupId, book: bookId, chapter: chapter.id }); setShowAddLesson(true); }}
                                            className="p-1.5 text-gray-400 hover:text-sky-500 transition-colors cursor-pointer" title="Thêm bài">
                                            <Plus className="w-3.5 h-3.5" />
                                        </button>
                                        <button onClick={() => handleDeleteChapter(chapter.id)}
                                            className="p-1.5 text-gray-400 hover:text-red-500 transition-colors cursor-pointer" title="Xóa chương">
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                        <div className="divide-y divide-gray-100 dark:divide-gray-700">
                            {chapter.lessons.map((lesson, li) => {
                                const isLocked = lesson.isPremium && !isAdmin && !profile?.isPremiumUnlocked && !(profile?.unlockedSpecializedPackages || []).includes('vocab_zen');
                                const progressInfo = getLessonProgressInfo(groupId, bookId, chapter.id, lesson);
                                return (
                                    <div key={lesson.id}
                                        onClick={() => {
                                            if (isLocked) {
                                                setLockedPkgName('Từ vựng chuyên sâu Zen');
                                                setShowPremiumModal(true);
                                            } else {
                                                navigateTo({ group: groupId, book: bookId, chapter: chapter.id, lesson: lesson.id });
                                            }
                                        }}
                                        className="flex items-center justify-between px-4 py-3 hover:bg-sky-50 dark:hover:bg-sky-900/10 cursor-pointer transition-colors">
                                        <div className="flex items-center gap-3">
                                            <span className="w-7 h-7 rounded-lg bg-sky-100 dark:bg-sky-900/30 flex items-center justify-center text-xs font-bold text-sky-600 dark:text-sky-400">
                                                {li + 1}
                                            </span>
                                            <span className="text-sm text-gray-800 dark:text-gray-200 flex items-center gap-2 font-medium">
                                                {lesson.name}
                                                {lesson.isPremium && (
                                                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[9px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded">
                                                        👑 Premium
                                                    </span>
                                                )}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {progressInfo.percent > 0 && (
                                                progressInfo.percent === 100 ? (
                                                    <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400 rounded-md border border-emerald-200/50 dark:border-emerald-800/30">
                                                        ✓ Hoàn thành
                                                    </span>
                                                ) : (
                                                    <span className="px-2 py-0.5 text-[10px] font-bold bg-sky-50 text-sky-600 dark:bg-sky-950/30 dark:text-sky-400 rounded-md border border-sky-200 dark:border-sky-800/30">
                                                        {progressInfo.count}/{progressInfo.total} ({progressInfo.percent}%)
                                                    </span>
                                                )
                                            )}
                                            <span className="text-xs text-gray-400">{lesson.vocab?.length || 0} từ</span>
                                            {isAdmin && (
                                                <>
                                                    <button 
                                                        onClick={(e) => handleToggleLessonPremium(e, lesson, chapter.id)}
                                                        className={`p-1 rounded transition-colors cursor-pointer ${lesson.isPremium ? 'text-amber-500 hover:text-amber-600' : 'text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300'}`}
                                                        title={lesson.isPremium ? "Đổi thành Miễn phí" : "Đổi thành Premium"}
                                                    >
                                                        {lesson.isPremium ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                                                    </button>
                                                    <button onClick={(e) => { e.stopPropagation(); handleReorderLesson(chapter.id, li, -1); }} disabled={li === 0}
                                                        className={`p-0.5 rounded cursor-pointer ${li === 0 ? 'text-gray-250 dark:text-gray-600' : 'text-gray-300 hover:text-sky-500'}`}>
                                                        <ChevronUp className="w-3 h-3" />
                                                    </button>
                                                    <button onClick={(e) => { e.stopPropagation(); handleReorderLesson(chapter.id, li, 1); }} disabled={li === chapter.lessons.length - 1}
                                                        className={`p-0.5 rounded cursor-pointer ${li === chapter.lessons.length - 1 ? 'text-gray-250 dark:text-gray-600' : 'text-gray-300 hover:text-sky-500'}`}>
                                                        <ChevronDown className="w-3 h-3" />
                                                    </button>
                                                    <button onClick={(e) => { e.stopPropagation(); handleDeleteLesson(lesson.id); }}
                                                        className="p-1 text-gray-300 hover:text-red-500 transition-colors cursor-pointer">
                                                        <Trash2 className="w-3 h-3" />
                                                    </button>
                                                </>
                                            )}
                                            <ChevronRight className="w-4 h-4 text-gray-300" />
                                        </div>
                                    </div>
                                );
                            })}
                            {chapter.lessons.length === 0 && (
                                <p className="text-center py-4 text-sm text-gray-400">Chưa có bài nào</p>
                            )}
                        </div>
                    </div>
                ))}

                {chapters.length === 0 && (
                    <div className="text-center py-12 text-gray-400">
                        <Layers className="w-12 h-12 mx-auto mb-3 opacity-30" />
                        <p>Chưa có chương nào</p>
                    </div>
                )}
            </div>

            {/* Table of Contents - right sidebar */}
            {showTOC && chapters.length > 0 && (
                <div className="hidden lg:block w-56 shrink-0">
                    <div className="sticky top-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-3 shadow-sm">
                        <h4 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Mục lục</h4>
                        <nav className="space-y-1">
                            {chapters.map((ch) => (
                                <div key={ch.id}>
                                    <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 px-2 py-1">{ch.name}</p>
                                    {ch.lessons.map((ls) => {
                                        const isLocked = ls.isPremium && !isAdmin && !profile?.isPremiumUnlocked && !(profile?.unlockedSpecializedPackages || []).includes('vocab_zen');
                                        const progressInfo = getLessonProgressInfo(groupId, bookId, ch.id, ls);
                                        return (
                                            <button key={ls.id}
                                                onClick={() => {
                                                    if (isLocked) {
                                                        setLockedPkgName('Từ vựng chuyên sâu Zen');
                                                        setShowPremiumModal(true);
                                                    } else {
                                                        navigateTo({ group: groupId, book: bookId, chapter: ch.id, lesson: ls.id });
                                                    }
                                                }}
                                                className="w-full text-left text-[11px] px-3 py-1 text-gray-500 dark:text-gray-400 hover:text-sky-600 dark:hover:text-sky-400 hover:bg-sky-50 dark:hover:bg-sky-900/10 rounded transition-colors truncate flex items-center justify-between gap-1 cursor-pointer">
                                                <span className="truncate flex items-center gap-1">
                                                    {ls.name}
                                                    {progressInfo.percent > 0 && (
                                                        progressInfo.percent === 100 ? (
                                                            <span className="text-emerald-500 font-black text-[9px] shrink-0" title="Hoàn thành">✓</span>
                                                        ) : (
                                                            <span className="text-sky-500 font-bold text-[9px] shrink-0">({progressInfo.percent}%)</span>
                                                        )
                                                    )}
                                                </span>
                                                {ls.isPremium && <span className="text-[9px] text-amber-500 shrink-0" title="Bài học Premium">👑</span>}
                                            </button>
                                        );
                                    })}
                                </div>
                            ))}
                        </nav>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BookView;
