// grammarService.js — Firestore CRUD for Grammar module
import { doc, getDoc, updateDoc, deleteDoc, collection, addDoc, getDocs, onSnapshot, serverTimestamp, writeBatch, setDoc } from 'firebase/firestore'
import { db, appId } from '../config/firebase';
import { getCacheConfig } from './cacheConfigService';

// ============== PATHS ==============
const textbooksPath = () => `artifacts/${appId}/grammarTextbooks`;
const lessonsPath = (textbookId) => `artifacts/${appId}/grammarTextbooks/${textbookId}/lessons`;
const grammarPointsPath = (textbookId, lessonId) => `artifacts/${appId}/grammarTextbooks/${textbookId}/lessons/${lessonId}/points`;
const masterGrammarPath = () => grammarPointsPath('master_bank', 'master_lesson');

// ============== CDN CACHE ==============
let cachedGrammarData = null;
let grammarPromise = null;
let lastLoadedExportedAt = null;

let cachedSharedGrammarPointsList = null;
let grammarPointsListPromise = null;

export const clearSharedGrammarPointsListCache = () => {
    cachedSharedGrammarPointsList = null;
    grammarPointsListPromise = null;
};

// SWR / Firestore fallback caches
let textbooksCache = null;
let textbooksListeners = new Set();
let textbooksUnsub = null;

const lessonsCache = {}; // textbookId -> lessons array
const lessonsListeners = {}; // textbookId -> Set of callbacks
const lessonsUnsubs = {}; // textbookId -> unsub function

const pointsCache = {}; // "textbookId/lessonId" -> points array
const pointsListeners = {}; // "textbookId/lessonId" -> Set of callbacks
const pointsUnsubs = {}; // "textbookId/lessonId" -> unsub function

export const invalidateGrammarCache = () => {
    cachedGrammarData = null;
    grammarPromise = null;
    lastLoadedExportedAt = null;
    clearSharedGrammarPointsListCache();
};

if (typeof window !== 'undefined') {
    window.addEventListener('cache-config-updated', invalidateGrammarCache);
}

export const getSharedGrammarData = async () => {
    const cacheConfig = await getCacheConfig();
    const currentExport = cacheConfig?.exportedAt || 0;
    const needsRefresh = currentExport && (!lastLoadedExportedAt || currentExport > lastLoadedExportedAt);

    if (needsRefresh && !grammarPromise) {
        cachedGrammarData = null;
        clearSharedGrammarPointsListCache();
    }

    if (cachedGrammarData && !needsRefresh) return cachedGrammarData;
    if (grammarPromise) return grammarPromise;

    grammarPromise = (async () => {
        try {
            console.log('Fetching shared grammar data from CDN...');
            
            let dataRes;
            if (cacheConfig && cacheConfig.grammarUrl) {
                console.log('Using Firebase Storage CDN for Grammar cache');
                const urlWithBuster = cacheConfig.grammarUrl.includes('?') 
                    ? `${cacheConfig.grammarUrl}&t=${cacheConfig.exportedAt || Date.now()}`
                    : `${cacheConfig.grammarUrl}?t=${cacheConfig.exportedAt || Date.now()}`;
                dataRes = await fetch(urlWithBuster);
            } else {
                console.log('Falling back to local bundle files for Grammar cache');
                dataRes = await fetch('/data/grammar_data.json');
            }

            if (!dataRes || !dataRes.ok) throw new Error('CDN fetch failed');
            
            const contentType = dataRes.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                throw new Error('Response is not JSON (got: ' + contentType + ')');
            }

            cachedGrammarData = await dataRes.json();
            lastLoadedExportedAt = currentExport || null;
            return cachedGrammarData;
        } catch (e) {
            console.log('CDN load failed (expected if not synced), falling back to Firestore: ' + e.message);
            return null;
        }
    })();

    return grammarPromise;
};

// ============== TEXTBOOKS ==============

export const subscribeTextbooks = (callback, isAdmin = false) => {
    // Try CDN first
    if (!isAdmin) {
        (async () => {
            try {
                const data = await getSharedGrammarData();
                if (data) {
                    callback(data);
                    return;
                }
            } catch (e) {
                console.warn('CDN subscribeTextbooks failed:', e);
            }
        })();
    }

    // Return cached textbooks immediately if available (instant page transition)
    if (textbooksCache) {
        callback(textbooksCache);
    }

    textbooksListeners.add(callback);

    if (!textbooksUnsub) {
        const colRef = collection(db, textbooksPath());
        textbooksUnsub = onSnapshot(colRef, (snapshot) => {
            const items = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
            items.sort((a, b) => (a.order || 0) - (b.order || 0));
            textbooksCache = items;
            textbooksListeners.forEach(cb => cb(items));
        }, (err) => {
            console.error('Subscribe textbooks error:', err);
            textbooksListeners.forEach(cb => cb([]));
        });
    }

    return () => {
        textbooksListeners.delete(callback);
        if (textbooksListeners.size === 0 && textbooksUnsub) {
            textbooksUnsub();
            textbooksUnsub = null;
            textbooksCache = null;
        }
    };
};

export const addTextbook = async (data, adminUserId) => {
    try {
        clearSharedGrammarPointsListCache();
        const colRef = collection(db, textbooksPath());
        const snap = await getDocs(colRef);
        const docRef = await addDoc(colRef, {
            ...data,
            order: snap.size,
            createdAt: serverTimestamp(),
            createdBy: adminUserId,
        });
        return { success: true, id: docRef.id };
    } catch (e) {
        console.error('Add textbook error:', e);
        return { success: false, error: e.message };
    }
};

