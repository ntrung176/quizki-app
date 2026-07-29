import { useState, useEffect, useMemo, useCallback } from 'react';
import { onAuthStateChanged, signOut, getRedirectResult } from 'firebase/auth';
import { doc, onSnapshot, getDocs, writeBatch, deleteDoc, collection } from 'firebase/firestore';
import { auth, db, appId } from '../config/firebase';
import { getOpenRouterKeys } from '../utils/aiProvider';
import { subscribeAdminConfig, hasAdminPrivileges } from '../utils/adminSettings';
import { getSharedBookGroups } from '../utils/bookService';
import { clearUserSrsCache, clearKanjiProgressCache } from '../utils/kanjiService';

export const useAuthSession = ({ setNotification, setAllCards, setReviewCards, setView, setEditingCard }) => {
    const [authReady, setAuthReady] = useState(false);
    const [userId, setUserId] = useState(null);
    const [rawProfile, setProfile] = useState(null);
    const [isProfileLoading, setIsProfileLoading] = useState(true);
    const [adminConfig, setAdminConfig] = useState(null);

    const publicStatsCollectionPath = useMemo(() => `artifacts/${appId}/public/data/userStats`, []);

    // Compute profile overrides and expiries
    const profile = useMemo(() => {
        if (!rawProfile) return null;
        const overrides = {};
        if (rawProfile.premiumExpiresAt) {
            const expiryTime = rawProfile.premiumExpiresAt.toDate ? rawProfile.premiumExpiresAt.toDate().getTime() : Number(rawProfile.premiumExpiresAt || 0);
            if (expiryTime && expiryTime < Date.now()) {
                overrides.isPremiumUnlocked = false;
                overrides.unlockedSpecializedPackages = (rawProfile.unlockedSpecializedPackages || []).filter(
                    pkg => !['premium_1m', 'premium_1y', 'premium_3y', 'premium', 'vocab_zen', 'grammar_zen', 'kanji_zen', 'jlpt_prep'].includes(pkg)
                );
            }
        }
        const tier = rawProfile.trialPricingTier;
        if (tier) {
            if (tier === 'free') {
                overrides.isPremiumUnlocked = false;
                overrides.unlockedSpecializedPackages = [];
            } else if (tier === 'premium_1m') {
                overrides.isPremiumUnlocked = true;
                overrides.unlockedSpecializedPackages = ['premium_1m', 'premium', 'vocab_zen', 'grammar_zen', 'kanji_zen', 'jlpt_prep'];
            } else if (tier === 'premium_1y') {
                overrides.isPremiumUnlocked = true;
                overrides.unlockedSpecializedPackages = ['premium_1y', 'premium', 'vocab_zen', 'grammar_zen', 'kanji_zen', 'jlpt_prep'];
            } else if (tier === 'premium_3y') {
                overrides.isPremiumUnlocked = true;
                overrides.unlockedSpecializedPackages = ['premium_3y', 'premium', 'vocab_zen', 'grammar_zen', 'kanji_zen', 'jlpt_prep'];
            }
        }
        return { ...rawProfile, ...overrides };
    }, [rawProfile]);

    const isAdmin = useMemo(() => {
        const rawEnv = import.meta.env.VITE_ADMIN_EMAIL || '';
        const adminEmailEnv = rawEnv.trim().replace(/^['"]|['"]$/g, '').toLowerCase();
        const currentEmail = (auth?.currentUser?.email || '').trim().toLowerCase();
        const developerEmails = ['ntrungforwork@gmail.com', 'lynguyennhattrung1706@gmail.com'];
        return (!!adminEmailEnv && currentEmail === adminEmailEnv) || developerEmails.includes(currentEmail);
    }, [authReady, userId, auth?.currentUser?.email]);

    useEffect(() => {
        if (!userId) return;
        const unsubscribe = subscribeAdminConfig(setAdminConfig);
        return () => { if (unsubscribe) unsubscribe(); };
    }, [userId]);

    const hasPremium = useMemo(() => {
        if (!profile) return false;
        const isPremiumUser = (profile.unlockedSpecializedPackages && (
            profile.unlockedSpecializedPackages.includes('premium') ||
            profile.unlockedSpecializedPackages.includes('premium_1m') ||
            profile.unlockedSpecializedPackages.includes('premium_1y') ||
            profile.unlockedSpecializedPackages.includes('premium_3y') ||
            profile.unlockedSpecializedPackages.includes('vocab_zen') ||
            profile.unlockedSpecializedPackages.includes('grammar_zen') ||
            profile.unlockedSpecializedPackages.includes('kanji_zen') ||
            profile.unlockedSpecializedPackages.includes('jlpt_prep')
        )) || false;

        return (
            profile.isPremiumUnlocked === true ||
            profile.isPremium === true ||
            isPremiumUser ||
            (profile.premiumExpiresAt && (() => {
                try {
                    const exp = profile.premiumExpiresAt.toDate ? profile.premiumExpiresAt.toDate() : new Date(profile.premiumExpiresAt);
                    return exp > new Date();
                } catch (e) {
                    return false;
                }
            })())
        ) || false;
    }, [profile]);

    const canUserUseAI = useMemo(() => {
        if (!userId) return false;
        if (isAdmin || adminConfig?.moderators?.includes(userId)) return true;
        return hasPremium;
    }, [userId, isAdmin, adminConfig, hasPremium]);

    const userHasAdminPrivileges = useMemo(() => {
        return hasAdminPrivileges(adminConfig, userId, isAdmin);
    }, [adminConfig, userId, isAdmin]);

    useEffect(() => {
        if (!db || !auth) return;

        const handleRedirect = async () => {
            try {
                const result = await getRedirectResult(auth);
                if (result?.user) {
                    console.log("Google Redirect Sign-In Success:", result.user.email);
                }
            } catch (err) {
                console.error("[Quizki Auth] Lỗi Google Redirect:", err);
                if (setNotification) setNotification("Đăng nhập bằng Google không thành công hoặc đã bị hủy.");
            }
        };
        handleRedirect();

        const unsubscribe = onAuthStateChanged(auth, (user) => {
            if (user && !user.emailVerified) {
                if (setNotification) setNotification("Email chưa xác thực. Vui lòng kiểm tra hộp thư và bấm link xác nhận, sau đó đăng nhập lại.");
                signOut(auth);
                setUserId(null);
                setAuthReady(true);
                return;
            }
            if (user) {
                setUserId(user.uid);
                if (setNotification) setNotification('');
            } else {
                setUserId(null);
                if (setAllCards) setAllCards([]);
                if (setReviewCards) setReviewCards([]);
                setProfile(null);
                if (setView) setView('HOME');
                if (setEditingCard) setEditingCard(null);
                if (setNotification) setNotification('');
                clearUserSrsCache();
                clearKanjiProgressCache();
            }
            setAuthReady(true);
        });

        getSharedBookGroups().catch(() => { });
        return () => unsubscribe();
    }, []);

    const handleAdminDeleteUserData = useCallback(async (targetUserId) => {
        if (!db || !appId || !targetUserId) return;
        if (!userHasAdminPrivileges) {
            if (setNotification) setNotification("Bạn không có quyền thực hiện chức năng này.");
            return;
        }
        try {
            if (setNotification) setNotification("Đang xóa dữ liệu người dùng...");

            const deleteInBatches = async (collectionPath) => {
                const snapshot = await getDocs(collection(db, collectionPath));
                const docsArray = snapshot.docs;
                const batchSize = 500;
                for (let i = 0; i < docsArray.length; i += batchSize) {
                    const batch = writeBatch(db);
                    const chunk = docsArray.slice(i, i + batchSize);
                    chunk.forEach(docSnap => batch.delete(docSnap.ref));
                    await batch.commit();
                }
                return docsArray.length;
            };

            const vocabCount = await deleteInBatches(`artifacts/${appId}/users/${targetUserId}/vocabulary`);
            const actCount = await deleteInBatches(`artifacts/${appId}/users/${targetUserId}/dailyActivity`);
            const kanjiSrsCount = await deleteInBatches(`artifacts/${appId}/users/${targetUserId}/kanjiSRS`);

            const profileDocRef = doc(db, `artifacts/${appId}/users/${targetUserId}/settings/profile`);
            await deleteDoc(profileDocRef).catch(e => console.log('Profile delete skipped:', e.message));

            const userRoot = doc(db, `artifacts/${appId}/users/${targetUserId}`);
            await deleteDoc(userRoot).catch(e => console.log('User root delete skipped:', e.message));

            const statsDocRef = doc(db, publicStatsCollectionPath, targetUserId);
            await deleteDoc(statsDocRef).catch(e => console.log('Stats delete skipped:', e.message));

            if (setNotification) setNotification(`Đã xoá toàn bộ dữ liệu người dùng (${vocabCount} từ vựng, ${actCount} hoạt động, ${kanjiSrsCount} kanji SRS).`);
        } catch (e) {
            console.error("Lỗi xoá dữ liệu người dùng bởi admin:", e);
            if (setNotification) setNotification(`Lỗi khi xoá dữ liệu người dùng: ${e.message}`);
        }
    }, [userHasAdminPrivileges, publicStatsCollectionPath, setNotification]);

    return {
        authReady,
        userId,
        rawProfile,
        setProfile,
        profile,
        isProfileLoading,
        setIsProfileLoading,
        adminConfig,
        setAdminConfig,
        isAdmin,
        hasPremium,
        canUserUseAI,
        userHasAdminPrivileges,
        handleAdminDeleteUserData
    };
};
