/**
 * Japanese Language Module Entry Point
 */
import { POS_TYPES } from '../../config/constants';
import { generateVocabPrompt, generateMoreExamplePrompt } from './jaPrompts';
import { getSinoVietnamese } from '../../utils/kanjiHVLookup';
import { ensureFuriganaFormat, generateFuriganaText } from '../../utils/furiganaHelper';
import { fetchJotobaWordData, accentNumberToPitchParts } from '../../utils/pitchAccent';

export const JapaneseLanguageService = {
    code: 'ja',
    name: 'Tiếng Nhật',
    collectionName: 'sharedVocabulary_ja',
    posTypes: POS_TYPES,
    isEnglishText: () => false,
    isEnglishCard: () => false,
    formatIPA: () => '',
    getSinoVietnamese,
    ensureFuriganaFormat,
    generateFuriganaText,
    fetchJotobaWordData: (...args) => fetchJotobaWordData(...args),
    accentNumberToPitchParts: (...args) => accentNumberToPitchParts(...args),
    generateVocabPrompt,
    generateMoreExamplePrompt,

    // Process card payload for creation / updating
    cleanCardData: (data, frontText = '') => {
        const front = (data.front || frontText || '').trim();
        return {
            front,
            back: (data.back || data.meaning || '').trim(),
            ipa: '',
            synonym: (data.synonym || '').trim(),
            sinoVietnamese: (data.sinoVietnamese || '').trim(),
            synonymSinoVietnamese: (data.synonymSinoVietnamese || '').trim(),
            reading: (data.reading || '').trim(),
            accent: data.accent !== undefined && data.accent !== null ? String(data.accent) : '',
            example: (data.example || '').trim(),
            exampleMeaning: (data.exampleMeaning || '').trim(),
            nuance: (data.nuance || '').trim(),
            pos: data.pos || '',
            level: data.level || '',
            targetLanguage: 'ja'
        };
    }
};

export * from './jaPrompts';
