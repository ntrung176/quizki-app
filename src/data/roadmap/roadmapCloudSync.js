/**
 * Cloud Persistence for Interactive Learning Roadmap
 * Syncs completedLessons & unlockedStages to Firestore so clearing browser storage never loses roadmap progress.
 */

import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db, appId } from '../../config/firebase';
import { safeSetLocalStorage } from '../../utils/storageCleanup';

export const ROADMAP_PROGRESS_KEY = 'quizki_roadmap_progress';
const USER_ROADMAP_PREF_KEY = 'quizki_user_roadmap';

export const mergeProgressObjects = (a = {}, b = {}) => {
    const compA = a.completedLessons || {};
    const compB = b.completedLessons || {};
    const mergedCompleted = { ...compA };

    Object.entries(compB).forEach(([id, entry]) => {
        if (!entry) return;
        const prev = mergedCompleted[id];
        if (!prev) {
            mergedCompleted[id] = entry;
        } else {
            mergedCompleted[id] = {
                completed: Boolean(prev.completed || entry.completed),
                score: Math.max(Number(prev.score || 0), Number(entry.score || 0)),
                stars: Math.max(Number(prev.stars || 0), Number(entry.stars || 0)),
                completedAt: Math.max(Number(prev.completedAt || 0), Number(entry.completedAt || 0))
            };
        }
    });

    const stageSet = new Set([1, ...(a.unlockedStages || []), ...(b.unlockedStages || [])]);

    // Honor survey placement startingStage if set
    try {
        const prefRaw = typeof window !== 'undefined' ? localStorage.getItem(USER_ROADMAP_PREF_KEY) : null;
        if (prefRaw) {
            const pref = JSON.parse(prefRaw);
            const startStage = Number(pref?.startingStage || 1);
            for (let s = 1; s <= startStage && s <= 10; s++) {
                stageSet.add(s);
            }
        }
    } catch (_) {}

    return {
        completedLessons: mergedCompleted,
        unlockedStages: Array.from(stageSet).sort((x, y) => x - y),
        lastUpdated: Math.max(Number(a.lastUpdated || 0), Number(b.lastUpdated || 0), Date.now())
    };
};

export const saveProgressToFirestore = async (userId, progress) => {
    if (!userId || !db || !appId || !progress) return;
    try {
        const ref = doc(db, `artifacts/${appId}/users/${userId}/settings/roadmap`);
        await setDoc(ref, {
            completedLessons: progress.completedLessons || {},
            unlockedStages: progress.unlockedStages || [1],
            lastUpdated: Date.now()
        }, { merge: true });
    } catch (err) {
        console.warn('[roadmapCloudSync] Failed to save roadmap progress:', err?.message);
    }
};

export const hydrateRoadmapProgressFromCloud = async (userId, localProgress) => {
    if (!userId || !db || !appId) return localProgress;
    try {
        const ref = doc(db, `artifacts/${appId}/users/${userId}/settings/roadmap`);
        const snap = await getDoc(ref);
        const cloudData = snap.exists() ? snap.data() : {};
        const merged = mergeProgressObjects(localProgress, cloudData);

        safeSetLocalStorage(ROADMAP_PROGRESS_KEY, JSON.stringify(merged));

        // If local had progress or placement stage unlocks that cloud didn't have yet, push merged back
        const cloudLessonCount = Object.keys(cloudData.completedLessons || {}).length;
        const mergedLessonCount = Object.keys(merged.completedLessons || {}).length;
        const cloudStagesLen = (cloudData.unlockedStages || []).length;
        if (mergedLessonCount > cloudLessonCount || merged.unlockedStages.length > cloudStagesLen) {
            saveProgressToFirestore(userId, merged).catch(() => {});
        }

        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('quizki-roadmap-updated', { detail: { newProgress: merged } }));
        }
        return merged;
    } catch (err) {
        console.warn('[roadmapCloudSync] Hydrate warning:', err?.message);
        return localProgress;
    }
};
