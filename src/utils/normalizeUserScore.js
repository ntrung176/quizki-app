import { collection, getDocs, doc, setDoc, query, serverTimestamp } from 'firebase/firestore';
import { db, appId } from '../config/firebase';

/**
 * Normalizes all user scores on the leaderboard by setting Score = XP directly into Firestore database.
 */
export const normalizeAllUserScores = async () => {
    if (!db || !appId) {
        throw new Error('Firebase DB instance not initialized');
    }

    const publicStatsPath = `artifacts/${appId}/public/data/userStats`;
    const q = query(collection(db, publicStatsPath));
    const snap = await getDocs(q);

    let updatedCount = 0;
    let alreadyCorrectCount = 0;
    let errorCount = 0;

    for (const userDoc of snap.docs) {
        try {
            const data = userDoc.data();
            const xp = Number(data.xp || 0);
            const targetScore = Math.round(xp);

            // 1. Update publicStats document with fixed Score = XP
            await setDoc(doc(db, publicStatsPath, userDoc.id), {
                score: targetScore,
                lastUpdated: serverTimestamp()
            }, { merge: true });

            // 2. Update user profile document with fixed Score = XP
            try {
                const profileRef = doc(db, `artifacts/${appId}/users/${userDoc.id}/settings/profile`);
                await setDoc(profileRef, { score: targetScore }, { merge: true });
            } catch (pErr) {
                // Profile update permission error for non-owned docs is safe to ignore
            }

            if (data.score !== targetScore) {
                updatedCount++;
            } else {
                alreadyCorrectCount++;
            }
        } catch (err) {
            console.error(`Error normalizing score for user ${userDoc.id}:`, err);
            errorCount++;
        }
    }

    return {
        total: snap.docs.length,
        updatedCount,
        alreadyCorrectCount,
        errorCount
    };
};
