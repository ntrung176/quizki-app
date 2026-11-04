import { db, storage, appId } from '../config/firebase';
import { collection, getDocs, query, where, doc, setDoc, onSnapshot, limit, startAfter } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { getCacheConfig } from './cacheConfigService';
import { getJotobaKanjiData } from '../data/jotobaKanjiData';
import { isSrsCardDue, isKanjiMastered, getLearnAheadLimitMs } from './srs';
import { safeSetLocalStorage } from './storageCleanup';

// In-memory module cache
let cachedKanjiList = null;
let cachedVocabList = null;
let cachedVocabCategories = null;
let lastLoadedExportedAt = null;

// Loading promises & timestamps to coordinate concurrent requests
let kanjiPromise = null;
let vocabPromise = null;
let categoriesPromise = null;
let lastCheckedKanjiTimestamp = 0;
let lastCheckedVocabTimestamp = 0;
const EDITED_KANJI_KEY = 'quizki_edited_kanji_map';

export const getCachedKanjiMap = () => {
    try {
        const stored = localStorage.getItem(EDITED_KANJI_KEY);
        return stored ? JSON.parse(stored) : {};
    } catch (e) {
        return {};
    }
};

export const updateEditedKanjiLocalCache = (kanjiData) => {
    try {
        if (!kanjiData || (!kanjiData.id && !kanjiData.character)) return;
        const currentMap = getCachedKanjiMap();
        const charKey = (kanjiData.character || kanjiData.literal || '').trim();
        const key = charKey || kanjiData.id;
        // Clean up legacy keys that don't match canonical character
        if (charKey && kanjiData.id && kanjiData.id !== charKey && currentMap[kanjiData.id]) {
            delete currentMap[kanjiData.id];
        }
        currentMap[key] = {
            ...(currentMap[key] || {}),
            ...kanjiData,
            character: charKey || currentMap[key]?.character || '',
            updatedAt: Date.now()
        };
        localStorage.setItem(EDITED_KANJI_KEY, JSON.stringify(currentMap));
    } catch (e) {
        console.warn('Warning updating edited kanji local cache:', e?.message || e);
    }
};

const EDITED_VOCAB_KEY = 'quizki_edited_vocab_map';

export const getCachedVocabMap = () => {
    try {
        const stored = localStorage.getItem(EDITED_VOCAB_KEY);
        return stored ? JSON.parse(stored) : {};
    } catch (e) {
        return {};
    }
};

export const updateEditedVocabLocalCache = (vocabData) => {
    try {
        if (!vocabData || (!vocabData.id && !vocabData.word)) return;
        const currentMap = getCachedVocabMap();
        const key = vocabData.id || vocabData.word;
        currentMap[key] = {
            ...(currentMap[key] || {}),
            ...vocabData,
            updatedAt: Date.now()
        };
        localStorage.setItem(EDITED_VOCAB_KEY, JSON.stringify(currentMap));
    } catch (e) {
        console.warn('Warning updating edited vocab local cache:', e?.message || e);
    }
};

// Incremental sync in the background
async function fetchKanjiUpdatesFromFirestore(exportedAt) {
    if (!exportedAt || exportedAt <= lastCheckedKanjiTimestamp) return;
    lastCheckedKanjiTimestamp = exportedAt;
    try {
        console.log(`Checking Firestore for kanji updates after: ${new Date(exportedAt).toISOString()}`);
        const q = query(collection(db, 'kanji'), where('updatedAt', '>', exportedAt));
        const snap = await getDocs(q);
        if (!snap.empty) {
            console.log(`Found ${snap.size} newer kanji records in Firestore. Syncing...`);
            snap.docs.forEach(d => {
                const updatedKanji = { id: d.id, ...d.data() };
                updateCachedKanji(updatedKanji);
            });
        } else {
            console.log('No new kanji updates found in Firestore.');
        }
    } catch (e) {
        console.warn('Error syncing kanji updates from Firestore:', e);
    }
}

async function fetchVocabUpdatesFromFirestore(exportedAt) {
    if (!exportedAt || exportedAt <= lastCheckedVocabTimestamp) return;
    lastCheckedVocabTimestamp = exportedAt;
    try {
        console.log(`Checking Firestore for vocab updates after: ${new Date(exportedAt).toISOString()}`);
        const q = query(collection(db, 'kanjiVocab'), where('updatedAt', '>', exportedAt));
        const snap = await getDocs(q);
        if (!snap.empty) {
            console.log(`Found ${snap.size} newer vocab records in Firestore. Syncing...`);
            snap.docs.forEach(d => {
                const updatedVocab = { id: d.id, ...d.data() };
                updateCachedVocab(updatedVocab);
            });
        } else {
            console.log('No new vocab updates found in Firestore.');
        }
    } catch (e) {
        console.warn('Error syncing vocab updates from Firestore:', e);
    }
}

export const invalidateKanjiCache = () => {
    cachedKanjiList = null;
    cachedVocabList = null;
    cachedVocabCategories = null;
    kanjiPromise = null;
    vocabPromise = null;
    categoriesPromise = null;
    lastLoadedExportedAt = null;
    lastCheckedKanjiTimestamp = 0;
    lastCheckedVocabTimestamp = 0;
};

if (typeof window !== 'undefined') {
    window.addEventListener('cache-config-updated', invalidateKanjiCache);
}

export const sanitizeForFirestore = (obj) => {
    if (obj === undefined) return null;
    if (obj === null || typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) {
        return obj.map(item => sanitizeForFirestore(item)).filter(item => item !== undefined);
    }
    const clean = {};
    Object.entries(obj).forEach(([key, value]) => {
        if (value !== undefined) {
            clean[key] = sanitizeForFirestore(value);
        }
    });
    return clean;
};

