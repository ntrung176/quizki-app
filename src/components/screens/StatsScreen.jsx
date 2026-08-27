import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Trophy, Crown, Medal, Star, Flame, BookOpen, Languages, Search, Users, Sparkle, Cpu, ChevronDown, ChevronUp, FileText, CheckCircle2 } from 'lucide-react';
import { collection, query, onSnapshot, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../../config/firebase';
import LoadingIndicator from '../ui/LoadingIndicator';
import { SafeAvatarImage } from '../ui';
import { isKanjiMastered, isSrsCardDue, isVocabCardMastered } from '../../utils/srs';
import { getSharedKanjiList, subscribeKanjiSrs } from '../../utils/kanjiService';
import { getLevelFromXp, getLevelTitle, formatScore } from '../../utils/scoring';
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

// Helpers cho avatar ảnh / URL
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

// Helper kiểm tra trạng thái Premium
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

// ==================== MAIN LEADERBOARD SCREEN ====================
const StatsScreen = ({ totalCards = 0, profile = {}, allCards = [], dailyActivityLogs = [], userId, publicStatsPath }) => {
    const { t } = useLanguage();
    const [kanjiSrsStats, setKanjiSrsStats] = useState({ total: 0, learning: 0, mastered: 0, dueToday: 0 });
    const [leaderboardData, setLeaderboardData] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [sortBy, setSortBy] = useState('score'); // 'score' | 'vocab' | 'kanji' | 'mastered' | 'streak'
    const [displayCount, setDisplayCount] = useState(20);
    const [expandedUser, setExpandedUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeLeaderboardTab, setActiveLeaderboardTab] = useState('weekly'); // 'weekly' | 'allTime'
    const [timeLeft, setTimeLeft] = useState('');
    const [showRules, setShowRules] = useState(false);

    // Countdown timer cho Bảng xếp hạng tuần (chủ nhật 23:59:59)
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

    // Đồng bộ thống kê Kanji từ service
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

    // Tải dữ liệu toàn bộ người dùng từ Firestore publicStats
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
            console.error('Lỗi tải dữ liệu bảng xếp hạng:', err);
            setLoading(false);
        });
        return () => unsub();
    }, [publicStatsPath]);

    // Tính toán chuỗi ngày streak của người dùng hiện tại
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

    // Từ vựng đã thuộc (Mastered Vocab)
    const vocabMastery = useMemo(() => {
        const mastered = (allCards || []).filter(c => isVocabCardMastered(c)).length;
        return { mastered };
    }, [allCards]);

    // Hàm tính điểm XP chuẩn
    const computeScore = useCallback((user) => {
        if (!user) return 0;
        const score = Number(user.score || 0);
        const xp = Number(user.xp || 0);
        const totalXp = Number(user.totalXp || 0);
        return Math.max(score, xp, totalXp);
    }, []);

    // Điểm XP của người dùng hiện tại
    const myScore = useMemo(() => {
        const me = leaderboardData.find(u => u.id === userId);
        if (me) return computeScore(me);
        if (profile?.score !== undefined && profile?.score !== null) return Number(profile.score);
        return Number(profile?.xp || profile?.totalXp || 0);
    }, [leaderboardData, userId, profile, computeScore]);

    // Thông tin cấp độ Level & XP progress
    const xpDetails = useMemo(() => {
        return getLevelFromXp(myScore);
    }, [myScore]);

    // Thống kê hoạt động tuần này của người dùng hiện tại (7 ngày qua)
    const myWeeklyStats = useMemo(() => {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        sevenDaysAgo.setHours(0, 0, 0, 0);

        const last7DaysLogs = (dailyActivityLogs || []).filter(log => {
            try {
                const logDate = new Date(log.id);
                return logDate >= sevenDaysAgo;
            } catch (e) {
                return false;
            }
        });

        const addedLast7Days = last7DaysLogs.reduce((s, l) => s + (l.newWordsAdded || 0), 0);
        const kanjiLast7Days = last7DaysLogs.reduce((s, l) => s + (l.newKanjiAdded || 0), 0);
        const reviewsLast7Days = last7DaysLogs.reduce((s, l) => s + (l.reviewsDone || 0), 0);
        const activeDaysLast7Days = last7DaysLogs.filter(l => (l.newWordsAdded || 0) > 0 || (l.newKanjiAdded || 0) > 0 || (l.reviewsDone || 0) > 0).length;

        // Điểm tuần = lượt ôn tập * 4 + từ mới * 3 + kanji mới * 5 + ngày chuyên cần * 15
        const weeklyXp = (reviewsLast7Days * 4) + (addedLast7Days * 3) + (kanjiLast7Days * 5) + (activeDaysLast7Days * 15);

        return {
            addedLast7Days,
            kanjiLast7Days,
            reviewsLast7Days,
            activeDaysLast7Days,
            weeklyXp: Math.max(weeklyXp, reviewsLast7Days * 4)
        };
    }, [dailyActivityLogs]);

    // Tự động đồng bộ số liệu người dùng hiện tại vào Firestore publicStats
    useEffect(() => {
        if (!userId || !publicStatsPath || !db) return;
        const statsRef = doc(db, publicStatsPath, userId);
        const payload = {
            displayName: profile?.displayName || 'Học viên',
            avatar: profile?.avatar || 'default',
            photoURL: profile?.photoURL || '',
            level: xpDetails.level,
            title: getLevelTitle(xpDetails.level, t),
            xp: myScore,
            score: myScore,
            totalXp: myScore,
            totalCards: totalCards || 0,
            mastered: vocabMastery.mastered || 0,
            kanjiTotal: kanjiSrsStats.total || 0,
            kanjiMastered: kanjiSrsStats.mastered || 0,
            streak: streak || 0,
            addedLast7Days: myWeeklyStats.addedLast7Days || 0,
            kanjiAddedLast7Days: myWeeklyStats.kanjiLast7Days || 0,
            reviewsLast7Days: myWeeklyStats.reviewsLast7Days || 0,
            activeDaysLast7Days: myWeeklyStats.activeDaysLast7Days || 0,
            weeklyScore: myWeeklyStats.weeklyXp || 0,
            lastUpdated: serverTimestamp ? serverTimestamp() : { toDate: () => new Date() }
        };
        setDoc(statsRef, payload, { merge: true }).catch(e => console.warn('Lỗi đồng bộ public stats:', e));
    }, [userId, publicStatsPath, profile?.displayName, profile?.avatar, profile?.photoURL, xpDetails.level, myScore, totalCards, vocabMastery.mastered, kanjiSrsStats.total, kanjiSrsStats.mastered, streak, myWeeklyStats, t]);

    // ==================== TỔNG HỢP DANH SÁCH BẢNG XẾP HẠNG ====================
    // 1. Danh sách người dùng Bảng xếp hạng tuần
    const weeklyParticipants = useMemo(() => {
        let list = leaderboardData.map(u => {
            const isMe = u.id === userId;
            const computedScore = computeScore(u);
            
            // Tính điểm tuần
            const addedLast7Days = isMe ? myWeeklyStats.addedLast7Days : (Number(u.addedLast7Days) || 0);
            const kanjiLast7Days = isMe ? myWeeklyStats.kanjiLast7Days : (Number(u.kanjiAddedLast7Days) || 0);
            const reviewsLast7Days = isMe ? myWeeklyStats.reviewsLast7Days : (Number(u.reviewsLast7Days) || 0);
            const activeDaysLast7Days = isMe ? myWeeklyStats.activeDaysLast7Days : (Number(u.activeDaysLast7Days) || 0);
            
            let weeklyScore = Number(u.weeklyScore || 0);
            if (isMe) {
                weeklyScore = myWeeklyStats.weeklyXp;
            } else if (weeklyScore === 0 && (reviewsLast7Days > 0 || addedLast7Days > 0 || kanjiLast7Days > 0)) {
                weeklyScore = (reviewsLast7Days * 4) + (addedLast7Days * 3) + (kanjiLast7Days * 5) + (activeDaysLast7Days * 15);
            }

            return {
                ...u,
                id: u.id,
                displayName: isMe ? (profile?.displayName || 'Bạn') : (u.displayName || 'Học viên'),
                avatar: isMe ? (profile?.avatar || 'default') : (u.avatar || 'default'),
                level: isMe ? xpDetails.level : (u.level || 1),
                title: isMe ? getLevelTitle(xpDetails.level, t) : (u.title || getLevelTitle(u.level || 1, t)),
                totalCards: isMe ? totalCards : (Number(u.totalCards) || 0),
                mastered: isMe ? vocabMastery.mastered : (Number(u.mastered) || 0),
                kanjiTotal: isMe ? kanjiSrsStats.total : (Number(u.kanjiTotal) || 0),
                kanjiMastered: isMe ? kanjiSrsStats.mastered : (Number(u.kanjiMastered) || 0),
                streak: isMe ? streak : (Number(u.streak) || 0),
                addedLast7Days,
                kanjiLast7Days,
                reviewsLast7Days,
                activeDaysLast7Days,
                weeklyScore: Math.max(0, weeklyScore),
                computedScore: isMe ? myScore : computedScore
            };
        });

        // Nếu người dùng hiện tại chưa có trong leaderboardData thì đưa vào
        if (userId && !list.some(u => u.id === userId)) {
            list.push({
                id: userId,
                displayName: profile?.displayName || 'Bạn',
                avatar: profile?.avatar || 'default',
                level: xpDetails.level,
                title: getLevelTitle(xpDetails.level, t),
                totalCards: totalCards,
                mastered: vocabMastery.mastered,
                kanjiTotal: kanjiSrsStats.total,
                kanjiMastered: kanjiSrsStats.mastered,
                streak: streak,
                addedLast7Days: myWeeklyStats.addedLast7Days,
                kanjiLast7Days: myWeeklyStats.kanjiLast7Days,
                reviewsLast7Days: myWeeklyStats.reviewsLast7Days,
                activeDaysLast7Days: myWeeklyStats.activeDaysLast7Days,
                weeklyScore: myWeeklyStats.weeklyXp,
                computedScore: myScore,
                lastUpdated: { toDate: () => new Date() }
            });
        }

        // Lọc tìm kiếm
        if (searchTerm.trim()) {
            const term = searchTerm.toLowerCase();
            list = list.filter(u => (u.displayName || '').toLowerCase().includes(term));
        }

        // Sắp xếp
        list.sort((a, b) => {
            if (sortBy === 'vocab') {
                return (b.totalCards || 0) - (a.totalCards || 0);
            }
            if (sortBy === 'kanji') {
                return (b.kanjiTotal || 0) - (a.kanjiTotal || 0);
            }
            if (sortBy === 'mastered') {
                const totalMasteredA = (a.mastered || 0) + (a.kanjiMastered || 0);
                const totalMasteredB = (b.mastered || 0) + (b.kanjiMastered || 0);
                return totalMasteredB - totalMasteredA;
            }
            if (sortBy === 'streak') {
                return (b.streak || 0) - (a.streak || 0);
            }
            // Mặc định: Điểm tuần (weeklyScore) nếu có, fallback sang computedScore
            if (b.weeklyScore !== a.weeklyScore) {
                return (b.weeklyScore || 0) - (a.weeklyScore || 0);
            }
            return (b.computedScore || 0) - (a.computedScore || 0);
        });

        return list;
    }, [leaderboardData, userId, profile, xpDetails.level, totalCards, vocabMastery.mastered, kanjiSrsStats.total, kanjiSrsStats.mastered, streak, myWeeklyStats, myScore, searchTerm, sortBy, computeScore, t]);

    // 2. Danh sách người dùng Bảng Vàng Cao Thủ (All-Time)
    const allTimeParticipants = useMemo(() => {
        let list = leaderboardData.map(u => {
            const isMe = u.id === userId;
            const computedScore = computeScore(u);

            return {
                ...u,
                id: u.id,
                displayName: isMe ? (profile?.displayName || 'Bạn') : (u.displayName || 'Học viên'),
                avatar: isMe ? (profile?.avatar || 'default') : (u.avatar || 'default'),
                level: isMe ? xpDetails.level : (u.level || 1),
                title: isMe ? getLevelTitle(xpDetails.level, t) : (u.title || getLevelTitle(u.level || 1, t)),
                totalCards: isMe ? totalCards : (Number(u.totalCards) || 0),
                mastered: isMe ? vocabMastery.mastered : (Number(u.mastered) || 0),
                kanjiTotal: isMe ? kanjiSrsStats.total : (Number(u.kanjiTotal) || 0),
                kanjiMastered: isMe ? kanjiSrsStats.mastered : (Number(u.kanjiMastered) || 0),
                streak: isMe ? streak : (Number(u.streak) || 0),
                computedScore: isMe ? myScore : computedScore
            };
        });

        // Nếu người dùng hiện tại chưa có trong leaderboardData thì đưa vào
        if (userId && !list.some(u => u.id === userId)) {
            list.push({
                id: userId,
                displayName: profile?.displayName || 'Bạn',
                avatar: profile?.avatar || 'default',
                level: xpDetails.level,
                title: getLevelTitle(xpDetails.level, t),
                totalCards: totalCards,
                mastered: vocabMastery.mastered,
                kanjiTotal: kanjiSrsStats.total,
                kanjiMastered: kanjiSrsStats.mastered,
                streak: streak,
                computedScore: myScore,
                lastUpdated: { toDate: () => new Date() }
            });
        }

        // Lọc tìm kiếm
        if (searchTerm.trim()) {
            const term = searchTerm.toLowerCase();
            list = list.filter(u => (u.displayName || '').toLowerCase().includes(term));
        }

        // Sắp xếp
        list.sort((a, b) => {
            if (sortBy === 'vocab') {
                return (b.totalCards || 0) - (a.totalCards || 0);
            }
            if (sortBy === 'kanji') {
                return (b.kanjiTotal || 0) - (a.kanjiTotal || 0);
            }
            if (sortBy === 'mastered') {
                const totalMasteredA = (a.mastered || 0) + (a.kanjiMastered || 0);
                const totalMasteredB = (b.mastered || 0) + (b.kanjiMastered || 0);
                return totalMasteredB - totalMasteredA;
            }
            if (sortBy === 'streak') {
                return (b.streak || 0) - (a.streak || 0);
            }
            return (b.computedScore || 0) - (a.computedScore || 0); // Mặc định: Điểm XP
        });

        return list;
    }, [leaderboardData, userId, profile, xpDetails.level, totalCards, vocabMastery.mastered, kanjiSrsStats.total, kanjiSrsStats.mastered, streak, myScore, searchTerm, sortBy, computeScore, t]);

    // Danh sách người dùng hiển thị theo tab đang chọn
    const activeParticipants = useMemo(() => {
        return activeLeaderboardTab === 'weekly' ? weeklyParticipants : allTimeParticipants;
    }, [activeLeaderboardTab, weeklyParticipants, allTimeParticipants]);

    // Top 3 Podium
    const podiumList = useMemo(() => {
        return activeParticipants.slice(0, 3);
    }, [activeParticipants]);

    // Vị trí thứ hạng của người dùng hiện tại
    const myRankInfo = useMemo(() => {
        const index = activeParticipants.findIndex(u => u.id === userId);
        return {
            rank: index !== -1 ? index + 1 : activeParticipants.length + 1,
            user: activeParticipants[index] || null
        };
    }, [activeParticipants, userId]);

    // Toggle xem chi tiết người dùng
    const handleToggleExpandUser = (targetUserId) => {
        setExpandedUser(prev => prev === targetUserId ? null : targetUserId);
    };

    if (loading) {
        return <LoadingIndicator text="Đang tải bảng xếp hạng..." />;
    }

    return (
        <div className="space-y-6 max-w-4xl mx-auto pb-24 animate-fade-in">
            {/* ==================== HEADER PROFILE & STATS HUD ==================== */}
            <div className="relative overflow-hidden bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 md:p-7 text-slate-800 dark:text-slate-100 shadow-xl group">
                <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/10 dark:bg-amber-500/15 rounded-full blur-3xl pointer-events-none"></div>
                <div className="absolute bottom-0 left-0 w-60 h-60 bg-indigo-500/10 dark:bg-indigo-600/15 rounded-full blur-3xl pointer-events-none"></div>

                <div className="relative z-10 space-y-5">
                    {/* User Info Bar */}
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 overflow-hidden rounded-full flex items-center justify-center flex-shrink-0 bg-slate-100 dark:bg-slate-800 border-2 border-amber-400 shadow-md text-2xl">
                            {getAvatarDisplayNode(profile.avatar, profile.displayName || 'U', true)}
                        </div>
                        <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800/60 text-indigo-700 dark:text-indigo-400 text-[10px] font-mono font-bold uppercase tracking-wider">
                                    <Cpu className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
                                    <span>HỒ SƠ HỌC TẬP</span>
                                </div>
                                {isUserPremiumActive(profile) && (
                                    <span className="bg-gradient-to-r from-amber-500 to-yellow-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1 shadow-sm">
                                        <Crown className="w-2.5 h-2.5 fill-white text-white" />
                                        PREMIUM
                                    </span>
                                )}
                            </div>
                            <div className="flex items-center gap-2 flex-wrap">
                                <h2 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white tracking-tight truncate">
                                    {profile.displayName || 'Bạn'}
                                </h2>
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
                    <div className="bg-slate-50 dark:bg-slate-950/80 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
                        <div className="flex justify-between items-center text-xs font-bold font-mono text-slate-700 dark:text-slate-300">
                            <span className="flex items-center gap-1.5">
                                <Sparkle className="w-4 h-4 text-amber-500" /> Tiến trình Cấp độ {xpDetails.level}
                            </span>
                            <span className="text-indigo-600 dark:text-indigo-400 font-extrabold">{formatScore(xpDetails.remainingXp)} / {formatScore(xpDetails.nextLevelXp)} XP</span>
                        </div>
                        <div className="w-full h-2.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden p-0.5">
                            <div 
                                className="h-full bg-gradient-to-r from-amber-400 via-orange-400 to-emerald-400 rounded-full transition-all duration-500 ease-out shadow-sm"
                                style={{ width: `${Math.min(100, Math.round((xpDetails.remainingXp / xpDetails.nextLevelXp) * 100))}%` }}
                            />
                        </div>
                    </div>

                    {/* 5 Core Simple Stats Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 bg-slate-50 dark:bg-slate-950/80 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 font-mono">
                        <div className="text-center p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 shadow-sm">
                            <div className="text-lg md:text-xl font-black text-slate-900 dark:text-white leading-tight">{formatScore(totalCards)}</div>
                            <div className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase mt-1">Từ vựng</div>
                        </div>
                        <div className="text-center p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 shadow-sm">
                            <div className="text-lg md:text-xl font-black text-slate-900 dark:text-white leading-tight">{formatScore(kanjiSrsStats.total)}</div>
                            <div className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase mt-1">Kanji</div>
                        </div>
                        <div className="text-center p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 shadow-sm">
                            <div className="text-lg md:text-xl font-black text-emerald-600 dark:text-emerald-400 leading-tight">{formatScore(vocabMastery.mastered)}</div>
                            <div className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase mt-1">Từ đã thuộc</div>
                        </div>
                        <div className="text-center p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 shadow-sm">
                            <div className="text-lg md:text-xl font-black text-emerald-600 dark:text-emerald-400 leading-tight">{formatScore(kanjiSrsStats.mastered)}</div>
                            <div className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase mt-1">Kanji thuộc</div>
                        </div>
                        <div className="col-span-2 sm:col-span-1 text-center p-2 rounded-xl bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 border border-amber-200/60 dark:border-amber-900/40 shadow-sm">
                            <div className="text-lg md:text-xl font-black text-amber-600 dark:text-amber-400 leading-tight flex items-center justify-center gap-1">
                                <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                                {formatScore(myScore)}
                            </div>
                            <div className="text-[10px] text-amber-700 dark:text-amber-300 font-bold uppercase mt-1">Điểm XP</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ==================== 2 LEADERBOARD TABS SWITCHER ==================== */}
            <div className="flex items-center justify-center p-1.5 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 max-w-md mx-auto shadow-md">
                <button
                    onClick={() => { setActiveLeaderboardTab('weekly'); setDisplayCount(20); }}
                    className={`flex-1 py-2.5 px-4 rounded-2xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                        activeLeaderboardTab === 'weekly'
                            ? 'bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-white shadow-lg font-black scale-102'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                >
                    <Trophy className="w-4 h-4 text-yellow-300 fill-yellow-300" />
                    <span>🏆 Đua Top Tuần này</span>
                </button>

                <button
                    onClick={() => { setActiveLeaderboardTab('allTime'); setDisplayCount(20); }}
                    className={`flex-1 py-2.5 px-4 rounded-2xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                        activeLeaderboardTab === 'allTime'
                            ? 'bg-gradient-to-r from-indigo-600 via-sky-500 to-cyan-500 text-white shadow-lg font-black scale-102'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                >
                    <Crown className="w-4 h-4 text-amber-300 fill-amber-300" />
                    <span>👑 Bảng Vàng Cao Thủ</span>
                </button>
            </div>

            {/* ==================== BANNER / COUNTDOWN INFO ==================== */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-md p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h3 className="font-black text-slate-900 dark:text-white flex items-center gap-2 text-base">
                        {activeLeaderboardTab === 'weekly' ? (
                            <>
                                <Trophy className="w-5 h-5 text-amber-500 fill-amber-400" />
                                Bảng Xếp Hạng Năng Nổ Tuần Này
                            </>
                        ) : (
                            <>
                                <Crown className="w-5 h-5 text-amber-500 fill-amber-400" />
                                Bảng Vàng Cao Thủ Toàn Hệ Thống
                            </>
                        )}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        {activeLeaderboardTab === 'weekly'
                            ? 'Xếp hạng tất cả học viên theo tiến độ học, ôn tập và điểm XP tích lũy trong 7 ngày qua.'
                            : 'Vinh danh tất cả học viên có tổng điểm XP, số lượng từ vựng & chữ Hán xuất sắc nhất.'}
                    </p>
                </div>

                {activeLeaderboardTab === 'weekly' && timeLeft && (
                    <div className="flex items-center gap-2 px-3.5 py-1.5 bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 rounded-2xl border border-rose-200/60 dark:border-rose-900/40 font-mono text-xs font-bold w-fit shrink-0">
                        <Flame className="w-4 h-4 fill-rose-500 text-rose-500 animate-pulse" />
                        <span>Tổng kết sau: {timeLeft}</span>
                    </div>
                )}
            </div>

            {/* ==================== TOP 3 PODIUM DISPLAY ==================== */}
            {!searchTerm.trim() && podiumList.length > 0 && (
                <div className="max-w-2xl mx-auto my-2">
                    <div className="grid grid-cols-3 gap-2.5 sm:gap-4 pt-6 items-end">
                        {/* 2nd Place (Silver) */}
                        {podiumList[1] && (
                            <div className="flex flex-col items-center group cursor-pointer" onClick={() => handleToggleExpandUser(podiumList[1].id)}>
                                <div className="relative mb-2">
                                    <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full border-4 border-slate-300 overflow-hidden bg-white dark:bg-slate-800 shadow-lg group-hover:scale-105 transition-all">
                                        <div className="w-full h-full flex items-center justify-center text-xl bg-slate-100 dark:bg-slate-800">
                                            {getAvatarDisplayNode(podiumList[1].avatar, podiumList[1].displayName, podiumList[1].id === userId)}
                                        </div>
                                    </div>
                                    <div className="absolute -top-2.5 -right-1.5 bg-slate-300 text-slate-800 rounded-full w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center text-xs font-bold border-2 border-white shadow">
                                        2
                                    </div>
                                </div>
                                <div className="text-center bg-white dark:bg-slate-900 rounded-2xl p-2.5 sm:p-3.5 border border-slate-200 dark:border-slate-800 w-full shadow-md group-hover:shadow-lg transition-all">
                                    <p className="font-bold text-xs sm:text-sm truncate text-slate-800 dark:text-slate-100 max-w-full">
                                        {podiumList[1].displayName || 'Học viên'}
                                    </p>
                                    <p className="text-[10px] text-slate-400 mt-0.5 whitespace-nowrap">
                                        {formatScore(podiumList[1].totalCards || 0)} từ · {formatScore(podiumList[1].kanjiTotal || 0)} kanji
                                    </p>
                                    <div className="mt-1.5 text-indigo-600 dark:text-indigo-400 font-bold text-xs flex items-center justify-center gap-0.5 font-mono">
                                        <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
                                        {formatScore(activeLeaderboardTab === 'weekly' ? (podiumList[1].weeklyScore || podiumList[1].computedScore) : podiumList[1].computedScore)}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* 1st Place (Gold Crown) */}
                        {podiumList[0] && (
                            <div className="flex flex-col items-center group z-10 cursor-pointer" onClick={() => handleToggleExpandUser(podiumList[0].id)}>
                                <div className="relative mb-2">
                                    <div className="absolute -top-5 left-1/2 -translate-x-1/2 text-yellow-500 animate-bounce">
                                        <Crown className="w-7 h-7 fill-yellow-500 text-yellow-500 drop-shadow-md" />
                                    </div>
                                    <div className="w-18 h-18 sm:w-20 sm:h-20 rounded-full border-4 border-yellow-400 overflow-hidden bg-white dark:bg-slate-800 shadow-xl group-hover:scale-105 transition-all ring-4 ring-yellow-400/20">
                                        <div className="w-full h-full flex items-center justify-center text-2xl bg-amber-50 dark:bg-amber-950/20">
                                            {getAvatarDisplayNode(podiumList[0].avatar, podiumList[0].displayName, podiumList[0].id === userId)}
                                        </div>
                                    </div>
                                    <div className="absolute -top-1 -right-1 bg-yellow-400 text-yellow-950 rounded-full w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center text-xs sm:text-sm font-black border-2 border-white shadow">
                                        1
                                    </div>
                                </div>
                                <div className="text-center bg-gradient-to-b from-amber-50/80 to-white dark:from-amber-950/30 dark:to-slate-900 rounded-2xl p-3 sm:p-4 border-2 border-yellow-300 dark:border-yellow-600/40 w-full shadow-lg group-hover:shadow-xl transition-all ring-4 ring-yellow-400/10">
                                    <p className="font-black text-xs sm:text-base truncate text-yellow-800 dark:text-yellow-400 max-w-full">
                                        {podiumList[0].displayName || 'Học viên'}
                                    </p>
                                    <p className="text-[10px] text-slate-400 mt-0.5 whitespace-nowrap">
                                        {formatScore(podiumList[0].totalCards || 0)} từ · {formatScore(podiumList[0].kanjiTotal || 0)} kanji
                                    </p>
                                    <div className="mt-2 text-yellow-700 dark:text-yellow-300 font-black text-sm flex items-center justify-center gap-1 font-mono">
                                        <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                                        {formatScore(activeLeaderboardTab === 'weekly' ? (podiumList[0].weeklyScore || podiumList[0].computedScore) : podiumList[0].computedScore)}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* 3rd Place (Bronze) */}
                        {podiumList[2] && (
                            <div className="flex flex-col items-center group cursor-pointer" onClick={() => handleToggleExpandUser(podiumList[2].id)}>
                                <div className="relative mb-2">
                                    <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full border-4 border-amber-600 overflow-hidden bg-white dark:bg-slate-800 shadow-lg group-hover:scale-105 transition-all">
                                        <div className="w-full h-full flex items-center justify-center text-xl bg-orange-50 dark:bg-orange-950/20">
                                            {getAvatarDisplayNode(podiumList[2].avatar, podiumList[2].displayName, podiumList[2].id === userId)}
                                        </div>
                                    </div>
                                    <div className="absolute -top-2.5 -right-1.5 bg-amber-600 text-white rounded-full w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center text-xs font-bold border-2 border-white shadow">
                                        3
                                    </div>
                                </div>
                                <div className="text-center bg-white dark:bg-slate-900 rounded-2xl p-2.5 sm:p-3.5 border border-slate-200 dark:border-slate-800 w-full shadow-md group-hover:shadow-lg transition-all">
                                    <p className="font-bold text-xs sm:text-sm truncate text-slate-800 dark:text-slate-100 max-w-full">
                                        {podiumList[2].displayName || 'Học viên'}
                                    </p>
                                    <p className="text-[10px] text-slate-400 mt-0.5 whitespace-nowrap">
                                        {formatScore(podiumList[2].totalCards || 0)} từ · {formatScore(podiumList[2].kanjiTotal || 0)} kanji
                                    </p>
                                    <div className="mt-1.5 text-indigo-600 dark:text-indigo-400 font-bold text-xs flex items-center justify-center gap-0.5 font-mono">
                                        <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
                                        {formatScore(activeLeaderboardTab === 'weekly' ? (podiumList[2].weeklyScore || podiumList[2].computedScore) : podiumList[2].computedScore)}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ==================== MAIN LEADERBOARD LIST TABLE ==================== */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-md overflow-hidden">
                {/* Search and Sort Toolbar */}
                <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 space-y-4">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                        {/* Search Box */}
                        <div className="relative flex-1">
                            <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Search className="h-4 w-4 text-slate-400" />
                            </span>
                            <input
                                type="text"
                                placeholder="Tìm kiếm người học..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="block w-full pl-9 pr-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800/60 placeholder-slate-400 text-slate-800 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                            />
                        </div>

                        {/* Sort Options */}
                        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
                            <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 whitespace-nowrap">Sắp xếp:</span>
                            {[
                                { id: 'score', label: 'Điểm XP', icon: Star },
                                { id: 'vocab', label: 'Từ vựng', icon: BookOpen },
                                { id: 'kanji', label: 'Kanji', icon: Languages },
                                { id: 'mastered', label: 'Đã thuộc', icon: CheckCircle2 },
                                { id: 'streak', label: 'Streak', icon: Flame },
                            ].map(opt => {
                                const Icon = opt.icon;
                                const isActive = sortBy === opt.id;
                                return (
                                    <button
                                        key={opt.id}
                                        onClick={() => { setSortBy(opt.id); setDisplayCount(20); }}
                                        className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer whitespace-nowrap ${
                                            isActive
                                                ? 'bg-indigo-600 border-indigo-500 text-white shadow-sm'
                                                : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                                        }`}
                                    >
                                        <Icon className="w-3.5 h-3.5" />
                                        <span>{opt.label}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Unified User Rows */}
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                    {activeParticipants.length > 0 ? (
                        activeParticipants.slice(0, displayCount).map((user, idx) => {
                            const rank = idx + 1;
                            const isMe = user.id === userId;
                            const isExpanded = expandedUser === user.id;

                            const rankIcon = rank === 1 ? <Crown className="w-5 h-5 text-yellow-500 fill-yellow-100 dark:fill-yellow-900/30" />
                                : rank === 2 ? <Medal className="w-5 h-5 text-slate-400 fill-slate-100 dark:fill-slate-800" />
                                    : rank === 3 ? <Medal className="w-5 h-5 text-amber-600 fill-amber-100 dark:fill-amber-900/30" />
                                        : <span className="text-xs font-bold text-slate-400 dark:text-slate-500 w-5 text-center font-mono">#{rank}</span>;

                            const scoreValue = activeLeaderboardTab === 'weekly' 
                                ? (user.weeklyScore || user.computedScore || 0)
                                : (user.computedScore || 0);

                            return (
                                <div 
                                    key={user.id || idx}
                                    className={`transition-all duration-200 ${
                                        isMe 
                                            ? 'bg-indigo-50/40 dark:bg-indigo-950/30 ring-2 ring-indigo-400 dark:ring-indigo-500 ring-inset' 
                                            : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                                    }`}
                                >
                                    {/* Main Row */}
                                    <div 
                                        onClick={() => handleToggleExpandUser(user.id)}
                                        className="flex items-center gap-3 p-3.5 sm:p-4 cursor-pointer"
                                    >
                                        <div className="flex-shrink-0 w-7 flex justify-center">{rankIcon}</div>

                                        <div className="w-10 h-10 rounded-full overflow-hidden flex items-center justify-center flex-shrink-0 border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-lg font-bold">
                                            {getAvatarDisplayNode(user.avatar, user.displayName || 'U', isMe)}
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-1.5 flex-wrap">
                                                <p className={`text-sm font-bold truncate ${isMe ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-800 dark:text-slate-100'}`}>
                                                    {user.displayName || 'Học viên'}
                                                </p>
                                                {isMe && (
                                                    <span className="bg-indigo-600 text-white text-[8px] font-black px-1.5 py-0.5 rounded uppercase">
                                                        BẠN
                                                    </span>
                                                )}
                                                {user.level && (
                                                    <span className="bg-sky-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded uppercase">
                                                        LV {user.level}
                                                    </span>
                                                )}
                                                {user.title && (
                                                    <span className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-[8px] font-semibold px-1.5 py-0.5 rounded truncate max-w-[90px]">
                                                        {user.title}
                                                    </span>
                                                )}
                                                {isUserPremiumActive(user) && (
                                                    <span className="bg-gradient-to-r from-amber-500 to-yellow-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded uppercase flex items-center gap-0.5 shadow-sm">
                                                        <Crown className="w-2 h-2 fill-white text-white" />
                                                        PREMIUM
                                                    </span>
                                                )}
                                            </div>

                                            {/* Simple stats badges */}
                                            <div className="flex items-center gap-2 sm:gap-3 text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-1 flex-wrap">
                                                <span>📚 <strong>{formatScore(user.totalCards || 0)}</strong> từ ({formatScore(user.mastered || 0)} thuộc)</span>
                                                <span>·</span>
                                                <span>🈸 <strong>{formatScore(user.kanjiTotal || 0)}</strong> kanji ({formatScore(user.kanjiMastered || 0)} thuộc)</span>
                                                <span>·</span>
                                                <span className="flex items-center gap-0.5 text-orange-500">
                                                    <Flame className="w-3.5 h-3.5 fill-orange-500" />
                                                    <strong>{formatScore(user.streak || 0)}</strong> ngày
                                                </span>
                                            </div>
                                        </div>

                                        {/* Score */}
                                        <div className="text-right flex-shrink-0">
                                            <div className="text-sm sm:text-base font-black text-amber-600 dark:text-amber-400 flex items-center gap-1 justify-end font-mono">
                                                <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                                                {formatScore(scoreValue)}
                                            </div>
                                            <div className="text-[10px] text-slate-400 font-bold uppercase">
                                                {activeLeaderboardTab === 'weekly' ? 'Điểm tuần' : 'Tổng XP'}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Expanded User Details */}
                                    {isExpanded && (
                                        <div className="px-5 py-4 bg-slate-50/80 dark:bg-slate-950/60 border-t border-slate-100 dark:border-slate-800 space-y-3 animate-fade-in text-xs">
                                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 font-mono">
                                                <div className="p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                                                    <span className="text-slate-400 text-[10px] block font-sans">TỪ VỰNG HỌC TẬP</span>
                                                    <span className="text-slate-800 dark:text-slate-100 font-bold text-sm">
                                                        {formatScore(user.totalCards || 0)} từ
                                                    </span>
                                                    <span className="text-[10px] text-emerald-600 dark:text-emerald-450 text-emerald-500 block mt-0.5">
                                                        ✓ {formatScore(user.mastered || 0)} đã thuộc
                                                    </span>
                                                </div>
                                                <div className="p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                                                    <span className="text-slate-400 text-[10px] block font-sans">CHỮ HÁN (KANJI)</span>
                                                    <span className="text-slate-800 dark:text-slate-100 font-bold text-sm">
                                                        {formatScore(user.kanjiTotal || 0)} tự
                                                    </span>
                                                    <span className="text-[10px] text-emerald-600 dark:text-emerald-450 text-emerald-500 block mt-0.5">
                                                        ✓ {formatScore(user.kanjiMastered || 0)} đã thuộc
                                                    </span>
                                                </div>
                                                <div className="p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                                                    <span className="text-slate-400 text-[10px] block font-sans">CHUỖI NGÀY (STREAK)</span>
                                                    <span className="text-orange-500 font-bold text-sm flex items-center gap-1">
                                                        <Flame className="w-3.5 h-3.5 fill-orange-500" /> {formatScore(user.streak || 0)} ngày
                                                    </span>
                                                    <span className="text-[10px] text-slate-400 block mt-0.5 font-sans">
                                                        {formatLastActive(user.lastUpdated)}
                                                    </span>
                                                </div>
                                                <div className="p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                                                    <span className="text-slate-400 text-[10px] block font-sans">TỔNG ĐIỂM XP</span>
                                                    <span className="text-amber-500 font-bold text-sm flex items-center gap-1">
                                                        <Star className="w-3.5 h-3.5 fill-amber-400" /> {formatScore(user.computedScore || 0)} XP
                                                    </span>
                                                    <span className="text-[10px] text-indigo-600 dark:text-indigo-400 block mt-0.5 font-sans">
                                                        Cấp độ {user.level || 1}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    ) : (
                        <div className="p-10 text-center text-slate-400 text-sm">
                            <Users className="w-10 h-10 mx-auto mb-2 opacity-40" />
                            Không tìm thấy người học nào phù hợp.
                        </div>
                    )}
                </div>

                {/* Show More Button */}
                {activeParticipants.length > displayCount && (
                    <div className="p-4 text-center border-t border-slate-200 dark:border-slate-800">
                        <button
                            onClick={() => setDisplayCount(prev => prev + 20)}
                            className="px-6 py-2 text-xs font-bold bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl transition-all shadow-sm cursor-pointer"
                        >
                            Hiển thị thêm người học ({activeParticipants.length - displayCount} còn lại)
                        </button>
                    </div>
                )}
            </div>

            {/* ==================== STICKY BOTTOM BAR CHO USER ==================== */}
            {myRankInfo.rank > displayCount && (
                <div className="fixed bottom-0 left-0 right-0 lg:left-64 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 p-3.5 shadow-2xl z-30 transition-all flex items-center justify-between max-w-4xl mx-auto rounded-t-3xl border-x">
                    <div className="flex items-center gap-3">
                        <div className="bg-indigo-600 text-white font-black text-xs sm:text-sm px-3 py-1.5 rounded-xl shadow-sm font-mono">
                            #{myRankInfo.rank}
                        </div>
                        <div>
                            <p className="text-xs font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1">
                                {profile.displayName || 'Bạn'} (Bạn)
                            </p>
                            <p className="text-[10px] text-slate-400 font-medium">Bấm để theo dõi thứ hạng của bạn</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 text-xs font-mono font-bold">
                        <span className="text-slate-600 dark:text-slate-300">{formatScore(totalCards)} từ</span>
                        <span className="text-slate-600 dark:text-slate-300">{formatScore(kanjiSrsStats.total)} kanji</span>
                        <span className="flex items-center gap-0.5 text-amber-500">
                            <Star className="w-3.5 h-3.5 fill-amber-400" />
                            {formatScore(myScore)}
                        </span>
                    </div>
                </div>
            )}

            {/* ==================== RULES & GUIDELINES ACCORDION ==================== */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 md:p-5 shadow-sm transition-all">
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
                                <span>Quy chế & Thể lệ Điểm Bảng Xếp Hạng</span>
                                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/50">
                                    RULEBOOK
                                </span>
                            </h4>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                Cách tính điểm XP, thống kê từ vựng, chữ Hán và xếp hạng vinh danh.
                            </p>
                        </div>
                    </div>
                    <button className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 group-hover:bg-indigo-50 dark:group-hover:bg-indigo-950 group-hover:text-indigo-600 transition-all cursor-pointer">
                        {showRules ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                    </button>
                </div>

                {showRules && (
                    <div className="mt-5 pt-5 border-t border-slate-100 dark:border-slate-800 space-y-4 animate-fade-in text-xs">
                        <div className="bg-slate-50 dark:bg-slate-950/60 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 space-y-3">
                            <div className="flex items-center gap-2 font-bold text-xs text-indigo-700 dark:text-indigo-400 uppercase tracking-wider font-mono">
                                <Sparkle className="w-4 h-4 text-indigo-500" />
                                <span>1. Cách Tính Thống Kê & Thứ Hạng ⭐</span>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 font-mono">
                                <div className="p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                                    <span className="text-slate-400 text-[10px] block font-sans">TỪ VỰNG</span>
                                    <span className="font-bold text-slate-800 dark:text-slate-100">Tổng số từ tạo ra</span>
                                    <span className="text-[10px] text-emerald-600 block mt-0.5">+ Số từ đã thuộc</span>
                                </div>
                                <div className="p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                                    <span className="text-slate-400 text-[10px] block font-sans">KANJI</span>
                                    <span className="font-bold text-slate-800 dark:text-slate-100">Tổng chữ Hán học</span>
                                    <span className="text-[10px] text-emerald-600 block mt-0.5">+ Số Kanji đã thuộc</span>
                                </div>
                                <div className="p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                                    <span className="text-slate-400 text-[10px] block font-sans">ĐIỂM XP TUẦN</span>
                                    <span className="font-bold text-amber-600 dark:text-amber-400">Hoạt động trong 7 ngày</span>
                                    <span className="text-[10px] text-slate-400 block mt-0.5">Reset mỗi tuần</span>
                                </div>
                                <div className="p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                                    <span className="text-slate-400 text-[10px] block font-sans">BẢNG VÀNG CAO THỦ</span>
                                    <span className="font-bold text-indigo-600 dark:text-indigo-400">Tổng điểm tích lũy</span>
                                    <span className="text-[10px] text-slate-400 block mt-0.5">Không bị reset</span>
                                </div>
                            </div>
                        </div>

                        <div className="bg-slate-50 dark:bg-slate-950/60 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 space-y-3">
                            <div className="flex items-center gap-2 font-bold text-xs text-amber-700 dark:text-amber-400 uppercase tracking-wider font-mono">
                                <Flame className="w-4 h-4 text-amber-500" />
                                <span>2. Quy Định Thưởng XP Các Hoạt Động Học Tập ⚡</span>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 font-mono">
                                <div className="p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                                    <span className="text-slate-400 text-[10px] block font-sans font-bold">🔄 ÔN TỪ VỰNG (SRS)</span>
                                    <span className="text-slate-700 dark:text-slate-300">Tốt: <strong>+4</strong> | Dễ: <strong>+6 XP</strong></span>
                                </div>
                                <div className="p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                                    <span className="text-slate-400 text-[10px] block font-sans font-bold">🏮 ÔN KANJI (SRS)</span>
                                    <span className="text-slate-700 dark:text-slate-300">Tốt: <strong>+6</strong> | Dễ: <strong>+10 XP</strong></span>
                                </div>
                                <div className="p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                                    <span className="text-slate-400 text-[10px] block font-sans font-bold">🎴 FLASHCARD & BÀI HỌC</span>
                                    <span className="text-slate-700 dark:text-slate-300">Lật thẻ: <strong>+3 XP/thẻ</strong></span>
                                </div>
                                <div className="p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                                    <span className="text-slate-400 text-[10px] block font-sans font-bold">🎮 LUYỆN THI & QUIZ</span>
                                    <span className="text-slate-700 dark:text-slate-300">Trắc nghiệm: <strong>+2 XP/câu</strong></span>
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
                .scrollbar-none::-webkit-scrollbar {
                    display: none;
                }
                .scrollbar-none {
                    -ms-overflow-style: none;
                    scrollbar-width: none;
                }
            `}</style>
        </div>
    );
};

export default StatsScreen;
