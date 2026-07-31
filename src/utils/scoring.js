export const getLevelFromXp = (xp) => {
    let level = 1;
    let remainingXp = xp || 0;
    while (true) {
        const required = Math.round(100 * Math.pow(level, 1.5));
        if (remainingXp >= required) {
            remainingXp -= required;
            level++;
        } else {
            break;
        }
    }
    return { level, remainingXp, nextLevelXp: Math.round(100 * Math.pow(level, 1.5)) };
};

export const getLevelTitle = (level, t) => {
    if (!t) {
        if (level < 10) return '🌱 Người mới bắt đầu';
        if (level < 25) return '📖 Học giả tập sự';
        if (level < 50) return '⚔️ Chiến binh ngôn ngữ';
        if (level < 75) return '🧙‍♂️ Bậc thầy từ vựng';
        if (level < 100) return '👑 Huyền thoại tiếng Nhật';
        return '🪐 Vô song';
    }
    if (level < 10) return t('leaderboard.levelTitles.beginner', '🌱 Người mới bắt đầu');
    if (level < 25) return t('leaderboard.levelTitles.apprentice', '📖 Học giả tập sự');
    if (level < 50) return t('leaderboard.levelTitles.warrior', '⚔️ Chiến binh ngôn ngữ');
    if (level < 75) return t('leaderboard.levelTitles.master', '🧙‍♂️ Bậc thầy từ vựng');
    if (level < 100) return t('leaderboard.levelTitles.legend', '👑 Huyền thoại tiếng Nhật');
    return t('leaderboard.levelTitles.unrivaled', '🪐 Vô song');
};

export const getTranslatedLeagueName = (league, t) => {
    if (!t) return league;
    if (league === 'Đồng') return t('leaderboard.leagueBronze', 'Đồng');
    if (league === 'Bạc') return t('leaderboard.leagueSilver', 'Bạc');
    if (league === 'Vàng') return t('leaderboard.leagueGold', 'Vàng');
    if (league === 'Kim Cương') return t('leaderboard.leagueDiamond', 'Kim Cương');
    if (league === 'Huyền Thoại') return t('leaderboard.leagueLegend', 'Huyền Thoại');
    return league;
};

// Helper to format scores with K notation (e.g. 1250 -> 1.3K, 15500 -> 15.5K)
export const formatScore = (num) => {
    if (num === null || num === undefined || isNaN(num)) return '0';
    const val = Number(num);
    if (val < 1000) return String(val);
    if (val < 1000000) {
        const formatted = (val / 1000).toFixed(1);
        return formatted.endsWith('.0') ? `${Math.floor(val / 1000)}K` : `${formatted}K`;
    }
    const formatted = (val / 1000000).toFixed(1);
    return formatted.endsWith('.0') ? `${Math.floor(val / 1000000)}M` : `${formatted}M`;
};

/**
 * Single source of truth for Leaderboard Honor Score calculation.
 * Formula: Score = TotalXP + (MasteredVocab * 10) + (MasteredKanji * 25) + (Streak * 30) + (ActiveDays * 15)
 */
export const calculateHonorScore = ({ xp = 0, mastered = 0, kanjiMastered = 0, streak = 0, activeDays = 0 } = {}) => {
    const safeXp = Number(xp) || 0;
    const safeMastered = Number(mastered) || 0;
    const safeKanji = Number(kanjiMastered) || 0;
    const safeStreak = Number(streak) || 0;
    const safeActiveDays = Number(activeDays) || 0;

    return Math.round(
        safeXp +
        (safeMastered * 10) +
        (safeKanji * 25) +
        (safeStreak * 30) +
        (safeActiveDays * 15)
    );
};