export const getSharedKanjiList = async () => {
    if (cachedKanjiList) return cachedKanjiList;
    if (kanjiPromise) return kanjiPromise;

    kanjiPromise = (async () => {
        try {
            console.log('Fetching shared kanji list...');
            const cacheConfig = await getCacheConfig().catch(() => null);
            const currentExport = cacheConfig?.exportedAt || 0;
            
            let dataRes = null;
            let exportedAt = 0;

            if (cacheConfig && cacheConfig.kanjiUrl) {
                try {
                    const urlWithBuster = cacheConfig.kanjiUrl.includes('?') 
                        ? `${cacheConfig.kanjiUrl}&t=${currentExport}`
                        : `${cacheConfig.kanjiUrl}?t=${currentExport}`;
                    const res = await fetch(urlWithBuster);
                    if (res.ok) {
                        dataRes = res;
                        exportedAt = currentExport;
                    }
                } catch (cdnErr) {
                    console.warn('Kanji CDN fetch failed, falling back to local bundle:', cdnErr);
                }
            }

            if (!dataRes || !dataRes.ok) {
                console.log('Loading local kanji_data.json bundle...');
                const [localRes, metaRes] = await Promise.all([
                    fetch('/data/kanji_data.json'),
                    fetch('/data/metadata.json').catch(() => null)
                ]);
                dataRes = localRes;
                const meta = metaRes && metaRes.ok ? await metaRes.json() : null;
                exportedAt = meta?.exportedAt || 0;
            }

            if (!dataRes || !dataRes.ok) {
                throw new Error('Could not load kanji data');
            }

            const rawKanjiList = await dataRes.json();
            lastLoadedExportedAt = exportedAt || currentExport || null;

            // Normalize and strictly deduplicate with OpenJLPT authoritative data
            const canonicalKanjiMap = new Map();
            rawKanjiList.forEach(k => {
                const char = (k.character || k.literal || '').trim();
                if (!char) return;
                const existing = canonicalKanjiMap.get(char);
                const item = existing ? { ...existing, ...k } : { ...k, character: char };
                const jData = getJotobaKanjiData(char);
                if (jData && !item._userEdited) {
                    item.sinoViet = jData.sinoViet || item.sinoViet;
                    item.meaning = jData.meaningVi || item.meaning;
                    item.meaningVi = jData.meaningVi || item.meaningVi;
                    item.onyomi = (jData.onyomi?.length ? jData.onyomi.join('、') : '') || item.onyomi;
                    item.kunyomi = (jData.kunyomi?.length ? jData.kunyomi.join('、') : '') || item.kunyomi;
                    item.level = jData.level || item.level;
                    item.openJlptOrder = jData.openJlptOrder ?? item.openJlptOrder ?? null;
                    if (jData.stroke_count) item.strokeCount = String(jData.stroke_count);
                    if (jData.parts && jData.parts.length > 0) item.parts = Array.isArray(jData.parts) ? jData.parts.join('、') : jData.parts;
                }
                canonicalKanjiMap.set(char, item);
            });

            // Merge local edited kanji map cleanly over canonical map
            const localEditedMap = getCachedKanjiMap();
            if (localEditedMap && Object.keys(localEditedMap).length > 0) {
                Object.values(localEditedMap).forEach(edited => {
                    const char = (edited.character || edited.literal || '').trim();
                    if (!char) return;
                    const existing = canonicalKanjiMap.get(char);
                    canonicalKanjiMap.set(char, {
                        ...(existing || {}),
                        ...edited,
                        character: char,
                        _userEdited: true
                    });
                });
            }

            cachedKanjiList = Array.from(canonicalKanjiMap.values());
            return cachedKanjiList;
        } catch (e) {
            console.error('Fatal error loading kanji data:', e);
            kanjiPromise = null;
            return [];
        }
    })();

    return kanjiPromise;
};

export const getSharedVocabList = async () => {
    if (cachedVocabList) return cachedVocabList;
    if (vocabPromise) return vocabPromise;

    vocabPromise = (async () => {
        try {
            console.log('Fetching shared vocab list...');
            const cacheConfig = await getCacheConfig().catch(() => null);
            const currentExport = cacheConfig?.exportedAt || 0;
            
            let dataRes = null;
            let exportedAt = 0;

            if (cacheConfig && cacheConfig.vocabUrl) {
                try {
                    const urlWithBuster = cacheConfig.vocabUrl.includes('?') 
                        ? `${cacheConfig.vocabUrl}&t=${currentExport}`
                        : `${cacheConfig.vocabUrl}?t=${currentExport}`;
                    const res = await fetch(urlWithBuster);
                    if (res.ok) {
                        dataRes = res;
                        exportedAt = currentExport;
                    }
                } catch (cdnErr) {
                    console.warn('Vocab CDN fetch failed, falling back to local bundle:', cdnErr);
                }
            }

            if (!dataRes || !dataRes.ok) {
                console.log('Loading local vocab_data.json bundle...');
                const [localRes, metaRes] = await Promise.all([
                    fetch('/data/vocab_data.json'),
                    fetch('/data/metadata.json').catch(() => null)
                ]);
                dataRes = localRes;
                const meta = metaRes && metaRes.ok ? await metaRes.json() : null;
                exportedAt = meta?.exportedAt || 0;
            }

            if (!dataRes || !dataRes.ok) {
                throw new Error('Could not load vocab data');
            }

            cachedVocabList = await dataRes.json();

            // Merge local edited vocab map over CDN list
            const localEditedVocabMap = getCachedVocabMap();
            if (localEditedVocabMap && Object.keys(localEditedVocabMap).length > 0) {
                const listMap = new Map(cachedVocabList.map(v => [v.id || v.word, v]));
                Object.values(localEditedVocabMap).forEach(edited => {
                    const key = edited.id || edited.word;
                    if (key) listMap.set(key, { ...(listMap.get(key) || {}), ...edited });
                });
                cachedVocabList = Array.from(listMap.values());
            }

            return cachedVocabList;
        } catch (e) {
            console.error('Fatal error loading vocab data:', e);
            vocabPromise = null;
            return [];
        }
    })();

    return vocabPromise;
};

