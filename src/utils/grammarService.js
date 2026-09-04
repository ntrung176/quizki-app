// grammarService.js — Firestore CRUD for Grammar module
import { doc, getDoc, updateDoc, deleteDoc, collection, addDoc, getDocs, onSnapshot, serverTimestamp, writeBatch, setDoc } from 'firebase/firestore'
import { db, appId } from '../config/firebase';
import { getCacheConfig } from './cacheConfigService';
import { cleanFirestoreData } from './firestoreHelpers';

const sanitizeGrammarPointForFirestore = (data) => {
    if (!data || typeof data !== 'object') return {};
    const copy = { ...data };
    // Remove UI-only join/breadcrumb metadata that should not be persisted in Firestore doc
    delete copy.textbook;
    delete copy.lesson;
    delete copy.textbookTitle;
    delete copy.lessonTitle;
    delete copy.docPath;
    return cleanFirestoreData(copy) || {};
};

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
            console.log('Fetching shared grammar data...');
            let data = null;

            // 1. Try Firebase Storage CDN if available
            if (cacheConfig && cacheConfig.grammarUrl) {
                try {
                    console.log('Using Firebase Storage CDN for Grammar cache');
                    const urlWithBuster = cacheConfig.grammarUrl.includes('?') 
                        ? `${cacheConfig.grammarUrl}&t=${cacheConfig.exportedAt || Date.now()}`
                        : `${cacheConfig.grammarUrl}?t=${cacheConfig.exportedAt || Date.now()}`;
                    const res = await fetch(urlWithBuster);
                    if (res && res.ok) {
                        const json = await res.json();
                        const pointCount = Array.isArray(json)
                            ? json.reduce((sum, tb) => sum + (tb.lessons || []).reduce((lSum, ls) => lSum + (ls.points?.length || ls.grammarPoints?.length || 0), 0) + (tb.grammarPoints?.length || 0), 0)
                            : 0;
                        if (pointCount >= 1000) {
                            data = json;
                        } else {
                            console.warn(`CDN grammar_data only has ${pointCount} points (< 1000), falling back to local bundle.`);
                        }
                    }
                } catch (cdnErr) {
                    console.warn('CDN grammar fetch failed, falling back to local bundle:', cdnErr);
                }
            }

            // 2. Fallback to local bundle files /data/grammar_data.json (contains all 4,290 points)
            if (!data) {
                try {
                    console.log('Falling back to local bundle files for Grammar cache (/data/grammar_data.json)');
                    const dataRes = await fetch('/data/grammar_data.json');
                    if (dataRes && dataRes.ok) {
                        data = await dataRes.json();
                    }
                } catch (localErr) {
                    console.warn('Local bundle grammar fetch failed:', localErr);
                }
            }

            if (!data) throw new Error('No grammar data available from CDN or local bundle');

            cachedGrammarData = data;
            lastLoadedExportedAt = currentExport || null;
            const editedMap = getEditedGrammarMap();
            if (Object.keys(editedMap).length > 0 && Array.isArray(cachedGrammarData)) {
                cachedGrammarData.forEach(textbook => {
                    (textbook.lessons || []).forEach(lesson => {
                        if (lesson.points) {
                            lesson.points = lesson.points.map(p => editedMap[p.id] ? { ...p, ...editedMap[p.id] } : p);
                        }
                        if (lesson.grammarPoints) {
                            lesson.grammarPoints = lesson.grammarPoints.map(p => editedMap[p.id] ? { ...p, ...editedMap[p.id] } : p);
                        }
                    });
                    if (textbook.grammarPoints) {
                        textbook.grammarPoints = textbook.grammarPoints.map(p => editedMap[p.id] ? { ...p, ...editedMap[p.id] } : p);
                    }
                });
            }
            return cachedGrammarData;
        } catch (e) {
            console.log('Grammar load failed, falling back to Firestore: ' + e.message);
            return null;
        }
    })();

    return grammarPromise;
};

