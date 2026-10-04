/**
 * Korean Hangul & Text Utilities
 */

export const HANGUL_REGEX = /[\uAC00-\uD7AF\u1100-\u11FF\u3130-\u318F\uA960-\uA97F\uD7B0-\uD7FF]/;
export const JAPANESE_CHAR_REGEX = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF\u3400-\u4DBF\u3005]/;

export const KOREAN_POS_TYPES = {
    noun: { label: 'Danh từ (명사)', color: 'bg-blue-100 text-blue-700 border-blue-200' },
    verb: { label: 'Động từ (동사)', color: 'bg-red-100 text-red-700 border-red-200' },
    adjective: { label: 'Tính từ (형용사)', color: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
    adverb: { label: 'Phó từ (부사)', color: 'bg-sky-100 text-sky-700 border-sky-200' },
    particle: { label: 'Trợ từ (조사)', color: 'bg-cyan-100 text-cyan-700 border-cyan-200' },
    conjunction: { label: 'Liên từ (접속사)', color: 'bg-pink-100 text-pink-700 border-pink-200' },
    pronoun: { label: 'Đại từ (대명사)', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
    numeral: { label: 'Số từ (수사)', color: 'bg-indigo-100 text-indigo-700 border-indigo-200' },
    determiner: { label: 'Định từ (관형사)', color: 'bg-purple-100 text-purple-700 border-purple-200' },
    interjection: { label: 'Thán từ (감탄사)', color: 'bg-amber-100 text-amber-700 border-amber-200' },
    expression: { label: 'Cụm từ / Quán dụng ngữ (관용구)', color: 'bg-teal-100 text-teal-700 border-teal-200' },
    other: { label: 'Khác', color: 'bg-gray-100 text-gray-700 border-gray-200' }
};

export const isKoreanText = (text) => {
    if (!text || typeof text !== 'string') return false;
    return HANGUL_REGEX.test(text);
};

export const isKoreanCard = (card, isKoreanMode = false) => {
    if (!card) return isKoreanMode;

    if (typeof card === 'object') {
        if (card.targetLanguage === 'ko') return true;
        if (card.targetLanguage === 'ja' || card.targetLanguage === 'en') return false;
    }

    const text = typeof card === 'string' ? card : (card.front || card.word || '');
    if (!text || text.trim() === '') return isKoreanMode;

    if (HANGUL_REGEX.test(text)) return true;
    if (JAPANESE_CHAR_REGEX.test(text)) return false;

    return isKoreanMode;
};

export const formatRomaja = (romaja) => {
    if (!romaja || typeof romaja !== 'string') return '';
    return romaja.trim();
};
