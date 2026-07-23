import { SRS_INTERVALS } from '../config/constants.js';

// ==================== CONSTANTS ====================
export const DEFAULT_EASE = 2.5;
const MIN_EASE = 1.3;
const MAX_EASE = 3.5;
const LEARNING_STEPS = [1, 10]; // Step 0: 1 min, Step 1: 10 mins
const RELEARNING_STEPS = [10];  // Step 0: 10 mins
const MAX_INTERVAL_DAYS = 36500; // 100 years, same as Anki default
const HARD_MULTIPLIER = 1.2; // Anki default Hard Interval multiplier
const EASY_BONUS = 1.3; // Anki default Easy Bonus multiplier

// ==================== UTILITY FUNCTIONS ====================

// Normalize SRS state and handle migration from legacy Leitner system
const normalizeSRSState = (srs) => {
    if (!srs) {
        return {
            interval: 0,
            ease: 2.5,
            learningStep: null,
            isLapsed: false,
            reps: 0,
            lapseCount: 0,
            prelapseInterval: null,
            state: 'NEW'
        };
    }

    // 1. Get raw inputs (handling both direct fields and nested srs prefix fields)
    let interval = srs.interval !== undefined ? srs.interval : (srs.srsInterval !== undefined ? srs.srsInterval : 0);
    let ease = srs.ease !== undefined ? srs.ease : (srs.srsEase !== undefined ? srs.srsEase : 2.5);
    let learningStep = srs.learningStep !== undefined ? srs.learningStep : (srs.srsLearningStep !== undefined ? srs.srsLearningStep : null);
    let isLapsed = srs.isLapsed !== undefined ? srs.isLapsed : (srs.srsIsLapsed !== undefined ? srs.srsIsLapsed : false);
    let reps = srs.reps !== undefined ? srs.reps : (srs.srsReps !== undefined ? srs.srsReps : 0);
    let lapseCount = srs.lapseCount !== undefined ? srs.lapseCount : (srs.srsLapseCount !== undefined ? srs.srsLapseCount : 0);
    let prelapseInterval = srs.prelapseInterval !== undefined ? srs.prelapseInterval : (srs.srsPrelapseInterval !== undefined ? srs.srsPrelapseInterval : null);
    let state = srs.state || srs.srsState || null;

    // 2. Legacy migration check: check if no new SRS fields exist but it was studied in the old system
    const legacyIndex = srs.intervalIndex_back !== undefined ? srs.intervalIndex_back : -1;
    const seenCount = srs.seenCount !== undefined ? srs.seenCount : 0;
    const masteryState = srs.masteryState || 'not_learned';

    if (reps === 0 && state === null) {
        const isLegacy = legacyIndex >= 0;
        if (isLegacy) {
            const isMastered = legacyIndex >= 4;
            if (isMastered) {
                state = 'REVIEW';
                learningStep = null;
                reps = 5; // Mastered (stats check reps >= 5)
                interval = 30; // 30 days
            } else {
                state = 'NEW';
                learningStep = null;
                reps = 0;
                interval = 0;
            }
        } else if (interval > 0) {
            // General legacy studied cards (e.g. Kanji studied in Leitner system)
            const isMinutes = interval >= 1000;
            const days = isMinutes ? Math.max(1, Math.round(interval / 1440)) : interval;
            if (days >= 21) {
                state = 'REVIEW';
                learningStep = null;
                reps = 5;
                interval = days;
            } else {
                state = 'REVIEW';
                learningStep = null;
                reps = Math.max(1, Math.min(4, Math.round(days)));
                interval = days;
            }
        }
    }

    // 3. Fix the minute-to-day mismatch bug (e.g. 5760 mins interpreted as 5760 days in REVIEW state)
    // In REVIEW state, interval is in DAYS. If it is >= 1000, it's definitely stored in minutes (legacy)
    // and should be converted to days by dividing by 1440.
    const resolvedState = state || (reps === 0 && (learningStep === null || learningStep === undefined) ? 'NEW' : (reps > 0 ? 'REVIEW' : 'LEARNING'));
    if (resolvedState === 'REVIEW' && interval >= 1000) {
        interval = Math.max(1, Math.round(interval / 1440));
    }
    if (resolvedState === 'REVIEW' && prelapseInterval && prelapseInterval >= 1000) {
        prelapseInterval = Math.max(1, Math.round(prelapseInterval / 1440));
    }

    return {
        interval,
        ease,
        learningStep,
        isLapsed,
        reps,
        lapseCount,
        prelapseInterval,
        state: resolvedState
    };
};