export const getSharedVocabCategories = async () => {
    const cacheConfig = await getCacheConfig();
    const currentExport = cacheConfig?.exportedAt || 0;
    const needsRefresh = currentExport && (!lastLoadedExportedAt || currentExport > lastLoadedExportedAt);

    if (needsRefresh) {
        cachedVocabCategories = null;
        categoriesPromise = null;
    }

    if (cachedVocabCategories && !needsRefresh) return cachedVocabCategories;
    if (categoriesPromise && !needsRefresh) return categoriesPromise;

    categoriesPromise = (async () => {
        try {
            console.log('Fetching shared vocab categories from CDN...');
            
            let dataRes;
            if (cacheConfig && cacheConfig.vocabCategoriesUrl) {
                console.log('Using Firebase Storage CDN for Vocab Categories cache');
                const urlWithBuster = cacheConfig.vocabCategoriesUrl.includes('?') 
                    ? `${cacheConfig.vocabCategoriesUrl}&t=${cacheConfig.exportedAt || Date.now()}`
                    : `${cacheConfig.vocabCategoriesUrl}?t=${cacheConfig.exportedAt || Date.now()}`;
                dataRes = await fetch(urlWithBuster);
            } else {
                console.log('Falling back to local bundle files for Vocab Categories cache');
                dataRes = await fetch('/data/vocab_categories.json');
            }

            if (!dataRes || !dataRes.ok) {
                throw new Error('CDN fetch failed');
            }
            const contentType = dataRes.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                throw new Error('Response is not JSON (got: ' + contentType + ')');
            }
            cachedVocabCategories = await dataRes.json();
            lastLoadedExportedAt = currentExport || null;
            return cachedVocabCategories;
        } catch (e) {
            console.log('CDN load failed (expected if not synced), falling back to Firestore: ' + e.message);
            try {
                const snap = await getDocs(collection(db, 'vocabCategories'));
                cachedVocabCategories = snap.docs.map(d => ({ id: d.id, ...d.data() }));
                lastLoadedExportedAt = currentExport || Date.now();
                return cachedVocabCategories;
            } catch (fsErr) {
                console.error('Error loading shared vocab categories from Firestore fallback:', fsErr);
                categoriesPromise = null;
                throw fsErr;
            }
        }
    })();

    return categoriesPromise;
};

// Functions to update the cache when a card/item is added, updated, or deleted
export const updateCachedKanji = (kanji) => {
    if (!cachedKanjiList || !kanji) return;
    const char = (kanji.character || kanji.literal || '').trim();
    const id = kanji.id;

    let existing = null;
    cachedKanjiList = cachedKanjiList.filter(k => {
        const kChar = (k.character || k.literal || '').trim();
        const match = (char && kChar === char) || (id && k.id === id);
        if (match && !existing) existing = k;
        return !match;
    });

    const updated = {
        ...(existing || {}),
        ...kanji,
        character: char || existing?.character || '',
        id: id || existing?.id || `kanji_${char}`
    };
    cachedKanjiList.push(updated);

    // Dispatch event to keep other active screens in sync
    window.dispatchEvent(new CustomEvent('kanji-cache-updated', { 
        detail: { type: 'kanji', data: { ...updated } } 
    }));
};

export const deleteCachedKanji = (kanjiId) => {
    if (!cachedKanjiList) return;
    const idStr = String(kanjiId || '').trim();
    cachedKanjiList = cachedKanjiList.filter(k => 
        k.id !== idStr && (k.character || '').trim() !== idStr
    );
    window.dispatchEvent(new CustomEvent('kanji-cache-updated', { 
        detail: { type: 'kanji-delete', data: idStr } 
    }));
};

export const updateCachedVocab = (vocab) => {
    if (!cachedVocabList) return;
    const idx = cachedVocabList.findIndex(v => 
        (vocab.id && v.id === vocab.id) || 
        (vocab.word && v.word === vocab.word)
    );
    if (idx !== -1) {
        cachedVocabList[idx] = { ...cachedVocabList[idx], ...vocab };
    } else {
        cachedVocabList.push(vocab);
    }
    window.dispatchEvent(new CustomEvent('kanji-cache-updated', { 
        detail: { type: 'vocab', data: { ...cachedVocabList[idx !== -1 ? idx : cachedVocabList.length - 1] } } 
    }));
};

export const deleteCachedVocab = (vocabId) => {
    if (!cachedVocabList) return;
    cachedVocabList = cachedVocabList.filter(v => v.id !== vocabId);
    window.dispatchEvent(new CustomEvent('kanji-cache-updated', { 
        detail: { type: 'vocab-delete', data: vocabId } 
    }));
};

export const getCachedKanjiList = () => cachedKanjiList;
export const getCachedVocabList = () => cachedVocabList;
export const getCachedVocabCategories = () => cachedVocabCategories;

let cachedUserSrsData = null;
let cachedUserIdForSrs = null;
let userSrsPromise = null;
// Multi-subscriber pattern — one Firestore listener shared by all components
let kanjiSrsUnsubscribe = null;
let kanjiSrsListeners = new Set();

export const getCachedUserSrsData = (userId) => {
    if (cachedUserSrsData && (!userId || cachedUserIdForSrs === userId)) {
        return cachedUserSrsData;
    }
    if (userId && typeof window !== 'undefined' && window.localStorage) {
        try {
            const raw = localStorage.getItem(`quizki_cached_kanji_srs_${userId}`);
            if (raw) {
                cachedUserSrsData = JSON.parse(raw);
                cachedUserIdForSrs = userId;
                return cachedUserSrsData;
            }
        } catch (_) {}
    }
    return cachedUserSrsData || {};
};