export const updateTextbook = async (textbookId, data) => {
    try {
        clearSharedGrammarPointsListCache();
        await updateDoc(doc(db, textbooksPath(), textbookId), { ...data, updatedAt: serverTimestamp() });
        return true;
    } catch (e) {
        console.error('Update textbook error:', e);
        return false;
    }
};

export const deleteTextbook = async (textbookId) => {
    try {
        clearSharedGrammarPointsListCache();
        // Delete all lessons + grammar points first
        const lessonsSnap = await getDocs(collection(db, lessonsPath(textbookId)));
        const deleteRefs = [];
        for (const lessonDoc of lessonsSnap.docs) {
            const gpSnap = await getDocs(collection(db, grammarPointsPath(textbookId, lessonDoc.id)));
            gpSnap.docs.forEach(gpDoc => deleteRefs.push(gpDoc.ref));
            deleteRefs.push(lessonDoc.ref);
        }
        deleteRefs.push(doc(db, textbooksPath(), textbookId));

        const batchSize = 500;
        for (let i = 0; i < deleteRefs.length; i += batchSize) {
            const batch = writeBatch(db);
            const chunk = deleteRefs.slice(i, i + batchSize);
            chunk.forEach(ref => batch.delete(ref));
            await batch.commit();
        }
        return true;
    } catch (e) {
        console.error('Delete textbook error:', e);
        return false;
    }
};

// ============== LESSONS ==============

export const subscribeLessons = (textbookId, callback, isAdmin = false) => {
    if (!textbookId) {
        callback([]);
        return () => {};
    }

    // Try CDN first
    if (!isAdmin) {
        (async () => {
            try {
                const data = await getSharedGrammarData();
                if (data) {
                    const tb = data.find(t => t.id === textbookId);
                    if (tb) {
                        callback(tb.lessons || []);
                        return;
                    }
                }
            } catch (e) {
                console.warn('CDN subscribeLessons failed:', e);
            }
        })();
    }

    // Return cached lessons immediately if available (instant page transition)
    if (lessonsCache[textbookId]) {
        callback(lessonsCache[textbookId]);
    }

    if (!lessonsListeners[textbookId]) {
        lessonsListeners[textbookId] = new Set();
    }
    lessonsListeners[textbookId].add(callback);

    if (!lessonsUnsubs[textbookId]) {
        const colRef = collection(db, lessonsPath(textbookId));
        lessonsUnsubs[textbookId] = onSnapshot(colRef, (snapshot) => {
            const items = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
            items.sort((a, b) => (a.order || 0) - (b.order || 0));
            lessonsCache[textbookId] = items;
            if (lessonsListeners[textbookId]) {
                lessonsListeners[textbookId].forEach(cb => cb(items));
            }
        }, (err) => {
            console.error('Subscribe lessons error:', err);
            if (lessonsListeners[textbookId]) {
                lessonsListeners[textbookId].forEach(cb => cb([]));
            }
        });
    }

    return () => {
        if (lessonsListeners[textbookId]) {
            lessonsListeners[textbookId].delete(callback);
            if (lessonsListeners[textbookId].size === 0) {
                if (lessonsUnsubs[textbookId]) {
                    lessonsUnsubs[textbookId]();
                    delete lessonsUnsubs[textbookId];
                }
                delete lessonsListeners[textbookId];
            }
        }
    };
};

export const addLesson = async (textbookId, data, adminUserId) => {
    try {
        clearSharedGrammarPointsListCache();
        const colRef = collection(db, lessonsPath(textbookId));
        const snap = await getDocs(colRef);
        const docRef = await addDoc(colRef, {
            ...data,
            order: snap.size,
            createdAt: serverTimestamp(),
            createdBy: adminUserId,
        });
        return { success: true, id: docRef.id };
    } catch (e) {
        console.error('Add lesson error:', e);
        return { success: false, error: e.message };
    }
};

export const updateLesson = async (textbookId, lessonId, data) => {
    try {
        clearSharedGrammarPointsListCache();
        await updateDoc(doc(db, lessonsPath(textbookId), lessonId), { ...data, updatedAt: serverTimestamp() });
        return true;
    } catch (e) {
        console.error('Update lesson error:', e);
        return false;
    }
};

export const deleteLesson = async (textbookId, lessonId) => {
    try {
        clearSharedGrammarPointsListCache();
        const gpSnap = await getDocs(collection(db, grammarPointsPath(textbookId, lessonId)));
        const batch = writeBatch(db);
        gpSnap.docs.forEach(gpDoc => {
            batch.delete(gpDoc.ref);
        });
        batch.delete(doc(db, lessonsPath(textbookId), lessonId));
        await batch.commit();
        return true;
    } catch (e) {
        console.error('Delete lesson error:', e);
        return false;
    }
};

// ============== GRAMMAR POINTS ==============

