import { db } from '../config/firebase';
import { collection, getDocs } from 'firebase/firestore';

// In-memory module cache
let cachedKanjiList = null;
let cachedVocabList = null;
let cachedVocabCategories = null;

// Loading promises to coordinate concurrent requests
let kanjiPromise = null;
let vocabPromise = null;
let categoriesPromise = null;

export const getSharedKanjiList = async () => {
    if (cachedKanjiList) return cachedKanjiList;
    if (kanjiPromise) return kanjiPromise;

    kanjiPromise = (async () => {
        try {
            console.log('Fetching shared kanji list from Firestore...');
            const snap = await getDocs(collection(db, 'kanji'));
            cachedKanjiList = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            return cachedKanjiList;
        } catch (e) {
            console.error('Error loading shared kanji list:', e);
            kanjiPromise = null; // Reset promise so we can retry on failure
            throw e;
        }
    })();

    return kanjiPromise;
};

export const getSharedVocabList = async () => {
    if (cachedVocabList) return cachedVocabList;
    if (vocabPromise) return vocabPromise;

    vocabPromise = (async () => {
        try {
            console.log('Fetching shared vocab list from Firestore...');
            const snap = await getDocs(collection(db, 'kanjiVocab'));
            cachedVocabList = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            return cachedVocabList;
        } catch (e) {
            console.error('Error loading shared vocab list:', e);
            vocabPromise = null;
            throw e;
        }
    })();

    return vocabPromise;
};

export const getSharedVocabCategories = async () => {
    if (cachedVocabCategories) return cachedVocabCategories;
    if (categoriesPromise) return categoriesPromise;

    categoriesPromise = (async () => {
        try {
            console.log('Fetching shared vocab categories from Firestore...');
            const snap = await getDocs(collection(db, 'vocabCategories'));
            cachedVocabCategories = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            return cachedVocabCategories;
        } catch (e) {
            console.error('Error loading shared vocab categories:', e);
            categoriesPromise = null;
            throw e;
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
};

export const deleteCachedKanji = (kanjiId) => {
    if (!cachedKanjiList) return;
    cachedKanjiList = cachedKanjiList.filter(k => k.id !== kanjiId);
};

export const updateCachedVocab = (vocab) => {
    if (!cachedVocabList) return;
    const idx = cachedVocabList.findIndex(v => v.id === vocab.id);
    if (idx !== -1) {
        cachedVocabList[idx] = { ...cachedVocabList[idx], ...vocab };
    } else {
        cachedVocabList.push(vocab);
    }
};

export const deleteCachedVocab = (vocabId) => {
    if (!cachedVocabList) return;
    cachedVocabList = cachedVocabList.filter(v => v.id !== vocabId);
};

export const getCachedKanjiList = () => cachedKanjiList;
export const getCachedVocabList = () => cachedVocabList;
export const getCachedVocabCategories = () => cachedVocabCategories;