export const getPendingKanjiSyncMap = (userId) => {
    if (!userId || typeof window === 'undefined' || !window.localStorage) return {};
    try {
        const raw = localStorage.getItem(`quizki_pending_kanji_sync_${userId}`);
        return raw ? JSON.parse(raw) : {};
    } catch (_) {
        return {};
    }
};

export const recordPendingKanjiSync = (userId, kanjiId, srsData) => {
    if (!userId || !kanjiId || !srsData || typeof window === 'undefined' || !window.localStorage) return;
    try {
        const key = `quizki_pending_kanji_sync_${userId}`;
        const map = getPendingKanjiSyncMap(userId);
        map[String(kanjiId)] = {
            ...(map[String(kanjiId)] || {}),
            ...srsData,
            _pendingTime: Date.now()
        };
        safeSetLocalStorage(key, JSON.stringify(map));
    } catch (e) {
        console.warn('⚠️ Failed to record pending kanji sync:', e);
    }
};

export const removePendingKanjiSync = (userId, kanjiId) => {
    if (!userId || !kanjiId || typeof window === 'undefined' || !window.localStorage) return;
    try {
        const key = `quizki_pending_kanji_sync_${userId}`;
        const map = getPendingKanjiSyncMap(userId);
        const safeId = String(kanjiId);
        if (map[safeId]) {
            delete map[safeId];
            if (Object.keys(map).length === 0) {
                localStorage.removeItem(key);
            } else {
                safeSetLocalStorage(key, JSON.stringify(map));
            }
        }
    } catch (e) {
        console.warn('⚠️ Failed to remove pending kanji sync:', e);
    }
};

let isSyncingKanji = false;

export const syncPendingKanjiSrs = async (userId) => {
    if (!userId || isSyncingKanji || typeof window === 'undefined' || !db || !appId) return;
    const pendingMap = getPendingKanjiSyncMap(userId);
    const entries = Object.entries(pendingMap);
    if (entries.length === 0) return;

    isSyncingKanji = true;
    try {
        for (const [id, srs] of entries) {
            try {
                const cleanSrs = { ...srs };
                delete cleanSrs._pendingTime;
                await setDoc(doc(db, `artifacts/${appId}/users/${userId}/kanjiSRS`, id), cleanSrs, { merge: true });
                removePendingKanjiSync(userId, id);
            } catch (err) {
                console.warn(`⚠️ Retrying pending kanji SRS sync failed for ${id}:`, err);
            }
        }
    } finally {
        isSyncingKanji = false;
    }
};

/**
 * Harmonize Kanji SRS map across different alias keys (doc.id vs character vs kanji_${char}).
 * If any alias key was reviewed with a future nextReview date, that latest review status
 * is propagated to all aliases for that character, preventing phantom due cards across devices.
 */
export const harmonizeKanjiSrsMap = (srsMap) => {
    if (!srsMap || typeof srsMap !== 'object') return srsMap || {};
    const kanjiList = getCachedKanjiList() || [];
    const kanjiMap = new Map();
    kanjiList.forEach(k => {
        if (k.id) kanjiMap.set(k.id, k);
        if (k.character) kanjiMap.set(k.character, k);
    });

    const charToBestSrs = new Map();
    const charToDocIds = new Map();

    Object.entries(srsMap).forEach(([key, data]) => {
        if (!data || typeof data !== 'object') return;
        const doc = kanjiMap.get(key) || (data.id ? kanjiMap.get(data.id) : null);
        const char = data.character 
            || doc?.character 
            || (key.length === 1 ? key : (key.startsWith('kanji_') ? key.replace('kanji_', '') : null));
        
        if (!char) return;

        if (!charToDocIds.has(char)) charToDocIds.set(char, []);
        charToDocIds.get(char).push(key);

        const existing = charToBestSrs.get(char);
        if (!existing) {
            charToBestSrs.set(char, { ...data, character: char });
        } else {
            const nextReview = Math.max(existing.nextReview || 0, data.nextReview || 0, existing.nextReview_back || 0, data.nextReview_back || 0);
            const lastReview = Math.max(existing.lastReview || 0, data.lastReview || 0, existing.lastReviewed || 0, data.lastReviewed || 0);
            const reps = Math.max(existing.reps || 0, data.reps || 0);
            const state = (existing.state === 'REVIEW' || data.state === 'REVIEW') ? 'REVIEW' : (data.state || existing.state);
            const primary = (data.lastReview || 0) >= (existing.lastReview || 0) ? data : existing;

            charToBestSrs.set(char, {
                ...primary,
                character: char,
                nextReview,
                lastReview,
                reps,
                state
            });
        }
    });

    const harmonized = { ...srsMap };
    charToDocIds.forEach((keys, char) => {
        const best = charToBestSrs.get(char);
        if (!best) return;
        keys.forEach(k => {
            harmonized[k] = { ...harmonized[k], ...best };
        });
    });

    return harmonized;
};

