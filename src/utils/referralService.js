import { doc, getDoc, setDoc, updateDoc, collection, query, where, getDocs, runTransaction, increment, arrayUnion } from 'firebase/firestore';
import { db, appId } from '../config/firebase';

/**
 * Generate a unique referral code based on userId
 * @param {string} userId 
 * @returns {string} referralCode
 */
export const generateReferralCode = (userId) => {
    if (!userId) return '';
    const cleanId = userId.replace(/[^a-zA-Z0-9]/g, '').slice(0, 6).toUpperCase();
    const rand = Math.floor(10 + Math.random() * 90); // 2 random digits
    return `QK${cleanId}${rand}`;
};

/**
 * Submit a referral code entered by the user
 * @param {string} userId - Current user ID (Referee)
 * @param {string} displayName - Current user name (Referee)
 * @param {string} enteredCode - Referral code being entered
 * @returns {Object} { success: boolean, error?: string, referrerName?: string }
 */
export const submitReferralCode = async (userId, displayName, enteredCode) => {
    if (!userId || !enteredCode) {
        return { success: false, error: 'Thông tin không hợp lệ.' };
    }

    const code = enteredCode.trim().toUpperCase();

    try {
        // Direct check: prevent user from entering their own referral code
        const myProfileRef = doc(db, `artifacts/${appId}/users/${userId}/settings/profile`);
        const myProfileSnap = await getDoc(myProfileRef);
        if (myProfileSnap.exists()) {
            const myCode = myProfileSnap.data().referralCode;
            if (myCode && myCode.toUpperCase() === code) {
                return { success: false, error: 'Bạn không thể nhập mã giới thiệu của chính mình.' };
            }
        }
    } catch (err) {
        console.warn('Check self referral code error:', err);
    }

    try {
        // 1. Find referrer with this referralCode in public userStats
        const statsRef = collection(db, `artifacts/${appId}/public/data/userStats`);
        const q = query(statsRef, where('referralCode', '==', code));
        const snap = await getDocs(q);

        if (snap.empty) {
            return { success: false, error: 'Mã giới thiệu không tồn tại. Vui lòng kiểm tra lại.' };
        }

        const referrerDoc = snap.docs[0];
        const referrerId = referrerDoc.id;
        const referrerName = referrerDoc.data().displayName || 'Bạn bè';

        if (referrerId === userId) {
            return { success: false, error: 'Bạn không thể nhập mã giới thiệu của chính mình.' };
        }

        // 2. Check if current user has already been referred
        const referralDocRef = doc(db, `artifacts/${appId}/referrals`, userId);
        const referralSnap = await getDoc(referralDocRef);
        if (referralSnap.exists()) {
            return { success: false, error: 'Bạn đã nhập mã giới thiệu trước đó rồi.' };
        }

        const profileRef = doc(db, `artifacts/${appId}/users/${userId}/settings/profile`);
        const profileSnap = await getDoc(profileRef);
        if (profileSnap.exists() && profileSnap.data().referredBy) {
            return { success: false, error: 'Bạn đã nhập mã giới thiệu trước đó rồi.' };
        }

        const referrerProfileRef = doc(db, `artifacts/${appId}/users/${referrerId}/settings/profile`);

        // Read referrer's current premium expiry from their public userStats (since referee has no read permission on referrer's private profile settings)
        const referrerStatsRefDoc = doc(db, `artifacts/${appId}/public/data/userStats`, referrerId);
        const referrerStatsSnap = await getDoc(referrerStatsRefDoc);
        let referrerExpiry = 0;
        if (referrerStatsSnap.exists()) {
            const statsData = referrerStatsSnap.data();
            const exp = statsData.premiumExpiresAt || 0;
            referrerExpiry = exp?.toDate ? exp.toDate().getTime() : Number(exp || 0);
        }

        // 3. Execute transaction to safely award 15 days Premium to referee, save referredBy, award 3 days to referrer and create referral document
        let newExpiryReferee = Date.now() + 15 * 24 * 60 * 60 * 1000;
        let newExpiryReferrer = Date.now() + 3 * 24 * 60 * 60 * 1000;
        await runTransaction(db, async (transaction) => {
            const refereeProfileDoc = await transaction.get(profileRef);

            if (!refereeProfileDoc.exists()) {
                throw new Error('Hồ sơ của bạn không tồn tại.');
            }

            const currentExpiry = refereeProfileDoc.data().premiumExpiresAt || 0;
            const currentExpiryMs = currentExpiry?.toDate ? currentExpiry.toDate().getTime() : Number(currentExpiry || 0);
            const baseTime = currentExpiryMs > Date.now() ? currentExpiryMs : Date.now();
            newExpiryReferee = baseTime + 15 * 24 * 60 * 60 * 1000;

            const referrerBase = referrerExpiry > Date.now() ? referrerExpiry : Date.now();
            newExpiryReferrer = referrerBase + 3 * 24 * 60 * 60 * 1000;

            // Update Referee Profile
            transaction.update(profileRef, {
                isPremiumUnlocked: true,
                premiumExpiresAt: newExpiryReferee,
                unlockedSpecializedPackages: arrayUnion('premium', 'vocab_zen', 'grammar_zen', 'kanji_zen', 'jlpt_prep'),
                referredBy: {
                    id: referrerId,
                    name: referrerName,
                    code: code,
                    createdAt: Date.now()
                }
            });

            // Update Referrer Profile (award 3 days Premium immediately)
            // Note: Since we verified the referrer user exists via userStats lookup, we perform the update directly
            transaction.update(referrerProfileRef, {
                isPremiumUnlocked: true,
                premiumExpiresAt: newExpiryReferrer,
                unlockedSpecializedPackages: arrayUnion('premium', 'vocab_zen', 'grammar_zen', 'kanji_zen', 'jlpt_prep')
            });

            // Create Referral Log document
            transaction.set(referralDocRef, {
                referrerId,
                referrerName,
                referredId: userId,
                referredName: displayName || 'Người dùng mới',
                status: 'pending',
                rewarded: false,
                createdAt: Date.now(),
                updatedAt: Date.now()
            });
        });

        // 4. Sync referee's referredBy status to public userStats
        const refereeStatsRef = doc(db, `artifacts/${appId}/public/data/userStats`, userId);
        await setDoc(refereeStatsRef, {
            referredBy: referrerId,
            isPremiumUnlocked: true,
            isPremium: true,
            premiumExpiresAt: newExpiryReferee,
            unlockedSpecializedPackages: arrayUnion('premium', 'vocab_zen', 'grammar_zen', 'kanji_zen', 'jlpt_prep')
        }, { merge: true }).catch(err => console.warn('Sync referredBy to userStats warning:', err));

        // 5. Sync referrer's premium status to public userStats
        const referrerStatsRef = doc(db, `artifacts/${appId}/public/data/userStats`, referrerId);
        await setDoc(referrerStatsRef, {
            isPremiumUnlocked: true,
            isPremium: true,
            premiumExpiresAt: newExpiryReferrer,
            unlockedSpecializedPackages: arrayUnion('premium', 'vocab_zen', 'grammar_zen', 'kanji_zen', 'jlpt_prep')
        }, { merge: true }).catch(err => console.warn('Sync referrer stats warning:', err));

        return { success: true, referrerName };
    } catch (e) {
        console.error('Submit referral code error:', e);
        return { success: false, error: e.message || 'Lỗi hệ thống khi nhập mã.' };
    }
};