// Get card state based on reps, learningStep, isLapsed
export const getCardState = (srs) => {
    const normalized = normalizeSRSState(srs);
    return normalized.state;
};

// Get next review date based on SRS interval index (now in minutes)
export const getNextReviewDate = (intervalIndex) => {
    const now = Date.now();

    if (intervalIndex === -1) {
        return now;
    }

    if (intervalIndex < 0 || intervalIndex >= SRS_INTERVALS.length) {
        const maxInterval = SRS_INTERVALS[SRS_INTERVALS.length - 1];
        return now + maxInterval * 60000;
    }

    return now + SRS_INTERVALS[intervalIndex] * 60000;
};

// Get SRS progress text - with ease info
export const getSrsProgressText = (intervalIndex, ease, currentInterval, state) => {
    const resolvedState = state || (intervalIndex === -1 ? 'NEW' : (intervalIndex >= 2 ? 'REVIEW' : 'LEARNING'));

    if (resolvedState === 'NEW') return 'Mới';
    if (resolvedState === 'LEARNING') return 'Đang học';
    if (resolvedState === 'RELEARNING') return 'Học lại';

    // REVIEW state
    const days = currentInterval || 1;
    if (days >= 21) return 'Thuộc'; // Mastered threshold
    return `${days} ngày`;
};

// Safely parse nextReview timestamp to milliseconds since epoch
export const parseNextReviewMs = (val) => {
    if (val === null || val === undefined) return 0;
    if (typeof val === 'number') {
        if (val <= 0) return 0;
        // If stored in seconds (< 10000000000), convert to ms
        if (val < 10000000000) return val * 1000;
        return val;
    }
    if (val && typeof val.toDate === 'function') {
        return val.toDate().getTime();
    }
    if (val && typeof val.seconds === 'number') {
        return val.seconds * 1000;
    }
    if (val instanceof Date) {
        const time = val.getTime();
        return isNaN(time) ? 0 : time;
    }
    if (typeof val === 'string') {
        const num = Number(val);
        if (!isNaN(num) && num > 0) {
            return num < 10000000000 ? num * 1000 : num;
        }
        const parsed = new Date(val).getTime();
        return isNaN(parsed) ? 0 : parsed;
    }
    return 0;
};

// Check if card or SRS item is due for review
export const isSrsCardDue = (srsOrCard, now = Date.now()) => {
    if (!srsOrCard) return false;
    const nextReviewVal = srsOrCard.nextReview !== undefined 
        ? srsOrCard.nextReview 
        : (srsOrCard.nextReview_back !== undefined ? srsOrCard.nextReview_back : null);
    
    if (!nextReviewVal && nextReviewVal !== 0) return true;
    const reviewMs = parseNextReviewMs(nextReviewVal);
    if (reviewMs === 0) return true;
    return reviewMs <= now;
};

// Check if vocab card is due for review (including new cards with intervalIndex_back === -1)
export const isVocabCardDue = (card, now = Date.now()) => {
    if (!card) return false;
    if (card.srsEnabled === false) return false;
    // Thẻ mới (chưa có SRS / intervalIndex_back === -1)
    if (card.intervalIndex_back === -1 || card.intervalIndex_back === undefined || card.intervalIndex_back < 0) {
        return true;
    }
    const nextReviewVal = card.nextReview_back !== undefined ? card.nextReview_back : card.nextReview;
    const reviewMs = parseNextReviewMs(nextReviewVal);
    if (reviewMs === 0) return true;
    return reviewMs <= now;
};

export const isCardDue = (nextReviewTimestamp) => {
    return parseNextReviewMs(nextReviewTimestamp) <= Date.now();
};

// Calculate correct interval based on timestamp (retained for backward compatibility)
export const calculateCorrectInterval = (interval, nextReviewTimestamp) => {
    if (typeof interval === 'number' && interval >= 0 && interval < SRS_INTERVALS.length) {
        return interval;
    }

    if (nextReviewTimestamp) {
        const now = Date.now();
        const minutesUntilReview = Math.floor((nextReviewTimestamp - now) / 60000);

        for (let i = SRS_INTERVALS.length - 1; i >= 0; i--) {
            if (minutesUntilReview >= SRS_INTERVALS[i]) {
                return i;
            }
        }
    }

    return 0;
};

