import { SRS_INTERVALS, GRADUATION_INTERVAL, MASTERED_THRESHOLD, MAX_INTERVAL, formatIntervalMinutes } from '../config/constants';

// ==================== SRS ENGINE v2 ====================
// Hệ thống SRS nâng cao với:
// - Ease Factor (hệ số khó/dễ) cho mỗi từ vựng 
// - Trọng số học tập từ nhiều hoạt động (flashcard, study, review ý nghĩa, đồng nghĩa, ngữ cảnh)
// - Tính toán interval động dựa trên hiệu suất người dùng

// ==================== CONSTANTS ====================

// Ease Factor mặc định (tương tự SM-2 algorithm)
export const DEFAULT_EASE = 2.5;
export const MIN_EASE = 1.3;
export const MAX_EASE = 3.5;

// Trọng số ảnh hưởng SRS từ mỗi loại hoạt động
export const ACTIVITY_WEIGHTS = {
    flashcard: 0.3,    // Lật flashcard (nhẹ nhất - chỉ xem qua)
    study: 0.6,        // Chế độ học (trung bình - trắc nghiệm)
    review_back: 1.0,  // Ôn tập ý nghĩa (nặng nhất - test nhớ lại)
    review_synonym: 0.8, // Ôn tập đồng nghĩa
    review_example: 0.8, // Ôn tập ngữ cảnh
};

// Rating levels - đánh giá chất lượng câu trả lời
export const RATING = {
    AGAIN: 0,    // Hoàn toàn sai / không nhớ
    HARD: 1,     // Nhớ nhưng rất khó
    GOOD: 2,     // Nhớ bình thường
    EASY: 3,     // Nhớ rất dễ
};

// Interval base cho learning steps (phút)
export const LEARNING_STEPS = [1, 10]; // Bước 1: 1 phút, Bước 2: 10 phút

// ==================== CORE SRS FUNCTIONS ====================

/**
 * Tính ease factor mới sau khi ôn tập
 * @param {number} currentEase - Ease factor hiện tại
 * @param {number} rating - Đánh giá (0-3)
 * @param {number} activityWeight - Trọng số của loại hoạt động
 * @returns {number} Ease factor mới
 */
export const calculateNewEase = (currentEase, rating, activityWeight = 1.0) => {
    const ease = currentEase || DEFAULT_EASE;

    // Số thay đổi ease dựa trên rating (mượt hơn SM-2)
    let easeDelta;
    switch (rating) {
        case RATING.AGAIN:
            easeDelta = -0.20 * activityWeight;
            break;
        case RATING.HARD:
            easeDelta = -0.10 * activityWeight;
            break;
        case RATING.GOOD:
            easeDelta = 0.0;
            break;
        case RATING.EASY:
            easeDelta = 0.15 * activityWeight;
            break;
        default:
            easeDelta = 0;
    }

    const newEase = ease + easeDelta;
    return Math.max(MIN_EASE, Math.min(MAX_EASE, newEase));
};

/**
 * Tính interval tiếp theo (phút)
 * @param {number} currentInterval - Interval hiện tại (index trong SRS_INTERVALS)
 * @param {number} ease - Ease factor
 * @param {number} rating - Đánh giá (0-3) 
 * @param {number} activityWeight - Trọng số hoạt động
 * @param {number} reps - Số lần ôn tập liên tiếp đúng
 * @returns {{ newInterval: number, newIntervalMinutes: number }} Interval mới (index) và thời gian (phút)
 */
