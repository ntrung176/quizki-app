/**
 * Language Adapter Factory (Strategy Pattern)
 * Central manager for resolving language-specific behaviors & services.
 */
import { EnglishLanguageService, isEnglishCard, isEnglishText } from './en';
import { JapaneseLanguageService } from './ja';

/**
 * Resolves appropriate LanguageService instance based on card metadata or language code
 */
export const getLanguageService = (cardOrLang, isEnglishMode = false) => {
    if (typeof cardOrLang === 'string') {
        const code = cardOrLang.toLowerCase();
        if (code === 'en') return EnglishLanguageService;
        if (code === 'ja') return JapaneseLanguageService;
        return isEnglishText(cardOrLang) ? EnglishLanguageService : JapaneseLanguageService;
    }

    if (cardOrLang && typeof cardOrLang === 'object') {
        if (isEnglishCard(cardOrLang, isEnglishMode)) {
            return EnglishLanguageService;
        }
    }

    return isEnglishMode ? EnglishLanguageService : JapaneseLanguageService;
};

export { EnglishLanguageService } from './en';
export { JapaneseLanguageService } from './ja';
export { isEnglishCard, isEnglishText, formatIPA } from './en';
