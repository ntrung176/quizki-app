import { doc, setDoc, getDocs, collection } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, appId, storage } from '../../config/firebase';
import { syncKanjiAndVocabToCDN } from '../../utils/kanjiService';
import { deepMergeBookGroups } from '../../utils/bookService';

export const fetchThirdPartyApiBalances = async () => {
    const results = { openRouter: null, speechGen: null, loading: false, error: '' };

    try {
        const aiProxyUrl = import.meta.env.VITE_AI_PROXY_URL || import.meta.env.VITE_OPENROUTER_PROXY_URL;
        const openRouterKey = import.meta.env.VITE_OPENROUTER_API_KEY;

        if (aiProxyUrl) {
            const baseProxy = aiProxyUrl.replace(/\/+$/, '');
            const res = await fetch(`${baseProxy}/credits`);
            if (res.ok) {
                const data = await res.json();
                results.openRouter = {
                    totalCredits: data.data?.total_credits || 0,
                    totalUsage: data.data?.total_usage || 0,
                    remaining: (data.data?.total_credits || 0) - (data.data?.total_usage || 0),
                    isProxy: true,
                };
            } else {
                const errData = await res.json().catch(() => ({}));
                results.openRouter = { error: `Proxy Error: HTTP ${res.status}${errData.error ? ` - ${errData.error}` : ''}` };
            }
        } else if (openRouterKey) {
            const res = await fetch('https://openrouter.ai/api/v1/credits', {
                headers: { 'Authorization': `Bearer ${openRouterKey}` }
            });
            if (res.ok) {
                const data = await res.json();
                results.openRouter = {
                    totalCredits: data.data?.total_credits || 0,
                    totalUsage: data.data?.total_usage || 0,
                    remaining: (data.data?.total_credits || 0) - (data.data?.total_usage || 0),
                };
            } else {
                results.openRouter = { error: `HTTP ${res.status}` };
            }
        } else {
            results.openRouter = { error: 'Chưa cấu hình API key hoặc AI Proxy URL' };
        }
    } catch (e) {
        results.openRouter = { error: e.message };
    }

    try {
        const azureKey = import.meta.env.VITE_AZURE_SPEECH_KEY;
        const proxyUrl = import.meta.env.VITE_AZURE_SPEECH_PROXY_URL;
        if (proxyUrl) {
            const baseProxy = proxyUrl.replace(/\/+$/, '');
            const res = await fetch(`${baseProxy}/status`);
            if (res.ok) {
                const data = await res.json();
                results.speechGen = { balance: 'Active', isAzure: true, isProxy: true, region: data.region || 'Unknown' };
            } else {
                const errData = await res.json().catch(() => ({}));
                results.speechGen = { error: `Proxy Error: HTTP ${res.status}${errData.error ? ` - ${errData.error}` : ''}` };
            }
        } else if (azureKey) {
            results.speechGen = { balance: 'Active', isAzure: true };
        } else {
            results.speechGen = { error: 'Chưa cấu hình API key hoặc Proxy URL Azure' };
        }
    } catch (e) {
        results.speechGen = { error: e.message };
    }

    return results;
};

const uploadCacheFile = async (fileName, data) => {
    const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
    const fileRef = ref(storage, `cache/${appId}/${fileName}`);
    await uploadBytes(fileRef, blob);
    return getDownloadURL(fileRef);
};

export const fetchAllBooksDataForCdn = async () => {
    let baseBooks = [];
    try {
        const res = await fetch(`/data/books_data.json?t=${Date.now()}`);
        if (res.ok) baseBooks = await res.json();
    } catch (e) {
        console.warn('Could not load /data/books_data.json as base:', e);
    }

    const COLLECTION = 'bookGroups';
    const groupsSnap = await getDocs(collection(db, COLLECTION));
    const groups = await Promise.all(groupsSnap.docs.map(async (groupDoc) => {
        const group = { id: groupDoc.id, ...groupDoc.data(), books: [] };
        const booksSnap = await getDocs(collection(db, COLLECTION, groupDoc.id, 'books'));
        group.books = await Promise.all(booksSnap.docs.map(async (bookDoc) => {
            const book = { id: bookDoc.id, ...bookDoc.data(), chapters: [] };
            const chaptersSnap = await getDocs(collection(db, COLLECTION, groupDoc.id, 'books', bookDoc.id, 'chapters'));
            book.chapters = await Promise.all(chaptersSnap.docs.map(async (chapterDoc) => {
                const chapter = { id: chapterDoc.id, ...chapterDoc.data(), lessons: [] };
                const lessonsSnap = await getDocs(collection(db, COLLECTION, groupDoc.id, 'books', bookDoc.id, 'chapters', chapterDoc.id, 'lessons'));
                chapter.lessons = lessonsSnap.docs
                    .map(lessonDoc => ({ id: lessonDoc.id, _docPath: lessonDoc.ref.path, ...lessonDoc.data() }))
                    .sort((a, b) => (a.order || 0) - (b.order || 0));
                return chapter;
            }));
            book.chapters.sort((a, b) => (a.order || 0) - (b.order || 0));
            return book;
        }));
        group.books.sort((a, b) => (a.order || 0) - (b.order || 0));
        return group;
    }));
    groups.sort((a, b) => (a.order || 0) - (b.order || 0));
    return deepMergeBookGroups(baseBooks, groups);
};

