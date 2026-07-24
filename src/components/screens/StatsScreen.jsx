import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Trophy, Crown, Medal, Star, Flame, BookOpen, Languages, Search, Users, Sparkle, Cpu, ChevronDown, ChevronUp, FileText } from 'lucide-react'
import { collection, query, onSnapshot } from 'firebase/firestore';
import { auth, db, appId } from '../../config/firebase';
import LoadingIndicator from '../ui/LoadingIndicator';
import { SafeAvatarImage } from '../ui';
import { isKanjiMastered, isSrsCardDue, isVocabCardMastered } from '../../utils/srs';
import SRSForecastChart from '../ui/SRSForecastChart';
import { getSharedKanjiList, subscribeKanjiSrs } from '../../utils/kanjiService';
import { getLevelFromXp, getLevelTitle, getTranslatedLeagueName, LEAGUES, LEAGUE_ICONS, LEAGUE_COLORS, getWeekId, generateSimulatedLeague, getLeagueTierRules } from '../../utils/scoring';
import { useLanguage } from '../../context/LanguageContext';

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

    const emoji = (resolvedAvatar && resolvedAvatar !== 'default') ? getAvatarEmoji(resolvedAvatar) : null;
    const fallbackNode = emoji ? <span>{emoji}</span> : <span>{(textFallback || 'U')[0].toUpperCase()}</span>;

    if (isPhotoUrl(resolvedAvatar)) {
        return (
            <SafeAvatarImage
                src={resolvedAvatar}
                alt="avatar"
                className="w-full h-full object-cover"
                fallback={fallbackNode}
            />
        );
    }
    return fallbackNode;
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

// Helper checking if a user has an active, unexpired Premium status
const isUserPremiumActive = (u) => {
    if (!u) return false;
    const hasPremiumFlag = !!(
        u.isPremium || 
        u.isPremiumUnlocked || 
        (Array.isArray(u.unlockedSpecializedPackages) && u.unlockedSpecializedPackages.some(p => typeof p === 'string' && p.startsWith('premium')))
    );
    if (!hasPremiumFlag) return false;

    if (u.premiumExpiresAt) {
        const expiryTime = u.premiumExpiresAt.toDate ? u.premiumExpiresAt.toDate().getTime() : Number(u.premiumExpiresAt || 0);
        if (expiryTime && expiryTime < Date.now()) {
            return false;
        }
    }

    return true;
};

