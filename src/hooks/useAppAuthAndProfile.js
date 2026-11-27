import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { onAuthStateChanged, signOut, getRedirectResult } from 'firebase/auth';
import { doc, onSnapshot, collection, query, updateDoc, deleteDoc, getDocs, writeBatch, orderBy, limit, setDoc, increment } from 'firebase/firestore';
import { auth, db, appId } from '../config/firebase';
import { subscribeAdminConfig, hasAdminPrivileges } from '../utils/adminSettings';
import { getSharedBookGroups } from '../utils/bookService';
import { getSharedKanjiList, getSharedVocabList, getSharedKanjiSrs, clearUserSrsCache, getSharedKanjiProgress, clearKanjiProgressCache } from '../utils/kanjiService';
import { clearUserGrammarSrsCache } from '../utils/grammarService';
import { getOpenRouterKeys } from '../utils/aiProvider';
import { syncCurrentUserCreditsCache, clearCurrentUserCreditsCache, syncAdminModeratorsList, syncDynamicFeatureCreditCosts, WELCOME_AI_CREDITS } from '../utils/aiCreditManager';

export const useAppAuthAndProfile = ({ setAllCards, setReviewCards, setView, setEditingCard, setNotification }) => {
    const [authReady, setAuthReady] = useState(false);
    const [userId, setUserId] = useState(null);
    const [rawProfile, setProfile] = useState(() => {
        try {
            const cached = localStorage.getItem('quizki_cached_user_profile');
            return cached ? JSON.parse(cached) : null;
        } catch (_) {
            return null;
        }
    });
    const [isProfileLoading, setIsProfileLoading] = useState(() => {
        try {
            return !localStorage.getItem('quizki_cached_user_profile');
        } catch (_) {
            return true;
        }
    });
    const rawProfileRef = useRef(rawProfile);
    useEffect(() => {
        rawProfileRef.current = rawProfile;
    }, [rawProfile]);
    const [adminConfig, setAdminConfig] = useState(null);
    const [activePopup, setActivePopup] = useState(null);
    const [geminiApiKeys] = useState(() => getOpenRouterKeys());
    const [cloudStreak, setCloudStreak] = useState(() => {
        try {
            const cached = localStorage.getItem('quizki_cached_user_streak');
            return cached ? parseInt(cached, 10) : 0;
        } catch (_) {
            return 0;
        }
    });

    const settingsDocPath = useMemo(() => {
        if (!userId) return null;
        return `artifacts/${appId}/users/${userId}/settings/profile`;
    }, [userId]);

    const publicStatsCollectionPath = useMemo(() => `artifacts/${appId}/public/data/userStats`, []);

    // Firestore listener for User Profile Settings
    useEffect(() => {
        if (!authReady) return;
        if (!settingsDocPath) {
            setProfile(null);
            setIsProfileLoading(false);
            return;
        }

        if (!rawProfileRef.current) {
            setIsProfileLoading(true);
        }

        const docRef = doc(db, settingsDocPath);
        let initCreditsAttempted = false;
        const unsubscribe = onSnapshot(docRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                if ((data.aiCreditsRemaining === undefined || data.aiCreditsRemaining === null) && !initCreditsAttempted) {
                    initCreditsAttempted = true;
                    updateDoc(docRef, { aiCreditsRemaining: WELCOME_AI_CREDITS }).catch(() => {});
                }
                setProfile(data);
                try {
                    localStorage.setItem('quizki_cached_user_profile', JSON.stringify(data));
                } catch (_) {}

                // Đồng bộ số streak từ Firestore profile sang bộ nhớ máy
                if (data && typeof data === 'object' && Number(data.streak) > 0) {
                    const pStreak = Number(data.streak);
                    setCloudStreak(prev => Math.max(prev, pStreak));
                    try {
                        const localStreak = parseInt(localStorage.getItem('quizki_cached_user_streak') || '0', 10);
                        if (pStreak > localStreak) {
                            localStorage.setItem('quizki_cached_user_streak', String(pStreak));
                            if (userId) localStorage.setItem(`quizki_cached_user_streak_${userId}`, String(pStreak));
                            window.dispatchEvent(new CustomEvent('quizki-streak-synced', { detail: pStreak }));
                        }
                    } catch (_) {}
                }
                // Sync cloud appSettings across Web and Mobile
                if (data.appSettings && typeof data.appSettings === 'object') {
                    try {
                        const currentLocal = JSON.parse(localStorage.getItem('quizki-settings') || '{}');
                        const merged = { ...currentLocal, ...data.appSettings };
                        localStorage.setItem('quizki-settings', JSON.stringify(merged));
                        if (data.appSettings.ttsVoice) {
                            localStorage.setItem('quizki_tts_voice', data.appSettings.ttsVoice);
                        }
                        if (data.appSettings.isDarkMode !== undefined) {
                            localStorage.setItem('darkMode', data.appSettings.isDarkMode ? 'true' : 'false');
                        }
                        if (data.appSettings.furiganaColor) {
                            document.documentElement.style.setProperty('--furigana-color', data.appSettings.furiganaColor);
                        }
                        if (data.appSettings.furiganaFontSize) {
                            document.documentElement.style.setProperty('--furigana-font-size', data.appSettings.furiganaFontSize);
                        }
                        window.dispatchEvent(new Event('quizki-settings-changed'));
                    } catch (_) {}
                }
            } else {
                setProfile(null);
            }
            setIsProfileLoading(false);
        }, (error) => {
            console.error("Lỗi tải thông tin cá nhân:", error);
            setIsProfileLoading(false);
        });

        return () => unsubscribe();
    }, [authReady, settingsDocPath]);

    // Real-time synchronization of authoritative cloud streak from publicStats
    useEffect(() => {
        if (!authReady || !userId || !db || !publicStatsCollectionPath) return;

        const statsDocRef = doc(db, publicStatsCollectionPath, userId);
        const unsubscribe = onSnapshot(statsDocRef, (snap) => {
            if (snap.exists()) {
                const sData = snap.data();
                const sStreak = Number(sData?.streak || 0);
                if (sStreak > 0) {
                    setCloudStreak(prev => Math.max(prev, sStreak));
                    try {
                        const localStreak = parseInt(localStorage.getItem('quizki_cached_user_streak') || '0', 10);
                        if (sStreak > localStreak) {
                            localStorage.setItem('quizki_cached_user_streak', String(sStreak));
                            localStorage.setItem(`quizki_cached_user_streak_${userId}`, String(sStreak));
                            window.dispatchEvent(new CustomEvent('quizki-streak-synced', { detail: sStreak }));
                        }
                    } catch (_) {}
                }
            }
        }, (err) => {
            console.warn('⚠️ Lỗi lắng nghe publicStats cho streak:', err);
        });

        return () => unsubscribe();
    }, [authReady, userId, publicStatsCollectionPath]);

    const isAdmin = useMemo(() => {
        const rawEnv = import.meta.env.VITE_ADMIN_EMAIL || '';
        const adminEmailEnv = rawEnv.trim().replace(/^['"]|['"]$/g, '').toLowerCase();
        const currentEmail = (auth?.currentUser?.email || '').trim().toLowerCase();
        const developerEmails = ['ntrungforwork@gmail.com', 'lynguyennhattrung1706@gmail.com'];
        return (!!adminEmailEnv && currentEmail === adminEmailEnv) || developerEmails.includes(currentEmail);
    }, [authReady, userId, auth?.currentUser?.email]);

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
        const isPrivilegedTester = isAdmin || Boolean(userId && adminConfig?.moderators?.includes(userId));
        const tier = isPrivilegedTester ? rawProfile.trialPricingTier : null;
        if (!isPrivilegedTester && rawProfile.trialPricingTier) {
            overrides.trialPricingTier = null;
        }
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
    }, [rawProfile, isAdmin, adminConfig?.moderators, userId]);

    useEffect(() => {
        const unsubscribe = subscribeAdminConfig(setAdminConfig);
        return () => { if (unsubscribe) unsubscribe(); };
    }, []);

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
        return true; // Controlled dynamically via AI Credit balance & InsufficientAiCreditsError
    }, [userId, isAdmin, adminConfig]);

    const userHasAdminPrivileges = useMemo(() => {
        const hasPriv = hasAdminPrivileges(adminConfig, userId, isAdmin);
        if (typeof window !== 'undefined') {
            window.__QUIZKI_IS_ADMIN__ = Boolean(hasPriv);
            try {
                sessionStorage.setItem('quizki_is_admin', hasPriv ? 'true' : 'false');
            } catch (_) {}
        }
        return hasPriv;
    }, [adminConfig, userId, isAdmin]);

    // Sync AI credits, verified moderators & dynamic feature costs cleanly
    useEffect(() => {
        syncAdminModeratorsList(adminConfig?.moderators);
        syncDynamicFeatureCreditCosts(adminConfig?.aiFeatureCosts);
        if (!userId) {
            clearCurrentUserCreditsCache();
            return;
        }
        const effectiveCredits = profile?.aiCreditsRemaining ?? WELCOME_AI_CREDITS;
        syncCurrentUserCreditsCache(userId, effectiveCredits, Boolean(userHasAdminPrivileges));
    }, [userId, profile?.aiCreditsRemaining, userHasAdminPrivileges, adminConfig?.moderators, adminConfig?.aiFeatureCosts]);

    useEffect(() => {
        if (!userId || !db) return;
        const q = query(collection(db, `artifacts/${appId}/globalNotifications`), orderBy('createdAt', 'desc'), limit(20));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            const popupNotif = list.find(n => n.type === 'popup');
            if (popupNotif) {
                let dismissed = [];
                try {
                    dismissed = JSON.parse(localStorage.getItem('quizki_dismissed_popups') || '[]');
                } catch (e) {
                    dismissed = [];
                }
                if (!dismissed.includes(popupNotif.id)) {
                    setActivePopup(popupNotif);
                }
            } else {
                setActivePopup(null);
            }
        }, (error) => {
            console.error('Error loading global notifications for popup:', error);
        });
        return () => unsubscribe();
    }, [userId]);

    const handleDismissPopup = () => {
        if (!activePopup) return;
        let dismissed = [];
        try {
            dismissed = JSON.parse(localStorage.getItem('quizki_dismissed_popups') || '[]');
        } catch (e) {
            dismissed = [];
        }
        if (!dismissed.includes(activePopup.id)) {
            dismissed.push(activePopup.id);
            localStorage.setItem('quizki_dismissed_popups', JSON.stringify(dismissed));
        }
        setActivePopup(null);
    };

    const handleAdminDeleteUserData = useCallback(async (targetUserId) => {
        if (!db || !appId || !targetUserId) return;
        if (!userHasAdminPrivileges) {
            setNotification("Bạn không có quyền thực hiện chức năng này.");
            return;
        }
        try {
            setNotification("Đang xóa dữ liệu người dùng...");

            const deleteInBatches = async (collectionPath) => {
                const snapshot = await getDocs(collection(db, collectionPath));
                const docsArray = snapshot.docs;
                const batchSize = 500;
                for (let i = 0; i < docsArray.length; i += batchSize) {
                    const batch = writeBatch(db);
                    const chunk = docsArray.slice(i, i + batchSize);
                    chunk.forEach(docSnap => {
                        batch.delete(docSnap.ref);
                    });
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

            setNotification(`Đã xoá toàn bộ dữ liệu của người dùng (${vocabCount} từ vựng, ${actCount} hoạt động, ${kanjiSrsCount} kanji SRS).`);
        } catch (e) {
            console.error("Lỗi xoá dữ liệu người dùng bởi admin:", e);
            setNotification(`Lỗi khi xoá dữ liệu người dùng: ${e.message}`);
        }
    }, [userHasAdminPrivileges, publicStatsCollectionPath, setNotification]);

    const callbacksRef = useRef({ setAllCards, setReviewCards, setView, setEditingCard, setNotification });
    useEffect(() => {
        callbacksRef.current = { setAllCards, setReviewCards, setView, setEditingCard, setNotification };
    });

    useEffect(() => {
        const handleRedirect = async () => {
            if (!auth) return;
            try {
                const result = await getRedirectResult(auth);
                if (result?.user) {
                    console.log("Google Redirect Sign-In Success:", result.user.email);
                }
            } catch (err) {
                console.error("[Quizki Auth] Lỗi Google Redirect:", err);
                if (callbacksRef.current.setNotification) callbacksRef.current.setNotification("Đăng nhập bằng Google không thành công hoặc đã bị hủy.");
            }
        };
        handleRedirect();

        const unsubscribe = onAuthStateChanged(auth, (user) => {
            if (user && !user.emailVerified) {
                if (typeof window !== 'undefined' && window.__quizki_registration_syncing) {
                    setAuthReady(true);
                    return;
                }
                if (callbacksRef.current.setNotification) callbacksRef.current.setNotification("Email chưa xác thực. Vui lòng kiểm tra hộp thư và bấm link xác nhận, sau đó đăng nhập lại.");
                signOut(auth);
                setUserId(null);
                setAuthReady(true);
                return;
            }
            if (user) {
                setUserId(user.uid);
                if (callbacksRef.current.setNotification) callbacksRef.current.setNotification('');
            } else {
                setUserId(null);
                if (callbacksRef.current.setAllCards) callbacksRef.current.setAllCards([]);
                if (callbacksRef.current.setReviewCards) callbacksRef.current.setReviewCards([]);
                setProfile(null);
                if (callbacksRef.current.setView) callbacksRef.current.setView('HOME');
                if (callbacksRef.current.setEditingCard) callbacksRef.current.setEditingCard(null);
                if (callbacksRef.current.setNotification) callbacksRef.current.setNotification('');
                clearUserSrsCache();
                clearKanjiProgressCache();
                clearUserGrammarSrsCache();

                // Clear all account-specific cached keys from localStorage
                localStorage.removeItem('quizki_cached_user_profile');
                localStorage.removeItem('quizki_cached_vocab_list');
                localStorage.removeItem('quizki_cached_home_vocab_stats');
                localStorage.removeItem('quizki_cached_kanji_srs_stats');
                localStorage.removeItem('quizki_cached_grammar_srs_stats');
                localStorage.removeItem('quizki_cached_user_streak');
                localStorage.removeItem('quizki_cached_leaderboard');
                localStorage.removeItem('quizki_vocab_review_session');
                localStorage.removeItem('quizki_kanji_review_session');
                localStorage.removeItem('quizki_grammar_review_session');
                localStorage.removeItem('quizki_saved_folders');
                localStorage.removeItem('last_kanji_lesson');

                for (let i = localStorage.length - 1; i >= 0; i--) {
                    const key = localStorage.key(i);
                    if (key && (
                        key.startsWith('study_completed_') || 
                        key.startsWith('study_progress_') ||
                        key.startsWith('quizki_cached_kanji_srs_') ||
                        key.startsWith('quizki_cached_grammar_srs_') ||
                        key.startsWith('quizki_cached_kanji_progress_') ||
                        key.startsWith('study_sets_') ||
                        key.startsWith('saved_folders_') ||
                        key.startsWith('quizki_study_sets_') ||
                        key.startsWith('quizki_folders_') ||
                        key.startsWith('quizki_jlpt_') ||
                        key.startsWith('lesson_')
                    )) {
                        localStorage.removeItem(key);
                    }
                }

                try {
                    window.dispatchEvent(new Event('srs-updated'));
                    window.dispatchEvent(new Event('quizki-user-logged-out'));
                } catch (_) {}
            }
            setAuthReady(true);
        });

        return () => unsubscribe();
    }, []);

    const syncedLoginMetaUidRef = useRef(null);

    // Defer identity/publicStats sync until after initial profile hydration so login writes never compete with read streams
    useEffect(() => {
        if (!authReady || !userId || isProfileLoading || !db || !appId) return;
        if (syncedLoginMetaUidRef.current === userId) return;
        const user = auth?.currentUser;
        if (!user || user.uid !== userId) return;

        const timer = setTimeout(() => {
            syncedLoginMetaUidRef.current = userId;
            const userEmail = (user.email || '').trim();
            const fallbackDisplayName = user.displayName || (userEmail ? userEmail.split('@')[0] : 'Người học');
            const userPhoto = user.photoURL || '';
            const now = Date.now();

            const statsDocRef = doc(db, `artifacts/${appId}/public/data/userStats`, user.uid);
            const cur = rawProfileRef.current;
            setDoc(statsDocRef, {
                userId: user.uid,
                email: userEmail,
                displayName: cur?.displayName || fallbackDisplayName,
                photoURL: cur?.photoURL || userPhoto,
                lastLoginAt: now,
                lastActive: now,
                updatedAt: now
            }, { merge: true }).catch(err => console.warn('Auto-sync userStats on login warning:', err));

            if (!cur || cur.email !== userEmail || !cur.displayName || (userPhoto && !cur.photoURL)) {
                const profileDocRef = doc(db, `artifacts/${appId}/users/${user.uid}/settings/profile`);
                setDoc(profileDocRef, {
                    email: userEmail,
                    displayName: cur?.displayName || fallbackDisplayName,
                    photoURL: cur?.photoURL || userPhoto,
                    updatedAt: now
                }, { merge: true }).catch(err => console.warn('Auto-sync profile on login warning:', err));
            }
        }, 2500);

        return () => clearTimeout(timer);
    }, [authReady, userId, isProfileLoading]);

    // Defer background kanji progress/srs sync so startup auth/vocab/profile streams finish first
    useEffect(() => {
        if (!userId) return;
        const timer = setTimeout(() => {
            getSharedKanjiSrs(userId).catch(() => { });
            getSharedKanjiProgress(userId).catch(() => { });
        }, 2500);
        return () => clearTimeout(timer);
    }, [userId]);

    const awardXP = useCallback(async (amount) => {
        if (!userId || !amount || amount <= 0) return;
        try {
            const currentXp = Math.max(
                Number(rawProfile?.xp || 0),
                Number(rawProfile?.score || 0),
                Number(rawProfile?.totalXp || 0)
            );
            const newXp = currentXp + Math.round(Number(amount));

            setProfile(prev => prev ? { ...prev, xp: newXp, score: newXp, totalXp: newXp } : prev);

            if (db && appId) {
                const profileRef = doc(db, `artifacts/${appId}/users/${userId}/settings/profile`);
                await updateDoc(profileRef, {
                    xp: newXp,
                    score: newXp,
                    totalXp: newXp,
                    updatedAt: Date.now()
                }).catch(async () => {
                    await setDoc(profileRef, { xp: newXp, score: newXp, totalXp: newXp, updatedAt: Date.now() }, { merge: true });
                });

                // Cập nhật hoạt động học tập hàng ngày (dailyActivity) cho hôm nay
                const now = new Date();
                const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
                const activityRef = doc(db, `artifacts/${appId}/users/${userId}/dailyActivity`, todayStr);
                setDoc(activityRef, {
                    xpGained: increment(Math.round(Number(amount))),
                    reviewsDone: increment(1),
                    lastUpdated: Date.now()
                }, { merge: true }).catch(() => {});

                if (publicStatsCollectionPath) {
                    const statsRef = doc(db, publicStatsCollectionPath, userId);
                    await setDoc(statsRef, {
                        xp: newXp,
                        score: newXp,
                        totalXp: newXp,
                        displayName: rawProfile?.displayName || 'User',
                        photoURL: rawProfile?.photoURL || '',
                        lastActive: Date.now(),
                        updatedAt: Date.now()
                    }, { merge: true }).catch(() => {});
                }
            }
        } catch (err) {
            console.warn('⚠️ Error awarding XP:', err);
        }
    }, [userId, rawProfile, publicStatsCollectionPath]);

    const handleUpdateProfileName = useCallback(async (newName) => {
        if (!userId || !newName || !newName.trim()) return;
        const cleanName = newName.trim();

        if (auth?.currentUser) {
            try {
                const { updateProfile } = await import('firebase/auth');
                await updateProfile(auth.currentUser, { displayName: cleanName });
            } catch (e) {
                console.warn("Lỗi cập nhật Auth displayName:", e);
            }
        }

        if (db && appId) {
            const profileRef = doc(db, `artifacts/${appId}/users/${userId}/settings/profile`);
            await updateDoc(profileRef, {
                displayName: cleanName,
                updatedAt: Date.now()
            }).catch(async () => {
                await setDoc(profileRef, { displayName: cleanName, updatedAt: Date.now() }, { merge: true });
            });

            if (publicStatsCollectionPath) {
                const statsRef = doc(db, publicStatsCollectionPath, userId);
                await setDoc(statsRef, {
                    displayName: cleanName,
                    updatedAt: Date.now()
                }, { merge: true }).catch(() => {});
            }
        }

        setProfile(prev => prev ? { ...prev, displayName: cleanName } : { displayName: cleanName });
    }, [userId, publicStatsCollectionPath]);

    const handleUpdateAvatar = useCallback(async (newAvatar) => {
        if (!userId) return;

        if (db && appId) {
            const isPhoto = typeof newAvatar === 'string' && (newAvatar.startsWith('data:image/') || newAvatar.startsWith('http'));
            const updatePayload = {
                avatar: newAvatar,
                photoURL: isPhoto ? newAvatar : '',
                updatedAt: Date.now()
            };

            const profileRef = doc(db, `artifacts/${appId}/users/${userId}/settings/profile`);
            await updateDoc(profileRef, updatePayload).catch(async () => {
                await setDoc(profileRef, updatePayload, { merge: true });
            });

            if (publicStatsCollectionPath) {
                const statsRef = doc(db, publicStatsCollectionPath, userId);
                await setDoc(statsRef, {
                    avatar: newAvatar,
                    photoURL: isPhoto ? newAvatar : '',
                    updatedAt: Date.now()
                }, { merge: true }).catch(() => {});
            }
        }

        setProfile(prev => prev ? { ...prev, avatar: newAvatar } : { avatar: newAvatar });
    }, [userId, publicStatsCollectionPath]);

    const handleChangePassword = useCallback(async (oldPassword, newPassword) => {
        if (!auth?.currentUser) throw new Error('Người dùng chưa đăng nhập');
        const { updatePassword, EmailAuthProvider, reauthenticateWithCredential } = await import('firebase/auth');
        const user = auth.currentUser;
        const isPasswordUser = user.providerData.some(p => p.providerId === 'password');

        if (isPasswordUser && oldPassword) {
            const credential = EmailAuthProvider.credential(user.email, oldPassword);
            await reauthenticateWithCredential(user, credential);
        }
        await updatePassword(user, newPassword);
    }, []);

    return {
        authReady,
        userId,
        rawProfile,
        setProfile,
        profile,
        isProfileLoading,
        isAdmin,
        adminConfig,
        hasPremium,
        canUserUseAI,
        userHasAdminPrivileges,
        activePopup,
        handleDismissPopup,
        handleAdminDeleteUserData,
        handleUpdateProfileName,
        handleUpdateAvatar,
        handleChangePassword,
        awardXP,
        geminiApiKeys,
        publicStatsCollectionPath,
        cloudStreak
    };
};
