import { db, storage, appId } from '../config/firebase';
import { collection, getDocs, query, where, doc, setDoc, onSnapshot } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { getCacheConfig } from './cacheConfigService';

// In-memory module cache
let cachedKanjiList = null;
let cachedVocabList = null;
let cachedVocabCategories = null;
let lastLoadedExportedAt = null;

// Loading promises to coordinate concurrent requests
let kanjiPromise = null;
let vocabPromise = null;
let categoriesPromise = null;

// Incremental sync in the background
async function fetchKanjiUpdatesFromFirestore(exportedAt) {
    if (!exportedAt) return;
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
    if (!exportedAt) return;
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

export const getSharedKanjiList = async () => {
    const cacheConfig = await getCacheConfig();
    const currentExport = cacheConfig?.exportedAt || 0;
    const needsRefresh = currentExport && lastLoadedExportedAt && currentExport > lastLoadedExportedAt;

    if (needsRefresh) {
        cachedKanjiList = null;
        kanjiPromise = null;
    }

    if (cachedKanjiList && !needsRefresh) return cachedKanjiList;
    if (kanjiPromise && !needsRefresh) return kanjiPromise;

    kanjiPromise = (async () => {
        try {
            console.log('Fetching shared kanji list from CDN...');
            
            let dataRes, exportedAt;
            if (cacheConfig && cacheConfig.kanjiUrl) {
                console.log('Using Firebase Storage CDN for Kanji cache');
                const urlWithBuster = cacheConfig.kanjiUrl.includes('?') 
                    ? `${cacheConfig.kanjiUrl}&t=${cacheConfig.exportedAt || Date.now()}`
                    : `${cacheConfig.kanjiUrl}?t=${cacheConfig.exportedAt || Date.now()}`;
                dataRes = await fetch(urlWithBuster);
                exportedAt = cacheConfig.exportedAt || 0;
            } else {
                console.log('Falling back to local bundle files for Kanji cache');
                const [localRes, metaRes] = await Promise.all([
                    fetch('/data/kanji_data.json'),
                    fetch('/data/metadata.json').catch(() => null)
                ]);
                dataRes = localRes;
                const meta = metaRes && metaRes.ok ? await metaRes.json() : null;
                exportedAt = meta?.exportedAt || 0;
            }

            if (!dataRes || !dataRes.ok) {
                throw new Error('CDN fetch failed');
            }

            const contentType = dataRes.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                throw new Error('Response is not JSON (got: ' + contentType + ')');
            }

            cachedKanjiList = await dataRes.json();
            lastLoadedExportedAt = currentExport || Date.now();

            // Sync edits made after the export timestamp in the background
            fetchKanjiUpdatesFromFirestore(exportedAt);

            return cachedKanjiList;
        } catch (e) {
            console.log('CDN load failed (expected if not synced), falling back to Firestore: ' + e.message);
            try {
                const snap = await getDocs(collection(db, 'kanji'));
                cachedKanjiList = snap.docs.map(d => ({ id: d.id, ...d.data() }));
                lastLoadedExportedAt = currentExport || Date.now();
                return cachedKanjiList;
            } catch (fsErr) {
                console.error('Error loading shared kanji list from Firestore fallback:', fsErr);
                kanjiPromise = null;
                throw fsErr;
            }
        }
    })();

    return kanjiPromise;
};

export const getSharedVocabList = async () => {
    const cacheConfig = await getCacheConfig();
    const currentExport = cacheConfig?.exportedAt || 0;
    const needsRefresh = currentExport && lastLoadedExportedAt && currentExport > lastLoadedExportedAt;

    if (needsRefresh) {
        cachedVocabList = null;
        vocabPromise = null;
    }

    if (cachedVocabList && !needsRefresh) return cachedVocabList;
    if (vocabPromise && !needsRefresh) return vocabPromise;

    vocabPromise = (async () => {
        try {
            console.log('Fetching shared vocab list from CDN...');
            
            let dataRes, exportedAt;
            if (cacheConfig && cacheConfig.vocabUrl) {
                console.log('Using Firebase Storage CDN for Vocab cache');
                const urlWithBuster = cacheConfig.vocabUrl.includes('?') 
                    ? `${cacheConfig.vocabUrl}&t=${cacheConfig.exportedAt || Date.now()}`
                    : `${cacheConfig.vocabUrl}?t=${cacheConfig.exportedAt || Date.now()}`;
                dataRes = await fetch(urlWithBuster);
                exportedAt = cacheConfig.exportedAt || 0;
            } else {
                console.log('Falling back to local bundle files for Vocab cache');
                const [localRes, metaRes] = await Promise.all([
                    fetch('/data/vocab_data.json'),
                    fetch('/data/metadata.json').catch(() => null)
                ]);
                dataRes = localRes;
                const meta = metaRes && metaRes.ok ? await metaRes.json() : null;
                exportedAt = meta?.exportedAt || 0;
            }

            if (!dataRes || !dataRes.ok) {
                throw new Error('CDN fetch failed');
            }

            const contentType = dataRes.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                throw new Error('Response is not JSON (got: ' + contentType + ')');
            }

            cachedVocabList = await dataRes.json();
            lastLoadedExportedAt = currentExport || Date.now();

            // Sync edits made after the export timestamp in the background
            fetchVocabUpdatesFromFirestore(exportedAt);

            return cachedVocabList;
        } catch (e) {
            console.log('CDN load failed (expected if not synced), falling back to Firestore: ' + e.message);
            try {
                const snap = await getDocs(collection(db, 'kanjiVocab'));
                cachedVocabList = snap.docs.map(d => ({ id: d.id, ...d.data() }));
                lastLoadedExportedAt = currentExport || Date.now();
                return cachedVocabList;
            } catch (fsErr) {
                console.error('Error loading shared vocab list from Firestore fallback:', fsErr);
                vocabPromise = null;
                throw fsErr;
            }
        }
    })();

    return vocabPromise;
};