// Get SRS color based on state and currentInterval
const getSrsColor = (intervalIndex, currentInterval, state) => {
    const resolvedState = state || (intervalIndex === -1 ? 'NEW' : (intervalIndex >= 2 ? 'REVIEW' : 'LEARNING'));

    if (resolvedState === 'NEW') return 'text-gray-400';
    if (resolvedState === 'LEARNING' || resolvedState === 'RELEARNING') return 'text-orange-500';

    const days = currentInterval || 1;
    if (days >= 21) return 'text-emerald-500';
    return 'text-blue-500';
};

// Get SRS badge color
const getSrsBadgeColor = (intervalIndex, currentInterval, state) => {
    const resolvedState = state || (intervalIndex === -1 ? 'NEW' : (intervalIndex >= 2 ? 'REVIEW' : 'LEARNING'));

    if (resolvedState === 'NEW') return 'bg-gray-100 text-gray-600 border-gray-200';
    if (resolvedState === 'LEARNING' || resolvedState === 'RELEARNING') return 'bg-orange-100 text-orange-700 border-orange-200';

    const days = currentInterval || 1;
    if (days >= 21) return 'bg-emerald-100 text-emerald-700 border-emerald-200';
    return 'bg-blue-100 text-blue-700 border-blue-200';
};

// Format countdown: if < 24 hours show HH:MM:SS, if >= 1 day show "X days"
export const formatCountdown = (targetTimestamp) => {
    const diff = targetTimestamp - Date.now();
    if (diff <= 0) return null;

    const totalSeconds = Math.floor(diff / 1000);
    const days = Math.floor(totalSeconds / 86400);

    if (days >= 1) {
        return { text: `${days} ngày`, isCountdown: false };
    }

    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    const pad = (n) => String(n).padStart(2, '0');
    return {
        text: `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`,
        isCountdown: true
    };
};

// Get difficulty label based on ease factor
const getDifficultyLabel = (ease) => {
    if (!ease || ease === DEFAULT_EASE) return { text: 'Bình thường', color: 'text-gray-500' };
    if (ease < 1.5) return { text: 'Rất khó', color: 'text-red-600' };
    if (ease < 2.0) return { text: 'Khó', color: 'text-orange-500' };
    if (ease < 2.5) return { text: 'Trung bình', color: 'text-yellow-500' };
    if (ease < 3.0) return { text: 'Dễ', color: 'text-green-500' };
    return { text: 'Rất dễ', color: 'text-emerald-600' };
};

