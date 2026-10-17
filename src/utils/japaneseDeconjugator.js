/**
 * japaneseDeconjugator.js
 * Rule-based Japanese deconjugator to resolve inflected verbs and adjectives back to dictionary forms.
 */

const GODAN_SUFFIXES = [
    { inflected: 'かない', base: 'く' },
    { inflected: 'ぎない', base: 'ぐ' },
    { inflected: 'さない', base: 'す' },
    { inflected: 'たない', base: 'つ' },
    { inflected: 'なない', base: 'ぬ' },
    { inflected: 'ばない', base: 'ぶ' },
    { inflected: 'まない', base: 'む' },
    { inflected: 'らない', base: 'る' },
    { inflected: 'わない', base: 'う' },
    
    // Past (-ta / -da)
    { inflected: 'いた', base: ['く', 'ぐ'] },
    { inflected: 'した', base: 'す' },
    { inflected: 'った', base: ['う', 'つ', 'る'] },
    { inflected: 'んだ', base: ['ぬ', 'ぶ', 'む'] },
    { inflected: 'いだ', base: 'ぐ' },
    
    // Te-form
    { inflected: 'いて', base: 'く' },
    { inflected: 'して', base: 'す' },
    { inflected: 'って', base: ['う', 'つ', 'る'] },
    { inflected: 'んで', base: ['ぬ', 'ぶ', 'む'] },
    { inflected: 'いで', base: 'ぐ' },

    // Masu form
    { inflected: 'きます', base: 'く' },
    { inflected: 'ぎます', base: 'ぐ' },
    { inflected: 'します', base: 'す' },
    { inflected: 'ちます', base: 'つ' },
    { inflected: 'にます', base: 'ぬ' },
    { inflected: 'びます', base: 'ぶ' },
    { inflected: 'みます', base: 'む' },
    { inflected: 'ります', base: 'る' },
    { inflected: 'います', base: 'う' },

    // Potential / Conditional
    { inflected: 'けば', base: 'く' },
    { inflected: 'げば', base: 'ぐ' },
    { inflected: 'せば', base: 'す' },
    { inflected: 'てば', base: 'つ' },
    { inflected: 'ねば', base: 'ぬ' },
    { inflected: 'べば', base: 'ぶ' },
    { inflected: 'めば', base: 'む' },
    { inflected: 'れば', base: 'る' },
    { inflected: 'えば', base: 'う' }
];

const ICHIDAN_SUFFIXES = [
    { inflected: 'ない', base: 'る' },
    { inflected: 'た', base: 'る' },
    { inflected: 'て', base: 'る' },
    { inflected: 'ます', base: 'る' },
    { inflected: 'ました', base: 'る' },
    { inflected: 'ません', base: 'る' },
    { inflected: 'れば', base: 'る' },
    { inflected: 'られる', base: 'る' },
    { inflected: 'させる', base: 'る' },
    { inflected: 'よう', base: 'る' }
];

const I_ADJ_SUFFIXES = [
    { inflected: 'くない', base: 'い' },
    { inflected: 'かった', base: 'い' },
    { inflected: 'くて', base: 'い' },
    { inflected: 'く', base: 'い' }
];

const SURU_SUFFIXES = [
    { inflected: 'した', base: 'する' },
    { inflected: 'して', base: 'する' },
    { inflected: 'しない', base: 'する' },
    { inflected: 'します', base: 'する' },
    { inflected: 'しました', base: 'する' },
    { inflected: 'しません', base: 'する' },
    { inflected: 'される', base: 'する' },
    { inflected: 'できる', base: 'する' }
];

/**
 * Returns an array of candidate dictionary forms for a given word.
 * Always includes the original query as the first candidate.
 */
export function deconjugate(text) {
    if (!text || typeof text !== 'string') return [];
    const query = text.trim();
    if (!query) return [];

    const candidates = new Set([query]);

    // Check Suru verbs
    for (const rule of SURU_SUFFIXES) {
        if (query.endsWith(rule.inflected) && query.length > rule.inflected.length) {
            const prefix = query.slice(0, -rule.inflected.length);
            candidates.add(prefix + rule.base);
            // Also add noun alone without suru (e.g. 勉強した -> 勉強)
            candidates.add(prefix);
        }
    }

    // Check Ichidan verbs
    for (const rule of ICHIDAN_SUFFIXES) {
        if (query.endsWith(rule.inflected) && query.length > rule.inflected.length) {
            const prefix = query.slice(0, -rule.inflected.length);
            candidates.add(prefix + rule.base);
        }
    }

    // Check Godan verbs
    for (const rule of GODAN_SUFFIXES) {
        if (query.endsWith(rule.inflected) && query.length >= rule.inflected.length) {
            const prefix = query.slice(0, -rule.inflected.length);
            const bases = Array.isArray(rule.base) ? rule.base : [rule.base];
            for (const b of bases) {
                candidates.add(prefix + b);
            }
        }
    }

    // Check I-adjectives
    for (const rule of I_ADJ_SUFFIXES) {
        if (query.endsWith(rule.inflected) && query.length > rule.inflected.length) {
            const prefix = query.slice(0, -rule.inflected.length);
            candidates.add(prefix + rule.base);
        }
    }

    return Array.from(candidates);
}
