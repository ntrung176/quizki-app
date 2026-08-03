import { collection, getDocs, doc, setDoc, getDoc, query, serverTimestamp } from 'firebase/firestore';
import { db, appId } from '../config/firebase';

/**
 * Normalizes all user scores on the leaderboard by setting Score = XP directly into Firestore database.
 * Safely inspects both public userStats and user profile documents to prevent wiping XP/Level to 0.
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
            const profileRef = doc(db, `artifacts/${appId}/users/${userDoc.id}/settings/profile`);
            
            let profileData = null;
            try {
                const profileSnap = await getDoc(profileRef);
                if (profileSnap.exists()) {
                    profileData = profileSnap.data();
                }
            } catch (pGetErr) {
                // Permission denied for other user profiles is expected in client SDK
            }

            // Safely inspect all possible XP/Score point fields
            const statsXp = Number(data.xp || 0);
            const statsScore = Number(data.score || 0);
            const statsTotalXp = Number(data.totalXp || 0);
            const profXp = Number(profileData?.xp || 0);
            const profScore = Number(profileData?.score || 0);
            const profTotalXp = Number(profileData?.totalXp || 0);

            // Select the highest non-zero XP value found to prevent resetting to 0 / Level 1
            const maxPoints = Math.max(statsXp, statsScore, statsTotalXp, profXp, profScore, profTotalXp);
            const targetXp = Math.round(maxPoints);

            // 1. Update publicStats document with fixed Score = XP
            await setDoc(doc(db, publicStatsPath, userDoc.id), {
                xp: targetXp,
                score: targetXp,
                lastUpdated: serverTimestamp()
            }, { merge: true });

            // 2. Update user profile document if accessible
            try {
                await setDoc(profileRef, {
                    xp: targetXp,
                    score: targetXp
                }, { merge: true });
            } catch (pErr) {
                // Profile update permission error for non-owned docs is safe to ignore
            }

            if (data.score !== targetXp || data.xp !== targetXp) {
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
