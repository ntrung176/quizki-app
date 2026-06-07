import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Trophy, Crown, Medal, Star, Flame, BookOpen, Languages, Search, Users, Sparkles } from 'lucide-react'
import { collection, query, onSnapshot } from 'firebase/firestore';
import { auth, db, appId } from '../../config/firebase';
import LoadingIndicator from '../ui/LoadingIndicator';

// Avatar emoji lookup
const AVATAR_EMOJIS = {
    fox: '🦊', cat: '🐱', dog: '🐶', rabbit: '🐰', bear: '🐻', panda: '🐼', koala: '🐨', tiger: '🐯', lion: '🦁', cow: '🐮',
    pig: '🐷', mouse: '🐭', hamster: '🐹', penguin: '🐧', chicken: '🐔', duck: '🦆', owl: '🦉', eagle: '🦅', parrot: '🦜', flamingo: '🦩',
    frog: '🐸', turtle: '🐢', snake: '🐍', dragon: '🐉', whale: '🐳', dolphin: '🐬', octopus: '🐙', fish: '🐠', shark: '🦈', butterfly: '🦋',
    bee: '🐝', ladybug: '🐞', snail: '🐌', monkey: '🐵', gorilla: '🦍', horse: '🐴', unicorn: '🦄', zebra: '🦓', giraffe: '🦒', elephant: '🐘',
    rhino: '🦏', hippo: '🦛', camel: '🐫', deer: '🦌', wolf: '🐺', bat: '🦇', raccoon: '🦝', sloth: '🦥', hedgehog: '🦔', shrimp: '🦐',
};
const getAvatarEmoji = (id) => AVATAR_EMOJIS[id] || null;

// Helpers cho custom photo avatar
const isCustomPhoto = (avatarValue) => typeof avatarValue === 'string' && avatarValue.startsWith('data:image/');
const isPhotoUrl = (avatarValue) => typeof avatarValue === 'string' && (avatarValue.startsWith('data:image/') || avatarValue.startsWith('http://') || avatarValue.startsWith('https://'));

const getAvatarDisplayNode = (avatarValue, textFallback = 'U', isMe = false) => {
    let resolvedAvatar = avatarValue;
    if ((!resolvedAvatar || resolvedAvatar === 'default') && isMe && auth?.currentUser?.photoURL) {
        resolvedAvatar = auth.currentUser.photoURL;
    }

    if (isPhotoUrl(resolvedAvatar)) {
        return <img src={resolvedAvatar} alt="avatar" className="w-full h-full object-cover" />;
    }
    const emoji = (resolvedAvatar && resolvedAvatar !== 'default') ? getAvatarEmoji(resolvedAvatar) : null;
    if (emoji) return <span>{emoji}</span>;
    return <span>{(textFallback || 'U')[0].toUpperCase()}</span>;
};

