import { db, appId } from '../config/firebase';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';

const MODES = ['flashcard', 'study', 'meaning_input', 'dictation', 'example', 'synonym'];

/**
 * Gets the firestore document reference for a user's study progress on a specific study set.
 */
const getProgressDocRef = (userId, setId) => {
    return doc(db, `artifacts/${appId}/users/${userId}/studyProgress`, setId);
};

/**
 * Save study progress to both LocalStorage and Firestore
 */
export const saveStudyProgress = async (userId, setId, mode, progressData) => {
    const key = `study_progress_${setId}_${mode}`;
    const completedKey = `study_completed_${setId}_${mode}`;
    
    // 1. Save to LocalStorage
    localStorage.setItem(key, JSON.stringify(progressData));
    localStorage.setItem(completedKey, 'false');

    // 2. Save to Firestore if user is authenticated
    if (!userId) return;
    try {
        const docRef = getProgressDocRef(userId, setId);
        const dataToUpdate = {
            [`${mode}_progress`]: JSON.stringify(progressData),
            [`${mode}_completed`]: false,
            [`${mode}_updatedAt`]: Date.now()
        };
        await setDoc(docRef, dataToUpdate, { merge: true });
    } catch (error) {
        console.error(`Error saving study progress for ${mode} to DB:`, error);
    }
};

/**
 * Save study completion to both LocalStorage and Firestore
 */
export const saveStudyCompletion = async (userId, setId, mode) => {
    const key = `study_progress_${setId}_${mode}`;
    const completedKey = `study_completed_${setId}_${mode}`;

    // 1. Update LocalStorage
    localStorage.removeItem(key);
    localStorage.setItem(completedKey, 'true');

    // 2. Save to Firestore if user is authenticated
    if (!userId) return;
    try {
        const docRef = getProgressDocRef(userId, setId);
        const dataToUpdate = {
            [`${mode}_progress`]: null,
            [`${mode}_completed`]: true,
            [`${mode}_updatedAt`]: Date.now()
        };
        await setDoc(docRef, dataToUpdate, { merge: true });
    } catch (error) {
        console.error(`Error saving study completion for ${mode} to DB:`, error);
    }
};

/**
 * Reset study progress (delete/restart) in both LocalStorage and Firestore
 */
export const resetStudyProgress = async (userId, setId, mode) => {
    const key = `study_progress_${setId}_${mode}`;
    const completedKey = `study_completed_${setId}_${mode}`;

    // 1. Update LocalStorage
    localStorage.removeItem(key);
    localStorage.removeItem(completedKey);

    // 2. Save to Firestore if user is authenticated
    if (!userId) return;
    try {
        const docRef = getProgressDocRef(userId, setId);
        const dataToUpdate = {
            [`${mode}_progress`]: null,
            [`${mode}_completed`]: false,
            [`${mode}_updatedAt`]: Date.now()
        };
        await setDoc(docRef, dataToUpdate, { merge: true });
    } catch (error) {
        console.error(`Error resetting study progress for ${mode} in DB:`, error);
    }
};

/**
 * Synchronize study progress between LocalStorage and Firestore (Two-way sync)
 * Returns the resolved status states for the UI.
 */
export const syncStudyProgress = async (userId, setId) => {
    const resolvedStates = {
        completed: {
            flashcard: false,
            study: false,
            meaning_input: false,
            dictation: false,
            example: false,
            synonym: false
        },
        progress: {
            flashcard: false,
            study: false,
            meaning_input: false,
            dictation: false,
            example: false,
            synonym: false
        }
    };

    // Helper to read current local state
    const getLocalState = () => {
        const local = {};
        MODES.forEach(mode => {
            const completed = localStorage.getItem(`study_completed_${setId}_${mode}`) === 'true';
            const progressStr = localStorage.getItem(`study_progress_${setId}_${mode}`);
            let progressObj = null;
            if (progressStr) {
                try {
                    progressObj = JSON.parse(progressStr);
                } catch (e) { /* ignore */ }
            }
            local[mode] = {
                completed,
                progressStr,
                timestamp: progressObj?.timestamp || 0
            };
        });
        return local;
    };

    const localState = getLocalState();

    if (!userId) {
        // If not logged in, just return what we have in LocalStorage
        MODES.forEach(mode => {
            resolvedStates.completed[mode] = localState[mode].completed;
            resolvedStates.progress[mode] = !!localState[mode].progressStr;
        });
        return resolvedStates;
    }

    try {
        const docRef = getProgressDocRef(userId, setId);
        const docSnap = await getDoc(docRef);
        
        let dbData = {};
        let needsUpload = false;
        const uploadPayload = {};

        if (docSnap.exists()) {
            dbData = docSnap.data();
        }

        MODES.forEach(mode => {
            const dbCompleted = dbData[`${mode}_completed`] === true;
            const dbProgressStr = dbData[`${mode}_progress`] || null;
            const dbUpdatedAt = dbData[`${mode}_updatedAt`] || 0;

            const localCompleted = localState[mode].completed;
            const localProgressStr = localState[mode].progressStr;
            const localTimestamp = localState[mode].timestamp;

            // Determine if DB or Local is newer
            // If DB has data and is newer or equal to local
            const dbHasData = dbCompleted || dbProgressStr !== null;
            const localHasData = localCompleted || localProgressStr !== null;
            
            if (dbHasData && (!localHasData || dbUpdatedAt >= localTimestamp)) {
                // DB wins, update local storage
                if (dbCompleted) {
                    localStorage.setItem(`study_completed_${setId}_${mode}`, 'true');
                    localStorage.removeItem(`study_progress_${setId}_${mode}`);
                } else {
                    localStorage.setItem(`study_completed_${setId}_${mode}`, 'false');
                    localStorage.setItem(`study_progress_${setId}_${mode}`, dbProgressStr);
                }
                resolvedStates.completed[mode] = dbCompleted;
                resolvedStates.progress[mode] = dbProgressStr !== null;
            } else if (localHasData) {
                // Local wins, prepare upload payload to update DB
                needsUpload = true;
                uploadPayload[`${mode}_completed`] = localCompleted;
                uploadPayload[`${mode}_progress`] = localProgressStr;
                uploadPayload[`${mode}_updatedAt`] = localTimestamp || Date.now();

                resolvedStates.completed[mode] = localCompleted;
                resolvedStates.progress[mode] = localProgressStr !== null;
            } else {
                // Neither has data
                resolvedStates.completed[mode] = false;
                resolvedStates.progress[mode] = false;
            }
        });

        if (needsUpload) {
            await setDoc(docRef, uploadPayload, { merge: true });
        }
    } catch (error) {
        console.error('Error syncing study progress with Firestore:', error);
        // Fallback to local storage on error
        MODES.forEach(mode => {
            resolvedStates.completed[mode] = localState[mode].completed;
            resolvedStates.progress[mode] = !!localState[mode].progressStr;
        });
    }

    return resolvedStates;
};
