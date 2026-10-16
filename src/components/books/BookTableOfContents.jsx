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
        <div className={`hidden lg:block w-56 shrink-0 ${className}`}>
            <div className="sticky top-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-3 shadow-sm max-h-[calc(100vh-2rem)] flex flex-col">
                <div className="flex items-center justify-between gap-1 mb-2 shrink-0">
                    <h4 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Mục lục
                    </h4>
                    {isAdmin && setShowBlankFillerModal && (
                        <button
                            onClick={() => setShowBlankFillerModal(true)}
                            className="flex items-center gap-1 px-2 py-0.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-md text-[10px] font-bold shadow-xs transition-all active:scale-95 cursor-pointer"
                            title="Dùng AI điền từ vào chỗ trống câu ví dụ cho cả cuốn sách"
                        >
                            <Sparkles className="w-3 h-3 text-amber-300" />
                            <span>AI Cả cuốn</span>
                        </button>
                    )}
                </div>
                <nav className="space-y-2 overflow-y-auto pr-1">
                    {chapters.map((ch) => (
                        <div key={ch.id}>
                            <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 px-2 py-1 sticky top-0 bg-white/95 dark:bg-gray-800/95 backdrop-blur-xs z-10 truncate">
                                {ch.name}
                            </p>
                            <div className="space-y-0.5 mt-0.5">
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
                                            className={`w-full text-left text-[11px] px-2.5 py-1.5 rounded transition-all truncate flex items-center justify-between gap-1 cursor-pointer ${
                                                isCurrent
                                                    ? 'bg-sky-100 dark:bg-sky-900/40 text-sky-700 dark:text-sky-300 font-bold border-l-2 border-sky-500 pl-2'
                                                    : 'text-gray-500 dark:text-gray-400 hover:text-sky-600 dark:hover:text-sky-400 hover:bg-sky-50 dark:hover:bg-sky-900/10'
                                            }`}
                                            title={ls.name}
                                        >
                                            <span className="truncate flex items-center gap-1">
                                                <span className="truncate">{ls.name}</span>
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
                        </div>
                    ))}
                </nav>
            </div>
        </div>
    );
};

export default React.memo(BookTableOfContents);