const mergeServerWithLocalKanjiSrs = (userId, serverSrsMap) => {
    const pendingMap = getPendingKanjiSyncMap(userId);
    const merged = { ...serverSrsMap };
    const now = Date.now();

    // 1. Pending sync items: only take priority if genuinely newer than server and not expired (>24h)
    for (const [id, pendingItem] of Object.entries(pendingMap || {})) {
        if (!pendingItem || typeof pendingItem !== 'object') continue;
        const pendingTime = pendingItem._pendingTime || pendingItem.lastReview || 0;
        // Auto-expire zombie writes older than 24 hours
        if (pendingTime > 0 && now - pendingTime > 86400000) {
            removePendingKanjiSync(userId, id);
            continue;
        }

        const serverItem = merged[id];
        const serverReviewTime = Math.max(
            serverItem?.lastReview || 0,
            serverItem?.lastReviewed || 0,
            serverItem?.nextReview || 0
        );
        const pendingReviewTime = Math.max(
            pendingItem.lastReview || 0,
            pendingItem.lastReviewed || 0,
            pendingItem.nextReview || 0
        );

        // If server already has a newer or equal review from another device, server wins
        if (serverItem && serverReviewTime >= pendingReviewTime) {
            removePendingKanjiSync(userId, id);
            continue;
        }

        const cleanItem = { ...pendingItem };
        delete cleanItem._pendingTime;
        merged[id] = { ...(serverItem || {}), ...cleanItem };
    }

    return harmonizeKanjiSrsMap(merged);
};

let hasFetchedServerKanjiSrs = false;

export const getSharedKanjiSrs = async (userId, forceRefresh = false) => {
    if (!userId) return {};
    if (cachedUserIdForSrs !== userId) {
        clearUserSrsCache();
    }
    if (!cachedUserSrsData) {
        try {
            const localCached = localStorage.getItem(`quizki_cached_kanji_srs_${userId}`);
            if (localCached) {
                cachedUserSrsData = harmonizeKanjiSrsMap(JSON.parse(localCached));
                cachedUserIdForSrs = userId;
            }
        } catch (_) {}
    }
    if (!forceRefresh && hasFetchedServerKanjiSrs && cachedUserSrsData) {
        return cachedUserSrsData;
    }
    if (userSrsPromise && !forceRefresh) return userSrsPromise;

    userSrsPromise = (async () => {
        try {
            console.log('Fetching user Kanji SRS data from Firestore...');
            const fetchPromise = getDocs(collection(db, `artifacts/${appId}/users/${userId}/kanjiSRS`));
            const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Kanji SRS fetch timeout')), 15000));
            const srsSnap = await Promise.race([fetchPromise, timeoutPromise]);
            const srs = {};
            srsSnap.docs.forEach(d => { srs[d.id] = d.data(); });
            const mergedSrs = mergeServerWithLocalKanjiSrs(userId, srs);
            cachedUserSrsData = mergedSrs;
            cachedUserIdForSrs = userId;
            hasFetchedServerKanjiSrs = true;
            userSrsPromise = null;
            safeSetLocalStorage(`quizki_cached_kanji_srs_${userId}`, JSON.stringify(mergedSrs));
            try {
                const computed = computeKanjiSrsStats(mergedSrs);
                const serialized = JSON.stringify(computed);
                localStorage.setItem(`quizki_cached_kanji_srs_stats_${userId}`, serialized);
                localStorage.setItem('quizki_cached_kanji_srs_stats', serialized);
            } catch (_) {}
            kanjiSrsListeners.forEach(cb => { try { cb(mergedSrs); } catch (_) {} });
            try {
                window.dispatchEvent(new Event('srs-updated'));
            } catch (_) {}
            return cachedUserSrsData;
        } catch (e) {
            console.warn('Kanji SRS fetch notice:', e.message);
            userSrsPromise = null;
            return cachedUserSrsData || {};
        }
    })();

    return userSrsPromise;
};

/**
 * Subscribe to real-time Kanji SRS data updates via onSnapshot.
 * Uses a multi-subscriber pattern: one shared Firestore listener, many callbacks.
 * Returns an unsubscribe function for the caller's callback only.
 */
export const subscribeKanjiSrs = (userId, callback) => {
    if (!userId) return () => {};

    // If user changed, tear down the old listener entirely
    if (cachedUserIdForSrs && cachedUserIdForSrs !== userId) {
        if (kanjiSrsUnsubscribe) {
            kanjiSrsUnsubscribe();
            kanjiSrsUnsubscribe = null;
        }
        kanjiSrsListeners.clear();
        cachedUserSrsData = null;
        cachedUserIdForSrs = null;
        userSrsPromise = null;
        hasFetchedServerKanjiSrs = false;
    }

    // Register this callback
    kanjiSrsListeners.add(callback);

    // If no active Firestore listener yet, create one
    if (!kanjiSrsUnsubscribe) {
        const colRef = collection(db, `artifacts/${appId}/users/${userId}/kanjiSRS`);
        kanjiSrsUnsubscribe = onSnapshot(colRef, (snapshot) => {
            // Build fresh snapshot from server docs to eliminate ghost/phantom cards across devices
            const srs = {};
            snapshot.docs.forEach(d => { srs[d.id] = d.data(); });
            const mergedSrs = mergeServerWithLocalKanjiSrs(userId, srs);
            cachedUserSrsData = mergedSrs;
            cachedUserIdForSrs = userId;
            hasFetchedServerKanjiSrs = true;
            userSrsPromise = null;
            safeSetLocalStorage(`quizki_cached_kanji_srs_${userId}`, JSON.stringify(mergedSrs));
            try {
                const computed = computeKanjiSrsStats(mergedSrs);
                const serialized = JSON.stringify(computed);
                localStorage.setItem(`quizki_cached_kanji_srs_stats_${userId}`, serialized);
                localStorage.setItem('quizki_cached_kanji_srs_stats', serialized);
            } catch (_) {}
            kanjiSrsListeners.forEach(cb => { try { cb(mergedSrs); } catch (_) {} });
            try {
                window.dispatchEvent(new Event('srs-updated'));
            } catch (_) {}
        }, (error) => {
            console.warn('Kanji SRS onSnapshot error (channel might be restricted):', error);
            // Automatic fallback: poll directly via getSharedKanjiSrs
            getSharedKanjiSrs(userId, true).catch(() => {});
        });
    } else if (cachedUserSrsData) {
        // Immediately deliver cached data to the new subscriber
        callback(cachedUserSrsData);
    }

    // Return an unsubscribe function that only removes THIS callback
    return () => {
        kanjiSrsListeners.delete(callback);
        // If nobody is listening anymore, tear down the Firestore connection
        if (kanjiSrsListeners.size === 0 && kanjiSrsUnsubscribe) {
            kanjiSrsUnsubscribe();
            kanjiSrsUnsubscribe = null;
            cachedUserSrsData = null;
            userSrsPromise = null;
            hasFetchedServerKanjiSrs = false;
        }
    };
};

