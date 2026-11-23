/**
 * QuizKi Streak Helper & Fault-Tolerant Engine
 * Resolves timezone mismatches (UTC vs Local Time), cross-device study modes,
 * missing dailyActivity docs, and guarantees streak monotonicity (no random resets to 1).
 */

import { doc, setDoc } from 'firebase/firestore';

/**
 * Convert any Date, timestamp (ms or seconds), or Firestore Timestamp to local 'YYYY-MM-DD'
 */
export const getSafeLocalDateString = (input = new Date()) => {
    if (!input) return null;
    let d;
    if (input instanceof Date) {
        d = input;
    } else if (typeof input === 'number') {
        d = new Date(input < 10000000000 ? input * 1000 : input);
    } else if (typeof input === 'string') {
        if (/^\d{4}-\d{2}-\d{2}$/.test(input)) return input;
        d = new Date(input);
    } else if (typeof input?.toMillis === 'function') {
        d = new Date(input.toMillis());
    } else if (typeof input?.toDate === 'function') {
        d = input.toDate();
    } else if (typeof input?.seconds === 'number') {
        d = new Date(input.seconds * 1000);
    } else {
        d = new Date();
    }

    if (isNaN(d.getTime())) return null;
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

/**
 * Collect all active dates across all study modes and data sources
 */
export const collectAllActiveDates = ({
    dailyActivityLogs = [],
    allCards = [],
    kanjiSrsMap = null,
    grammarSrsMap = null
}) => {
    const activeDates = new Set();

    // 1. From dailyActivityLogs
    (dailyActivityLogs || []).forEach(log => {
        if (!log) return;
        const hasActivity = 
            (log.cardsReviewed || 0) > 0 ||
            (log.reviewsDone || 0) > 0 ||
            (log.grammarReviewsDone || 0) > 0 ||
            (log.xpGained || 0) > 0 ||
            (log.newWordsAdded || 0) > 0 ||
            (log.newKanjiAdded || 0) > 0 ||
            (log.newGrammarAdded || 0) > 0 ||
            (log.count || 0) > 0;

        if (hasActivity) {
            // Check log.id (e.g. '2026-11-15')
            if (log.id) {
                const k = getSafeLocalDateString(log.id);
                if (k) activeDates.add(k);
                if (/^\d{4}-\d{2}-\d{2}$/.test(log.id)) activeDates.add(log.id);
            }
            if (log.date) {
                const k = getSafeLocalDateString(log.date);
                if (k) activeDates.add(k);
            }
            // Check timestamp of update/creation to map UTC-saved logs to local date
            if (log.lastUpdated) {
                const k = getSafeLocalDateString(log.lastUpdated);
                if (k) activeDates.add(k);
            }
            if (log.createdAt) {
                const k = getSafeLocalDateString(log.createdAt);
                if (k) activeDates.add(k);
            }
        }
    });

    // 2. From allCards (Vocabulary cards timestamp)
    (allCards || []).forEach(card => {
        if (!card) return;
        const timestamps = [
            card.lastStudied,
            card.lastReviewed,
            card.lastReviewed_back,
            card.lastReviewed_synonym,
            card.lastReviewed_example,
            card.lastReviewed_dictation,
            card.updatedAt
        ];
        timestamps.forEach(ts => {
            if (ts && typeof ts === 'number' && ts > 1700000000000) {
                const k = getSafeLocalDateString(ts);
                if (k) activeDates.add(k);
            }
        });
    });

    // 3. From Kanji SRS
    if (kanjiSrsMap && typeof kanjiSrsMap === 'object') {
        Object.values(kanjiSrsMap).forEach(k => {
            if (k?.lastReview) {
                const dateKey = getSafeLocalDateString(k.lastReview);
                if (dateKey) activeDates.add(dateKey);
            }
        });
    }

    // 4. From Grammar SRS
    if (grammarSrsMap && typeof grammarSrsMap === 'object') {
        Object.values(grammarSrsMap).forEach(g => {
            if (g?.lastReview) {
                const dateKey = getSafeLocalDateString(g.lastReview);
                if (dateKey) activeDates.add(dateKey);
            }
        });
    }

    return activeDates;
};

/**
 * Calculate accurate streak with Duolingo-style Streak Freeze / Buffer & Anti-Regression protection
 */
export const calculateAccurateStreak = ({
    dailyActivityLogs = [],
    allCards = [],
    kanjiSrsMap = null,
    grammarSrsMap = null,
    savedStreak = 0,
    userId = null
}) => {
    // Tự động bổ sung Kanji SRS và Grammar SRS từ localStorage nếu chưa được truyền
    let effectiveKanjiSrs = kanjiSrsMap;
    let effectiveGrammarSrs = grammarSrsMap;
    if (!effectiveKanjiSrs && typeof window !== 'undefined' && window.localStorage) {
        try {
            const raw = localStorage.getItem(userId ? `quizki_cached_kanji_srs_${userId}` : 'quizki_cached_kanji_srs');
            if (raw) effectiveKanjiSrs = JSON.parse(raw);
        } catch (_) {}
    }
    if (!effectiveGrammarSrs && typeof window !== 'undefined' && window.localStorage) {
        try {
            const raw = localStorage.getItem(userId ? `quizki_cached_grammar_srs_${userId}` : 'quizki_cached_grammar_srs');
            if (raw) effectiveGrammarSrs = JSON.parse(raw);
        } catch (_) {}
    }

    const activeDates = collectAllActiveDates({
        dailyActivityLogs,
        allCards,
        kanjiSrsMap: effectiveKanjiSrs,
        grammarSrsMap: effectiveGrammarSrs
    });

    const now = new Date();
    const todayStr = getSafeLocalDateString(now);

    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = getSafeLocalDateString(yesterday);

    const hasToday = activeDates.has(todayStr);
    const hasYesterday = activeDates.has(yesterdayStr);

    // Retrieve cached streak & last streak date from localStorage safely
    let cachedStreakNum = 0;
    let lastStreakDate = null;
    try {
        if (typeof window !== 'undefined' && window.localStorage) {
            const raw = localStorage.getItem('quizki_cached_user_streak') || 
                        localStorage.getItem(userId ? `quizki_cached_user_streak_${userId}` : 'quizki_cached_user_streak');
            if (raw) cachedStreakNum = parseInt(raw, 10) || 0;
            lastStreakDate = localStorage.getItem('quizki_last_streak_date');
        }
    } catch (_) {}

    // Chuỗi Streak nền tảng: Luôn ưu tiên giá trị lớn nhất giữa đám mây (savedStreak) và bộ nhớ máy khách (cachedStreakNum)
    const baselineStreak = Math.max(Number(savedStreak) || 0, cachedStreakNum);

    // Tự động đồng bộ số streak từ cloud xuống localStorage nếu cloud có giá trị lớn hơn
    if (Number(savedStreak) > cachedStreakNum) {
        try {
            if (typeof window !== 'undefined' && window.localStorage) {
                localStorage.setItem('quizki_cached_user_streak', String(savedStreak));
                if (userId) localStorage.setItem(`quizki_cached_user_streak_${userId}`, String(savedStreak));
            }
        } catch (_) {}
    }

    // Calculate backward consecutive days
    let rawStreak = 0;
    if (hasToday || hasYesterday) {
        let checkDate = new Date(hasToday ? now : yesterday);
        let graceUsed = false;

        while (true) {
            const dateKey = getSafeLocalDateString(checkDate);
            if (activeDates.has(dateKey)) {
                rawStreak++;
                checkDate.setDate(checkDate.getDate() - 1);
            } else if (!graceUsed && rawStreak >= 2) {
                // Streak Freeze: forgive 1 missing day in the chain
                graceUsed = true;
                checkDate.setDate(checkDate.getDate() - 1);
            } else {
                break;
            }
        }
    }

    // Monotonicity & Incremental Progress Rule:
    let finalStreak = rawStreak;

    if (hasToday) {
        if (baselineStreak > 0) {
            // Nếu hôm nay có học và ngày ghi nhận streak trước đó là hôm qua (hoặc chưa ghi nhận hôm nay):
            // Tăng thêm 1 ngày liên tiếp (baselineStreak + 1), tránh bị kẹt streak do khoảng trống lịch sử quá khứ
            if (lastStreakDate && lastStreakDate !== todayStr && (hasYesterday || activeDates.has(yesterdayStr))) {
                finalStreak = Math.max(rawStreak, baselineStreak + 1);
            } else {
                finalStreak = Math.max(rawStreak, baselineStreak);
            }
        } else {
            finalStreak = Math.max(rawStreak, 1);
        }
    } else if (hasYesterday) {
        // Hôm nay chưa học nhưng hôm qua có học -> bảo lưu streak nền tảng
        finalStreak = Math.max(rawStreak, baselineStreak);
    } else {
        // Cả hôm nay và hôm qua chưa học: kiểm tra ân hạn 1 ngày (Streak Freeze) nếu 2 ngày trước có học
        if (baselineStreak > 1 && activeDates.size >= 2) {
            const twoDaysAgo = new Date(now);
            twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
            const twoDaysAgoStr = getSafeLocalDateString(twoDaysAgo);
            if (activeDates.has(twoDaysAgoStr)) {
                finalStreak = baselineStreak; // Ân hạn 1 ngày
            } else {
                finalStreak = 0;
            }
        } else {
            finalStreak = 0;
        }
    }

    // Cập nhật kết quả tính toán streak và ngày streak vào localStorage
    if (finalStreak > 0) {
        try {
            if (typeof window !== 'undefined' && window.localStorage) {
                const currentLocal = parseInt(localStorage.getItem('quizki_cached_user_streak') || '0', 10);
                if (finalStreak >= currentLocal) {
                    localStorage.setItem('quizki_cached_user_streak', String(finalStreak));
                    if (userId) localStorage.setItem(`quizki_cached_user_streak_${userId}`, String(finalStreak));
                }
                if (hasToday) {
                    localStorage.setItem('quizki_last_streak_date', todayStr);
                }
            }
        } catch (_) {}
    }

    return Math.max(0, finalStreak);
};

/**
 * Khôi phục hoặc cập nhật số ngày Streak thủ công vào Firestore & localStorage
 */
export const restoreUserStreak = async ({
    userId,
    targetStreak,
    db,
    appId,
    publicStatsPath
}) => {
    const safeStreak = Math.max(1, parseInt(targetStreak, 10) || 1);
    const todayStr = getSafeLocalDateString();

    // 1. Cập nhật localStorage
    try {
        if (typeof window !== 'undefined' && window.localStorage) {
            localStorage.setItem('quizki_cached_user_streak', String(safeStreak));
            if (userId) {
                localStorage.setItem(`quizki_cached_user_streak_${userId}`, String(safeStreak));
            }
            localStorage.setItem('quizki_last_streak_date', todayStr);
        }
    } catch (_) {}

    // 2. Cập nhật Firestore publicStats (Leaderboard)
    if (db && appId && publicStatsPath && userId) {
        try {
            const statsRef = doc(db, publicStatsPath, userId);
            await setDoc(statsRef, {
                streak: safeStreak,
                lastActive: Date.now(),
                updatedAt: Date.now()
            }, { merge: true });
        } catch (e) {
            console.warn('⚠️ Lỗi cập nhật streak lên publicStats:', e);
        }
    }

    // 3. Cập nhật Firestore user profile settings
    if (db && appId && userId) {
        try {
            const profileRef = doc(db, `artifacts/${appId}/users/${userId}/settings/profile`);
            await setDoc(profileRef, {
                streak: safeStreak,
                updatedAt: Date.now()
            }, { merge: true });
        } catch (_) {}
    }

    // 4. Bắn sự kiện đồng bộ toàn bộ app
    try {
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('quizki-streak-restored', { detail: safeStreak }));
            window.dispatchEvent(new Event('srs-updated'));
        }
    } catch (_) {}

    return safeStreak;
};
