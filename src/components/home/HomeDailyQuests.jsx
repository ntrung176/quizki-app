import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
    Target, CheckCircle2, Flame, BookOpen, Layers,
    Languages, MessageSquare, Zap, Trophy, PlusCircle,
    Sparkles, Award, ArrowRight
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '../../router';
import { useLanguage } from '../../context/LanguageContext';
import { getSafeLocalDateString } from '../../utils/streakHelper';
import { launchConfetti } from '../../utils/celebrations';
import { playCompletionFanfare, playCorrectSound } from '../../utils/soundEffects';

const QUEST_POOL = [
    {
        id: 'srs_clear',
        title: 'Dọn sạch thẻ SRS đến hạn',
        target: 1,
        xp: 50,
        icon: Flame,
        color: 'text-amber-500 bg-amber-50 dark:bg-amber-950/60',
        route: ROUTES.VOCAB_REVIEW,
        getCurrent: (m) => (m.totalDue === 0 && (m.totalReviewsToday > 0 || m.effectiveVocabReviews > 0 || m.totalCards > 0) ? 1 : 0),
        formatProgress: (curr, tgt) => curr >= tgt ? '1/1' : `${curr}/${tgt}`
    },
    {
        id: 'vocab_review_10',
        title: 'Ôn tập 10 thẻ từ vựng',
        target: 10,
        xp: 25,
        icon: BookOpen,
        color: 'text-sky-500 bg-sky-50 dark:bg-sky-950/60',
        route: ROUTES.VOCAB_REVIEW,
        getCurrent: (m) => m.effectiveVocabReviews,
        formatProgress: (curr, tgt) => `${Math.min(curr, tgt)}/${tgt}`
    },
    {
        id: 'kanji_study_5',
        title: 'Luyện tập 5 chữ Hán Kanji',
        target: 5,
        xp: 30,
        icon: Languages,
        color: 'text-amber-500 bg-amber-50 dark:bg-amber-950/60',
        route: ROUTES.KANJI_REVIEW,
        japaneseOnly: true,
        getCurrent: (m) => m.kanjiReviewsToday,
        formatProgress: (curr, tgt) => `${Math.min(curr, tgt)}/${tgt}`
    },
    {
        id: 'grammar_study_3',
        title: 'Ôn tập 3 mẫu Ngữ pháp',
        target: 3,
        xp: 35,
        icon: CheckCircle2,
        color: 'text-teal-500 bg-teal-50 dark:bg-teal-950/60',
        route: ROUTES.GRAMMAR_REVIEW,
        japaneseOnly: true,
        getCurrent: (m) => m.grammarReviewsToday,
        formatProgress: (curr, tgt) => `${Math.min(curr, tgt)}/${tgt}`
    },
    {
        id: 'ai_kaiwa_talk',
        title: 'Đàm thoại cùng AI (1 bài)',
        target: 60,
        xp: 40,
        icon: MessageSquare,
        color: 'text-sky-500 bg-sky-50 dark:bg-sky-950/60',
        route: ROUTES.JLPT_KAIWA,
        japaneseOnly: true,
        getCurrent: (m) => m.kaiwaSeconds,
        formatProgress: (curr, tgt) => curr >= tgt ? 'Xong' : `${Math.min(curr, tgt)}s/${tgt}s`
    },
    {
        id: 'vocab_review_25',
        title: 'Chinh phục 25 thẻ từ vựng',
        target: 25,
        xp: 40,
        icon: Layers,
        color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950/60',
        route: ROUTES.VOCAB_REVIEW,
        getCurrent: (m) => m.effectiveVocabReviews,
        formatProgress: (curr, tgt) => `${Math.min(curr, tgt)}/${tgt}`
    },
    {
        id: 'xp_gain_50',
        title: 'Tích lũy 50 điểm XP',
        target: 50,
        xp: 30,
        icon: Zap,
        color: 'text-amber-500 bg-amber-50 dark:bg-amber-950/60',
        route: ROUTES.VOCAB_REVIEW,
        getCurrent: (m) => m.xpToday,
        formatProgress: (curr, tgt) => `${Math.min(curr, tgt)}/${tgt}`
    },
    {
        id: 'add_vocab_3',
        title: 'Thêm 3 từ vựng mới vào kho',
        target: 3,
        xp: 25,
        icon: PlusCircle,
        color: 'text-teal-500 bg-teal-50 dark:bg-teal-950/60',
        route: ROUTES.VOCAB_ADD,
        getCurrent: (m) => m.wordsAddedToday,
        formatProgress: (curr, tgt) => `${Math.min(curr, tgt)}/${tgt}`
    },
    {
        id: 'maintain_streak',
        title: 'Thắp sáng ngọn lửa Streak',
        target: 1,
        xp: 20,
        icon: Flame,
        color: 'text-amber-500 bg-amber-50 dark:bg-amber-950/60',
        route: ROUTES.VOCAB_REVIEW,
        getCurrent: (m) => (m.totalReviewsToday > 0 || m.effectiveVocabReviews > 0 || m.xpToday > 0 || m.kaiwaSeconds > 0 ? 1 : 0),
        formatProgress: (curr, tgt) => curr >= tgt ? '1/1' : `${curr}/${tgt}`
    },
    {
        id: 'xp_gain_100',
        title: 'Chinh phục 100 điểm XP',
        target: 100,
        xp: 50,
        icon: Trophy,
        color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950/60',
        route: ROUTES.VOCAB_REVIEW,
        getCurrent: (m) => m.xpToday,
        formatProgress: (curr, tgt) => `${Math.min(curr, tgt)}/${tgt}`
    },
    {
        id: 'review_marathon_20',
        title: 'Chiến binh ôn tập 20 câu',
        target: 20,
        xp: 35,
        icon: Sparkles,
        color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950/60',
        route: ROUTES.VOCAB_REVIEW,
        getCurrent: (m) => m.totalReviewsToday,
        formatProgress: (curr, tgt) => `${Math.min(curr, tgt)}/${tgt}`
    },
    {
        id: 'jlpt_practice',
        title: 'Luyện đề thi thử JLPT',
        target: 1,
        xp: 45,
        icon: Award,
        color: 'text-sky-500 bg-sky-50 dark:bg-sky-950/60',
        route: ROUTES.JLPT_TEST,
        japaneseOnly: true,
        getCurrent: (m) => m.jlptDoneCount,
        formatProgress: (curr, tgt) => curr >= tgt ? '1/1' : `${curr}/${tgt}`
    }
];

