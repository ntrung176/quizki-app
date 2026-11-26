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

const SESSION_BOOT_TS = Date.now();
const loadedLevels = new Set();
const levelLoadingPromises = new Map();
const loadedChunks = new Set();
const chunkLoadingPromises = new Map();
let chunksManifest = null;
let chunksManifestPromise = null;
let currentCacheTag = SESSION_BOOT_TS;

const getChunksManifest = async () => {
    if (chunksManifest) return chunksManifest;
    if (chunksManifestPromise) return chunksManifestPromise;

    chunksManifestPromise = (async () => {
        try {
            const res = await fetch(`/data/jlpt/chunks/manifest.json?v=${encodeURIComponent(currentCacheTag)}`);
            if (res && res.ok) {
                const json = await res.json();
                chunksManifest = json;
                return json;
            }
        } catch (_) {}
        return null;
    })().finally(() => {
        chunksManifestPromise = null;
    });

    return chunksManifestPromise;
};

const loadChunkFile = async (chunkFile) => {
    if (!chunkFile) return false;
    if (loadedChunks.has(chunkFile)) return true;
    if (chunkLoadingPromises.has(chunkFile)) return chunkLoadingPromises.get(chunkFile);

    const promise = (async () => {
        try {
            const res = await fetch(`/data/jlpt/chunks/${chunkFile}?v=${encodeURIComponent(currentCacheTag)}`);
            if (res && res.ok) {
                const list = await res.json();
                if (Array.isArray(list) && list.length > 0) {
                    list.forEach(t => {
                        if (t && t.id) {
                            const prev = baseTestsMap.get(t.id) || {};
                            baseTestsMap.set(t.id, { ...prev, ...t });
                        }
                    });
                    loadedChunks.add(chunkFile);
                    recomputeCombinedTests();
                    return true;
                }
            }
        } catch (err) {
            console.warn(`[jlptDataService] Failed to load chunk ${chunkFile}:`, err);
        } finally {
            chunkLoadingPromises.delete(chunkFile);
        }
        return false;
    })();

    chunkLoadingPromises.set(chunkFile, promise);
    return promise;
};

/**
 * Lazily loads full test bank for a specific level (n1, n2, n3, n4, n5) using sharded chunks when available
 */
export const loadJLPTLevelData = async (level) => {
    if (!level) return;
    const lvlKey = level.toLowerCase().trim();
    if (lvlKey === 'all') {
        const levels = ['n5', 'n4', 'n3', 'n2', 'n1'];
        await Promise.all(levels.map(l => loadJLPTLevelData(l)));
        return;
    }
    if (loadedLevels.has(lvlKey)) return;
    if (levelLoadingPromises.has(lvlKey)) return levelLoadingPromises.get(lvlKey);

    const promise = (async () => {
        try {
            const manifest = await getChunksManifest();
            const levelChunks = manifest?.levels?.[lvlKey];
            if (Array.isArray(levelChunks) && levelChunks.length > 0) {
                // Concurrency-limited batch fetching to avoid saturating browser sockets
                const CONCURRENCY = 6;
                for (let i = 0; i < levelChunks.length; i += CONCURRENCY) {
                    const batch = levelChunks.slice(i, i + CONCURRENCY);
                    await Promise.all(batch.map(chunkName => loadChunkFile(chunkName)));
                    await new Promise(r => setTimeout(r, 8));
                }
                loadedLevels.add(lvlKey);
                return;
            }

            const res = await fetch(`/data/jlpt/${lvlKey}.json?v=${encodeURIComponent(currentCacheTag)}`);
            if (res && res.ok) {
                const list = await res.json();
                if (Array.isArray(list) && list.length > 0) {
                    list.forEach(t => {
                        if (t && t.id) {
                            const prev = baseTestsMap.get(t.id) || {};
                            baseTestsMap.set(t.id, { ...prev, ...t });
                        }
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

/**
 * Ensures a specific test has its complete sections and questions loaded into memory (<50ms via chunkFile)
 */
export const ensureFullTestLoaded = async (testId, level) => {
    if (!testId) return null;
    const existing = baseTestsMap.get(testId);
    if (existing && Array.isArray(existing.sections) && existing.sections.length > 0) {
        return existing;
    }

    // Ensure summary metadata (which carries chunkFile) has finished loading if still in flight
    if (sharedPromise && !existing?.chunkFile) {
        try { await sharedPromise; } catch (_) {}
    } else if (baseTestsMap.size === 0) {
        try { await getSharedJLPTTests(); } catch (_) {}
    }

    const refreshed = baseTestsMap.get(testId) || existing;
    if (refreshed && Array.isArray(refreshed.sections) && refreshed.sections.length > 0) {
        return refreshed;
    }

    if (refreshed?.chunkFile) {
        const loaded = await loadChunkFile(refreshed.chunkFile);
        if (loaded) {
            const populated = baseTestsMap.get(testId);
            if (populated && Array.isArray(populated.sections) && populated.sections.length > 0) {
                return populated;
            }
        }
    }

    let targetLvl = level || refreshed?.level;
    if (!targetLvl) {
        const match = String(testId).toLowerCase().match(/(n[1-5])/);
        targetLvl = match ? match[1] : 'n5';
    }

    await loadJLPTLevelData(targetLvl);
    return baseTestsMap.get(testId) || refreshed;
};

export const invalidateJLPTCache = () => {
    cachedTests = null;
    sharedPromise = null;
    baseTestsMap.clear();
    firestoreDocsMap.clear();
    loadedLevels.clear();
    levelLoadingPromises.clear();
    loadedChunks.clear();
    chunkLoadingPromises.clear();
    chunksManifest = null;
    chunksManifestPromise = null;
    currentCacheTag = Date.now();
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
 * Hierarchy: In-Memory RAM -> /data/jlpt/summary.json -> Realtime Firestore Overlay
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
            if (cacheConfig?.exportedAt) {
                currentCacheTag = String(cacheConfig.exportedAt);
            }
        } catch (e) {
            console.warn('[jlptDataService] Cache config fetch warning:', e);
        }

        // 1. ALWAYS load lightweight summary catalog first (fast, ~3MB, < 15MB RAM)
        try {
            const res = await fetch(`/data/jlpt/summary.json?v=${encodeURIComponent(currentCacheTag)}`);
            if (res && res.ok) {
                const data = await res.json();
                if (Array.isArray(data) && data.length > 0) {
                    data.forEach((t) => {
                        if (t && t.id) {
                            const existing = baseTestsMap.get(t.id);
                            if (existing && existing.sections) {
                                baseTestsMap.set(t.id, { ...t, ...existing });
                            } else {
                                baseTestsMap.set(t.id, t);
                            }
                        }
                    });
                }
            }
        } catch (e) {
            console.warn('[jlptDataService] Local summary.json load warning:', e);
        }

        // Fallback to jlpt_data.json if summary.json failed or empty
        if (baseTestsMap.size === 0) {
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