export const calculateNextInterval = (currentInterval, ease, rating, activityWeight = 1.0, reps = 0) => {
    const effectiveEase = ease || DEFAULT_EASE;

    // Nếu trả lời sai (AGAIN)
    if (rating === RATING.AGAIN) {
        return {
            newInterval: 0, // Reset về bước đầu
            newIntervalMinutes: LEARNING_STEPS[0],
        };
    }

    // Thẻ mới hoặc đang trong giai đoạn learning
    if (currentInterval < 0) {
        // Thẻ mới: bắt đầu learning
        if (rating === RATING.EASY) {
            // Nếu dễ, bỏ qua learning, chuyển thẳng sang graduated
            return {
                newInterval: 1, // 1 ngày
                newIntervalMinutes: SRS_INTERVALS[1],
            };
        }
        return {
            newInterval: 0, // Learning step 1
            newIntervalMinutes: LEARNING_STEPS[LEARNING_STEPS.length - 1], // 10 phút
        };
    }

    // Đang ở bước learning (interval 0)
    if (currentInterval === 0) {
        if (rating === RATING.EASY) {
            return {
                newInterval: 2,
                newIntervalMinutes: SRS_INTERVALS[2],
            };
        }
        // Graduate sang review
        return {
            newInterval: 1,
            newIntervalMinutes: SRS_INTERVALS[1],
        };
    }

    // Đã graduated - tính toán interval mới
    let multiplier;
    switch (rating) {
        case RATING.HARD:
            multiplier = 1.2 * activityWeight;
            break;
        case RATING.GOOD:
            multiplier = effectiveEase * activityWeight;
            break;
        case RATING.EASY:
            multiplier = effectiveEase * 1.3 * activityWeight;
            break;
        default:
            multiplier = effectiveEase;
    }

    // Tính interval mới dựa trên interval hiện tại * multiplier  
    const currentMinutes = SRS_INTERVALS[currentInterval] || SRS_INTERVALS[SRS_INTERVALS.length - 1];
    const newMinutes = Math.round(currentMinutes * multiplier);

    // Tìm interval index gần nhất
    let newInterval = currentInterval;
    for (let i = SRS_INTERVALS.length - 1; i >= 0; i--) {
        if (newMinutes >= SRS_INTERVALS[i]) {
            newInterval = i;
            break;
        }
    }

    // Đảm bảo tối thiểu tăng 1 bậc nếu GOOD hoặc EASY
    if (rating >= RATING.GOOD && newInterval <= currentInterval) {
        newInterval = Math.min(currentInterval + 1, SRS_INTERVALS.length - 1);
    }

    return {
        newInterval,
        newIntervalMinutes: SRS_INTERVALS[newInterval],
    };
};

/**
 * Đánh giá rating dựa trên kết quả và loại hoạt động
 * @param {boolean} isCorrect - Đúng hay sai
 * @param {string} activityType - Loại hoạt động: 'flashcard_known', 'flashcard_unknown', 'study', 'review'
 * @param {number} attempts - Số lần thử (nếu trả lời sai rồi sửa lại)
 * @param {number} responseTimeMs - Thời gian trả lời (ms) - dùng cho implicit EASY
 * @returns {number} Rating (0-3)
 */
export const evaluateRating = (isCorrect, activityType, attempts = 1, responseTimeMs = null) => {
    if (!isCorrect) return RATING.AGAIN;

    // Ngưỡng thời gian "nhanh" để đánh giá EASY (3 giây)
    const FAST_THRESHOLD_MS = 3000;
    const isFastResponse = responseTimeMs !== null && responseTimeMs > 0 && responseTimeMs < FAST_THRESHOLD_MS;

    switch (activityType) {
        case 'flashcard_known':
            // Bấm "Đã thuộc" trong flashcard
            return isFastResponse ? RATING.EASY : RATING.GOOD;
        case 'flashcard_unknown':
            // Bấm "Chưa thuộc" trong flashcard
            return RATING.AGAIN;
        case 'study':
            // Chế độ học - trắc nghiệm
            if (attempts === 1 && isFastResponse) return RATING.EASY;
            if (attempts === 1) return RATING.GOOD;
            return RATING.HARD; // Cần nhiều lần thử
        case 'review':
            // Ôn tập - nhập đáp án / trắc nghiệm
            if (attempts === 1 && isFastResponse) return RATING.EASY;
            if (attempts === 1) return RATING.GOOD;
            return RATING.HARD;
        default:
            if (isCorrect && isFastResponse) return RATING.EASY;
            return isCorrect ? RATING.GOOD : RATING.AGAIN;
    }
};

/**
 * Xử lý SRS update tổng hợp - tính toán tất cả thay đổi
 * @param {Object} cardData - Dữ liệu thẻ hiện tại
 * @param {boolean} isCorrect - Kết quả
 * @param {string} reviewType - 'back' | 'synonym' | 'example'
 * @param {string} activityType - 'flashcard_known' | 'flashcard_unknown' | 'study' | 'review'
 * @param {number} responseTimeMs - Thời gian trả lời (ms) - dùng cho implicit EASY
 * @returns {Object} Dữ liệu cập nhật
 */
