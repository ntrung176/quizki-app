// --- Admin Settings & Permissions Utilities ---
import { doc, getDoc, setDoc, updateDoc, onSnapshot, collection, addDoc, getDocs, deleteDoc, serverTimestamp, query, orderBy, increment, runTransaction } from 'firebase/firestore';
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
    bankId: '',                         // Mã ngân hàng VietQR (VD: MB, VCB, TCB)
    bankAccountNo: '',                  // Số tài khoản
    bankAccountName: '',                // Tên tài khoản
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

// Admin manually add credits to a user (uses atomic increment)
export const addCreditsToUser = async (userId, credits) => {
    try {
        const profileRef = doc(db, `artifacts/${appId}/users/${userId}/settings/profile`);
        const profileSnap = await getDoc(profileRef);
        if (profileSnap.exists()) {
            await updateDoc(profileRef, { aiCreditsRemaining: increment(credits) });
        } else {
            await setDoc(profileRef, { aiCreditsRemaining: credits }, { merge: true });
        }
        return true;
    } catch (e) {
        console.error('Add credits error:', e);
        return false;
    }
};

// ============== PAYMENT SECURITY ==============
const getProcessedTxPath = () => `artifacts/${appId}/processedTransactions`;

/**
 * Check if a transaction ID has already been processed (anti-replay)
 * @param {string} transactionId - Unique transaction ID from SePay
 * @returns {boolean} true if already processed
 */
export const isTransactionProcessed = async (transactionId) => {
    if (!transactionId) return false;
    try {
        const txRef = doc(db, getProcessedTxPath(), String(transactionId));
        const snap = await getDoc(txRef);
        return snap.exists();
    } catch (e) {
        console.error('Check transaction error:', e);
        return false; // Fail open but log
    }
};

/**
 * Mark a transaction as processed and atomically add credits
 * Uses Firestore transaction to ensure atomicity (prevents double-spend)
 * @param {string} transactionId - Unique SePay transaction ID
 * @param {string} orderCode - Our order code
 * @param {string} userId - User receiving credits
 * @param {number} credits - Number of credits to add
 * @param {number} amount - Payment amount in VND
 * @returns {{ success: boolean, error?: string }}
 */
export const processPaymentSecurely = async (transactionId, orderCode, userId, credits, amount) => {
    if (!transactionId || !orderCode || !userId || !credits) {
        return { success: false, error: 'Missing required parameters' };
    }

    const txRef = doc(db, getProcessedTxPath(), String(transactionId));
    const profileRef = doc(db, `artifacts/${appId}/users/${userId}/settings/profile`);

    try {
        const result = await runTransaction(db, async (transaction) => {
            // Step 1: Check if this transaction was already processed
            const txSnap = await transaction.get(txRef);
            if (txSnap.exists()) {
                throw new Error('DUPLICATE_TRANSACTION');
            }

            // Step 2: Read current credits
            const profileSnap = await transaction.get(profileRef);
            const currentCredits = profileSnap.exists() ? (profileSnap.data().aiCreditsRemaining || 0) : 0;

            // Step 3: Mark transaction as processed
            transaction.set(txRef, {
                transactionId: String(transactionId),
                orderCode,
                userId,
                credits,
                amount,
                processedAt: new Date().toISOString(),
                timestamp: Date.now(),
            });

            // Step 4: Update credits atomically
            if (profileSnap.exists()) {
                transaction.update(profileRef, { aiCreditsRemaining: currentCredits + credits });
            } else {
                transaction.set(profileRef, { aiCreditsRemaining: credits }, { merge: true });
            }

            return { newCredits: currentCredits + credits };
        });

        console.log(`✅ Payment processed securely: TX#${transactionId}, +${credits} credits`);
        return { success: true, newCredits: result.newCredits };
    } catch (e) {
        if (e.message === 'DUPLICATE_TRANSACTION') {
            console.warn(`⚠️ Duplicate transaction blocked: TX#${transactionId}`);
            return { success: false, error: 'Giao dịch này đã được xử lý trước đó' };
        }
        console.error('Process payment error:', e);
        return { success: false, error: e.message };
    }
};

// ============== VOUCHER MANAGEMENT ==============
const getVouchersPath = () => `artifacts/${appId}/vouchers`;

/**
 * Admin tạo voucher mới
 * @param {Object} voucherData - { code, discountType, discountValue, maxUses, expiresAt, description }
 * @param {string} adminUserId
 */
export const createVoucher = async (voucherData, adminUserId) => {
    try {
        const code = voucherData.code.trim().toUpperCase();
        // Dùng code làm document ID để dễ lookup
        const voucherRef = doc(db, getVouchersPath(), code);
        const existing = await getDoc(voucherRef);
        if (existing.exists()) {
            return { success: false, error: 'Mã voucher đã tồn tại' };
        }
        await setDoc(voucherRef, {
            code,
            discountType: voucherData.discountType || 'percent', // 'percent' | 'fixed'
            discountValue: Number(voucherData.discountValue) || 0, // % hoặc VND
            maxUses: Number(voucherData.maxUses) || 0, // 0 = không giới hạn
            usedCount: 0,
            usedBy: [], // [{ userId, usedAt }]
            expiresAt: voucherData.expiresAt || null, // timestamp hoặc null
            description: voucherData.description || '',
            active: true,
            createdAt: serverTimestamp(),
            createdBy: adminUserId,
        });
        return { success: true };
    } catch (e) {
        console.error('Create voucher error:', e);
        return { success: false, error: e.message };
    }
};

/**
 * Admin subscribe danh sách voucher (realtime)
 */
