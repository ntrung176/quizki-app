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
export const LEAGUES = ['Đồng', 'Bạc', 'Vàng', 'Kim Cương'];

export const LEAGUE_ICONS = {
    'Đồng': 'https://cdn.jsdelivr.net/gh/magisteriis/lol-icons-and-emblems/ranked-emblems/Emblem_Bronze.png',
    'Bạc': 'https://cdn.jsdelivr.net/gh/magisteriis/lol-icons-and-emblems/ranked-emblems/Emblem_Silver.png',
    'Vàng': 'https://cdn.jsdelivr.net/gh/magisteriis/lol-icons-and-emblems/ranked-emblems/Emblem_Gold.png',
    'Kim Cương': 'https://cdn.jsdelivr.net/gh/magisteriis/lol-icons-and-emblems/ranked-emblems/Emblem_Diamond.png'
};

export const LEAGUE_COLORS = {
    'Đồng': 'from-amber-600 to-amber-800 text-amber-100 border-amber-700',
    'Bạc': 'from-slate-400 to-slate-600 text-slate-100 border-slate-500',
    'Vàng': 'from-yellow-400 to-amber-500 text-amber-950 border-yellow-500',
    'Kim Cương': 'from-sky-400 to-indigo-500 text-indigo-50 border-sky-400'
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

