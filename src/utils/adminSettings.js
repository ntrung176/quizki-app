// --- Admin Settings & Permissions Utilities ---
import { doc, getDoc, setDoc, updateDoc, onSnapshot, collection, addDoc, getDocs, deleteDoc, serverTimestamp, query, orderBy } from 'firebase/firestore';
import { db, appId } from '../config/firebase';

// Firestore path for admin settings
const getAdminSettingsPath = () => `artifacts/${appId}/settings`;
const ADMIN_CONFIG_DOC = 'adminConfig';

// Default AI Credit packages (admin can customize)
export const DEFAULT_AI_PACKAGES = [
    { id: 'starter', name: 'Starter', cards: 500, originalPrice: 69000, salePrice: 39000 },
    { id: 'popular', name: 'Popular', cards: 1000, originalPrice: 129000, salePrice: 59000 },
    { id: 'best_value', name: 'Best Value', cards: 3000, originalPrice: 299000, salePrice: 99000 },
    { id: 'ultimate', name: 'Ultimate', cards: 10000, originalPrice: 699000, salePrice: 199000 },
];

// Default admin config
const DEFAULT_ADMIN_CONFIG = {
    // AI Settings
    aiEnabled: true,
    aiProvider: 'auto',
    openRouterModel: 'google/gemini-2.5-flash',
    aiAllowedUsers: [],
    aiAllowAll: false,
    aiCreditPackages: DEFAULT_AI_PACKAGES,

    // Payment Settings (SePay)
    sepayToken: '',                     // SePay API Token
    bankId: 'MB',                       // Mã ngân hàng VietQR
    bankAccountNo: '0123456789',        // Số tài khoản
    bankAccountName: 'NGUYEN TRUNG',    // Tên tài khoản
    autoPayment: false,                 // Tự động xác nhận thanh toán qua SePay

    // Moderator list
    moderators: [],

    // Metadata
    updatedAt: null,
    updatedBy: null
};

// ============== READ SETTINGS ==============

// Load admin config once
export const loadAdminConfig = async () => {
    try {
        const ref = doc(db, getAdminSettingsPath(), ADMIN_CONFIG_DOC);
        const snap = await getDoc(ref);
        if (snap.exists()) {
            return { ...DEFAULT_ADMIN_CONFIG, ...snap.data() };
        }
        return { ...DEFAULT_ADMIN_CONFIG };
    } catch (e) {
        console.error('Error loading admin config:', e);
        return { ...DEFAULT_ADMIN_CONFIG };
    }
};

// Subscribe to admin config changes (realtime)
export const subscribeAdminConfig = (callback) => {
    try {
        const ref = doc(db, getAdminSettingsPath(), ADMIN_CONFIG_DOC);
        return onSnapshot(ref, (snap) => {
            if (snap.exists()) {
                const config = { ...DEFAULT_ADMIN_CONFIG, ...snap.data() };
                console.log('✅ Admin config loaded:', { aiEnabled: config.aiEnabled, aiAllowAll: config.aiAllowAll, aiAllowedUsers: config.aiAllowedUsers?.length || 0, moderators: config.moderators?.length || 0 });
                callback(config);
            } else {
                console.log('ℹ️ Admin config not found, using defaults');
                callback({ ...DEFAULT_ADMIN_CONFIG });
            }
        }, (error) => {
            console.error('❌ Error subscribing to admin config:', error.code, error.message);
            console.warn('⚠️ Falling back to default admin config. If this is a permissions error, update Firestore rules to allow reading artifacts/{appId}/settings/*');
            callback({ ...DEFAULT_ADMIN_CONFIG });
        });
    } catch (e) {
        console.error('❌ Error setting up admin config subscription:', e);
        callback({ ...DEFAULT_ADMIN_CONFIG });
        return () => { };
    }
};

// ============== WRITE SETTINGS ==============

// Save entire admin config
export const saveAdminConfig = async (config, updatedByUserId) => {
    try {
        const ref = doc(db, getAdminSettingsPath(), ADMIN_CONFIG_DOC);
        await setDoc(ref, {
            ...config,
            updatedAt: Date.now(),
            updatedBy: updatedByUserId
        }, { merge: true });
        return true;
    } catch (e) {
        console.error('Error saving admin config:', e);
        return false;
    }
};

// Update specific fields
export const updateAdminConfig = async (fields, updatedByUserId) => {
    try {
        const ref = doc(db, getAdminSettingsPath(), ADMIN_CONFIG_DOC);
        await setDoc(ref, {
            ...fields,
            updatedAt: Date.now(),
            updatedBy: updatedByUserId
        }, { merge: true });
        return true;
    } catch (e) {
        console.error('Error updating admin config:', e);
        return false;
    }
};

// ============== PERMISSION CHECKS ==============

// Check if a user can use AI features
export const canUseAI = (adminConfig, userId, isAdmin) => {
    if (!adminConfig) return false;
    if (!adminConfig.aiEnabled) return false;

    // Admin always has access
    if (isAdmin) return true;

    // Moderators always have access
    if (adminConfig.moderators?.includes(userId)) return true;

    // Check if all users are allowed
    if (adminConfig.aiAllowAll) return true;

    // Check if this specific user is allowed
    if (adminConfig.aiAllowedUsers?.includes(userId)) return true;

    return false;
};