// ==================== MAIN HONOR ROLL / LEADERBOARD SCREEN ====================
const StatsScreen = ({ totalCards, profile, allCards, dailyActivityLogs, userId, publicStatsPath }) => {
    const { t } = useLanguage();
    const [kanjiSrsStats, setKanjiSrsStats] = useState({ total: 0, learning: 0, mastered: 0, dueToday: 0 });
    const [leaderboardData, setLeaderboardData] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [sortBy, setSortBy] = useState('score'); // 'score' | 'vocab' | 'kanji' | 'streak'
    const [displayCount, setDisplayCount] = useState(15);
    const [expandedUser, setExpandedUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeLeaderboardTab, setActiveLeaderboardTab] = useState('weekly'); // 'weekly' | 'allTime'
    const [selectedLeague, setSelectedLeague] = useState(() => {
        if (!profile?.league || profile.league === 'Sắt') return 'Đồng';
        return profile.league;
    });
    const [timeLeft, setTimeLeft] = useState('');
    const [showRules, setShowRules] = useState(false);

    // Sync selected league when profile updates
    useEffect(() => {
        if (profile?.league) {
            const resolved = profile.league === 'Sắt' ? 'Đồng' : profile.league;
            setSelectedLeague(resolved);
        }
    }, [profile?.league]);

    // Weekly countdown timer
    useEffect(() => {
        const updateTimer = () => {
            const now = new Date();
            const nextSunday = new Date();
            const day = now.getDay();
            const diff = now.getDate() - day + (day === 0 ? 0 : 7);
            nextSunday.setDate(diff);
            nextSunday.setHours(23, 59, 59, 999);

            const diffMs = nextSunday.getTime() - now.getTime();
            if (diffMs <= 0) {
                setTimeLeft('Đang tổng kết...');
                return;
            }

            const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
            const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
            const secs = Math.floor((diffMs % (1000 * 60)) / 1000);

            let timeStr = '';
            if (days > 0) timeStr += `${days}d `;
            timeStr += `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
            setTimeLeft(timeStr);
        };

        updateTimer();
        const interval = setInterval(updateTimer, 1000);
        return () => clearInterval(interval);
    }, []);

    // Fetch kanji SRS stats synchronized with Kanji module
    useEffect(() => {
        if (!userId) return;
        let isMounted = true;
        let unsub = () => {};

        getSharedKanjiList().then(kList => {
            if (!isMounted) return;
            const validKanjiIds = new Set((kList || []).map(k => k.id));

            unsub = subscribeKanjiSrs(userId, (freshSrs) => {
                if (!isMounted) return;
                let total = 0, learning = 0, mastered = 0, dueToday = 0;
                const now = Date.now();
                Object.entries(freshSrs || {}).forEach(([id, data]) => {
                    if (validKanjiIds.size > 0 && !validKanjiIds.has(id)) return;
                    total++;
                    if (isKanjiMastered(data)) mastered++;
                    else learning++;
                    if (isSrsCardDue(data, now)) dueToday++;
                });
                setKanjiSrsStats({ total, learning, mastered, dueToday });
            });
        }).catch(err => {
            console.error('Error fetching kanji list in StatsScreen:', err);
        });

        return () => {
            isMounted = false;
            unsub();
        };
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
        const activeLogs = dailyActivityLogs.filter(log => 
            (log.newWordsAdded || 0) > 0 || 
            (log.newKanjiAdded || 0) > 0 || 
            (log.reviewsDone || 0) > 0
        );
        if (activeLogs.length === 0) return 0;
        const todayStr = new Date().toISOString().split('T')[0];
        const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];
        const reversedLogs = [...activeLogs].reverse();
        const lastLog = reversedLogs[0];
        if (lastLog.id !== todayStr && lastLog.id !== yesterdayStr) return 0;
        
        let currentStreak = 0;
        let checkDate = new Date();
        if (lastLog.id !== todayStr) checkDate.setDate(checkDate.getDate() - 1);
        for (const log of reversedLogs) {
            const checkDateStr = checkDate.toISOString().split('T')[0];
            if (log.id === checkDateStr) {
                currentStreak++;
                checkDate.setDate(checkDate.getDate() - 1);
            } else break;
        }
        return currentStreak;
    }, [dailyActivityLogs]);

    const vocabMastery = useMemo(() => {
        const mastered = allCards.filter(c => isVocabCardMastered(c)).length;
        return { mastered };
    }, [allCards]);

    // ==================== LEADERBOARD SCORE CALCULATION ====================
    const computeScore = useCallback((user) => {
        if (user.score !== undefined && user.score !== null) return user.score;
        // Fallback locally
        const added7 = user.addedLast7Days !== undefined ? user.addedLast7Days : Math.min(user.totalCards || 0, 5);
        const kanji7 = user.kanjiAddedLast7Days !== undefined ? user.kanjiAddedLast7Days : 0;
        const reviews7 = user.reviewsLast7Days !== undefined ? user.reviewsLast7Days : Math.min(user.totalReviews || 0, 20);
        const activeDays7 = user.activeDaysLast7Days !== undefined ? user.activeDaysLast7Days : Math.min(user.activeDays || 0, 2);
        return Math.round(
            (added7 * 10) +
            (kanji7 * 15) +
            (reviews7 * 20) +
            (activeDays7 * 50) +
            ((user.streak || 0) * 20)
        );
    }, []);

    // Current user's weekly stats
    const myWeeklyStats = useMemo(() => {
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
        const kanjiLast7Days = last7DaysLogs.reduce((s, l) => s + (l.newKanjiAdded || 0), 0);
        const reviewsLast7Days = last7DaysLogs.reduce((s, l) => s + (l.reviewsDone || 0), 0);
        const activeDaysLast7Days = last7DaysLogs.filter(l => (l.newWordsAdded || 0) > 0 || (l.newKanjiAdded || 0) > 0 || (l.reviewsDone || 0) > 0).length;

        return {
            addedLast7Days,
            kanjiLast7Days,
            reviewsLast7Days,
            activeDaysLast7Days
        };
    }, [dailyActivityLogs]);

    // Current user's calculated score
    const myScore = useMemo(() => {
        const me = leaderboardData.find(u => u.id === userId);
        if (me) return computeScore(me);

        // Fallback to local log-based calculation
        return Math.round(
            (myWeeklyStats.addedLast7Days * 10) +
            (myWeeklyStats.kanjiLast7Days * 15) +
            (myWeeklyStats.reviewsLast7Days * 20) +
            (myWeeklyStats.activeDaysLast7Days * 50) +
            (streak * 20)
        );
    }, [leaderboardData, userId, myWeeklyStats, streak, computeScore]);

    // Current user's XP progress
    const xpDetails = useMemo(() => {
        const xp = profile?.xp || 0;
        return getLevelFromXp(xp);
    }, [profile?.xp]);

    const currentWeekId = useMemo(() => getWeekId(), []);

    // Filter real users and fill with bots to form exactly 30 participants (only for Sắt and Đồng)
    const leagueParticipants = useMemo(() => {
        let realUsersInLeague = leaderboardData.map(u => {
            const resolvedLeague = (!u.league || u.league === 'Sắt') ? 'Đồng' : u.league;
            return {
                ...u,
                league: resolvedLeague,
                computedScore: computeScore(u)
            };
        }).filter(u => u.league === selectedLeague);

        // Remove the current user to avoid duplicates
        const currentUserId = userId;
        realUsersInLeague = realUsersInLeague.filter(u => u.id !== currentUserId);

        // Include current user with their latest computed score if they are in this league
        const userLeague = (!profile?.league || profile.league === 'Sắt') ? 'Đồng' : profile.league;
        const userBelongsToThisLeague = userLeague === selectedLeague;
        let finalParticipants = [...realUsersInLeague];
        if (userBelongsToThisLeague) {
            const me = leaderboardData.find(u => u.id === currentUserId) || {};
            finalParticipants.push({
                ...me,
                id: currentUserId,
                displayName: profile?.displayName || 'Bạn',
                avatar: profile?.avatar || 'default',
                level: profile?.level || 1,
                title: profile?.title || getLevelTitle(1),
                streak: streak,
                totalCards: totalCards,
                mastered: vocabMastery.mastered,
                kanjiTotal: kanjiSrsStats.total,
                kanjiMastered: kanjiSrsStats.mastered,
                addedLast7Days: myWeeklyStats.addedLast7Days,
                kanjiAddedLast7Days: myWeeklyStats.kanjiLast7Days,
                reviewsLast7Days: myWeeklyStats.reviewsLast7Days,
                activeDaysLast7Days: myWeeklyStats.activeDaysLast7Days,
                computedScore: myScore,
                league: selectedLeague,
                lastUpdated: me.lastUpdated || { toDate: () => new Date() }
            });
        }

        // Fill remaining spaces with deterministic competitive bots (Disabled)
        const isBotEnabled = false;
        if (isBotEnabled) {
            const needed = 30 - finalParticipants.length;
            if (needed > 0) {
                const bots = generateSimulatedLeague(currentUserId + selectedLeague, currentWeekId, myScore);
                finalParticipants = [...finalParticipants, ...bots.slice(0, needed)];
            }
        }

        // Filter out inactive real users (inactive > 7 days)
        const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
        finalParticipants = finalParticipants.filter(u => {
            if (u.isBot) return true;
            if (!u.lastUpdated) return false;
            const lastActiveDate = u.lastUpdated.toDate ? u.lastUpdated.toDate() : new Date(u.lastUpdated);
            return lastActiveDate.getTime() >= sevenDaysAgo;
        });

        // Search filter
        if (searchTerm.trim()) {
            const term = searchTerm.toLowerCase();
            finalParticipants = finalParticipants.filter(u => (u.displayName || '').toLowerCase().includes(term));
        }

        // Sort dynamically based on selected sorting field
        finalParticipants.sort((a, b) => {
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

        return finalParticipants;
    }, [leaderboardData, selectedLeague, profile, userId, myScore, streak, totalCards, vocabMastery.mastered, kanjiSrsStats.total, kanjiSrsStats.mastered, myWeeklyStats, currentWeekId, searchTerm, sortBy, computeScore]);

    const allTimeParticipants = useMemo(() => {
        let list = leaderboardData.map(u => ({
            ...u,
            computedScore: computeScore(u),
            totalScore: u.xp || u.score || computeScore(u)
        }));

        const currentUserId = userId;
        const hasMe = list.some(u => u.id === currentUserId);
        if (!hasMe) {
            list.push({
                id: currentUserId,
                displayName: profile?.displayName || 'Bạn',
                avatar: profile?.avatar || 'default',
                level: profile?.level || 1,
                title: profile?.title || getLevelTitle(1),
                streak: streak,
                totalCards: totalCards,
                mastered: vocabMastery.mastered,
                kanjiTotal: kanjiSrsStats.total,
                kanjiMastered: kanjiSrsStats.mastered,
                computedScore: myScore,
                totalScore: profile?.xp || myScore
            });
        }

        if (searchTerm.trim()) {
            const term = searchTerm.toLowerCase();
            list = list.filter(u => (u.displayName || '').toLowerCase().includes(term));
        }

        list.sort((a, b) => (b.totalScore || 0) - (a.totalScore || 0));
        return list;
    }, [leaderboardData, userId, profile, streak, totalCards, vocabMastery.mastered, kanjiSrsStats.total, myScore, searchTerm, computeScore]);

    const activeParticipants = useMemo(() => {
        return activeLeaderboardTab === 'weekly' ? leagueParticipants : allTimeParticipants;
    }, [activeLeaderboardTab, leagueParticipants, allTimeParticipants]);

    // Find current user's rank
    const myRankInfo = useMemo(() => {
        const userLeague = (!profile?.league || profile.league === 'Sắt') ? 'Đồng' : profile.league;
        const userBelongsToThisLeague = activeLeaderboardTab === 'weekly' ? userLeague === selectedLeague : true;
        if (!userBelongsToThisLeague) {
            return { rank: -1, total: activeParticipants.length };
        }
        const index = activeParticipants.findIndex(u => u.id === userId);
        return {
            rank: index !== -1 ? index + 1 : -1,
            total: activeParticipants.length
        };
    }, [activeParticipants, userId, selectedLeague, profile?.league, activeLeaderboardTab]);

    // Top 3 Podium
    const podiumList = useMemo(() => {
        if (searchTerm.trim()) return [];
        return activeParticipants.slice(0, 3);
    }, [activeParticipants, searchTerm]);

    const remainingList = useMemo(() => {
        if (searchTerm.trim()) return activeParticipants;
        return activeParticipants.slice(3);
    }, [activeParticipants, searchTerm]);

    const handleToggleExpandUser = (id) => {
        setExpandedUser(prev => prev === id ? null : id);
    };

    const activePodiumUser = useMemo(() => {
        if (!expandedUser) return null;
        return podiumList.find(u => u.id === expandedUser) || null;
    }, [expandedUser, podiumList]);

    const renderExpandedDetails = (user) => {
        return (
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
                        <div className="p-2.5 bg-gradient-to-br from-indigo-50 to-sky-50 dark:from-indigo-950/20 dark:to-sky-950/10 rounded-xl border border-indigo-100/50 dark:border-indigo-950/50 shadow-sm flex flex-col justify-center">
                            <span className="text-[10px] font-bold text-indigo-500 dark:text-indigo-400 block mb-0.5">Điểm vinh danh:</span>
                            <span className="text-sm font-black text-indigo-600 dark:text-indigo-400 flex items-center gap-0.5">
                                <Star className="w-4 h-4 fill-indigo-500 text-indigo-500 dark:fill-indigo-400 dark:text-indigo-400" /> {user.computedScore} điểm
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    const renderUserRow = (user, index, rank) => {
        const isMe = user.id === userId;
        const isExpanded = expandedUser === user.id;

        let zoneBadge = null;
        if (!searchTerm.trim()) {
            const tierRules = getLeagueTierRules(selectedLeague, leagueParticipants.length);
            
            if (rank <= tierRules.promoteCount) {
                if (user.computedScore >= tierRules.minScoreForPromotion) {
                    zoneBadge = (
                        <span className="bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-450 text-[9px] font-black px-1.5 py-0.5 rounded-full flex items-center gap-0.5 border border-emerald-100/30 dark:border-emerald-900/30 shadow-sm animate-pulse">
                            {t('leaderboard.rankPromote', '▲ THĂNG HẠNG')}
                        </span>
                    );
                } else {
                    zoneBadge = (
                        <span className="bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-450 text-[9px] font-black px-1.5 py-0.5 rounded-full flex items-center gap-0.5 border border-amber-100/30 dark:border-amber-900/30 shadow-sm" title={`Cần tối thiểu ${tierRules.minScoreForPromotion} điểm vinh danh để thăng hạng`}>
                            {t('leaderboard.rankScoreLocked', '🔒 THIẾU ĐIỂM')} ({user.computedScore}/{tierRules.minScoreForPromotion})
                        </span>
                    );
                }
            } else if (selectedLeague !== 'Sắt') {
                const isUnderSafetyScore = user.computedScore < tierRules.minScoreForSafety;
                const isInDemotionRank = tierRules.demoteCount > 0 && rank > leagueParticipants.length - tierRules.demoteCount;
                
                if (isUnderSafetyScore) {
                    zoneBadge = (
                        <span className="bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-450 text-[9px] font-black px-1.5 py-0.5 rounded-full flex items-center gap-0.5 border border-rose-100/30 dark:border-rose-900/30 shadow-sm" title={`Điểm vinh danh dưới ${tierRules.minScoreForSafety} sẽ bị tự động xuống hạng`}>
                            {t('leaderboard.rankDemoteInactive', '▼ XUỐNG HẠNG (ÍT HỌC)')}
                        </span>
                    );
                } else if (isInDemotionRank) {
                    zoneBadge = (
                        <span className="bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-450 text-[9px] font-black px-1.5 py-0.5 rounded-full flex items-center gap-0.5 border border-rose-100/30 dark:border-rose-900/30 shadow-sm">
                            {t('leaderboard.rankDemote', '▼ XUỐNG HẠNG')}
                        </span>
                    );
                }
            }
        }

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

                    <div className={`w-9 h-9 rounded-full overflow-hidden flex items-center justify-center flex-shrink-0 border border-gray-100 dark:border-gray-700 ${isCustomPhoto(user.avatar) ? '' : 'bg-gradient-to-br from-indigo-100 to-sky-100 dark:from-indigo-900/40 dark:to-sky-900/20 text-lg font-bold'}`}>
                        {getAvatarDisplayNode(user.avatar, user.displayName || 'U', isMe)}
                    </div>

                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                            <p className={`text-sm font-bold truncate ${isMe ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-700 dark:text-gray-200'}`}>
                                {user.displayName || 'Ẩn danh'}
                            </p>
                            {user.level && (
                                <span className="bg-sky-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider flex items-center justify-center">
                                    LV {user.level}
                                </span>
                            )}
                            {user.title && (
                                <span className="bg-indigo-500 text-white text-[9px] font-semibold px-1.5 py-0.5 rounded truncate max-w-[100px] flex items-center justify-center" title={user.title}>
                                    {user.title}
                                </span>
                            )}
                            {isUserPremiumActive(user) && (
                                <span className="bg-gradient-to-r from-amber-500 to-yellow-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider flex items-center gap-0.5 shadow-sm">
                                    <Crown className="w-2.5 h-2.5 fill-white text-white" />
                                    PREMIUM
                                </span>
                            )}
                            {zoneBadge}
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
                {isExpanded && renderExpandedDetails(user)}
            </div>
        );
    };

    if (loading) {
        return <LoadingIndicator text="Đang tải bảng vinh danh..." />;
    }

    return (
        <div className="space-y-6 max-w-4xl mx-auto pb-24 animate-fade-in">
            {/* Sci-Fi Cyber HUD Header Card */}
            <div className="relative overflow-hidden bg-white dark:bg-slate-900 border border-slate-200 dark:border-cyan-500/30 rounded-3xl p-6 md:p-8 text-slate-800 dark:text-slate-100 shadow-xl relative group">
                <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/10 dark:bg-amber-500/15 rounded-full blur-3xl pointer-events-none"></div>
                <div className="absolute bottom-0 left-0 w-60 h-60 bg-cyan-500/10 dark:bg-cyan-600/15 rounded-full blur-3xl pointer-events-none"></div>

                <div className="relative z-10 space-y-5">
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 overflow-hidden rounded-full flex items-center justify-center flex-shrink-0 bg-slate-100 dark:bg-slate-800 border-2 border-amber-400 shadow-md text-2xl">
                            {getAvatarDisplayNode(profile.avatar, profile.displayName || 'U', true)}
                        </div>
                        <div>
                            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-cyan-50 dark:bg-cyan-950/60 border border-cyan-200 dark:border-cyan-800/60 text-cyan-700 dark:text-cyan-400 text-[10px] font-mono font-bold uppercase tracking-wider mb-1">
                                <Cpu className="w-3 h-3 text-cyan-600 dark:text-cyan-400 animate-spin-slow" />
                                <span>[NEURAL LEADERBOARD HUD]</span>
                            </div>
                            <div className="flex items-center gap-2 flex-wrap">
                                <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">{profile.displayName || 'Bạn'}</h2>
                                <span className="bg-gradient-to-r from-amber-400 to-orange-500 text-slate-950 text-[11px] font-black font-mono px-2.5 py-0.5 rounded-lg shadow-sm">
                                    LV {xpDetails.level}
                                </span>
                                <span className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-[10px] font-bold font-mono px-2.5 py-0.5 rounded-lg">
                                    {getLevelTitle(xpDetails.level, t)}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* XP Progress Bar */}
                    <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
                        <div className="flex justify-between items-center text-xs font-bold font-mono text-slate-700 dark:text-slate-300">
                            <span className="flex items-center gap-1.5">
                                <Sparkle className="w-4 h-4 text-amber-500" /> {t('leaderboard.levelProgress', 'Tiến trình cấp độ')} {xpDetails.level}
                            </span>
                            <span className="text-cyan-600 dark:text-cyan-400 font-extrabold">{xpDetails.remainingXp} / {xpDetails.nextLevelXp} XP</span>
                        </div>
                        <div className="w-full h-3 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden p-0.5">
                            <div 
                                className="h-full bg-gradient-to-r from-amber-400 via-orange-400 to-emerald-400 rounded-full transition-all duration-500 ease-out shadow-sm"
                                style={{ width: `${Math.min(100, Math.round((xpDetails.remainingXp / xpDetails.nextLevelXp) * 100))}%` }}
                            />
                        </div>
                    </div>

                    {/* Telemetry Stats Grid */}
                    <div className="grid grid-cols-5 gap-3 bg-slate-50 dark:bg-slate-950 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 font-mono">
                        <div className="text-center">
                            <div className="text-xl md:text-2xl font-black text-slate-900 dark:text-white leading-tight">{totalCards}</div>
                            <div className="text-[10px] md:text-xs text-slate-500 dark:text-slate-400 font-bold uppercase mt-1">{t('nav.vocab', 'Từ vựng')}</div>
                        </div>
                        <div className="text-center">
                            <div className="text-xl md:text-2xl font-black text-slate-900 dark:text-white leading-tight">{kanjiSrsStats.total}</div>
                            <div className="text-[10px] md:text-xs text-slate-500 dark:text-slate-400 font-bold uppercase mt-1">Kanji</div>
                        </div>
                        <div className="text-center">
                            <div className="text-xl md:text-2xl font-black text-slate-900 dark:text-white leading-tight">{vocabMastery.mastered}</div>
                            <div className="text-[10px] md:text-xs text-slate-500 dark:text-slate-400 font-bold uppercase mt-1">{t('common.mastered', 'Thành thạo')}</div>
                        </div>
                        <div className="text-center">
                            <div className="text-xl md:text-2xl font-black text-slate-900 dark:text-white leading-tight flex items-center justify-center gap-0.5">
                                <Flame className="w-4 h-4 fill-orange-500 text-orange-500" />
                                {streak}
                            </div>
                            <div className="text-[10px] md:text-xs text-slate-500 dark:text-slate-400 font-bold uppercase mt-1">{t('common.streak', 'Chuỗi ngày')}</div>
                        </div>
                        <div className="text-center border-l border-slate-200 dark:border-slate-800 pl-2">
                            <div className="text-xl md:text-2xl font-black text-amber-500 flex items-center justify-center gap-0.5">
                                <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                                {myScore}
                            </div>
                            <div className="text-[10px] md:text-xs text-slate-500 dark:text-slate-400 font-bold uppercase mt-1">{t('common.points', 'Điểm')}</div>
                        </div>
                    </div>
                </div>

            </div>

            {/* Leaderboard Mode Switcher Tabs */}
            <div className="flex items-center justify-center p-1.5 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 max-w-md mx-auto shadow-md">
                <button
                    onClick={() => setActiveLeaderboardTab('weekly')}
                    className={`flex-1 py-2.5 px-4 rounded-2xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                        activeLeaderboardTab === 'weekly'
                            ? 'bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-white shadow-lg scale-102 font-black'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                >
                    <Trophy className="w-4 h-4 text-yellow-300 fill-yellow-300" />
                    <span>{t('leaderboard.weeklyTab', '🏆 Đua Top Tuần này')}</span>
                </button>

                <button
                    onClick={() => setActiveLeaderboardTab('allTime')}
                    className={`flex-1 py-2.5 px-4 rounded-2xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                        activeLeaderboardTab === 'allTime'
                            ? 'bg-gradient-to-r from-indigo-600 via-sky-500 to-cyan-500 text-white shadow-lg scale-102 font-black'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                >
                    <Crown className="w-4 h-4 text-amber-300 fill-amber-300" />
                    <span>{t('leaderboard.allTimeTab', '🎖️ Bảng Vàng Cao Thủ')}</span>
                </button>
            </div>

            {/* Leagues Selection Header (Weekly Mode Only) */}
            {activeLeaderboardTab === 'weekly' ? (
                <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-md p-5 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                            <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2 text-base">
                                <Trophy className="w-5 h-5 text-yellow-500 fill-yellow-100 dark:fill-yellow-900/30" />
                                {t('leaderboard.leaguesHeader', 'Đấu trường Hạng đấu (5 Cấp độ)')}
                            </h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                {t('leaderboard.leaguesSubtitle', 'Cạnh tranh cùng các học viên trong cùng Hạng đấu. Top 5 thăng hạng 🟢, Bottom 5 nguy cơ rớt hạng 🔴.')}
                            </p>
                        </div>
                        {/* Countdown Timer */}
                        {timeLeft && (
                            <div className="flex items-center gap-2 px-3 py-1.5 bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 rounded-xl border border-rose-100 dark:border-rose-900/30 font-mono text-xs font-bold w-fit">
                                <Flame className="w-4 h-4 fill-rose-500 text-rose-500 animate-pulse" />
                                {timeLeft}
                            </div>
                        )}
                    </div>

                    {/* Leagues Tab Buttons */}
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                        {LEAGUES.map(lg => {
                            const icon = LEAGUE_ICONS[lg];
                            const colors = LEAGUE_COLORS[lg];
                            const isSelected = selectedLeague === lg;
                            const userLeague = (!profile?.league || profile.league === 'Sắt') ? 'Đồng' : profile.league;
                            const isUserLeague = userLeague === lg;
                            
                            return (
                                <button
                                    key={lg}
                                    onClick={() => { setSelectedLeague(lg); setDisplayCount(15); }}
                                    className={`relative flex flex-col items-center justify-center p-2.5 sm:p-3.5 rounded-2xl border transition-all duration-300 ${
                                        isSelected 
                                            ? `bg-gradient-to-br ${colors} shadow-md scale-102 border-transparent font-black` 
                                            : 'bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-750 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold'
                                    }`}
                                >
                                    <img src={icon} alt={lg} className="w-12 h-12 sm:w-14 sm:h-14 object-contain mb-1 drop-shadow-md" />
                                    <span className="text-[10px] sm:text-xs uppercase tracking-wider truncate max-w-full px-0.5">{getTranslatedLeagueName(lg, t)}</span>
                                    
                                    {isUserLeague && (
                                        <span className={`absolute -top-1 -right-1 text-[8px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-wider border shadow-sm ${
                                            isSelected 
                                                ? 'bg-white text-indigo-650 border-white' 
                                                : 'bg-indigo-600 text-white border-indigo-500'
                                        }`}>
                                            YOU
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>
            ) : (
                <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-md p-5 text-center space-y-1">
                    <h3 className="font-black text-slate-900 dark:text-white flex items-center justify-center gap-2 text-base">
                        <Crown className="w-5 h-5 text-amber-500 fill-amber-400" />
                        {t('leaderboard.allTimeHeader', 'Bảng Vàng Danh Dự Cao Thủ QuizKi')}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                        {t('leaderboard.allTimeSubtitle', 'Tôn vinh các học viên có tổng điểm tích luỹ, trình độ và kỷ lục chuỗi ngày học tập xuất sắc nhất toàn hệ thống.')}
                    </p>
                </div>
            )}

            {/* Top 3 Podium Displays */}
            {!searchTerm.trim() && podiumList.length > 0 && (
                <div className="max-w-2xl mx-auto mb-6">
                    <div className="grid grid-cols-3 gap-3 pt-6 items-end">
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
                                <div className="text-center bg-white dark:bg-slate-900 rounded-2xl p-3 border border-slate-200 dark:border-slate-800 w-full shadow-md group-hover:shadow-lg transition-all duration-300">
                                    <div className="flex flex-col items-center gap-0.5 justify-center mb-1">
                                        <p className="font-bold text-xs truncate text-gray-700 dark:text-gray-200 max-w-full">{podiumList[1].displayName || 'Ẩn danh'}</p>
                                        <div className="flex flex-wrap gap-1 items-center justify-center scale-90">
                                            {podiumList[1].level && (
                                                <span className="bg-sky-500 text-white text-[8px] font-black px-1 rounded uppercase tracking-wider">
                                                    LV {podiumList[1].level}
                                                </span>
                                            )}
                                            {podiumList[1].title && (
                                                <span className="bg-indigo-500 text-white text-[8px] font-medium px-1 rounded truncate max-w-[60px]" title={podiumList[1].title}>
                                                    {podiumList[1].title}
                                                </span>
                                            )}
                                            {isUserPremiumActive(podiumList[1]) && (
                                                <span className="bg-gradient-to-r from-amber-500 to-yellow-500 text-white text-[8px] font-black px-1 rounded uppercase tracking-wider flex items-center gap-0.5 shadow-sm">
                                                    <Crown className="w-2 h-2 fill-white text-white" />
                                                    PREMIUM
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <p className="text-[10px] text-gray-400 mt-0.5 whitespace-nowrap">{podiumList[1].totalCards || 0} {t('leaderboard.unitWords', 'từ')} · {podiumList[1].kanjiTotal || 0} {t('leaderboard.unitKanji', 'kanji')}</p>
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
                                        <div className="flex flex-wrap gap-1 items-center justify-center scale-90">
                                            {podiumList[0].level && (
                                                <span className="bg-sky-500 text-white text-[8px] font-black px-1.5 rounded uppercase tracking-wider">
                                                    LV {podiumList[0].level}
                                                </span>
                                            )}
                                            {podiumList[0].title && (
                                                <span className="bg-indigo-500 text-white text-[8px] font-medium px-1.5 rounded truncate max-w-[70px]" title={getLevelTitle(podiumList[0].level, t)}>
                                                    {getLevelTitle(podiumList[0].level, t)}
                                                </span>
                                            )}
                                            {isUserPremiumActive(podiumList[0]) && (
                                                <span className="bg-gradient-to-r from-amber-500 to-yellow-500 text-white text-[8px] font-black px-1.5 rounded uppercase tracking-wider flex items-center gap-0.5 shadow-sm">
                                                    <Crown className="w-2.5 h-2.5 fill-white text-white" />
                                                    PREMIUM
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <p className="text-[10px] text-gray-400 mt-0.5 whitespace-nowrap">{podiumList[0].totalCards || 0} {t('leaderboard.unitWords', 'từ')} · {podiumList[0].kanjiTotal || 0} {t('leaderboard.unitKanji', 'kanji')}</p>
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
                                        <div className="flex flex-wrap gap-1 items-center justify-center scale-90">
                                            {podiumList[2].level && (
                                                <span className="bg-sky-500 text-white text-[8px] font-black px-1 rounded uppercase tracking-wider">
                                                    LV {podiumList[2].level}
                                                </span>
                                            )}
                                            {podiumList[2].title && (
                                                <span className="bg-indigo-500 text-white text-[8px] font-medium px-1 rounded truncate max-w-[60px]" title={getLevelTitle(podiumList[2].level, t)}>
                                                    {getLevelTitle(podiumList[2].level, t)}
                                                </span>
                                            )}
                                            {isUserPremiumActive(podiumList[2]) && (
                                                <span className="bg-gradient-to-r from-amber-500 to-yellow-500 text-white text-[8px] font-black px-1 rounded uppercase tracking-wider flex items-center gap-0.5 shadow-sm">
                                                    <Crown className="w-2 h-2 fill-white text-white" />
                                                    PREMIUM
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <p className="text-[10px] text-gray-400 mt-0.5 whitespace-nowrap">{podiumList[2].totalCards || 0} {t('leaderboard.unitWords', 'từ')} · {podiumList[2].kanjiTotal || 0} {t('leaderboard.unitKanji', 'kanji')}</p>
                                    <div className="mt-2 text-indigo-500 font-bold text-xs flex items-center justify-center gap-0.5">
                                        <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
                                        {podiumList[2].computedScore}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Render details for the selected podium user */}
                    {activePodiumUser && (
                        <div className="bg-white dark:bg-gray-800 rounded-3xl border border-slate-100 dark:border-gray-700 shadow-md overflow-hidden mt-6 animate-fade-in">
                            <div className="bg-indigo-50/50 dark:bg-indigo-950/20 px-5 py-3 border-b border-gray-150 dark:border-gray-700/50 flex justify-between items-center">
                                <span className="font-bold text-xs text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
                                    <Trophy className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />
                                    Chi tiết thành tích của: <span className="underline font-black">{activePodiumUser.displayName || 'Ẩn danh'}</span>
                                </span>
                                <button 
                                    onClick={() => setExpandedUser(null)} 
                                    className="text-xs text-gray-400 hover:text-gray-650 dark:hover:text-gray-250 font-bold"
                                >
                                    Đóng
                                </button>
                            </div>
                            {renderExpandedDetails(activePodiumUser)}
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
                            {t('leaderboard.tableTitle', 'Bảng xếp hạng Giải đấu:')} League {getTranslatedLeagueName(selectedLeague, t)}
                            <img src={LEAGUE_ICONS[selectedLeague]} alt={selectedLeague} className="w-9 h-9 object-contain inline-block ml-2 align-middle drop-shadow-sm" />
                        </h3>

                        {/* Sort options */}
                        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
                            <span className="text-[11px] font-bold text-gray-400 dark:text-gray-500 whitespace-nowrap">{t('leaderboard.sortBy', 'Sắp xếp:')}</span>
                            {[
                                { id: 'score', label: t('common.points', 'Điểm'), icon: Star },
                                { id: 'vocab', label: t('nav.vocab', 'Từ vựng'), icon: BookOpen },
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
                            placeholder={t('leaderboard.searchPlaceholder', 'Tìm kiếm người học...')}
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
                            {searchTerm.trim() && leagueParticipants.slice(0, displayCount).map((user, idx) => {
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
                {leagueParticipants.length > displayCount && (
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
                <div className="fixed bottom-0 left-0 right-0 lg:left-64 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 p-4 shadow-[0_-8px_30px_rgba(0,0,0,0.1)] z-30 transition-all flex items-center justify-between max-w-4xl mx-auto rounded-t-3xl border-x">
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

            {/* Rules & Guidelines Section - Compact Collapsible Accordion */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 md:p-5 shadow-sm transition-all">
                {/* Header / Main Toggle */}
                <div 
                    onClick={() => setShowRules(prev => !prev)}
                    className="flex items-center justify-between cursor-pointer select-none group"
                >
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/60 dark:border-indigo-800/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400 group-hover:scale-105 transition-transform">
                            <FileText className="w-5 h-5" />
                        </div>
                        <div>
                            <h4 className="text-sm md:text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                                <span>{t('leaderboard.rulebookTitle', 'Quy chế & Thể lệ Xếp hạng')}</span>
                                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-cyan-100 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-400 border border-cyan-200 dark:border-cyan-800/50">
                                    RULEBOOK
                                </span>
                            </h4>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                {t('leaderboard.rulebookSub', 'Bấm để xem chi tiết cách tính Điểm Chăm chỉ, Thăng hạng Giải đấu và tích lũy XP.')}
                            </p>
                        </div>
                    </div>
                    <button className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 group-hover:bg-indigo-50 dark:group-hover:bg-indigo-950 group-hover:text-indigo-600 transition-all">
                        {showRules ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                    </button>
                </div>

                {/* Collapsible Content */}
                {showRules && (
                    <div className="mt-5 pt-5 border-t border-slate-100 dark:border-slate-800/80 space-y-4 animate-fade-in">
                        {/* 1. Điểm Vinh Danh (Chăm chỉ) */}
                        <div className="bg-slate-50 dark:bg-slate-950/60 rounded-2xl p-4 border border-slate-200/70 dark:border-slate-800/70 space-y-3">
                            <div className="flex items-center gap-2 font-bold text-xs text-indigo-700 dark:text-indigo-400 uppercase tracking-wider font-mono">
                                <Sparkle className="w-4 h-4 text-indigo-500" />
                                <span>1. Quy định tính điểm Chăm chỉ (Bảng Vinh Danh) ⭐</span>
                            </div>
                            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                                Điểm số dựa trên hoạt động trong <strong>7 ngày gần nhất</strong> & chuỗi ngày học <strong>Streak</strong>:
                            </p>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
                                <div className="p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800">
                                    <span className="text-slate-500 dark:text-slate-400 text-[10px] block font-sans">HỌC TỪ MỚI</span>
                                    <span className="font-bold text-indigo-600 dark:text-indigo-400">Từ +10đ | Kanji +15đ</span>
                                </div>
                                <div className="p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800">
                                    <span className="text-slate-500 dark:text-slate-400 text-[10px] block font-sans">LƯỢT ÔN TẬP (SRS)</span>
                                    <span className="font-bold text-indigo-600 dark:text-indigo-400">+20 điểm / lượt</span>
                                </div>
                                <div className="p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800">
                                    <span className="text-slate-500 dark:text-slate-400 text-[10px] block font-sans">NGÀY NĂNG ĐỘNG</span>
                                    <span className="font-bold text-indigo-600 dark:text-indigo-400">+50 điểm / ngày</span>
                                </div>
                                <div className="p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800">
                                    <span className="text-slate-500 dark:text-slate-400 text-[10px] block font-sans">STREAK HỌC</span>
                                    <span className="font-bold text-indigo-600 dark:text-indigo-400">+20 điểm / ngày</span>
                                </div>
                            </div>
                            <div className="text-[11px] text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 p-2.5 rounded-xl border border-amber-200/50 dark:border-amber-900/40">
                                ⚠️ <strong>Lưu ý:</strong> Tài khoản không học trong vòng <strong>7 ngày</strong> sẽ tạm thời ẩn khỏi Bảng vinh danh.
                            </div>
                        </div>

                        {/* 2. Tranh tài Giải đấu (Leagues) */}
                        <div className="bg-slate-50 dark:bg-slate-950/60 rounded-2xl p-4 border border-slate-200/70 dark:border-slate-800/70 space-y-3">
                            <div className="flex items-center gap-2 font-bold text-xs text-emerald-700 dark:text-emerald-400 uppercase tracking-wider font-mono">
                                <Trophy className="w-4 h-4 text-emerald-500" />
                                <span>2. Thể lệ Giải đấu (Leagues) 🏆</span>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                                <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 space-y-1">
                                    <span className="font-bold text-emerald-700 dark:text-emerald-400 block">🛡️ 10 Cấp hạng (Ranks)</span>
                                    <span className="text-slate-600 dark:text-slate-300 text-[11px] block leading-relaxed">
                                        Sắt 🔘 → Đồng 🥉 → Bạc 🥈 → Vàng 🥇 → Bạch Kim 💎 → Lục Bảo 🟢 → Kim Cương 💠 → Cao Thủ 🟣 → Đại Cao Thủ 🔴 → Thách Đấu 👑
                                    </span>
                                </div>
                                <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 space-y-1">
                                    <span className="font-bold text-emerald-700 dark:text-emerald-400 block">📈 Thăng / Xuống hạng hàng tuần</span>
                                    <span className="text-slate-600 dark:text-slate-300 text-[11px] block leading-relaxed">
                                        Sắt/Đồng lấy <strong>Top 5</strong> (≥100đ). Bạc trở lên lấy <strong>Top 1-5</strong> (≥200đ). Rớt hạng nếu dưới 30đ/tuần.
                                    </span>
                                </div>
                                <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 space-y-1">
                                    <span className="font-bold text-emerald-700 dark:text-emerald-400 block">🔥 Đấu trường thực tế</span>
                                    <span className="text-slate-600 dark:text-slate-300 text-[11px] block leading-relaxed">
                                        Từ giải <strong>Bạc trở lên</strong> 100% người thật. Loại bỏ hoàn toàn tài khoản ảo/bot.
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* 3. Tích lũy XP & Thăng cấp */}
                        <div className="bg-slate-50 dark:bg-slate-950/60 rounded-2xl p-4 border border-slate-200/70 dark:border-slate-800/70 space-y-3">
                            <div className="flex items-center gap-2 font-bold text-xs text-amber-700 dark:text-amber-400 uppercase tracking-wider font-mono">
                                <Flame className="w-4 h-4 text-amber-500" />
                                <span>3. Điểm Kinh Nghiệm (XP) & Thăng cấp ⚡</span>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs font-mono">
                                <div className="p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800">
                                    <span className="text-slate-500 dark:text-slate-400 text-[10px] block font-sans font-bold">📖 HỌC LẦN ĐẦU</span>
                                    <span className="text-slate-700 dark:text-slate-300">Thẻ nhớ: <strong>+10 XP</strong></span>
                                    <span className="text-slate-500 dark:text-slate-400 block text-[10px]">Chế độ phụ: <strong>+6 XP</strong></span>
                                </div>
                                <div className="p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800">
                                    <span className="text-slate-500 dark:text-slate-400 text-[10px] block font-sans font-bold">🔄 ÔN VOCAB (SRS)</span>
                                    <span className="text-slate-700 dark:text-slate-300">Quên: <strong>+5</strong> | Khó: <strong>+15</strong></span>
                                    <span className="text-slate-500 dark:text-slate-400 block text-[10px]">Tốt: <strong>+30</strong> | Dễ: <strong>+45 XP</strong></span>
                                </div>
                                <div className="p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800">
                                    <span className="text-slate-500 dark:text-slate-400 text-[10px] block font-sans font-bold">🏮 ÔN KANJI (SRS)</span>
                                    <span className="text-slate-700 dark:text-slate-300">Quên: <strong>+8</strong> | Khó: <strong>+25</strong></span>
                                    <span className="text-slate-500 dark:text-slate-400 block text-[10px]">Tốt: <strong>+45</strong> | Dễ: <strong>+60 XP</strong></span>
                                </div>
                                <div className="p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800">
                                    <span className="text-slate-500 dark:text-slate-400 text-[10px] block font-sans font-bold">🚀 THĂNG HẠNG SRS</span>
                                    <span className="text-slate-700 dark:text-slate-300">Đang học: <strong>+10 XP</strong></span>
                                    <span className="text-slate-500 dark:text-slate-400 block text-[10px]">Thành thạo: <strong>+100 XP</strong></span>
                                </div>
                                <div className="p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800">
                                    <span className="text-slate-500 dark:text-slate-400 text-[10px] block font-sans font-bold">📈 HỆ SỐ JLPT</span>
                                    <span className="text-slate-700 dark:text-slate-300">N5/N4: <strong>x1.0</strong> | N3: <strong>x1.2</strong></span>
                                    <span className="text-slate-500 dark:text-slate-400 block text-[10px]">N2: <strong>x1.4</strong> | N1: <strong>x1.6</strong></span>
                                </div>
                                <div className="p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800">
                                    <span className="text-slate-500 dark:text-slate-400 text-[10px] block font-sans font-bold">🛡️ BẢO MẬT</span>
                                    <span className="text-slate-700 dark:text-slate-300">Tối đa: <strong>1500 XP/ngày</strong></span>
                                    <span className="text-slate-500 dark:text-slate-400 block text-[10px]">Tự động chống spam</span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
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