// --- ANKI SM-2 SCHEDULER ENGINE FOR VOCABULARY & KANJI ---
export const calculateAnkiSRS = (srs, rating) => {
    const norm = normalizeSRSState(srs);
    const currentEase = norm.ease;
    const currentInterval = norm.interval;
    const currentReps = norm.reps;
    const learningStep = norm.learningStep;
    const lapseCount = norm.lapseCount;
    const prelapseInterval = norm.prelapseInterval;
    const currentState = norm.state;
    const normRating = String(rating).toLowerCase();

    let nextState = currentState;
    let newInterval = currentInterval;
    let newEase = currentEase;
    let newLearningStep = learningStep;
    let newIsLapsed = norm.isLapsed;
    let newLapseCount = lapseCount;
    let newPrelapseInterval = prelapseInterval;

    // ========== NEW STATE ==========
    if (currentState === 'NEW') {
        switch (normRating) {
            case 'again':
                nextState = 'LEARNING';
                newInterval = 1; // 1 min (Step 0)
                newLearningStep = 0;
                break;
            case 'hard':
                nextState = 'LEARNING';
                newInterval = 5; // Đổi thành 5 phút theo yêu cầu để phân biệt với Good (10 phút)
                newLearningStep = 0; // Giữ ở bước 0, không nhảy bước
                break;
            case 'good':
                nextState = 'REVIEW';
                newInterval = 1; // 1 day (graduated)
                newLearningStep = null;
                break;
            case 'easy':
                nextState = 'REVIEW';
                newInterval = 4; // 4 days (graduated)
                newEase = currentEase + 0.15;
                newLearningStep = null;
                break;
            default:
                nextState = 'LEARNING';
                newInterval = 1;
                newLearningStep = 0;
        }
    }
    // ========== LEARNING STATE ==========
    else if (currentState === 'LEARNING') {
        switch (normRating) {
            case 'again':
                nextState = 'LEARNING';
                newInterval = 1; // reset Step 0 (1 min)
                newLearningStep = 0;
                break;
            case 'hard':
                nextState = 'LEARNING';
                if (learningStep === 0 && LEARNING_STEPS.length > 1) {
                    newInterval = 5; // Đổi thành 5 phút theo yêu cầu để phân biệt với Good (10 phút)
                } else {
                    // Anki: Hard ở bước khác = lặp lại bước hiện tại
                    newInterval = LEARNING_STEPS[learningStep] || currentInterval;
                }
                // learningStep stays the same
                break;
            case 'good':
                if (learningStep === 0) {
                    nextState = 'LEARNING';
                    newInterval = 10; // Step 1 (10 min)
                    newLearningStep = 1;
                } else {
                    nextState = 'REVIEW';
                    newInterval = 1; // 1 day (graduated)
                    newLearningStep = null;
                }
                break;
            case 'easy':
                nextState = 'REVIEW';
                newInterval = 4; // 4 days (graduated)
                newEase = currentEase + 0.15;
                newLearningStep = null;
                break;
            default:
                nextState = 'LEARNING';
                newInterval = 1;
                newLearningStep = 0;
        }
    }
    // ========== RELEARNING STATE ==========
    else if (currentState === 'RELEARNING') {
        const refInterval = prelapseInterval || 1; // Fallback to 1 day
        const hardIntVal = Math.max(1, Math.floor(refInterval * 0.1));
        const goodIntVal = Math.max(hardIntVal + 1, Math.floor(refInterval * 0.2));
        const easyIntVal = Math.max(goodIntVal + 1, Math.floor(refInterval * 0.2 * EASY_BONUS));

        switch (normRating) {
            case 'again':
                nextState = 'RELEARNING';
                newInterval = RELEARNING_STEPS[0]; // 10 min
                // Anki: Ease chỉ giảm 1 lần khi lapse (REVIEW→Again)
                // Không giảm thêm khi bấm Again ở RELEARNING để tránh "ease hell"
                newLearningStep = 0;
                break;
            case 'hard':
                // Thay vì giữ ở Relearning (phút), cho tốt nghiệp với số ngày nhỏ hơn Good
                nextState = 'REVIEW';
                newInterval = hardIntVal; // Giảm xuống 10% chu kỳ trước khi quên
                newEase = currentEase - 0.15;
                newLearningStep = null;
                newIsLapsed = false;
                newPrelapseInterval = null;
                break;
            case 'good':
                nextState = 'REVIEW';
                newInterval = goodIntVal; // Giảm xuống 20% chu kỳ trước khi quên (phạt 80%)
                newLearningStep = null;
                newIsLapsed = false;
                newPrelapseInterval = null;
                break;
            case 'easy':
                nextState = 'REVIEW';
                newInterval = easyIntVal; 
                newEase = currentEase + 0.15;
                newLearningStep = null;
                newIsLapsed = false;
                newPrelapseInterval = null;
                break;
            default:
                nextState = 'REVIEW';
                newInterval = goodIntVal;
                newLearningStep = null;
                newIsLapsed = false;
                newPrelapseInterval = null;
        }
    }
    // ========== REVIEW STATE ==========
    else {
        switch (normRating) {
            case 'again':
                nextState = 'RELEARNING';
                newInterval = 10; // 10 min
                newEase = currentEase - 0.20;
                newLearningStep = 0;
                newIsLapsed = true;
                newPrelapseInterval = currentInterval; // store I_old (days)
                newLapseCount = lapseCount + 1;
                break;
            case 'hard':
                nextState = 'REVIEW';
                // Anki: Hard = max(1, floor(interval × hardMultiplier))
                newInterval = Math.max(currentInterval + 1, Math.floor(currentInterval * HARD_MULTIPLIER));
                newEase = currentEase - 0.15;
                newLearningStep = null;
                break;
            case 'good':
                nextState = 'REVIEW';
                const hardInterval = Math.max(currentInterval + 1, Math.floor(currentInterval * HARD_MULTIPLIER));
                newInterval = Math.max(hardInterval + 1, Math.floor(currentInterval * currentEase));
                newLearningStep = null;
                break;
            case 'easy':
                nextState = 'REVIEW';
                const hardInt = Math.max(currentInterval + 1, Math.floor(currentInterval * HARD_MULTIPLIER));
                const goodInterval = Math.max(hardInt + 1, Math.floor(currentInterval * currentEase));
                newInterval = Math.max(goodInterval + 1, Math.floor(currentInterval * currentEase * EASY_BONUS));
                newEase = currentEase + 0.15;
                newLearningStep = null;
                break;
            default:
                nextState = 'REVIEW';
                const hInt = Math.max(currentInterval + 1, Math.floor(currentInterval * HARD_MULTIPLIER));
                newInterval = Math.max(hInt + 1, Math.floor(currentInterval * currentEase));
                newLearningStep = null;
        }
    }

    // ========== GLOBAL RULES ==========
    // Ease Factor clamp
    newEase = Math.max(MIN_EASE, Math.min(MAX_EASE, newEase));

    // Maximum interval clamp (Anki default: 36500 days = 100 years)
    if (nextState === 'REVIEW') {
        newInterval = Math.min(newInterval, MAX_INTERVAL_DAYS);
    }

    // Reps: chỉ tăng khi thẻ ở trạng thái REVIEW hoặc khi tốt nghiệp vào REVIEW
    let newReps = currentReps;
    if (nextState === 'REVIEW') {
        newReps = currentReps + 1;
    }

    // Calculate milliseconds offset with Anki Day Cutoff (4:00 AM) & Fuzz Factor
    let nextReviewOffsetMs = 0;
    let fuzzedInterval = newInterval;

    if (nextState === 'REVIEW') {
        // Apply Fuzz Factor for intervals >= 3 days to smooth daily card distribution
        fuzzedInterval = applyFuzzFactor(newInterval);
        // Calculate target timestamp anchored to 4:00 AM cutoff on scheduled day
        const targetTimestamp = calculateDayCutoffTimestamp(fuzzedInterval);
        nextReviewOffsetMs = Math.max(60000, targetTimestamp - Date.now());
    } else {
        // Minute-based scheduling for LEARNING / RELEARNING states
        nextReviewOffsetMs = newInterval * 60 * 1000;
    }

    return {
        interval: newInterval,
        fuzzedInterval: fuzzedInterval,
        ease: newEase,
        learningStep: newLearningStep,
        isLapsed: newIsLapsed,
        reps: newReps,
        lapseCount: newLapseCount,
        prelapseInterval: newPrelapseInterval,
        state: nextState,
        nextReviewOffsetMs: nextReviewOffsetMs
    };
};

