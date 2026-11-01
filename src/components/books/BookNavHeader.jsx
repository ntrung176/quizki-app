import React from 'react';
import { ChevronRight, Plus, Upload, BookOpen, Layers, FileText, Sparkles } from 'lucide-react';

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
    setShowAiPdfModal,
    setShowBlankFillerModal,
    setShowCreateStudySetModal,
    setShowLinkStudySetModal,
    setSelectedVocabIndices,
    vocabWithAudio
}) => {
    return (
        <div className="flex flex-wrap items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-3xl border-2 border-b-4 border-slate-200 dark:border-slate-800 shadow-xs">
            {/* Breadcrumb Path */}
            <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm flex-wrap">
                <button 
                    onClick={() => navigateTo({})}
                    className="font-black text-slate-700 dark:text-slate-200 hover:text-emerald-600 dark:hover:text-emerald-400 bg-slate-100 dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 transition-all cursor-pointer select-none active:translate-y-0.5"
                >
                    Kho Sách
                </button>
                {currentGroup && (
                    <>
                        <ChevronRight className="w-4 h-4 text-slate-300 dark:text-slate-600 shrink-0" />
                        <button 
                            onClick={() => navigateTo({ group: groupId })}
                            className={`font-black px-2.5 py-1.5 rounded-xl transition-all cursor-pointer select-none ${
                                !bookId 
                                    ? 'bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400 border border-sky-200 dark:border-sky-800' 
                                    : 'text-slate-600 dark:text-slate-300 hover:text-sky-500 hover:bg-slate-100 dark:hover:bg-slate-800'
                            }`}
                        >
                            {currentGroup.name}
                        </button>
                    </>
                )}
                {currentBook && (
                    <>
                        <ChevronRight className="w-4 h-4 text-slate-300 dark:text-slate-600 shrink-0" />
                        <button 
                            onClick={() => navigateTo({ group: groupId, book: bookId })}
                            className={`font-black px-2.5 py-1.5 rounded-xl transition-all cursor-pointer select-none ${
                                !lessonId 
                                    ? 'bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400 border border-sky-200 dark:border-sky-800' 
                                    : 'text-slate-600 dark:text-slate-300 hover:text-sky-500 hover:bg-slate-100 dark:hover:bg-slate-800'
                            }`}
                        >
                            {currentBook.name}
                        </button>
                    </>
                )}
                {lessonId && currentChapter && (
                    <>
                        <ChevronRight className="w-4 h-4 text-slate-300 dark:text-slate-600 shrink-0" />
                        <button 
                            onClick={() => navigateTo({ group: groupId, book: bookId })}
                            className="font-bold text-slate-600 dark:text-slate-300 hover:text-sky-500 hover:bg-slate-100 dark:hover:bg-slate-800 px-2.5 py-1.5 rounded-xl transition-all cursor-pointer max-w-[200px] truncate"
                            title={currentChapter.name}
                        >
                            {currentChapter.name}
                        </button>
                    </>
                )}
                {currentLesson && (
                    <>
                        <ChevronRight className="w-4 h-4 text-slate-300 dark:text-slate-600 shrink-0" />
                        <span 
                            className="font-black text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/50 px-3 py-1.5 rounded-xl border border-sky-200 dark:border-sky-800/80 max-w-xs sm:max-w-md truncate"
                            title={currentLesson.name}
                        >
                            {currentLesson.name}
                        </span>
                    </>
                )}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 flex-wrap">
                {lessonId && (
                    <div className="flex items-center gap-2 flex-wrap">
                        <button
                            onClick={() => {
                                setSelectedVocabIndices(new Set(vocabWithAudio.map((_, i) => i)));
                                setShowCreateStudySetModal(true);
                            }}
                            className="px-3.5 py-2 bg-sky-500 hover:bg-sky-400 active:translate-y-0.5 active:border-b-2 border-b-4 border-sky-700 text-white rounded-2xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-xs cursor-pointer select-none"
                        >
                            <Plus className="w-4 h-4 stroke-[3]" /> Tạo học phần từ bài
                        </button>
                        <button
                            onClick={() => {
                                setSelectedVocabIndices(new Set(vocabWithAudio.map((_, i) => i)));
                                setShowLinkStudySetModal(true);
                            }}
                            className="px-3.5 py-2 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 active:translate-y-0.5 active:border-b-2 border-2 border-b-4 border-emerald-300 dark:border-emerald-800 rounded-2xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-xs cursor-pointer select-none"
                        >
                            <Layers className="w-4 h-4 stroke-[2.5]" /> Liên kết học phần
                        </button>
                    </div>
                )}
                {isAdmin && (
                    <>
                        {setShowBlankFillerModal && (
                            <button
                                onClick={() => setShowBlankFillerModal(true)}
                                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 active:translate-y-0.5 active:border-b-2 border-b-4 border-emerald-800 text-white rounded-2xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-xs cursor-pointer select-none"
                                title="Dùng AI điền từ vựng và chia đúng thể cho các câu ví dụ khuyết"
                            >
                                <Sparkles className="w-4 h-4" /> AI Lắp từ vào ví dụ
                            </button>
                        )}
                        {setShowAiPdfModal && (
                            <button
                                onClick={() => setShowAiPdfModal(true)}
                                className="px-3.5 py-2 bg-teal-600 hover:bg-teal-500 active:translate-y-0.5 active:border-b-2 border-b-4 border-teal-800 text-white rounded-2xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-xs cursor-pointer select-none"
                                title="Soạn cấu trúc sách và bài học tự động từ file PDF bằng AI"
                            >
                                <FileText className="w-4 h-4 stroke-[2.5]" /> Soạn từ PDF (AI)
                            </button>
                        )}
                        {groupId && !bookId && (
                            <button onClick={() => setShowAddBook(true)} className="px-3.5 py-2 bg-sky-500 hover:bg-sky-400 active:translate-y-0.5 active:border-b-2 border-b-4 border-sky-700 text-white rounded-2xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1 cursor-pointer select-none">
                                <Plus className="w-4 h-4 stroke-[3]" /> Thêm Sách
                            </button>
                        )}
                        {bookId && !chapterId && (
                            <button onClick={() => setShowAddChapter(true)} className="px-3.5 py-2 bg-sky-500 hover:bg-sky-400 active:translate-y-0.5 active:border-b-2 border-b-4 border-sky-700 text-white rounded-2xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1 cursor-pointer select-none">
                                <Plus className="w-4 h-4 stroke-[3]" /> Thêm Chương
                            </button>
                        )}
                        {chapterId && !lessonId && (
                            <button onClick={() => setShowAddLesson(true)} className="px-3.5 py-2 bg-sky-500 hover:bg-sky-400 active:translate-y-0.5 active:border-b-2 border-b-4 border-sky-700 text-white rounded-2xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1 cursor-pointer select-none">
                                <Plus className="w-4 h-4 stroke-[3]" /> Thêm Bài
                            </button>
                        )}
                        {lessonId && (
                            <button onClick={() => setShowJsonImport(true)} className="px-3.5 py-2 bg-amber-500 hover:bg-amber-400 active:translate-y-0.5 active:border-b-2 border-b-4 border-amber-700 text-white rounded-2xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer select-none shadow-xs">
                                <Upload className="w-4 h-4 stroke-[2.5]" /> Import JSON
                            </button>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

export default BookNavHeader;
