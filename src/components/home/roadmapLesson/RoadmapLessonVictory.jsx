import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, ArrowRight, RotateCw } from 'lucide-react';
import { ROUTES } from '../../../router';

/**
 * Duolingo-style Full-screen Victory Celebration View
 * Displays trophies, score/XP bento, exact items auto-added to SRS, and direct SRS Review shortcuts.
 */
const RoadmapLessonVictory = ({
    lesson,
    correctCount = 0,
    totalQuestions = 1,
    srsSyncResult = null,
    isSyncingSrs = false,
    onContinue
}) => {
    const navigate = useNavigate();
    const scorePercent = Math.min(100, Math.round((correctCount / Math.max(1, totalQuestions)) * 100));
    const hasAnySrs = srsSyncResult && (
        srsSyncResult.vocabCount > 0 ||
        srsSyncResult.kanjiCount > 0 ||
        srsSyncResult.grammarCount > 0
    );

    const handleGoReview = (route) => {
        if (onContinue) onContinue();
        navigate(route);
    };

    return (
        <div className="w-full max-w-xl mx-auto text-center py-4 sm:py-8 space-y-5 sm:space-y-6 animate-in zoom-in-95 duration-300">
            {/* 1. Large 3D Trophy Icon */}
            <div className="relative inline-block">
                <div className="w-20 h-20 sm:w-24 sm:h-24 mx-auto rounded-3xl bg-gradient-to-br from-amber-400 to-amber-600 text-white flex items-center justify-center text-4xl sm:text-5xl shadow-xl shadow-amber-500/30 border-b-4 border-amber-700 animate-bounce">
                    🏆
                </div>
            </div>

            {/* 2. Victory Heading */}
            <div className="space-y-1.5">
                <span className="text-xs font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
                    XUẤT SẮC HOÀN THÀNH
                </span>
                <h2 className="text-xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                    {lesson?.title || 'Bài học hoàn tất!'}
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                    Kiến thức của bài học đã tự động đưa vào lịch trình Lặp Lại Ngắt Quãng (SRS) để bạn ghi nhớ vĩnh viễn.
                </p>
            </div>

            {/* 3. Duolingo Stats Bento */}
            <div className="grid grid-cols-3 gap-3 max-w-md mx-auto">
                <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-2xl border-2 border-b-4 border-amber-300 dark:border-amber-800">
                    <div className="text-[10px] font-bold text-amber-600 dark:text-amber-400">ĐỘ CHÍNH XÁC</div>
                    <div className="text-xl font-black text-amber-700 dark:text-amber-300 mt-0.5">
                        {scorePercent}%
                    </div>
                </div>
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-2xl border-2 border-b-4 border-emerald-300 dark:border-emerald-800">
                    <div className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">KINH NGHIỆM</div>
                    <div className="text-xl font-black text-emerald-700 dark:text-emerald-300 mt-0.5">
                        +{lesson?.xp || 25} XP
                    </div>
                </div>
                <div className="p-3 bg-sky-50 dark:bg-sky-950/40 rounded-2xl border-2 border-b-4 border-sky-300 dark:border-sky-800">
                    <div className="text-[10px] font-bold text-sky-600 dark:text-sky-400">ĐÁNH GIÁ</div>
                    <div className="text-base font-black text-sky-700 dark:text-sky-300 mt-1">
                        {scorePercent >= 90 ? '⭐⭐⭐' : scorePercent >= 60 ? '⭐⭐' : '⭐'}
                    </div>
                </div>
            </div>

            {/* 4. Detailed SRS Deck Auto-Added Box */}
            {(isSyncingSrs || hasAnySrs) && (
                <div className="p-4 bg-emerald-50/90 dark:bg-emerald-950/40 rounded-3xl border-2 border-emerald-300 dark:border-emerald-800 text-left space-y-3 max-w-md mx-auto shadow-xs">
                    <div className="flex items-center gap-2 text-xs font-black text-emerald-700 dark:text-emerald-300 uppercase tracking-wider">
                        <Sparkles className="w-4 h-4 fill-emerald-400 text-emerald-600 animate-pulse shrink-0" />
                        <span>Đã đồng bộ ngay vào bộ ôn tập SRS:</span>
                    </div>

                    {isSyncingSrs ? (
                        <div className="text-xs text-slate-500 italic">Đang lưu thẻ Từ vựng / Kanji / Ngữ pháp vào SRS...</div>
                    ) : (
                        <>
                            <div className="flex flex-wrap gap-2 text-xs font-bold">
                                {srsSyncResult?.vocabCount > 0 && (
                                    <button
                                        type="button"
                                        onClick={() => handleGoReview(ROUTES.VOCAB_REVIEW)}
                                        className="px-3 py-1.5 rounded-xl bg-sky-100 hover:bg-sky-200 dark:bg-sky-950/70 dark:hover:bg-sky-900 text-sky-700 dark:text-sky-300 font-mono flex items-center gap-1.5 border border-sky-300/60 shadow-2xs cursor-pointer transition"
                                    >
                                        📚 +{srsSyncResult.vocabCount} Từ vựng →
                                    </button>
                                )}
                                {srsSyncResult?.kanjiCount > 0 && (
                                    <button
                                        type="button"
                                        onClick={() => handleGoReview(ROUTES.KANJI_REVIEW)}
                                        className="px-3 py-1.5 rounded-xl bg-amber-100 hover:bg-amber-200 dark:bg-amber-950/70 dark:hover:bg-amber-900 text-amber-700 dark:text-amber-300 font-mono flex items-center gap-1.5 border border-amber-300/60 shadow-2xs cursor-pointer transition"
                                    >
                                        🈶 +{srsSyncResult.kanjiCount} Hán tự →
                                    </button>
                                )}
                                {srsSyncResult?.grammarCount > 0 && (
                                    <button
                                        type="button"
                                        onClick={() => handleGoReview(ROUTES.GRAMMAR_REVIEW)}
                                        className="px-3 py-1.5 rounded-xl bg-teal-100 hover:bg-teal-200 dark:bg-teal-950/70 dark:hover:bg-teal-900 text-teal-700 dark:text-teal-300 font-mono flex items-center gap-1.5 border border-teal-300/60 shadow-2xs cursor-pointer transition"
                                    >
                                        📝 +{srsSyncResult.grammarCount} Ngữ pháp →
                                    </button>
                                )}
                            </div>

                            {/* Preview chips of actual items added */}
                            <div className="flex flex-wrap gap-1.5 pt-0.5 max-h-24 overflow-y-auto custom-scrollbar">
                                {(srsSyncResult.vocabItems || []).slice(0, 6).map((v, idx) => (
                                    <span key={`sv-${idx}`} className="text-[11px] font-semibold px-2 py-0.5 rounded-lg bg-white/80 dark:bg-slate-900/70 border border-sky-200 dark:border-sky-800/50 text-slate-700 dark:text-slate-200">
                                        {v.word}
                                    </span>
                                ))}
                                {(srsSyncResult.kanjiItems || []).slice(0, 6).map((k, idx) => (
                                    <span key={`sk-${idx}`} className="text-[11px] font-semibold px-2 py-0.5 rounded-lg bg-white/80 dark:bg-slate-900/70 border border-amber-200 dark:border-amber-800/50 text-amber-700 dark:text-amber-300">
                                        {k.character}{k.sinoViet ? ` (${k.sinoViet})` : ''}
                                    </span>
                                ))}
                                {(srsSyncResult.grammarItems || []).slice(0, 4).map((g, idx) => (
                                    <span key={`sg-${idx}`} className="text-[11px] font-semibold px-2 py-0.5 rounded-lg bg-white/80 dark:bg-slate-900/70 border border-teal-200 dark:border-teal-800/50 text-teal-700 dark:text-teal-300">
                                        {g.pattern}
                                    </span>
                                ))}
                            </div>
                        </>
                    )}
                </div>
            )}

            {/* 5. Big CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 max-w-md mx-auto pt-1">
                {hasAnySrs && !isSyncingSrs && (
                    <button
                        type="button"
                        onClick={() => handleGoReview(
                            srsSyncResult.vocabCount > 0 ? ROUTES.VOCAB_REVIEW
                                : srsSyncResult.kanjiCount > 0 ? ROUTES.KANJI_REVIEW
                                : ROUTES.GRAMMAR_REVIEW
                        )}
                        className="w-full sm:w-auto px-5 py-3.5 rounded-2xl font-black text-xs uppercase tracking-wider text-sky-700 dark:text-sky-300 bg-sky-50 hover:bg-sky-100 dark:bg-sky-950/60 dark:hover:bg-sky-900 border-2 border-b-4 border-sky-300 dark:border-sky-700 active:translate-y-0.5 cursor-pointer select-none flex items-center justify-center gap-1.5"
                    >
                        <RotateCw className="w-4 h-4" />
                        <span>ÔN SRS NGAY</span>
                    </button>
                )}
                <button
                    type="button"
                    onClick={onContinue}
                    className="flex-1 w-full px-8 py-4 rounded-2xl font-black text-sm uppercase tracking-wider text-white bg-emerald-500 hover:bg-emerald-400 border-b-4 border-emerald-700 active:translate-y-1 active:border-b-0 shadow-lg shadow-emerald-500/25 transition-all cursor-pointer select-none flex items-center justify-center gap-2"
                >
                    <span>TIẾP TỤC LỘ TRÌNH</span>
                    <ArrowRight className="w-5 h-5 stroke-[3]" />
                </button>
            </div>
        </div>
    );
};

export default RoadmapLessonVictory;
