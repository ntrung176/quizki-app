// --- Centralized AI Credit Economy, Anti-Cheat & Dynamic Cost Config ---
import { doc, runTransaction } from 'firebase/firestore';
import { auth, db, appId } from '../config/firebase';
import { showToast } from './toast';

/**
 * Custom error thrown when user does not have enough AI credits for an operation.
 */
export class InsufficientAiCreditsError extends Error {
    constructor({ featureId, cost, remaining }) {
        const msg = `Không đủ Credit AI! Tính năng này cần ${cost} Credit nhưng bạn hiện chỉ còn ${remaining} Credit. Vui lòng nạp thêm Credit AI tại mục Nâng cấp.`;
        super(msg);
        this.name = 'InsufficientAiCreditsError';
        this.code = 'INSUFFICIENT_AI_CREDITS';
        this.featureId = featureId;
        this.cost = cost;
        this.remaining = remaining;
    }
}

/**
 * Default calibrated AI Credit cost per feature.
 * Admin can override any feature's cost live via adminConfig.aiFeatureCosts.
 */
export const AI_FEATURE_CREDITS = {
    vocab_gen: {
        id: 'vocab_gen',
        cost: 1,
        label: 'Tạo thẻ từ vựng AI',
        shortLabel: 'Tạo từ vựng',
        estimateText: 'Nghĩa, Hán Việt, Furigana & câu ví dụ',
        tier: 'light'
    },
    vocab_sino_viet: {
        id: 'vocab_sino_viet',
        cost: 1,
        label: 'Hán Việt & Trọng âm AI',
        shortLabel: 'Hán Việt / Accent',
        estimateText: 'Phân tích âm Hán Việt & Pitch Accent',
        tier: 'light'
    },
    more_examples: {
        id: 'more_examples',
        cost: 1,
        label: 'Tạo thêm câu ví dụ',
        shortLabel: 'Thêm ví dụ',
        estimateText: 'Sinh câu ví dụ thực tế theo ngữ cảnh',
        tier: 'light'
    },
    sentence_translate: {
        id: 'sentence_translate',
        cost: 1,
        label: 'Dịch câu & Phân tích AI',
        shortLabel: 'Dịch câu AI',
        estimateText: 'Dịch tự nhiên, Furigana & giải thích cấu trúc',
        tier: 'light'
    },
    grammar_check: {
        id: 'grammar_check',
        cost: 1,
        label: 'AI Chấm điểm câu dịch',
        shortLabel: 'Chấm điểm ngữ pháp',
        estimateText: 'Chấm điểm chi tiết & sửa lỗi đặt câu',
        tier: 'light'
    },
    'grammar-notebook-ai': {
        id: 'grammar-notebook-ai',
        cost: 1,
        label: 'AI Soạn mẫu Sổ tay ngữ pháp',
        shortLabel: 'Soạn mẫu ngữ pháp',
        estimateText: 'Tạo nhanh 1 mẫu ngữ pháp vào sổ tay',
        tier: 'light'
    },
    grammar_gen: {
        id: 'grammar_gen',
        cost: 2,
        label: 'Tạo & Chuẩn hóa Ngữ pháp',
        shortLabel: 'Chuẩn hóa ngữ pháp',
        estimateText: 'Phân tích chuyên sâu cấu trúc & bài tập',
        tier: 'medium'
    },
    jlpt_explain: {
        id: 'jlpt_explain',
        cost: 2,
        label: 'AI Kiểm tra & Giải thích JLPT',
        shortLabel: 'Giải thích JLPT',
        estimateText: 'Xác minh đáp án & viết giải thích chi tiết',
        tier: 'medium'
    },
    kanji_format: {
        id: 'kanji_format',
        cost: 2,
        label: 'Chuẩn hóa Kanji AI',
        shortLabel: 'Chuẩn hóa Kanji',
        estimateText: 'Chuẩn hóa nghĩa & Hán Việt hàng loạt',
        tier: 'medium'
    },
    fill_example_blanks: {
        id: 'fill_example_blanks',
        cost: 2,
        label: 'AI Điền khuyết ví dụ',
        shortLabel: 'Điền khuyết AI',
        estimateText: 'Chia thể & lắp từ vựng vào câu ví dụ',
        tier: 'medium'
    },
    kaiwa_scorecard: {
        id: 'kaiwa_scorecard',
        cost: 2,
        label: 'Báo cáo chấm điểm Kaiwa',
        shortLabel: 'Báo cáo Kaiwa',
        estimateText: 'Đánh giá phản xạ, ngữ pháp & độ trôi chảy',
        tier: 'medium'
    },
    ocr_image: {
        id: 'ocr_image',
        cost: 3,
        label: 'Quét ảnh trích xuất từ vựng (OCR)',
        shortLabel: 'Quét ảnh OCR',
        estimateText: 'Nhận diện chữ Nhật/Anh/Hàn từ ảnh sách',
        tier: 'heavy'
    },
    kaiwa_agent: {
        id: 'kaiwa_agent',
        cost: 3,
        label: 'Phòng Kaiwa AI (Hội thoại 1-1)',
        shortLabel: 'Kaiwa AI 1-1',
        estimateText: 'Hội thoại tương tác + sửa lỗi + giọng đọc (mỗi lượt)',
        tier: 'heavy'
    },
    'kanji-vocab-generator': {
        id: 'kanji-vocab-generator',
        cost: 3,
        label: 'AI Tạo từ vựng theo Kanji',
        shortLabel: 'Từ vựng Kanji AI',
        estimateText: 'Tổng hợp đầy đủ từ vựng Kunyomi/Onyomi',
        tier: 'heavy'
    },
    kanji_enrich: {
        id: 'kanji_enrich',
        cost: 4,
        label: 'Làm giàu dữ liệu Kanji hàng loạt',
        shortLabel: 'Enrich Kanji',
        estimateText: 'Tạo bộ thủ, mẹo nhớ & âm đọc',
        tier: 'heavy'
    },
    'grammar-notebook-batch': {
        id: 'grammar-notebook-batch',
        cost: 4,
        label: 'AI Soạn hàng loạt Sổ tay ngữ pháp',
        shortLabel: 'Soạn hàng loạt',
        estimateText: 'Tạo cả chủ đề nhiều mẫu ngữ pháp cùng lúc',
        tier: 'heavy'
    },
    pdf_ingest: {
        id: 'pdf_ingest',
        cost: 8,
        label: 'AI Phân tích tài liệu PDF',
        shortLabel: 'Phân tích PDF',
        estimateText: 'Trích xuất ngữ cảnh lớn từ tài liệu',
        tier: 'heavy'
    }
};