export const subscribeGrammarPoints = (textbookId, lessonId, callback, isAdmin = false) => {
    if (!textbookId || !lessonId) {
        callback([]);
        return () => {};
    }

    const key = `${textbookId}/${lessonId}`;

    // Try CDN first
    if (!isAdmin) {
        (async () => {
            try {
                const data = await getSharedGrammarData();
                if (data) {
                    const tb = data.find(t => t.id === textbookId);
                    if (tb) {
                        const ls = (tb.lessons || []).find(l => l.id === lessonId);
                        if (ls) {
                            callback(ls.points || []);
                            return;
                        }
                    }
                }
            } catch (e) {
                console.warn('CDN subscribeGrammarPoints failed:', e);
            }
        })();
    }

    // Return cached points immediately if available (instant page transition)
    if (pointsCache[key]) {
        callback(pointsCache[key]);
    }

    if (!pointsListeners[key]) {
        pointsListeners[key] = new Set();
    }
    pointsListeners[key].add(callback);

    if (!pointsUnsubs[key]) {
        const colRef = collection(db, grammarPointsPath(textbookId, lessonId));
        pointsUnsubs[key] = onSnapshot(colRef, (snapshot) => {
            const deletedSet = getDeletedGrammarIds();
            const items = snapshot.docs.map(d => ({ id: d.id, ...d.data() })).filter(pt => !deletedSet.has(pt.id));
            items.sort((a, b) => (a.order || 0) - (b.order || 0));
            pointsCache[key] = items;
            if (pointsListeners[key]) {
                pointsListeners[key].forEach(cb => cb(items));
            }
        }, (err) => {
            console.error('Subscribe grammar points error:', err);
            if (pointsListeners[key]) {
                pointsListeners[key].forEach(cb => cb([]));
            }
        });
    }

    return () => {
        if (pointsListeners[key]) {
            pointsListeners[key].delete(callback);
            if (pointsListeners[key].size === 0) {
                if (pointsUnsubs[key]) {
                    pointsUnsubs[key]();
                    delete pointsUnsubs[key];
                }
                delete pointsListeners[key];
            }
        }
    };
};

export const addGrammarPoint = async (textbookId, lessonId, data, adminUserId) => {
    try {
        clearSharedGrammarPointsListCache();
        const colRef = collection(db, grammarPointsPath(textbookId, lessonId));
        const snap = await getDocs(colRef);
        const docRef = await addDoc(colRef, {
            ...data,
            order: snap.size,
            textbookId,
            lessonId,
            createdAt: serverTimestamp(),
            createdBy: adminUserId,
        });
        return { success: true, id: docRef.id };
    } catch (e) {
        console.error('Add grammar point error:', e);
        return { success: false, error: e.message };
    }
};

export const updateGrammarPoint = async (textbookId, lessonId, grammarId, data) => {
    try {
        clearSharedGrammarPointsListCache();
        await updateDoc(doc(db, grammarPointsPath(textbookId, lessonId), grammarId), { ...data, updatedAt: serverTimestamp() });
        return true;
    } catch (e) {
        console.error('Update grammar point error:', e);
        return false;
    }
};

const DELETED_GRAMMAR_KEY = 'quizki_deleted_grammar_ids';

