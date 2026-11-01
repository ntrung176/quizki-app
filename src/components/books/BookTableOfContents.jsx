import React, { useEffect, useRef } from 'react';
import { Sparkles } from 'lucide-react';

/**
 * Reusable Table of Contents sidebar for Books (used in both BookView and LessonDetailView)
 */
const BookTableOfContents = ({
    chapters = [],
    currentLessonId = null,
    groupId,
    bookId,
    getLessonProgressInfo,
    isAdmin = false,
    profile = null,
    setLockedPkgName,
    setShowPremiumModal,
    navigateTo,
    setShowBlankFillerModal,
    className = ''
}) => {
    const activeItemRef = useRef(null);

    useEffect(() => {
        if (activeItemRef.current) {
            activeItemRef.current.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        }
    }, [currentLessonId]);

    if (!chapters || chapters.length === 0) return null;

    return (
        <div className={`hidden lg:block w-64 shrink-0 ${className}`}>
            <div className="sticky top-4 bg-white dark:bg-slate-900 rounded-3xl border-2 border-b-4 border-slate-200 dark:border-slate-800 p-4 shadow-xs max-h-[calc(100vh-2rem)] flex flex-col">
                <div className="flex items-center justify-between gap-1 mb-3 shrink-0 pb-2 border-b border-slate-100 dark:border-slate-800">
                    <h4 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                        📚 Mục lục sách
                    </h4>
                    {isAdmin && setShowBlankFillerModal && (
                        <button
                            onClick={() => setShowBlankFillerModal(true)}
                            className="flex items-center gap-1 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 active:translate-y-0.5 border-b-2 border-emerald-800 text-white rounded-xl text-[10px] font-black shadow-xs transition-all cursor-pointer select-none"
                            title="Dùng AI điền từ vào chỗ trống câu ví dụ cho cả cuốn sách"
                        >
                            <Sparkles className="w-3 h-3 text-amber-300" />
                            <span>AI Cả cuốn</span>
                        </button>
                    )}
                </div>
                <nav className="space-y-3 overflow-y-auto pr-1">
                    {chapters.map((ch) => (
                        <div key={ch.id} className="space-y-1">
                            <p className="text-xs font-black text-slate-700 dark:text-slate-200 px-3 py-1.5 sticky top-0 bg-slate-100/95 dark:bg-slate-800/95 backdrop-blur-xs z-10 rounded-xl border border-slate-200/80 dark:border-slate-700/80 truncate shadow-2xs">
                                {ch.name}
                            </p>
                            <div className="space-y-1 pl-1">
                                {(ch.lessons || []).map((ls) => {
                                    const isLocked = ls.isPremium && !isAdmin && !profile?.isPremiumUnlocked && !(profile?.unlockedSpecializedPackages || []).includes('vocab_zen');
                                    const progressInfo = getLessonProgressInfo ? getLessonProgressInfo(groupId, bookId, ch.id, ls) : { percent: 0 };
                                    const isCurrent = currentLessonId && currentLessonId === ls.id;

                                    return (
                                        <button
                                            key={ls.id}
                                            ref={isCurrent ? activeItemRef : null}
                                            onClick={() => {
                                                if (isLocked) {
                                                    if (setLockedPkgName) setLockedPkgName('Từ vựng chuyên sâu Zen');
                                                    if (setShowPremiumModal) setShowPremiumModal(true);
                                                } else {
                                                    navigateTo({ group: groupId, book: bookId, lesson: ls.id });
                                                }
                                            }}
                                            className={`w-full text-left text-xs p-2.5 rounded-2xl transition-all truncate flex items-center justify-between gap-1.5 cursor-pointer select-none ${
                                                isCurrent
                                                    ? 'bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 font-black border-2 border-b-4 border-sky-400 dark:border-sky-600 shadow-xs'
                                                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60 font-bold border-2 border-transparent'
                                            }`}
                                            title={ls.name}
                                        >
                                            <span className="truncate flex items-center gap-1.5">
                                                <span className="truncate">{ls.name}</span>
                                            </span>
                                            <div className="flex items-center gap-1 shrink-0">
                                                {progressInfo.percent > 0 && (
                                                    progressInfo.percent === 100 ? (
                                                        <span className="w-4 h-4 rounded-full bg-emerald-500 text-white font-black text-[10px] flex items-center justify-center shrink-0 shadow-2xs" title="Hoàn thành">✓</span>
                                                    ) : (
                                                        <span className="bg-sky-100 dark:bg-sky-900/50 text-sky-700 dark:text-sky-300 font-black text-[10px] px-1.5 py-0.5 rounded-full shrink-0">
                                                            {progressInfo.percent}%
                                                        </span>
                                                    )
                                                )}
                                                {ls.isPremium && <span className="text-[10px] text-amber-500 shrink-0" title="Bài học Premium">👑</span>}
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </nav>
            </div>
        </div>
    );
};

export default React.memo(BookTableOfContents);