export const CREDIT_TABLE_IDS = [
    'vocab_gen',
    'sentence_translate',
    'grammar_check',
    'more_examples',
    'grammar_gen',
    'jlpt_explain',
    'kaiwa_scorecard',
    'ocr_image',
    'kaiwa_agent',
    'grammar-notebook-batch'
];

export const EDITABLE_CREDIT_FEATURE_IDS = [
    'vocab_gen',
    'grammar_gen',
    'vocab_sino_viet',
    'more_examples',
    'ocr_image',
    'grammar_check',
    'kaiwa_agent',
    'sentence_translate',
    'jlpt_explain',
    'kaiwa_scorecard',
    'grammar-notebook-ai',
    'grammar-notebook-batch',
    'kanji-vocab-generator'
];

export const WELCOME_AI_CREDITS = 50;
export const MAX_SINGLE_DEDUCT = 50;

export const PREMIUM_INCLUDED_CREDITS = {
    premium_1m: 100,
    premium_1y: 800,
    premium_3y: 3000
};

export const getPremiumBonusCredits = (packageId) => {
    if (packageId === 'premium_3y') return PREMIUM_INCLUDED_CREDITS.premium_3y;
    if (packageId === 'premium_1y') return PREMIUM_INCLUDED_CREDITS.premium_1y;
    if (packageId === 'premium_1m') return PREMIUM_INCLUDED_CREDITS.premium_1m;
    return 0;
};

// Strict internal state (NOT exposed on window to prevent DevTools tampering)
const DEVELOPER_ADMIN_EMAILS = ['ntrungforwork@gmail.com', 'lynguyennhattrung1706@gmail.com'];
let _moderatorUids = new Set();
let _customFeatureCosts = {};