// Compute Kanji SRS statistics with canonical character deduplication and future-review priority
export const computeKanjiSrsStats = (srsMap) => {
    let total = 0, learning = 0, mastered = 0, dueCount = 0;
    const now = Date.now();
    const learnAheadMs = getLearnAheadLimitMs();
    const threshold = now + learnAheadMs;
    const actDates = [];
    const toDateStr = (ts) => {
        if (!ts) return null;
        const d = new Date(ts);
        if (isNaN(d.getTime())) return null;
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    };

    if (srsMap && typeof srsMap === 'object') {
        const kanjiList = getCachedKanjiList() || [];
        const kanjiMap = new Map();
        kanjiList.forEach(k => {
            if (k.id) kanjiMap.set(k.id, k);
            if (k.character) kanjiMap.set(k.character, k);
        });

        const canonicalItems = new Map();

        Object.entries(srsMap).forEach(([key, data]) => {
            if (!data || typeof data !== 'object') return;
            const doc = kanjiMap.get(key) || (data.id ? kanjiMap.get(data.id) : null);
            const char = data.character 
                || doc?.character 
                || (key.length === 1 ? key : (key.startsWith('kanji_') ? key.replace('kanji_', '') : null));
            
            // Only count valid kanji characters (matches KanjiReviewScreen)
            if (!char) return;

            const existing = canonicalItems.get(char);
            if (!existing) {
                canonicalItems.set(char, { ...data, character: char });
            } else {
                // If either has a future review date, the reviewed state wins over stale past review
                const existingNext = existing.nextReview || 0;
                const dataNext = data.nextReview || 0;
                const existingLast = existing.lastReview || 0;
                const dataLast = data.lastReview || 0;

                const nextReview = Math.max(existingNext, dataNext);
                const lastReview = Math.max(existingLast, dataLast);
                const reps = Math.max(existing.reps || 0, data.reps || 0);
                const state = (existing.state === 'REVIEW' || data.state === 'REVIEW') ? 'REVIEW' : (data.state || existing.state);

                canonicalItems.set(char, {
                    ...existing,
                    ...data,
                    character: char,
                    nextReview,
                    lastReview,
                    reps,
                    state
                });
            }
        });

        canonicalItems.forEach((data) => {
            total++;
            if (isKanjiMastered(data)) mastered++;
            else learning++;
            if (isSrsCardDue(data, threshold)) dueCount++;
            if (data.lastReview) {
                const dateStr = toDateStr(data.lastReview);
                if (dateStr) actDates.push(dateStr);
            }
        });
    }
    return { total, learning, mastered, dueCount, actDates };
};

export const updateCachedUserSrs = (userId, kanjiId, newSrs, kanjiChar = null) => {
    if (!userId) return;
    if (!cachedUserSrsData || cachedUserIdForSrs !== userId) {
        try {
            const localCached = localStorage.getItem(`quizki_cached_kanji_srs_${userId}`);
            if (localCached) {
                cachedUserSrsData = JSON.parse(localCached);
                cachedUserIdForSrs = userId;
            }
        } catch (_) {}
    }
    if (!cachedUserSrsData) {
        cachedUserSrsData = {};
        cachedUserIdForSrs = userId;
    }

    const char = kanjiChar || newSrs?.character || (kanjiId && kanjiId.length === 1 ? kanjiId : null);

    if (newSrs === null) {
        delete cachedUserSrsData[kanjiId];
        removePendingKanjiSync(userId, kanjiId);
        if (char) {
            delete cachedUserSrsData[char];
            delete cachedUserSrsData[`kanji_${char}`];
            removePendingKanjiSync(userId, char);
            removePendingKanjiSync(userId, `kanji_${char}`);
        }
    } else {
        const enrichedSrs = char ? { ...newSrs, character: char } : newSrs;
        cachedUserSrsData[kanjiId] = enrichedSrs;
        recordPendingKanjiSync(userId, kanjiId, enrichedSrs);
        if (char) {
            cachedUserSrsData[char] = enrichedSrs;
            if (cachedUserSrsData[`kanji_${char}`]) {
                cachedUserSrsData[`kanji_${char}`] = enrichedSrs;
            }
        }
    }
    safeSetLocalStorage(`quizki_cached_kanji_srs_${userId}`, JSON.stringify(cachedUserSrsData));

    // Instant summary stats cache update so HomeScreen always sees 100% synchronized due count
    try {
        const computed = computeKanjiSrsStats(cachedUserSrsData);
        const serialized = JSON.stringify(computed);
        localStorage.setItem(`quizki_cached_kanji_srs_stats_${userId}`, serialized);
        localStorage.setItem('quizki_cached_kanji_srs_stats', serialized);
    } catch (_) {}

    // Immediately notify all in-memory subscribers
    kanjiSrsListeners.forEach(cb => {
        try { cb(cachedUserSrsData); } catch (_) {}
    });
    // Dispatch global srs-updated event for instant 0ms badge sync
    try {
        window.dispatchEvent(new Event('srs-updated'));
    } catch (_) {}
};

