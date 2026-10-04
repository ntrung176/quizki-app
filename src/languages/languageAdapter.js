/**
 * Language Adapter Factory (Strategy Pattern)
 * Central manager for resolving language-specific behaviors & services.
 */
import { EnglishLanguageService, isEnglishCard, isEnglishText } from './en';
import { JapaneseLanguageService } from './ja';
import { KoreanLanguageService, isKoreanCard, isKoreanText } from './ko';

/**
 * Resolves appropriate LanguageService instance based on card metadata or language code
 */
export const getLanguageService = (cardOrLang, isEnglishMode = false, isKoreanMode = false) => {
    if (typeof cardOrLang === 'string') {
        const code = cardOrLang.toLowerCase();
        if (code === 'en') return EnglishLanguageService;
        if (code === 'ko') return KoreanLanguageService;
        if (code === 'ja') return JapaneseLanguageService;
        if (isKoreanText(cardOrLang)) return KoreanLanguageService;
        if (isEnglishText(cardOrLang)) return EnglishLanguageService;
        return JapaneseLanguageService;
    }

    if (cardOrLang && typeof cardOrLang === 'object') {
        if (isKoreanCard(cardOrLang, isKoreanMode)) {
            return KoreanLanguageService;
        }
        if (isEnglishCard(cardOrLang, isEnglishMode)) {
            return EnglishLanguageService;
        }
    }

    if (isKoreanMode) return KoreanLanguageService;
    if (isEnglishMode) return EnglishLanguageService;
    return JapaneseLanguageService;
};

export { EnglishLanguageService } from './en';
export { JapaneseLanguageService } from './ja';
export { KoreanLanguageService } from './ko';
export { isEnglishCard, isEnglishText, formatIPA } from './en';
export { isKoreanCard, isKoreanText, formatRomaja } from './ko';