let _creditsCache = {
    userId: null,
    remaining: 0,
    isUnlimited: false,
    initialized: false
};

const emitCreditsEvent = () => {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(
        new CustomEvent('quizki-ai-credits-updated', {
            detail: { ..._creditsCache, featureCostsVersion: JSON.stringify(_customFeatureCosts) }
        })
    );
};

/**
 * Sync verified adminConfig moderator UIDs into closed module state.
 */
export const syncAdminModeratorsList = (moderators = []) => {
    _moderatorUids = new Set(Array.isArray(moderators) ? moderators.filter(Boolean) : []);
};

/**
 * Sync Admin-configured AI credit costs per feature from Firestore adminConfig.
 */
export const syncDynamicFeatureCreditCosts = (customCostsMap) => {
    if (!customCostsMap || typeof customCostsMap !== 'object') return;
    const sanitized = {};
    for (const [k, v] of Object.entries(customCostsMap)) {
        const parsed = Math.floor(Number(v));
        if (Number.isFinite(parsed) && parsed >= 0 && parsed <= MAX_SINGLE_DEDUCT) {
            sanitized[k] = parsed;
        }
    }
    if (JSON.stringify(sanitized) !== JSON.stringify(_customFeatureCosts)) {
        _customFeatureCosts = sanitized;
        emitCreditsEvent();
    }
};

