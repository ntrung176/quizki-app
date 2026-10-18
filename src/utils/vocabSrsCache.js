/**
 * Lightweight SRS Cache for Vocabulary
 * Stores ONLY SRS timestamps, intervals, and mastery states in localStorage (< 100KB)
 * to prevent loss of review progress when mobile browsers terminate background connections.
 */

const SRS_KEYS = [
    'srsInterval', 'srsEase', 'srsLearningStep', 'srsIsLapsed', 'srsReps',
    'srsLapseCount', 'srsPrelapseInterval', 'srsState', 'nextReview_back',
    'lastReviewed_back', 'lastReviewed', 'state', 'interval', 'ease',
    'nextReview', 'masteryState', 'intervalIndex_back', 'correctStreak_back',
    'nextReview_synonym', 'nextReview_example', 'nextReview_dictation',
    'lastReviewed_synonym', 'lastReviewed_example', 'lastReviewed_dictation'
];

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
            localStorage.setItem(key, JSON.stringify(map));
        }
    } catch (e) {
        console.warn('⚠️ Failed to update cached vocab SRS:', e);
    }
};

export const mergeCachedVocabSrs = (userId, cards = []) => {
    if (!userId || !Array.isArray(cards) || cards.length === 0) {
        return { mergedCards: cards, pendingSyncCards: [] };
    }

    const srsMap = getCachedVocabSrsMap(userId);
    if (!srsMap || Object.keys(srsMap).length === 0) {
        return { mergedCards: cards, pendingSyncCards: [] };
    }

    const pendingSyncCards = [];
    const mergedCards = cards.map(card => {
        const safeId = String(card.id);
        const cached = srsMap[safeId];
        if (!cached) return card;

        const cachedReviewTime = cached.lastReviewed || cached.lastReviewed_back || cached.lastUpdated || 0;
        const serverReviewTime = card.lastReviewed || card.lastReviewed_back || (card.updatedAt ? (typeof card.updatedAt === 'number' ? card.updatedAt : card.updatedAt.toMillis?.() || 0) : 0);

        // If local SRS cache has a newer review than server, apply optimistic local SRS
        if (cachedReviewTime > serverReviewTime) {
            const merged = { ...card, ...cached };
            pendingSyncCards.push(merged);
            return merged;
        }

        return card;
    });

    return { mergedCards, pendingSyncCards };
};
