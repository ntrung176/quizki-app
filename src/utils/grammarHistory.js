import { db, appId } from '../config/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

/**
 * Log a Grammar study history activity.
 * @param {string} userId - Current user authenticated ID.
 * @param {object} activity - The activity object.
 * @param {string} activity.type - 'lesson', 'review', 'save'.
 * @param {string} activity.title - Title of the activity.
 * @param {string} [activity.details] - Extra details.
 */
export const logGrammarActivity = async (userId, activity) => {
    const record = {
        id: `act_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: activity.type,
        title: activity.title,
        details: activity.details || '',
        timestamp: Date.now()
    };

    // 1. Save to LocalStorage
    try {
        const key = userId ? `grammar_study_history_${userId}` : 'grammar_study_history';
        const localHistory = JSON.parse(localStorage.getItem(key)) || [];
        // Keep last 50 activities
        const updated = [record, ...localHistory].slice(0, 50);
        localStorage.setItem(key, JSON.stringify(updated));
        
        // Dispatch custom event for UI updates
        window.dispatchEvent(new Event('grammar_history_changed'));
    } catch (e) {
        console.error('Error saving activity to localStorage:', e);
    }

    // 2. Save to Firestore if userId is available
    if (userId) {
        try {
            const docRef = doc(db, `artifacts/${appId}/users/${userId}/settings`, 'grammarHistory');
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
 * Record a Grammar point being viewed recently.
 * @param {string} userId - Current user authenticated ID.
 * @param {string} grammarId - The Grammar point ID.
 */
export const recordRecentGrammar = async (userId, grammarId) => {
    if (!grammarId) return;

    // 1. Save to LocalStorage
    try {
        const key = userId ? `grammar_recently_viewed_${userId}` : 'grammar_recently_viewed';
        const existing = JSON.parse(localStorage.getItem(key)) || [];
        const updated = [grammarId, ...existing.filter(id => id !== grammarId)].slice(0, 15);
        localStorage.setItem(key, JSON.stringify(updated));

        // Dispatch custom event for UI updates
        window.dispatchEvent(new Event('grammar_recently_viewed_changed'));
    } catch (e) {
        console.error('Error saving recently viewed Grammar to localStorage:', e);
    }

    // 2. Save to Firestore if userId is available
    if (userId) {
        try {
            const docRef = doc(db, `artifacts/${appId}/users/${userId}/settings`, 'grammarRecent');
            const docSnap = await getDoc(docRef);
            let recentList = [];
            if (docSnap.exists()) {
                recentList = docSnap.data().grammarIds || [];
            }
            const updated = [grammarId, ...recentList.filter(id => id !== grammarId)].slice(0, 15);
            await setDoc(docRef, { grammarIds: updated });
        } catch (e) {
            console.warn('Could not save recent Grammar to Firebase, using local storage only:', e.message);
        }
    }
};
