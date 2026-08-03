import React from 'react';
import { ChevronRight, Plus, Upload, BookOpen, Layers } from 'lucide-react';

const BookNavHeader = ({
    currentGroup,
    currentBook,
    currentChapter,
    currentLesson,
    groupId,
    bookId,
    chapterId,
    lessonId,
    navigateTo,
    goBack,
    isAdmin,
    setShowAddBook,
    setShowAddChapter,
    setShowAddLesson,
    setShowJsonImport,
    setShowCreateStudySetModal,
    setShowLinkStudySetModal,
    setSelectedVocabIndices,
    vocabWithAudio
}) => {
    return (
        <div className="flex flex-wrap items-center justify-between gap-4 bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-100 dark:border-gray-700/50 shadow-sm">
            {/* Breadcrumb Path */}
            <div className="flex items-center gap-2 text-sm flex-wrap">
                <button 
                    onClick={() => navigateTo({})}
                    className="font-bold text-slate-700 dark:text-slate-200 hover:text-sky-500 dark:hover:text-sky-400 transition-colors"
                >
                    Kho Sách
                </button>
                {currentGroup && (
                    <>
                        <ChevronRight className="w-4 h-4 text-slate-400" />
                        <button 
                            onClick={() => navigateTo({ group: groupId })}
                            className={`font-semibold transition-colors ${!bookId ? 'text-sky-500 font-bold' : 'text-slate-600 dark:text-slate-300 hover:text-sky-500'}`}
                        >
                            {currentGroup.name}
                        </button>
                    </>
                )}
                {currentBook && (
                    <>
                        <ChevronRight className="w-4 h-4 text-slate-400" />
                        <button 
                            onClick={() => navigateTo({ group: groupId, book: bookId })}
                            className={`font-semibold transition-colors ${!chapterId ? 'text-sky-500 font-bold' : 'text-slate-600 dark:text-slate-300 hover:text-sky-500'}`}
                        >
                            {currentBook.name}
                        </button>
                    </>
                )}
                {currentChapter && (
                    <>
                        <ChevronRight className="w-4 h-4 text-slate-400" />
                        <button 
                            onClick={() => navigateTo({ group: groupId, book: bookId, chapter: chapterId })}
                            className={`font-semibold transition-colors ${!lessonId ? 'text-sky-500 font-bold' : 'text-slate-600 dark:text-slate-300 hover:text-sky-500'}`}
                        >
                            {currentChapter.name}
                        </button>
                    </>
                )}
                {currentLesson && (
                    <>
                        <ChevronRight className="w-4 h-4 text-slate-400" />
                        <span className="font-bold text-sky-500">{currentLesson.name}</span>
                    </>
                )}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 flex-wrap">
                {lessonId && (
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => {
                                setSelectedVocabIndices(new Set(vocabWithAudio.map((_, i) => i)));
                                setShowCreateStudySetModal(true);
                            }}
                            className="px-3 py-1.5 bg-sky-500 hover:bg-sky-600 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm cursor-pointer"
                        >
                            <Plus className="w-3.5 h-3.5" /> Tạo học phần từ bài
                        </button>
                        <button
                            onClick={() => {
                                setSelectedVocabIndices(new Set(vocabWithAudio.map((_, i) => i)));
                                setShowLinkStudySetModal(true);
                            }}
                            className="px-3 py-1.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                        >
                            <Layers className="w-3.5 h-3.5" /> Liên kết học phần
                        </button>
                    </div>
                )}
                {isAdmin && (
                    <>
                        {groupId && !bookId && (
                            <button onClick={() => setShowAddBook(true)} className="px-3 py-1.5 bg-sky-500 hover:bg-sky-600 text-white rounded-xl text-xs font-bold transition flex items-center gap-1">
                                <Plus className="w-3.5 h-3.5" /> Thêm Sách
                            </button>
                        )}
                        {bookId && !chapterId && (
                            <button onClick={() => setShowAddChapter(true)} className="px-3 py-1.5 bg-sky-500 hover:bg-sky-600 text-white rounded-xl text-xs font-bold transition flex items-center gap-1">
                                <Plus className="w-3.5 h-3.5" /> Thêm Chương
                            </button>
                        )}
                        {chapterId && !lessonId && (
                            <button onClick={() => setShowAddLesson(true)} className="px-3 py-1.5 bg-sky-500 hover:bg-sky-600 text-white rounded-xl text-xs font-bold transition flex items-center gap-1">
                                <Plus className="w-3.5 h-3.5" /> Thêm Bài
                            </button>
                        )}
                        {lessonId && (
                            <button onClick={() => setShowJsonImport(true)} className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold transition flex items-center gap-1">
                                <Upload className="w-3.5 h-3.5" /> Import JSON
                            </button>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

export default BookNavHeader;
