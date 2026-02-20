import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
    Target, Save, TrendingUp, Flame, BookOpen, Languages, Calendar, Clock,
    BarChart3, Trophy, Crown, Medal, Star, Sparkles, Heart, Zap, Award,
    ChevronUp, ChevronDown, Users
} from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, AreaChart, Area } from 'recharts';
import { collection, query, onSnapshot, getDocs } from 'firebase/firestore';
import { db, appId } from '../../config/firebase';
import { JLPT_LEVELS } from '../../config/constants';
import { PetCompanion, PET_STAGES, getPetStage } from '../ui/PetCompanion';

// ==================== MAIN STATS SCREEN ====================
const StatsScreen = ({ memoryStats, totalCards, profile, allCards, dailyActivityLogs, onUpdateGoal, onBack, userId, publicStatsPath, initialTab }) => {
    const { shortTerm, midTerm, longTerm, new: newCards } = memoryStats;
    const [activeTab, setActiveTab] = useState(initialTab || 'stats');
    const [vocabGoal, setVocabGoal] = useState(profile.dailyGoal || 10);
    const [kanjiGoal, setKanjiGoal] = useState(profile.dailyKanjiGoal || 10);
    const [kanjiSrsStats, setKanjiSrsStats] = useState({ total: 0, learning: 0, mastered: 0, dueToday: 0 });
    const [leaderboardTab, setLeaderboardTab] = useState('weekly'); // 'weekly' | 'alltime'
    const [leaderboardData, setLeaderboardData] = useState([]);
    const [kanjiSrsCards, setKanjiSrsCards] = useState([]);

    // Sync tab when navigating via URL
    useEffect(() => { if (initialTab) setActiveTab(initialTab); }, [initialTab]);

    // Fetch kanji SRS stats
    useEffect(() => {
        if (!userId || !db) return;
        const q = query(collection(db, `artifacts/${appId}/users/${userId}/kanjiSRS`));
        const unsub = onSnapshot(q, (snap) => {
            const now = Date.now();
            let total = 0, learning = 0, mastered = 0, dueToday = 0;
            const cards = [];
            snap.docs.forEach(d => {
                total++;
                const data = d.data();
                cards.push(data);
                if (data.reps >= 5) mastered++;
                else learning++;
                if (data.nextReview && data.nextReview <= now) dueToday++;
            });
            setKanjiSrsStats({ total, learning, mastered, dueToday });
            setKanjiSrsCards(cards);
        }, () => { });
        return () => unsub();
    }, [userId]);

    // Fetch leaderboard data
    useEffect(() => {
        if (!publicStatsPath || !db) return;
        const q = query(collection(db, publicStatsPath));
        const unsub = onSnapshot(q, (snap) => {
            const users = [];
            snap.docs.forEach(d => {
                const data = d.data();
                users.push({ id: d.id, ...data });
            });
            setLeaderboardData(users);
        }, () => { });
        return () => unsub();
    }, [publicStatsPath]);

    // ==================== STREAK CALCULATION ====================
    const streak = useMemo(() => {
        if (!dailyActivityLogs || dailyActivityLogs.length === 0) return 0;
        const todayStr = new Date().toISOString().split('T')[0];
        const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];
        const reversedLogs = [...dailyActivityLogs].reverse();
        const lastLog = reversedLogs[0];
        if (!lastLog) return 0;
        let currentStreak = 0;
        let checkDate = new Date();
        if (lastLog.id !== todayStr && lastLog.id !== yesterdayStr) return 0;
        if (lastLog.id !== todayStr) checkDate.setDate(checkDate.getDate() - 1);
        for (const log of reversedLogs) {
            const checkDateStr = checkDate.toISOString().split('T')[0];
            if (log.id === checkDateStr && (log.newWordsAdded > 0 || log.reviewsDone > 0)) {
                currentStreak++;
                checkDate.setDate(checkDate.getDate() - 1);
            } else break;
        }
        return currentStreak;
    }, [dailyActivityLogs]);

    // ==================== WEEKLY STATS ====================
    const weeklyStats = useMemo(() => {
        const today = new Date();
        const dayOfWeek = today.getDay() === 0 ? 6 : today.getDay() - 1; // Mon=0, Sun=6
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - dayOfWeek);
        weekStart.setHours(0, 0, 0, 0);

        const vocabAdded = allCards.filter(c => c.createdAt >= weekStart).length;
        const weekLogs = (dailyActivityLogs || []).filter(l => l.id >= weekStart.toISOString().split('T')[0]);
        const totalReviews = weekLogs.reduce((s, l) => s + (l.reviewsDone || 0), 0);
        const activeDays = weekLogs.filter(l => (l.newWordsAdded || 0) > 0 || (l.reviewsDone || 0) > 0).length;

        return { vocabAdded, totalReviews, activeDays };
    }, [allCards, dailyActivityLogs]);

    // Today's stats for goal tracking
    const todayStats = useMemo(() => {
        const todayStr = new Date().toISOString().split('T')[0];
        const todayLog = (dailyActivityLogs || []).find(l => l.id === todayStr);
        return {
            vocabAdded: todayLog?.newWordsAdded || 0,
            reviewsDone: todayLog?.reviewsDone || 0,
        };
    }, [dailyActivityLogs]);

    // ==================== DAILY ACTIVITY CHART ====================
    const dailyChartData = useMemo(() => {
        const days = [];
        for (let i = 13; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const dateStr = d.toISOString().split('T')[0];
            const log = dailyActivityLogs?.find(l => l.id === dateStr);
            days.push({
                date: `${d.getDate()}/${d.getMonth() + 1}`,
                words: log?.newWordsAdded || 0,
                reviews: log?.reviewsDone || 0,
            });
        }
        return days;
    }, [dailyActivityLogs]);

    // ==================== SRS BREAKDOWN ====================
    const srsBreakdown = useMemo(() => {
        if (!allCards || allCards.length === 0) return [];
        const today = new Date(); today.setHours(0, 0, 0, 0);
        const dueNow = allCards.filter(c => c.nextReview_back && c.nextReview_back <= today).length;
        const notDue = allCards.filter(c => c.nextReview_back && c.nextReview_back > today).length;
        const noSrs = allCards.filter(c => c.intervalIndex_back === -1 || c.intervalIndex_back === undefined).length;
        return [
            { name: 'Cần ôn', value: dueNow, fill: '#ef4444' },
            { name: 'Chưa đến hạn', value: notDue, fill: '#10b981' },
            { name: 'Chưa học', value: noSrs, fill: '#94a3b8' },
        ].filter(e => e.value > 0);
    }, [allCards]);

    const jlptVocabData = useMemo(() => {
        return JLPT_LEVELS.map((level, i) => ({
            name: level.label,
            vocab: allCards.filter(c => c.level === level.value).length,
            kanji: kanjiSrsCards.filter(c => c.level === level.value).length,
            vocabTarget: level.target,
            kanjiTarget: level.kanjiTarget || 0,
            fill: ['#10b981', '#0d9488', '#0ea5e9', '#8b5cf6', '#f43f5e'][i]
        }));
    }, [allCards, kanjiSrsCards]);

    const vocabMastery = useMemo(() => {
        const today = new Date(); today.setHours(0, 0, 0, 0);
        const mastered = allCards.filter(c => c.intervalIndex_back >= 4).length;
        const learning = allCards.filter(c => c.intervalIndex_back >= 0 && c.intervalIndex_back < 4).length;
        const dueToday = allCards.filter(c => c.nextReview_back && c.nextReview_back <= today).length;
        const unlearned = allCards.filter(c => c.intervalIndex_back === -1 || c.intervalIndex_back === undefined).length;
        return { mastered, learning, dueToday, unlearned, total: allCards.length };
    }, [allCards]);

    // ==================== PET SYSTEM ====================
    const petXP = useMemo(() => {
        const vocabXP = allCards.length * 2;
        const kanjiXP = kanjiSrsStats.total * 3;
        const streakXP = streak * 10;
        const masteredXP = vocabMastery.mastered * 5 + kanjiSrsStats.mastered * 8;
        return vocabXP + kanjiXP + streakXP + masteredXP;
    }, [allCards.length, kanjiSrsStats, streak, vocabMastery]);

    const petLevel = useMemo(() => Math.floor(Math.sqrt(petXP / 20)), [petXP]);
    const petStage = useMemo(() => getPetStage(petLevel), [petLevel]);
    const xpForCurrentLevel = petLevel * petLevel * 20;
    const xpForNextLevel = (petLevel + 1) * (petLevel + 1) * 20;
    const xpProgress = petXP - xpForCurrentLevel;
    const xpNeeded = xpForNextLevel - xpForCurrentLevel;
    const xpPercent = Math.min(100, Math.round((xpProgress / xpNeeded) * 100));

    // ==================== LEADERBOARD ====================
    const sortedLeaderboard = useMemo(() => {
        const sorted = [...leaderboardData].sort((a, b) => {
            if (leaderboardTab === 'weekly') {
                return (b.totalCards || 0) - (a.totalCards || 0);
            }
            const aTotal = (a.totalCards || 0) + (a.shortTerm || 0) + (a.midTerm || 0) + (a.longTerm || 0);
            const bTotal = (b.totalCards || 0) + (b.shortTerm || 0) + (b.midTerm || 0) + (b.longTerm || 0);
            return bTotal - aTotal;
        });
        return sorted;
    }, [leaderboardData, leaderboardTab]);

    const handleSaveGoal = useCallback(() => {
        onUpdateGoal({ vocabGoal: Number(vocabGoal), kanjiGoal: Number(kanjiGoal) });
    }, [vocabGoal, kanjiGoal, onUpdateGoal]);

    // ==================== ACTIVITY HEATMAP (28 DAYS) ====================
    const heatmapData = useMemo(() => {
        const days = [];
        for (let i = 27; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const dateStr = d.toISOString().split('T')[0];
            const log = dailyActivityLogs?.find(l => l.id === dateStr);
            const activity = (log?.newWordsAdded || 0) + (log?.reviewsDone || 0);
            days.push({ date: dateStr, day: d.getDate(), weekday: d.getDay(), activity });
        }
        return days;
    }, [dailyActivityLogs]);

    const getHeatmapColor = (activity) => {
        if (activity === 0) return 'bg-gray-100 dark:bg-gray-700';
        if (activity <= 3) return 'bg-emerald-200 dark:bg-emerald-800';
        if (activity <= 10) return 'bg-emerald-400 dark:bg-emerald-600';
        if (activity <= 25) return 'bg-emerald-500 dark:bg-emerald-500';
        return 'bg-emerald-600 dark:bg-emerald-400';
    };

    // ==================== PIE CHART DATA ====================
    const pieData = [
        { name: 'Mới', value: newCards, fill: '#94a3b8' },
        { name: 'Ngắn hạn', value: shortTerm, fill: '#f59e0b' },
        { name: 'Trung hạn', value: midTerm, fill: '#10b981' },
        { name: 'Dài hạn', value: longTerm, fill: '#22c55e' },
    ].filter(e => e.value > 0);

    // ==================== TAB NAVIGATION ====================
    const tabs = [
        { id: 'stats', label: 'Thống kê', icon: BarChart3 },
        { id: 'leaderboard', label: 'Xếp hạng', icon: Trophy },
        { id: 'pet', label: 'Thú cưng', icon: Heart },
    ];

    return (
        <div className="space-y-4 md:space-y-6 max-w-4xl mx-auto">
            {/* Tab Navigation */}
            <div className="flex bg-white dark:bg-gray-800 rounded-2xl p-1.5 border border-gray-200 dark:border-gray-700 shadow-sm">
                {tabs.map(tab => {
                    const Icon = tab.icon;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === tab.id
                                ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/25'
                                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                                }`}
                        >
                            <Icon className="w-4 h-4" />
                            <span className="hidden sm:inline">{tab.label}</span>
                        </button>
                    );
                })}
            </div>

            {/* ==================== TAB: STATISTICS ==================== */}
            {activeTab === 'stats' && (
                <div className="space-y-4">
                    {/* Goals Section */}
                    <div className="bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 p-5 rounded-2xl text-white shadow-xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full -mr-16 -mt-16" />
                        <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full -ml-8 -mb-8" />
                        <div className="relative">
                            <h3 className="text-base font-bold flex items-center gap-2 mb-4">
                                <Target className="w-5 h-5" /> Mục tiêu hàng ngày
                            </h3>
                            <div className="grid grid-cols-2 gap-4">
                                {/* Vocab Goal */}
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2">
                                        <BookOpen className="w-4 h-4 text-indigo-200" />
                                        <span className="text-xs text-indigo-100">Từ vựng</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <input type="number" min={1} max={100} value={vocabGoal}
                                            onChange={e => setVocabGoal(e.target.value)}
                                            className="w-16 px-2 py-1 rounded-lg text-lg font-bold text-indigo-700 bg-white/90 text-center"
                                        />
                                        <span className="text-xs opacity-80">từ/ngày</span>
                                    </div>
                                    <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                                        <div className="h-full bg-white/80 rounded-full transition-all"
                                            style={{ width: `${Math.min(100, (todayStats.vocabAdded / (vocabGoal || 1)) * 100)}%` }} />
                                    </div>
                                    <p className="text-[10px] opacity-70">{todayStats.vocabAdded}/{vocabGoal} hôm nay</p>
                                </div>
                                {/* Kanji Goal */}
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2">
                                        <Languages className="w-4 h-4 text-pink-200" />
                                        <span className="text-xs text-pink-100">Kanji</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <input type="number" min={1} max={100} value={kanjiGoal}
                                            onChange={e => setKanjiGoal(e.target.value)}
                                            className="w-16 px-2 py-1 rounded-lg text-lg font-bold text-pink-700 bg-white/90 text-center"
                                        />
                                        <span className="text-xs opacity-80">kanji/ngày</span>
                                    </div>
                                    <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                                        <div className="h-full bg-white/80 rounded-full transition-all"
                                            style={{ width: `${Math.min(100, (kanjiSrsStats.dueToday > 0 ? 50 : 0))}%` }} />
                                    </div>
                                    <p className="text-[10px] opacity-70">Cần ôn: {kanjiSrsStats.dueToday}</p>
                                </div>
                            </div>
                            <button onClick={handleSaveGoal}
                                className="mt-3 inline-flex items-center px-4 py-1.5 text-xs font-bold rounded-lg bg-white/15 hover:bg-white/25 transition-colors border border-white/20">
                                <Save className="w-3 h-3 mr-1.5" /> Lưu mục tiêu
                            </button>
                        </div>
                    </div>

                    {/* Quick Stats Row */}
                    <div className="grid grid-cols-4 gap-2">
                        <div className="bg-white dark:bg-gray-800 rounded-xl p-3 border border-gray-100 dark:border-gray-700 text-center">
                            <div className="text-2xl font-bold text-indigo-500">{totalCards}</div>
                            <div className="text-[10px] text-gray-500 dark:text-gray-400">Tổng từ vựng</div>
                        </div>
                        <div className="bg-white dark:bg-gray-800 rounded-xl p-3 border border-gray-100 dark:border-gray-700 text-center">
                            <div className="text-2xl font-bold text-emerald-500">{kanjiSrsStats.total}</div>
                            <div className="text-[10px] text-gray-500 dark:text-gray-400">Tổng Kanji</div>
                        </div>
                        <div className="bg-white dark:bg-gray-800 rounded-xl p-3 border border-gray-100 dark:border-gray-700 text-center">
                            <div className="text-2xl font-bold text-orange-500 flex items-center justify-center gap-1">
                                <Flame className="w-4 h-4" />{streak}
                            </div>
                            <div className="text-[10px] text-gray-500 dark:text-gray-400">Streak</div>
                        </div>
                        <div className="bg-white dark:bg-gray-800 rounded-xl p-3 border border-gray-100 dark:border-gray-700 text-center">
                            <div className="text-2xl font-bold text-sky-500">{weeklyStats.vocabAdded}</div>
                            <div className="text-[10px] text-gray-500 dark:text-gray-400">Tuần này</div>
                        </div>
                    </div>

                    {/* Vocab & Kanji SRS Side by Side */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {/* Vocabulary */}
                        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm">
                            <h3 className="text-sm font-bold text-gray-700 dark:text-gray-200 mb-3 flex items-center gap-2">
                                <BookOpen className="w-4 h-4 text-sky-500" /> Từ vựng SRS
                            </h3>
                            <div className="grid grid-cols-2 gap-2 mb-3">
                                <div className="text-center p-2 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">
                                    <div className="text-xl font-bold text-emerald-600">{vocabMastery.mastered}</div>
                                    <div className="text-[10px] text-gray-500">Thành thạo</div>
                                </div>
                                <div className="text-center p-2 bg-red-50 dark:bg-red-900/20 rounded-lg">
                                    <div className="text-xl font-bold text-red-500">{vocabMastery.dueToday}</div>
                                    <div className="text-[10px] text-gray-500">Cần ôn</div>
                                </div>
                                <div className="text-center p-2 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                                    <div className="text-xl font-bold text-amber-600">{vocabMastery.learning}</div>
                                    <div className="text-[10px] text-gray-500">Đang học</div>
                                </div>
                                <div className="text-center p-2 bg-cyan-50 dark:bg-cyan-900/20 rounded-lg">
                                    <div className="text-xl font-bold text-cyan-600">{vocabMastery.total}</div>
                                    <div className="text-[10px] text-gray-500">Tổng cộng</div>
                                </div>
                            </div>
                            <div className="h-2.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden flex">
                                <div className="h-full bg-emerald-500" style={{ width: `${totalCards > 0 ? (vocabMastery.mastered / totalCards * 100) : 0}%` }} />
                                <div className="h-full bg-amber-400" style={{ width: `${totalCards > 0 ? (vocabMastery.learning / totalCards * 100) : 0}%` }} />
                            </div>
                        </div>

                        {/* Kanji SRS */}
                        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm">
                            <h3 className="text-sm font-bold text-gray-700 dark:text-gray-200 mb-3 flex items-center gap-2">
                                <Languages className="w-4 h-4 text-emerald-500" /> Kanji SRS
                            </h3>
                            <div className="grid grid-cols-2 gap-2 mb-3">
                                <div className="text-center p-2 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">
                                    <div className="text-xl font-bold text-emerald-600">{kanjiSrsStats.mastered}</div>
                                    <div className="text-[10px] text-gray-500">Thành thạo</div>
                                </div>
                                <div className="text-center p-2 bg-red-50 dark:bg-red-900/20 rounded-lg">
                                    <div className="text-xl font-bold text-red-500">{kanjiSrsStats.dueToday}</div>
                                    <div className="text-[10px] text-gray-500">Cần ôn</div>
                                </div>
                                <div className="text-center p-2 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                                    <div className="text-xl font-bold text-amber-600">{kanjiSrsStats.learning}</div>
                                    <div className="text-[10px] text-gray-500">Đang học</div>
                                </div>
                                <div className="text-center p-2 bg-cyan-50 dark:bg-cyan-900/20 rounded-lg">
                                    <div className="text-xl font-bold text-cyan-600">{kanjiSrsStats.total}</div>
                                    <div className="text-[10px] text-gray-500">Tổng cộng</div>
                                </div>
                            </div>
                            <div className="h-2.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden flex">
                                <div className="h-full bg-cyan-500" style={{ width: `${kanjiSrsStats.total > 0 ? (kanjiSrsStats.mastered / kanjiSrsStats.total * 100) : 0}%` }} />
                                <div className="h-full bg-amber-400" style={{ width: `${kanjiSrsStats.total > 0 ? (kanjiSrsStats.learning / kanjiSrsStats.total * 100) : 0}%` }} />
                            </div>
                        </div>
                    </div>

                    {/* JLPT Level Chart — Vocab + Kanji combined */}
                    <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm">
                        <h3 className="text-sm font-bold text-gray-700 dark:text-gray-200 mb-3 flex items-center gap-2">
                            <Award className="w-4 h-4 text-purple-500" /> Tiến độ theo cấp độ JLPT
                        </h3>
                        <div style={{ width: '100%', height: 200 }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={jlptVocabData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb30" />
                                    <XAxis dataKey="name" tick={{ fontSize: 11, fontWeight: 'bold' }} />
                                    <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                                    <Tooltip
                                        contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb' }}
                                        content={({ active, payload }) => {
                                            if (active && payload && payload.length) {
                                                const d = payload[0].payload;
                                                return (
                                                    <div className="bg-white dark:bg-gray-800 p-2 border border-gray-200 dark:border-gray-700 shadow-lg rounded-lg text-xs">
                                                        <p className="font-bold mb-1">{d.name}</p>
                                                        <p>Từ vựng: {d.vocab}/{d.vocabTarget} ({Math.round(d.vocab / d.vocabTarget * 100)}%)</p>
                                                        <p>Kanji: {d.kanji}/{d.kanjiTarget} ({d.kanjiTarget > 0 ? Math.round(d.kanji / d.kanjiTarget * 100) : 0}%)</p>
                                                    </div>
                                                );
                                            }
                                            return null;
                                        }}
                                    />
                                    <Bar dataKey="vocab" fill="#6366f1" radius={[4, 4, 0, 0]} name="vocab" barSize={20} />
                                    <Bar dataKey="kanji" fill="#10b981" radius={[4, 4, 0, 0]} name="kanji" barSize={20} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="flex justify-center gap-4 mt-1 text-[10px] text-gray-500">
                            <span className="flex items-center gap-1"><span className="w-2 h-2 bg-indigo-500 rounded-full inline-block" />Từ vựng</span>
                            <span className="flex items-center gap-1"><span className="w-2 h-2 bg-emerald-500 rounded-full inline-block" />Kanji</span>
                        </div>
                        {/* JLPT Target Reference */}
                        <div className="mt-3 grid grid-cols-5 gap-1 text-center">
                            {jlptVocabData.map((d, i) => (
                                <div key={i} className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-1.5">
                                    <p className="text-[10px] font-bold text-gray-600 dark:text-gray-300">{d.name}</p>
                                    <p className="text-[9px] text-indigo-500">{d.vocab}/{d.vocabTarget} từ</p>
                                    <p className="text-[9px] text-emerald-500">{d.kanji}/{d.kanjiTarget} kanji</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Activity Chart */}
                    <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm">
                        <h3 className="text-sm font-bold text-gray-700 dark:text-gray-200 mb-3 flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-indigo-500" /> Hoạt động 14 ngày gần đây
                        </h3>
                        <div style={{ width: '100%', height: 180 }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={dailyChartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorWords" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                        </linearGradient>
                                        <linearGradient id="colorReviews" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb40" />
                                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#9ca3af' }} tickLine={false} axisLine={false} />
                                    <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} tickLine={false} axisLine={false} allowDecimals={false} />
                                    <Tooltip
                                        contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb', backgroundColor: '#fff' }}
                                        formatter={(value, name) => [value, name === 'words' ? 'Từ mới' : 'Ôn tập']}
                                        labelFormatter={(l) => `Ngày ${l}`}
                                    />
                                    <Area type="monotone" dataKey="words" stroke="#6366f1" fill="url(#colorWords)" strokeWidth={2} name="words" />
                                    <Area type="monotone" dataKey="reviews" stroke="#10b981" fill="url(#colorReviews)" strokeWidth={2} name="reviews" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="flex justify-center gap-4 mt-1 text-[10px] text-gray-500">
                            <span className="flex items-center gap-1"><span className="w-2 h-2 bg-indigo-500 rounded-full inline-block" />Từ mới</span>
                            <span className="flex items-center gap-1"><span className="w-2 h-2 bg-emerald-500 rounded-full inline-block" />Ôn tập</span>
                        </div>
                    </div>

                    {/* Activity Heatmap */}
                    <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm">
                        <h3 className="text-sm font-bold text-gray-700 dark:text-gray-200 mb-3 flex items-center gap-2">
                            <Flame className="w-4 h-4 text-orange-500" /> Heatmap hoạt động (28 ngày)
                        </h3>
                        <div className="grid grid-cols-7 gap-1">
                            {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map(d => (
                                <div key={d} className="text-center text-[9px] text-gray-400 font-medium mb-0.5">{d}</div>
                            ))}
                            {heatmapData.map((d, i) => (
                                <div key={i}
                                    className={`aspect-square rounded-sm ${getHeatmapColor(d.activity)} transition-colors cursor-default`}
                                    title={`${d.date}: ${d.activity} hoạt động`}
                                />
                            ))}
                        </div>
                        <div className="flex items-center gap-1 mt-2 justify-end text-[9px] text-gray-400">
                            <span>Ít</span>
                            <div className="w-3 h-3 rounded-sm bg-gray-100 dark:bg-gray-700" />
                            <div className="w-3 h-3 rounded-sm bg-emerald-200 dark:bg-emerald-800" />
                            <div className="w-3 h-3 rounded-sm bg-emerald-400 dark:bg-emerald-600" />
                            <div className="w-3 h-3 rounded-sm bg-emerald-500 dark:bg-emerald-500" />
                            <div className="w-3 h-3 rounded-sm bg-emerald-600 dark:bg-emerald-400" />
                            <span>Nhiều</span>
                        </div>
                    </div>

                    {/* Memory Pie Chart + SRS Breakdown */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm">
                            <h3 className="text-sm font-bold text-gray-700 dark:text-gray-200 mb-2">Ghi nhớ Từ vựng</h3>
                            {pieData.length > 0 ? (
                                <div style={{ width: '100%', height: 220 }}>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie data={pieData} cx="50%" cy="45%" innerRadius={50} outerRadius={75} paddingAngle={5} dataKey="value">
                                                {pieData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.fill} />
                                                ))}
                                            </Pie>
                                            <Tooltip />
                                            <Legend verticalAlign="bottom" wrapperStyle={{ fontSize: '11px' }} iconSize={10} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                            ) : (
                                <div className="h-[220px] flex items-center justify-center text-gray-400 text-sm">Chưa có dữ liệu</div>
                            )}
                        </div>

                        {/* SRS Status */}
                        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm">
                            <h3 className="text-sm font-bold text-gray-700 dark:text-gray-200 mb-3 flex items-center gap-2">
                                <Clock className="w-4 h-4 text-red-500" /> Trạng thái SRS
                            </h3>
                            <div className="grid grid-cols-3 gap-2">
                                {srsBreakdown.map((item, i) => (
                                    <div key={i} className="text-center p-3 rounded-lg" style={{ backgroundColor: item.fill + '15' }}>
                                        <div className="text-2xl font-bold" style={{ color: item.fill }}>{item.value}</div>
                                        <div className="text-[10px] text-gray-500 mt-0.5">{item.name}</div>
                                    </div>
                                ))}
                            </div>
                            {srsBreakdown.length > 0 && (
                                <div className="mt-3 h-3 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden flex">
                                    {srsBreakdown.map((item, i) => (
                                        <div key={i} className="h-full" style={{ width: `${totalCards > 0 ? (item.value / totalCards * 100) : 0}%`, backgroundColor: item.fill }} />
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )
            }

            {/* ==================== TAB: LEADERBOARD ==================== */}
            {
                activeTab === 'leaderboard' && (
                    <div className="space-y-4">
                        {/* Leaderboard Type Toggle */}
                        <div className="flex bg-gray-100 dark:bg-gray-800 rounded-xl p-1">
                            <button onClick={() => setLeaderboardTab('weekly')}
                                className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-1.5 ${leaderboardTab === 'weekly' ? 'bg-white dark:bg-gray-700 text-orange-500 shadow-sm' : 'text-gray-500'}`}>
                                <Zap className="w-4 h-4" /> Tuần này
                            </button>
                            <button onClick={() => setLeaderboardTab('alltime')}
                                className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-1.5 ${leaderboardTab === 'alltime' ? 'bg-white dark:bg-gray-700 text-purple-500 shadow-sm' : 'text-gray-500'}`}>
                                <Crown className="w-4 h-4" /> Tổng
                            </button>
                        </div>

                        {/* My Stats Card */}
                        <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-4 rounded-2xl text-white shadow-xl">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center text-lg font-bold">
                                    {(profile.displayName || 'U')[0].toUpperCase()}
                                </div>
                                <div>
                                    <p className="font-bold text-sm">{profile.displayName || 'Bạn'}</p>
                                    <p className="text-[10px] text-indigo-200">Thống kê của bạn</p>
                                </div>
                            </div>
                            <div className="grid grid-cols-4 gap-2">
                                {leaderboardTab === 'weekly' ? (
                                    <>
                                        <div className="text-center p-2 bg-white/10 rounded-lg">
                                            <div className="text-lg font-bold">{weeklyStats.vocabAdded}</div>
                                            <div className="text-[9px] opacity-70">Từ mới</div>
                                        </div>
                                        <div className="text-center p-2 bg-white/10 rounded-lg">
                                            <div className="text-lg font-bold">{weeklyStats.totalReviews}</div>
                                            <div className="text-[9px] opacity-70">Ôn tập</div>
                                        </div>
                                        <div className="text-center p-2 bg-white/10 rounded-lg">
                                            <div className="text-lg font-bold">{weeklyStats.activeDays}</div>
                                            <div className="text-[9px] opacity-70">Ngày HĐ</div>
                                        </div>
                                        <div className="text-center p-2 bg-white/10 rounded-lg">
                                            <div className="text-lg font-bold flex items-center justify-center gap-0.5"><Flame className="w-3 h-3" />{streak}</div>
                                            <div className="text-[9px] opacity-70">Streak</div>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div className="text-center p-2 bg-white/10 rounded-lg">
                                            <div className="text-lg font-bold">{totalCards}</div>
                                            <div className="text-[9px] opacity-70">Từ vựng</div>
                                        </div>
                                        <div className="text-center p-2 bg-white/10 rounded-lg">
                                            <div className="text-lg font-bold">{kanjiSrsStats.total}</div>
                                            <div className="text-[9px] opacity-70">Kanji</div>
                                        </div>
                                        <div className="text-center p-2 bg-white/10 rounded-lg">
                                            <div className="text-lg font-bold">{vocabMastery.mastered}</div>
                                            <div className="text-[9px] opacity-70">Thành thạo</div>
                                        </div>
                                        <div className="text-center p-2 bg-white/10 rounded-lg">
                                            <div className="text-lg font-bold flex items-center justify-center gap-0.5"><Flame className="w-3 h-3" />{streak}</div>
                                            <div className="text-[9px] opacity-70">Streak</div>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Leaderboard List */}
                        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
                            <div className="p-4 border-b border-gray-100 dark:border-gray-700">
                                <h3 className="font-bold text-gray-700 dark:text-gray-200 flex items-center gap-2 text-sm">
                                    <Users className="w-4 h-4 text-indigo-500" />
                                    Bảng xếp hạng {leaderboardTab === 'weekly' ? 'tuần' : 'tổng'}
                                </h3>
                            </div>
                            <div className="divide-y divide-gray-50 dark:divide-gray-700/50">
                                {sortedLeaderboard.length > 0 ? sortedLeaderboard.map((user, index) => {
                                    const isMe = user.id === userId;
                                    const rankBg = index === 0 ? 'bg-gradient-to-r from-yellow-50 to-amber-50 dark:from-yellow-900/20 dark:to-amber-900/20'
                                        : index === 1 ? 'bg-gradient-to-r from-gray-50 to-slate-50 dark:from-gray-800/50 dark:to-slate-800/50'
                                            : index === 2 ? 'bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/10'
                                                : '';
                                    const rankIcon = index === 0 ? <Crown className="w-5 h-5 text-yellow-500" />
                                        : index === 1 ? <Medal className="w-5 h-5 text-gray-400" />
                                            : index === 2 ? <Medal className="w-5 h-5 text-orange-400" />
                                                : <span className="text-sm font-bold text-gray-400 w-5 text-center">{index + 1}</span>;

                                    return (
                                        <div key={user.id} className={`flex items-center gap-3 p-3 ${rankBg} ${isMe ? 'ring-2 ring-indigo-400 ring-inset' : ''}`}>
                                            <div className="flex-shrink-0">{rankIcon}</div>
                                            <div className="w-8 h-8 bg-gradient-to-br from-indigo-400 to-purple-500 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                                                {(user.displayName || 'U')[0].toUpperCase()}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className={`text-sm font-bold truncate ${isMe ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-700 dark:text-gray-300'}`}>
                                                    {user.displayName || 'Ẩn danh'} {isMe && '(Bạn)'}
                                                </p>
                                                <p className="text-[10px] text-gray-400">
                                                    {user.totalCards || 0} từ · {(user.shortTerm || 0) + (user.midTerm || 0) + (user.longTerm || 0)} đã học
                                                </p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-sm font-bold text-gray-700 dark:text-gray-300">{user.totalCards || 0}</p>
                                                <p className="text-[9px] text-gray-400">từ vựng</p>
                                            </div>
                                        </div>
                                    );
                                }) : (
                                    <div className="p-8 text-center text-gray-400 text-sm">
                                        <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                        Chưa có dữ liệu xếp hạng
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )
            }

            {/* ==================== TAB: PET COMPANION ==================== */}
            {
                activeTab === 'pet' && (
                    <div className="space-y-4">
                        {/* Live Pet Habitat */}
                        <PetCompanion
                            petLevel={petLevel}
                            streak={streak}
                            petXP={petXP}
                            xpPercent={xpPercent}
                            xpProgress={xpProgress}
                            xpNeeded={xpNeeded}
                        />

                        {/* Pet Stats */}
                        <div className="grid grid-cols-4 gap-2">
                            {[
                                { icon: '⚡', val: petXP, label: 'Tổng XP', color: 'text-indigo-600' },
                                { icon: '🎯', val: `Lv.${petLevel}`, label: 'Cấp', color: 'text-purple-600' },
                                { icon: '🔥', val: streak, label: 'Streak', color: 'text-orange-600' },
                                { icon: '📚', val: totalCards, label: 'Từ vựng', color: 'text-sky-600' },
                            ].map((s, i) => (
                                <div key={i} className="bg-white dark:bg-gray-800 p-3 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm text-center">
                                    <div className="text-xl mb-0.5">{s.icon}</div>
                                    <div className={`text-sm font-bold ${s.color}`}>{s.val}</div>
                                    <div className="text-[9px] text-gray-500">{s.label}</div>
                                </div>
                            ))}
                        </div>

                        {/* XP Breakdown */}
                        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm">
                            <h3 className="text-sm font-bold text-gray-700 dark:text-gray-200 mb-3 flex items-center gap-2">
                                <Sparkles className="w-4 h-4 text-yellow-500" /> Nguồn XP
                            </h3>
                            <div className="space-y-2">
                                {[
                                    { label: 'Từ vựng', value: allCards.length * 2, icon: '📚', color: 'bg-indigo-500' },
                                    { label: 'Kanji', value: kanjiSrsStats.total * 3, icon: '🈁', color: 'bg-emerald-500' },
                                    { label: 'Streak', value: streak * 10, icon: '🔥', color: 'bg-orange-500' },
                                    { label: 'Thành thạo', value: vocabMastery.mastered * 5 + kanjiSrsStats.mastered * 8, icon: '⭐', color: 'bg-yellow-500' },
                                ].map((source, i) => (
                                    <div key={i} className="flex items-center gap-3">
                                        <span className="text-lg">{source.icon}</span>
                                        <div className="flex-1">
                                            <div className="flex justify-between text-xs mb-0.5">
                                                <span className="text-gray-600 dark:text-gray-400">{source.label}</span>
                                                <span className="font-bold text-gray-700 dark:text-gray-300">+{source.value} XP</span>
                                            </div>
                                            <div className="h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                                                <div className={`h-full ${source.color} rounded-full transition-all`}
                                                    style={{ width: `${petXP > 0 ? Math.min(100, (source.value / petXP) * 100) : 0}%` }} />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Evolution Timeline */}
                        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm">
                            <h3 className="text-sm font-bold text-gray-700 dark:text-gray-200 mb-3 flex items-center gap-2">
                                <TrendingUp className="w-4 h-4 text-indigo-500" /> Lộ trình tiến hóa
                            </h3>
                            <div className="space-y-2">
                                {PET_STAGES.map((stage, i) => {
                                    const isUnlocked = petLevel >= stage.minLevel;
                                    const isCurrent = petStage.name === stage.name;
                                    return (
                                        <div key={i} className={`flex items-center gap-3 p-2.5 rounded-xl transition-all ${isCurrent
                                            ? 'bg-indigo-50 dark:bg-indigo-900/20 border-2 border-indigo-300 dark:border-indigo-700'
                                            : isUnlocked ? 'bg-gray-50 dark:bg-gray-700/50 opacity-70' : 'opacity-30'
                                            }`}>
                                            <img src={stage.image} alt={stage.name}
                                                className={`w-8 h-8 rounded-full object-cover border-2 ${isUnlocked ? 'border-indigo-400' : 'border-gray-300 dark:border-gray-600'}`}
                                                style={{ filter: isUnlocked ? 'none' : 'grayscale(100%) opacity(0.4)' }}
                                            />
                                            <div className="flex-1">
                                                <p className={`text-xs font-bold ${isCurrent ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-700 dark:text-gray-300'}`}>
                                                    {stage.name} {isCurrent && '← Hiện tại'}
                                                </p>
                                                <p className="text-[10px] text-gray-400">Level {stage.minLevel}+</p>
                                            </div>
                                            {isUnlocked ? (
                                                <span className="text-emerald-500 text-xs font-bold">✓</span>
                                            ) : (
                                                <span className="text-gray-300 text-xs">🔒</span>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Tips */}
                        <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-xl border border-amber-200 dark:border-amber-800">
                            <h4 className="text-sm font-bold text-amber-700 dark:text-amber-300 mb-2 flex items-center gap-2">
                                <Zap className="w-4 h-4" /> Mẹo tăng XP nhanh
                            </h4>
                            <ul className="text-xs text-amber-600 dark:text-amber-400 space-y-1">
                                <li>🔥 Duy trì streak hàng ngày: +10 XP/ngày streak</li>
                                <li>📚 Thêm từ vựng mới: +2 XP/từ</li>
                                <li>🈁 Học Kanji: +3 XP/kanji</li>
                                <li>⭐ Thành thạo từ vựng: +5 XP/từ</li>
                                <li>🏆 Thành thạo Kanji: +8 XP/kanji</li>
                            </ul>
                        </div>
                    </div>
                )
            }
        </div >
    );
};

export default StatsScreen;