export const getDeletedGrammarIds = () => {
    try {
        const stored = localStorage.getItem(DELETED_GRAMMAR_KEY);
        return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch (e) {
        return new Set();
    }
};

export const addDeletedGrammarIds = (ids) => {
    try {
        const current = getDeletedGrammarIds();
        ids.forEach(id => {
            if (id) current.add(id);
        });
        const arr = Array.from(current);
        localStorage.setItem(DELETED_GRAMMAR_KEY, JSON.stringify(arr));

        // Background sync to Firestore deleted system collection
        const deletedRef = doc(db, `artifacts/${appId}/system`, 'deletedGrammar');
        const updateObj = {};
        ids.forEach(id => {
            if (id) updateObj[id] = true;
        });
        setDoc(deletedRef, updateObj, { merge: true }).catch(err => console.warn('Sync deleted IDs error:', err));
    } catch (e) {
        console.error('Error saving deleted grammar IDs:', e);
    }
};

// Sync remote deleted IDs on startup
(async () => {
    try {
        const snap = await getDoc(doc(db, `artifacts/${appId}/system`, 'deletedGrammar'));
        if (snap.exists()) {
            const data = snap.data();
            const remoteDeletedIds = Object.keys(data).filter(k => data[k] === true);
            if (remoteDeletedIds.length > 0) {
                const localSet = getDeletedGrammarIds();
                let changed = false;
                remoteDeletedIds.forEach(id => {
                    if (!localSet.has(id)) {
                        localSet.add(id);
                        changed = true;
                    }
                });
                if (changed) {
                    localStorage.setItem(DELETED_GRAMMAR_KEY, JSON.stringify(Array.from(localSet)));
                }
            }
        }
    } catch (e) {
        // Silently catch if user is offline or collection doesn't exist yet
    }
})();

export const deleteGrammarPoint = async (textbookId, lessonId, grammarId) => {
    try {
        addDeletedGrammarIds([grammarId]);
        clearSharedGrammarPointsListCache();
        cachedGrammarData = null;
        if (textbookId && lessonId && textbookId !== 'master') {
            await deleteDoc(doc(db, grammarPointsPath(textbookId, lessonId), grammarId)).catch(() => {});
        }
        await deleteDoc(doc(db, masterGrammarPath(), grammarId)).catch(() => {});
        return true;
    } catch (e) {
        console.error('Delete grammar point error:', e);
        addDeletedGrammarIds([grammarId]);
        return true;
    }
};

export const deleteGrammarPointsBatch = async (items) => {
    try {
        const ids = items.map(item => typeof item === 'string' ? item : item.id).filter(Boolean);
        addDeletedGrammarIds(ids);
        clearSharedGrammarPointsListCache();
        cachedGrammarData = null;

        await Promise.all(items.map(item => {
            const gid = typeof item === 'string' ? item : item.id;
            const tb = typeof item === 'string' ? null : item.textbookId;
            const ls = typeof item === 'string' ? null : item.lessonId;
            const promises = [];
            if (tb && ls && tb !== 'master') {
                promises.push(deleteDoc(doc(db, grammarPointsPath(tb, ls), gid)).catch(() => {}));
            }
            promises.push(deleteDoc(doc(db, masterGrammarPath(), gid)).catch(() => {}));
            return Promise.all(promises);
        }));
        return true;
    } catch (e) {
        console.error('Batch delete grammar points error:', e);
        return false;
    }
};

// ============== FETCH SINGLE GRAMMAR POINT (for detail/practice) ==============

export const fetchGrammarPointById = async (grammarId, textbookId, lessonId) => {
    // Try Master Bank query directly
    try {
        const masterRef = doc(db, masterGrammarPath(), grammarId);
        const masterSnap = await getDoc(masterRef);
        if (masterSnap.exists()) {
            const data = masterSnap.data();
            return {
                ...data,
                id: masterSnap.id,
                textbookId: textbookId || 'master',
                lessonId: lessonId || 'master',
                textbook: { id: 'master', title: `Kho Ngữ Pháp (${data.level || 'N4'})`, titleVi: `Kho Ngữ Pháp (${data.level || 'N4'})` },
                lesson: { id: 'master', title: 'Kho Ngữ Pháp Trung Tâm', meaning: 'Kho Ngữ Pháp Gốc' }
            };
        }
    } catch (e) {
        console.warn("Master bank fetch for grammar point failed:", e);
    }

    // Try CDN first
    try {
        const data = await getSharedGrammarData();
        if (data) {
            for (const textbook of data) {
                if (textbookId && textbook.id !== textbookId) continue;
                for (const lesson of textbook.lessons || []) {
                    if (lessonId && lesson.id !== lessonId) continue;
                    const found = (lesson.points || []).find(pt => pt.id === grammarId);
                    if (found) {
                        return {
                            ...found,
                            textbookId: textbook.id,
                            lessonId: lesson.id,
                            textbook: { id: textbook.id, title: textbook.title, titleVi: textbook.titleVi, levels: textbook.levels, category: textbook.category, color: textbook.color },
                            lesson: { id: lesson.id, title: lesson.title, meaning: lesson.meaning, sectionLabel: lesson.sectionLabel, isPremium: lesson.isPremium }
                        };
                    }
                }
            }
        }
    } catch (err) {
        console.warn("CDN lookup for grammar point failed:", err);
    }

    // Try in-memory SWR pointsCache first (extremely fast)
    if (textbookId && lessonId) {
        const key = `${textbookId}/${lessonId}`;
        if (pointsCache[key]) {
            const found = pointsCache[key].find(pt => pt.id === grammarId);
            if (found) {
                const tbData = textbooksCache?.find(t => t.id === textbookId) || { id: textbookId };
                const lsData = lessonsCache[textbookId]?.find(l => l.id === lessonId) || { id: lessonId };
                return {
                    ...found,
                    textbookId,
                    lessonId,
                    textbook: tbData,
                    lesson: lsData
                };
            }
        }
    }

    try {
        // If textbookId and lessonId are provided, query directly!
        if (textbookId && lessonId) {
            const gpRef = doc(db, grammarPointsPath(textbookId, lessonId), grammarId);
            const gpSnap = await getDoc(gpRef);
            if (gpSnap.exists()) {
                const tbSnap = await getDoc(doc(db, textbooksPath(), textbookId));
                const lsSnap = await getDoc(doc(db, lessonsPath(textbookId), lessonId));
                return {
                    ...gpSnap.data(),
                    id: gpSnap.id,
                    textbookId,
                    lessonId,
                    textbook: tbSnap.exists() ? { id: textbookId, ...tbSnap.data() } : { id: textbookId },
                    lesson: lsSnap.exists() ? { id: lessonId, ...lsSnap.data() } : { id: lessonId }
                };
            }
        }
    } catch (err) {
        console.warn("Direct Firestore fetch failed, falling back to search:", err);
    }

    // Fallback nested loop query if textbookId/lessonId are not provided or if direct query fails
    try {
        const textbooksSnap = await getDocs(collection(db, textbooksPath()));
        for (const tbDoc of textbooksSnap.docs) {
            const lessonsSnap = await getDocs(collection(db, lessonsPath(tbDoc.id)));
            for (const lessonDoc of lessonsSnap.docs) {
                const gpRef = doc(db, grammarPointsPath(tbDoc.id, lessonDoc.id), grammarId);
                const gpSnap = await getDoc(gpRef);
                if (gpSnap.exists()) {
                    return {
                        ...gpSnap.data(),
                        id: gpSnap.id,
                        textbookId: tbDoc.id,
                        lessonId: lessonDoc.id,
                        textbook: { id: tbDoc.id, ...tbDoc.data() },
                        lesson: { id: lessonDoc.id, ...lessonDoc.data() },
                    };
                }
            }
        }
        return null;
    } catch (e) {
        console.error('Fetch grammar point by ID error:', e);
        return null;
    }
};

// ============== BULK JSON IMPORT ==============

export const importTextbooksFromJson = async (jsonArray, adminUserId) => {
    try {
        let count = 0;
        for (const tb of jsonArray) {
            const tbData = {
                title: tb.title || '',
                titleVi: tb.titleVi || '',
                description: tb.description || '',
                levels: Array.isArray(tb.levels) ? tb.levels : (tb.levels || '').split(',').map(s => s.trim()).filter(Boolean),
                category: tb.category || 'jlpt',
                featured: !!tb.featured,
                color: tb.color || '#10b981'
            };
            const res = await addTextbook(tbData, adminUserId);
            if (!res.success) throw new Error(`Lỗi giáo trình "${tbData.titleVi}": ${res.error}`);
            count++;
        }
        return { success: true, count };
    } catch (e) {
        console.error('Import textbooks error:', e);
        return { success: false, error: e.message };
    }
};

export const importLessonsFromJson = async (textbookId, jsonArray, adminUserId) => {
    try {
        let count = 0;
        for (const lesson of jsonArray) {
            const lessonData = {
                sectionLabel: lesson.sectionLabel || '',
                title: lesson.title || '',
                meaning: lesson.meaning || '',
                isReview: !!lesson.isReview,
                exercises: Array.isArray(lesson.exercises) ? lesson.exercises : [],
                quizzes: Array.isArray(lesson.quizzes) ? lesson.quizzes : []
            };
            const res = await addLesson(textbookId, lessonData, adminUserId);
            if (!res.success) throw new Error(`Lỗi bài học "${lessonData.title}": ${res.error}`);
            count++;
        }
        return { success: true, count };
    } catch (e) {
        console.error('Import lessons error:', e);
        return { success: false, error: e.message };
    }
};

export const importGrammarPointsFromJson = async (textbookId, lessonId, jsonArray, adminUserId) => {
    try {
        clearSharedGrammarPointsListCache();
        let count = 0;
        for (const gp of jsonArray) {
            // Helper parsing logic
            const parseStructure = (raw) => {
                if (!raw) return [];
                return raw.split('+').map(s => {
                    const t = s.trim();
                    if (t.startsWith('*')) return { text: t.slice(1), type: 'highlight' };
                    if (t.startsWith('V')) return { text: t, type: 'verb' };
                    if (t.startsWith('N') || t.startsWith('A')) return { text: t, type: 'noun' };
                    return { text: t, type: 'connector' };
                });
            };
            const parseTips = (raw) => raw ? raw.split('\n').filter(Boolean).map(l => ({ icon: '💡', text: l.trim() })) : [];
            const parseExamples = (raw) => {
                if (!raw) return [];
                const isJp = (t) => /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff]/.test(t);
                if (Array.isArray(raw)) {
                    const result = [];
                    for (let i = 0; i < raw.length; i++) {
                        const item = raw[i];
                        if (typeof item === 'object' && item !== null) {
                            const ja = (item.ja || '').trim();
                            const vi = (item.vi || '').trim();
                            if (ja && !vi && isJp(ja) && i + 1 < raw.length) {
                                const next = raw[i + 1];
                                const nextJa = (typeof next === 'object' ? next?.ja : String(next || '')).trim();
                                if (nextJa && !isJp(nextJa)) {
                                    result.push({ ja, vi: nextJa });
                                    i++;
                                    continue;
                                }
                            }
                            result.push({ ja, vi });
                        } else if (typeof item === 'string') {
                            const lines = item.split('\n').map(l => l.trim()).filter(Boolean);
                            if (lines.length >= 2) {
                                result.push({ ja: lines[0], vi: lines[1] });
                            } else if (lines.length === 1) {
                                if (i + 1 < raw.length && typeof raw[i + 1] === 'string' && !isJp(raw[i + 1])) {
                                    result.push({ ja: lines[0], vi: raw[i + 1].trim() });
                                    i++;
                                } else {
                                    result.push({ ja: lines[0], vi: '' });
                                }
                            }
                        }
                    }
                    return result;
                }
                const lines = typeof raw === 'string' ? raw.split('\n').filter(Boolean) : [];
                const exs = [];
                for (let i = 0; i < lines.length; i += 2) {
                    exs.push({ ja: lines[i]?.trim() || '', vi: lines[i + 1]?.trim() || '' });
                }
                return exs;
            };
            const parseExercises = (raw) => {
                if (!raw) return [];
                const blocks = raw.split('---').filter(Boolean);
                return blocks.map((block, idx) => {
                    const lines = block.trim().split('\n').filter(Boolean);
                    const questionVi = lines[0] || '';
                    const hint = lines[1] || '';
                    const answers = lines.slice(2);
                    return { id: `ex-${idx}`, type: 'translate-vi-to-ja', questionVi, hint, answers };
                });
            };

            const gpData = {
                pattern: gp.pattern || '',
                meaningShort: gp.meaningShort || '',
                meaning: gp.meaning || '',
                meaningFull: gp.meaningFull || '',
                structure: Array.isArray(gp.structure) ? gp.structure : parseStructure(gp.structureRaw || gp.structure || ''),
                tips: Array.isArray(gp.tips) ? gp.tips : parseTips(gp.tipsRaw || gp.tips || ''),
                examples: Array.isArray(gp.examples) ? gp.examples : parseExamples(gp.examplesRaw || gp.examples || ''),
                exercises: Array.isArray(gp.exercises) ? gp.exercises : parseExercises(gp.exercisesRaw || gp.exercises || ''),
                quizzes: Array.isArray(gp.quizzes) ? gp.quizzes : [],
                visual: {
                    active: gp.visual?.active !== undefined ? gp.visual.active : !!(gp.visual?.image || gp.image || gp.visual?.sentenceJa || gp.sentenceJa),
                    title: gp.visual?.title || gp.visualTitle || "Học Ngữ pháp Trực quan Zen",
                    image: gp.visual?.image || gp.image || "",
                    sentenceJa: gp.visual?.sentenceJa || gp.sentenceJa || "",
                    descriptionVi: gp.visual?.descriptionVi || gp.descriptionVi || ""
                }
            };

            const res = await addGrammarPoint(textbookId, lessonId, gpData, adminUserId);
            if (!res.success) throw new Error(`Lỗi ngữ pháp "${gpData.pattern}": ${res.error}`);
            count++;
        }
        return { success: true, count };
    } catch (e) {
        console.error('Import grammar points error:', e);
        return { success: false, error: e.message };
    }
};

