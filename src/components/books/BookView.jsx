import React, { useState } from 'react';
import { Plus, Edit, Trash2, FolderPlus, ChevronUp, ChevronDown, ChevronRight, Lock, Unlock, Layers, CloudUpload, Loader2, Search } from 'lucide-react';
import { showToast, showConfirm } from '../../utils/toast';
import { syncBooksToCDN } from '../../utils/bookService';
import BookThumbnail from './BookThumbnail';
import BookVocabSearchModal from './BookVocabSearchModal';

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
    InlineEditName,
    onGeminiAssist,
    handleSaveDirectVocabEdit
}) => {
    const [isSyncingCDN, setIsSyncingCDN] = useState(false);
    const [showVocabSearchModal, setShowVocabSearchModal] = useState(false);

    const handleSyncCDN = async () => {
        if (!isAdmin || isSyncingCDN) return;
        const confirm = await showConfirm(
            'Bạn có muốn xuất toàn bộ dữ liệu Kho sách mới nhất từ Firestore lên Cloud Storage CDN cho học viên không?',
            { type: 'info', confirmText: 'Bắt đầu đồng bộ CDN' }
        );
        if (!confirm) return;

        setIsSyncingCDN(true);
        showToast('Đang tải dữ liệu Kho sách và đẩy lên CDN Cloud Storage...', 'info', 5000);
        try {
            await syncBooksToCDN();
            showToast('Đã đồng bộ Kho sách lên Cloud Storage CDN thành công! 🎉', 'success');
        } catch (e) {
            console.error('Error syncing books to CDN:', e);
            showToast('Lỗi khi đồng bộ CDN: ' + (e?.message || e), 'error');
        } finally {
            setIsSyncingCDN(false);
        }
    };

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
                        <div className="flex items-center gap-2">
                            <button
                                onClick={handleSyncCDN}
                                disabled={isSyncingCDN}
                                className="flex items-center gap-2 px-3.5 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold text-xs transition-all shadow-sm disabled:opacity-50 cursor-pointer"
                                title="Đẩy toàn bộ dữ liệu Kho sách mới nhất từ Firestore lên Cloud Storage CDN"
                            >
                                {isSyncingCDN ? <Loader2 className="w-4 h-4 animate-spin" /> : <CloudUpload className="w-4 h-4" />}
                                Đồng bộ CDN
                            </button>
                            <button onClick={() => { resetForm(); setShowAddBook(true); }}
                                className="flex items-center gap-2 px-4 py-2 bg-sky-500 hover:bg-sky-600 text-white rounded-xl font-bold text-xs transition-all shadow-sm cursor-pointer">
                                <Plus className="w-4 h-4" /> Thêm sách
                            </button>
                        </div>
                    )}
                </div>

                {/* Books Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredBooks.map(book => {
                        const progress = getBookProgress(groupId, book);

                        return (
                            <div key={book.id}
                                onClick={() => navigateTo({ group: groupId, book: book.id })}
                                className="rounded-2xl border border-slate-700/20 dark:border-slate-700/60 shadow-sm overflow-hidden hover:shadow-xl hover:-translate-y-1 hover:border-slate-400 dark:hover:border-slate-400 transition-all duration-300 cursor-pointer flex flex-col justify-between group relative"
                            >
                                <BookThumbnail
                                    item={book}
                                    name={book.name}
                                    subtitle={book.description}
                                    groupName={currentGroup?.name}
                                    progress={progress}
                                    className="h-44 sm:h-48"
                                />

                                {isAdmin && (
                                    <div className="absolute top-2.5 right-2.5 flex items-center gap-1 z-20 opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 backdrop-blur-xs p-1 rounded-xl">
                                        <button onClick={(e) => { e.stopPropagation(); handleStartEditBook(book); }}
                                            className="p-1.5 text-white/90 hover:text-white hover:bg-white/20 rounded-lg cursor-pointer"
                                            title="Chỉnh sửa sách">
                                            <Edit className="w-3.5 h-3.5" />
                                        </button>
                                        <button onClick={(e) => { e.stopPropagation(); handleDeleteBook(book.id); }}
                                            className="p-1.5 text-red-300 hover:text-red-200 hover:bg-white/20 rounded-lg cursor-pointer"
                                            title="Xoá sách">
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                )}
                            </div>
                        );
                    })}

                    {/* Admin Add Book */}
                    {isAdmin && (
                        <div
                            onClick={() => { resetForm(); setShowAddBook(true); }}
                            className="bg-transparent dark:bg-transparent rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 p-6 flex flex-col items-center justify-center text-center cursor-pointer hover:border-slate-400 dark:hover:border-slate-500 transition-all h-44 sm:h-48 group"
                        >
                            <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                                <Plus className="w-5 h-5 text-slate-500 dark:text-slate-400" />
                            </div>
                            <h3 className="font-bold text-slate-700 dark:text-slate-300 text-sm mb-0.5">Thêm sách mới</h3>
                            <p className="text-[11px] text-slate-400 dark:text-slate-500 max-w-[200px] leading-relaxed">
                                Tạo một cuốn sách thuộc nhóm này
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
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                        <h1 className="text-xl font-bold text-gray-900 dark:text-white">{currentBook?.name}</h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{chapters.length} chương</p>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                        {/* Nút tìm kiếm từ vựng trong cuốn sách này */}
                        <button
                            onClick={() => setShowVocabSearchModal(true)}
                            className="flex items-center gap-2 px-3.5 py-2 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/40 dark:hover:bg-blue-900/50 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800/60 rounded-xl text-xs sm:text-sm font-bold shadow-xs transition-all active:scale-95 cursor-pointer"
                            title="Tìm kiếm và chỉnh sửa nhanh từ vựng trong cuốn sách này"
                        >
                            <Search className="w-4 h-4" />
                            <span>Tìm từ vựng</span>
                        </button>
                        {isAdmin && (
                            <button onClick={() => { resetForm(); setShowAddChapter(true); }}
                                className="flex items-center gap-2 px-3 py-2 bg-sky-500 hover:bg-sky-600 text-white rounded-xl text-sm font-medium cursor-pointer">
                                <FolderPlus className="w-4 h-4" /> Thêm chương
                            </button>
                        )}
                    </div>
                </div>

                {/* Thanh tìm kiếm nhanh từ vựng trong sách */}
                <div
                    onClick={() => setShowVocabSearchModal(true)}
                    className="relative flex items-center bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 rounded-xl px-4 py-2.5 text-slate-400 dark:text-slate-500 hover:border-blue-400 dark:hover:border-blue-500 cursor-pointer shadow-xs transition-colors group"
                >
                    <Search className="w-4 h-4 text-slate-400 group-hover:text-blue-500 transition-colors mr-2.5 shrink-0" />
                    <span className="text-xs sm:text-sm select-none">
                        Nhập từ vựng trong sách để tìm kiếm và sửa nhanh...
                    </span>
                    <kbd className="ml-auto hidden sm:inline-block px-2 py-0.5 text-[10px] bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300 rounded border border-slate-200 dark:border-slate-600 font-mono">
                        Tìm kiếm
                    </kbd>
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
                                        <div className="flex items-center gap-3 min-w-0">
                                            <span className="w-6 h-6 shrink-0 flex items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-xs font-bold font-mono">
                                                {li + 1}
                                            </span>
                                            <span className="text-sm text-gray-800 dark:text-gray-200 flex items-center gap-2 font-medium truncate">
                                                {lesson.name}
                                                {lesson.isPremium && (
                                                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[9px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded shrink-0">
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

            {/* Modal Tìm kiếm từ vựng trong sách */}
            <BookVocabSearchModal
                isOpen={showVocabSearchModal}
                onClose={() => setShowVocabSearchModal(false)}
                currentBook={currentBook}
                groupId={groupId}
                bookId={bookId}
                isAdmin={isAdmin}
                navigateTo={navigateTo}
                onGeminiAssist={onGeminiAssist}
                onSaveVocabEdit={handleSaveDirectVocabEdit}
            />
        </div>
    );
};

export default BookView;