// Default Cutoff Hour (4:00 AM local time, same as Anki)
export const DAY_CUTOFF_HOUR = 4;

/**
 * Calculates the Target Day Cutoff Timestamp (4:00 AM on scheduled target day).
 * All day-based REVIEW cards scheduled for the same day become due together at 4:00 AM.
 * @param {number} intervalDays - Scheduled interval in days
 * @param {number} nowMs - Current timestamp in ms
 * @param {number} cutoffHour - Cutoff hour (default 4 AM)
 * @returns {number} Timestamp in ms representing 4:00 AM on target day
 */
export const calculateDayCutoffTimestamp = (intervalDays, nowMs = Date.now(), cutoffHour = DAY_CUTOFF_HOUR) => {
    const d = new Date(nowMs);
    // If current time is before cutoff hour (e.g. 2:30 AM), we are still in "yesterday's" study block
    if (d.getHours() < cutoffHour) {
        d.setDate(d.getDate() - 1);
    }
    // Target day = Current study day + intervalDays
    d.setDate(d.getDate() + intervalDays);
    d.setHours(cutoffHour, 0, 0, 0);
    return d.getTime();
};

/**
 * Applies Anki Fuzz Factor (±5% - 10% random variation) to intervals >= 3 days.
 * Prevents artificial card spikes on the exact same day in the future.
 * @param {number} intervalDays - Raw scheduled interval in days
 * @returns {number} Fuzzed interval in days
 */
export const applyFuzzFactor = (intervalDays) => {
    if (intervalDays < 3) return intervalDays;
    
    let fuzzRange = 1;
    if (intervalDays >= 30) {
        fuzzRange = Math.max(2, Math.round(intervalDays * 0.08));
    } else if (intervalDays >= 7) {
        fuzzRange = Math.max(1, Math.round(intervalDays * 0.10));
    } else { // 3 <= intervalDays < 7
        fuzzRange = 1;
    }

    // Random integer between -fuzzRange and +fuzzRange
    const randomOffset = Math.floor(Math.random() * (fuzzRange * 2 + 1)) - fuzzRange;
    const fuzzed = intervalDays + randomOffset;
    return Math.max(2, fuzzed); // Ensure interval stays at least 2 days
};

