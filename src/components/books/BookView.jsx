import React, { useState } from 'react';
import { Plus, Edit, Trash2, FolderPlus, ChevronUp, ChevronDown, ChevronRight, Lock, Unlock, Layers, CloudUpload, Loader2, Search, Sparkles } from 'lucide-react';
import { showToast, showConfirm } from '../../utils/toast';
import { syncBooksToCDN } from '../../utils/bookService';
import BookThumbnail from './BookThumbnail';
import BookVocabSearchModal from './BookVocabSearchModal';
import BookTableOfContents from './BookTableOfContents';

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
    handleSaveDirectVocabEdit,
    setShowBlankFillerModal
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
                        <h1 className="text-3xl font-black text-slate-850 dark:text-white tracking-tight">{currentGroup?.name}</h1>
                        {currentGroup?.subtitle && <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 mt-1">{currentGroup.subtitle}</p>}
                    </div>
                    {isAdmin && (
                        <div className="flex items-center gap-2.5">
                            <button
                                onClick={handleSyncCDN}
                                disabled={isSyncingCDN}
                                className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl font-black text-xs uppercase tracking-wider transition-all border-b-4 border-emerald-700 active:translate-y-0.5 active:border-b-2 shadow-xs disabled:opacity-50 cursor-pointer"
                                title="Đẩy toàn bộ dữ liệu Kho sách mới nhất từ Firestore lên Cloud Storage CDN"
                            >
                                {isSyncingCDN ? <Loader2 className="w-4 h-4 animate-spin" /> : <CloudUpload className="w-4 h-4" />}
                                Đồng bộ CDN
                            </button>
                            <button
                                onClick={() => { resetForm(); setShowAddBook(true); }}
                                className="flex items-center gap-2 px-4 py-2 bg-sky-500 hover:bg-sky-600 text-white rounded-2xl font-black text-xs uppercase tracking-wider transition-all border-b-4 border-sky-700 active:translate-y-0.5 active:border-b-2 shadow-xs cursor-pointer"
                            >
                                <Plus className="w-4 h-4" /> Thêm sách
                            </button>
                        </div>
                    )}
                </div>

                {/* Books Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                    {filteredBooks.map(book => {
                        const progress = getBookProgress(groupId, book);

                        return (
                            <div key={book.id}
                                onClick={() => navigateTo({ group: groupId, book: book.id })}
                                className="bg-white dark:bg-slate-900 rounded-3xl border-2 border-b-4 border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden hover:border-sky-400 dark:hover:border-sky-500 hover:-translate-y-1 transition-all duration-300 cursor-pointer flex flex-col justify-between group relative"
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
                                    <div className="absolute top-2.5 right-2.5 flex items-center gap-1 z-20 opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 backdrop-blur-xs p-1.5 rounded-2xl">
                                        <button onClick={(e) => { e.stopPropagation(); handleStartEditBook(book); }}
                                            className="p-1.5 text-white/90 hover:text-white hover:bg-white/20 rounded-xl cursor-pointer"
                                            title="Chỉnh sửa sách">
                                            <Edit className="w-3.5 h-3.5" />
                                        </button>
                                        <button onClick={(e) => { e.stopPropagation(); handleDeleteBook(book.id, groupId); }}
                                            className="p-1.5 text-red-300 hover:text-red-200 hover:bg-white/20 rounded-xl cursor-pointer"
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
                            className="bg-white/50 dark:bg-slate-900/50 rounded-3xl border-2 border-dashed border-slate-300 dark:border-slate-700 p-6 flex flex-col items-center justify-center text-center cursor-pointer hover:border-emerald-400 dark:hover:border-emerald-500 transition-all h-44 sm:h-48 group shadow-xs"
                        >
                            <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border-2 border-b-3 border-emerald-300 dark:border-emerald-700 flex items-center justify-center mb-2.5 group-hover:scale-105 transition-transform text-emerald-600 dark:text-emerald-400">
                                <Plus className="w-6 h-6" />
                            </div>
                            <h3 className="font-black text-slate-750 dark:text-slate-200 text-sm mb-0.5">Thêm sách mới</h3>
                            <p className="text-[11px] font-bold text-slate-400 dark:text-slate-500 max-w-[200px] leading-relaxed">
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
                    <div className="flex items-center gap-3">
                        <h1 className="text-2xl sm:text-3xl font-black text-slate-850 dark:text-white tracking-tight">{currentBook?.name}</h1>
                        <span className="px-3 py-1 rounded-full bg-sky-50 dark:bg-sky-950/50 text-sky-700 dark:text-sky-300 border-2 border-sky-200 dark:border-sky-800 text-xs font-black">
                            {chapters.length} chương
                        </span>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                        {/* Nút tìm kiếm từ vựng trong cuốn sách này */}
                        <button
                            onClick={() => setShowVocabSearchModal(true)}
                            className="flex items-center gap-2 px-3.5 py-2 bg-sky-50 hover:bg-sky-100 dark:bg-sky-950/50 dark:hover:bg-sky-900/60 text-sky-700 dark:text-sky-300 border-2 border-b-4 border-sky-300 dark:border-sky-800 rounded-2xl text-xs font-black uppercase tracking-wider shadow-xs transition-all active:translate-y-0.5 active:border-b-2 cursor-pointer"
                            title="Tìm kiếm và chỉnh sửa nhanh từ vựng trong cuốn sách này"
                        >
                            <Search className="w-4 h-4" />
                            <span>Tìm từ vựng</span>
                        </button>
                        {isAdmin && setShowBlankFillerModal && (
                            <button
                                onClick={() => setShowBlankFillerModal(true)}
                                className="flex items-center gap-2 px-3.5 py-2 bg-teal-500 hover:bg-teal-600 text-white rounded-2xl text-xs font-black uppercase tracking-wider border-b-4 border-teal-700 active:translate-y-0.5 active:border-b-2 shadow-xs transition-all cursor-pointer"
                                title="Dùng AI tự động điền từ vào tất cả chỗ trống trong câu ví dụ cho toàn bộ các bài trong cuốn sách này"
                            >
                                <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
                                <span>AI điền từ ví dụ (Cả cuốn)</span>
                            </button>
                        )}
                        {isAdmin && (
                            <button
                                onClick={() => { resetForm(); setShowAddChapter(true); }}
                                className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl text-xs font-black uppercase tracking-wider border-b-4 border-emerald-700 active:translate-y-0.5 active:border-b-2 shadow-xs transition-all cursor-pointer"
                            >
                                <FolderPlus className="w-4 h-4" /> Thêm chương
                            </button>
                        )}
                    </div>
                </div>

                {/* Thanh tìm kiếm nhanh từ vựng trong sách */}
                <div
                    onClick={() => setShowVocabSearchModal(true)}
                    className="relative flex items-center bg-white dark:bg-slate-900 border-2 border-b-4 border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3 text-slate-400 dark:text-slate-500 hover:border-sky-400 dark:hover:border-sky-500 cursor-pointer shadow-xs transition-colors group"
                >
                    <Search className="w-4 h-4 text-slate-400 group-hover:text-sky-500 transition-colors mr-2.5 shrink-0" />
                    <span className="text-xs sm:text-sm font-bold select-none text-slate-500 dark:text-slate-400">
                        Nhập từ vựng trong sách để tìm kiếm và sửa nhanh...
                    </span>
                    <kbd className="ml-auto hidden sm:inline-block px-2.5 py-1 text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-xl border border-slate-200 dark:border-slate-700 font-mono font-black">
                        Tìm kiếm
                    </kbd>
                </div>

                {chapters.map((chapter, ci) => (
                    <div key={chapter.id} className="bg-white dark:bg-slate-900 rounded-3xl border-2 border-b-4 border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs mb-4">
                        <div className="flex items-center justify-between px-5 py-3.5 bg-slate-50 dark:bg-slate-800/60 border-b-2 border-slate-100 dark:border-slate-800">
                            <h3 className="font-black text-slate-850 dark:text-white text-sm flex-1 flex items-center gap-2">
                                <span>📖</span>
                                <InlineEditName type="chapter" id={chapter.id} currentName={chapter.name} />
                            </h3>
                            <div className="flex items-center gap-1">
                                {isAdmin && (
                                    <>
                                        <button onClick={() => handleReorderChapter(ci, -1)} disabled={ci === 0}
                                            className={`p-1.5 rounded-xl transition-colors ${ci === 0 ? 'text-slate-200 dark:text-slate-700 cursor-not-allowed' : 'text-slate-400 hover:text-sky-500 hover:bg-sky-50 dark:hover:bg-slate-700 cursor-pointer'}`}
                                            title="Di chuyển lên">
                                            <ChevronUp className="w-4 h-4" />
                                        </button>
                                        <button onClick={() => handleReorderChapter(ci, 1)} disabled={ci === chapters.length - 1}
                                            className={`p-1.5 rounded-xl transition-colors ${ci === chapters.length - 1 ? 'text-slate-200 dark:text-slate-700 cursor-not-allowed' : 'text-slate-400 hover:text-sky-500 hover:bg-sky-50 dark:hover:bg-slate-700 cursor-pointer'}`}
                                            title="Di chuyển xuống">
                                            <ChevronDown className="w-4 h-4" />
                                        </button>
                                        <button onClick={() => { resetForm(); navigateTo({ group: groupId, book: bookId, chapter: chapter.id }); setShowAddLesson(true); }}
                                            className="p-1.5 text-slate-400 hover:text-sky-500 hover:bg-sky-50 dark:hover:bg-slate-700 transition-colors cursor-pointer rounded-xl" title="Thêm bài">
                                            <Plus className="w-4 h-4" />
                                        </button>
                                        <button onClick={() => handleDeleteChapter(chapter.id, bookId, groupId)}
                                            className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-slate-700 transition-colors cursor-pointer rounded-xl" title="Xóa chương">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                        <div className="divide-y-2 divide-slate-100 dark:divide-slate-800">
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
                                        className="flex items-center justify-between px-5 py-3.5 hover:bg-sky-50/70 dark:hover:bg-sky-950/30 cursor-pointer transition-colors"
                                    >
                                        <div className="flex items-center gap-3 min-w-0">
                                            <span className="w-7 h-7 shrink-0 flex items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 border-2 border-b-3 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-black font-mono">
                                                {li + 1}
                                            </span>
                                            <span className="text-sm text-slate-850 dark:text-slate-100 flex items-center gap-2 font-bold truncate">
                                                {lesson.name}
                                                {lesson.isPremium && (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-black bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 rounded-xl border border-amber-200 dark:border-amber-800 shrink-0">
                                                        👑 Premium
                                                    </span>
                                                )}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2.5">
                                            {progressInfo.percent > 0 && (
                                                progressInfo.percent === 100 ? (
                                                    <span className="px-2.5 py-1 text-[10px] font-black bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 rounded-xl border border-emerald-200 dark:border-emerald-800">
                                                        ✓ Hoàn thành
                                                    </span>
                                                ) : (
                                                    <span className="px-2.5 py-1 text-[10px] font-black bg-sky-50 text-sky-600 dark:bg-sky-950/40 dark:text-sky-400 rounded-xl border border-sky-200 dark:border-sky-800">
                                                        {progressInfo.count}/{progressInfo.total} ({progressInfo.percent}%)
                                                    </span>
                                                )
                                            )}
                                            <span className="text-xs font-bold text-slate-400">{lesson.vocab?.length || 0} từ</span>
                                            {isAdmin && (
                                                <>
                                                    <button 
                                                        onClick={(e) => handleToggleLessonPremium(e, lesson, chapter.id)}
                                                        className={`p-1.5 rounded-xl transition-colors cursor-pointer ${lesson.isPremium ? 'text-amber-500 hover:text-amber-600 bg-amber-50 dark:bg-amber-950/40' : 'text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300'}`}
                                                        title={lesson.isPremium ? "Đổi thành Miễn phí" : "Đổi thành Premium"}
                                                    >
                                                        {lesson.isPremium ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                                                    </button>
                                                    <button onClick={(e) => { e.stopPropagation(); handleReorderLesson(chapter.id, li, -1); }} disabled={li === 0}
                                                        className={`p-1 rounded-lg cursor-pointer ${li === 0 ? 'text-slate-200 dark:text-slate-700' : 'text-slate-400 hover:text-sky-500'}`}>
                                                        <ChevronUp className="w-3.5 h-3.5" />
                                                    </button>
                                                    <button onClick={(e) => { e.stopPropagation(); handleReorderLesson(chapter.id, li, 1); }} disabled={li === chapter.lessons.length - 1}
                                                        className={`p-1 rounded-lg cursor-pointer ${li === chapter.lessons.length - 1 ? 'text-slate-200 dark:text-slate-700' : 'text-slate-400 hover:text-sky-500'}`}>
                                                        <ChevronDown className="w-3.5 h-3.5" />
                                                    </button>
                                                    <button onClick={(e) => { e.stopPropagation(); handleDeleteLesson(lesson.id, chapter.id, bookId, groupId); }}
                                                        className="p-1.5 text-slate-400 hover:text-red-500 transition-colors cursor-pointer rounded-xl">
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                </>
                                            )}
                                            <ChevronRight className="w-4 h-4 text-slate-300 dark:text-slate-600" />
                                        </div>
                                    </div>
                                );
                            })}
                            {chapter.lessons.length === 0 && (
                                <p className="text-center py-5 text-xs font-bold text-slate-400">Chưa có bài nào trong chương này</p>
                            )}
                        </div>
                    </div>
                ))}

                {chapters.length === 0 && (
                    <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800 text-slate-400">
                        <Layers className="w-14 h-14 mx-auto mb-3.5 opacity-30 text-slate-400" />
                        <p className="text-base font-black text-slate-600 dark:text-slate-300">Chưa có chương nào</p>
                    </div>
                )}
            </div>

            {/* Table of Contents - right sidebar */}
            {showTOC && (
                <BookTableOfContents
                    chapters={chapters}
                    groupId={groupId}
                    bookId={bookId}
                    getLessonProgressInfo={getLessonProgressInfo}
                    isAdmin={isAdmin}
                    profile={profile}
                    setLockedPkgName={setLockedPkgName}
                    setShowPremiumModal={setShowPremiumModal}
                    navigateTo={navigateTo}
                    setShowBlankFillerModal={setShowBlankFillerModal}
                />
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
