// Helper to strip undefined values before writing to Firestore
export const cleanFirestoreData = (obj) => {
    if (!obj || typeof obj !== 'object') return obj;
    const cleaned = {};
    Object.keys(obj).forEach(key => {
        if (obj[key] !== undefined) {
            cleaned[key] = obj[key];
        }
    });
    return cleaned;
};
