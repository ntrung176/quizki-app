// grammarService.js — Firestore CRUD for Grammar module
import { doc, getDoc, updateDoc, deleteDoc, collection, addDoc, getDocs, onSnapshot, serverTimestamp, writeBatch } from 'firebase/firestore'
import { db, appId } from '../config/firebase';

// ============== PATHS ==============
const textbooksPath = () => `artifacts/${appId}/grammarTextbooks`;
const lessonsPath = (textbookId) => `artifacts/${appId}/grammarTextbooks/${textbookId}/lessons`;
const grammarPointsPath = (textbookId, lessonId) => `artifacts/${appId}/grammarTextbooks/${textbookId}/lessons/${lessonId}/points`;

// ============== TEXTBOOKS ==============

export const subscribeTextbooks = (callback) => {
    try {
        const colRef = collection(db, textbooksPath());
        return onSnapshot(colRef, (snapshot) => {
            const items = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
            items.sort((a, b) => (a.order || 0) - (b.order || 0));
            callback(items);
        }, () => callback([]));
    } catch (e) {
        console.error('Subscribe textbooks error:', e);
        callback([]);
        return () => {};
    }
};

export const addTextbook = async (data, adminUserId) => {
    try {
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
        await updateDoc(doc(db, textbooksPath(), textbookId), { ...data, updatedAt: serverTimestamp() });
        return true;
    } catch (e) {
        console.error('Update textbook error:', e);
        return false;
    }
};

export const deleteTextbook = async (textbookId) => {
    try {
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

export const subscribeLessons = (textbookId, callback) => {
    try {
        const colRef = collection(db, lessonsPath(textbookId));
        return onSnapshot(colRef, (snapshot) => {
            const items = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
            items.sort((a, b) => (a.order || 0) - (b.order || 0));
            callback(items);
        }, () => callback([]));
    } catch (e) {
        console.error('Subscribe lessons error:', e);
        callback([]);
        return () => {};
    }
};

export const addLesson = async (textbookId, data, adminUserId) => {
    try {
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
        await updateDoc(doc(db, lessonsPath(textbookId), lessonId), { ...data, updatedAt: serverTimestamp() });
        return true;
    } catch (e) {
        console.error('Update lesson error:', e);
        return false;
    }
};

export const deleteLesson = async (textbookId, lessonId) => {
    try {
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

export const subscribeGrammarPoints = (textbookId, lessonId, callback) => {
    try {
        const colRef = collection(db, grammarPointsPath(textbookId, lessonId));
        return onSnapshot(colRef, (snapshot) => {
            const items = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
            items.sort((a, b) => (a.order || 0) - (b.order || 0));
            callback(items);
        }, () => callback([]));
    } catch (e) {
        console.error('Subscribe grammar points error:', e);
        callback([]);
        return () => {};
    }
};

export const addGrammarPoint = async (textbookId, lessonId, data, adminUserId) => {
    try {
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
        await updateDoc(doc(db, grammarPointsPath(textbookId, lessonId), grammarId), { ...data, updatedAt: serverTimestamp() });
        return true;
    } catch (e) {
        console.error('Update grammar point error:', e);
        return false;
    }
};

export const deleteGrammarPoint = async (textbookId, lessonId, grammarId) => {
    try {
        await deleteDoc(doc(db, grammarPointsPath(textbookId, lessonId), grammarId));
        return true;
    } catch (e) {
        console.error('Delete grammar point error:', e);
        return false;
    }
};

// ============== FETCH SINGLE GRAMMAR POINT (for detail/practice) ==============

export const fetchGrammarPointById = async (grammarId) => {
    // We need to search across all textbooks/lessons since grammarId is flat
    // This uses collectionGroup which requires a composite index, so instead
    // we store textbookId + lessonId on every grammar point doc for easy lookup
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
                meaning: lesson.meaning || ''
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
                meaningFull: gp.meaningFull || '',
                structure: Array.isArray(gp.structure) ? gp.structure : parseStructure(gp.structureRaw || gp.structure || ''),
                tips: Array.isArray(gp.tips) ? gp.tips : parseTips(gp.tipsRaw || gp.tips || ''),
                examples: Array.isArray(gp.examples) ? gp.examples : parseExamples(gp.examplesRaw || gp.examples || ''),
                exercises: Array.isArray(gp.exercises) ? gp.exercises : parseExercises(gp.exercisesRaw || gp.exercises || ''),
                quizzes: Array.isArray(gp.quizzes) ? gp.quizzes : []
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