export const importDirectGrammarPointsFromJson = async (jsonInput, defaultLevel = 'N4', adminUserId = 'admin') => {
    try {
        let jsonArray = [];
        if (typeof jsonInput === 'string') {
            jsonArray = JSON.parse(jsonInput);
        } else {
            jsonArray = jsonInput;
        }
        if (!Array.isArray(jsonArray)) {
            jsonArray = [jsonArray]; // Allow single object import
        }

        clearSharedGrammarPointsListCache();
        cachedGrammarData = null;

        // 1. Fetch existing textbooks to map levels
        const tbSnap = await getDocs(collection(db, textbooksPath()));
        const existingTextbooks = tbSnap.docs.map(d => ({ id: d.id, ...d.data() }));

        const levelTbMap = {};
        for (const tb of existingTextbooks) {
            if (Array.isArray(tb.levels)) {
                tb.levels.forEach(lvl => {
                    const normLvl = String(lvl).trim().toUpperCase();
                    if (!levelTbMap[normLvl]) {
                        levelTbMap[normLvl] = tb.id;
                    }
                });
            }
        }

        let importedCount = 0;
        const importedItems = [];

        for (const rawGp of jsonArray) {
            const level = String(defaultLevel || rawGp.level || 'N4').trim().toUpperCase();

            // Helper parsing logic
            const parseStructure = (raw) => {
                if (!raw) return [];
                return raw.split('+').map(s => {
                    const t = s.trim();
                    if (t.startsWith('*')) return { text: t.slice(1), type: 'highlight' };
                    if (t.startsWith('V')) return { text: t, type: 'verb' };
                    if (t.startsWith('N') || t.startsWith('A')) return { text: t, type: 'noun' };
                    return { text: t, type: 'connector' };
                });
            };

            const structureParsed = Array.isArray(rawGp.structure) 
                ? rawGp.structure 
                : parseStructure(rawGp.structureRaw || rawGp.structure || '');

            const tipsParsed = Array.isArray(rawGp.tips)
                ? rawGp.tips
                : (rawGp.tipsRaw ? rawGp.tipsRaw.split('\n').filter(Boolean).map(t => ({ icon: '💡', text: t.trim() })) : []);

            const examplesParsed = Array.isArray(rawGp.examples)
                ? rawGp.examples
                : (rawGp.examplesRaw ? rawGp.examplesRaw.split('\n').filter(Boolean).map(ex => {
                    const parts = ex.split('\\n').join('\n').split('\n');
                    return { ja: parts[0] || '', vi: parts[1] || '' };
                }) : []);

            const gpData = {
                pattern: rawGp.pattern || '',
                meaningShort: rawGp.meaningShort || rawGp.meaning || '',
                meaning: rawGp.meaning || rawGp.meaningShort || '',
                meaningFull: rawGp.meaningFull || '',
                level: level,
                structure: structureParsed,
                tips: tipsParsed,
                examples: examplesParsed,
                exercises: Array.isArray(rawGp.exercises) ? rawGp.exercises : [],
                quizzes: Array.isArray(rawGp.quizzes) ? rawGp.quizzes : [],
                dialogues: Array.isArray(rawGp.dialogues) ? rawGp.dialogues : [],
                visual: rawGp.visual || {
                    title: rawGp.visualTitle || "Học Ngữ pháp Trực quan Zen",
                    imageLabel: rawGp.visualLabel || "",
                    image: rawGp.visualImage || "",
                    sentenceJa: rawGp.sentenceJa || "",
                    sentenceJaUnderline: rawGp.sentenceJaUnderline || "",
                    descriptionVi: rawGp.descriptionVi || ""
                }
            };

            // Save ONLY to Master Bank (artifacts/${appId}/masterGrammarPoints)
            const res = await addMasterGrammarPoint(gpData, adminUserId);

            if (res.success) {
                importedCount++;
                importedItems.push({
                    id: res.id,
                    ...gpData,
                    textbookId: 'master',
                    lessonId: 'master',
                    textbookTitle: `Kho Ngữ Pháp (${level})`
                });
            }
        }

        return { success: true, count: importedCount, items: importedItems };
    } catch (e) {
        console.error('Import direct grammar points error:', e);
        return { success: false, error: e.message };
    }
};