export const getSharedVocabCategories = async () => {
    const cacheConfig = await getCacheConfig();
    const currentExport = cacheConfig?.exportedAt || 0;
    const needsRefresh = currentExport && lastLoadedExportedAt && currentExport > lastLoadedExportedAt;

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
            lastLoadedExportedAt = currentExport || Date.now();
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
    if (!cachedKanjiList) return;
    const idx = cachedKanjiList.findIndex(k => k.id === kanji.id);
    if (idx !== -1) {
        cachedKanjiList[idx] = { ...cachedKanjiList[idx], ...kanji };
    } else {
        cachedKanjiList.push(kanji);
    }
    // Dispatch event to keep other active screens in sync
    window.dispatchEvent(new CustomEvent('kanji-cache-updated', { 
        detail: { type: 'kanji', data: { ...cachedKanjiList[idx !== -1 ? idx : cachedKanjiList.length - 1] } } 
    }));
};

export const deleteCachedKanji = (kanjiId) => {
    if (!cachedKanjiList) return;
    cachedKanjiList = cachedKanjiList.filter(k => k.id !== kanjiId);
    window.dispatchEvent(new CustomEvent('kanji-cache-updated', { 
        detail: { type: 'kanji-delete', data: kanjiId } 
    }));
};

export const updateCachedVocab = (vocab) => {
    if (!cachedVocabList) return;
    const idx = cachedVocabList.findIndex(v => v.id === vocab.id);
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
let kanjiSrsUnsubscribe = null;

export const getCachedUserSrsData = () => cachedUserSrsData;

export const getSharedKanjiSrs = async (userId) => {
    if (!userId) return {};
    if (cachedUserIdForSrs !== userId) {
        clearUserSrsCache();
    }
    if (cachedUserIdForSrs === userId && cachedUserSrsData) {
        return cachedUserSrsData;
    }
    if (userSrsPromise) return userSrsPromise;

    userSrsPromise = (async () => {
        try {
            console.log('Fetching user Kanji SRS data from Firestore...');
            const srsSnap = await getDocs(collection(db, `artifacts/${appId}/users/${userId}/kanjiSRS`));
            const srs = {};
            srsSnap.docs.forEach(d => { srs[d.id] = d.data(); });
            cachedUserSrsData = srs;
            cachedUserIdForSrs = userId;
            return cachedUserSrsData;
        } catch (e) {
            console.error('Error fetching user Kanji SRS data:', e);
            userSrsPromise = null;
            return {};
        }
    })();

    return userSrsPromise;
};

/**
 * Subscribe to real-time Kanji SRS data updates via onSnapshot.
 * Returns an unsubscribe function. The callback receives the full SRS map.
 */
export const subscribeKanjiSrs = (userId, callback) => {
    if (!userId) return () => {};
    // Clean up any previous subscription
    if (kanjiSrsUnsubscribe) {
        kanjiSrsUnsubscribe();
        kanjiSrsUnsubscribe = null;
    }
    const colRef = collection(db, `artifacts/${appId}/users/${userId}/kanjiSRS`);
    kanjiSrsUnsubscribe = onSnapshot(colRef, (snapshot) => {
        const srs = {};
        snapshot.docs.forEach(d => { srs[d.id] = d.data(); });
        cachedUserSrsData = srs;
        cachedUserIdForSrs = userId;
        userSrsPromise = null;
        callback(srs);
    }, (error) => {
        console.error('Kanji SRS onSnapshot error:', error);
    });
    return () => {
        if (kanjiSrsUnsubscribe) {
            kanjiSrsUnsubscribe();
            kanjiSrsUnsubscribe = null;
        }
    };
};

export const updateCachedUserSrs = (userId, kanjiId, newSrs) => {
    if (cachedUserIdForSrs === userId && cachedUserSrsData) {
        if (newSrs === null) {
            delete cachedUserSrsData[kanjiId];
        } else {
            cachedUserSrsData[kanjiId] = newSrs;
        }
    }
};

export const clearUserSrsCache = () => {
    if (kanjiSrsUnsubscribe) {
        kanjiSrsUnsubscribe();
        kanjiSrsUnsubscribe = null;
    }
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
    if (kanjiProgressPromise) return kanjiProgressPromise;

    kanjiProgressPromise = (async () => {
        try {
            console.log('Fetching user Kanji progress from Firestore...');
            const progressSnap = await getDocs(collection(db, `artifacts/${appId}/users/${userId}/kanjiProgress`));
            const progress = {};
            progressSnap.docs.forEach(d => {
                const data = d.data();
                const key = `${data.level}_${data.day}`;
                progress[key] = data;
            });
            cachedKanjiProgress = progress;
            cachedUserIdForProgress = userId;
            return cachedKanjiProgress;
        } catch (e) {
            console.error('Error fetching user Kanji progress:', e);
            kanjiProgressPromise = null;
            return {};
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
    }
};

export const clearKanjiProgressCache = () => {
    cachedKanjiProgress = null;
    cachedUserIdForProgress = null;
    kanjiProgressPromise = null;
};

export const syncKanjiAndVocabToCDN = async (forceFull = false) => {
    let kanjiList = [];
    let vocabList = [];
    let categories = [];
    let exportedAt = Date.now();
    let isIncremental = false;

    const cacheConfig = await getCacheConfig();

    if (!forceFull && cacheConfig && cacheConfig.kanjiUrl && cacheConfig.vocabUrl && cacheConfig.vocabCategoriesUrl && cacheConfig.exportedAt) {
        try {
            console.log('Attempting incremental sync using existing CDN files...');
            const lastExport = cacheConfig.exportedAt;

            // Fetch current CDN files in parallel (bypass CDN cache using timestamp query parameter)
            const buster = Date.now();
            const [kanjiRes, vocabRes, catsRes] = await Promise.all([
                fetch(`${cacheConfig.kanjiUrl}&t=${buster}`).then(r => r.ok ? r.json() : null),
                fetch(`${cacheConfig.vocabUrl}&t=${buster}`).then(r => r.ok ? r.json() : null),
                fetch(`${cacheConfig.vocabCategoriesUrl}&t=${buster}`).then(r => r.ok ? r.json() : null)
            ]);

            if (kanjiRes && vocabRes && catsRes) {
                // Fetch only modified docs since lastExport
                const [kanjiUpdatesSnap, vocabUpdatesSnap, catsUpdatesSnap] = await Promise.all([
                    getDocs(query(collection(db, 'kanji'), where('updatedAt', '>', lastExport))),
                    getDocs(query(collection(db, 'kanjiVocab'), where('updatedAt', '>', lastExport))),
                    getDocs(query(collection(db, 'vocabCategories'), where('updatedAt', '>', lastExport)))
                ]);

                console.log(`Incremental updates found: ${kanjiUpdatesSnap.size} kanji, ${vocabUpdatesSnap.size} vocab, ${catsUpdatesSnap.size} categories`);

                // Helper to merge updates
                const mergeList = (existingList, updatesSnap) => {
                    const listMap = new Map(existingList.map(item => [item.id, item]));
                    updatesSnap.docs.forEach(docSnap => {
                        listMap.set(docSnap.id, { id: docSnap.id, ...docSnap.data() });
                    });
                    return Array.from(listMap.values());
                };

                kanjiList = mergeList(kanjiRes, kanjiUpdatesSnap);
                vocabList = mergeList(vocabRes, vocabUpdatesSnap);
                categories = mergeList(catsRes, catsUpdatesSnap);
                isIncremental = true;
            }
        } catch (incError) {
            console.warn('Incremental sync failed, falling back to full sync:', incError);
        }
    }

    if (!isIncremental) {
        console.log('Performing full sync of Kanji and Vocabulary...');
        // Fetch all data in parallel
        const [kanjiSnap, vocabSnap, categoriesSnap] = await Promise.all([
            getDocs(collection(db, 'kanji')),
            getDocs(collection(db, 'kanjiVocab')),
            getDocs(collection(db, 'vocabCategories'))
        ]);

        kanjiList = kanjiSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        vocabList = vocabSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        categories = categoriesSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    }

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

    // Update the local in-memory cache directly!
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