// Helper định dạng thời gian hoạt động cuối
const formatLastActive = (lastUpdated) => {
    if (!lastUpdated) return 'Không rõ';
    const date = lastUpdated.toDate ? lastUpdated.toDate() : new Date(lastUpdated);
    const diffMs = Date.now() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 60) return `${Math.max(1, diffMins)} phút trước`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} giờ trước`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 0) return 'Hôm nay';
    if (diffDays === 1) return 'Hôm qua';
    return `${diffDays} ngày trước`;
};

// ==================== MAIN HONOR ROLL / LEADERBOARD SCREEN ====================
const StatsScreen = ({ totalCards, profile, allCards, dailyActivityLogs, userId, publicStatsPath }) => {
    const [kanjiSrsStats, setKanjiSrsStats] = useState({ total: 0, learning: 0, mastered: 0, dueToday: 0 });
    const [leaderboardData, setLeaderboardData] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [sortBy, setSortBy] = useState('score'); // 'score' | 'vocab' | 'kanji' | 'streak'
    const [displayCount, setDisplayCount] = useState(15);
    const [expandedUser, setExpandedUser] = useState(null);
    const [loading, setLoading] = useState(true);

    // Fetch kanji SRS stats
    useEffect(() => {
        if (!userId || !db) return;
        const q = query(collection(db, `artifacts/${appId}/users/${userId}/kanjiSRS`));
        const unsub = onSnapshot(q, (snap) => {
            let total = 0, learning = 0, mastered = 0, dueToday = 0;
            const now = Date.now();
            snap.docs.forEach(d => {
                total++;
                const data = d.data();
                if (data.reps >= 5) mastered++;
                else learning++;
                if (data.nextReview && data.nextReview <= now) dueToday++;
            });
            setKanjiSrsStats({ total, learning, mastered, dueToday });
        }, () => { });
        return () => unsub();
    }, [userId]);

    // Fetch leaderboard data
    useEffect(() => {
        if (!publicStatsPath || !db) {
            setLoading(false);
            return;
        }
        const q = query(collection(db, publicStatsPath));
        const unsub = onSnapshot(q, (snap) => {
            const users = [];
            snap.docs.forEach(d => {
                const data = d.data();
                users.push({ id: d.id, ...data });
            });
            setLeaderboardData(users);
            setLoading(false);
        }, (err) => {
            console.error(err);
            setLoading(false);
        });
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

    const vocabMastery = useMemo(() => {
        const mastered = allCards.filter(c => c.intervalIndex_back >= 4).length;
        return { mastered };
    }, [allCards]);

    // ==================== LEADERBOARD SCORE CALCULATION ====================
    const computeScore = useCallback((user) => {
        if (user.score !== undefined && user.score !== null) return user.score;
        // Fallback locally
        const added7 = user.addedLast7Days !== undefined ? user.addedLast7Days : Math.min(user.totalCards || 0, 5);
        const reviews7 = user.reviewsLast7Days !== undefined ? user.reviewsLast7Days : Math.min(user.totalReviews || 0, 20);
        const activeDays7 = user.activeDaysLast7Days !== undefined ? user.activeDaysLast7Days : Math.min(user.activeDays || 0, 2);
        return Math.round(
            (added7 * 15) +
            (reviews7 * 2) +
            (activeDays7 * 50) +
            ((user.streak || 0) * 20)
        );
    }, []);

    // Current user's calculated score
    const myScore = useMemo(() => {
        const me = leaderboardData.find(u => u.id === userId);
        if (me) return computeScore(me);

        // Fallback to local log-based calculation
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const last7DaysLogs = (dailyActivityLogs || []).filter(log => {
            try {
                const logDate = new Date(log.id);
                logDate.setHours(0, 0, 0, 0);
                const diffTime = today.getTime() - logDate.getTime();
                const diffDays = diffTime / (1000 * 60 * 60 * 24);
                return diffDays >= 0 && diffDays < 7;
            } catch (e) {
                return false;
            }
        });

        const addedLast7Days = last7DaysLogs.reduce((s, l) => s + (l.newWordsAdded || 0), 0);
        const reviewsLast7Days = last7DaysLogs.reduce((s, l) => s + (l.reviewsDone || 0), 0);
        const activeDaysLast7Days = last7DaysLogs.filter(l => (l.newWordsAdded || 0) > 0 || (l.reviewsDone || 0) > 0).length;

        return Math.round(
            (addedLast7Days * 15) +
            (reviewsLast7Days * 2) +
            (activeDaysLast7Days * 50) +
            (streak * 20)
        );
    }, [leaderboardData, userId, dailyActivityLogs, streak, computeScore]);

    // Sort & search leaderboard data
    const sortedLeaderboard = useMemo(() => {
        let list = leaderboardData.map(u => ({
            ...u,
            computedScore: computeScore(u)
        }));

        // Lọc bỏ những người không hoạt động quá 7 ngày
        const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
        list = list.filter(u => {
            if (!u.lastUpdated) return false;
            const lastActiveDate = u.lastUpdated.toDate ? u.lastUpdated.toDate() : new Date(u.lastUpdated);
            return lastActiveDate.getTime() >= sevenDaysAgo;
        });

        // Filter by search term
        if (searchTerm.trim()) {
            const term = searchTerm.toLowerCase();
            list = list.filter(u => (u.displayName || '').toLowerCase().includes(term));
        }

        // Sort dynamically based on user selection
        list.sort((a, b) => {
            if (sortBy === 'vocab') {
                return (b.totalCards || 0) - (a.totalCards || 0);
            }
            if (sortBy === 'kanji') {
                return (b.kanjiTotal || 0) - (a.kanjiTotal || 0);
            }
            if (sortBy === 'streak') {
                return (b.streak || 0) - (a.streak || 0);
            }
            return b.computedScore - a.computedScore; // default: score
        });

        return list;
    }, [leaderboardData, searchTerm, sortBy, computeScore]);

    // Find current user's rank
    const myRankInfo = useMemo(() => {
        const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
        const activeUsers = leaderboardData.filter(u => {
            if (!u.lastUpdated) return false;
            const lastActiveDate = u.lastUpdated.toDate ? u.lastUpdated.toDate() : new Date(u.lastUpdated);
            return lastActiveDate.getTime() >= sevenDaysAgo;
        });

        const fullSorted = activeUsers
            .map(u => ({ ...u, computedScore: computeScore(u) }))
            .sort((a, b) => {
                if (sortBy === 'vocab') return (b.totalCards || 0) - (a.totalCards || 0);
                if (sortBy === 'kanji') return (b.kanjiTotal || 0) - (a.kanjiTotal || 0);
                if (sortBy === 'streak') return (b.streak || 0) - (a.streak || 0);
                return b.computedScore - a.computedScore;
            });

        const index = fullSorted.findIndex(u => u.id === userId);
        return {
            rank: index !== -1 ? index + 1 : fullSorted.length + 1,
            total: fullSorted.length
        };
    }, [leaderboardData, userId, sortBy, computeScore]);

    // Top 3 Podium
    const podiumList = useMemo(() => {
        if (searchTerm.trim()) return [];
        return sortedLeaderboard.slice(0, 3);
    }, [sortedLeaderboard, searchTerm]);

    // Remaining list
    const remainingList = useMemo(() => {
        if (searchTerm.trim()) return sortedLeaderboard;
        return sortedLeaderboard.slice(3);
    }, [sortedLeaderboard, searchTerm]);

    const handleToggleExpandUser = (id) => {
        setExpandedUser(prev => prev === id ? null : id);
    };

    const renderUserRow = (user, index, rank) => {
        const isMe = user.id === userId;
        const isExpanded = expandedUser === user.id;

        const rankBg = rank === 1 ? 'bg-gradient-to-r from-yellow-50/50 to-amber-50/20 dark:from-yellow-950/10 dark:to-transparent'
            : rank === 2 ? 'bg-gradient-to-r from-gray-50/50 to-slate-50/20 dark:from-gray-800/10 dark:to-transparent'
                : rank === 3 ? 'bg-gradient-to-r from-orange-50/50 to-amber-50/10 dark:from-orange-950/10 dark:to-transparent'
                    : '';

        const rankIcon = rank === 1 ? <Crown className="w-5 h-5 text-yellow-500 fill-yellow-100 dark:fill-yellow-900/30" />
            : rank === 2 ? <Medal className="w-5 h-5 text-slate-400 fill-slate-100 dark:fill-slate-800" />
                : rank === 3 ? <Medal className="w-5 h-5 text-amber-600 fill-amber-100 dark:fill-amber-900/30" />
                    : <span className="text-xs font-bold text-gray-400 dark:text-gray-500 w-5 text-center">{rank}</span>;

        const scoreToShow = sortBy === 'vocab' ? `${user.totalCards || 0} từ`
            : sortBy === 'kanji' ? `${user.kanjiTotal || 0} kanji`
                : sortBy === 'streak' ? `${user.streak || 0} ngày`
                    : `${user.computedScore} điểm`;

        const scoreIcon = sortBy === 'vocab' ? <BookOpen className="w-3.5 h-3.5 text-indigo-500" />
            : sortBy === 'kanji' ? <Languages className="w-3.5 h-3.5 text-emerald-500" />
                : sortBy === 'streak' ? <Flame className="w-3.5 h-3.5 text-orange-500 fill-orange-400" />
                    : <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-400" />;

        return (
            <div 
                key={user.id} 
                className={`transition-all duration-300 ${rankBg} ${isMe ? 'ring-2 ring-indigo-400 ring-inset dark:ring-indigo-500' : ''}`}
            >
                {/* Main Row Content */}
                <div 
                    onClick={() => handleToggleExpandUser(user.id)}
                    className="flex items-center gap-3 p-3.5 cursor-pointer hover:bg-gray-50/50 dark:hover:bg-gray-700/20 transition-all"
                >
                    <div className="flex-shrink-0 w-6 flex justify-center">{rankIcon}</div>

                    <div className={`w-9 h-9 rounded-full overflow-hidden flex items-center justify-center flex-shrink-0 border border-gray-100 dark:border-gray-700 ${isCustomPhoto(user.avatar) ? '' : 'bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900/40 dark:to-purple-900/40 text-lg font-bold'}`}>
                        {getAvatarDisplayNode(user.avatar, user.displayName || 'U', isMe)}
                    </div>

                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                            <p className={`text-sm font-bold truncate ${isMe ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-700 dark:text-gray-200'}`}>
                                {user.displayName || 'Ẩn danh'}
                            </p>
                            {(user.isPremium || user.isPremiumUnlocked) && (
                                <span className="bg-gradient-to-r from-amber-500 to-yellow-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-md uppercase tracking-wider flex items-center gap-0.5 shadow-sm">
                                    <Crown className="w-2.5 h-2.5 fill-white text-white" />
                                    PREMIUM
                                </span>
                            )}
                            {isMe && (
                                <span className="bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 text-[9px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-wider">
                                    Bạn
                                </span>
                            )}
                        </div>

                        <div className="flex items-center gap-2 text-[10px] text-gray-400 dark:text-gray-500 font-medium mt-0.5">
                            <span>{user.totalCards || 0} từ</span>
                            <span>·</span>
                            <span>{user.kanjiTotal || 0} kanji</span>
                            <span>·</span>
                            <span className="flex items-center gap-0.5">
                                <Flame className="w-3 h-3 text-orange-400" />
                                {user.streak || 0}
                            </span>
                        </div>
                    </div>

                    <div className="text-right flex-shrink-0">
                        <p className="text-sm font-bold text-gray-800 dark:text-white flex items-center gap-1 justify-end">
                            {scoreIcon}
                            {scoreToShow}
                        </p>
                        <p className="text-[9px] text-gray-400 dark:text-gray-500 font-medium uppercase tracking-wider">
                            {sortBy === 'score' ? 'tổng điểm' : sortBy === 'vocab' ? 'từ vựng' : sortBy === 'kanji' ? 'chữ Hán' : 'kỷ lục'}
                        </p>
                    </div>
                </div>

                {/* Expanded Details Panel */}
                {isExpanded && (
                    <div className="px-5 pb-5 pt-3 bg-slate-50/80 dark:bg-slate-800/80 border-t border-gray-150 dark:border-slate-700/40 text-xs text-gray-500 dark:text-gray-400 animate-fade-in space-y-4">
                        {/* Cumulative Section */}
                        <div>
                            <span className="text-[10px] font-extrabold text-indigo-500 uppercase tracking-widest block mb-2">Thống kê tích lũy</span>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                <div className="p-2.5 bg-white dark:bg-slate-850 rounded-xl border border-slate-100 dark:border-slate-850/60 shadow-sm">
                                    <span className="text-[10px] font-bold text-gray-400 block mb-1">Tổng từ vựng:</span>
                                    <span className="text-sm font-black text-slate-700 dark:text-gray-200">{user.totalCards || 0}</span> từ ({user.mastered || 0} thuộc)
                                </div>
                                <div className="p-2.5 bg-white dark:bg-slate-850 rounded-xl border border-slate-100 dark:border-slate-850/60 shadow-sm">
                                    <span className="text-[10px] font-bold text-gray-400 block mb-1">Tổng chữ Hán:</span>
                                    <span className="text-sm font-black text-slate-700 dark:text-gray-200">{user.kanjiTotal || 0}</span> tự ({user.kanjiMastered || 0} thuộc)
                                </div>
                                <div className="p-2.5 bg-white dark:bg-slate-850 rounded-xl border border-slate-100 dark:border-slate-850/60 shadow-sm">
                                    <span className="text-[10px] font-bold text-gray-400 block mb-1">Chuỗi ngày (Streak):</span>
                                    <span className="text-sm font-black text-orange-500 flex items-center gap-0.5">
                                        <Flame className="w-4 h-4 fill-orange-500" /> {user.streak || 0} ngày
                                    </span>
                                </div>
                                <div className="p-2.5 bg-white dark:bg-slate-850 rounded-xl border border-slate-100 dark:border-slate-850/60 shadow-sm">
                                    <span className="text-[10px] font-bold text-gray-400 block mb-1">Hoạt động cuối:</span>
                                    <span className="text-sm font-black text-slate-700 dark:text-gray-200">{formatLastActive(user.lastUpdated)}</span>
                                </div>
                            </div>
                        </div>

                        {/* Weekly Section */}
                        <div>
                            <span className="text-[10px] font-extrabold text-emerald-500 uppercase tracking-widest block mb-2">Hoạt động tuần này (7 ngày qua)</span>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                <div className="p-2.5 bg-white dark:bg-slate-850 rounded-xl border border-slate-100 dark:border-slate-850/60 shadow-sm">
                                    <span className="text-[10px] font-bold text-gray-400 block mb-1">Từ học mới:</span>
                                    <span className="text-sm font-black text-emerald-600 dark:text-emerald-450">+{user.addedLast7Days || 0}</span> từ vựng
                                </div>
                                <div className="p-2.5 bg-white dark:bg-slate-850 rounded-xl border border-slate-100 dark:border-slate-850/60 shadow-sm">
                                    <span className="text-[10px] font-bold text-gray-400 block mb-1">Tổng lượt ôn tập:</span>
                                    <span className="text-sm font-black text-emerald-600 dark:text-emerald-450">+{user.reviewsLast7Days || 0}</span> lượt
                                </div>
                                <div className="p-2.5 bg-white dark:bg-slate-850 rounded-xl border border-slate-100 dark:border-slate-850/60 shadow-sm">
                                    <span className="text-[10px] font-bold text-gray-400 block mb-1">Số ngày học:</span>
                                    <span className="text-sm font-black text-emerald-600 dark:text-emerald-450">{user.activeDaysLast7Days || 0}</span> / 7 ngày
                                </div>
                                <div className="p-2.5 bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-950/20 dark:to-purple-950/20 rounded-xl border border-indigo-100/50 dark:border-indigo-950/50 shadow-sm flex flex-col justify-center">
                                    <span className="text-[10px] font-bold text-indigo-500 dark:text-indigo-400 block mb-0.5">Điểm vinh danh:</span>
                                    <span className="text-sm font-black text-indigo-600 dark:text-indigo-400 flex items-center gap-0.5">
                                        <Star className="w-4 h-4 fill-indigo-500 text-indigo-500 dark:fill-indigo-400 dark:text-indigo-400" /> {user.computedScore} điểm
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    };

    if (loading) {
        return <LoadingIndicator text="Đang tải bảng vinh danh..." />;
    }

    return (
        <div className="space-y-6 max-w-4xl mx-auto pb-24 animate-fade-in">
            {/* Purple Header Stats Card */}
            <div className="bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] p-6 rounded-3xl text-white shadow-xl">
                <div className="flex items-center gap-4 mb-5">
                    <div className={`w-14 h-14 overflow-hidden rounded-full flex items-center justify-center flex-shrink-0 bg-white/20 border-2 border-white/40 shadow-inner text-2xl`}>
                        {getAvatarDisplayNode(profile.avatar, profile.displayName || 'U', true)}
                    </div>
                    <div>
                        <h2 className="text-xl font-bold tracking-tight">{profile.displayName || 'Bạn'}</h2>
                        <p className="text-xs text-indigo-100/80 font-medium">Thống kê của bạn</p>
                    </div>
                </div>

                <div className="grid grid-cols-5 gap-3 bg-white/10 p-3 rounded-2xl border border-white/10">
                    <div className="text-center">
                        <div className="text-xl md:text-2xl font-bold">{totalCards}</div>
                        <div className="text-[10px] md:text-xs text-indigo-100 font-medium opacity-90 mt-1">Từ vựng</div>
                    </div>
                    <div className="text-center">
                        <div className="text-xl md:text-2xl font-bold">{kanjiSrsStats.total}</div>
                        <div className="text-[10px] md:text-xs text-indigo-100 font-medium opacity-90 mt-1">Kanji</div>
                    </div>
                    <div className="text-center">
                        <div className="text-xl md:text-2xl font-bold">{vocabMastery.mastered}</div>
                        <div className="text-[10px] md:text-xs text-indigo-100 font-medium opacity-90 mt-1">Thành thạo</div>
                    </div>
                    <div className="text-center">
                        <div className="text-xl md:text-2xl font-bold flex items-center justify-center gap-0.5">
                            <Flame className="w-4 h-4 fill-orange-400 text-orange-400" />
                            {streak}
                        </div>
                        <div className="text-[10px] md:text-xs text-indigo-100 font-medium opacity-90 mt-1">Chuỗi ngày</div>
                    </div>
                    <div className="text-center border-l border-white/20 pl-2">
                        <div className="text-xl md:text-2xl font-bold flex items-center justify-center gap-0.5 text-yellow-300">
                            <Star className="w-4 h-4 fill-yellow-300 text-yellow-300" />
                            {myScore}
                        </div>
                        <div className="text-[10px] md:text-xs text-indigo-100 font-medium opacity-90 mt-1">Điểm</div>
                    </div>
                </div>
            </div>

            {/* Top 3 Podium Displays */}
            {!searchTerm.trim() && podiumList.length > 0 && (
                <div className="grid grid-cols-3 gap-3 pt-6 items-end max-w-xl mx-auto mb-6">
                    {/* 2nd Place (Silver) */}
                    {podiumList[1] && (
                        <div className="flex flex-col items-center group cursor-pointer" onClick={() => handleToggleExpandUser(podiumList[1].id)}>
                            <div className="relative mb-2">
                                <div className="w-16 h-16 rounded-full border-4 border-slate-300 overflow-hidden bg-white shadow-lg group-hover:scale-105 transition-all duration-300">
                                    <div className="w-full h-full flex items-center justify-center text-xl bg-slate-100 dark:bg-slate-800">
                                        {getAvatarDisplayNode(podiumList[1].avatar, podiumList[1].displayName)}
                                    </div>
                                </div>
                                <div className="absolute -top-3 -right-2 bg-slate-300 text-slate-800 rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold border-2 border-white shadow">
                                    2
                                </div>
                            </div>
                            <div className="text-center bg-white dark:bg-gray-800 rounded-2xl p-3 border border-slate-200 dark:border-gray-700 w-full shadow-md group-hover:shadow-lg transition-all duration-300">
                                <div className="flex flex-col items-center gap-0.5 justify-center mb-1">
                                    <p className="font-bold text-xs truncate text-gray-700 dark:text-gray-200 max-w-full">{podiumList[1].displayName || 'Ẩn danh'}</p>
                                    {(podiumList[1].isPremium || podiumList[1].isPremiumUnlocked) && (
                                        <span className="bg-gradient-to-r from-amber-500 to-yellow-500 text-white text-[8px] font-black px-1 rounded uppercase tracking-wider flex items-center gap-0.5 shadow-sm scale-90">
                                            <Crown className="w-2 h-2 fill-white text-white" />
                                            PREMIUM
                                        </span>
                                    )}
                                </div>
                                <p className="text-[10px] text-gray-400 mt-0.5">{podiumList[1].totalCards || 0} từ · {podiumList[1].kanjiTotal || 0} kanji</p>
                                <div className="mt-2 text-indigo-500 font-bold text-xs flex items-center justify-center gap-0.5">
                                    <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
                                    {podiumList[1].computedScore}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* 1st Place (Gold Crown) */}
                    {podiumList[0] && (
                        <div className="flex flex-col items-center group z-10 cursor-pointer" onClick={() => handleToggleExpandUser(podiumList[0].id)}>
                            <div className="relative mb-2">
                                <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-yellow-500 animate-bounce">
                                    <Crown className="w-8 h-8 fill-yellow-500 text-yellow-500 drop-shadow-[0_2px_5px_rgba(234,179,8,0.4)]" />
                                </div>
                                <div className="w-20 h-20 rounded-full border-4 border-yellow-400 overflow-hidden bg-white shadow-xl group-hover:scale-105 transition-all duration-300 ring-4 ring-yellow-400/20">
                                    <div className="w-full h-full flex items-center justify-center text-2xl bg-amber-50 dark:bg-amber-950/20">
                                        {getAvatarDisplayNode(podiumList[0].avatar, podiumList[0].displayName)}
                                    </div>
                                </div>
                                <div className="absolute -top-1 -right-1 bg-yellow-400 text-yellow-950 rounded-full w-7 h-7 flex items-center justify-center text-sm font-bold border-2 border-white shadow">
                                    1
                                </div>
                            </div>
                            <div className="text-center bg-gradient-to-b from-yellow-50 to-white dark:from-yellow-950/20 dark:to-gray-800 rounded-2xl p-4 border-2 border-yellow-300 dark:border-yellow-600/30 w-full shadow-lg group-hover:shadow-xl transition-all duration-300 ring-4 ring-yellow-400/10">
                                <div className="flex flex-col items-center gap-0.5 justify-center mb-1">
                                    <p className="font-bold text-sm truncate text-yellow-700 dark:text-yellow-400 max-w-full">{podiumList[0].displayName || 'Ẩn danh'}</p>
                                    {(podiumList[0].isPremium || podiumList[0].isPremiumUnlocked) && (
                                        <span className="bg-gradient-to-r from-amber-500 to-yellow-500 text-white text-[8px] font-black px-1 rounded uppercase tracking-wider flex items-center gap-0.5 shadow-sm scale-90">
                                            <Crown className="w-2.5 h-2.5 fill-white text-white" />
                                            PREMIUM
                                        </span>
                                    )}
                                </div>
                                <p className="text-[10px] text-gray-400 mt-0.5">{podiumList[0].totalCards || 0} từ · {podiumList[0].kanjiTotal || 0} kanji</p>
                                <div className="mt-2 text-yellow-600 dark:text-yellow-400 font-bold text-sm flex items-center justify-center gap-0.5">
                                    <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                                    {podiumList[0].computedScore}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* 3rd Place (Bronze) */}
                    {podiumList[2] && (
                        <div className="flex flex-col items-center group cursor-pointer" onClick={() => handleToggleExpandUser(podiumList[2].id)}>
                            <div className="relative mb-2">
                                <div className="w-16 h-16 rounded-full border-4 border-amber-600 overflow-hidden bg-white shadow-lg group-hover:scale-105 transition-all duration-300">
                                    <div className="w-full h-full flex items-center justify-center text-xl bg-orange-50 dark:bg-orange-950/20">
                                        {getAvatarDisplayNode(podiumList[2].avatar, podiumList[2].displayName)}
                                    </div>
                                </div>
                                <div className="absolute -top-3 -right-2 bg-amber-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold border-2 border-white shadow">
                                    3
                                </div>
                            </div>
                            <div className="text-center bg-white dark:bg-gray-800 rounded-2xl p-3 border border-amber-200 dark:border-gray-700 w-full shadow-md group-hover:shadow-lg transition-all duration-300">
                                <div className="flex flex-col items-center gap-0.5 justify-center mb-1">
                                    <p className="font-bold text-xs truncate text-gray-700 dark:text-gray-200 max-w-full">{podiumList[2].displayName || 'Ẩn danh'}</p>
                                    {(podiumList[2].isPremium || podiumList[2].isPremiumUnlocked) && (
                                        <span className="bg-gradient-to-r from-amber-500 to-yellow-500 text-white text-[8px] font-black px-1 rounded uppercase tracking-wider flex items-center gap-0.5 shadow-sm scale-90">
                                            <Crown className="w-2 h-2 fill-white text-white" />
                                            PREMIUM
                                        </span>
                                    )}
                                </div>
                                <p className="text-[10px] text-gray-400 mt-0.5">{podiumList[2].totalCards || 0} từ · {podiumList[2].kanjiTotal || 0} kanji</p>
                                <div className="mt-2 text-indigo-500 font-bold text-xs flex items-center justify-center gap-0.5">
                                    <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
                                    {podiumList[2].computedScore}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Leaderboard Card */}
            <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
                {/* Header with Search and Sorting */}
                <div className="p-5 border-b border-gray-100 dark:border-gray-700 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <h3 className="font-bold text-gray-800 dark:text-white flex items-center gap-2 text-base">
                            <Trophy className="w-5 h-5 text-indigo-500 fill-indigo-100 dark:fill-indigo-900/30" />
                            Bảng xếp hạng tổng hợp
                        </h3>

                        {/* Sort options */}
                        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
                            <span className="text-[11px] font-bold text-gray-400 dark:text-gray-500 whitespace-nowrap">Sắp xếp:</span>
                            {[
                                { id: 'score', label: 'Điểm', icon: Star },
                                { id: 'vocab', label: 'Từ vựng', icon: BookOpen },
                                { id: 'kanji', label: 'Kanji', icon: Languages },
                                { id: 'streak', label: 'Streak', icon: Flame },
                            ].map(opt => {
                                const Icon = opt.icon;
                                const isActive = sortBy === opt.id;
                                return (
                                    <button
                                        key={opt.id}
                                        onClick={() => { setSortBy(opt.id); setDisplayCount(15); }}
                                        className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all border ${
                                            isActive
                                                ? 'bg-indigo-500 border-indigo-500 text-white shadow-sm'
                                                : 'bg-gray-50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                                        }`}
                                    >
                                        <Icon className="w-3.5 h-3.5" />
                                        <span>{opt.label}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Search box */}
                    <div className="relative">
                        <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Search className="h-4 w-4 text-gray-400" />
                        </span>
                        <input
                            type="text"
                            placeholder="Tìm kiếm người học..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="block w-full pl-9 pr-4 py-2 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-900/50 placeholder-gray-400 text-gray-700 dark:text-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                        />
                    </div>
                </div>

                {/* List portion */}
                <div className="divide-y divide-gray-50 dark:divide-gray-700/50">
                    {remainingList.length > 0 || podiumList.length > 0 ? (
                        <>
                            {/* Render podium items here too if search is active (since we hid the podium visual on search) */}
                            {searchTerm.trim() && sortedLeaderboard.slice(0, displayCount).map((user, idx) => {
                                return renderUserRow(user, idx, idx + 1);
                            })}

                            {/* Otherwise render from rank 4 onwards */}
                            {!searchTerm.trim() && remainingList.slice(0, displayCount - 3).map((user, idx) => {
                                const absoluteRank = idx + 4;
                                return renderUserRow(user, idx, absoluteRank);
                            })}
                        </>
                    ) : (
                        <div className="p-8 text-center text-gray-400 text-sm">
                            <Users className="w-10 h-10 mx-auto mb-2 opacity-50 text-gray-400" />
                            Không tìm thấy người học nào phù hợp.
                        </div>
                    )}
                </div>

                {/* Show More Button */}
                {sortedLeaderboard.length > displayCount && (
                    <div className="p-4 text-center border-t border-gray-50 dark:border-gray-700/50">
                        <button
                            onClick={() => setDisplayCount(prev => prev + 15)}
                            className="px-6 py-2 text-xs font-bold bg-gray-50 hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700/50 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 rounded-xl transition-all shadow-sm"
                        >
                            Hiển thị thêm người học
                        </button>
                    </div>
                )}
            </div>

            {/* Sticky bottom bar for my rank if not in the current view count */}
            {myRankInfo.rank > displayCount && (
                <div className="fixed bottom-0 left-0 right-0 lg:left-64 bg-white/95 dark:bg-gray-900/95 backdrop-blur border-t border-indigo-100 dark:border-indigo-950/50 p-4 shadow-[0_-8px_30px_rgba(0,0,0,0.1)] z-30 transition-all flex items-center justify-between max-w-4xl mx-auto rounded-t-3xl border-x">
                    <div className="flex items-center gap-3">
                        <div className="bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 font-bold text-sm px-3 py-1.5 rounded-xl border border-indigo-100 dark:border-indigo-900/40">
                            Hạng {myRankInfo.rank}
                        </div>
                        <div className="hidden sm:block">
                            <p className="text-xs font-bold text-gray-700 dark:text-gray-200 flex items-center gap-1">
                                {profile.displayName || 'Bạn'} (Bạn)
                            </p>
                            <p className="text-[10px] text-gray-400 font-medium">Bạn đang nằm ngoài danh sách hiển thị</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4 text-xs font-bold">
                        <span className="text-gray-500 dark:text-gray-400">{totalCards} từ</span>
                        <span className="text-gray-500 dark:text-gray-400">{kanjiSrsStats.total} kanji</span>
                        <span className="flex items-center gap-0.5 text-orange-500">
                            <Flame className="w-3.5 h-3.5 fill-orange-400 text-orange-400" />
                            {streak}
                        </span>
                        <span className="flex items-center gap-0.5 text-indigo-500 dark:text-indigo-400">
                            <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
                            {myScore}
                        </span>
                    </div>
                </div>
            )}

            {/* Scoring System Info */}
            <div className="bg-indigo-50/50 dark:bg-indigo-900/10 p-5 rounded-3xl border border-indigo-100 dark:border-indigo-950/40">
                <h4 className="text-sm font-bold text-indigo-700 dark:text-indigo-300 mb-2 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-indigo-500 fill-indigo-100 dark:fill-indigo-900/30" />
                    Quy định tính điểm vinh danh (Chăm chỉ) ⭐
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 leading-relaxed">
                    Hệ thống xếp hạng ưu tiên những người học năng động và chăm chỉ. Điểm số được tính toán dựa trên hoạt động trong <strong>7 ngày gần nhất</strong> và chuỗi ngày học liên tục (Streak):
                </p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs text-indigo-600 dark:text-indigo-300">
                    <div className="p-3 bg-white/50 dark:bg-gray-800/30 rounded-xl border border-indigo-100/50 dark:border-indigo-900/30">
                        <p className="font-bold mb-1">📚 Học từ mới</p>
                        <p className="opacity-80">Trong 7 ngày qua: <strong className="font-bold text-indigo-700 dark:text-indigo-400">+15 điểm/từ</strong></p>
                    </div>
                    <div className="p-3 bg-white/50 dark:bg-gray-800/30 rounded-xl border border-indigo-100/50 dark:border-indigo-900/30">
                        <p className="font-bold mb-1">🔄 Lượt ôn tập</p>
                        <p className="opacity-80">Từ vựng & Kanji: <strong className="font-bold text-indigo-700 dark:text-indigo-400">+2 điểm/lượt</strong></p>
                    </div>
                    <div className="p-3 bg-white/50 dark:bg-gray-800/30 rounded-xl border border-indigo-100/50 dark:border-indigo-900/30">
                        <p className="font-bold mb-1">📅 Ngày năng động</p>
                        <p className="opacity-80">Trong 7 ngày qua: <strong className="font-bold text-indigo-700 dark:text-indigo-400">+50 điểm/ngày</strong></p>
                    </div>
                    <div className="p-3 bg-white/50 dark:bg-gray-800/30 rounded-xl border border-indigo-100/50 dark:border-indigo-900/30">
                        <p className="font-bold mb-1">🔥 Chuỗi học</p>
                        <p className="opacity-80">Ngày học liên tiếp (Streak): <strong className="font-bold text-indigo-700 dark:text-indigo-400">+20 điểm/ngày</strong></p>
                    </div>
                </div>
                <div className="mt-4 p-3 bg-indigo-100/30 dark:bg-indigo-950/20 border border-indigo-150/20 dark:border-indigo-900/30 rounded-xl text-[11px] text-indigo-700 dark:text-indigo-350">
                    ⚠️ <strong>Lưu ý:</strong> Những người không có hoạt động trong vòng <strong>7 ngày</strong> qua sẽ bị ẩn khỏi bảng vinh danh cho tới khi học lại.
                </div>
            </div>

            {/* Inline animation */}
            <style>{`
                .animate-fade-in {
                    animation: rowFadeIn 0.2s ease-out;
                }
                @keyframes rowFadeIn {
                    from { opacity: 0; transform: translateY(-4px); }
                    to   { opacity: 1; transform: translateY(0); }
                }
                /* Hide scrollbar for Chrome, Safari and Opera */
                .scrollbar-none::-webkit-scrollbar {
                    display: none;
                }
                /* Hide scrollbar for IE, Edge and Firefox */
                .scrollbar-none {
                    -ms-overflow-style: none;  /* IE and Edge */
                    scrollbar-width: none;  /* Firefox */
                }
            `}</style>
        </div>
    );
};

export default StatsScreen;