// ============== MASTER GRAMMAR BANK & LESSON ASSIGNMENT ==============

export const getMasterGrammarPoints = async () => {
    try {
        const deletedSet = getDeletedGrammarIds();
        const snap = await getDocs(collection(db, masterGrammarPath()));
        const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        return list.filter(pt => !deletedSet.has(pt.id));
    } catch (e) {
        console.error('Fetch master grammar points error:', e);
        return [];
    }
};

export const addMasterGrammarPoint = async (gpData, adminUserId = 'admin') => {
    try {
        clearSharedGrammarPointsListCache();
        cachedGrammarData = null;

        // Ensure parent master_bank textbook & master_lesson docs exist so Firestore Security Rules pass
        try {
            await setDoc(doc(db, textbooksPath(), 'master_bank'), {
                title: 'Kho Ngữ Pháp Gốc',
                titleVi: 'Kho Ngữ Pháp Trung Tâm',
                levels: ['N5', 'N4', 'N3', 'N2', 'N1'],
                category: 'system'
            }, { merge: true });

            await setDoc(doc(db, lessonsPath('master_bank'), 'master_lesson'), {
                title: 'Kho Ngữ Pháp Gốc',
                sectionLabel: 'Master'
            }, { merge: true });
        } catch (err) {
            // Ignore if parent docs exist or warning
        }

        const docRef = await addDoc(collection(db, masterGrammarPath()), {
            ...gpData,
            textbookId: 'master_bank',
            lessonId: 'master_lesson',
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            createdBy: adminUserId
        });
        return { success: true, id: docRef.id };
    } catch (e) {
        console.error('Add master grammar point error:', e);
        return { success: false, error: e.message };
    }
};