const HomeDailyQuests = ({
    userId,
    totalDue = 0,
    dailyActivityLogs = [],
    isJapaneseMode = true,
    awardXP,
    allCards = [],
    kanjiSrsStats,
    grammarSrsStats,
    stats
}) => {
    const { t } = useLanguage();
    const navigate = useNavigate();

    const todayStr = getSafeLocalDateString();
    const questKey = userId
        ? `quizki_daily_quests_v4_${userId}_${todayStr}`
        : `quizki_daily_quests_v4_guest_${todayStr}`;

    // Filter available pool by language mode
    const availablePool = useMemo(() => {
        return QUEST_POOL.filter(q => isJapaneseMode ? true : !q.japaneseOnly);
    }, [isJapaneseMode]);

    // Active quests state (always 3 items) and claimed quest IDs
    const [questData, setQuestData] = useState(() => {
        try {
            const saved = localStorage.getItem(questKey);
            if (saved) {
                const parsed = JSON.parse(saved);
                if (Array.isArray(parsed.activeIds) && parsed.activeIds.length > 0) {
                    return {
                        activeIds: parsed.activeIds.slice(0, 3),
                        claimedIds: Array.isArray(parsed.claimedIds) ? parsed.claimedIds : []
                    };
                }
            }
        } catch (_) {}

        // Default initial 3 quests
        const initial = availablePool.slice(0, 3).map(q => q.id);
        return {
            activeIds: initial,
            claimedIds: []
        };
    });

    const [claimingId, setClaimingId] = useState(null);

    // Save to localStorage whenever questData changes
    useEffect(() => {
        try {
            localStorage.setItem(questKey, JSON.stringify(questData));
        } catch (_) {}
    }, [questData, questKey]);

    // Ensure activeIds always has 3 items if available from pool
    useEffect(() => {
        setQuestData(prev => {
            const currentActive = prev.activeIds.filter(id => availablePool.some(q => q.id === id));
            if (currentActive.length < 3) {
                const needed = 3 - currentActive.length;
                const poolCandidates = availablePool.filter(q =>
                    !currentActive.includes(q.id) && !prev.claimedIds.includes(q.id)
                );
                // If exhausted pool, allow recycling from availablePool not currently active
                const fallbackCandidates = availablePool.filter(q => !currentActive.includes(q.id));
                const candidates = poolCandidates.length >= needed ? poolCandidates : fallbackCandidates;
                const added = candidates.slice(0, needed).map(q => q.id);
                const nextActive = [...currentActive, ...added];
                return { ...prev, activeIds: nextActive };
            }
            return prev;
        });
    }, [availablePool]);

    // Local storage metric trackers (Kaiwa, JLPT)
    const [kaiwaSeconds, setKaiwaSeconds] = useState(() => {
        try {
            const saved = localStorage.getItem(`quizki_kaiwa_used_${todayStr}`);
            return saved ? parseInt(saved, 10) || 0 : 0;
        } catch {
            return 0;
        }
    });

    const [jlptDoneCount, setJlptDoneCount] = useState(() => {
        try {
            const saved = localStorage.getItem('quizki_completed_tests');
            if (!saved) return 0;
            const parsed = JSON.parse(saved);
            if (Array.isArray(parsed)) {
                return parsed.filter(test =>
                    test?.date === todayStr || (test?.completedAt && getSafeLocalDateString(test?.completedAt) === todayStr)
                ).length;
            }
            return 0;
        } catch {
            return 0;
        }
    });

    useEffect(() => {
        const updateStorageMetrics = () => {
            try {
                const savedKaiwa = localStorage.getItem(`quizki_kaiwa_used_${todayStr}`);
                if (savedKaiwa) setKaiwaSeconds(parseInt(savedKaiwa, 10) || 0);

                const savedJlpt = localStorage.getItem('quizki_completed_tests');
                if (savedJlpt) {
                    const parsed = JSON.parse(savedJlpt);
                    if (Array.isArray(parsed)) {
                        setJlptDoneCount(parsed.filter(test =>
                            test?.date === todayStr || (test?.completedAt && getSafeLocalDateString(test?.completedAt) === todayStr)
                        ).length);
                    }
                }
            } catch (_) {}
        };

        window.addEventListener('focus', updateStorageMetrics);
        window.addEventListener('storage', updateStorageMetrics);
        return () => {
            window.removeEventListener('focus', updateStorageMetrics);
            window.removeEventListener('storage', updateStorageMetrics);
        };
    }, [todayStr]);

    // Metrics calculation
    const todayLog = useMemo(() => {
        if (!Array.isArray(dailyActivityLogs)) return {};
        return dailyActivityLogs.find(log => {
            if (!log) return false;
            const logId = log.id || '';
            const logDate = log.date || (log.lastUpdated ? getSafeLocalDateString(log.lastUpdated) : '');
            return logId === todayStr || logDate === todayStr;
        }) || {};
    }, [dailyActivityLogs, todayStr]);

    const effectiveVocabReviews = useMemo(() => {
        let countFromCards = 0;
        if (Array.isArray(allCards)) {
            allCards.forEach(c => {
                if (c?.lastReview) {
                    const d = getSafeLocalDateString(c.lastReview);
                    if (d === todayStr) countFromCards++;
                }
            });
        }
        return Math.max(todayLog.cardsReviewed || 0, countFromCards);
    }, [allCards, todayLog, todayStr]);

    const kanjiReviewsToday = useMemo(() => {
        let countFromActDates = 0;
        if (Array.isArray(kanjiSrsStats?.actDates)) {
            countFromActDates = kanjiSrsStats.actDates.filter(d => d === todayStr).length;
        }
        return Math.max(todayLog.newKanjiAdded || 0, countFromActDates);
    }, [kanjiSrsStats, todayLog, todayStr]);

    const grammarReviewsToday = useMemo(() => {
        return todayLog.grammarReviewsDone || 0;
    }, [todayLog]);

    const totalReviewsToday = useMemo(() => {
        return Math.max(
            (todayLog.reviewsDone || 0) + (todayLog.cardsReviewed || 0) + (todayLog.grammarReviewsDone || 0),
            effectiveVocabReviews + kanjiReviewsToday + grammarReviewsToday
        );
    }, [todayLog, effectiveVocabReviews, kanjiReviewsToday, grammarReviewsToday]);

    const xpToday = todayLog.xpGained || 0;
    const wordsAddedToday = todayLog.newWordsAdded || 0;

    const metrics = useMemo(() => ({
        totalDue,
        totalCards: stats?.totalCards ?? 0,
        effectiveVocabReviews,
        kanjiReviewsToday,
        grammarReviewsToday,
        totalReviewsToday,
        xpToday,
        wordsAddedToday,
        kaiwaSeconds,
        jlptDoneCount
    }), [
        totalDue, stats, effectiveVocabReviews, kanjiReviewsToday,
        grammarReviewsToday, totalReviewsToday, xpToday,
        wordsAddedToday, kaiwaSeconds, jlptDoneCount
    ]);

    // Active quest instances with live calculation
    const activeQuestList = useMemo(() => {
        return questData.activeIds.map(id => {
            const def = QUEST_POOL.find(q => q.id === id);
            if (!def) return null;
            const current = Math.max(0, def.getCurrent(metrics));
            const isCompleted = current >= def.target;
            return {
                ...def,
                current,
                isCompleted
            };
        }).filter(Boolean);
    }, [questData.activeIds, metrics]);

    // Claim reward & rotate with a fresh quest from pool
    const handleClaimQuest = useCallback((quest) => {
        if (!quest || claimingId) return;
        setClaimingId(quest.id);

        // Sound & celebratory confetti effects
        try {
            playCompletionFanfare();
            playCorrectSound();
            launchConfetti(2200, 55);
        } catch (_) {}

        // Award XP directly
        if (typeof awardXP === 'function') {
            awardXP(quest.xp);
        }

        setTimeout(() => {
            setQuestData(prev => {
                const nextClaimed = [...prev.claimedIds, quest.id];
                const remainingActive = prev.activeIds.filter(id => id !== quest.id);

                // Find next quest not in active and not in claimed
                const poolCandidates = availablePool.filter(q =>
                    !remainingActive.includes(q.id) && !nextClaimed.includes(q.id)
                );
                // If pool exhausted, fallback to any available not currently active
                const fallbackCandidates = availablePool.filter(q => !remainingActive.includes(q.id));
                const pool = poolCandidates.length > 0 ? poolCandidates : fallbackCandidates;
                const nextQuest = pool[0];

                const nextActive = nextQuest ? [...remainingActive, nextQuest.id] : remainingActive;

                return {
                    activeIds: nextActive,
                    claimedIds: nextClaimed
                };
            });
            setClaimingId(null);
        }, 350);
    }, [claimingId, awardXP, availablePool]);

    const completedCount = activeQuestList.filter(q => q.isCompleted).length;
    const totalClaimedToday = questData.claimedIds.length;

    return (
        <div className="bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-xs">
            {/* Header: Title & Progress Bar */}
            <div className="flex items-center justify-between mb-3.5">
                <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                        <Target className="w-4 h-4 stroke-[2.5]" />
                    </div>
                    <div>
                        <h3 className="font-bold text-sm text-slate-900 dark:text-white leading-tight">
                            {t('home.dailyQuestsTitle', 'Nhiệm vụ hôm nay')}
                        </h3>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {totalClaimedToday > 0 && (
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300">
                            +{totalClaimedToday} xong
                        </span>
                    )}
                    <span className="text-xs font-mono font-bold text-slate-400">
                        {completedCount}/3
                    </span>
                    <div className="w-12 h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-emerald-500 transition-all duration-300"
                            style={{ width: `${(completedCount / 3) * 100}%` }}
                        />
                    </div>
                </div>
            </div>

            {/* Quests Vertical List */}
            <div className="flex flex-col gap-2">
                {activeQuestList.map(q => {
                    const Icon = q.icon;
                    const pct = Math.min(100, Math.round((q.current / q.target) * 100));
                    const isClaiming = claimingId === q.id;

                    return (
                        <div
                            key={q.id}
                            onClick={() => {
                                if (!q.isCompleted && q.route) {
                                    navigate(q.route);
                                }
                            }}
                            className={`p-2.5 rounded-2xl border transition-all duration-200 flex items-center justify-between gap-2.5 select-none ${
                                isClaiming ? 'scale-[0.98] opacity-75' : ''
                            } ${
                                q.isCompleted
                                    ? 'bg-amber-50/60 dark:bg-amber-950/20 border-amber-300 dark:border-amber-700/60 shadow-xs'
                                    : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 cursor-pointer group active:scale-[0.99]'
                            }`}
                        >
                            <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${q.color}`}>
                                    <Icon className="w-4 h-4 stroke-[2.5]" />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-1.5">
                                        <span className="text-xs font-bold leading-tight text-slate-800 dark:text-slate-200 truncate">
                                            {q.title}
                                        </span>
                                    </div>
                                    {/* Progress track */}
                                    <div className="flex items-center gap-2 mt-1">
                                        <div className="w-16 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full transition-all duration-500 rounded-full ${
                                                    q.isCompleted ? 'bg-amber-500' : 'bg-sky-500'
                                                }`}
                                                style={{ width: `${pct}%` }}
                                            />
                                        </div>
                                        <span className="text-[10px] font-mono font-bold text-slate-400">
                                            {q.formatProgress(q.current, q.target)}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Action Area: Reward Claim Button if completed, or Navigation Action if incomplete */}
                            <div className="flex items-center gap-1.5 shrink-0">
                                {q.isCompleted ? (
                                    <button
                                        type="button"
                                        disabled={isClaiming}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleClaimQuest(q);
                                        }}
                                        className="py-1 px-2.5 rounded-xl font-black text-xs uppercase tracking-wider text-white bg-amber-500 hover:bg-amber-400 border-b-2 border-amber-700 active:translate-y-0.5 active:border-b-0 transition-all flex items-center gap-1 shadow-xs cursor-pointer animate-pulse"
                                    >
                                        <Sparkles className="w-3.5 h-3.5 text-amber-100" />
                                        <span>+{q.xp} XP</span>
                                    </button>
                                ) : (
                                    <div className="flex items-center gap-1.5 text-slate-400 group-hover:text-sky-500 transition-colors pr-1">
                                        <span className="text-[11px] font-mono font-bold text-emerald-600 dark:text-emerald-400">
                                            +{q.xp} XP
                                        </span>
                                        <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default HomeDailyQuests;
