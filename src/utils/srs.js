import { SRS_INTERVALS, GRADUATION_INTERVAL, MASTERED_THRESHOLD, MAX_INTERVAL, formatIntervalMinutes } from '../config/constants';

// ==================== CONSTANTS ====================
export const DEFAULT_EASE = 2.5;
export const MIN_EASE = 1.3;
export const MAX_EASE = 3.5;
export const LEARNING_STEPS = [1, 10]; // Step 0: 1 min, Step 1: 10 mins
export const RELEARNING_STEPS = [10];  // Step 0: 10 mins
export const MAX_INTERVAL_DAYS = 36500; // 100 years, same as Anki default
export const HARD_MULTIPLIER = 1.2; // Anki default Hard Interval multiplier
export const EASY_BONUS = 1.3; // Anki default Easy Bonus multiplier

// ==================== UTILITY FUNCTIONS ====================

// Get card state based on reps, learningStep, isLapsed
export const getCardState = (srs) => {
    if (srs.state) return srs.state; // Explicit state name ('NEW', 'LEARNING', 'REVIEW', 'RELEARNING')

    const reps = srs.reps !== undefined ? srs.reps : (srs.srsReps !== undefined ? srs.srsReps : 0);
    const learningStep = srs.learningStep !== undefined ? srs.learningStep : (srs.srsLearningStep !== undefined ? srs.srsLearningStep : null);
    const isLapsed = srs.isLapsed !== undefined ? srs.isLapsed : (srs.srsIsLapsed !== undefined ? srs.srsIsLapsed : false);

    if (reps === 0 && (learningStep === null || learningStep === undefined)) return 'NEW';
    if (isLapsed && typeof learningStep === 'number' && learningStep >= 0) return 'RELEARNING';
    if (typeof learningStep === 'number' && learningStep >= 0) return 'LEARNING';
    return 'REVIEW';
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

// Check if card is due for review
export const isCardDue = (nextReviewTimestamp) => {
    return nextReviewTimestamp <= Date.now();
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
export const getSrsColor = (intervalIndex, currentInterval, state) => {
    const resolvedState = state || (intervalIndex === -1 ? 'NEW' : (intervalIndex >= 2 ? 'REVIEW' : 'LEARNING'));

    if (resolvedState === 'NEW') return 'text-gray-400';
    if (resolvedState === 'LEARNING' || resolvedState === 'RELEARNING') return 'text-orange-500';

    const days = currentInterval || 1;
    if (days >= 21) return 'text-emerald-500';
    return 'text-blue-500';
};

// Get SRS badge color
export const getSrsBadgeColor = (intervalIndex, currentInterval, state) => {
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
export const getDifficultyLabel = (ease) => {
    if (!ease || ease === DEFAULT_EASE) return { text: 'Bình thường', color: 'text-gray-500' };
    if (ease < 1.5) return { text: 'Rất khó', color: 'text-red-600' };
    if (ease < 2.0) return { text: 'Khó', color: 'text-orange-500' };
    if (ease < 2.5) return { text: 'Trung bình', color: 'text-yellow-500' };
    if (ease < 3.0) return { text: 'Dễ', color: 'text-green-500' };
    return { text: 'Rất dễ', color: 'text-emerald-600' };
};

// --- ANKI SM-2 SCHEDULER ENGINE FOR VOCABULARY & KANJI ---
export const calculateAnkiSRS = (srs, rating) => {
    const currentEase = srs.ease !== undefined ? srs.ease : (srs.srsEase !== undefined ? srs.srsEase : 2.5);
    const currentInterval = srs.interval !== undefined ? srs.interval : (srs.srsInterval !== undefined ? srs.srsInterval : 0);
    const currentReps = srs.reps !== undefined ? srs.reps : (srs.srsReps !== undefined ? srs.srsReps : 0);
    const learningStep = srs.learningStep !== undefined ? srs.learningStep : (srs.srsLearningStep !== undefined ? srs.srsLearningStep : null);
    const lapseCount = srs.lapseCount !== undefined ? srs.lapseCount : (srs.srsLapseCount !== undefined ? srs.srsLapseCount : 0);
    const prelapseInterval = srs.prelapseInterval !== undefined ? srs.prelapseInterval : (srs.srsPrelapseInterval !== undefined ? srs.srsPrelapseInterval : null);

    const currentState = getCardState(srs);
    const normRating = String(rating).toLowerCase();

    let nextState = currentState;
    let newInterval = currentInterval;
    let newEase = currentEase;
    let newLearningStep = learningStep;
    let newIsLapsed = srs.isLapsed || false;
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
                // Anki: Hard ở bước đầu = trung bình step 0 và step 1
                newInterval = Math.round((LEARNING_STEPS[0] + LEARNING_STEPS[1]) / 2); // (1+10)/2 ≈ 6 phút
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
                    // Anki: Hard ở bước đầu = trung bình step 0 và step 1
                    newInterval = Math.round((LEARNING_STEPS[0] + LEARNING_STEPS[1]) / 2);
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
        switch (normRating) {
            case 'again':
                nextState = 'RELEARNING';
                newInterval = RELEARNING_STEPS[0]; // 10 min
                // Anki: Ease chỉ giảm 1 lần khi lapse (REVIEW→Again)
                // Không giảm thêm khi bấm Again ở RELEARNING để tránh "ease hell"
                newLearningStep = 0;
                break;
            case 'hard':
                // Anki: Hard ở relearning = lặp lại bước hiện tại × 1.5
                nextState = 'RELEARNING';
                newInterval = Math.round(currentInterval * 1.5);
                // learningStep giữ nguyên
                break;
            case 'good':
                nextState = 'REVIEW';
                newInterval = Math.max(1, Math.floor(refInterval * 0.7)); // max(1, Prelapse_I * 0.7) days
                newLearningStep = null;
                newIsLapsed = false;
                newPrelapseInterval = null;
                break;
            case 'easy':
                nextState = 'REVIEW';
                newInterval = Math.max(4, Math.floor(refInterval * 0.7)); // max(4, Prelapse_I * 0.7) days
                newEase = currentEase + 0.15;
                newLearningStep = null;
                newIsLapsed = false;
                newPrelapseInterval = null;
                break;
            default:
                nextState = 'REVIEW';
                newInterval = Math.max(1, Math.floor(refInterval * 0.7));
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
                // Không dùng currentInterval + 1 để tránh tăng nhanh hơn mong muốn ở interval nhỏ
                newInterval = Math.max(1, Math.floor(currentInterval * HARD_MULTIPLIER));
                newEase = currentEase - 0.15;
                newLearningStep = null;
                break;
            case 'good':
                nextState = 'REVIEW';
                newInterval = Math.max(currentInterval + 1, Math.floor(currentInterval * currentEase));
                newLearningStep = null;
                break;
            case 'easy':
                nextState = 'REVIEW';
                newInterval = Math.max(currentInterval + 1, Math.floor(currentInterval * currentEase * EASY_BONUS));
                newEase = currentEase + 0.15;
                newLearningStep = null;
                break;
            default:
                nextState = 'REVIEW';
                newInterval = Math.max(currentInterval + 1, Math.floor(currentInterval * currentEase));
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
    // Anki theo dõi reps là số lần ôn tập thực sự (graduated reviews), không phải tổng số lần bấm nút
    let newReps = currentReps;
    if (nextState === 'REVIEW') {
        newReps = currentReps + 1;
    }

    // Calculate milliseconds offset for scheduleNext
    let nextReviewOffsetMs = 0;
    if (nextState === 'REVIEW') {
        nextReviewOffsetMs = newInterval * 24 * 60 * 60 * 1000; // day-based
    } else {
        nextReviewOffsetMs = newInterval * 60 * 1000; // minute-based
    }

    return {
        interval: newInterval,
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
