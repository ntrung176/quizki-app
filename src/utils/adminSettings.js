// --- Admin Settings & Permissions Utilities ---
import { doc, getDoc, setDoc, updateDoc, onSnapshot, collection, addDoc, deleteDoc, serverTimestamp, query, orderBy, increment, arrayUnion } from 'firebase/firestore'
import { db, appId } from '../config/firebase';
// Firestore path for admin settings
const getAdminSettingsPath = () => `artifacts/${appId}/settings`;
const ADMIN_CONFIG_DOC = 'adminConfig';
// Default AI Credit packages (admin can customize)
export const DEFAULT_AI_PACKAGES = [];
export const DEFAULT_SPECIALIZED_PACKAGES = [
    {
        id: 'premium_1m',
        name: 'Gói Premium 1 Tháng',
        icon: 'Crown',
        description: 'Mở khóa toàn bộ tính năng cao cấp và học phần chuyên sâu trong thời hạn 1 tháng.',
        originalPrice: 39000,
        salePrice: 19000,
        unlockedFeatures: [
            '[Premium] Mở khóa tất cả tính năng: Từ vựng Zen, Ngữ pháp Zen, Kanji Zen, Luyện thi JLPT',
            '[Premium] Thuật toán Spaced Repetition (SRS) nhắc nhở học thông minh tự động',
            '🤖 Không giới hạn lượt tạo từ vựng và câu ví dụ thông minh bằng AI',
            '🔊 Phát âm chuẩn giọng đọc bản xứ không giới hạn'
        ]
    },
    {
        id: 'premium_1y',
        name: 'Gói Premium 1 Năm',
        icon: 'Crown',
        description: 'Mở khóa toàn bộ tính năng cao cấp và học phần chuyên sâu trong thời hạn 1 năm.',
        originalPrice: 399000,
        salePrice: 199000,
        unlockedFeatures: [
            '[Premium] Mở khóa tất cả tính năng: Từ vựng Zen, Ngữ pháp Zen, Kanji Zen, Luyện thi JLPT',
            '[Premium] Thuật toán Spaced Repetition (SRS) nhắc nhở học thông minh tự động',
            '🤖 Không giới hạn lượt tạo từ vựng và câu ví dụ thông minh bằng AI',
            '🔊 Phát âm chuẩn giọng đọc bản xứ không giới hạn'
        ]
    },
    {
        id: 'premium_3y',
        name: 'Gói Premium 3 Năm',
        icon: 'Crown',
        description: 'Mở khóa toàn bộ tính năng cao cấp và học phần chuyên sâu trong thời hạn 3 năm. Tiết kiệm tối đa.',
        originalPrice: 799000,
        salePrice: 399000,
        unlockedFeatures: [
            '[Premium] Mở khóa tất cả tính năng: Từ vựng Zen, Ngữ pháp Zen, Kanji Zen, Luyện thi JLPT',
            '[Premium] Thuật toán Spaced Repetition (SRS) nhắc nhở học thông minh tự động',
            '🤖 Không giới hạn lượt tạo từ vựng và câu ví dụ thông minh bằng AI',
            '🔊 Phát âm chuẩn giọng đọc bản xứ không giới hạn',
            '⚡ Ưu tiên hỗ trợ học tập và xử lý kỹ thuật 24/7'
        ]
    }
];
// Default admin config
const DEFAULT_ADMIN_CONFIG = {
    // AI Settings
    aiEnabled: true,
    aiProvider: 'openrouter',
    openRouterModel: 'google/gemini-2.5-flash',
    aiFeatureModels: {
        vocab_gen: 'openai/gpt-4o-mini',
        grammar_gen: 'google/gemini-2.5-flash',
        vocab_sino_viet: 'google/gemini-3.1-flash-lite',
        more_examples: 'openai/gpt-4o-mini',
        ocr_image: 'openai/gpt-4o-mini',
        grammar_check: 'openai/gpt-4o-mini',
        kaiwa_agent: 'google/gemini-2.5-flash'
    },
    aiAllowedUsers: [],
    aiAllowAll: false,
    aiCreditPackages: DEFAULT_AI_PACKAGES,
    specializedPackages: DEFAULT_SPECIALIZED_PACKAGES,
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
        return onSnapshot(ref, { includeMetadataChanges: true }, (snap) => {
            if (snap.exists()) {
                const config = { ...DEFAULT_ADMIN_CONFIG, ...snap.data(), _fromCache: snap.metadata.fromCache };
                console.log(`✅ Admin config loaded (${snap.metadata.fromCache ? 'cache' : 'server'}):`, { aiEnabled: config.aiEnabled, aiAllowAll: config.aiAllowAll, aiAllowedUsers: config.aiAllowedUsers?.length || 0, moderators: config.moderators?.length || 0 });
                callback(config);
            } else {
                console.log('ℹ️ Admin config not found, using defaults');
                callback({ ...DEFAULT_ADMIN_CONFIG, _fromCache: false });
            }
        }, (error) => {
            console.error('❌ Error subscribing to admin config:', error.code, error.message);
            console.warn('⚠️ Falling back to default admin config. If this is a permissions error, update Firestore rules to allow reading artifacts/{appId}/settings/*');
            callback({ ...DEFAULT_ADMIN_CONFIG, _fromCache: false });
        });
    } catch (e) {
        console.error('❌ Error setting up admin config subscription:', e);
        callback({ ...DEFAULT_ADMIN_CONFIG, _fromCache: false });
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
    { value: 'openrouter', label: 'OpenRouter (Gemini / OpenAI / DeepSeek / Llama)', description: 'Các mô hình AI hàng đầu qua OpenRouter' },
];
export const OPENROUTER_MODELS = [
    { value: 'google/gemini-2.5-flash', label: 'Gemini 2.5 Flash' },
    { value: 'google/gemini-3.1-flash-lite', label: 'Gemini 3.1 Flash-Lite' },
    { value: 'google/gemini-2.5-pro', label: 'Gemini 2.5 Pro' },
    { value: 'deepseek/deepseek-chat', label: 'DeepSeek V3' },
    { value: 'openai/gpt-4o-mini', label: 'GPT-4o Mini' },
    { value: 'openai/gpt-4o', label: 'GPT-4o' },
    { value: 'anthropic/claude-sonnet-4.6', label: 'Claude Sonnet 4.6' },
    { value: 'anthropic/claude-sonnet-4.5', label: 'Claude Sonnet 4.5' },
    { value: 'anthropic/claude-sonnet-4', label: 'Claude Sonnet 4' },
    { value: '~anthropic/claude-sonnet-latest', label: 'Claude Sonnet Latest' },
    { value: 'anthropic/claude-3.5-haiku', label: 'Claude 3.5 Haiku' },
    { value: 'anthropic/claude-3.5-sonnet', label: 'Claude 3.5 Sonnet (Tự động chuyển sang Sonnet 4.6)' },
    { value: 'meta-llama/llama-3.1-8b-instruct', label: 'Llama 3.1 8B' },
];
export const AI_FEATURES = [
    { id: 'vocab_gen', label: 'Tạo từ vựng (Vocab Gen)', description: 'Tạo nghĩa, âm Hán Việt, ví dụ và ngữ cảnh cho thẻ từ vựng mới.' },
    { id: 'grammar_gen', label: 'Tạo ngữ pháp (Grammar Gen)', description: 'Tạo giải thích cấu trúc, nghĩa, ví dụ và ngữ cảnh cho thẻ ngữ pháp mới.' },
    { id: 'vocab_sino_viet', label: 'Dịch Hán Việt tự động', description: 'Tự động tra cứu và dịch âm Hán Việt cho từ vựng từ sách.' },
    { id: 'more_examples', label: 'Tạo thêm ví dụ', description: 'Tạo thêm câu ví dụ tiếng Nhật tự nhiên kèm nghĩa tiếng Việt theo ngữ cảnh.' },
    { id: 'ocr_image', label: 'Quét chữ từ ảnh (OCR)', description: 'Trích xuất danh sách từ vựng tiếng Nhật từ hình ảnh tải lên.' },
    { id: 'grammar_check', label: 'Chấm điểm/Phân tích Ngữ pháp', description: 'Chấm điểm câu dịch, phân tích lỗi sai và đối chiếu ngữ pháp.' },
    { id: 'kaiwa_agent', label: 'Phòng Kaiwa AI (AI Agent)', description: 'Mô hình AI đóng vai giáo viên bản xứ tương tác hội thoại và sửa lỗi phát âm.' },
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
            credits: packageInfo.cards !== undefined ? packageInfo.cards : ('specialized:' + packageInfo.id),
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

// Create a pending payment request using orderCode as the Document ID for Webhook tracking
export const createPendingAutoPayment = async (orderCode, userId, userName, userEmail, packageInfo) => {
    try {
        const docRef = doc(db, getCreditRequestsPath(), orderCode);
        await setDoc(docRef, {
            userId,
            userName: userName || '',
            userEmail: userEmail || '',
            packageId: packageInfo.id,
            packageName: packageInfo.name,
            credits: packageInfo.cards !== undefined ? packageInfo.cards : ('specialized:' + packageInfo.id),
            amount: packageInfo.salePrice,
            status: 'pending', // 'pending' | 'approved' | 'rejected'
            orderCode,
            createdAt: serverTimestamp(),
            processedAt: null,
            processedBy: null
        });
        return true;
    } catch (e) {
        console.error('Create pending auto payment error:', e);
        return false;
    }
};
/**
 * Submit và tự động approve credit request (dùng cho thanh toán tự động qua SePay)
 * Ghi status='approved' ngay để admin dashboard hiển thị đúng doanh thu
 */
export const submitAndApproveCreditRequest = async (userId, userName, userEmail, packageInfo, transactionId) => {
    try {
        const colRef = collection(db, getCreditRequestsPath());
        await addDoc(colRef, {
            userId,
            userName: userName || '',
            userEmail: userEmail || '',
            packageId: packageInfo.id,
            packageName: packageInfo.name,
            credits: packageInfo.cards !== undefined ? packageInfo.cards : ('specialized:' + packageInfo.id),
            amount: packageInfo.salePrice,
            status: 'approved', // Tự động approve vì đã xác nhận qua SePay
            autoApproved: true,  // Đánh dấu là tự động duyệt
            transactionId: transactionId || null,
            createdAt: serverTimestamp(),
            processedAt: serverTimestamp(),
            processedBy: 'sepay_auto',
        });
        return true;
    } catch (e) {
        console.error('Submit & approve credit request error:', e);
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
const approveCreditRequest = async (requestId, userId, credits, adminUserId) => {
    try {
        // Update user profile credits or unlock specialized package
        const profileRef = doc(db, `artifacts/${appId}/users/${userId}/settings/profile`);
        if (typeof credits === 'string' && credits.startsWith('specialized:')) {
            const packageId = credits.replace('specialized:', '');
            if (packageId.startsWith('premium')) {
                const profileSnap = await getDoc(profileRef);
                const currentCredits = profileSnap.exists() ? (profileSnap.data().aiCreditsRemaining || 0) : 0;
                const bonusCredits = packageId === 'premium_3y' ? 6000 : (packageId === 'premium_1y' ? 2000 : (packageId === 'premium_1m' ? 200 : 0));
                
                // Calculate expiration date (extending if already active)
                const durationMs = packageId === 'premium_3y' ? 3 * 365 * 24 * 60 * 60 * 1000 : (packageId === 'premium_1y' ? 365 * 24 * 60 * 60 * 1000 : 30 * 24 * 60 * 60 * 1000);
                const currentExpiry = profileSnap.exists() ? (profileSnap.data().premiumExpiresAt || 0) : 0;
                const currentExpiryMs = currentExpiry?.toDate ? currentExpiry.toDate().getTime() : Number(currentExpiry || 0);
                const baseTime = currentExpiryMs > Date.now() ? currentExpiryMs : Date.now();
                const premiumExpiresAt = baseTime + durationMs;

                await setDoc(profileRef, {
                    unlockedSpecializedPackages: arrayUnion(packageId, 'premium', 'vocab_zen', 'grammar_zen', 'kanji_zen', 'jlpt_prep'),
                    isPremiumUnlocked: true,
                    aiCreditsRemaining: currentCredits + bonusCredits,
                    premiumExpiresAt
                }, { merge: true });
            } else {
                await setDoc(profileRef, {
                    unlockedSpecializedPackages: arrayUnion(packageId)
                }, { merge: true });
            }
        } else {
            const profileSnap = await getDoc(profileRef);
            const currentCredits = profileSnap.exists() ? (profileSnap.data().aiCreditsRemaining || 0) : 0;
            await updateDoc(profileRef, { aiCreditsRemaining: currentCredits + Number(credits) });
        }
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
const rejectCreditRequest = async (requestId, adminUserId) => {
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
const addCreditsToUser = async (userId, credits) => {
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
/**
 * Admin manually applies a package (Premium, AI, or specialized) to a user
 */
export const manuallyApplyPackageToUser = async (userId, userName, userEmail, packageInfo, adminUserId) => {
    try {
        // 1. Update user profile settings
        const profileRef = doc(db, `artifacts/${appId}/users/${userId}/settings/profile`);
        const publicStatsRef = doc(db, `artifacts/${appId}/public/data/userStats/${userId}`);
        let creditsValue;
        if (packageInfo.type === 'premium') {
            creditsValue = 'specialized:' + packageInfo.id;
            const profileSnap = await getDoc(profileRef);
            const currentCredits = profileSnap.exists() ? (profileSnap.data().aiCreditsRemaining || 0) : 0;
            const bonusCredits = packageInfo.id === 'premium_3y' ? 6000 : (packageInfo.id === 'premium_1y' ? 2000 : (packageInfo.id === 'premium_1m' ? 200 : 0));
            
            // Calculate expiration date (extending if already active)
            const durationMs = packageInfo.id === 'premium_3y' ? 3 * 365 * 24 * 60 * 60 * 1000 : (packageInfo.id === 'premium_1y' ? 365 * 24 * 60 * 60 * 1000 : 30 * 24 * 60 * 60 * 1000);
            const currentExpiry = profileSnap.exists() ? (profileSnap.data().premiumExpiresAt || 0) : 0;
            const currentExpiryMs = currentExpiry?.toDate ? currentExpiry.toDate().getTime() : Number(currentExpiry || 0);
            const baseTime = currentExpiryMs > Date.now() ? currentExpiryMs : Date.now();
            const premiumExpiresAt = baseTime + durationMs;

            const updateFields = {
                unlockedSpecializedPackages: ['premium_1m', 'premium_1y', 'premium_3y', 'premium', 'vocab_zen', 'grammar_zen', 'kanji_zen', 'jlpt_prep'].filter(p => p === packageInfo.id || !['premium_1m', 'premium_1y', 'premium_3y'].includes(p)),
                isPremiumUnlocked: true,
                aiCreditsRemaining: currentCredits + bonusCredits,
                premiumExpiresAt
            };

            await setDoc(profileRef, updateFields, { merge: true });

            // Check and apply referral rewards for referrer
            try {
                const { checkAndApplyReferralRewards } = await import('./referralService');
                await checkAndApplyReferralRewards(userId, userName || 'Người học');
            } catch (refErr) {
                console.error('Lỗi cộng thưởng giới thiệu:', refErr);
            }

            // Sync to public stats for instant list update
            try {
                await setDoc(publicStatsRef, {
                    unlockedSpecializedPackages: updateFields.unlockedSpecializedPackages,
                    isPremiumUnlocked: true,
                    isPremium: true,
                    premiumExpiresAt
                }, { merge: true });
            } catch (statsErr) {
                console.warn('Không có quyền cập nhật userStats trực tiếp (sẽ tự động đồng bộ khi user online):', statsErr);
            }
        } else if (packageInfo.type === 'specialized') {
            creditsValue = 'specialized:' + packageInfo.id;
            await setDoc(profileRef, {
                unlockedSpecializedPackages: arrayUnion(packageInfo.id)
            }, { merge: true });

            try {
                await setDoc(publicStatsRef, {
                    unlockedSpecializedPackages: arrayUnion(packageInfo.id)
                }, { merge: true });
            } catch (statsErr) {
                console.warn('Không có quyền cập nhật userStats trực tiếp:', statsErr);
            }
        } else if (packageInfo.type === 'ai') {
            creditsValue = packageInfo.credits;
            const profileSnap = await getDoc(profileRef);
            const currentCredits = profileSnap.exists() ? (profileSnap.data().aiCreditsRemaining || 0) : 0;
            await setDoc(profileRef, { 
                aiCreditsRemaining: currentCredits + Number(packageInfo.credits) 
            }, { merge: true });
        }
        // 2. Add approved log request so it shows up in "Gói đã mua" and "Doanh thu" if desired (amount = 0)
        const colRef = collection(db, `artifacts/${appId}/creditRequests`);
        await addDoc(colRef, {
            userId,
            userName: userName || '',
            userEmail: userEmail || '',
            packageId: packageInfo.id,
            packageName: packageInfo.name,
            credits: creditsValue,
            amount: 0, // 0 VND for manual allocation
            status: 'approved',
            createdAt: serverTimestamp(),
            processedAt: serverTimestamp(),
            processedBy: adminUserId,
            isManualAllocation: true
        });
        return true;
    } catch (e) {
        console.error('Manually apply package error:', e);
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
const isTransactionProcessed = async (transactionId) => {
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
    const MAX_RETRIES = 3;
    const RETRY_DELAY_MS = 2000;
    const sleep = (ms) => new Promise(res => setTimeout(res, ms));
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
            // Step 1: Check duplicate (simple getDoc, không dùng transaction để tránh quota)
            const txSnap = await getDoc(txRef);
            if (txSnap.exists()) {
                console.warn(`⚠️ Duplicate transaction blocked: TX#${transactionId}`);
                return { success: false, error: 'Giao dịch này đã được xử lý trước đó' };
            }
            // Step 2: Read current credits
            const profileSnap = await getDoc(profileRef);
            const currentCredits = profileSnap.exists() ? (profileSnap.data().aiCreditsRemaining || 0) : 0;
            // Step 3: Mark transaction as processed
            await setDoc(txRef, {
                transactionId: String(transactionId),
                orderCode,
                userId,
                credits,
                amount,
                processedAt: new Date().toISOString(),
                timestamp: Date.now(),
            });
            // Step 4: Update credits or unlock package
            if (typeof credits === 'string' && credits.startsWith('specialized:')) {
                const packageId = credits.replace('specialized:', '');
                if (packageId.startsWith('premium')) {
                    const bonusCredits = packageId === 'premium_3y' ? 6000 : (packageId === 'premium_1y' ? 2000 : (packageId === 'premium_1m' ? 200 : 0));
                    
                    // Calculate expiration date (extending if already active)
                    const durationMs = packageId === 'premium_3y' ? 3 * 365 * 24 * 60 * 60 * 1000 : (packageId === 'premium_1y' ? 365 * 24 * 60 * 60 * 1000 : 30 * 24 * 60 * 60 * 1000);
                    const currentExpiry = profileSnap.exists() ? (profileSnap.data().premiumExpiresAt || 0) : 0;
                    const currentExpiryMs = currentExpiry?.toDate ? currentExpiry.toDate().getTime() : Number(currentExpiry || 0);
                    const baseTime = currentExpiryMs > Date.now() ? currentExpiryMs : Date.now();
                    const premiumExpiresAt = baseTime + durationMs;

                    await setDoc(profileRef, {
                        unlockedSpecializedPackages: arrayUnion(packageId, 'premium', 'vocab_zen', 'grammar_zen', 'kanji_zen', 'jlpt_prep'),
                        isPremiumUnlocked: true,
                        aiCreditsRemaining: currentCredits + bonusCredits,
                        premiumExpiresAt
                    }, { merge: true });
                    console.log(`✅ Payment processed: TX#${transactionId}, unlocked premium package ${packageId}, added ${bonusCredits} credits, expires at ${new Date(premiumExpiresAt).toISOString()}`);

                    // Check and apply referral rewards for referrer
                    try {
                        const { checkAndApplyReferralRewards } = await import('./referralService');
                        await checkAndApplyReferralRewards(userId, profileSnap.exists() ? (profileSnap.data().displayName || 'Người học') : 'Người học');
                    } catch (refErr) {
                        console.error('Lỗi cộng thưởng giới thiệu:', refErr);
                    }

                    return { success: true, newCredits: currentCredits + bonusCredits };
                } else {
                    await setDoc(profileRef, {
                        unlockedSpecializedPackages: arrayUnion(packageId)
                    }, { merge: true });
                    console.log(`✅ Payment processed: TX#${transactionId}, unlocked specialized package ${packageId}`);
                    return { success: true, newCredits: currentCredits };
                }
            } else {
                const creditNum = Number(credits) || 0;
                if (profileSnap.exists()) {
                    await updateDoc(profileRef, { aiCreditsRemaining: increment(creditNum) });
                } else {
                    await setDoc(profileRef, { aiCreditsRemaining: creditNum }, { merge: true });
                }
                const newCredits = currentCredits + creditNum;
                console.log(`✅ Payment processed: TX#${transactionId}, +${creditNum} credits → total ${newCredits}`);
                return { success: true, newCredits };
            }
        } catch (e) {
            const isQuotaError = e?.code === 'resource-exhausted' || e?.message?.includes('Quota') || e?.message?.includes('429');
            if (isQuotaError) {
                if (attempt < MAX_RETRIES) {
                    const delay = RETRY_DELAY_MS * attempt; // 2s, 4s, 6s
                    console.warn(`⏳ Firestore quota hit (lần ${attempt}/${MAX_RETRIES}), thử lại sau ${delay / 1000}s...`);
                    await sleep(delay);
                    continue;
                } else {
                    console.error(`❌ Firestore quota exhausted sau ${MAX_RETRIES} lần thử. Credit chưa được cộng.`);
                    return { success: false, error: 'Firebase quota exceeded. Vui lòng thử lại sau.' };
                }
            }
            console.error('Process payment error:', e);
            return { success: false, error: e.message };
        }
    }
    return { success: false, error: 'Max retries exceeded' };
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
// ============== GLOBAL NOTIFICATIONS ==============
/**
 * Send a global notification to all users
 */
export const sendGlobalNotification = async (title, message, senderId, type = 'normal') => {
    try {
        const colRef = collection(db, `artifacts/${appId}/globalNotifications`);
        await addDoc(colRef, {
            title,
            message,
            createdAt: Date.now(),
            senderId,
            type
        });
        return true;
    } catch (e) {
        console.error('Error sending global notification:', e);
        return false;
    }
};
/**
 * Delete a global notification
 */
export const deleteGlobalNotification = async (notificationId) => {
    try {
        const docRef = doc(db, `artifacts/${appId}/globalNotifications`, notificationId);
        await deleteDoc(docRef);
        return true;
    } catch (e) {
        console.error('Error deleting global notification:', e);
        return false;
    }
};
