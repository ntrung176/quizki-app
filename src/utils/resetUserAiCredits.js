import { collection, collectionGroup, getDocs, getDoc, doc, updateDoc, setDoc, deleteField, query } from 'firebase/firestore';
import { db, appId } from '../config/firebase';
import { PREMIUM_INCLUDED_CREDITS, WELCOME_AI_CREDITS } from './aiCreditManager';

/**
 * Resolve true active plan for a user based on profile + publicStats + approved creditRequests.
 */
const resolveUserPlan = (profileData = {}, statsData = {}, approvedRequests = []) => {
    const mergedPackages = [
        ...(Array.isArray(profileData.unlockedSpecializedPackages) ? profileData.unlockedSpecializedPackages : []),
        ...(Array.isArray(statsData.unlockedSpecializedPackages) ? statsData.unlockedSpecializedPackages : [])
    ];

    const exp = profileData.premiumExpiresAt || statsData.premiumExpiresAt;
    const expiryMs = exp?.toDate ? exp.toDate().getTime() : Number(exp || 0);
    const isExpired = Boolean(expiryMs && expiryMs < Date.now());

    if (!isExpired) {
        if (mergedPackages.includes('premium_3y')) return 'premium_3y';
        if (mergedPackages.includes('premium_1y')) return 'premium_1y';
        if (mergedPackages.includes('premium_1m')) return 'premium_1m';

        const reqPkg = approvedRequests.map(r => r.packageId);
        if (reqPkg.includes('premium_3y')) return 'premium_3y';
        if (reqPkg.includes('premium_1y')) return 'premium_1y';
        if (reqPkg.includes('premium_1m')) return 'premium_1m';
    }

    return 'free';
};

/**
 * Batch-reset AI credits across all Firestore user profiles:
 * - Premium 1 Năm -> target1y (mặc định 800 Credit AI)
 * - Premium 3 Năm -> target3y (mặc định 3.000 Credit AI)
 * - Bất kỳ tài khoản Free/1M có số dư bất thường (> anomalyThreshold, ví dụ user cheat 190M) -> đưa về mức chuẩn (50 / 100)
 * Đồng thời xoá trường aiCreditsRemaining giả mạo nếu bị ghi vào userStats và gỡ trialPricingTier nếu không phải Admin/QTV.
 */
