import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Trophy, Crown, Medal, Star, Flame, BookOpen, Languages, Search, Users, Zap, Cpu, ChevronDown, ChevronUp, FileText, CheckCircle2 } from 'lucide-react';
import { collection, query, onSnapshot, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../../config/firebase';
import LoadingIndicator from '../ui/LoadingIndicator';
import { SafeAvatarImage } from '../ui';
import { isKanjiMastered, isSrsCardDue, isVocabCardMastered, getLearnAheadLimitMs } from '../../utils/srs';
import { getSharedKanjiList, subscribeKanjiSrs } from '../../utils/kanjiService';
import { getLevelFromXp, getLevelTitle, formatScore } from '../../utils/scoring';
import { formatLastActive, isUserOnline } from '../../utils/userActivityHelper';
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
const StatsScreen = ({ totalCards = 0, profile: rawProfile, allCards = [], dailyActivityLogs = [], userId, publicStatsPath }) => {
    const profile = rawProfile || {};
    const { t } = useLanguage();
    const LEADERBOARD_CACHE_KEY = 'quizki_cached_leaderboard';
    const [kanjiSrsStats, setKanjiSrsStats] = useState({ total: 0, learning: 0, mastered: 0, dueToday: 0 });
    const [leaderboardData, setLeaderboardData] = useState(() => {
        try {
            const cached = localStorage.getItem(LEADERBOARD_CACHE_KEY);
            if (cached) {
                const parsed = JSON.parse(cached);
                if (Array.isArray(parsed) && parsed.length > 0) return parsed;
            }
        } catch (_) {}
        return [];
    });
    const [searchTerm, setSearchTerm] = useState('');
    const [sortBy, setSortBy] = useState('score'); // 'score' | 'vocab' | 'kanji' | 'mastered' | 'streak'
    const [displayCount, setDisplayCount] = useState(20);
    const [expandedUser, setExpandedUser] = useState(null);
    const [loading, setLoading] = useState(() => {
        try {
            const cached = localStorage.getItem(LEADERBOARD_CACHE_KEY);
            if (cached && JSON.parse(cached).length > 0) return false;
        } catch (_) {}
        return true;
    });
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
                const threshold = now + getLearnAheadLimitMs();
                Object.entries(freshSrs || {}).forEach(([id, data]) => {
                    if (validKanjiIds.size > 0 && !validKanjiIds.has(id)) return;
                    total++;
                    if (isKanjiMastered(data)) mastered++;
                    else learning++;
                    if (isSrsCardDue(data, threshold)) dueToday++;
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

        // Safety timeout: tối đa 1.8s, không bao giờ để người dùng bị kẹt vô tận ở loading spinner
        const safetyTimer = setTimeout(() => {
            setLoading(false);
        }, 1800);

        const q = query(collection(db, publicStatsPath));
        const unsub = onSnapshot(q, { includeMetadataChanges: true }, (snap) => {
            clearTimeout(safetyTimer);
            const users = [];
            snap.docs.forEach(d => {
                const data = d.data();
                users.push({ id: d.id, ...data });
            });
            if (users.length > 0) {
                setLeaderboardData(users);
                try {
                    localStorage.setItem(LEADERBOARD_CACHE_KEY, JSON.stringify(users));
                } catch (_) {}
            }
            setLoading(false);
        }, (err) => {
            clearTimeout(safetyTimer);
            console.error('Lỗi tải dữ liệu bảng xếp hạng:', err);
            setLoading(false);
        });

        return () => {
            clearTimeout(safetyTimer);
            unsub();
        };
    }, [publicStatsPath]);

    // Tính toán chuỗi ngày streak của người dùng hiện tại
    const streak = useMemo(() => {
        if (!dailyActivityLogs || dailyActivityLogs.length === 0) return 0;
        const activeLogs = dailyActivityLogs.filter(log => 
            (log.newWordsAdded || 0) > 0 || 
            (log.newKanjiAdded || 0) > 0 || 
            (log.reviewsDone || 0) > 0 ||
            (log.cardsReviewed || 0) > 0 ||
            (log.xpGained || 0) > 0 ||
            (log.count || 0) > 0
        );
        if (activeLogs.length === 0) return 0;

        const logMap = new Map(activeLogs.map(l => [l.id, l]));

        const getLocalDateStr = (d) => {
            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        };

        const getUtcDateStr = (d) => d.toISOString().split('T')[0];

        const hasActivityOnDate = (d) => {
            const localStr = getLocalDateStr(d);
            const utcStr = getUtcDateStr(d);
            return logMap.has(localStr) || logMap.has(utcStr);
        };

        const today = new Date();
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);

        const hasToday = hasActivityOnDate(today);
        const hasYesterday = hasActivityOnDate(yesterday);

        if (!hasToday && !hasYesterday) return 0;

        let currentStreak = 0;
        let checkDate = new Date();
        if (!hasToday) checkDate = yesterday;

        while (true) {
            if (hasActivityOnDate(checkDate)) {
                currentStreak++;
                checkDate.setDate(checkDate.getDate() - 1);
            } else {
                break;
            }
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

    // Điểm XP của người dùng hiện tại (luôn lấy giá trị cao nhất giữa profile và leaderboard để tránh bị tụt/nhảy số)
    const myScore = useMemo(() => {
        const userProfileScore = computeScore(profile);
        const me = leaderboardData.find(u => u.id === userId);
        const meScore = computeScore(me);
        return Math.max(userProfileScore, meScore);
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
        const cutoffStr = `${sevenDaysAgo.getFullYear()}-${String(sevenDaysAgo.getMonth() + 1).padStart(2, '0')}-${String(sevenDaysAgo.getDate()).padStart(2, '0')}`;

        const last7DaysLogs = (dailyActivityLogs || []).filter(log => {
            if (!log || !log.id) return false;
            return String(log.id) >= cutoffStr;
        });

        const addedLast7Days = last7DaysLogs.reduce((s, l) => s + (l.newWordsAdded || 0), 0);
        const kanjiLast7Days = last7DaysLogs.reduce((s, l) => s + (l.newKanjiAdded || 0), 0);
        const reviewsLast7Days = last7DaysLogs.reduce((s, l) => s + (l.reviewsDone || 0) + (l.grammarReviewsDone || 0) + (l.cardsReviewed || 0), 0);
        const xpGainedLast7Days = last7DaysLogs.reduce((s, l) => s + (l.xpGained || 0), 0);
        const activeDaysLast7Days = last7DaysLogs.filter(l => 
            (l.newWordsAdded || 0) > 0 || 
            (l.newKanjiAdded || 0) > 0 || 
            (l.reviewsDone || 0) > 0 || 
            (l.grammarReviewsDone || 0) > 0 || 
            (l.cardsReviewed || 0) > 0 || 
            (l.xpGained || 0) > 0
        ).length;

        // Điểm tuần = max(tổng XP tích lũy 7 ngày qua, công thức ôn tập/chuyên cần)
        const formulaScore = (reviewsLast7Days * 4) + (addedLast7Days * 3) + (kanjiLast7Days * 5) + (activeDaysLast7Days * 15);
        const weeklyXp = Math.max(xpGainedLast7Days, formulaScore, reviewsLast7Days * 4);

        return {
            addedLast7Days,
            kanjiLast7Days,
            reviewsLast7Days,
            xpGainedLast7Days,
            activeDaysLast7Days,
            weeklyXp
        };
    }, [dailyActivityLogs]);

    // Tự động đồng bộ số liệu người dùng hiện tại vào Firestore publicStats (có kiểm tra chống lặp vòng vô tận)
    const lastSyncedPayloadRef = React.useRef('');

    useEffect(() => {
        if (!userId || !publicStatsPath || !db) return;
        const statsRef = doc(db, publicStatsPath, userId);
        const payload = {
            displayName: profile?.displayName || t('leaderboard.learner', 'Học viên'),
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
            weeklyScore: myWeeklyStats.weeklyXp || 0
        };

        const serialized = JSON.stringify(payload);
        if (lastSyncedPayloadRef.current === serialized) {
            return;
        }
        lastSyncedPayloadRef.current = serialized;

        setDoc(statsRef, {
            ...payload,
            lastActive: Date.now(),
            updatedAt: Date.now()
        }, { merge: true }).catch(e => console.warn('Lỗi đồng bộ public stats:', e));
    }, [
        userId, publicStatsPath, profile?.displayName, profile?.avatar, profile?.photoURL, 
        xpDetails.level, myScore, totalCards, vocabMastery.mastered, 
        kanjiSrsStats.total, kanjiSrsStats.mastered, streak, 
        myWeeklyStats.addedLast7Days, myWeeklyStats.kanjiLast7Days, myWeeklyStats.reviewsLast7Days, 
        myWeeklyStats.activeDaysLast7Days, myWeeklyStats.weeklyXp, t
    ]);

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
                displayName: isMe ? (profile?.displayName || t('leaderboard.you', 'Bạn')) : (u.displayName || t('leaderboard.learner', 'Học viên')),
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
                computedScore: isMe ? myScore : computedScore,
                ...(isMe ? { lastActive: Date.now(), updatedAt: Date.now(), lastUpdated: Date.now() } : {})
            };
        });

        // Nếu người dùng hiện tại chưa có trong leaderboardData thì đưa vào
        if (userId && !list.some(u => u.id === userId)) {
            list.push({
                id: userId,
                displayName: profile?.displayName || t('leaderboard.you', 'Bạn'),
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
                lastActive: Date.now(),
                updatedAt: Date.now(),
                lastUpdated: Date.now()
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
                displayName: isMe ? (profile?.displayName || t('leaderboard.you', 'Bạn')) : (u.displayName || t('leaderboard.learner', 'Học viên')),
                avatar: isMe ? (profile?.avatar || 'default') : (u.avatar || 'default'),
                level: isMe ? xpDetails.level : (u.level || 1),
                title: isMe ? getLevelTitle(xpDetails.level, t) : (u.title || getLevelTitle(u.level || 1, t)),
                totalCards: isMe ? totalCards : (Number(u.totalCards) || 0),
                mastered: isMe ? vocabMastery.mastered : (Number(u.mastered) || 0),
                kanjiTotal: isMe ? kanjiSrsStats.total : (Number(u.kanjiTotal) || 0),
                kanjiMastered: isMe ? kanjiSrsStats.mastered : (Number(u.kanjiMastered) || 0),
                streak: isMe ? streak : (Number(u.streak) || 0),
                computedScore: isMe ? myScore : computedScore,
                ...(isMe ? { lastActive: Date.now(), updatedAt: Date.now(), lastUpdated: Date.now() } : {})
            };
        });

        // Nếu người dùng hiện tại chưa có trong leaderboardData thì đưa vào
        if (userId && !list.some(u => u.id === userId)) {
            list.push({
                id: userId,
                displayName: profile?.displayName || t('leaderboard.you', 'Bạn'),
                avatar: profile?.avatar || 'default',
                level: xpDetails.level,
                title: getLevelTitle(xpDetails.level, t),
                totalCards: totalCards,
                mastered: vocabMastery.mastered,
                kanjiTotal: kanjiSrsStats.total,
                kanjiMastered: kanjiSrsStats.mastered,
                streak: streak,
                computedScore: myScore,
                lastActive: Date.now(),
                updatedAt: Date.now(),
                lastUpdated: Date.now()
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
        return <LoadingIndicator text={t('leaderboard.loading', 'Đang tải bảng xếp hạng...')} />;
    }

    return (
        <div className="space-y-5 sm:space-y-6 w-full max-w-4xl mx-auto px-2.5 sm:px-4 pb-24 animate-fade-in overflow-x-clip">
            {/* ==================== 2 LEADERBOARD TABS SWITCHER ==================== */}
            <div className="flex items-center justify-center p-1.5 bg-white dark:bg-slate-900 rounded-3xl border-2 border-slate-200 dark:border-slate-800 max-w-md mx-auto shadow-xs w-full">
                <button
                    onClick={() => { setActiveLeaderboardTab('weekly'); setDisplayCount(20); }}
                    className={`flex-1 py-2.5 px-4 rounded-2xl text-xs sm:text-sm font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer min-w-0 select-none ${
                        activeLeaderboardTab === 'weekly'
                            ? 'bg-amber-500 text-white border-b-4 border-amber-700 active:translate-y-0.5 active:border-b-0'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                >
                    <Trophy className="w-4 h-4 text-white fill-white shrink-0" />
                    <span className="truncate">{t('leaderboard.weeklyRaceTab', 'Đua Top Tuần này')}</span>
                </button>

                <button
                    onClick={() => { setActiveLeaderboardTab('allTime'); setDisplayCount(20); }}
                    className={`flex-1 py-2.5 px-4 rounded-2xl text-xs sm:text-sm font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer min-w-0 select-none ${
                        activeLeaderboardTab === 'allTime'
                            ? 'bg-sky-500 text-white border-b-4 border-sky-700 active:translate-y-0.5 active:border-b-0'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                >
                    <Crown className="w-4 h-4 text-white fill-white shrink-0" />
                    <span className="truncate">{t('leaderboard.allTimeTab', 'Bảng Vàng Cao Thủ')}</span>
                </button>
            </div>

            {/* ==================== BANNER / COUNTDOWN INFO ==================== */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 shadow-md p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
                <div>
                    <h3 className="font-black text-slate-900 dark:text-white flex items-center gap-2 text-sm sm:text-base">
                        {activeLeaderboardTab === 'weekly' ? (
                            <>
                                <Trophy className="w-4 h-4 sm:w-5 sm:h-5 text-amber-500 fill-amber-400 shrink-0" />
                                {t('leaderboard.weeklyRaceTitle', 'Bảng Xếp Hạng Năng Nổ Tuần Này')}
                            </>
                        ) : (
                            <>
                                <Crown className="w-4 h-4 sm:w-5 sm:h-5 text-amber-500 fill-amber-400 shrink-0" />
                                {t('leaderboard.allTimeTitle', 'Bảng Vàng Cao Thủ Toàn Hệ Thống')}
                            </>
                        )}
                    </h3>
                    <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                        {activeLeaderboardTab === 'weekly'
                            ? t('leaderboard.weeklyRaceSub', 'Xếp hạng tất cả học viên theo tiến độ học, ôn tập và điểm XP tích lũy trong 7 ngày qua.') : t('leaderboard.allTimeSub', 'Vinh danh tất cả học viên có tổng điểm XP, số lượng từ vựng & chữ Hán xuất sắc nhất.')}
                    </p>
                </div>

                {activeLeaderboardTab === 'weekly' && timeLeft && (
                    <div className="flex items-center gap-1.5 sm:gap-2 px-3 py-1.5 bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 rounded-xl sm:rounded-2xl border border-rose-200/60 dark:border-rose-900/40 font-mono text-[11px] sm:text-xs font-bold w-fit shrink-0">
                        <Flame className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-rose-500 text-rose-500 animate-pulse" />
                        <span>{t('leaderboard.resetsIn', 'Tổng kết sau: {time}').replace('{time}', timeLeft)}</span>
                    </div>
                )}
            </div>

            {/* ==================== TOP 3 PODIUM DISPLAY ==================== */}
            {!searchTerm.trim() && podiumList.length > 0 && (
                <div className="w-full max-w-2xl mx-auto my-1 sm:my-2 px-0.5">
                    <div className="grid grid-cols-3 gap-1.5 sm:gap-4 pt-5 sm:pt-6 items-end w-full">
                        {/* 2nd Place (Silver) */}
                        <div className="flex flex-col items-center min-w-0 w-full">
                            {podiumList[1] ? (
                                <div className="flex flex-col items-center group cursor-pointer w-full min-w-0" onClick={() => handleToggleExpandUser(podiumList[1].id)}>
                                    <div className="relative mb-1.5 sm:mb-2">
                                        <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full border-2 sm:border-4 border-slate-300 overflow-hidden bg-white dark:bg-slate-800 shadow-md group-hover:scale-105 transition-all">
                                            <div className="w-full h-full flex items-center justify-center text-base sm:text-xl bg-slate-100 dark:bg-slate-800">
                                                {getAvatarDisplayNode(podiumList[1].avatar, podiumList[1].displayName, podiumList[1].id === userId)}
                                            </div>
                                        </div>
                                        <div className="absolute -top-1.5 -right-1 bg-slate-300 text-slate-800 rounded-full w-4 h-4 sm:w-6 sm:h-6 flex items-center justify-center text-[10px] sm:text-xs font-bold border-2 border-white shadow">
                                            2
                                        </div>
                                    </div>
                                    <div className="text-center bg-white dark:bg-slate-900 rounded-xl sm:rounded-2xl p-1.5 sm:p-3.5 border border-slate-200 dark:border-slate-800 w-full shadow-sm group-hover:shadow-md transition-all min-w-0">
                                        <div className="flex items-center justify-center gap-1 max-w-full">
                                            <p className="font-bold text-[11px] sm:text-sm truncate text-slate-800 dark:text-slate-100">
                                                {podiumList[1].displayName || t('leaderboard.learner', 'Học viên')}
                                            </p>
                                            {isUserPremiumActive(podiumList[1].id === userId ? profile : podiumList[1]) && (
                                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-amber-500/15 border border-amber-500/30 text-[9px] font-black text-amber-600 dark:text-amber-400 shrink-0">
                                                    <Crown className="w-2.5 h-2.5 fill-amber-500 text-amber-500" />
                                                    <span>PREMIUM</span>
                                                </span>
                                            )}
                                        </div>
                                        <div className="mt-1 sm:mt-1.5 text-slate-700 dark:text-slate-200 font-black text-[10px] sm:text-xs flex items-center justify-center gap-0.5 font-mono">
                                            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400 shrink-0" />
                                            <span className="truncate">{formatScore(activeLeaderboardTab === 'weekly' ? (podiumList[1].weeklyScore || 0) : podiumList[1].computedScore)} XP</span>
                                        </div>
                                    </div>
                                </div>
                            ) : <div className="w-full" />}
                        </div>

                        {/* 1st Place (Gold Crown) */}
                        <div className="flex flex-col items-center min-w-0 w-full z-10">
                            {podiumList[0] ? (
                                <div className="flex flex-col items-center group cursor-pointer w-full min-w-0" onClick={() => handleToggleExpandUser(podiumList[0].id)}>
                                    <div className="relative mb-1.5 sm:mb-2">
                                        <div className="absolute -top-4 sm:-top-5 left-1/2 -translate-x-1/2 text-yellow-500 animate-bounce">
                                            <Crown className="w-5 h-5 sm:w-7 sm:h-7 fill-yellow-500 text-yellow-500 drop-shadow-md" />
                                        </div>
                                        <div className="w-14 h-14 sm:w-20 sm:h-20 rounded-full border-3 sm:border-4 border-yellow-400 overflow-hidden bg-white dark:bg-slate-800 shadow-lg group-hover:scale-105 transition-all ring-2 sm:ring-4 ring-yellow-400/20">
                                            <div className="w-full h-full flex items-center justify-center text-lg sm:text-2xl bg-amber-50 dark:bg-amber-950/20">
                                                {getAvatarDisplayNode(podiumList[0].avatar, podiumList[0].displayName, podiumList[0].id === userId)}
                                            </div>
                                        </div>
                                        <div className="absolute -top-1 -right-1 bg-yellow-400 text-yellow-950 rounded-full w-5 h-5 sm:w-7 sm:h-7 flex items-center justify-center text-[10px] sm:text-sm font-black border-2 border-white shadow">
                                            1
                                        </div>
                                    </div>
                                    <div className="text-center bg-amber-50/50 dark:bg-amber-950/20 rounded-xl sm:rounded-2xl p-2 sm:p-4 border-2 border-amber-300 dark:border-amber-600/40 w-full shadow-sm group-hover:shadow-md transition-all min-w-0">
                                        <div className="flex items-center justify-center gap-1.5 max-w-full">
                                            <p className="font-black text-xs sm:text-base truncate text-amber-900 dark:text-amber-300">
                                                {podiumList[0].displayName || t('leaderboard.learner', 'Học viên')}
                                            </p>
                                            {isUserPremiumActive(podiumList[0].id === userId ? profile : podiumList[0]) && (
                                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-amber-500/20 text-amber-800 dark:text-amber-300 text-[9px] font-black border border-amber-500/40 shrink-0">
                                                    <Crown className="w-2.5 h-2.5 fill-amber-500 text-amber-500" />
                                                    <span>PREMIUM</span>
                                                </span>
                                            )}
                                        </div>
                                        <div className="mt-1 sm:mt-2 text-amber-700 dark:text-amber-300 font-black text-[11px] sm:text-sm flex items-center justify-center gap-0.5 sm:gap-1 font-mono">
                                            <Star className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-amber-400 text-amber-400 shrink-0" />
                                            <span className="truncate">{formatScore(activeLeaderboardTab === 'weekly' ? (podiumList[0].weeklyScore || 0) : podiumList[0].computedScore)} XP</span>
                                        </div>
                                    </div>
                                </div>
                            ) : <div className="w-full" />}
                        </div>

                        {/* 3rd Place (Bronze) */}
                        <div className="flex flex-col items-center min-w-0 w-full">
                            {podiumList[2] ? (
                                <div className="flex flex-col items-center group cursor-pointer w-full min-w-0" onClick={() => handleToggleExpandUser(podiumList[2].id)}>
                                    <div className="relative mb-1.5 sm:mb-2">
                                        <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full border-2 sm:border-4 border-amber-600 overflow-hidden bg-white dark:bg-slate-800 shadow-md group-hover:scale-105 transition-all">
                                            <div className="w-full h-full flex items-center justify-center text-base sm:text-xl bg-orange-50 dark:bg-orange-950/20">
                                                {getAvatarDisplayNode(podiumList[2].avatar, podiumList[2].displayName, podiumList[2].id === userId)}
                                            </div>
                                        </div>
                                        <div className="absolute -top-1.5 -right-1 bg-amber-600 text-white rounded-full w-4 h-4 sm:w-6 sm:h-6 flex items-center justify-center text-[10px] sm:text-xs font-bold border-2 border-white shadow">
                                            3
                                        </div>
                                    </div>
                                    <div className="text-center bg-white dark:bg-slate-900 rounded-xl sm:rounded-2xl p-1.5 sm:p-3.5 border border-slate-200 dark:border-slate-800 w-full shadow-sm group-hover:shadow-md transition-all min-w-0">
                                        <div className="flex items-center justify-center gap-1 max-w-full">
                                            <p className="font-bold text-[11px] sm:text-sm truncate text-slate-800 dark:text-slate-100">
                                                {podiumList[2].displayName || t('leaderboard.learner', 'Học viên')}
                                            </p>
                                            {isUserPremiumActive(podiumList[2].id === userId ? profile : podiumList[2]) && (
                                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-amber-500/15 border border-amber-500/30 text-[9px] font-black text-amber-600 dark:text-amber-400 shrink-0">
                                                    <Crown className="w-2.5 h-2.5 fill-amber-500 text-amber-500" />
                                                    <span>PREMIUM</span>
                                                </span>
                                            )}
                                        </div>
                                        <div className="mt-1 sm:mt-1.5 text-slate-700 dark:text-slate-200 font-black text-[10px] sm:text-xs flex items-center justify-center gap-0.5 font-mono">
                                            <Star className="w-3 h-3 sm:w-3.5 sm:h-3.5 fill-amber-400 text-amber-400 shrink-0" />
                                            <span className="truncate">{formatScore(activeLeaderboardTab === 'weekly' ? (podiumList[2].weeklyScore || 0) : podiumList[2].computedScore)} XP</span>
                                        </div>
                                    </div>
                                </div>
                            ) : <div className="w-full" />}
                        </div>
                    </div>
                </div>
            )}

            {/* ==================== MAIN LEADERBOARD LIST TABLE ==================== */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 shadow-md overflow-hidden">
                {/* Search and Sort Toolbar */}
                <div className="p-3.5 sm:p-5 border-b border-slate-200 dark:border-slate-800 space-y-3 sm:space-y-4">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                        {/* Search Box */}
                        <div className="relative flex-1">
                            <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Search className="h-4 w-4 text-slate-400" />
                            </span>
                            <input
                                type="text"
                                placeholder={t('leaderboard.searchLearnerPlaceholder', 'Tìm kiếm người học...')}
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="block w-full pl-9 pr-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800/60 placeholder-slate-400 text-slate-800 dark:text-slate-100 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                            />
                        </div>

                        {/* Sort Options */}
                        <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-1 md:pb-0 scrollbar-none py-1">
                            <span className="text-[10px] sm:text-[11px] font-bold text-slate-400 dark:text-slate-500 whitespace-nowrap">{t('leaderboard.sortBy', 'Sắp xếp:')}</span>
                            {[
                                { id: 'score', label: t('leaderboard.sortScore', 'Điểm XP'), icon: Star },
                                { id: 'vocab', label: t('leaderboard.sortVocab', 'Từ vựng'), icon: BookOpen },
                                { id: 'kanji', label: 'Kanji', icon: Languages },
                                { id: 'mastered', label: t('leaderboard.sortMastered', 'Đã thuộc'), icon: CheckCircle2 },
                                { id: 'streak', label: 'Streak', icon: Flame },
                            ].map(opt => {
                                const Icon = opt.icon;
                                const isActive = sortBy === opt.id;
                                return (
                                    <button
                                        key={opt.id}
                                        onClick={() => { setSortBy(opt.id); setDisplayCount(20); }}
                                        className={`flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl text-xs font-black transition-all cursor-pointer whitespace-nowrap select-none ${
                                            isActive
                                                ? 'bg-emerald-500 text-white border-2 border-emerald-600 border-b-4 border-b-emerald-700 active:translate-y-0.5 active:border-b-2 shadow-xs'
                                                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-2 border-slate-200 dark:border-slate-700 border-b-4 border-b-slate-300 dark:border-b-slate-900 hover:border-slate-300 hover:bg-slate-50 dark:hover:bg-slate-750 active:translate-y-0.5 active:border-b-2'
                                        }`}
                                    >
                                        <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-slate-500 dark:text-slate-400'}`} />
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

                            const rankIcon = rank === 1 ? <Crown className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-500 fill-yellow-100 dark:fill-yellow-900/30" />
                                : rank === 2 ? <Medal className="w-4 h-4 sm:w-5 sm:h-5 text-slate-400 fill-slate-100 dark:fill-slate-800" />
                                    : rank === 3 ? <Medal className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600 fill-amber-100 dark:fill-amber-900/30" />
                                        : <span className="text-[11px] sm:text-xs font-bold text-slate-400 dark:text-slate-500 w-5 text-center font-mono">#{rank}</span>;

                            const scoreValue = activeLeaderboardTab === 'weekly' 
                                ? (user.weeklyScore || 0)
                                : (user.computedScore || 0);

                            return (
                                <div 
                                    key={user.id || idx}
                                    className={`transition-all duration-200 ${
                                        isMe 
                                            ? 'bg-emerald-50/40 dark:bg-emerald-950/30 ring-2 ring-emerald-400 dark:ring-emerald-500 ring-inset' 
                                            : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                                    }`}
                                >
                                    {/* Main Row */}
                                    <div 
                                        onClick={() => handleToggleExpandUser(user.id)}
                                        className="flex items-center gap-2.5 sm:gap-3 p-3 sm:p-4 cursor-pointer"
                                    >
                                        <div className="flex-shrink-0 w-6 sm:w-7 flex justify-center">{rankIcon}</div>

                                        <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full overflow-hidden flex items-center justify-center flex-shrink-0 border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-base sm:text-lg font-bold">
                                            {getAvatarDisplayNode(user.avatar, user.displayName || 'U', isMe)}
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                                                <p className={`text-sm sm:text-base font-bold truncate ${isMe ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-800 dark:text-slate-100'}`}>
                                                    {user.displayName || t('leaderboard.learner', 'Học viên')}
                                                </p>
                                                {isMe && (
                                                    <span className="bg-emerald-600 text-white text-[9px] font-black px-2 py-0.5 rounded-full uppercase shrink-0">
                                                        {t('leaderboard.youBadge', 'BẠN')}
                                                    </span>
                                                )}
                                                {(isMe ? isUserPremiumActive(profile) : isUserPremiumActive(user)) && (
                                                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-amber-500/15 border border-amber-500/30 text-[9px] sm:text-[10px] font-black text-amber-600 dark:text-amber-400 shrink-0">
                                                        <Crown className="w-2.5 h-2.5 sm:w-3 sm:h-3 fill-amber-500 text-amber-500" />
                                                        <span>PREMIUM</span>
                                                    </span>
                                                )}
                                                {user.streak > 0 && (
                                                    <span className="flex items-center gap-1 text-xs font-bold text-amber-500 shrink-0">
                                                        <Flame className="w-3.5 h-3.5 fill-amber-500" />
                                                        {user.streak}
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Score (Duolingo XP style) */}
                                        <div className="text-right flex-shrink-0 pl-2">
                                            <div className="text-sm sm:text-base font-black text-slate-700 dark:text-slate-200">
                                                {formatScore(scoreValue)} <span className="text-xs text-slate-400 font-bold">XP</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Expanded User Details */}
                                    {isExpanded && (
                                        <div className="px-5 py-4 bg-slate-50/80 dark:bg-slate-950/60 border-t border-slate-100 dark:border-slate-800 space-y-3 animate-fade-in text-xs">
                                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 font-mono">
                                                <div className="p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                                                    <span className="text-slate-400 text-[10px] block font-sans">{t('leaderboard.vocabStudyHeading', 'TỪ VỰNG HỌC TẬP')}</span>
                                                    <span className="text-slate-800 dark:text-slate-100 font-bold text-sm">
                                                        {t('leaderboard.wordsCount', '{count} từ').replace('{count}', formatScore(user.totalCards || 0))}
                                                    </span>
                                                    <span className="text-[10px] text-emerald-600 dark:text-emerald-450 text-emerald-500 block mt-0.5">
                                                        {t('leaderboard.masteredCount', '✓ {count} đã thuộc').replace('{count}', formatScore(user.mastered || 0))}
                                                    </span>
                                                </div>
                                                <div className="p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                                                    <span className="text-slate-400 text-[10px] block font-sans">{t('leaderboard.kanjiStudyHeading', 'CHỮ HÁN (KANJI)')}</span>
                                                    <span className="text-slate-800 dark:text-slate-100 font-bold text-sm">
                                                        {t('leaderboard.kanjiCount', '{count} tự').replace('{count}', formatScore(user.kanjiTotal || 0))}
                                                    </span>
                                                    <span className="text-[10px] text-emerald-600 dark:text-emerald-450 text-emerald-500 block mt-0.5">
                                                        {t('leaderboard.masteredCount', '✓ {count} đã thuộc').replace('{count}', formatScore(user.kanjiMastered || 0))}
                                                    </span>
                                                </div>
                                                <div className="p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                                                    <span className="text-slate-400 text-[10px] block font-sans">{t('leaderboard.streakHeading', 'CHUỖI NGÀY (STREAK)')}</span>
                                                    <span className="text-orange-500 font-bold text-sm flex items-center gap-1">
                                                        <Flame className="w-3.5 h-3.5 fill-orange-500" /> {t('leaderboard.streakCount', '{count} ngày').replace('{count}', formatScore(user.streak || 0))}
                                                    </span>
                                                    <span className="text-[10px] text-slate-400 block mt-0.5 font-sans">
                                                        {formatLastActive(user)}
                                                    </span>
                                                </div>
                                                <div className="p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                                                    <span className="text-slate-400 text-[10px] block font-sans">{t('leaderboard.totalXpHeading', 'TỔNG ĐIỂM XP')}</span>
                                                    <span className="text-amber-500 font-bold text-sm flex items-center gap-1">
                                                        <Star className="w-3.5 h-3.5 fill-amber-400" /> {formatScore(user.computedScore || 0)} XP
                                                    </span>
                                                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 block mt-0.5 font-sans">
                                                        {t('leaderboard.userLevel', 'Cấp độ {level}').replace('{level}', user.level || 1)}
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
                            {t('leaderboard.noLearnerFound', 'Không tìm thấy người học nào phù hợp.')}
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
                            {t('leaderboard.showMoreLearners', 'Hiển thị thêm người học ({count} còn lại)').replace('{count}', activeParticipants.length - displayCount)}
                        </button>
                    </div>
                )}
            </div>

            {/* ==================== STICKY BOTTOM BAR CHO USER ==================== */}
            {myRankInfo.rank > displayCount && (
                <div className="fixed bottom-0 left-0 right-0 lg:left-44 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 p-3.5 shadow-2xl z-30 transition-all flex items-center justify-between max-w-4xl mx-auto rounded-t-3xl border-x">
                    <div className="flex items-center gap-3">
                        <div className="bg-emerald-600 text-white font-black text-xs sm:text-sm px-3 py-1.5 rounded-xl shadow-sm font-mono">
                            #{myRankInfo.rank}
                        </div>
                        <div>
                            <p className="text-xs font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5 flex-wrap">
                                <span>{profile?.displayName || t('leaderboard.you', 'Bạn')} ({t('leaderboard.you', 'Bạn')})</span>
                                {isUserPremiumActive(profile) && (
                                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-amber-500/15 border border-amber-500/30 text-[9px] font-black text-amber-600 dark:text-amber-400 shrink-0">
                                        <Crown className="w-2.5 h-2.5 fill-amber-500 text-amber-500" />
                                        <span>PREMIUM</span>
                                    </span>
                                )}
                            </p>
                            <p className="text-[10px] text-slate-400 font-medium">{t('leaderboard.clickToTrackRank', 'Bấm để theo dõi thứ hạng của bạn')}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <span className="text-sm font-black text-slate-800 dark:text-slate-100">{formatScore(myScore)}</span>
                        <span className="text-xs text-slate-400 font-bold">XP</span>
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
                        <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/60 dark:border-emerald-800/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400 group-hover:scale-105 transition-transform">
                            <FileText className="w-5 h-5" />
                        </div>
                        <div>
                            <h4 className="text-sm md:text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                                <span>{t('leaderboard.rulesTitle', 'Quy chế & Thể lệ Điểm Bảng Xếp Hạng')}</span>
                                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50">
                                    RULEBOOK
                                </span>
                            </h4>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                {t('leaderboard.rulesSub', 'Cách tính điểm XP, thống kê từ vựng, chữ Hán và xếp hạng vinh danh.')}
                            </p>
                        </div>
                    </div>
                    <button className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 group-hover:bg-emerald-50 dark:group-hover:bg-emerald-950 group-hover:text-emerald-600 transition-all cursor-pointer">
                        {showRules ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                    </button>
                </div>

                {showRules && (
                    <div className="mt-5 pt-5 border-t border-slate-100 dark:border-slate-800 space-y-4 animate-fade-in text-xs">
                        <div className="bg-slate-50 dark:bg-slate-950/60 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 space-y-3">
                            <div className="flex items-center gap-2 font-bold text-xs text-emerald-700 dark:text-emerald-400 uppercase tracking-wider font-mono">
                                <Zap className="w-4 h-4 text-emerald-500" />
                                <span>{t('leaderboard.section1Title', '1. Cách Tính Thống Kê & Thứ Hạng ⭐')}</span>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 font-mono">
                                <div className="p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                                    <span className="text-slate-400 text-[10px] block font-sans">{t('leaderboard.vocabCardLabel', 'TỪ VỰNG')}</span>
                                    <span className="font-bold text-slate-800 dark:text-slate-100">{t('leaderboard.totalCreatedWords', 'Tổng số từ tạo ra')}</span>
                                    <span className="text-[10px] text-emerald-600 block mt-0.5">{t('leaderboard.plusMasteredWords', '+ Số từ đã thuộc')}</span>
                                </div>
                                <div className="p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                                    <span className="text-slate-400 text-[10px] block font-sans">KANJI</span>
                                    <span className="font-bold text-slate-800 dark:text-slate-100">{t('leaderboard.totalLearnedKanji', 'Tổng chữ Hán học')}</span>
                                    <span className="text-[10px] text-emerald-600 block mt-0.5">{t('leaderboard.plusMasteredKanji', '+ Số Kanji đã thuộc')}</span>
                                </div>
                                <div className="p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                                    <span className="text-slate-400 text-[10px] block font-sans">{t('leaderboard.weeklyXpLabel', 'ĐIỂM XP TUẦN')}</span>
                                    <span className="font-bold text-amber-600 dark:text-amber-400">{t('leaderboard.weeklyXpDesc', 'Hoạt động trong 7 ngày')}</span>
                                    <span className="text-[10px] text-slate-400 block mt-0.5">{t('leaderboard.weeklyXpReset', 'Reset mỗi tuần')}</span>
                                </div>
                                <div className="p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                                    <span className="text-slate-400 text-[10px] block font-sans">{t('leaderboard.hallOfFameLabel', 'BẢNG VÀNG CAO THỦ')}</span>
                                    <span className="font-bold text-emerald-600 dark:text-emerald-400">{t('leaderboard.accumulatedXp', 'Tổng điểm tích lũy')}</span>
                                    <span className="text-[10px] text-slate-400 block mt-0.5">{t('leaderboard.noReset', 'Không bị reset')}</span>
                                </div>
                            </div>
                        </div>

                        <div className="bg-slate-50 dark:bg-slate-950/60 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 space-y-3">
                            <div className="flex items-center gap-2 font-bold text-xs text-amber-700 dark:text-amber-400 uppercase tracking-wider font-mono">
                                <Flame className="w-4 h-4 text-amber-500" />
                                <span>{t('leaderboard.section2Title', '2. Quy Định Thưởng XP Các Hoạt Động Học Tập ⚡')}</span>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 font-mono">
                                <div className="p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                                    <span className="text-slate-400 text-[10px] block font-sans font-bold">{t('leaderboard.vocabSrsReward', '🔄 ÔN TỪ VỰNG (SRS)')}</span>
                                    <span className="text-slate-700 dark:text-slate-300">{t('leaderboard.vocabSrsRewardDetail', 'Tốt: +4 | Dễ: +6 XP')}</span>
                                </div>
                                <div className="p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                                    <span className="text-slate-400 text-[10px] block font-sans font-bold">{t('leaderboard.kanjiSrsReward', '🏮 ÔN KANJI (SRS)')}</span>
                                    <span className="text-slate-700 dark:text-slate-300">{t('leaderboard.kanjiSrsRewardDetail', 'Tốt: +6 | Dễ: +10 XP')}</span>
                                </div>
                                <div className="p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                                    <span className="text-slate-400 text-[10px] block font-sans font-bold">{t('leaderboard.flashcardReward', '🎴 FLASHCARD & BÀI HỌC')}</span>
                                    <span className="text-slate-700 dark:text-slate-300">{t('leaderboard.flashcardRewardDetail', 'Lật thẻ: +3 XP/thẻ')}</span>
                                </div>
                                <div className="p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                                    <span className="text-slate-400 text-[10px] block font-sans font-bold">{t('leaderboard.quizReward', '🎮 LUYỆN THI & QUIZ')}</span>
                                    <span className="text-slate-700 dark:text-slate-300">{t('leaderboard.quizRewardDetail', 'Trắc nghiệm: +2 XP/câu')}</span>
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