export const clearUserSrsCache = () => {
    if (kanjiSrsUnsubscribe) {
        kanjiSrsUnsubscribe();
        kanjiSrsUnsubscribe = null;
    }
    kanjiSrsListeners.clear();
    cachedUserSrsData = null;
    cachedUserIdForSrs = null;
    userSrsPromise = null;
};

let cachedKanjiProgress = null;
let cachedUserIdForProgress = null;
let kanjiProgressPromise = null;

export const getCachedKanjiProgress = () => cachedKanjiProgress;

export const getSharedKanjiProgress = async (userId) => {
    if (!userId) return {};
    if (cachedUserIdForProgress !== userId) {
        clearKanjiProgressCache();
    }
    if (cachedUserIdForProgress === userId && cachedKanjiProgress) {
        return cachedKanjiProgress;
    }
    if (!cachedKanjiProgress) {
        try {
            const localCached = localStorage.getItem(`quizki_cached_kanji_progress_${userId}`);
            if (localCached) {
                cachedKanjiProgress = JSON.parse(localCached);
                cachedUserIdForProgress = userId;
            }
        } catch (_) {}
    }
    if (kanjiProgressPromise) return kanjiProgressPromise;

    kanjiProgressPromise = (async () => {
        try {
            console.log('Fetching user Kanji progress from Firestore...');
            const fetchPromise = getDocs(collection(db, `artifacts/${appId}/users/${userId}/kanjiProgress`));
            const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Kanji progress fetch timeout')), 3500));
            const progressSnap = await Promise.race([fetchPromise, timeoutPromise]);
            const progress = {};
            progressSnap.docs.forEach(d => {
                const data = d.data();
                const key = `${data.level}_${data.day}`;
                progress[key] = data;
            });
            cachedKanjiProgress = progress;
            cachedUserIdForProgress = userId;
            safeSetLocalStorage(`quizki_cached_kanji_progress_${userId}`, JSON.stringify(progress));
            return cachedKanjiProgress;
        } catch (e) {
            console.warn('Kanji progress fetch notice:', e.message);
            kanjiProgressPromise = null;
            return cachedKanjiProgress || {};
        }
    })();

    return kanjiProgressPromise;
};

export const updateCachedKanjiProgress = (userId, level, day, progressData) => {
    if (cachedUserIdForProgress === userId && cachedKanjiProgress) {
        const key = `${level}_${day}`;
        if (progressData === null) {
            delete cachedKanjiProgress[key];
        } else {
            cachedKanjiProgress[key] = progressData;
        }
        safeSetLocalStorage(`quizki_cached_kanji_progress_${userId}`, JSON.stringify(cachedKanjiProgress));
    }
};

export const clearKanjiProgressCache = () => {
    cachedKanjiProgress = null;
    cachedUserIdForProgress = null;
    kanjiProgressPromise = null;
};

const safeGetCollectionDocs = async (collectionRef) => {
    try {
        return await getDocs(collectionRef);
    } catch (err) {
        console.warn('getDocs failed on mobile IndexedDB cursor, falling back to chunked fetch:', err);
        let allDocs = [];
        let lastDoc = null;
        while (true) {
            let q = lastDoc 
                ? query(collectionRef, limit(500), startAfter(lastDoc)) 
                : query(collectionRef, limit(500));
            const snap = await getDocs(q);
            if (snap.empty) break;
            allDocs.push(...snap.docs);
            lastDoc = snap.docs[snap.docs.length - 1];
            if (snap.docs.length < 500) break;
        }
        return { docs: allDocs, size: allDocs.length };
    }
};

