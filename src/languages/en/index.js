/**
 * English Language Module Entry Point
 */
import { ENGLISH_POS_TYPES } from '../../config/constants';
import { isEnglishText, isEnglishCard, formatIPA } from './ipa';
import { generateEnglishVocabPrompt, generateEnglishMoreExamplePrompt } from './enPrompts';

export const EnglishLanguageService = {
    code: 'en',
    name: 'Tiếng Anh',
    collectionName: 'sharedVocabulary_en',
    posTypes: ENGLISH_POS_TYPES,
    isEnglishText,
    isEnglishCard,
    formatIPA,
    generateVocabPrompt: generateEnglishVocabPrompt,
    generateMoreExamplePrompt: generateEnglishMoreExamplePrompt,
    
    // Process card payload for creation / updating
    cleanCardData: (data, frontText = '') => {
        const front = (data.front || frontText || '').trim();
        return {
            front,
            back: (data.back || data.meaning || '').trim(),
            ipa: formatIPA(data.ipa),
            synonym: (data.synonym || '').trim(),
            sinoVietnamese: '',
            synonymSinoVietnamese: '',
            reading: '',
            accent: '',
            example: (data.example || '').trim(),
            exampleMeaning: (data.exampleMeaning || '').trim(),
            nuance: (data.nuance || '').trim(),
            pos: data.pos || '',
            level: data.level || '',
            targetLanguage: 'en'
        };
    }
};

export * from './ipa';
export * from './enPrompts';
