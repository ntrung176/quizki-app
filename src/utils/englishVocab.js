/**
 * Backward compatibility re-export for English Vocab utilities.
 * Core logic has been moved to src/languages/en/
 */
import { isEnglishCard as checkIsEnglishCard } from '../languages/en/ipa';
export { isEnglishText, isEnglishCard, formatIPA, fetchEnglishIPA } from '../languages/en/ipa';

export const shouldRunJapaneseFeatures = (card, isEnglishMode = false) => {
    return !checkIsEnglishCard(card, isEnglishMode);
};
