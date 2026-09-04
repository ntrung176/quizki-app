// Helper to deeply strip undefined values and sanitize objects before writing to Firestore
export const cleanFirestoreData = (input) => {
    if (input === undefined) return undefined;
    if (input === null || typeof input !== 'object') return input;

    if (Array.isArray(input)) {
        return input
            .map(item => cleanFirestoreData(item))
            .filter(item => item !== undefined);
    }

    // Preserve special non-plain objects (Firestore FieldValue, Timestamp, Date, etc.)
    const proto = Object.getPrototypeOf(input);
    const isPlainObject = proto === null || proto === Object.prototype;
    if (!isPlainObject) {
        return input;
    }

    const cleaned = {};
    for (const [key, val] of Object.entries(input)) {
        if (val !== undefined) {
            const cleanedVal = cleanFirestoreData(val);
            if (cleanedVal !== undefined) {
                cleaned[key] = cleanedVal;
            }
        }
    }
    return cleaned;
};