export const updateMasterGrammarPoint = async (id, gpData) => {
    try {
        clearSharedGrammarPointsListCache();
        cachedGrammarData = null;
        const docRef = doc(db, masterGrammarPath(), id);
        await updateDoc(docRef, {
            ...gpData,
            updatedAt: serverTimestamp()
        });
        return { success: true };
    } catch (e) {
        console.error('Update master grammar point error:', e);
        return { success: false, error: e.message };
    }
};

export const deleteMasterGrammarPoint = async (id) => {
    try {
        clearSharedGrammarPointsListCache();
        cachedGrammarData = null;
        addDeletedGrammarIds([id]);
        await deleteDoc(doc(db, masterGrammarPath(), id));
        return { success: true };
    } catch (e) {
        console.error('Delete master grammar point error:', e);
        return { success: false, error: e.message };
    }
};

export const assignGrammarPointsToLesson = async (textbookId, lessonId, selectedGrammarPoints) => {
    try {
        clearSharedGrammarPointsListCache();
        cachedGrammarData = null;

        const grammarIds = selectedGrammarPoints.map(gp => gp.id);
        const lessonRef = doc(db, lessonsPath(textbookId), lessonId);
        await updateDoc(lessonRef, {
            grammarIds: grammarIds,
            updatedAt: serverTimestamp()
        });

        // Copy/Sync documents into grammarPointsPath for backward compatibility & instant listener triggers
        const colRef = collection(db, grammarPointsPath(textbookId, lessonId));
        for (let i = 0; i < selectedGrammarPoints.length; i++) {
            const gp = selectedGrammarPoints[i];
            const targetDocRef = doc(colRef, gp.id);
            await setDoc(targetDocRef, {
                ...gp,
                order: i,
                updatedAt: serverTimestamp()
            }, { merge: true });
        }

        return { success: true };
    } catch (e) {
        console.error('Assign grammar points error:', e);
        return { success: false, error: e.message };
    }
};

export const getSharedGrammarPointsList = async () => {
    const deletedSet = getDeletedGrammarIds();
    const allPoints = [];
    const seenIds = new Set();

    // 1. Fetch points directly from Master Grammar Bank
    try {
        const masterSnap = await getDocs(collection(db, masterGrammarPath()));
        for (const d of masterSnap.docs) {
            const mp = { id: d.id, ...d.data() };
            if (!deletedSet.has(mp.id) && !seenIds.has(mp.id)) {
                seenIds.add(mp.id);
                allPoints.push({
                    ...mp,
                    textbookId: mp.textbookId || 'master',
                    lessonId: mp.lessonId || 'master',
                    textbookTitle: mp.textbookTitle || `Kho Ngữ Pháp (${mp.level || 'N4'})`,
                    lessonTitle: mp.lessonTitle || 'Kho Ngữ Pháp Trung Tâm',
                });
            }
        }
    } catch (e) {
        console.warn("Fetch masterGrammarPoints in getSharedGrammarPointsList failed:", e);
    }

    // 2. Fetch points from CDN / Shared Textbook Data
    try {
        const data = await getSharedGrammarData();
        if (data) {
            for (const textbook of data) {
                for (const lesson of textbook.lessons || []) {
                    for (const point of lesson.points || []) {
                        if (!deletedSet.has(point.id) && !seenIds.has(point.id)) {
                            seenIds.add(point.id);
                            allPoints.push({
                                ...point,
                                textbookId: textbook.id,
                                lessonId: lesson.id,
                                textbookTitle: textbook.title || textbook.titleVi || '',
                                lessonTitle: lesson.title || '',
                            });
                        }
                    }
                }
            }
        }
    } catch (e) {
        console.warn("CDN getSharedGrammarPointsList failed:", e);
    }

    // 3. Fallback: Fetch points from Firestore textbooks subcollections if empty
    if (allPoints.length === 0) {
        try {
            const textbooksSnap = await getDocs(collection(db, textbooksPath()));
            for (const tbDoc of textbooksSnap.docs) {
                const lessonsSnap = await getDocs(collection(db, lessonsPath(tbDoc.id)));
                for (const lessonDoc of lessonsSnap.docs) {
                    const pointsSnap = await getDocs(collection(db, grammarPointsPath(tbDoc.id, lessonDoc.id)));
                    pointsSnap.docs.forEach(pDoc => {
                        if (!deletedSet.has(pDoc.id) && !seenIds.has(pDoc.id)) {
                            seenIds.add(pDoc.id);
                            allPoints.push({
                                ...pDoc.data(),
                                id: pDoc.id,
                                textbookId: tbDoc.id,
                                lessonId: lessonDoc.id,
                                textbookTitle: tbDoc.data().title || tbDoc.data().titleVi || '',
                                lessonTitle: lessonDoc.data().title || '',
                            });
                        }
                    });
                }
            }
        } catch (e) {
            console.warn("Firestore fallback getSharedGrammarPointsList failed:", e);
        }
    }

    return allPoints;
};