// Check if a user is a moderator
export const isModerator = (adminConfig, userId) => {
    if (!adminConfig) return false;
    return adminConfig.moderators?.includes(userId) || false;
};

// Check if user has admin-like privileges (admin or moderator)
export const hasAdminPrivileges = (adminConfig, userId, isAdmin) => {
    if (isAdmin) return true;
    return isModerator(adminConfig, userId);
};

// ============== MODERATOR MANAGEMENT ==============

// Add a moderator
export const addModerator = async (adminConfig, userId, updatedByUserId) => {
    const currentMods = adminConfig.moderators || [];
    if (currentMods.includes(userId)) return true; // Already a mod
    return updateAdminConfig({
        moderators: [...currentMods, userId]
    }, updatedByUserId);
};

// Remove a moderator
export const removeModerator = async (adminConfig, userId, updatedByUserId) => {
    const currentMods = adminConfig.moderators || [];
    return updateAdminConfig({
        moderators: currentMods.filter(id => id !== userId)
    }, updatedByUserId);
};

// ============== AI USER MANAGEMENT ==============

// Grant AI access to a specific user
export const grantAIAccess = async (adminConfig, userId, updatedByUserId) => {
    const currentUsers = adminConfig.aiAllowedUsers || [];
    if (currentUsers.includes(userId)) return true;
    return updateAdminConfig({
        aiAllowedUsers: [...currentUsers, userId]
    }, updatedByUserId);
};

// Revoke AI access from a specific user
export const revokeAIAccess = async (adminConfig, userId, updatedByUserId) => {
    const currentUsers = adminConfig.aiAllowedUsers || [];
    return updateAdminConfig({
        aiAllowedUsers: currentUsers.filter(id => id !== userId)
    }, updatedByUserId);
};

export const AI_PROVIDER_OPTIONS = [
    { value: 'auto', label: 'Tự động (thử tất cả)', description: 'Groq → Gemini → OpenRouter' },
    { value: 'groq', label: 'Groq (Llama 3.3)', description: 'Nhanh, miễn phí, chất lượng cao' },
    { value: 'gemini', label: 'Google Gemini', description: 'Flash Lite / Flash / 1.5 Flash' },
    { value: 'openrouter', label: 'OpenRouter (Trả phí)', description: 'Gemini 2.5 Flash' },
];

export const OPENROUTER_MODELS = [
    { value: 'google/gemini-2.5-flash', label: 'Gemini 2.5 Flash' },
];

// ============== AI CREDIT REQUESTS ==============
const getCreditRequestsPath = () => `artifacts/${appId}/creditRequests`;

// User submits a credit purchase request
export const submitCreditRequest = async (userId, userName, userEmail, packageInfo) => {
    try {
        const colRef = collection(db, getCreditRequestsPath());
        await addDoc(colRef, {
            userId,
            userName: userName || '',
            userEmail: userEmail || '',
            packageId: packageInfo.id,
            packageName: packageInfo.name,
            credits: packageInfo.cards,
            amount: packageInfo.salePrice,
            status: 'pending', // 'pending' | 'approved' | 'rejected'
            createdAt: serverTimestamp(),
            processedAt: null,
            processedBy: null
        });
        return true;
    } catch (e) {
        console.error('Submit credit request error:', e);
        return false;
    }
};

// Admin loads all pending credit requests
export const subscribeCreditRequests = (callback) => {
    try {
        const colRef = collection(db, getCreditRequestsPath());
        const q = query(colRef, orderBy('createdAt', 'desc'));
        return onSnapshot(q, (snapshot) => {
            const requests = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
            callback(requests);
        });
    } catch (e) {
        console.error('Subscribe credit requests error:', e);
        return null;
    }
};

// Admin approves a credit request → add credits to user
export const approveCreditRequest = async (requestId, userId, credits, adminUserId) => {
    try {
        // Update user profile credits
        const profileRef = doc(db, `artifacts/${appId}/users/${userId}/settings/profile`);
        const profileSnap = await getDoc(profileRef);
        const currentCredits = profileSnap.exists() ? (profileSnap.data().aiCreditsRemaining || 0) : 0;
        await updateDoc(profileRef, { aiCreditsRemaining: currentCredits + credits });

        // Mark request as approved
        const reqRef = doc(db, getCreditRequestsPath(), requestId);
        await updateDoc(reqRef, { status: 'approved', processedAt: serverTimestamp(), processedBy: adminUserId });
        return true;
    } catch (e) {
        console.error('Approve credit request error:', e);
        return false;
    }
};

// Admin rejects a credit request
export const rejectCreditRequest = async (requestId, adminUserId) => {
    try {
        const reqRef = doc(db, getCreditRequestsPath(), requestId);
        await updateDoc(reqRef, { status: 'rejected', processedAt: serverTimestamp(), processedBy: adminUserId });
        return true;
    } catch (e) {
        console.error('Reject credit request error:', e);
        return false;
    }
};

// Admin manually add credits to a user
export const addCreditsToUser = async (userId, credits) => {
    try {
        const profileRef = doc(db, `artifacts/${appId}/users/${userId}/settings/profile`);
        const profileSnap = await getDoc(profileRef);
        const currentCredits = profileSnap.exists() ? (profileSnap.data().aiCreditsRemaining || 0) : 0;
        await updateDoc(profileRef, { aiCreditsRemaining: currentCredits + credits });
        return true;
    } catch (e) {
        console.error('Add credits error:', e);
        return false;
    }
};
