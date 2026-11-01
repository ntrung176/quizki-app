import React from 'react';
import { Sparkles, Trophy, ArrowRight } from 'lucide-react';

/**
 * Duolingo-style Full-screen Victory Celebration View
 * Displays trophies, stats bento, SRS auto-add cards, and continue CTA.
 */
const RoadmapLessonVictory = ({
    lesson,
    stage,
    correctCount = 0,
    totalQuestions = 1,
    srsSyncResult = null,
    isSyncingSrs = false,
    onContinue
}) => {
    const scorePercent = Math.round((correctCount / Math.max(1, totalQuestions)) * 100);

    return (
        <div className="w-full max-w-xl mx-auto text-center py-6 sm:py-10 space-y-6 sm:space-y-8 animate-in zoom-in-95 duration-300">
            {/* 1. Large 3D Trophy Icon */}
            <div className="relative inline-block">
                <div className="w-24 h-24 sm:w-28 sm:h-28 mx-auto rounded-3xl bg-gradient-to-br from-amber-400 to-amber-600 text-white flex items-center justify-center text-5xl sm:text-6xl shadow-xl shadow-amber-500/30 border-b-4 border-amber-700 animate-bounce">
                    🏆
                </div>
            </div>

            {/* 2. Victory Heading */}
            <div className="space-y-2">
                <span className="text-xs font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
                    XUẤT SẮC HOÀN THÀNH
                </span>
                <h2 className="text-2xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
                    {lesson?.title || 'Bài học hoàn tất!'}
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                    Bạn đã mở khóa bài học tiếp theo trên lộ trình và kích hoạt kiến thức vào kho ôn tập!
                </p>
            </div>

            {/* 3. Duolingo Stats Bento */}
            <div className="grid grid-cols-3 gap-3 sm:gap-4 max-w-md mx-auto">
                <div className="p-3 sm:p-4 bg-amber-50 dark:bg-amber-950/40 rounded-2xl border-2 border-b-4 border-amber-300 dark:border-amber-800">
                    <div className="text-[11px] font-bold text-amber-600 dark:text-amber-400">ĐIỂM SỐ</div>
                    <div className="text-xl sm:text-2xl font-black text-amber-700 dark:text-amber-300 mt-0.5">
                        {scorePercent}%
                    </div>
                </div>
                <div className="p-3 sm:p-4 bg-emerald-50 dark:bg-emerald-950/40 rounded-2xl border-2 border-b-4 border-emerald-300 dark:border-emerald-800">
                    <div className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">KINH NGHIỆM</div>
                    <div className="text-xl sm:text-2xl font-black text-emerald-700 dark:text-emerald-300 mt-0.5">
                        +{lesson?.xp || 25} XP
                    </div>
                </div>
                <div className="p-3 sm:p-4 bg-sky-50 dark:bg-sky-950/40 rounded-2xl border-2 border-b-4 border-sky-300 dark:border-sky-800">
                    <div className="text-[11px] font-bold text-sky-600 dark:text-sky-400">ĐÁNH GIÁ</div>
                    <div className="text-base sm:text-lg font-black text-sky-700 dark:text-sky-300 mt-1">
                        ⭐⭐⭐
                    </div>
                </div>
            </div>

            {/* 4. SRS Deck Auto-Added Notification */}
            {(isSyncingSrs || (srsSyncResult && (srsSyncResult.vocabCount > 0 || srsSyncResult.kanjiCount > 0 || srsSyncResult.grammarCount > 0))) && (
                <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 rounded-3xl border-2 border-emerald-300 dark:border-emerald-800 text-left space-y-2.5 max-w-md mx-auto shadow-xs animate-in fade-in">
                    <div className="flex items-center gap-2 text-xs font-black text-emerald-700 dark:text-emerald-300 uppercase tracking-wider">
                        <Sparkles className="w-4 h-4 fill-emerald-400 text-emerald-600 animate-pulse" />
                        <span>Đã thêm vào bộ thẻ ôn tập ngắt quãng (SRS):</span>
                    </div>

                    {isSyncingSrs ? (
                        <div className="text-xs text-slate-500 italic">Đang đồng bộ thẻ ôn tập...</div>
                    ) : (
                        <div className="flex flex-wrap gap-2 text-xs font-bold">
                            {srsSyncResult?.vocabCount > 0 && (
                                <span className="px-3 py-1.5 rounded-xl bg-sky-100 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 font-mono flex items-center gap-1.5 border border-sky-300/60 shadow-2xs">
                                    📚 +{srsSyncResult.vocabCount} Từ vựng
                                </span>
                            )}
                            {srsSyncResult?.kanjiCount > 0 && (
                                <span className="px-3 py-1.5 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 font-mono flex items-center gap-1.5 border border-amber-300/60 shadow-2xs">
                                    🈶 +{srsSyncResult.kanjiCount} Hán tự
                                </span>
                            )}
                            {srsSyncResult?.grammarCount > 0 && (
                                <span className="px-3 py-1.5 rounded-xl bg-teal-100 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 font-mono flex items-center gap-1.5 border border-teal-300/60 shadow-2xs">
                                    📝 +{srsSyncResult.grammarCount} Ngữ pháp
                                </span>
                            )}
                        </div>
                    )}

                    <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                        Bạn có thể bắt đầu ôn luyện các kiến thức này theo chu kỳ lặp lại ngắt quãng tại Trang chủ!
                    </p>
                </div>
            )}

            {/* 5. Big CTA Button */}
            <div className="pt-2">
                <button
                    type="button"
                    onClick={onContinue}
                    className="w-full max-w-md mx-auto px-10 py-4 rounded-2xl font-black text-base uppercase tracking-wider text-white bg-emerald-500 hover:bg-emerald-400 border-b-4 border-emerald-700 active:translate-y-1 active:border-b-0 shadow-lg shadow-emerald-500/25 transition-all cursor-pointer select-none flex items-center justify-center gap-2"
                >
                    <span>TIẾP TỤC LỘ TRÌNH</span>
                    <ArrowRight className="w-5 h-5 stroke-[3]" />
                </button>
            </div>
        </div>
    );
};

export default RoadmapLessonVictory;

