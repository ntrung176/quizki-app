import { db, appId } from '../config/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

/**
 * Log a Kanji study history activity.
 * @param {string} userId - Current user authenticated ID.
 * @param {object} activity - The activity object.
 * @param {string} activity.type - 'lesson', 'review', 'save'.
 * @param {string} activity.title - Title of the activity.
 * @param {string} [activity.details] - Extra details.
 */
export const logKanjiActivity = async (userId, activity) => {
    const record = {
        id: `act_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: activity.type,
        title: activity.title,
        details: activity.details || '',
        timestamp: Date.now()
    };

    // 1. Save to LocalStorage
    try {
        const key = userId ? `kanji_study_history_${userId}` : 'kanji_study_history';
        const localHistory = JSON.parse(localStorage.getItem(key)) || [];
        // Keep last 50 activities
        const updated = [record, ...localHistory].slice(0, 50);
        localStorage.setItem(key, JSON.stringify(updated));
        
        // Dispatch custom event for UI updates
        window.dispatchEvent(new Event('kanji_history_changed'));
    } catch (e) {
        console.error('Error saving activity to localStorage:', e);
    }

    // 2. Save to Firestore if userId is available
    if (userId) {
        try {
            const docRef = doc(db, `artifacts/${appId}/users/${userId}/settings`, 'kanjiHistory');
            const docSnap = await getDoc(docRef);
            let historyList = [];
            if (docSnap.exists()) {
                historyList = docSnap.data().activities || [];
            }
            const updated = [record, ...historyList].slice(0, 50);
            await setDoc(docRef, { activities: updated });
        } catch (e) {
            console.warn('Could not save activity to Firebase, using local storage only:', e.message);
        }
    }
};

/**
 * Record a Kanji character being viewed recently.
 * @param {string} userId - Current user authenticated ID.
 * @param {string} character - The Kanji character.
 */
export const recordRecentKanji = async (userId, character) => {
    if (!character) return;

    // 1. Save to LocalStorage
    try {
        const key = userId ? `kanji_recently_viewed_${userId}` : 'kanji_recently_viewed';
        const existing = JSON.parse(localStorage.getItem(key)) || [];
        const updated = [character, ...existing.filter(c => c !== character)].slice(0, 15);
        localStorage.setItem(key, JSON.stringify(updated));

        // Dispatch custom event for UI updates
        window.dispatchEvent(new Event('kanji_recently_viewed_changed'));
    } catch (e) {
        console.error('Error saving recently viewed Kanji to localStorage:', e);
    }

    // 2. Save to Firestore if userId is available
    if (userId) {
        try {
            const docRef = doc(db, `artifacts/${appId}/users/${userId}/settings`, 'kanjiRecent');
            const docSnap = await getDoc(docRef);
            let recentList = [];
            if (docSnap.exists()) {
                recentList = docSnap.data().characters || [];
            }
            const updated = [character, ...recentList.filter(c => c !== character)].slice(0, 15);
            await setDoc(docRef, { characters: updated });
        } catch (e) {
            console.warn('Could not save recent Kanji to Firebase, using local storage only:', e.message);
        }
    }
};
