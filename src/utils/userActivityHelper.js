/**
 * Utility functions for user activity tracking, last active timestamp extraction,
 * online presence detection, and human-readable time formatting.
 */

/**
 * Trích xuất timestamp (ms) hoạt động gần nhất của người dùng từ đối tượng hoặc giá trị timestamp
 * Hỗ trợ đa dạng trường: lastActive, lastActiveAt, userLastActive, updatedAt, lastUpdated, lastLoginAt, createdAt
 * Hỗ trợ các kiểu dữ liệu: Firestore Timestamp (toMillis/toDate/seconds), number, ISO string, Date
 */
export const extractUserLastActive = (userOrObj) => {
    if (!userOrObj) return 0;
    
    // Nếu truyền vào trực tiếp là number (timestamp ms hoặc unix seconds)
    if (typeof userOrObj === 'number') {
        if (userOrObj <= 0) return 0;
        return userOrObj < 10000000000 ? userOrObj * 1000 : userOrObj;
    }
    
    // Nếu truyền vào trực tiếp là Firestore Timestamp object
    if (typeof userOrObj?.toMillis === 'function') {
        try { return userOrObj.toMillis(); } catch (_) { return 0; }
    }
    if (typeof userOrObj?.toDate === 'function') {
        try { return userOrObj.toDate().getTime(); } catch (_) { return 0; }
    }
    if (typeof userOrObj?.seconds === 'number') {
        return userOrObj.seconds * 1000;
    }
    
    // Nếu truyền vào trực tiếp là Date object
    if (userOrObj instanceof Date) {
        const time = userOrObj.getTime();
        return isNaN(time) ? 0 : time;
    }
    
    // Nếu truyền vào trực tiếp là ISO Date string hoặc timestamp string
    if (typeof userOrObj === 'string') {
        if (/^\d+$/.test(userOrObj)) {
            const num = Number(userOrObj);
            return num < 10000000000 ? num * 1000 : num;
        }
        const parsed = new Date(userOrObj).getTime();
        return isNaN(parsed) ? 0 : parsed;
    }

    // Nếu truyền vào là User object hoặc Thread object có nhiều trường timestamp
    const candidates = [
        userOrObj.lastActive,
        userOrObj.lastActiveAt,
        userOrObj.userLastActive,
        userOrObj.updatedAt,
        userOrObj.lastUpdated,
        userOrObj.lastLoginAt,
        userOrObj.lastSeen,
        userOrObj.lastActivity,
        userOrObj.lastStudy,
        userOrObj.lastSyncedAt,
        userOrObj.lastMessage?.createdAt,
        userOrObj.createdAt
    ];

    let maxTime = 0;
    for (const val of candidates) {
        if (!val) continue;
        const time = extractUserLastActive(val);
        if (time > maxTime) {
            maxTime = time;
        }
    }

    // Nếu dữ liệu timestamp trong Firestore bị cũ do lịch sử đồng bộ nhưng học viên đang có chuỗi Streak hoặc điểm tuần hoạt động
    const streak = Number(userOrObj.streak || 0);
    const weeklyScore = Number(userOrObj.weeklyScore || 0);
    const reviewsLast7Days = Number(userOrObj.reviewsLast7Days || 0);
    const addedLast7Days = Number(userOrObj.addedLast7Days || 0);
    const kanjiLast7Days = Number(userOrObj.kanjiAddedLast7Days || userOrObj.kanjiLast7Days || 0);
    const hasWeeklyActivity = weeklyScore > 0 || reviewsLast7Days > 0 || addedLast7Days > 0 || kanjiLast7Days > 0;

    const now = Date.now();
    const TWO_DAYS_MS = 2 * 24 * 60 * 60 * 1000;
    const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

    if (streak > 0 && (maxTime === 0 || (now - maxTime > TWO_DAYS_MS))) {
        // Có streak > 0 chứng minh học viên đã học hôm nay hoặc hôm qua
        maxTime = Math.max(maxTime, now - 12 * 60 * 60 * 1000);
    } else if (hasWeeklyActivity && (maxTime === 0 || (now - maxTime > SEVEN_DAYS_MS))) {
        // Có hoạt động tuần nhưng timestamp DB chưa cập nhật
        maxTime = Math.max(maxTime, now - 24 * 60 * 60 * 1000);
    }

    return maxTime;
};

/**
 * Kiểm tra xem người dùng có đang online/trực tuyến không (mặc định trong vòng 3 phút)
 */
export const isUserOnline = (userOrTimestamp, thresholdMs = 3 * 60 * 1000) => {
    const lastActiveTime = extractUserLastActive(userOrTimestamp);
    if (!lastActiveTime) return false;
    const diff = Date.now() - lastActiveTime;
    return diff >= 0 && diff < thresholdMs;
};

/**
 * Định dạng thời gian hoạt động cuối cùng của người dùng theo tiếng Việt
 * Ví dụ: "Vừa hoạt động", "5 phút trước", "2 giờ trước", "Hôm qua", "3 ngày trước"
 */
export const formatLastActive = (userOrTimestamp, fallbackText = 'Không rõ') => {
    const lastActiveTime = extractUserLastActive(userOrTimestamp);
    if (!lastActiveTime) return fallbackText;
    
    const diffMs = Date.now() - lastActiveTime;
    if (diffMs < 0) return 'Vừa hoạt động';
    
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Vừa hoạt động';
    if (diffMins < 60) return `${diffMins} phút trước`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} giờ trước`;
    
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return 'Hôm qua';
    return `${diffDays} ngày trước`;
};
