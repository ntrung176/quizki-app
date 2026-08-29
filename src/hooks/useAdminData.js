import { useState, useEffect, useMemo } from 'react';
import { collection, query, onSnapshot, doc, getDoc, getDocs, setDoc, writeBatch, orderBy, limit, collectionGroup, where } from 'firebase/firestore';
import { db, appId } from '../config/firebase';
import { subscribeVouchers, subscribeCreditRequests, subscribeExpenses } from '../utils/adminSettings';

export const useAdminData = ({ publicStatsPath, currentUserId, adminConfig, onAdminDeleteUserData }) => {
    const [users, setUsers] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [sortBy, setSortBy] = useState('totalCards');
    const [sortOrder, setSortOrder] = useState('desc');

    const [selectedUser, setSelectedUser] = useState(null);
    const [selectedUserProfile, setSelectedUserProfile] = useState(null);
    const [selectedUserPackageState, setSelectedUserPackageState] = useState('free');
    const [updatingUserPackage, setUpdatingUserPackage] = useState(false);
    const [loadingProfile, setLoadingProfile] = useState(false);

    const [notification, setNotification] = useState(null);
    const [confirmDelete, setConfirmDelete] = useState(null);
    const [deleting, setDeleting] = useState(false);
    const [deleteType, setDeleteType] = useState('all');

    const [roleFilter, setRoleFilter] = useState('all');
    const [planFilter, setPlanFilter] = useState('all');

    const [creditRequests, setCreditRequests] = useState([]);
    const [localUserUpdates, setLocalUserUpdates] = useState({});
    const [vouchers, setVouchers] = useState([]);
    const [expenses, setExpenses] = useState([]);
    const [globalNotifications, setGlobalNotifications] = useState([]);
    const [cacheConfig, setCacheConfig] = useState(null);

    // Auto-dismiss notification after 4s
    useEffect(() => {
        if (notification) {
            const timer = setTimeout(() => setNotification(null), 4000);
            return () => clearTimeout(timer);
        }
    }, [notification]);

    // Load users
    useEffect(() => {
        if (!db || !publicStatsPath) return;
        const q = query(collection(db, publicStatsPath));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const userList = snapshot.docs.map(d => ({
                id: d.id,
                ...d.data()
            }));
            setUsers(userList);
            setIsLoading(false);
        });
        return () => unsubscribe();
    }, [publicStatsPath]);

    // Subscriptions
    useEffect(() => {
        const unsub = subscribeVouchers(setVouchers);
        return () => { if (unsub) unsub(); };
    }, []);

    useEffect(() => {
        const unsub = subscribeCreditRequests(setCreditRequests);
        return () => { if (unsub) unsub(); };
    }, []);

    useEffect(() => {
        const unsub = subscribeExpenses(setExpenses);
        return () => { if (unsub) unsub(); };
    }, []);

    useEffect(() => {
        if (!db) return;
        const q = query(collection(db, `artifacts/${appId}/globalNotifications`), orderBy('createdAt', 'desc'), limit(30));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setGlobalNotifications(list);
        }, (error) => console.error('Error loading global notifications:', error));
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        if (!db) return;
        const ref = doc(db, `artifacts/${appId}/settings/cacheConfig`);
        const unsubscribe = onSnapshot(ref, (snap) => {
            setCacheConfig(snap.exists() ? snap.data() : null);
        }, (error) => console.error('Error loading cache config:', error));
        return () => unsubscribe();
    }, []);

    // Get User Active Plan
    const getUserActivePlan = (u) => {
        let activePlan = 'free';
        if (u.unlockedSpecializedPackages && Array.isArray(u.unlockedSpecializedPackages)) {
            const has1m = u.unlockedSpecializedPackages.includes('premium_1m');
            const has1y = u.unlockedSpecializedPackages.includes('premium_1y');
            const has3y = u.unlockedSpecializedPackages.includes('premium_3y');
            const hasLegacy = u.unlockedSpecializedPackages.includes('premium') || u.isPremium;

            let isExpired = false;
            if (u.premiumExpiresAt) {
                const expiryTime = u.premiumExpiresAt.toDate ? u.premiumExpiresAt.toDate().getTime() : Number(u.premiumExpiresAt || 0);
                if (expiryTime && expiryTime < Date.now()) isExpired = true;
            }

            if (!isExpired) {
                if (has3y) activePlan = 'premium_3y';
                else if (has1y) activePlan = 'premium_1y';
                else if (has1m) activePlan = 'premium_1m';
                else if (hasLegacy) activePlan = 'premium';
            }
        } else if (u.isPremium) {
            let isExpired = false;
            if (u.premiumExpiresAt) {
                const expiryTime = u.premiumExpiresAt.toDate ? u.premiumExpiresAt.toDate().getTime() : Number(u.premiumExpiresAt || 0);
                if (expiryTime && expiryTime < Date.now()) isExpired = true;
            }
            if (!isExpired) activePlan = 'premium';
        }

        if (activePlan === 'free') {
            if (u.isPremiumUnlocked !== false && u.isPremium !== false) {
                let isExpired = false;
                if (u.premiumExpiresAt) {
                    const expiryTime = u.premiumExpiresAt.toDate ? u.premiumExpiresAt.toDate().getTime() : Number(u.premiumExpiresAt || 0);
                    if (expiryTime && expiryTime < Date.now()) isExpired = true;
                }

                if (!isExpired && u.premiumExpiresAt) {
                    const userApprovedRequests = creditRequests.filter(r => r.userId === u.userId && r.status === 'approved');
                    const has3yReq = userApprovedRequests.some(r => r.packageId === 'premium_3y');
                    const has1yReq = userApprovedRequests.some(r => r.packageId === 'premium_1y');
                    const has1mReq = userApprovedRequests.some(r => r.packageId === 'premium_1m');

                    if (has3yReq) activePlan = 'premium_3y';
                    else if (has1yReq) activePlan = 'premium_1y';
                    else if (has1mReq) activePlan = 'premium_1m';
                    else activePlan = 'premium';
                }
            }
        }
        return activePlan;
    };

    // Load user profile when selectedUser changes
    useEffect(() => {
        if (!selectedUser) {
            setSelectedUserProfile(null);
            setSelectedUserPackageState('free');
            return;
        }
        const loadProfile = async () => {
            setLoadingProfile(true);
            try {
                const profileRef = doc(db, `artifacts/${appId}/users/${selectedUser.userId}/settings/profile`);
                const snap = await getDoc(profileRef);
                let mergedUser = {
                    ...selectedUser,
                    ...(localUserUpdates[selectedUser.userId] || {})
                };

                if (snap.exists()) {
                    const data = snap.data();
                    setSelectedUserProfile(data);
                    mergedUser = {
                        ...mergedUser,
                        ...data,
                        ...(localUserUpdates[selectedUser.userId] || {})
                    };
                } else {
                    setSelectedUserProfile({ aiCreditsRemaining: 0, unlockedSpecializedPackages: [] });
                }

                const activePlan = getUserActivePlan(mergedUser);
                setSelectedUserPackageState(activePlan);

                setLocalUserUpdates(prev => ({
                    ...prev,
                    [selectedUser.userId]: {
                        unlockedSpecializedPackages: mergedUser.unlockedSpecializedPackages || [],
                        isPremiumUnlocked: mergedUser.isPremiumUnlocked || false,
                        isPremium: mergedUser.isPremium || false,
                        premiumExpiresAt: mergedUser.premiumExpiresAt || null
                    }
                }));
            } catch (e) {
                console.error('Error loading user profile:', e);
            } finally {
                setLoadingProfile(false);
            }
        };
        loadProfile();
    }, [selectedUser]);

    const handleSaveUserPackage = async () => {
        if (!selectedUser) return;
        setUpdatingUserPackage(true);
        try {
            const profileRef = doc(db, `artifacts/${appId}/users/${selectedUser.userId}/settings/profile`);
            let unlockedSpecializedPackages = [];
            let isPremiumUnlocked = false;
            let premiumExpiresAt = null;

            if (selectedUserPackageState === 'premium_1m') {
                unlockedSpecializedPackages = ['premium_1m', 'premium', 'vocab_zen', 'grammar_zen', 'kanji_zen', 'jlpt_prep'];
                isPremiumUnlocked = true;
                premiumExpiresAt = Date.now() + 30 * 24 * 60 * 60 * 1000;
            } else if (selectedUserPackageState === 'premium_1y') {
                unlockedSpecializedPackages = ['premium_1y', 'premium', 'vocab_zen', 'grammar_zen', 'kanji_zen', 'jlpt_prep'];
                isPremiumUnlocked = true;
                premiumExpiresAt = Date.now() + 365 * 24 * 60 * 60 * 1000;
            } else if (selectedUserPackageState === 'premium_3y') {
                unlockedSpecializedPackages = ['premium_3y', 'premium', 'vocab_zen', 'grammar_zen', 'kanji_zen', 'jlpt_prep'];
                isPremiumUnlocked = true;
                premiumExpiresAt = Date.now() + 3 * 365 * 24 * 60 * 60 * 1000;
            }

            const updateData = { unlockedSpecializedPackages, isPremiumUnlocked, premiumExpiresAt };
            await setDoc(profileRef, updateData, { merge: true });

            if (publicStatsPath) {
                try {
                    const publicStatsRef = doc(db, `${publicStatsPath}/${selectedUser.userId}`);
                    await setDoc(publicStatsRef, {
                        unlockedSpecializedPackages,
                        isPremiumUnlocked,
                        isPremium: isPremiumUnlocked,
                        premiumExpiresAt
                    }, { merge: true });
                } catch (statsErr) {
                    console.warn('Không có quyền cập nhật userStats trực tiếp:', statsErr);
                }
            }

            setSelectedUserProfile(prev => ({ ...prev, ...updateData }));
            setLocalUserUpdates(prev => ({
                ...prev,
                [selectedUser.userId]: {
                    unlockedSpecializedPackages,
                    isPremiumUnlocked,
                    isPremium: isPremiumUnlocked,
                    premiumExpiresAt
                }
            }));
            setSelectedUser(prev => prev ? {
                ...prev,
                unlockedSpecializedPackages,
                isPremiumUnlocked,
                isPremium: isPremiumUnlocked,
                premiumExpiresAt
            } : null);

            setNotification({ type: 'success', message: 'Đã cập nhật gói học cho người dùng thành công.' });
        } catch (e) {
            console.error('Lỗi cập nhật gói học:', e);
            setNotification({ type: 'error', message: 'Lỗi cập nhật: ' + e.message });
        } finally {
            setUpdatingUserPackage(false);
        }
    };

    const stats = useMemo(() => {
        const total = users.length;
        const totalCards = users.reduce((sum, u) => sum + (u.totalCards || 0), 0);
        const activeToday = users.filter(u => {
            if (!u.lastActive) return false;
            const today = new Date().setHours(0, 0, 0, 0);
            return u.lastActive >= today;
        }).length;
        return { total, totalCards, activeToday };
    }, [users]);

    const filteredUsers = useMemo(() => {
        let result = users.map(u => ({
            ...u,
            ...(localUserUpdates[u.userId] || {})
        }));
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            result = result.filter(u =>
                (u.displayName || '').toLowerCase().includes(q) ||
                (u.userId || '').toLowerCase().includes(q) ||
                (u.email || '').toLowerCase().includes(q)
            );
        }
        if (roleFilter === 'admin') {
            result = result.filter(u => u.userId === currentUserId);
        } else if (roleFilter === 'moderator') {
            result = result.filter(u => adminConfig?.moderators?.includes(u.userId));
        } else if (roleFilter === 'user') {
            result = result.filter(u => u.userId !== currentUserId && !adminConfig?.moderators?.includes(u.userId));
        }

        if (planFilter !== 'all') {
            result = result.filter(u => getUserActivePlan(u) === planFilter);
        }
        result.sort((a, b) => {
            let aVal, bVal;
            switch (sortBy) {
                case 'displayName':
                    aVal = (a.displayName || '').toLowerCase();
                    bVal = (b.displayName || '').toLowerCase();
                    break;
                default:
                    aVal = a.totalCards || 0;
                    bVal = b.totalCards || 0;
            }
            return sortOrder === 'asc' ? (aVal > bVal ? 1 : -1) : (aVal < bVal ? 1 : -1);
        });
        return result;
    }, [users, searchQuery, sortBy, sortOrder, roleFilter, planFilter, adminConfig, currentUserId, creditRequests, localUserUpdates]);

    const handleDelete = async () => {
        if (!confirmDelete) return;
        setDeleting(true);
        try {
            if (deleteType === 'kanji') {
                const srsSnap = await getDocs(collection(db, `artifacts/${appId}/users/${confirmDelete.userId}/kanjiSRS`));
                const docsArray = srsSnap.docs;
                const batchSize = 500;
                for (let i = 0; i < docsArray.length; i += batchSize) {
                    const batch = writeBatch(db);
                    const chunk = docsArray.slice(i, i + batchSize);
                    chunk.forEach(docSnap => batch.delete(docSnap.ref));
                    await batch.commit();
                }
                setUsers(prev => prev.map(u => u.userId === confirmDelete.userId ? { ...u, kanjiTotal: 0, kanjiMastered: 0 } : u));
                if (selectedUser?.userId === confirmDelete.userId) {
                    setSelectedUser(prev => prev ? { ...prev, kanjiTotal: 0, kanjiMastered: 0 } : null);
                }
                setNotification({ type: 'success', message: `Đã xóa ${docsArray.length} dữ liệu Kanji SRS của ${confirmDelete.displayName}` });
            } else {
                if (onAdminDeleteUserData) await onAdminDeleteUserData(confirmDelete.userId);
                setUsers(prev => prev.filter(u => u.userId !== confirmDelete.userId));
                if (selectedUser?.userId === confirmDelete.userId) setSelectedUser(null);
                setNotification({ type: 'success', message: `Đã xóa toàn bộ dữ liệu ${confirmDelete.displayName}` });
            }
        } catch (e) {
            console.error('Error deleting:', e);
            setNotification({ type: 'error', message: 'Lỗi khi xóa: ' + e.message });
        } finally {
            setDeleting(false);
            setConfirmDelete(null);
            setDeleteType('all');
        }
    };

    const getUserPlans = (userId) => {
        return creditRequests
            .filter(r => r.userId === userId && r.status === 'approved')
            .sort((a, b) => {
                const aTime = a.processedAt?.toDate ? a.processedAt.toDate().getTime() : (a.processedAt || 0);
                const bTime = b.processedAt?.toDate ? b.processedAt.toDate().getTime() : (b.processedAt || 0);
                return bTime - aTime;
            });
    };

    const kanjiStats = useMemo(() => {
        if (!selectedUser) return null;
        const total = selectedUser.kanjiTotal || 0;
        const mastered = selectedUser.kanjiMastered || 0;
        const learning = Math.max(0, total - mastered);
        return { total, learning, mastered };
    }, [selectedUser]);

    const formatVND = (n) => new Intl.NumberFormat('vi-VN').format(n) + 'đ';

    const [isSyncingAllUsers, setIsSyncingAllUsers] = useState(false);

    const handleSyncUserByUidOrEmail = async (rawInput) => {
        if (!rawInput || !rawInput.trim() || !db || !publicStatsPath) return null;
        const input = rawInput.trim();
        setIsLoading(true);
        try {
            // Case 1: Search by Email across all settings/profile documents
            if (input.includes('@')) {
                const targetEmailLower = input.toLowerCase();
                let foundUid = null;
                let foundData = null;

                try {
                    // Try collectionGroup query for profile
                    const cgSnap = await getDocs(collectionGroup(db, 'settings'));
                    for (const docSnap of cgSnap.docs) {
                        if (docSnap.id === 'profile') {
                            const data = docSnap.data() || {};
                            if ((data.email || '').trim().toLowerCase() === targetEmailLower) {
                                foundUid = docSnap.ref.parent?.parent?.id;
                                foundData = data;
                                break;
                            }
                        }
                    }
                } catch (cgErr) {
                    console.warn('CollectionGroup search error:', cgErr);
                }

                if (foundUid && foundData) {
                    const userEmail = (foundData.email || input).trim();
                    const displayName = foundData.displayName || userEmail.split('@')[0] || 'Người học';
                    const userObj = {
                        userId: foundUid,
                        email: userEmail,
                        displayName: displayName,
                        photoURL: foundData.photoURL || '',
                        totalCards: foundData.totalCards || 0,
                        xp: foundData.xp || foundData.score || 0,
                        ...foundData
                    };
                    const statsRef = doc(db, publicStatsPath, foundUid);
                    await setDoc(statsRef, userObj, { merge: true });
                    setUsers(prev => {
                        const existingIdx = prev.findIndex(u => u.userId === foundUid);
                        if (existingIdx >= 0) {
                            const updated = [...prev];
                            updated[existingIdx] = { ...updated[existingIdx], ...userObj };
                            return updated;
                        }
                        return [userObj, ...prev];
                    });
                    setSelectedUser(userObj);
                    setNotification({ type: 'success', message: `🎉 Đã tìm thấy tài khoản "${displayName}" (${userEmail}) và đồng bộ vào danh sách Admin!` });
                    return userObj;
                } else {
                    setNotification({ type: 'warning', message: `Không tìm thấy tài khoản nào có email "${input}" trên hệ thống Firestore.` });
                    return null;
                }
            }

            // Case 2: Search by UID
            const profileRef = doc(db, `artifacts/${appId}/users/${input}/settings/profile`);
            const snap = await getDoc(profileRef);
            if (snap.exists()) {
                const pData = snap.data();
                const userEmail = (pData.email || '').trim();
                const displayName = pData.displayName || userEmail?.split('@')[0] || 'Người học';
                const userObj = {
                    userId: input,
                    email: userEmail,
                    displayName: displayName,
                    photoURL: pData.photoURL || '',
                    totalCards: pData.totalCards || 0,
                    xp: pData.xp || pData.score || 0,
                    ...pData
                };
                const statsRef = doc(db, publicStatsPath, input);
                await setDoc(statsRef, userObj, { merge: true });
                setUsers(prev => {
                    const existingIdx = prev.findIndex(u => u.userId === input);
                    if (existingIdx >= 0) {
                        const updated = [...prev];
                        updated[existingIdx] = { ...updated[existingIdx], ...userObj };
                        return updated;
                    }
                    return [userObj, ...prev];
                });
                setSelectedUser(userObj);
                setNotification({ type: 'success', message: `✅ Đã đồng bộ tài khoản "${displayName}" (${userEmail || input}) vào danh sách Admin!` });
                return userObj;
            } else {
                const userObj = {
                    userId: input,
                    email: '',
                    displayName: `User_${input.slice(0, 6)}`,
                    photoURL: '',
                    totalCards: 0,
                    xp: 0
                };
                const statsRef = doc(db, publicStatsPath, input);
                await setDoc(statsRef, userObj, { merge: true });
                setUsers(prev => [userObj, ...prev]);
                setSelectedUser(userObj);
                setNotification({ type: 'success', message: `✅ Đã tạo hồ sơ quản trị cho UID ${input}!` });
                return userObj;
            }
        } catch (e) {
            console.error('Error syncing user by input:', e);
            setNotification({ type: 'error', message: 'Lỗi đồng bộ người dùng: ' + e.message });
        } finally {
            setIsLoading(false);
        }
        return null;
    };

    const handleSyncAllUsersFromFirestore = async () => {
        if (!db || !publicStatsPath) return;
        setIsSyncingAllUsers(true);
        setNotification({ type: 'info', message: '🔄 Đang quét và đồng bộ toàn bộ tài khoản người dùng từ Firestore...' });

        try {
            const cgSnap = await getDocs(collectionGroup(db, 'settings'));
            let syncedCount = 0;
            const batchSize = 400;
            let currentBatch = writeBatch(db);
            let opCount = 0;
            const updatedUsersMap = new Map();

            for (const docSnap of cgSnap.docs) {
                if (docSnap.id === 'profile') {
                    const data = docSnap.data() || {};
                    const userUid = docSnap.ref.parent?.parent?.id;
                    if (userUid) {
                        const userEmail = (data.email || '').trim();
                        const displayName = data.displayName || (userEmail ? userEmail.split('@')[0] : 'Người học');
                        const userObj = {
                            userId: userUid,
                            email: userEmail,
                            displayName: displayName,
                            photoURL: data.photoURL || '',
                            updatedAt: Date.now(),
                            ...data
                        };

                        const statsRef = doc(db, publicStatsPath, userUid);
                        currentBatch.set(statsRef, userObj, { merge: true });
                        updatedUsersMap.set(userUid, userObj);
                        syncedCount++;
                        opCount++;

                        if (opCount >= batchSize) {
                            await currentBatch.commit();
                            currentBatch = writeBatch(db);
                            opCount = 0;
                        }
                    }
                }
            }

            if (opCount > 0) {
                await currentBatch.commit();
            }

            setNotification({
                type: 'success',
                message: `🎉 Quét hoàn tất! Đã đồng bộ đầy đủ ${syncedCount} tài khoản người dùng vào danh sách Admin.`
            });
        } catch (err) {
            console.error('Error syncing all users from Firestore:', err);
            if (err.message && (err.message.includes('permission') || err.message.includes('Missing or insufficient permissions'))) {
                setNotification({
                    type: 'error',
                    message: '⚠️ Firebase Console chưa bật luật collectionGroup. Bạn hãy vào Firebase Console > Rules để publish firestore.rules, hoặc bấm "Tìm & Đồng bộ Email / UID" và dán UID để đồng bộ ngay!'
                });
            } else {
                setNotification({ type: 'error', message: 'Lỗi quét đồng bộ: ' + err.message });
            }
        } finally {
            setIsSyncingAllUsers(false);
        }
    };

    return {
        users,
        setUsers,
        isLoading,
        searchQuery,
        setSearchQuery,
        sortBy,
        setSortBy,
        sortOrder,
        setSortOrder,
        selectedUser,
        setSelectedUser,
        handleSelectUser: setSelectedUser,
        selectedUserProfile,
        selectedUserPackageState,
        setSelectedUserPackageState,
        updatingUserPackage,
        loadingProfile,
        notification,
        setNotification,
        confirmDelete,
        setConfirmDelete,
        deleting,
        deleteType,
        setDeleteType,
        roleFilter,
        setRoleFilter,
        planFilter,
        setPlanFilter,
        creditRequests,
        localUserUpdates,
        setLocalUserUpdates,
        vouchers,
        expenses,
        globalNotifications,
        cacheConfig,
        getUserActivePlan,
        handleSaveUserPackage,
        stats,
        filteredUsers,
        handleDelete,
        getUserPlans,
        kanjiStats,
        formatVND,
        handleSyncUserByUidOrEmail,
        handleSyncAllUsersFromFirestore,
        isSyncingAllUsers
    };
};
