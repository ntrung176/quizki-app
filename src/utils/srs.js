import { SRS_INTERVALS, formatIntervalMinutes } from '../config/constants';

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
