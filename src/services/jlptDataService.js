import { collection, query, onSnapshot } from 'firebase/firestore';
import { db, appId } from '../config/firebase';
import { getCacheConfig } from '../utils/cacheConfigService';

// Module-level Singleton State
let cachedTests = null;
const baseTestsMap = new Map();
const firestoreDocsMap = new Map();
const subscribers = new Set();
let sharedPromise = null;
let firestoreUnsub = null;

const notifySubscribers = () => {
    const list = cachedTests || [];
    subscribers.forEach((cb) => {
        try {
            cb(list);
        } catch (err) {
            console.error('[jlptDataService] Subscriber error:', err);
        }
    });
};

const normalizeTest = (t) => {
    if (!t || !t.sections) return t;
    t.sections.forEach((sec) => {
        if (sec.passages && Array.isArray(sec.passages)) {
            (sec.questions || []).forEach((q) => {
                if (typeof q.passageIndex === 'number' && sec.passages[q.passageIndex]) {
                    if (!q.passage) q.passage = sec.passages[q.passageIndex].passage;
                    if (!q.passageData) q.passageData = sec.passages[q.passageIndex].passageData;
                }
            });
        }
    });
    return t;
};

const recomputeCombinedTests = () => {
    const combinedMap = new Map();

    // 1. Base tests (static JSON + CDN)
    baseTestsMap.forEach((test, id) => {
        combinedMap.set(id, normalizeTest(test));
    });

    // 2. Firestore overlay / custom docs
    firestoreDocsMap.forEach((docItem, id) => {
        if (combinedMap.has(id)) {
            combinedMap.set(id, normalizeTest({ ...combinedMap.get(id), ...docItem }));
        } else {
            combinedMap.set(id, normalizeTest(docItem));
        }
    });

    cachedTests = Array.from(combinedMap.values());
    notifySubscribers();
    return cachedTests;
};

const startFirestoreListener = () => {
    if (firestoreUnsub || !db) return;
    try {
        const testsPath = `artifacts/${appId}/jlptTests`;
        const q = query(collection(db, testsPath));
        firestoreUnsub = onSnapshot(
            q,
            (snap) => {
                firestoreDocsMap.clear();
                snap.docs.forEach((d) => {
                    firestoreDocsMap.set(d.id, { id: d.id, ...d.data() });
                });
                recomputeCombinedTests();
            },
            (err) => {
                console.warn('[jlptDataService] Firestore jlptTests listener warning:', err);
            }
        );
    } catch (e) {
        console.error('[jlptDataService] Firestore setup error:', e);
    }
};

export const invalidateJLPTCache = () => {
    cachedTests = null;
    sharedPromise = null;
    baseTestsMap.clear();
    firestoreDocsMap.clear();
};

if (typeof window !== 'undefined') {
    window.addEventListener('cache-config-updated', () => {
        invalidateJLPTCache();
        getSharedJLPTTests(true);
    });
}

/**
 * Returns currently cached JLPT tests synchronously (0ms)
 */
export const getSynchronousJLPTTests = () => {
    return cachedTests || [];
};

/**
 * Returns true if JLPT test data has already been loaded into memory
 */
export const isJLPTDataLoaded = () => {
    return cachedTests !== null && cachedTests.length > 0;
};

/**
 * Loads JLPT tests with in-memory caching and request deduplication.
 * Hierarchy: In-Memory RAM -> Firebase Storage CDN -> Local Bundled JSON -> Realtime Firestore Overlay
 */
export const getSharedJLPTTests = async (forceRefresh = false) => {
    if (!forceRefresh && cachedTests && cachedTests.length > 0) {
        return cachedTests;
    }

    if (sharedPromise && !forceRefresh) {
        return sharedPromise;
    }

    sharedPromise = (async () => {
        let loadedBase = false;
        let cacheConfig = null;
        try {
            cacheConfig = await getCacheConfig();
        } catch (e) {
            console.warn('[jlptDataService] Cache config fetch warning:', e);
        }

        // 1. Try Firebase Storage CDN if available
        if (cacheConfig && cacheConfig.jlptUrl) {
            try {
                const urlWithBuster = cacheConfig.jlptUrl.includes('?')
                    ? `${cacheConfig.jlptUrl}&t=${cacheConfig.exportedAt || Date.now()}`
                    : `${cacheConfig.jlptUrl}?t=${cacheConfig.exportedAt || Date.now()}`;
                const res = await fetch(urlWithBuster);
                if (res && res.ok) {
                    const data = await res.json();
                    if (Array.isArray(data) && data.length > 0) {
                        baseTestsMap.clear();
                        data.forEach((t) => baseTestsMap.set(t.id, t));
                        loadedBase = true;
                    }
                }
            } catch (cdnErr) {
                console.warn('[jlptDataService] CDN jlpt_data.json load failed, trying local bundle:', cdnErr);
            }
        }

        // 2. Fallback to static local file /data/jlpt_data.json
        if (!loadedBase) {
            try {
                const res = await fetch(`/data/jlpt_data.json?t=${Date.now()}`);
                if (res && res.ok) {
                    const data = await res.json();
                    if (Array.isArray(data) && data.length > 0) {
                        baseTestsMap.clear();
                        data.forEach((t) => baseTestsMap.set(t.id, t));
                        loadedBase = true;
                    }
                }
            } catch (e) {
                console.warn('[jlptDataService] Local jlpt_data.json load warning:', e);
            }
        }

        // 3. Compute combined map with Firestore overlay
        const result = recomputeCombinedTests();

        // 4. Start Firestore real-time listener if not already started
        startFirestoreListener();

        return result;
    })()
        .catch((err) => {
            console.error('[jlptDataService] Error loading tests:', err);
            return cachedTests || [];
        })
        .finally(() => {
            sharedPromise = null;
        });

    return sharedPromise;
};

/**
 * Subscribe to real-time JLPT test updates
 * Invokes callback immediately if cached data is available
 */
export const subscribeJLPTTests = (callback) => {
    subscribers.add(callback);

    // Provide instant cached data if available
    if (cachedTests !== null) {
        callback(cachedTests);
    }

    // Trigger shared fetch if not yet loaded
    getSharedJLPTTests().then((data) => {
        callback(data);
    });

    // Return unsubscribe handler
    return () => {
        subscribers.delete(callback);
    };
};

/**
 * Helper to update a test in cache immediately (optimistic UI update)
 */
export const updateSingleJLPTTestInCache = (testId, updatedFields) => {
    if (!testId) return;
    if (firestoreDocsMap.has(testId)) {
        firestoreDocsMap.set(testId, { ...firestoreDocsMap.get(testId), ...updatedFields });
    } else if (baseTestsMap.has(testId)) {
        baseTestsMap.set(testId, { ...baseTestsMap.get(testId), ...updatedFields });
    } else {
        firestoreDocsMap.set(testId, { id: testId, ...updatedFields });
    }
    recomputeCombinedTests();
};

/**
 * Helper to remove a test from cache immediately
 */
export const removeSingleJLPTTestFromCache = (testId) => {
    if (!testId) return;
    baseTestsMap.delete(testId);
    firestoreDocsMap.delete(testId);
    recomputeCombinedTests();
};