// Balanced Anti-Inflationary Points configuration
export const POINTS = {
    // Initial learning/practice modes
    PRACTICE_FLASHCARD_STUDY: 3,
    PRACTICE_AUXILIARY: 2, // Back Review, Synonym, Example, Dictation

    // Spaced Repetition (SRS) Reviews - Vocabulary
    SRS_VOCAB: {
        again: 1,
        hard: 2,
        good: 4,
        easy: 6
    },

    // Spaced Repetition (SRS) Reviews - Kanji
    SRS_KANJI: {
        again: 1,
        hard: 3,
        good: 6,
        easy: 10
    },

    // New Features & Additional Modes
    JLPT_TEST: {
        correct_question: 2,
        test_completion_bonus: 20
    },
    AI_KAIWA: {
        session_completion: 10
    },
    BOOK_LESSON: {
        card_learned: 2,
        lesson_completion: 10
    },
    STUDY_SET: {
        card_learned: 3,
        set_completion_bonus: 10
    },

    // Promotion bonuses
    PROMOTION: {
        to_learning: 3,
        to_mastered: 15
    },

    // Consistency
    DAILY_GOAL: 15,
    PERFECT_SESSION: 5,
    STREAK_MULTIPLIER: 2,
    MAX_STREAK_BONUS: 20,

    // Anti-spam limits
    DAILY_LIMIT: Infinity, // Unlimited XP per day for dedicated learners!
    MIN_TIME_THRESHOLD_MS: 1500
};

// Leagues configuration (5 streamlined competitive leagues)
export const LEAGUES = [
    'Đồng',
    'Bạc',
    'Vàng',
    'Kim Cương',
    'Huyền Thoại'
];

export const LEAGUE_ICONS = {
    'Đồng': '/ranks/bronze.svg',
    'Bạc': '/ranks/silver.svg',
    'Vàng': '/ranks/gold.svg',
    'Kim Cương': '/ranks/diamond.svg',
    'Huyền Thoại': '/ranks/challenger.svg'
};

export const LEAGUE_COLORS = {
    'Đồng': 'from-amber-700 to-amber-900 text-amber-100 border-amber-600',
    'Bạc': 'from-slate-400 to-slate-600 text-slate-100 border-slate-400',
    'Vàng': 'from-amber-400 via-yellow-500 to-amber-600 text-amber-950 border-amber-300',
    'Kim Cương': 'from-sky-400 via-indigo-500 to-cyan-500 text-cyan-50 border-cyan-400',
    'Huyền Thoại': 'from-indigo-600 via-rose-500 to-amber-500 text-amber-100 border-amber-400'
};

// Returns a stable Sunday-based week identifier string (e.g. "2026-06-14")
export const getWeekId = () => {
    const d = new Date();
    const day = d.getDay();
    // Calculate the distance to the upcoming/current Sunday
    const diff = d.getDate() - day + (day === 0 ? 0 : 7);
    const sunday = new Date(d.setDate(diff));
    sunday.setHours(23, 59, 59, 999);
    return sunday.toISOString().split('T')[0];
};

// Generates exactly 29 competitive mock users based on a seed
export const generateSimulatedLeague = (userId, weekId, userScore) => {
    const firstNames = ['Nguyễn', 'Trần', 'Lê', 'Phạm', 'Hoàng', 'Huỳnh', 'Phan', 'Vũ', 'Đặng', 'Bùi'];
    const middleNames = ['Văn', 'Thị', 'Minh', 'Đức', 'Hồng', 'Anh', 'Ngọc', 'Hữu', 'Kim', 'Xuân'];
    const lastNames = ['An', 'Bình', 'Chi', 'Dũng', 'Giang', 'Hải', 'Khánh', 'Linh', 'Nam', 'Phong', 'Quỳnh', 'Sơn', 'Trang', 'Tuấn', 'Vy', 'Yến'];
    const avatars = ['fox', 'cat', 'dog', 'rabbit', 'bear', 'panda', 'koala', 'tiger', 'lion', 'penguin', 'owl', 'unicorn', 'whale', 'dolphin', 'frog'];
    
    const bots = [];
    const getSeed = (str) => {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            hash = str.charCodeAt(i) + ((hash << 5) - hash);
        }
        return Math.abs(hash);
    };
    
    let seed = getSeed((userId || 'user') + (weekId || 'week'));
    const nextRandom = () => {
        seed = (seed * 9301 + 49297) % 233280;
        return seed / 233280;
    };
    
    for (let i = 1; i <= 29; i++) {
        const fn = firstNames[Math.floor(nextRandom() * firstNames.length)];
        const mn = middleNames[Math.floor(nextRandom() * middleNames.length)];
        const ln = lastNames[Math.floor(nextRandom() * lastNames.length)];
        const name = `${fn} ${mn} ${ln}`;
        const botAvatar = avatars[Math.floor(nextRandom() * avatars.length)];
        
        // Spread the scores competitively around the user's score
        const percent = i / 30; // 0.03 to 0.97
        const baseMultiplier = 0.3 + percent * 1.4; // range from 0.3x to 1.7x user's score
        let botScore = Math.round((userScore || 100) * baseMultiplier);
        
        // Add random variance
        botScore += Math.floor(nextRandom() * 30) - 15;
        if (botScore < 0) botScore = 0;
        
        const botTotalCards = Math.floor(nextRandom() * 150) + 30;
        const botKanjiTotal = Math.floor(nextRandom() * 80) + 5;
        const botMastered = Math.floor(nextRandom() * (botTotalCards * 0.4)) + Math.floor(botTotalCards * 0.1);
        const botKanjiMastered = Math.floor(nextRandom() * (botKanjiTotal * 0.4)) + Math.floor(botKanjiTotal * 0.1);

        const botAdded = Math.floor(nextRandom() * 15) + 3;
        const botKanjiAdded = Math.floor(nextRandom() * 8) + 1;
        const botReviews = Math.floor(nextRandom() * 60) + 10;
        const botActiveDays = Math.max(1, Math.min(7, Math.floor(nextRandom() * 4) + (botScore > 500 ? 3 : 1)));

        bots.push({
            id: `bot_${weekId}_${i}`,
            displayName: name,
            avatar: botAvatar,
            level: Math.max(1, Math.floor(nextRandom() * 15) + 5),
            score: botScore,
            computedScore: botScore,
            isBot: true,
            totalCards: botTotalCards,
            kanjiTotal: botKanjiTotal,
            mastered: botMastered,
            kanjiMastered: botKanjiMastered,
            addedLast7Days: botAdded,
            kanjiAddedLast7Days: botKanjiAdded,
            reviewsLast7Days: botReviews,
            activeDaysLast7Days: botActiveDays,
            streak: Math.floor(nextRandom() * 10) + 1,
            lastUpdated: { toDate: () => new Date() }
        });
    }
    return bots;
};

