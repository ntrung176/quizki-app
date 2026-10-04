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

const loadedLevels = new Set();
const levelLoadingPromises = new Map();

/**
 * Lazily loads test bank for a specific level (n1, n2, n3, n4, n5)
 */
export const loadJLPTLevelData = async (level) => {
    if (!level) return;
    const lvlKey = level.toLowerCase().trim();
    if (lvlKey === 'all') {
        const levels = ['n1', 'n2', 'n3', 'n4', 'n5'];
        await Promise.all(levels.map(l => loadJLPTLevelData(l)));
        return;
    }
    if (loadedLevels.has(lvlKey)) return;
    if (levelLoadingPromises.has(lvlKey)) return levelLoadingPromises.get(lvlKey);

    const promise = (async () => {
        try {
            const res = await fetch(`/data/jlpt/${lvlKey}.json?t=${Date.now()}`);
            if (res && res.ok) {
                const list = await res.json();
                if (Array.isArray(list) && list.length > 0) {
                    list.forEach(t => {
                        if (t && t.id) baseTestsMap.set(t.id, t);
                    });
                    loadedLevels.add(lvlKey);
                    recomputeCombinedTests();
                }
            }
        } catch (err) {
            console.warn(`[jlptDataService] Failed to load level ${lvlKey}:`, err);
        } finally {
            levelLoadingPromises.delete(lvlKey);
        }
    })();

    levelLoadingPromises.set(lvlKey, promise);
    return promise;
};

export const invalidateJLPTCache = () => {
    cachedTests = null;
    sharedPromise = null;
    baseTestsMap.clear();
    firestoreDocsMap.clear();
    loadedLevels.clear();
    levelLoadingPromises.clear();
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
        let cacheConfig = null;
        try {
            cacheConfig = await getCacheConfig();
        } catch (e) {
            console.warn('[jlptDataService] Cache config fetch warning:', e);
        }

        // 1. ALWAYS load fresh static base file /data/jlpt_data.json
        try {
            const res = await fetch(`/data/jlpt_data.json?t=${Date.now()}`);
            if (res && res.ok) {
                const data = await res.json();
                if (Array.isArray(data) && data.length > 0) {
                    data.forEach((t) => {
                        if (t && t.id) baseTestsMap.set(t.id, t);
                    });
                }
            }
        } catch (e) {
            console.warn('[jlptDataService] Local jlpt_data.json load warning:', e);
        }

        // 2. Compute combined map with Firestore overlay
        const result = recomputeCombinedTests();

        // 3. Start Firestore real-time listener if not already started
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

