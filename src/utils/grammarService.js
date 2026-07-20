// grammarService.js — Firestore CRUD for Grammar module
import { doc, getDoc, updateDoc, deleteDoc, collection, addDoc, getDocs, onSnapshot, serverTimestamp, writeBatch } from 'firebase/firestore'
import { db, appId } from '../config/firebase';
import { getCacheConfig } from './cacheConfigService';

// ============== PATHS ==============
const textbooksPath = () => `artifacts/${appId}/grammarTextbooks`;
const lessonsPath = (textbookId) => `artifacts/${appId}/grammarTextbooks/${textbookId}/lessons`;
const grammarPointsPath = (textbookId, lessonId) => `artifacts/${appId}/grammarTextbooks/${textbookId}/lessons/${lessonId}/points`;

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

export const getSharedGrammarData = async () => {
    const cacheConfig = await getCacheConfig();
    const currentExport = cacheConfig?.exportedAt || 0;
    const needsRefresh = currentExport && lastLoadedExportedAt && currentExport > lastLoadedExportedAt;

    if (needsRefresh) {
        cachedGrammarData = null;
        grammarPromise = null;
        clearSharedGrammarPointsListCache();
    }

    if (cachedGrammarData && !needsRefresh) return cachedGrammarData;
    if (grammarPromise && !needsRefresh) return grammarPromise;

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
            lastLoadedExportedAt = currentExport || Date.now();
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
            const items = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
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

export const deleteGrammarPoint = async (textbookId, lessonId, grammarId) => {
    try {
        clearSharedGrammarPointsListCache();
        await deleteDoc(doc(db, grammarPointsPath(textbookId, lessonId), grammarId));
        return true;
    } catch (e) {
        console.error('Delete grammar point error:', e);
        return false;
    }
};

// ============== FETCH SINGLE GRAMMAR POINT (for detail/practice) ==============

export const fetchGrammarPointById = async (grammarId, textbookId, lessonId) => {
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
                const lines = raw.split('\n').filter(Boolean);
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

export const getSharedGrammarPointsList = async () => {
    try {
        const data = await getSharedGrammarData();
        const allPoints = [];
        if (data) {
            for (const textbook of data) {
                for (const lesson of textbook.lessons || []) {
                    for (const point of lesson.points || []) {
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
            return allPoints;
        }
    } catch (e) {
        console.warn("CDN getSharedGrammarPointsList failed:", e);
    }
    
    // Firestore fallback
    if (cachedSharedGrammarPointsList) return cachedSharedGrammarPointsList;
    if (grammarPointsListPromise) return grammarPointsListPromise;

    grammarPointsListPromise = (async () => {
        try {
            console.log("Fetching shared grammar list from Firestore fallback (slow query)...");
            const allPoints = [];
            const textbooksSnap = await getDocs(collection(db, textbooksPath()));
            for (const tbDoc of textbooksSnap.docs) {
                const lessonsSnap = await getDocs(collection(db, lessonsPath(tbDoc.id)));
                for (const lessonDoc of lessonsSnap.docs) {
                    const pointsSnap = await getDocs(collection(db, grammarPointsPath(tbDoc.id, lessonDoc.id)));
                    pointsSnap.docs.forEach(pDoc => {
                        allPoints.push({
                            id: pDoc.id,
                            ...pDoc.data(),
                            textbookId: tbDoc.id,
                            lessonId: lessonDoc.id,
                            textbookTitle: tbDoc.data().title || tbDoc.data().titleVi || '',
                            lessonTitle: lessonDoc.data().title || '',
                        });
                    });
                }
            }
            cachedSharedGrammarPointsList = allPoints;
            return cachedSharedGrammarPointsList;
        } catch (e) {
            console.error("Firestore fallback getSharedGrammarPointsList failed:", e);
            grammarPointsListPromise = null;
            return [];
        }
    })();

    return grammarPointsListPromise;
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

