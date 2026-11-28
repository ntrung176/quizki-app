/**
 * Helpers for normalizing JLPT multiple-choice answer indices (0-based storage)
 * without misreading valid 0-based indices (1, 2, 3) as 1-based (1..4).
 */

const parseNumericAnswerCandidate = (rawAnswer) => {
    if (typeof rawAnswer === 'number' && Number.isFinite(rawAnswer)) {
        return Math.trunc(rawAnswer);
    }
    if (typeof rawAnswer === 'string') {
        const trimmed = rawAnswer.trim();
        if (/^-?[0-9]+$/.test(trimmed)) {
            return Number(trimmed);
        }
    }
    return null;
};

/**
 * Normalizes a raw answer value into a 0-based option index (`0..options.length - 1`).
 *
 * IMPORTANT: Defaults to `oneBased = false` so valid 0-based JSON / Firestore values
 * (`0, 1, 2, 3`) stay intact instead of shifting `1 -> 0, 2 -> 1, 3 -> 2`.
 * Pass `{ oneBased: true }` only for explicitly 1-based (`1..4`) inputs or batches
 * detected by `detectBatchOneBasedIndexing`.
 */
export const normalizeAnswerIndex = (rawAnswer, options = [], { oneBased = false } = {}) => {
    const optLen = Array.isArray(options) && options.length > 0 ? options.length : 4;

    if (typeof rawAnswer === 'number' && Number.isFinite(rawAnswer)) {
        const idx = Math.trunc(rawAnswer);
        if (oneBased) {
            if (idx >= 1 && idx <= optLen) return idx - 1;
            if (idx <= 0) return 0;
            return optLen - 1;
        }
        if (idx >= 0 && idx < optLen) return idx;
        if (idx >= optLen) return optLen - 1;
        return 0;
    }

    if (typeof rawAnswer === 'string') {
        const trimmed = rawAnswer.trim().toUpperCase();
        if (trimmed === 'A') return 0;
        if (trimmed === 'B') return Math.min(1, optLen - 1);
        if (trimmed === 'C') return Math.min(2, optLen - 1);
        if (trimmed === 'D') return Math.min(3, optLen - 1);

        if (/^-?[0-9]+$/.test(trimmed)) {
            return normalizeAnswerIndex(Number(trimmed), options, { oneBased });
        }

        if (Array.isArray(options)) {
            const cleanRaw = rawAnswer.replace(/<\/?[^>]+(>|$)/g, '').trim().toLowerCase();
            if (!cleanRaw) return 0;
            const foundIdx = options.findIndex((opt) => {
                if (!opt || typeof opt !== 'string') return false;
                const cleanOpt = opt.replace(/<\/?[^>]+(>|$)/g, '').trim().toLowerCase();
                return cleanOpt === cleanRaw || (cleanOpt && cleanRaw.includes(cleanOpt));
            });
            if (foundIdx !== -1) return foundIdx;
        }
    }

    return 0;
};

/**
 * Inspects a batch of raw questions/subQuestions (or section wrappers) to determine
 * whether numeric answers are 1-based (`1..optLen`) or 0-based (`0..optLen-1`).
 *
 * - Any `0` proves 0-based (`false`).
 * - Any value equal to `optLen` (e.g., `4` on 4 options, or `3` on 3 options) with no `0` proves 1-based (`true`).
 * - Otherwise falls back to `defaultOneBased` (which should match the prompt contract).
 */
export const detectBatchOneBasedIndexing = (items = [], defaultOneBased = false) => {
    if (!Array.isArray(items) || items.length === 0) return Boolean(defaultOneBased);

    let zeroCount = 0;
    let upperBoundCount = 0;

    const inspectEntry = (entry) => {
        if (!entry || typeof entry !== 'object') return;

        if (Array.isArray(entry.questions)) {
            entry.questions.forEach(inspectEntry);
            return;
        }

        if (Array.isArray(entry.subQuestions) && entry.subQuestions.length > 0) {
            entry.subQuestions.forEach(inspectEntry);
        }

        const raw = entry.correctAnswer ?? entry.answer ?? entry.correct;
        const numeric = parseNumericAnswerCandidate(raw);
        if (numeric === null) return;

        const optLen = Array.isArray(entry.options) && entry.options.length >= 2
            ? entry.options.length
            : 4;

        if (numeric === 0) zeroCount += 1;
        else if (numeric >= optLen && numeric <= optLen + 1) upperBoundCount += 1;
    };

    items.forEach(inspectEntry);

    if (zeroCount > 0 && upperBoundCount === 0) return false;
    if (upperBoundCount > 0 && zeroCount === 0) return true;
    if (zeroCount > 0 && upperBoundCount > 0) {
        return upperBoundCount > zeroCount;
    }
    return Boolean(defaultOneBased);
};
