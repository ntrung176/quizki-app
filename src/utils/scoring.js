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

export const getLevelTitle = (level) => {
    if (level < 10) return '🌱 Người mới bắt đầu';
    if (level < 25) return '📖 Học giả tập sự';
    if (level < 50) return '⚔️ Chiến binh ngôn ngữ';
    if (level < 75) return '🧙‍♂️ Bậc thầy từ vựng';
    if (level < 100) return '👑 Huyền thoại tiếng Nhật';
    return '🪐 Vô song';
};

// Points configuration
export const POINTS = {
    // Initial learning/practice modes
    PRACTICE_FLASHCARD_STUDY: 10,
    PRACTICE_AUXILIARY: 6, // Back Review, Synonym, Example, Dictation

    // Spaced Repetition (SRS) Reviews - Vocabulary
    SRS_VOCAB: {
        again: 5,
        hard: 15,
        good: 30,
        easy: 45
    },

    // Spaced Repetition (SRS) Reviews - Kanji
    SRS_KANJI: {
        again: 8,
        hard: 25,
        good: 45,
        easy: 60
    },

    // Promotion bonuses
    PROMOTION: {
        to_learning: 10,
        to_mastered: 100
    },

    // Consistency
    DAILY_GOAL: 50,
    PERFECT_SESSION: 20,
    STREAK_MULTIPLIER: 5,
    MAX_STREAK_BONUS: 100,

    // Anti-spam limits
    DAILY_LIMIT: 1500,
    MIN_TIME_THRESHOLD_MS: 1500
};

// Leagues configuration
export const LEAGUES = [
    'Sắt',
    'Đồng',
    'Bạc',
    'Vàng',
    'Bạch Kim',
    'Lục Bảo',
    'Kim Cương',
    'Cao Thủ',
    'Đại Cao Thủ',
    'Thách Đấu'
];

export const LEAGUE_ICONS = {
    'Sắt': '/ranks/iron.svg',
    'Đồng': '/ranks/bronze.svg',
    'Bạc': '/ranks/silver.svg',
    'Vàng': '/ranks/gold.svg',
    'Bạch Kim': '/ranks/platinum.svg',
    'Lục Bảo': '/ranks/emerald.svg',
    'Kim Cương': '/ranks/diamond.svg',
    'Cao Thủ': '/ranks/master.svg',
    'Đại Cao Thủ': '/ranks/grandmaster.svg',
    'Thách Đấu': '/ranks/challenger.svg'
};

export const LEAGUE_COLORS = {
    'Sắt': 'from-zinc-550 to-zinc-700 text-zinc-100 border-zinc-600',
    'Đồng': 'from-amber-600 to-amber-800 text-amber-100 border-amber-700',
    'Bạc': 'from-slate-400 to-slate-600 text-slate-100 border-slate-500',
    'Vàng': 'from-yellow-450 to-amber-500 text-amber-950 border-yellow-500',
    'Bạch Kim': 'from-teal-400 to-emerald-600 text-teal-50 border-teal-500',
    'Lục Bảo': 'from-emerald-500 to-green-700 text-emerald-50 border-emerald-600',
    'Kim Cương': 'from-sky-400 to-indigo-500 text-indigo-50 border-sky-400',
    'Cao Thủ': 'from-cyan-500 to-indigo-650 text-cyan-50 border-cyan-500',
    'Đại Cao Thủ': 'from-red-500 to-rose-700 text-rose-50 border-red-600',
    'Thách Đấu': 'from-indigo-600 via-sky-500 to-amber-500 text-amber-100 border-amber-400'
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
        
        bots.push({
            id: `bot_${weekId}_${i}`,
            displayName: name,
            avatar: botAvatar,
            level: Math.max(1, Math.floor(nextRandom() * 15) + 5),
            score: botScore,
            computedScore: botScore,
            isBot: true,
            totalCards: Math.floor(nextRandom() * 150) + 30,
            kanjiTotal: Math.floor(nextRandom() * 80) + 5,
            streak: Math.floor(nextRandom() * 10) + 1,
            lastUpdated: { toDate: () => new Date() }
        });
    }
    return bots;
};

// Dynamic Promotion/Demotion rules based on active user counts (ideal for small user bases)
export const getLeagueTierRules = (leagueName, totalParticipants) => {
    const isBotEnabled = leagueName === 'Sắt' || leagueName === 'Đồng';
    
    if (isBotEnabled) {
        return {
            minScoreForPromotion: 100, // Phải đạt tối thiểu 100 điểm để thăng hạng
            minScoreForSafety: 20,     // Dưới 20 điểm hoặc đứng chót sẽ xuống hạng
            promoteCount: 5,
            demoteCount: leagueName === 'Sắt' ? 0 : 5,
            isBotEnabled: true
        };
    }

    // For Bạc and above (real users only):
    // Promote count based on N (totalParticipants)
    let promoteCount = 1;
    if (totalParticipants > 20) promoteCount = 5;
    else if (totalParticipants > 10) promoteCount = 3;
    else if (totalParticipants > 5) promoteCount = 2;

    // Demote count based on N
    let demoteCount = 0;
    if (totalParticipants > 25) demoteCount = 5;
    else if (totalParticipants > 15) demoteCount = 2;
    else if (totalParticipants > 8) demoteCount = 1;

    return {
        minScoreForPromotion: 200, // Phải đạt tối thiểu 200 điểm mới được thăng hạng
        minScoreForSafety: 30,     // Dưới 30 điểm sẽ bị tự động xuống hạng (coi như không hoạt động)
        promoteCount,
        demoteCount,
        isBotEnabled: false
    };
};