// ============== GRAMMAR SRS SYSTEM ==============
let cachedUserGrammarSrsData = null;
let cachedUserIdForGrammarSrs = null;
let userGrammarSrsPromise = null;
// Multi-subscriber pattern — one Firestore listener shared by all components
let grammarSrsUnsubscribe = null;
let grammarSrsListeners = new Set();

export const getCachedUserGrammarSrsData = () => cachedUserGrammarSrsData;

export const getSharedGrammarSrs = async (userId) => {
    if (!userId) return {};
    if (cachedUserIdForGrammarSrs !== userId) {
        clearUserGrammarSrsCache();
    }
    if (cachedUserIdForGrammarSrs === userId && cachedUserGrammarSrsData) {
        return cachedUserGrammarSrsData;
    }
    if (userGrammarSrsPromise) return userGrammarSrsPromise;

    userGrammarSrsPromise = (async () => {
        try {
            console.log('Fetching user Grammar SRS data from Firestore...');
            const srsSnap = await getDocs(collection(db, `artifacts/${appId}/users/${userId}/grammarSRS`));
            const srs = {};
            srsSnap.docs.forEach(d => { srs[d.id] = d.data(); });
            cachedUserGrammarSrsData = srs;
            cachedUserIdForGrammarSrs = userId;
            return cachedUserGrammarSrsData;
        } catch (e) {
            console.error('Error fetching user Grammar SRS data:', e);
            userGrammarSrsPromise = null;
            return {};
        }
    })();

    return userGrammarSrsPromise;
};

/**
 * Subscribe to real-time Grammar SRS data updates via onSnapshot.
 * Uses a multi-subscriber pattern: one shared Firestore listener, many callbacks.
 * Returns an unsubscribe function for the caller's callback only.
 */
export const subscribeGrammarSrs = (userId, callback) => {
    if (!userId) return () => {};

    // If user changed, tear down the old listener entirely
    if (cachedUserIdForGrammarSrs && cachedUserIdForGrammarSrs !== userId) {
        if (grammarSrsUnsubscribe) {
            grammarSrsUnsubscribe();
            grammarSrsUnsubscribe = null;
        }
        grammarSrsListeners.clear();
        cachedUserGrammarSrsData = null;
        cachedUserIdForGrammarSrs = null;
        userGrammarSrsPromise = null;
    }

    // Register this callback
    grammarSrsListeners.add(callback);

    // If no active Firestore listener yet, create one
    if (!grammarSrsUnsubscribe) {
        const colRef = collection(db, `artifacts/${appId}/users/${userId}/grammarSRS`);
        grammarSrsUnsubscribe = onSnapshot(colRef, (snapshot) => {
            const srs = {};
            snapshot.docs.forEach(d => { srs[d.id] = d.data(); });
            cachedUserGrammarSrsData = srs;
            cachedUserIdForGrammarSrs = userId;
            userGrammarSrsPromise = null;
            // Notify all registered subscribers
            grammarSrsListeners.forEach(cb => cb(srs));
        }, (error) => {
            console.error('Grammar SRS onSnapshot error:', error);
        });
    } else if (cachedUserGrammarSrsData) {
        // Immediately deliver cached data to the new subscriber
        callback(cachedUserGrammarSrsData);
    }

    // Return an unsubscribe function that only removes THIS callback
    return () => {
        grammarSrsListeners.delete(callback);
        // If nobody is listening anymore, tear down the Firestore connection
        if (grammarSrsListeners.size === 0 && grammarSrsUnsubscribe) {
            grammarSrsUnsubscribe();
            grammarSrsUnsubscribe = null;
            cachedUserGrammarSrsData = null;
            userGrammarSrsPromise = null;
        }
    };
};

export const updateCachedUserGrammarSrs = (userId, grammarId, newSrs) => {
    if (cachedUserIdForGrammarSrs === userId && cachedUserGrammarSrsData) {
        if (newSrs === null) {
            delete cachedUserGrammarSrsData[grammarId];
        } else {
            cachedUserGrammarSrsData[grammarId] = newSrs;
        }
    }
};

export const clearUserGrammarSrsCache = () => {
    if (grammarSrsUnsubscribe) {
        grammarSrsUnsubscribe();
        grammarSrsUnsubscribe = null;
    }
    grammarSrsListeners.clear();
    cachedUserGrammarSrsData = null;
    cachedUserIdForGrammarSrs = null;
    userGrammarSrsPromise = null;
};