export const resetPremiumUsersAiCredits = async ({
    target1y = PREMIUM_INCLUDED_CREDITS.premium_1y,
    target3y = PREMIUM_INCLUDED_CREDITS.premium_3y,
    anomalyThreshold = 5000,
    fallback1m = PREMIUM_INCLUDED_CREDITS.premium_1m,
    fallbackFree = WELCOME_AI_CREDITS,
    adminModerators = []
} = {}) => {
    if (!db || !appId) {
        throw new Error('Firebase Firestore chưa được khởi tạo.');
    }

    const adminEmails = ['ntrungforwork@gmail.com', 'lynguyennhattrung1706@gmail.com'];
    const modSet = new Set(Array.isArray(adminModerators) ? adminModerators : []);

    const [statsSnap, settingsSnap, requestsSnap] = await Promise.all([
        getDocs(query(collection(db, `artifacts/${appId}/public/data/userStats`))),
        getDocs(collectionGroup(db, 'settings')).catch(() => ({ docs: [] })),
        getDocs(query(collection(db, `artifacts/${appId}/creditRequests`))).catch(() => ({ docs: [] }))
    ]);

    const statsMap = {};
    statsSnap.docs.forEach(d => {
        statsMap[d.id] = d.data() || {};
    });

    const profileMap = {};
    settingsSnap.docs.forEach(d => {
        if (d.id === 'profile') {
            const uid = d.ref.parent?.parent?.id;
            if (uid) profileMap[uid] = d.data() || {};
        }
    });

    const requestsByUid = {};
    requestsSnap.docs.forEach(d => {
        const r = d.data() || {};
        if (r.status === 'approved' && r.userId) {
            if (!requestsByUid[r.userId]) requestsByUid[r.userId] = [];
            requestsByUid[r.userId].push(r);
        }
    });

    const allUids = Array.from(new Set([...Object.keys(statsMap), ...Object.keys(profileMap)]));

    let reset1yCount = 0;
    let reset3yCount = 0;
    let anomalyClearedCount = 0;
    let skippedAdminCount = 0;
    const updatedUsers = [];

    for (const uid of allUids) {
        const pData = profileMap[uid] || {};
        const sData = statsMap[uid] || {};
        const email = (pData.email || sData.email || '').trim().toLowerCase();

        if (adminEmails.includes(email) || modSet.has(uid)) {
            skippedAdminCount++;
            continue;
        }

        const plan = resolveUserPlan(pData, sData, requestsByUid[uid] || []);
        const currentProfileCredits = pData.aiCreditsRemaining;
        const currentStatsCredits = sData.aiCreditsRemaining;
        const numericCurrent = Number(currentProfileCredits ?? currentStatsCredits ?? 0);

        let targetCredits = null;
        let reason = null;

        if (plan === 'premium_1y') {
            if (numericCurrent !== target1y || currentProfileCredits === undefined) {
                targetCredits = target1y;
                reason = 'reset_1y';
                reset1yCount++;
            }
        } else if (plan === 'premium_3y') {
            if (numericCurrent !== target3y || currentProfileCredits === undefined) {
                targetCredits = target3y;
                reason = 'reset_3y';
                reset3yCount++;
            }
        } else if (numericCurrent > anomalyThreshold || (sData.aiCreditsRemaining && sData.aiCreditsRemaining > anomalyThreshold)) {
            targetCredits = plan === 'premium_1m' ? fallback1m : fallbackFree;
            reason = 'anomaly_cheat_reset';
            anomalyClearedCount++;
        }

        const hasSpoofedTier = Boolean(pData.trialPricingTier || sData.trialPricingTier);
        if (hasSpoofedTier && targetCredits === null && numericCurrent > anomalyThreshold) {
            targetCredits = fallbackFree;
            reason = 'anomaly_cheat_reset';
            anomalyClearedCount++;
        }

        if (targetCredits !== null || hasSpoofedTier || currentStatsCredits !== undefined) {
            const profileRef = doc(db, `artifacts/${appId}/users/${uid}/settings/profile`);
            const statsRef = doc(db, `artifacts/${appId}/public/data/userStats/${uid}`);

            const profilePatch = { updatedAt: Date.now() };
            if (targetCredits !== null) {
                profilePatch.aiCreditsRemaining = Math.max(0, Math.floor(targetCredits));
            }
            if (pData.trialPricingTier !== undefined) {
                profilePatch.trialPricingTier = deleteField();
            }

            try {
                await setDoc(profileRef, profilePatch, { merge: true });
            } catch (e) {
                console.warn(`[ResetCredits] Profile write warning for ${uid}:`, e?.message);
            }

            // Clean any forged/stale credit or trialPricingTier fields from public userStats
            if (statsMap[uid] && (sData.aiCreditsRemaining !== undefined || sData.trialPricingTier !== undefined)) {
                try {
                    const statsPatch = {};
                    if (sData.aiCreditsRemaining !== undefined) statsPatch.aiCreditsRemaining = deleteField();
                    if (sData.trialPricingTier !== undefined) statsPatch.trialPricingTier = deleteField();
                    await updateDoc(statsRef, statsPatch);
                } catch (e) {
                    console.warn(`[ResetCredits] userStats cleanup warning for ${uid}:`, e?.message);
                }
            }

            if (targetCredits !== null) {
                updatedUsers.push({
                    uid,
                    email: email || uid.slice(0, 8),
                    plan,
                    before: numericCurrent,
                    after: targetCredits,
                    reason
                });
            }
        }
    }

    return {
        scanned: allUids.length,
        reset1yCount,
        reset3yCount,
        anomalyClearedCount,
        skippedAdminCount,
        totalUpdated: updatedUsers.length,
        updatedUsers
    };
};

/**
 * Manually adjust or reset a single user's AI credits from Admin User Detail panel.
 */
export const setSingleUserAiCredits = async (userId, creditsAmount) => {
    if (!db || !appId || !userId) {
        throw new Error('Thiếu thông tin người dùng.');
    }
    const cleanCredits = Math.max(0, Math.floor(Number(creditsAmount) || 0));
    const profileRef = doc(db, `artifacts/${appId}/users/${userId}/settings/profile`);
    const statsRef = doc(db, `artifacts/${appId}/public/data/userStats/${userId}`);

    await setDoc(profileRef, {
        aiCreditsRemaining: cleanCredits,
        trialPricingTier: deleteField(),
        updatedAt: Date.now()
    }, { merge: true });

    try {
        const statsSnap = await getDoc(statsRef);
        if (statsSnap.exists() && statsSnap.data()?.aiCreditsRemaining !== undefined) {
            await updateDoc(statsRef, { aiCreditsRemaining: deleteField() });
        }
    } catch (_) {}

    return cleanCredits;
};
