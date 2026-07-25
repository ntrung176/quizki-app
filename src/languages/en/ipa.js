/**
 * English IPA Utilities
 */

const JAPANESE_CHAR_REGEX = /[\u3040-\u309F\u30A0-\u30FF\u4e00-\u9faf]/;

export const isEnglishText = (text) => {
    if (!text || typeof text !== 'string') return true;
    return !JAPANESE_CHAR_REGEX.test(text);
};

export const isEnglishCard = (card, isEnglishMode = false) => {
    if (!card) return isEnglishMode;

    if (typeof card === 'object') {
        if (card.targetLanguage === 'en') return true;
        if (card.targetLanguage === 'ja') return false;
        if (card.ipa && typeof card.ipa === 'string' && card.ipa.trim() !== '') return true;
    }

    const text = typeof card === 'string' ? card : (card.front || card.word || '');
    if (!text || text.trim() === '') return isEnglishMode;

    // If it contains Japanese characters (Kanji, Hiragana, Katakana), it's definitely Japanese
    if (JAPANESE_CHAR_REGEX.test(text)) return false;

    return isEnglishMode;
};

export const formatIPA = (ipa) => {
    if (!ipa || typeof ipa !== 'string' || ipa.trim() === '') return '';
    const clean = ipa.trim();
    return clean.startsWith('/') ? clean : `/${clean.replace(/^\/+|\/+$/g, '')}/`;
};

export const fetchEnglishIPA = async (word) => {
    if (!word || typeof word !== 'string') return '';
    const cleanWord = word.split('（')[0].split('(')[0].trim().toLowerCase();
    if (!cleanWord || !isEnglishText(cleanWord)) return '';

    try {
        const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(cleanWord)}`);
        if (response.ok) {
            const data = await response.json();
            if (Array.isArray(data) && data.length > 0) {
                const phonetics = data[0].phonetics || [];
                for (const p of phonetics) {
                    if (p.text && p.text.trim()) {
                        return formatIPA(p.text);
                    }
                }
                if (data[0].phonetic && data[0].phonetic.trim()) {
                    return formatIPA(data[0].phonetic);
                }
            }
        }
    } catch (e) {
        console.warn('Free Dictionary API lookup failed for IPA:', e);
    }
    return '';
};
