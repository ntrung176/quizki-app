/**
 * studySetSorter.js
 * Utility to sort study sets and folders chronologically from oldest to newest (cũ -> mới),
 * with natural alphanumeric title comparison fallback (e.g. "1 ~ 50" before "161 ~ 220").
 */

export const getCreationTime = (item) => {
    if (!item) return 0;
    if (typeof item.createdAt === 'number') return item.createdAt;
    if (item.createdAt?.seconds) return item.createdAt.seconds * 1000 + (item.createdAt.nanoseconds ? item.createdAt.nanoseconds / 1000000 : 0);
    if (typeof item.createdAt?.toDate === 'function') return item.createdAt.toDate().getTime();
    if (item.createdAt instanceof Date) return item.createdAt.getTime();
    if (typeof item.updatedAt === 'number') return item.updatedAt;
    if (item.updatedAt?.seconds) return item.updatedAt.seconds * 1000;
    return 0;
};

export const sortStudySetsOldToNew = (list) => {
    if (!Array.isArray(list)) return [];
    return [...list].sort((a, b) => {
        const timeA = getCreationTime(a);
        const timeB = getCreationTime(b);
        if (timeA && timeB && timeA !== timeB) {
            return timeA - timeB; // Cũ -> Mới (Oldest to newest)
        }
        if (timeA && !timeB) return -1;
        if (!timeA && timeB) return 1;
        const nameA = a.name || a.title || '';
        const nameB = b.name || b.title || '';
        return nameA.localeCompare(nameB, undefined, { numeric: true, sensitivity: 'base' });
    });
};

