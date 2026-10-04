/**
 * Korean Language Module Entry Point
 */
import { KOREAN_POS_TYPES, isKoreanText, isKoreanCard, formatRomaja } from './hangul';
import { generateKoreanVocabPrompt, generateKoreanMoreExamplePrompt } from './koPrompts';

export const KoreanLanguageService = {
    code: 'ko',
    name: 'Tiếng Hàn',
    collectionName: 'sharedVocabulary_ko',
    posTypes: KOREAN_POS_TYPES,
    isKoreanText,
    isKoreanCard,
    formatRomaja,
    generateVocabPrompt: generateKoreanVocabPrompt,
    generateMoreExamplePrompt: generateKoreanMoreExamplePrompt,

    // Process card payload for creation / updating
    cleanCardData: (data, frontText = '') => {
        const front = (data.front || frontText || '').trim();
        return {
            front,
            back: (data.back || data.meaning || '').trim(),
            reading: formatRomaja(data.reading || data.romaja || ''),
            sinoVietnamese: (data.sinoVietnamese || data.hanja || data.hanviet || '').trim(),
            synonym: (data.synonym || '').trim(),
            synonymSinoVietnamese: (data.synonymSinoVietnamese || '').trim(),
            ipa: '',
            accent: '',
            example: (data.example || '').trim(),
            exampleMeaning: (data.exampleMeaning || '').trim(),
            nuance: (data.nuance || '').trim(),
            userMnemonic: (data.userMnemonic || data.customMnemonic || data.mnemonic || '').trim(),
            customMnemonic: (data.customMnemonic || data.userMnemonic || data.mnemonic || '').trim(),
            mnemonic: (data.mnemonic || data.userMnemonic || data.customMnemonic || '').trim(),
            pos: data.pos || '',
            level: data.level || '',
            targetLanguage: 'ko'
        };
    }
};

export * from './hangul';
export * from './koPrompts';