export const subscribeVouchers = (callback) => {
    try {
        const colRef = collection(db, getVouchersPath());
        const q = query(colRef, orderBy('createdAt', 'desc'));
        return onSnapshot(q, (snapshot) => {
            const vouchers = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
            callback(vouchers);
        });
    } catch (e) {
        console.error('Subscribe vouchers error:', e);
        return null;
    }
};

/**
 * Admin xóa voucher
 */
export const deleteVoucher = async (voucherCode) => {
    try {
        await deleteDoc(doc(db, getVouchersPath(), voucherCode));
        return true;
    } catch (e) {
        console.error('Delete voucher error:', e);
        return false;
    }
};

/**
 * Admin bật/tắt voucher
 */
export const toggleVoucher = async (voucherCode, active) => {
    try {
        await updateDoc(doc(db, getVouchersPath(), voucherCode), { active });
        return true;
    } catch (e) {
        console.error('Toggle voucher error:', e);
        return false;
    }
};

/**
 * User nhập mã voucher → validate và trả về thông tin giảm giá
 * @param {string} code - Mã voucher
 * @param {string} userId - ID người dùng
 * @returns {{ valid, voucher, error }}
 */
export const validateVoucher = async (code, userId) => {
    try {
        const voucherCode = code.trim().toUpperCase();
        if (!voucherCode) return { valid: false, error: 'Vui lòng nhập mã voucher' };

        const voucherRef = doc(db, getVouchersPath(), voucherCode);
        const snap = await getDoc(voucherRef);

        if (!snap.exists()) {
            return { valid: false, error: 'Mã voucher không tồn tại' };
        }

        const voucher = snap.data();

        // Check active
        if (!voucher.active) {
            return { valid: false, error: 'Mã voucher đã hết hiệu lực' };
        }

        // Check expiry
        if (voucher.expiresAt) {
            const expiry = voucher.expiresAt.toDate ? voucher.expiresAt.toDate() : new Date(voucher.expiresAt);
            if (new Date() > expiry) {
                return { valid: false, error: 'Mã voucher đã hết hạn' };
            }
        }

        // Check max uses
        if (voucher.maxUses > 0 && voucher.usedCount >= voucher.maxUses) {
            return { valid: false, error: 'Mã voucher đã hết lượt sử dụng' };
        }

        // Check if user already used
        if (voucher.usedBy?.some(u => u.userId === userId)) {
            return { valid: false, error: 'Bạn đã sử dụng mã voucher này rồi' };
        }

        return { valid: true, voucher: { ...voucher, code: voucherCode } };
    } catch (e) {
        console.error('Validate voucher error:', e);
        return { valid: false, error: 'Lỗi kiểm tra voucher' };
    }
};

/**
 * Tính giá sau giảm
 */
export const calculateDiscountedPrice = (originalPrice, voucher) => {
    if (!voucher) return originalPrice;
    if (voucher.discountType === 'percent') {
        const discount = Math.min(voucher.discountValue, 100);
        return Math.max(0, Math.round(originalPrice * (1 - discount / 100)));
    }
    if (voucher.discountType === 'fixed') {
        return Math.max(0, originalPrice - voucher.discountValue);
    }
    return originalPrice;
};

/**
 * Ghi nhận sử dụng voucher (gọi khi thanh toán thành công)
 */
export const useVoucher = async (voucherCode, userId) => {
    try {
        const voucherRef = doc(db, getVouchersPath(), voucherCode);
        const snap = await getDoc(voucherRef);
        if (!snap.exists()) return false;

        const data = snap.data();
        await updateDoc(voucherRef, {
            usedCount: (data.usedCount || 0) + 1,
            usedBy: [...(data.usedBy || []), { userId, usedAt: new Date().toISOString() }],
        });
        return true;
    } catch (e) {
        console.error('Use voucher error:', e);
        return false;
    }
};

// ============== EXPENSE / BUSINESS MANAGEMENT ==============
const getExpensesPath = () => `artifacts/${appId}/expenses`;

/**
 * Add a new expense entry
 * @param {Object} expenseData - { name, amount, type: 'fixed'|'operating'|'other', recurring: 'monthly'|'yearly'|'once', description, month }
 * @param {string} adminUserId
 */
export const addExpense = async (expenseData, adminUserId) => {
    try {
        const colRef = collection(db, getExpensesPath());
        await addDoc(colRef, {
            name: expenseData.name || '',
            amount: Number(expenseData.amount) || 0,
            type: expenseData.type || 'operating', // 'fixed' | 'operating' | 'other'
            recurring: expenseData.recurring || 'monthly', // 'monthly' | 'yearly' | 'once'
            description: expenseData.description || '',
            month: expenseData.month || new Date().toISOString().slice(0, 7), // YYYY-MM
            createdAt: serverTimestamp(),
            createdBy: adminUserId,
        });
        return { success: true };
    } catch (e) {
        console.error('Add expense error:', e);
        return { success: false, error: e.message };
    }
};

/**
 * Subscribe to all expenses (realtime)
 */
export const subscribeExpenses = (callback) => {
    try {
        const colRef = collection(db, getExpensesPath());
        const q = query(colRef, orderBy('createdAt', 'desc'));
        return onSnapshot(q, (snapshot) => {
            const expenses = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
            callback(expenses);
        });
    } catch (e) {
        console.error('Subscribe expenses error:', e);
        return null;
    }
};

/**
 * Delete an expense
 */
export const deleteExpense = async (expenseId) => {
    try {
        await deleteDoc(doc(db, getExpensesPath(), expenseId));
        return true;
    } catch (e) {
        console.error('Delete expense error:', e);
        return false;
    }
};