// ============== TEXTBOOKS ==============

export const subscribeTextbooks = (callback, isAdmin = false) => {
    // Try CDN / local bundle first
    (async () => {
        try {
            const data = await getSharedGrammarData();
            if (data && data.length > 0) {
                if (!textbooksCache || textbooksCache.length === 0) {
                    callback(data);
                }
            }
        } catch (e) {
            console.warn('CDN subscribeTextbooks failed:', e);
        }
    })();

    // Return cached textbooks immediately if available (instant page transition)
    if (textbooksCache && textbooksCache.length > 0) {
        callback(textbooksCache);
    }

    textbooksListeners.add(callback);

    if (!textbooksUnsub) {
        const colRef = collection(db, textbooksPath());
        textbooksUnsub = onSnapshot(colRef, async (snapshot) => {
            const items = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
            items.sort((a, b) => (a.order || 0) - (b.order || 0));
            
            const cdnData = await getSharedGrammarData().catch(() => null);
            let finalItems = items;
            if ((!items || items.length === 0 || (items.length === 1 && items[0].id === 'master_bank')) && cdnData && cdnData.length > 0) {
                finalItems = cdnData;
            } else if (items.length > 0 && cdnData && cdnData.length > 0) {
                const seen = new Set(items.map(i => i.id));
                const extras = cdnData.filter(tb => !seen.has(tb.id));
                finalItems = [...items, ...extras];
            }

            textbooksCache = finalItems;
            textbooksListeners.forEach(cb => cb(finalItems));
        }, async (err) => {
            console.error('Subscribe textbooks error, using CDN fallback:', err);
            const cdnData = await getSharedGrammarData().catch(() => null);
            textbooksListeners.forEach(cb => cb(cdnData || []));
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
        const cleaned = cleanFirestoreData(data) || {};
        const docRef = await addDoc(colRef, {
            ...cleaned,
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
        const cleaned = cleanFirestoreData(data) || {};
        await updateDoc(doc(db, textbooksPath(), textbookId), { ...cleaned, updatedAt: serverTimestamp() });
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

    // Try CDN / local bundle first
    (async () => {
        try {
            const data = await getSharedGrammarData();
            if (data) {
                const tb = data.find(t => t.id === textbookId);
                if (tb && tb.lessons?.length > 0) {
                    if (!lessonsCache[textbookId] || lessonsCache[textbookId].length === 0) {
                        callback(tb.lessons);
                    }
                }
            }
        } catch (e) {
            console.warn('CDN subscribeLessons failed:', e);
        }
    })();

    // Return cached lessons immediately if available (instant page transition)
    if (lessonsCache[textbookId] && lessonsCache[textbookId].length > 0) {
        callback(lessonsCache[textbookId]);
    }

    if (!lessonsListeners[textbookId]) {
        lessonsListeners[textbookId] = new Set();
    }
    lessonsListeners[textbookId].add(callback);

    if (!lessonsUnsubs[textbookId]) {
        const colRef = collection(db, lessonsPath(textbookId));
        lessonsUnsubs[textbookId] = onSnapshot(colRef, async (snapshot) => {
            const items = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
            items.sort((a, b) => (a.order || 0) - (b.order || 0));
            
            let finalItems = items;
            if ((!items || items.length === 0) && textbookId) {
                const cdnData = await getSharedGrammarData().catch(() => null);
                const tb = cdnData?.find(t => t.id === textbookId);
                if (tb && tb.lessons?.length > 0) {
                    finalItems = tb.lessons;
                }
            }

            lessonsCache[textbookId] = finalItems;
            if (lessonsListeners[textbookId]) {
                lessonsListeners[textbookId].forEach(cb => cb(finalItems));
            }
        }, async (err) => {
            console.error('Subscribe lessons error, using CDN fallback:', err);
            const cdnData = await getSharedGrammarData().catch(() => null);
            const tb = cdnData?.find(t => t.id === textbookId);
            if (lessonsListeners[textbookId]) {
                lessonsListeners[textbookId].forEach(cb => cb(tb?.lessons || []));
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
        const cleaned = cleanFirestoreData(data) || {};
        const docRef = await addDoc(colRef, {
            ...cleaned,
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
        const cleaned = cleanFirestoreData(data) || {};
        await updateDoc(doc(db, lessonsPath(textbookId), lessonId), { ...cleaned, updatedAt: serverTimestamp() });
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

    // Try CDN / local bundle first
    (async () => {
        try {
            const data = await getSharedGrammarData();
            if (data) {
                const tb = data.find(t => t.id === textbookId);
                if (tb) {
                    const ls = (tb.lessons || []).find(l => l.id === lessonId);
                    if (ls && ls.points?.length > 0) {
                        const editedMap = getEditedGrammarMap();
                        const deletedSet = getDeletedGrammarIds();
                        const points = sortGrammarPointsByCreationTime(
                            (ls.points || [])
                                .map(p => editedMap[p.id] ? { ...p, ...editedMap[p.id] } : p)
                                .filter(p => !deletedSet.has(p.id))
                        );
                        if (!pointsCache[key] || pointsCache[key].length === 0) {
                            callback(points);
                        }
                    }
                }
            }
        } catch (e) {
            console.warn('CDN subscribeGrammarPoints failed:', e);
        }
    })();

    // Return cached points immediately if available (instant page transition)
    if (pointsCache[key] && pointsCache[key].length > 0) {
        callback(pointsCache[key]);
    }

    if (!pointsListeners[key]) {
        pointsListeners[key] = new Set();
    }
    pointsListeners[key].add(callback);

    if (!pointsUnsubs[key]) {
        const colRef = collection(db, grammarPointsPath(textbookId, lessonId));
        pointsUnsubs[key] = onSnapshot(colRef, async (snapshot) => {
            const deletedSet = getDeletedGrammarIds();
            const editedMap = getEditedGrammarMap();
            let items = snapshot.docs
                .map(d => {
                    const itemData = { id: d.id, ...d.data() };
                    return editedMap[d.id] ? { ...itemData, ...editedMap[d.id] } : itemData;
                })
                .filter(pt => !deletedSet.has(pt.id));

            if ((!items || items.length === 0) && textbookId && lessonId) {
                const cdnData = await getSharedGrammarData().catch(() => null);
                const tb = cdnData?.find(t => t.id === textbookId);
                const ls = tb?.lessons?.find(l => l.id === lessonId);
                if (ls && ls.points?.length > 0) {
                    items = (ls.points || [])
                        .map(p => editedMap[p.id] ? { ...p, ...editedMap[p.id] } : p)
                        .filter(p => !deletedSet.has(p.id));
                }
            }

            const sortedItems = sortGrammarPointsByCreationTime(items);
            pointsCache[key] = sortedItems;
            if (pointsListeners[key]) {
                pointsListeners[key].forEach(cb => cb(sortedItems));
            }
        }, async (err) => {
            console.error('Subscribe grammar points error, using CDN fallback:', err);
            const cdnData = await getSharedGrammarData().catch(() => null);
            const tb = cdnData?.find(t => t.id === textbookId);
            const ls = tb?.lessons?.find(l => l.id === lessonId);
            const fallbackPoints = sortGrammarPointsByCreationTime(ls?.points || []);
            if (pointsListeners[key]) {
                pointsListeners[key].forEach(cb => cb(fallbackPoints));
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
        const cleanPayload = sanitizeGrammarPointForFirestore(data);
        const docRef = await addDoc(colRef, {
            ...cleanPayload,
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

const EDITED_GRAMMAR_KEY = 'quizki_edited_grammar_points';

export const getEditedGrammarMap = () => {
    try {
        const stored = localStorage.getItem(EDITED_GRAMMAR_KEY);
        return stored ? JSON.parse(stored) : {};
    } catch (e) {
        return {};
    }
};

export const updateEditedGrammarLocalCache = (pointId, data) => {
    try {
        const currentMap = getEditedGrammarMap();
        currentMap[pointId] = {
            ...(currentMap[pointId] || {}),
            ...data,
            id: pointId,
            updatedAt: Date.now()
        };
        localStorage.setItem(EDITED_GRAMMAR_KEY, JSON.stringify(currentMap));
    } catch (e) {
        console.error('Error saving edited grammar local cache:', e);
    }
};

export const clearEditedGrammarLocalCache = () => {
    try {
        localStorage.removeItem(EDITED_GRAMMAR_KEY);
    } catch (_) {}
};

export const updateGrammarPoint = async (textbookId, lessonId, grammarId, data) => {
    try {
        clearSharedGrammarPointsListCache();
        const updatedDoc = { ...data, id: grammarId, textbookId, lessonId, updatedAt: Date.now() };
        updateEditedGrammarLocalCache(grammarId, updatedDoc);

        const cleanPayload = sanitizeGrammarPointForFirestore(data);

        const promises = [];
        if (textbookId && lessonId && textbookId !== 'master_bank' && textbookId !== 'master') {
            promises.push(setDoc(doc(db, grammarPointsPath(textbookId, lessonId), grammarId), { ...cleanPayload, updatedAt: serverTimestamp() }, { merge: true }));
        }
        promises.push(setDoc(doc(db, masterGrammarPath(), grammarId), { ...cleanPayload, updatedAt: serverTimestamp() }, { merge: true }));

        await Promise.all(promises);
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
    const editedMap = getEditedGrammarMap();
    const localEdited = editedMap[grammarId];

    // 1. Try CDN / local bundle first (has canonical Mazii structure, connection, furigana)
    let cdnFound = null;
    try {
        const data = await getSharedGrammarData();
        if (data && Array.isArray(data)) {
            for (const textbook of data) {
                if (textbookId && textbook.id !== textbookId) continue;
                for (const lesson of textbook.lessons || []) {
                    if (lessonId && lesson.id !== lessonId) continue;
                    const found = (lesson.points || []).find(pt => pt.id === grammarId);
                    if (found) {
                        cdnFound = {
                            ...found,
                            textbookId: textbook.id,
                            lessonId: lesson.id,
                            textbook: { id: textbook.id, title: textbook.title, titleVi: textbook.titleVi, levels: textbook.levels, category: textbook.category, color: textbook.color },
                            lesson: { id: lesson.id, title: lesson.title, meaning: lesson.meaning, sectionLabel: lesson.sectionLabel, isPremium: lesson.isPremium }
                        };
                        break;
                    }
                }
                if (cdnFound) break;
            }
        }
    } catch (err) {
        console.warn("CDN lookup for grammar point failed:", err);
    }

    // 2. Try Master Bank query from Firestore & merge
    try {
        const masterRef = doc(db, masterGrammarPath(), grammarId);
        const masterSnap = await getDoc(masterRef);
        if (masterSnap.exists()) {
            const data = masterSnap.data();
            const baseData = cdnFound ? { ...cdnFound, ...data } : data;
            // Preserve clean connection & structureRaw from canonical data if Firestore lacks them
            if ((!baseData.connection || baseData.connection.length === 0) && cdnFound?.connection) {
                baseData.connection = cdnFound.connection;
            }
            if (!baseData.structureRaw && cdnFound?.structureRaw) {
                baseData.structureRaw = cdnFound.structureRaw;
            }
            if ((!baseData.structure || baseData.structure.length === 0) && cdnFound?.structure) {
                baseData.structure = cdnFound.structure;
            }
            const merged = localEdited ? { ...baseData, ...localEdited } : baseData;
            return {
                ...merged,
                id: masterSnap.id,
                textbookId: textbookId || cdnFound?.textbookId || 'master',
                lessonId: lessonId || cdnFound?.lessonId || 'master',
                textbook: cdnFound?.textbook || { id: 'master', title: `Kho Ngữ Pháp (${merged.level || 'N4'})`, titleVi: `Kho Ngữ Pháp (${merged.level || 'N4'})` },
                lesson: cdnFound?.lesson || { id: 'master', title: 'Kho Ngữ Pháp Trung Tâm', meaning: 'Kho Ngữ Pháp Gốc' }
            };
        }
    } catch (e) {
        console.warn("Master bank fetch for grammar point failed:", e);
    }

    if (cdnFound) {
        return localEdited ? { ...cdnFound, ...localEdited } : cdnFound;
    }

    // 3. Try in-memory SWR pointsCache
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

export const sortGrammarPointsByCreationTime = (points) => {
    if (!Array.isArray(points)) return [];
    return [...points].sort((a, b) => {
        const getTimestamp = (pt) => {
            if (!pt) return 0;
            if (pt.createdAt) {
                if (typeof pt.createdAt === 'number') return pt.createdAt;
                if (typeof pt.createdAt === 'string') {
                    const t = Date.parse(pt.createdAt);
                    if (!isNaN(t)) return t;
                }
                if (typeof pt.createdAt.toMillis === 'function') return pt.createdAt.toMillis();
                if (pt.createdAt.seconds) return pt.createdAt.seconds * 1000;
            }
            if (pt.updatedAt) {
                if (typeof pt.updatedAt === 'number') return pt.updatedAt;
                if (typeof pt.updatedAt.toMillis === 'function') return pt.updatedAt.toMillis();
                if (pt.updatedAt.seconds) return pt.updatedAt.seconds * 1000;
            }
            if (typeof pt.order === 'number') return pt.order;
            return 0;
        };

        const timeA = getTimestamp(a);
        const timeB = getTimestamp(b);
        if (timeA !== timeB) return timeA - timeB;
        return (a.order || 0) - (b.order || 0);
    });
};

export const getMasterGrammarPoints = async () => {
    try {
        const deletedSet = getDeletedGrammarIds();
        const snap = await getDocs(collection(db, masterGrammarPath()));
        let list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        
        if (list.length === 0) {
            const cdnData = await getSharedGrammarData().catch(() => null);
            if (cdnData) {
                const seen = new Set();
                for (const tb of cdnData) {
                    for (const ls of tb.lessons || []) {
                        for (const pt of ls.points || []) {
                            if (pt?.id && !seen.has(pt.id)) {
                                seen.add(pt.id);
                                list.push(pt);
                            }
                        }
                    }
                }
            }
        }

        const filtered = list.filter(pt => !deletedSet.has(pt.id));
        return sortGrammarPointsByCreationTime(filtered);
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

        const cleanPayload = sanitizeGrammarPointForFirestore(gpData);
        const docRef = await addDoc(collection(db, masterGrammarPath()), {
            ...cleanPayload,
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
        const cleanPayload = sanitizeGrammarPointForFirestore(gpData);
        const docRef = doc(db, masterGrammarPath(), id);
        await updateDoc(docRef, {
            ...cleanPayload,
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
            const cleanPayload = sanitizeGrammarPointForFirestore(gp);
            await setDoc(targetDocRef, {
                ...cleanPayload,
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

    // 4. Merge locally edited grammar points (persisted across F5 refreshes before CDN sync)
    const editedMap = getEditedGrammarMap();
    if (Object.keys(editedMap).length > 0) {
        for (let i = 0; i < allPoints.length; i++) {
            const p = allPoints[i];
            if (editedMap[p.id]) {
                allPoints[i] = {
                    ...p,
                    ...editedMap[p.id]
                };
            }
        }
    }

    return sortGrammarPointsByCreationTime(allPoints);
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