export const processSrsUpdate = (cardData, isCorrect, reviewType, activityType = 'review', responseTimeMs = null) => {
    const now = Date.now();
    const updateData = {
        lastReviewed: now,
    };

    // Lấy ease factor hiện tại
    const currentEase = typeof cardData.easeFactor === 'number' ? cardData.easeFactor : DEFAULT_EASE;

    // Lấy thông tin SRS hiện tại
    const currentInterval = typeof cardData.intervalIndex_back === 'number' ? cardData.intervalIndex_back : -1;
    const reps = typeof cardData.totalReps === 'number' ? cardData.totalReps : 0;

    // Lấy streak của các phần
    const backStreak = typeof cardData.correctStreak_back === 'number' ? cardData.correctStreak_back : 0;
    const synonymStreak = typeof cardData.correctStreak_synonym === 'number' ? cardData.correctStreak_synonym : 0;
    const exampleStreak = typeof cardData.correctStreak_example === 'number' ? cardData.correctStreak_example : 0;

    const hasSynonym = cardData.synonym && cardData.synonym.trim() !== '';
    const hasExample = cardData.example && cardData.example.trim() !== '';

    // === TRACKING: đếm tổng số lần đúng/sai ===
    const prevCorrectCount = typeof cardData.correctCount === 'number' ? cardData.correctCount : 0;
    const prevIncorrectCount = typeof cardData.incorrectCount === 'number' ? cardData.incorrectCount : 0;
    if (isCorrect) {
        updateData.correctCount = prevCorrectCount + 1;
    } else {
        updateData.incorrectCount = prevIncorrectCount + 1;
    }

    // Xác định rating (implicit EASY nếu trả lời nhanh < 3 giây)
    const rating = evaluateRating(isCorrect, activityType, 1, responseTimeMs);
    const ratingNames = ['AGAIN', 'HARD', 'GOOD', 'EASY'];
    console.log(`[SRS] Rating: ${ratingNames[rating]} | responseTime: ${responseTimeMs ? (responseTimeMs / 1000).toFixed(1) + 's' : 'N/A'}`);

    // Xác định activity weight
    let activityWeight = ACTIVITY_WEIGHTS.review_back;
    if (activityType === 'flashcard_known' || activityType === 'flashcard_unknown') {
        activityWeight = ACTIVITY_WEIGHTS.flashcard;
    } else if (activityType === 'study') {
        activityWeight = ACTIVITY_WEIGHTS.study;
    } else if (reviewType === 'synonym') {
        activityWeight = ACTIVITY_WEIGHTS.review_synonym;
    } else if (reviewType === 'example') {
        activityWeight = ACTIVITY_WEIGHTS.review_example;
    }

    // Cập nhật ease factor
    const newEase = calculateNewEase(currentEase, rating, activityWeight);
    updateData.easeFactor = newEase;

    // ===== FLASHCARD / STUDY: chỉ ảnh hưởng ease, KHÔNG thay đổi streak hay interval =====
    const isFlashcardOrStudy = activityType === 'flashcard_known' || activityType === 'flashcard_unknown' || activityType === 'study';

    if (isFlashcardOrStudy) {
        // Flashcard/Study chỉ cập nhật ease factor + tracking
        // KHÔNG thay đổi streak, interval, hay nextReview
        console.log(`[SRS] ${activityType}: chỉ cập nhật ease ${currentEase} → ${newEase}`);
        return updateData;
    }

    // ===== REVIEW MODE: cập nhật streak và xét hoàn thành chu kỳ =====

    // Cập nhật streak của phần được ôn tập
    let newBackStreak = backStreak;
    let newSynonymStreak = synonymStreak;
    let newExampleStreak = exampleStreak;

    if (isCorrect) {
        if (reviewType === 'back') newBackStreak = backStreak + 1;
        else if (reviewType === 'synonym') newSynonymStreak = synonymStreak + 1;
        else if (reviewType === 'example') newExampleStreak = exampleStreak + 1;
    } else {
        if (reviewType === 'back') newBackStreak = 0;
        else if (reviewType === 'synonym') newSynonymStreak = 0;
        else if (reviewType === 'example') newExampleStreak = 0;
    }

    updateData.correctStreak_back = newBackStreak;
    if (hasSynonym) updateData.correctStreak_synonym = newSynonymStreak;
    if (hasExample) updateData.correctStreak_example = newExampleStreak;

    // Kiểm tra hoàn thành chu kỳ (tất cả phần đều streak >= 1)
    const backCompleted = newBackStreak >= 1;
    const synonymCompleted = !hasSynonym || newSynonymStreak >= 1; // Nếu không có synonym thì coi là hoàn thành
    const exampleCompleted = !hasExample || newExampleStreak >= 1;

    const allCompleted = backCompleted && synonymCompleted && exampleCompleted;

    if (allCompleted) {
        // ===== DYNAMIC MULTIPLIER SRS ENGINE =====
        let newIntervalIndex;
        let nextIntervalMinutes;

        if (currentInterval < 0) {
            // Thẻ mới → Bước học 1: 10 phút
            newIntervalIndex = 0;
            nextIntervalMinutes = SRS_INTERVALS[0]; // 10 phút
        } else if (currentInterval === 0) {
            // Bước học 1 → Bước học 2: 1 ngày
            newIntervalIndex = 1;
            nextIntervalMinutes = SRS_INTERVALS[1]; // 1440 phút = 1 ngày
        } else if (currentInterval === 1) {
            // Tốt nghiệp learning → First graduated review: 3 ngày
            newIntervalIndex = 2;
            nextIntervalMinutes = GRADUATION_INTERVAL; // 4320 phút = 3 ngày
        } else {
            // === GRADUATED: Dynamic Multiplier ===
            // Interval mới = interval cũ × ease factor
            newIntervalIndex = currentInterval + 1;
            const lastInterval = typeof cardData.currentInterval_back === 'number' && cardData.currentInterval_back > 0
                ? cardData.currentInterval_back
                : GRADUATION_INTERVAL;
            nextIntervalMinutes = Math.round(lastInterval * newEase);
            // Giới hạn tối đa 365 ngày
            nextIntervalMinutes = Math.min(nextIntervalMinutes, MAX_INTERVAL);
        }

        const nextReviewDate = now + nextIntervalMinutes * 60000;

        console.log(`[SRS] ✅ Hoàn thành chu kỳ! index ${currentInterval} → ${newIntervalIndex} | interval: ${nextIntervalMinutes}min (${(nextIntervalMinutes / 1440).toFixed(1)} ngày) | ease: ${newEase.toFixed(2)}`);

        updateData.intervalIndex_back = newIntervalIndex;
        updateData.nextReview_back = nextReviewDate;
        updateData.currentInterval_back = nextIntervalMinutes;
        updateData.totalReps = reps + 1;

        if (hasSynonym) {
            updateData.intervalIndex_synonym = newIntervalIndex;
            updateData.nextReview_synonym = nextReviewDate;
        }
        if (hasExample) {
            updateData.intervalIndex_example = newIntervalIndex;
            updateData.nextReview_example = nextReviewDate;
        }

        // Reset streaks sau khi hoàn thành chu kỳ
        updateData.correctStreak_back = 0;
        if (hasSynonym) updateData.correctStreak_synonym = 0;
        if (hasExample) updateData.correctStreak_example = 0;
    } else {
        // Chưa hoàn thành → giữ thẻ ở trạng thái "due" (nextReview = now)
        updateData.nextReview_back = now;
        if (hasSynonym) updateData.nextReview_synonym = now;
        if (hasExample) updateData.nextReview_example = now;

        // Nếu thẻ mới, bắt đầu learning
        if (currentInterval < 0) {
            updateData.intervalIndex_back = 0;
            if (hasSynonym) updateData.intervalIndex_synonym = 0;
            if (hasExample) updateData.intervalIndex_example = 0;
        }

        // Sai khi đang graduated (index >= 2) → Lapse penalty
        if (!isCorrect && currentInterval >= 2) {
            const lastInterval = typeof cardData.currentInterval_back === 'number' && cardData.currentInterval_back > 0
                ? cardData.currentInterval_back
                : GRADUATION_INTERVAL;
            // Lapse: giảm 50% interval, không thấp hơn graduation interval
            const lapsedInterval = Math.max(GRADUATION_INTERVAL, Math.round(lastInterval * 0.5));
            updateData.currentInterval_back = lapsedInterval;
            const lapseIndex = Math.max(2, currentInterval - 1);
            updateData.intervalIndex_back = lapseIndex;
            if (hasSynonym) updateData.intervalIndex_synonym = lapseIndex;
            if (hasExample) updateData.intervalIndex_example = lapseIndex;
            console.log(`[SRS] ⚠️ Lapse! interval giảm: ${lastInterval} → ${lapsedInterval}min`);
        } else if (!isCorrect && currentInterval === 1) {
            // Sai khi đang learning step 2 → về learning step 1
            updateData.intervalIndex_back = 0;
            if (hasSynonym) updateData.intervalIndex_synonym = 0;
            if (hasExample) updateData.intervalIndex_example = 0;
        }

        console.log(`[SRS] Chưa hoàn thành chu kỳ. back:${newBackStreak} syn:${newSynonymStreak} ex:${newExampleStreak}`);
    }

    return updateData;
};