export const isKanjiMastered = (srs) => {
    if (!srs) return false;
    const state = getCardState(srs);
    if (state === 'new' || state === 'NEW' || 
        state === 'learning' || state === 'LEARNING' || 
        state === 'relearning' || state === 'RELEARNING') {
        return false;
    }
    const interval = srs.interval || 0;
    const isLegacyMinute = interval >= 1440;
    const daysInterval = isLegacyMinute ? (interval / 1440) : interval;
    return daysInterval >= 7 || (typeof srs.reps === 'number' && srs.reps >= 5);
};

export const isVocabCardMastered = (card) => {
    if (!card) return false;
    if (card.srsEnabled === false) return false;
    if (typeof card.intervalIndex_back === 'number' && card.intervalIndex_back >= 4) return true;
    if (typeof card.srsReps === 'number' && card.srsReps >= 5) return true;
    if (typeof card.srsInterval === 'number' && (card.srsInterval >= 21 || card.srsInterval >= 10080)) return true;
    return false;
};

// ==================== LEECH CARD DETECTION ====================
export const LEECH_THRESHOLD = 4; // Card lapsed 4 or more times

export const isLeechCard = (srsOrCard) => {
    if (!srsOrCard) return false;
    const count = typeof srsOrCard.lapseCount === 'number'
        ? srsOrCard.lapseCount
        : (typeof srsOrCard.srsLapseCount === 'number'
            ? srsOrCard.srsLapseCount
            : (typeof srsOrCard.lapses === 'number'
                ? srsOrCard.lapses
                : (typeof srsOrCard.srsData?.lapseCount === 'number'
                    ? srsOrCard.srsData.lapseCount
                    : 0)));
    return count >= LEECH_THRESHOLD;
};

// ==================== SRS FORECAST CALCULATION ====================
export const calculateSrsForecast = (itemsList = [], daysCount = 14, nowMs = Date.now()) => {
    const todayCutoff = calculateDayCutoffTimestamp(0, nowMs);
    const nextDayCutoff = todayCutoff + 86400000;
    const msPerDay = 86400000;
    
    // Day names array
    const dayNames = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

    const forecast = Array.from({ length: daysCount }, (_, i) => {
        const targetDate = new Date(todayCutoff + i * msPerDay);
        const dayLabel = i === 0 ? 'Hôm nay' : (i === 1 ? 'Ngày mai' : dayNames[targetDate.getDay()]);
        const dateString = `${targetDate.getDate()}/${targetDate.getMonth() + 1}`;
        return {
            dayOffset: i,
            dayLabel,
            dateString,
            count: 0,
            timestamp: targetDate.getTime()
        };
    });

    itemsList.forEach(item => {
        if (!item || item.srsEnabled === false) return;

        const nextReviewVal = item.nextReview !== undefined 
            ? item.nextReview 
            : (item.nextReview_back !== undefined ? item.nextReview_back : null);
        
        const reviewMs = parseNextReviewMs(nextReviewVal);
        const state = item.state || item.srsState || null;
        const interval = item.interval !== undefined ? item.interval : item.srsInterval;
        const reps = item.reps !== undefined ? item.reps : item.srsReps;
        const intervalIndex = item.intervalIndex_back;

        // Determine if item has active SRS history
        const hasActiveSrs = (reviewMs > 0) || 
            (state && state !== 'NEW' && state !== 'new') || 
            (typeof intervalIndex === 'number' && intervalIndex >= 0) ||
            (typeof interval === 'number' && interval > 0) ||
            (typeof reps === 'number' && reps > 0);

        // Exclude unstudied/new cards that have never been introduced in SRS
        if (!hasActiveSrs) return;

        if (reviewMs === 0 || reviewMs <= nowMs || reviewMs < nextDayCutoff) {
            // Due today (or overdue)
            forecast[0].count++;
        } else {
            const diffMs = reviewMs - todayCutoff;
            const dayOffset = Math.floor(diffMs / msPerDay);
            if (dayOffset >= 0 && dayOffset < daysCount) {
                forecast[dayOffset].count++;
            }
        }
    });

    return forecast;
};
