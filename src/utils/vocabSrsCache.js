/**
 * Lightweight SRS Cache for Vocabulary
 * Stores ONLY SRS timestamps, intervals, and mastery states in localStorage (< 100KB)
 * to prevent loss of review progress when mobile browsers terminate background connections.
 */

import { safeSetLocalStorage } from './storageCleanup';

const SRS_KEYS = [
    'srsInterval', 'srsEase', 'srsLearningStep', 'srsIsLapsed', 'srsReps',
    'srsLapseCount', 'srsPrelapseInterval', 'srsState', 'nextReview_back',
    'lastReviewed_back', 'lastReviewed', 'state', 'interval', 'ease',
    'nextReview', 'masteryState', 'intervalIndex_back', 'correctStreak_back',
    'nextReview_synonym', 'nextReview_example', 'nextReview_dictation',
    'lastReviewed_synonym', 'lastReviewed_example', 'lastReviewed_dictation',
    'lastStudied', 'rating', 'userMnemonic', 'mnemonic', 'customMnemonic'
];

export const getPendingVocabSyncMap = (userId) => {
    if (!userId || typeof window === 'undefined' || !window.localStorage) return {};
    try {
        const raw = localStorage.getItem(`quizki_pending_vocab_sync_${userId}`);
        return raw ? JSON.parse(raw) : {};
    } catch (_) {
        return {};
    }
};

export const recordPendingVocabSync = (userId, cardId, patch) => {
    if (!userId || !cardId || !patch || typeof window === 'undefined' || !window.localStorage) return;
    try {
        const key = `quizki_pending_vocab_sync_${userId}`;
        const map = getPendingVocabSyncMap(userId);
        const safeId = String(cardId);
        map[safeId] = {
            ...(map[safeId] || {}),
            ...patch,
            _pendingTime: Date.now()
        };
        safeSetLocalStorage(key, JSON.stringify(map));
    } catch (e) {
        console.warn('⚠️ Failed to record pending vocab sync:', e);
    }
};

export const removePendingVocabSync = (userId, cardId) => {
    if (!userId || !cardId || typeof window === 'undefined' || !window.localStorage) return;
    try {
        const key = `quizki_pending_vocab_sync_${userId}`;
        const map = getPendingVocabSyncMap(userId);
        const safeId = String(cardId);
        if (map[safeId]) {
            delete map[safeId];
            if (Object.keys(map).length === 0) {
                localStorage.removeItem(key);
            } else {
                safeSetLocalStorage(key, JSON.stringify(map));
            }
        }
    } catch (e) {
        console.warn('⚠️ Failed to remove pending vocab sync:', e);
    }
};

export const getCachedVocabSrsMap = (userId) => {
    if (!userId || typeof window === 'undefined' || !window.localStorage) return {};
    try {
        const raw = localStorage.getItem(`quizki_cached_vocab_srs_${userId}`);
        return raw ? JSON.parse(raw) : {};
    } catch (_) {
        return {};
    }
};

export const updateCachedVocabSrs = (userId, cardId, srsPatch) => {
    if (!userId || !cardId || !srsPatch || typeof window === 'undefined' || !window.localStorage) return;
    try {
        const key = `quizki_cached_vocab_srs_${userId}`;
        const raw = localStorage.getItem(key);
        const map = raw ? JSON.parse(raw) : {};
        const safeId = String(cardId);

        // Filter only SRS fields to keep local storage footprint minimal (< 100KB)
        const filtered = {};
        for (const k of SRS_KEYS) {
            if (srsPatch[k] !== undefined) {
                filtered[k] = srsPatch[k];
            }
        }

        if (Object.keys(filtered).length > 0) {
            map[safeId] = {
                ...(map[safeId] || {}),
                ...filtered,
                lastUpdated: Date.now()
            };
            safeSetLocalStorage(key, JSON.stringify(map));
        }
    } catch (e) {
        console.warn('⚠️ Failed to update cached vocab SRS:', e);
    }
};

export const mergeCachedVocabSrs = (userId, cards = []) => {
    if (!userId || !Array.isArray(cards) || cards.length === 0) {
        return { mergedCards: cards, pendingSyncCards: [] };
    }

    const pendingSyncMap = getPendingVocabSyncMap(userId);
    const srsMap = getCachedVocabSrsMap(userId);
    const hasPending = pendingSyncMap && Object.keys(pendingSyncMap).length > 0;
    const hasSrs = srsMap && Object.keys(srsMap).length > 0;

    if (!hasPending && !hasSrs) {
        return { mergedCards: cards, pendingSyncCards: [] };
    }

    const pendingSyncCards = [];
    const mergedCards = cards.map(card => {
        const safeId = String(card.id);

        // Priority 1: Unconfirmed write from pending sync queue (highest authority)
        if (hasPending && pendingSyncMap[safeId]) {
            const pendingData = { ...pendingSyncMap[safeId] };
            delete pendingData._pendingTime;
            const merged = { ...card, ...pendingData };
            pendingSyncCards.push(merged);
            return merged;
        }

        // Priority 2: General local SRS cache
        const cached = hasSrs ? srsMap[safeId] : null;
        if (!cached) return card;

        // Actual review timestamps (never use card.updatedAt which tracks doc metadata)
        const cachedReviewTime = Math.max(
            cached.lastReviewed || 0,
            cached.lastReviewed_back || 0,
            cached.lastStudied || 0,
            cached.lastUpdated || 0
        );
        const serverReviewTime = Math.max(
            card.lastReviewed || 0,
            card.lastReviewed_back || 0,
            card.lastStudied || 0
        );

        // Next review scheduled offsets
        const cachedNext = Math.max(
            cached.nextReview_back || 0,
            cached.nextReview || 0
        );
        const serverNext = Math.max(
            card.nextReview_back || 0,
            card.nextReview || 0
        );

        // If local review is newer OR if local has pushed the next review forward
        if (cachedReviewTime > serverReviewTime || (cachedNext > serverNext && cachedNext > Date.now() - 86400000)) {
            return { ...card, ...cached };
        }

        return card;
    });

    return { mergedCards, pendingSyncCards };
};