// ==================== UTILITY FUNCTIONS ====================

// Get next review date based on SRS interval index (now in minutes)
export const getNextReviewDate = (intervalIndex) => {
    const now = Date.now();

    if (intervalIndex < 0 || intervalIndex >= SRS_INTERVALS.length) {
        // Nếu index vượt quá, sử dụng mức cao nhất
        const maxInterval = SRS_INTERVALS[SRS_INTERVALS.length - 1];
        return now + maxInterval * 60000;
    }

    return now + SRS_INTERVALS[intervalIndex] * 60000;
};

// Get SRS progress text - with ease info
export const getSrsProgressText = (intervalIndex, ease, currentInterval) => {
    let text = '';
    if (intervalIndex === -1) text = 'Mới';
    else if (intervalIndex === 0) text = 'Học 1';
    else if (intervalIndex === 1) text = 'Học 2';
    else if (intervalIndex >= 2) {
        // Graduated phase: kiểm tra actual interval
        const effectiveInterval = currentInterval || (intervalIndex < SRS_INTERVALS.length ? SRS_INTERVALS[intervalIndex] : 0);
        if (effectiveInterval >= MASTERED_THRESHOLD) {
            text = 'Thuộc';
        } else {
            text = `SRS ${intervalIndex - 1}`;
        }
    }
    else text = 'Mới';

    // Thêm indicator độ khó
    if (ease && intervalIndex >= 0) {
        if (ease < 1.8) text += ' 🔴'; // Rất khó
        else if (ease < 2.2) text += ' 🟡'; // Khó
        else if (ease > 2.8) text += ' 🟢'; // Dễ
    }

    return text;
};

