import { SRS_INTERVALS } from '../config/constants';

// Get next review date based on SRS interval index
export const getNextReviewDate = (intervalIndex) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (intervalIndex < 0 || intervalIndex >= SRS_INTERVALS.length) {
        // Nếu index vượt quá, sử dụng mức cao nhất
        const maxInterval = SRS_INTERVALS[SRS_INTERVALS.length - 1];
        today.setDate(today.getDate() + maxInterval);
        return today.getTime();
    }

    today.setDate(today.getDate() + SRS_INTERVALS[intervalIndex]);
    return today.getTime();
};

// Get SRS progress text
export const getSrsProgressText = (intervalIndex) => {
    if (intervalIndex === -1) return 'Mới';
    if (intervalIndex === 0) return 'Học 1';
    if (intervalIndex === 1) return 'Học 2';
    if (intervalIndex === 2) return 'SRS 1';
    if (intervalIndex === 3) return 'SRS 2';
    if (intervalIndex >= 4) return 'Thuộc';
    return 'Mới';
};

// Check if card is due for review
export const isCardDue = (nextReviewTimestamp) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return nextReviewTimestamp <= today.getTime();
};

// Calculate correct interval based on timestamp
export const calculateCorrectInterval = (interval, nextReviewTimestamp) => {
    if (typeof interval === 'number' && interval >= 0 && interval < SRS_INTERVALS.length) {
        return interval;
    }

    // Fallback: estimate from next review date
    if (nextReviewTimestamp) {
        const now = Date.now();
        const daysUntilReview = Math.floor((nextReviewTimestamp - now) / (1000 * 60 * 60 * 24));

        for (let i = SRS_INTERVALS.length - 1; i >= 0; i--) {
            if (daysUntilReview >= SRS_INTERVALS[i]) {
                return i;
            }
        }
    }

    return 0;
};

// Get SRS color based on interval index
export const getSrsColor = (intervalIndex) => {
    if (intervalIndex === -1 || intervalIndex === undefined) {
        return 'text-gray-400';
    }
    if (intervalIndex === 0 || intervalIndex === 1) {
        return 'text-orange-500';
    }
    if (intervalIndex === 2) {
        return 'text-blue-500';
    }
    if (intervalIndex === 3) {
        return 'text-purple-500';
    }
    if (intervalIndex >= 4) {
        return 'text-emerald-500';
    }
    return 'text-gray-400';
};

// Get SRS badge color
export const getSrsBadgeColor = (intervalIndex) => {
    if (intervalIndex === -1 || intervalIndex === undefined) {
        return 'bg-gray-100 text-gray-600 border-gray-200';
    }
    if (intervalIndex === 0 || intervalIndex === 1) {
        return 'bg-orange-100 text-orange-700 border-orange-200';
    }
    if (intervalIndex === 2) {
        return 'bg-blue-100 text-blue-700 border-blue-200';
    }
    if (intervalIndex === 3) {
        return 'bg-purple-100 text-purple-700 border-purple-200';
    }
    if (intervalIndex >= 4) {
        return 'bg-emerald-100 text-emerald-700 border-emerald-200';
    }
    return 'bg-gray-100 text-gray-600 border-gray-200';
};