export const syncKanjiAndVocabToCDN = async (forceFull = true) => {
    let kanjiList = [];
    let vocabList = [];
    let categories = [];
    let exportedAt = Date.now();

    const cacheConfig = await getCacheConfig();
    const buster = Date.now();
    const appendBuster = (url) => (!url ? '' : (url.includes('?') ? `${url}&t=${buster}` : `${url}?t=${buster}`));

    // 1. Always load the base datasets (from existing CDN or local bundle files)
    let [baseKanji, baseVocab, baseCats] = await Promise.all([
        cacheConfig?.kanjiUrl ? fetch(appendBuster(cacheConfig.kanjiUrl)).then(r => r.ok ? r.json() : null).catch(() => null) : null,
        cacheConfig?.vocabUrl ? fetch(appendBuster(cacheConfig.vocabUrl)).then(r => r.ok ? r.json() : null).catch(() => null) : null,
        cacheConfig?.vocabCategoriesUrl ? fetch(appendBuster(cacheConfig.vocabCategoriesUrl)).then(r => r.ok ? r.json() : null).catch(() => null) : null
    ]);

    if (!baseKanji || !baseVocab || !baseCats) {
        const [localKanji, localVocab, localCats] = await Promise.all([
            fetch('/data/kanji_data.json').then(r => r.ok ? r.json() : null).catch(() => null),
            fetch('/data/vocab_data.json').then(r => r.ok ? r.json() : null).catch(() => null),
            fetch('/data/vocab_categories.json').then(r => r.ok ? r.json() : null).catch(() => null)
        ]);
        if (!baseKanji) baseKanji = localKanji || [];
        if (!baseVocab) baseVocab = localVocab || [];
        if (!baseCats) baseCats = localCats || [];
    }

    // 2. Build canonical map for Kanji with OpenJLPT authoritative data
    const canonicalKanjiMap = new Map();
    (baseKanji || []).forEach(k => {
        const char = (k.character || k.literal || '').trim();
        if (!char) return;
        const jData = getJotobaKanjiData(char);
        const item = { ...k, character: char };
        if (jData && !item._userEdited) {
            item.sinoViet = jData.sinoViet || item.sinoViet;
            item.meaning = jData.meaningVi || item.meaning;
            item.meaningVi = jData.meaningVi || item.meaningVi;
            item.onyomi = (jData.onyomi?.length ? jData.onyomi.join('、') : '') || item.onyomi;
            item.kunyomi = (jData.kunyomi?.length ? jData.kunyomi.join('、') : '') || item.kunyomi;
            item.level = jData.level || item.level;
            item.openJlptOrder = jData.openJlptOrder ?? item.openJlptOrder ?? null;
            if (jData.stroke_count) item.strokeCount = String(jData.stroke_count);
            if (jData.parts && jData.parts.length > 0) item.parts = Array.isArray(jData.parts) ? jData.parts.join('、') : jData.parts;
        }
        canonicalKanjiMap.set(char, item);
    });

    // 3. Fetch updates from Firestore (either incremental since last export or full)
    const lastExport = (!forceFull && cacheConfig?.exportedAt) ? cacheConfig.exportedAt : 0;
    const [kanjiSnap, vocabSnap, catsSnap] = await Promise.all([
        lastExport > 0 
            ? safeGetCollectionDocs(query(collection(db, 'kanji'), where('updatedAt', '>', lastExport)))
            : safeGetCollectionDocs(collection(db, 'kanji')),
        lastExport > 0
            ? safeGetCollectionDocs(query(collection(db, 'kanjiVocab'), where('updatedAt', '>', lastExport)))
            : safeGetCollectionDocs(collection(db, 'kanjiVocab')),
        lastExport > 0
            ? safeGetCollectionDocs(query(collection(db, 'vocabCategories'), where('updatedAt', '>', lastExport)))
            : safeGetCollectionDocs(collection(db, 'vocabCategories'))
    ]);

    // 4. Merge Firestore Kanji docs strictly by character (deduplicating any multiple IDs)
    kanjiSnap.docs.forEach(docSnap => {
        const data = { id: docSnap.id, ...docSnap.data() };
        const char = (data.character || data.literal || '').trim();
        if (!char) return;
        const existing = canonicalKanjiMap.get(char);
        const merged = {
            ...(existing || {}),
            ...data,
            character: char,
            id: existing?.id || data.id || `kanji_${char}`
        };
        const jData = getJotobaKanjiData(char);
        if (jData && !merged._userEdited) {
            merged.sinoViet = jData.sinoViet || merged.sinoViet;
            merged.meaning = jData.meaningVi || merged.meaning;
            merged.meaningVi = jData.meaningVi || merged.meaningVi;
            merged.onyomi = (jData.onyomi?.length ? jData.onyomi.join('、') : '') || merged.onyomi;
            merged.kunyomi = (jData.kunyomi?.length ? jData.kunyomi.join('、') : '') || merged.kunyomi;
            merged.level = jData.level || merged.level;
            merged.openJlptOrder = jData.openJlptOrder ?? merged.openJlptOrder ?? null;
            if (jData.stroke_count) merged.strokeCount = String(jData.stroke_count);
            if (jData.parts && jData.parts.length > 0) merged.parts = Array.isArray(jData.parts) ? jData.parts.join('、') : jData.parts;
        }
        canonicalKanjiMap.set(char, merged);
    });

    kanjiList = Array.from(canonicalKanjiMap.values());

    // 5. Merge Vocab cleanly deduplicated by word
    const canonicalVocabMap = new Map();
    (baseVocab || []).forEach(v => {
        const key = (v.word || '').trim();
        if (key) canonicalVocabMap.set(key, v);
    });
    vocabSnap.docs.forEach(docSnap => {
        const data = { id: docSnap.id, ...docSnap.data() };
        const key = (data.word || '').trim();
        if (key) {
            const existing = canonicalVocabMap.get(key);
            canonicalVocabMap.set(key, { ...(existing || {}), ...data });
        }
    });
    vocabList = Array.from(canonicalVocabMap.values());

    // 6. Merge Categories cleanly deduplicated by id
    const canonicalCatsMap = new Map();
    (baseCats || []).forEach(c => {
        const key = c.id || c.name;
        if (key) canonicalCatsMap.set(key, c);
    });
    catsSnap.docs.forEach(docSnap => {
        const data = { id: docSnap.id, ...docSnap.data() };
        const key = data.id || data.name;
        if (key) {
            const existing = canonicalCatsMap.get(key);
            canonicalCatsMap.set(key, { ...(existing || {}), ...data });
        }
    });
    categories = Array.from(canonicalCatsMap.values());

    // Upload cache files to Firebase Storage
    const uploadFile = async (fileName, data) => {
        const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
        const fileRef = ref(storage, `cache/${appId}/${fileName}`);
        await uploadBytes(fileRef, blob);
        return getDownloadURL(fileRef);
    };

    const [kanjiUrl, vocabUrl, vocabCategoriesUrl] = await Promise.all([
        uploadFile('kanji_data.json', kanjiList),
        uploadFile('vocab_data.json', vocabList),
        uploadFile('vocab_categories.json', categories)
    ]);

    await setDoc(doc(db, `artifacts/${appId}/settings/cacheConfig`), {
        kanjiUrl,
        vocabUrl,
        vocabCategoriesUrl,
        exportedAt
    }, { merge: true });

    // Invalidate stale promises and update local in-memory cache directly!
    invalidateKanjiCache();
    cachedKanjiList = kanjiList;
    cachedVocabList = vocabList;
    cachedVocabCategories = categories;
    lastLoadedExportedAt = exportedAt;

    // Dispatch custom event to tell all listeners that the entire cache has been reloaded/updated!
    window.dispatchEvent(new CustomEvent('kanji-cache-reloaded', {
        detail: { kanjiList, vocabList, categories }
    }));

    return { kanjiUrl, vocabUrl, vocabCategoriesUrl, exportedAt };
};