// Check if card is due for review (now compares timestamps directly)
export const isCardDue = (nextReviewTimestamp) => {
    return nextReviewTimestamp <= Date.now();
};

// Calculate correct interval based on timestamp
export const calculateCorrectInterval = (interval, nextReviewTimestamp) => {
    if (typeof interval === 'number' && interval >= 0 && interval < SRS_INTERVALS.length) {
        return interval;
    }

    // Fallback: estimate from next review date
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

// Get SRS color based on interval index and actual interval
export const getSrsColor = (intervalIndex, currentInterval) => {
    if (intervalIndex === -1 || intervalIndex === undefined) {
        return 'text-gray-400';
    }
    if (intervalIndex === 0 || intervalIndex === 1) {
        return 'text-orange-500';
    }
    // Graduated: check actual interval for mastered status
    const effectiveInterval = currentInterval || (intervalIndex < SRS_INTERVALS.length ? SRS_INTERVALS[intervalIndex] : 0);
    if (effectiveInterval >= MASTERED_THRESHOLD) {
        return 'text-emerald-500';
    }
    if (intervalIndex >= 2) {
        return 'text-blue-500';
    }
    return 'text-gray-400';
};

// Get SRS badge color
export const getSrsBadgeColor = (intervalIndex, currentInterval) => {
    if (intervalIndex === -1 || intervalIndex === undefined) {
        return 'bg-gray-100 text-gray-600 border-gray-200';
    }
    if (intervalIndex === 0 || intervalIndex === 1) {
        return 'bg-orange-100 text-orange-700 border-orange-200';
    }
    // Graduated: check actual interval for mastered status
    const effectiveInterval = currentInterval || (intervalIndex < SRS_INTERVALS.length ? SRS_INTERVALS[intervalIndex] : 0);
    if (effectiveInterval >= MASTERED_THRESHOLD) {
        return 'bg-emerald-100 text-emerald-700 border-emerald-200';
    }
    if (intervalIndex >= 2) {
        return 'bg-blue-100 text-blue-700 border-blue-200';
    }
    return 'bg-gray-100 text-gray-600 border-gray-200';
};

// Format thời gian đếm ngược: nếu < 24 giờ thì hiện HH:MM:SS, nếu >= 1 ngày thì hiện "X ngày"
export const formatCountdown = (targetTimestamp) => {
    const diff = targetTimestamp - Date.now();
    if (diff <= 0) return null; // Đã đến hạn

    const totalSeconds = Math.floor(diff / 1000);
    const days = Math.floor(totalSeconds / 86400);

    if (days >= 1) {
        return { text: `${days} ngày`, isCountdown: false };
    }

    // Dưới 24 giờ: hiện bộ đếm ngược HH:MM:SS
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