// Dynamic Promotion/Demotion rules based on active user counts (ideal for small user bases)
export const getLeagueTierRules = (leagueName, totalParticipants) => {
    let minScoreForPromotion = 1000;
    let minScoreForSuperPromotion = 5000;
    let minScoreForSafety = 30;
    let minScoreForGraceProtection = 500;

    if (leagueName === 'Sắt' || leagueName === 'Đồng') {
        minScoreForPromotion = 1000; // >= 1Kđ để lên Bạc
        minScoreForSuperPromotion = 5000; // >= 5Kđ Thần Tốc nhảy thẳng lên Vàng
        minScoreForSafety = 20;
        minScoreForGraceProtection = 500;
    } else if (leagueName === 'Bạc') {
        minScoreForPromotion = 1000;
        minScoreForSuperPromotion = 20000; // >= 20Kđ Thần Tốc nhảy thẳng lên Kim Cương
        minScoreForSafety = 50;
        minScoreForGraceProtection = 800;
    } else if (leagueName === 'Vàng') {
        minScoreForPromotion = 5000;
        minScoreForSuperPromotion = 100000; // >= 100Kđ Thần Tốc nhảy thẳng lên Huyền Thoại
        minScoreForSafety = 100;
        minScoreForGraceProtection = 1500;
    } else if (leagueName === 'Kim Cương') {
        minScoreForPromotion = 20000; // >= 20Kđ để lên Kim Cương
        minScoreForSuperPromotion = 100000; // >= 100Kđ Thăng hạng lên Huyền Thoại
        minScoreForSafety = 200;
        minScoreForGraceProtection = 3000;
    } else { // Huyền Thoại
        minScoreForPromotion = 100000; // >= 100Kđ
        minScoreForSuperPromotion = 100000;
        minScoreForSafety = 300;
        minScoreForGraceProtection = 5000;
    }

    let promoteCount = 1;
    if (totalParticipants > 20) promoteCount = 5;
    else if (totalParticipants > 10) promoteCount = 3;
    else if (totalParticipants > 5) promoteCount = 2;

    let demoteCount = 0;
    if (totalParticipants > 25) demoteCount = 5;
    else if (totalParticipants > 15) demoteCount = 2;
    else if (totalParticipants > 8) demoteCount = 1;

    return {
        minScoreForPromotion,
        minScoreForSuperPromotion,
        minScoreForSafety,
        minScoreForGraceProtection,
        promoteCount,
        demoteCount: leagueName === 'Đồng' ? 0 : demoteCount,
        isBotEnabled: false
    };
};

