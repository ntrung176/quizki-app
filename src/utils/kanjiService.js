import { db, storage, appId } from '../config/firebase';
import { collection, getDocs, query, where, doc, setDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { getCacheConfig } from './cacheConfigService';

// In-memory module cache
let cachedKanjiList = null;
let cachedVocabList = null;
let cachedVocabCategories = null;

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
    if (cachedKanjiList) return cachedKanjiList;
    if (kanjiPromise) return kanjiPromise;

    kanjiPromise = (async () => {
        try {
            console.log('Fetching shared kanji list from CDN...');
            const cacheConfig = await getCacheConfig();
            
            let dataRes, exportedAt;
            if (cacheConfig && cacheConfig.kanjiUrl) {
                console.log('Using Firebase Storage CDN for Kanji cache');
                dataRes = await fetch(cacheConfig.kanjiUrl);
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

            // Sync edits made after the export timestamp in the background
            fetchKanjiUpdatesFromFirestore(exportedAt);

            return cachedKanjiList;
        } catch (e) {
            console.log('CDN load failed (expected if not synced), falling back to Firestore: ' + e.message);
            try {
                const snap = await getDocs(collection(db, 'kanji'));
                cachedKanjiList = snap.docs.map(d => ({ id: d.id, ...d.data() }));
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
    if (cachedVocabList) return cachedVocabList;
    if (vocabPromise) return vocabPromise;

    vocabPromise = (async () => {
        try {
            console.log('Fetching shared vocab list from CDN...');
            const cacheConfig = await getCacheConfig();
            
            let dataRes, exportedAt;
            if (cacheConfig && cacheConfig.vocabUrl) {
                console.log('Using Firebase Storage CDN for Vocab cache');
                dataRes = await fetch(cacheConfig.vocabUrl);
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

            // Sync edits made after the export timestamp in the background
            fetchVocabUpdatesFromFirestore(exportedAt);

            return cachedVocabList;
        } catch (e) {
            console.log('CDN load failed (expected if not synced), falling back to Firestore: ' + e.message);
            try {
                const snap = await getDocs(collection(db, 'kanjiVocab'));
                cachedVocabList = snap.docs.map(d => ({ id: d.id, ...d.data() }));
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
    if (cachedVocabCategories) return cachedVocabCategories;
    if (categoriesPromise) return categoriesPromise;

    categoriesPromise = (async () => {
        try {
            console.log('Fetching shared vocab categories from CDN...');
            const cacheConfig = await getCacheConfig();
            
            let dataRes;
            if (cacheConfig && cacheConfig.vocabCategoriesUrl) {
                console.log('Using Firebase Storage CDN for Vocab Categories cache');
                dataRes = await fetch(cacheConfig.vocabCategoriesUrl);
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
            return cachedVocabCategories;
        } catch (e) {
            console.log('CDN load failed (expected if not synced), falling back to Firestore: ' + e.message);
            try {
                const snap = await getDocs(collection(db, 'vocabCategories'));
                cachedVocabCategories = snap.docs.map(d => ({ id: d.id, ...d.data() }));
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

export const syncKanjiAndVocabToCDN = async () => {
    // 1. Fetch all kanji data
    const kanjiSnap = await getDocs(collection(db, 'kanji'));
    const kanjiList = kanjiSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    // 2. Fetch all vocab data
    const vocabSnap = await getDocs(collection(db, 'kanjiVocab'));
    const vocabList = vocabSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    // 3. Fetch all categories
    const categoriesSnap = await getDocs(collection(db, 'vocabCategories'));
    const categories = categoriesSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    // 4. Upload cache files to Firebase Storage
    const uploadFile = async (fileName, data) => {
        const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
        const fileRef = ref(storage, `cache/${appId}/${fileName}`);
        await uploadBytes(fileRef, blob);
        return getDownloadURL(fileRef);
    };

    const kanjiUrl = await uploadFile('kanji_data.json', kanjiList);
    const vocabUrl = await uploadFile('vocab_data.json', vocabList);
    const vocabCategoriesUrl = await uploadFile('vocab_categories.json', categories);

    const exportedAt = Date.now();
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

    // Dispatch custom event to tell all listeners that the entire cache has been reloaded/updated!
    window.dispatchEvent(new CustomEvent('kanji-cache-reloaded', {
        detail: { kanjiList, vocabList, categories }
    }));

    return { kanjiUrl, vocabUrl, vocabCategoriesUrl, exportedAt };
};