export const fetchAllGrammarDataForCdn = async () => {
    let baseTextbooks = [];
    try {
        const res = await fetch('/data/grammar_data.json');
        if (res.ok) baseTextbooks = await res.json();
    } catch (e) {
        console.warn('Could not load /data/grammar_data.json as base:', e);
    }

    const textbooksPath = `artifacts/${appId}/grammarTextbooks`;
    const textbooksSnap = await getDocs(collection(db, textbooksPath));
    const firestoreTextbooks = await Promise.all(textbooksSnap.docs.map(async (tbDoc) => {
        const tb = { id: tbDoc.id, ...tbDoc.data(), lessons: [] };
        const lessonsSnap = await getDocs(collection(db, `${textbooksPath}/${tbDoc.id}/lessons`));
        tb.lessons = await Promise.all(lessonsSnap.docs.map(async (lessonDoc) => {
            const lesson = { id: lessonDoc.id, ...lessonDoc.data(), points: [] };
            const pointsSnap = await getDocs(collection(db, `${textbooksPath}/${tbDoc.id}/lessons/${lessonDoc.id}/points`));
            lesson.points = pointsSnap.docs
                .map(pDoc => ({ id: pDoc.id, ...pDoc.data() }))
                .sort((a, b) => (a.order || 0) - (b.order || 0));
            return lesson;
        }));
        tb.lessons.sort((a, b) => (a.order || 0) - (b.order || 0));
        return tb;
    }));

    const mergedMap = new Map();
    baseTextbooks.forEach(tb => mergedMap.set(tb.id, tb));
    firestoreTextbooks.forEach(tb => {
        if (tb.id === 'master_bank' && (!tb.lessons || tb.lessons.length === 0 || (tb.lessons[0]?.points?.length || 0) === 0)) {
            return;
        }
        if (mergedMap.has(tb.id)) {
            const existing = mergedMap.get(tb.id);
            const lsMap = new Map((existing.lessons || []).map(l => [l.id, l]));
            (tb.lessons || []).forEach(l => lsMap.set(l.id, { ...(lsMap.get(l.id) || {}), ...l }));
            mergedMap.set(tb.id, { ...existing, ...tb, lessons: Array.from(lsMap.values()) });
        } else {
            mergedMap.set(tb.id, tb);
        }
    });

    const result = Array.from(mergedMap.values());
    result.sort((a, b) => (a.order || 0) - (b.order || 0));
    return result;
};

export const fetchAllJlptTestsDataForCdn = async () => {
    let baseTests = [];
    try {
        const res = await fetch(`/data/jlpt_data.json?t=${Date.now()}`);
        if (res.ok) baseTests = await res.json();
    } catch (e) {
        console.warn('Could not load /data/jlpt_data.json as base:', e);
    }

    const testsPath = `artifacts/${appId}/jlptTests`;
    const snap = await getDocs(collection(db, testsPath));
    const firestoreTests = snap.docs.map(d => ({ id: d.id, ...d.data() }));

    const mergedMap = new Map();
    if (Array.isArray(baseTests)) {
        baseTests.forEach(t => { if (t && t.id) mergedMap.set(t.id, t); });
    }
    firestoreTests.forEach(t => {
        if (t && t.id) {
            mergedMap.set(t.id, mergedMap.has(t.id) ? { ...mergedMap.get(t.id), ...t } : t);
        }
    });
    return Array.from(mergedMap.values());
};

export const syncCdnDomain = async (domain, forceFull = false) => {
    if (domain === 'kanji') {
        const result = await syncKanjiAndVocabToCDN(forceFull);
        window.dispatchEvent(new CustomEvent('cache-config-updated'));
        return result;
    }

    const exportedAt = Date.now();
    if (domain === 'books') {
        const booksData = await fetchAllBooksDataForCdn();
        const booksUrl = await uploadCacheFile('books_data.json', booksData);
        await setDoc(doc(db, `artifacts/${appId}/settings/cacheConfig`), { booksUrl, exportedAt }, { merge: true });
        window.dispatchEvent(new CustomEvent('cache-config-updated'));
        return { booksUrl, exportedAt };
    }
    if (domain === 'grammar') {
        const grammarData = await fetchAllGrammarDataForCdn();
        const grammarUrl = await uploadCacheFile('grammar_data.json', grammarData);
        await setDoc(doc(db, `artifacts/${appId}/settings/cacheConfig`), { grammarUrl, exportedAt }, { merge: true });
        window.dispatchEvent(new CustomEvent('cache-config-updated'));
        return { grammarUrl, exportedAt };
    }
    if (domain === 'jlpt') {
        const jlptData = await fetchAllJlptTestsDataForCdn();
        const jlptUrl = await uploadCacheFile('jlpt_data.json', jlptData);
        await setDoc(doc(db, `artifacts/${appId}/settings/cacheConfig`), { jlptUrl, exportedAt }, { merge: true });
        window.dispatchEvent(new CustomEvent('cache-config-updated'));
        return { jlptUrl, exportedAt };
    }
    return null;
};