const verifyCurrentUserIsPrivileged = () => {
    const user = auth?.currentUser;
    if (!user) return false;
    const email = (user.email || '').trim().toLowerCase();
    const envAdmin = (import.meta.env.VITE_ADMIN_EMAIL || '').trim().replace(/^['"]|['"]$/g, '').toLowerCase();
    if ((envAdmin && email === envAdmin) || DEVELOPER_ADMIN_EMAILS.includes(email)) {
        return true;
    }
    return Boolean(user.uid && _moderatorUids.has(user.uid));
};

/**
 * Sync current authenticated user's AI credit balance into closed module cache.
 */
export const syncCurrentUserCreditsCache = (userId, remaining = 0, _hintUnlimited = false) => {
    const normalizedRemaining = Number.isFinite(Number(remaining)) ? Math.max(0, Math.floor(Number(remaining))) : 0;
    const verifiedUnlimited = Boolean(userId) && verifyCurrentUserIsPrivileged();

    const changed =
        _creditsCache.userId !== (userId || null) ||
        _creditsCache.remaining !== normalizedRemaining ||
        _creditsCache.isUnlimited !== verifiedUnlimited ||
        !_creditsCache.initialized;

    _creditsCache = {
        userId: userId || null,
        remaining: normalizedRemaining,
        isUnlimited: verifiedUnlimited,
        initialized: true
    };

    if (changed) {
        emitCreditsEvent();
    }
};

export const clearCurrentUserCreditsCache = () => {
    _creditsCache = {
        userId: null,
        remaining: 0,
        isUnlimited: false,
        initialized: false
    };
    emitCreditsEvent();
};

export const getCurrentAiCredits = () => ({ ..._creditsCache });

export const getFeatureCreditCost = (featureId) => {
    if (!featureId) return 1;
    if (Object.prototype.hasOwnProperty.call(_customFeatureCosts, featureId)) {
        return _customFeatureCosts[featureId];
    }
    return AI_FEATURE_CREDITS[featureId]?.cost ?? 1;
};

export const getFeatureCreditInfo = (featureId) => {
    const base = AI_FEATURE_CREDITS[featureId] || {
        id: featureId || 'default',
        cost: 1,
        label: 'Tính năng AI',
        shortLabel: 'AI',
        estimateText: 'Tác vụ AI thông minh',
        tier: 'light'
    };
    const cost = getFeatureCreditCost(featureId);
    const tier = cost >= 3 ? 'heavy' : cost === 2 ? 'medium' : 'light';
    return { ...base, cost, tier };
};

export const getDynamicFeatureCreditTable = () => {
    return CREDIT_TABLE_IDS.map((id) => getFeatureCreditInfo(id));
};

export const getEditableAiCreditFeatures = () => {
    return EDITABLE_CREDIT_FEATURE_IDS.map((id) => getFeatureCreditInfo(id));
};

// Backwards-compatible static reference helper
export const AI_FEATURE_CREDIT_TABLE = CREDIT_TABLE_IDS.map((id) => AI_FEATURE_CREDITS[id]);

const isAdminBypassActive = () => {
    return verifyCurrentUserIsPrivileged();
};

/**
 * Check whether current user has sufficient AI credits for a given feature.
 */
export const canAffordFeature = (featureId) => {
    const cost = getFeatureCreditCost(featureId);
    const activeUid = _creditsCache.userId || auth?.currentUser?.uid || null;

    if (!activeUid) {
        return {
            allowed: false,
            reason: 'AUTH_REQUIRED',
            cost,
            remaining: 0,
            isUnlimited: false
        };
    }

    if (isAdminBypassActive()) {
        return {
            allowed: true,
            reason: null,
            cost: 0,
            remaining: _creditsCache.remaining,
            isUnlimited: true
        };
    }

    if (cost <= 0) {
        return {
            allowed: true,
            reason: null,
            cost: 0,
            remaining: _creditsCache.remaining,
            isUnlimited: false
        };
    }

    if (_creditsCache.remaining < cost) {
        return {
            allowed: false,
            reason: 'INSUFFICIENT_CREDITS',
            cost,
            remaining: _creditsCache.remaining,
            isUnlimited: false
        };
    }

    return {
        allowed: true,
        reason: null,
        cost,
        remaining: _creditsCache.remaining,
        isUnlimited: false
    };
};

/**
 * Guard called before executing an AI network request.
 */
export const assertCanAffordAi = (featureId) => {
    const status = canAffordFeature(featureId);
    if (status.allowed) return status;

    if (status.reason === 'AUTH_REQUIRED') {
        const authErr = new Error('Vui lòng đăng nhập tài khoản để sử dụng tính năng AI.');
        showToast(authErr.message, 'warning');
        throw authErr;
    }

    const err = new InsufficientAiCreditsError({
        featureId,
        cost: status.cost,
        remaining: status.remaining
    });

    if (typeof window !== 'undefined') {
        window.dispatchEvent(
            new CustomEvent('quizki-insufficient-credits', {
                detail: { featureId, cost: status.cost, remaining: status.remaining }
            })
        );
    }

    showToast(err.message, 'warning');
    throw err;
};

/**
 * Atomically deduct credits AFTER a successful AI response.
 */
export const consumeAiCredits = async (featureId) => {
    const activeUid = auth?.currentUser?.uid || _creditsCache.userId || null;
    if (!activeUid || isAdminBypassActive()) {
        return _creditsCache.remaining;
    }

    const cost = getFeatureCreditCost(featureId);
    if (cost <= 0) {
        return _creditsCache.remaining;
    }

    const prevRemaining = _creditsCache.remaining;
    const optimisticNext = Math.max(0, prevRemaining - cost);

    _creditsCache = {
        ..._creditsCache,
        userId: activeUid,
        remaining: optimisticNext,
        initialized: true
    };
    emitCreditsEvent();

    if (!db || !appId) {
        return optimisticNext;
    }

    try {
        const profileRef = doc(db, `artifacts/${appId}/users/${activeUid}/settings/profile`);
        const committedCredits = await runTransaction(db, async (tx) => {
            const snap = await tx.get(profileRef);
            if (!snap.exists()) return optimisticNext;

            const data = snap.data() || {};
            const serverCurrent = typeof data.aiCreditsRemaining === 'number'
                ? Math.floor(data.aiCreditsRemaining)
                : WELCOME_AI_CREDITS;

            if (serverCurrent <= 0) {
                return 0;
            }

            const actualDeduct = Math.min(serverCurrent, Math.min(cost, MAX_SINGLE_DEDUCT));
            const nextValue = Math.max(0, Math.floor(serverCurrent - actualDeduct));
            if (actualDeduct > 0 && nextValue < serverCurrent) {
                tx.update(profileRef, { aiCreditsRemaining: nextValue });
            }
            return nextValue;
        });

        _creditsCache = {
            ..._creditsCache,
            userId: activeUid,
            remaining: committedCredits,
            initialized: true
        };
        emitCreditsEvent();
        return committedCredits;
    } catch (error) {
        console.warn('[AI Credits] Transaction sync warning:', error?.message || error);
        return optimisticNext;
    }
};