/**
 * Check and apply referral rewards for the referrer when the referred user upgrades to premium
 * @param {string} referredUserId - The user who just upgraded (Referee)
 * @param {string} referredName - The user's name
 * @returns {Object} { success: boolean, reason?: string, rewardsApplied?: Object }
 */
export const checkAndApplyReferralRewards = async (referredUserId, referredName) => {
    if (!referredUserId) return { success: false, reason: 'Invalid user ID' };

    try {
        const referralDocRef = doc(db, `artifacts/${appId}/referrals`, referredUserId);
        const referralSnap = await getDoc(referralDocRef);

        if (!referralSnap.exists()) {
            return { success: false, reason: 'No referral record found' };
        }

        const referralData = referralSnap.data();
        if (referralData.status === 'premium' && referralData.rewarded === true) {
            return { success: false, reason: 'Rewards already processed' };
        }

        const referrerId = referralData.referrerId;
        if (!referrerId) {
            return { success: false, reason: 'No referrer associated' };
        }

        // 1. Update referral status to premium and rewarded: true
        await updateDoc(referralDocRef, {
            status: 'premium',
            rewarded: true,
            updatedAt: Date.now()
        });

        // 2. Count total premium referrals for this referrer (including this one)
        const referralsRef = collection(db, `artifacts/${appId}/referrals`);
        const q = query(referralsRef, where('referrerId', '==', referrerId), where('status', '==', 'premium'));
        const querySnap = await getDocs(q);
        const premiumCount = querySnap.size || 1; // Fallback to 1

        // 3. Calculate rewards based on the progressive scale
        let premiumDays = 15;

        if (premiumCount === 1) {
            premiumDays = 15;
        } else if (premiumCount === 2) {
            premiumDays = 30;
        } else if (premiumCount === 3) {
            premiumDays = 45;
        } else {
            // 4th friend onwards
            premiumDays = 60;
        }

        const durationMs = premiumDays * 24 * 60 * 60 * 1000;

        // 4. Update Referrer Profile
        const referrerProfileRef = doc(db, `artifacts/${appId}/users/${referrerId}/settings/profile`);
        const referrerProfileSnap = await getDoc(referrerProfileRef);

        if (referrerProfileSnap.exists()) {
            const currentExpiry = referrerProfileSnap.data().premiumExpiresAt || 0;
            const currentExpiryMs = currentExpiry?.toDate ? currentExpiry.toDate().getTime() : Number(currentExpiry || 0);
            const baseTime = currentExpiryMs > Date.now() ? currentExpiryMs : Date.now();
            const premiumExpiresAt = baseTime + durationMs;

            const updateFields = {
                isPremiumUnlocked: true,
                premiumExpiresAt: premiumExpiresAt,
                unlockedSpecializedPackages: arrayUnion('premium', 'vocab_zen', 'grammar_zen', 'kanji_zen', 'jlpt_prep')
            };

            await setDoc(referrerProfileRef, updateFields, { merge: true });

            // Sync to public userStats
            const referrerStatsRef = doc(db, `artifacts/${appId}/public/data/userStats`, referrerId);
            await setDoc(referrerStatsRef, {
                isPremiumUnlocked: true,
                isPremium: true,
                premiumExpiresAt: premiumExpiresAt,
                unlockedSpecializedPackages: arrayUnion('premium', 'vocab_zen', 'grammar_zen', 'kanji_zen', 'jlpt_prep')
            }, { merge: true }).catch(err => console.warn('Sync rewards to referrer userStats warning:', err));

            console.log(`🎁 Referrer ${referrerId} rewarded for referral #${premiumCount} (${referredName}): +${premiumDays}d premium`);
            
            return {
                success: true,
                rewardsApplied: {
                    premiumDays,
                    premiumCount
                }
            };
        } else {
            return { success: false, reason: 'Referrer profile not found' };
        }
    } catch (e) {
        console.error('Error applying referral rewards:', e);
        return { success: false, reason: e.message };
    }
};

/**
 * Fetch referral statistics and history for a user
 * @param {string} userId 
 * @returns {Object} { totalInvited: number, premiumInvited: number, friends: Array }
 */
export const getReferralStats = async (userId) => {
    if (!userId) return { totalInvited: 0, premiumInvited: 0, friends: [] };

    try {
        const referralsRef = collection(db, `artifacts/${appId}/referrals`);
        const q = query(referralsRef, where('referrerId', '==', userId));
        const snap = await getDocs(q);

        if (snap.empty) {
            return { totalInvited: 0, premiumInvited: 0, friends: [] };
        }

        const friends = snap.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                name: data.referredName || 'Người học',
                status: data.status || 'pending', // 'pending' | 'premium'
                createdAt: data.createdAt,
                updatedAt: data.updatedAt
            };
        });

        // Sort by date created desc
        friends.sort((a, b) => b.createdAt - a.createdAt);

        const totalInvited = friends.length;
        const premiumInvited = friends.filter(f => f.status === 'premium').length;

        return {
            totalInvited,
            premiumInvited,
            friends
        };
    } catch (e) {
        console.error('Error fetching referral stats:', e);
        return { totalInvited: 0, premiumInvited: 0, friends: [] };
    }
};
