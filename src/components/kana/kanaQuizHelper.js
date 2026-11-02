// =============================================================================
// Kana Quiz & Reflex Training Helper
// Generates diverse, high-retention questions based on characters the user mastered
// =============================================================================

import { KANA_DICTIONARY } from '../../data/kanaData';
import { shuffleArray } from '../../utils/textProcessing';

// Fallback basic Gojuon keys if user has not mastered enough characters
const BASIC_FALLBACK_KEYS = [
    'a', 'i', 'u', 'e', 'o',
    'ka', 'ki', 'ku', 'ke', 'ko',
    'sa', 'shi', 'su', 'se', 'so',
    'ta', 'chi', 'tsu', 'te', 'to',
    'na', 'ni', 'nu', 'ne', 'no',
    'ha', 'hi', 'fu', 'he', 'ho',
    'ma', 'mi', 'mu', 'me', 'mo'
];

/**
 * Filter pool of characters based on user's mastered list.
 * If user has marked >= 4 characters as learned, quiz strictly on them.
 * If < 4, combine marked characters with basic Gojuon characters so the quiz is fully playable.
 */
export const getUserLearnedPool = (targetType = 'hiragana', masteredList = [], kanaList = []) => {
    // Keys in masteredList have format: `${syllabary}_${id}`, e.g. "hiragana_a"
    const prefix = `${targetType}_`;
    const userMasteredKeys = masteredList
        .filter(k => typeof k === 'string' && k.startsWith(prefix))
        .map(k => k.replace(prefix, ''))
        .filter(id => Boolean(KANA_DICTIONARY[id]));

    const isCustomMastered = userMasteredKeys.length >= 4;

    let selectedKeys = [];
    if (isCustomMastered) {
        selectedKeys = [...userMasteredKeys];
    } else {
        // Combine user's marked keys + basic fallback characters
        const set = new Set([...userMasteredKeys, ...BASIC_FALLBACK_KEYS]);
        selectedKeys = Array.from(set);
    }

    const pool = selectedKeys
        .map(key => {
            const item = KANA_DICTIONARY[key];
            if (!item) return null;
            return {
                id: key,
                char: targetType === 'katakana' ? item.kata : item.hira,
                hira: item.hira,
                kata: item.kata,
                romaji: item.romaji,
                mnemonic: item.mnemonic,
                examples: item.examples || [],
                isMasteredByUser: userMasteredKeys.includes(key)
            };
        })
        .filter(Boolean);

    return {
        pool,
        isCustomMastered,
        masteredCount: userMasteredKeys.length
    };
};

/**
 * Generate 10 diverse speed quiz questions
 */
export const generateSpeedQuizQuestions = (pool, targetType = 'hiragana', questionCount = 10) => {
    if (!pool || pool.length === 0) return [];

    const shuffledPool = shuffleArray([...pool]);
    const questions = [];

    // All available meanings from dictionary for vocab distractor generation
    const allExamples = Object.values(KANA_DICTIONARY)
        .flatMap(item => item.examples || [])
        .filter(ex => ex && ex.meaning && ex.word);

    for (let i = 0; i < questionCount; i++) {
        const item = shuffledPool[i % shuffledPool.length];
        const otherItems = pool.filter(p => p.id !== item.id);

        // Distribute question types evenly
        // 0: char_to_romaji, 1: romaji_to_kana, 2: listening_kana, 3: convert_syllabary, 4: vocab_word
        const typeIndex = i % 5;

        if (typeIndex === 0) {
            // 1. KANA -> ROMAJI
            const wrongOptions = shuffleArray(otherItems)
                .slice(0, 3)
                .map(o => o.romaji);
            const options = shuffleArray([item.romaji, ...wrongOptions]);

            questions.push({
                id: `${item.id}-c2r-${i}`,
                type: 'char_to_romaji',
                title: 'Ký tự sau đây đọc là gì?',
                subtitle: 'Chọn phiên âm Romaji chính xác',
                badge: 'Phát âm',
                display: item.char,
                isAudioPrompt: false,
                audioChar: item.char,
                options,
                correct: item.romaji,
                kanaChar: item.char,
                romaji: item.romaji
            });
        } else if (typeIndex === 1) {
            // 2. ROMAJI -> KANA
            const wrongOptions = shuffleArray(otherItems)
                .slice(0, 3)
                .map(o => o.char);
            const options = shuffleArray([item.char, ...wrongOptions]);

            questions.push({
                id: `${item.id}-r2c-${i}`,
                type: 'romaji_to_kana',
                title: 'Ký tự nào có âm đọc sau?',
                subtitle: 'Chọn chữ Kana tương ứng',
                badge: 'Nhận diện chữ',
                display: `/${item.romaji}/`,
                isAudioPrompt: false,
                audioChar: item.char,
                options,
                correct: item.char,
                kanaChar: item.char,
                romaji: item.romaji
            });
        } else if (typeIndex === 2) {
            // 3. LISTENING -> KANA
            const wrongOptions = shuffleArray(otherItems)
                .slice(0, 3)
                .map(o => o.char);
            const options = shuffleArray([item.char, ...wrongOptions]);

            questions.push({
                id: `${item.id}-listen-${i}`,
                type: 'listening_kana',
                title: 'Nghe âm thanh và chọn ký tự đúng',
                subtitle: 'Bấm biểu tượng loa để nghe lại nếu cần',
                badge: 'Luyện nghe phản xạ',
                display: '🔊',
                isAudioPrompt: true,
                autoPlayAudio: true,
                audioChar: item.char,
                options,
                correct: item.char,
                kanaChar: item.char,
                romaji: item.romaji
            });
        } else if (typeIndex === 3) {
            // 4. CONVERT HIRAGANA <-> KATAKANA
            const isHiraToKata = targetType === 'hiragana';
            const promptChar = isHiraToKata ? item.hira : item.kata;
            const targetChar = isHiraToKata ? item.kata : item.hira;

            const wrongOptions = shuffleArray(otherItems)
                .slice(0, 3)
                .map(o => isHiraToKata ? o.kata : o.hira);
            const options = shuffleArray([targetChar, ...wrongOptions]);

            questions.push({
                id: `${item.id}-convert-${i}`,
                type: 'convert_syllabary',
                title: isHiraToKata
                    ? `Ký tự Katakana tương ứng của "${promptChar}" là gì?`
                    : `Ký tự Hiragana tương ứng của "${promptChar}" là gì?`,
                subtitle: isHiraToKata ? 'Chuyển đổi Hiragana → Katakana' : 'Chuyển đổi Katakana → Hiragana',
                badge: 'Chuyển đổi chữ',
                display: promptChar,
                isAudioPrompt: false,
                audioChar: promptChar,
                options,
                correct: targetChar,
                kanaChar: promptChar,
                romaji: item.romaji
            });
        } else {
            // 5. VOCABULARY APPLICATION
            const example = item.examples && item.examples.length > 0
                ? item.examples[Math.floor(Math.random() * item.examples.length)]
                : null;

            if (example && example.meaning && allExamples.length >= 4) {
                const wrongMeanings = shuffleArray(allExamples.filter(e => e.meaning !== example.meaning))
                    .slice(0, 3)
                    .map(e => e.meaning);
                const options = shuffleArray([example.meaning, ...wrongMeanings]);

                questions.push({
                    id: `${item.id}-vocab-${i}`,
                    type: 'vocab_word',
                    title: `Từ vựng thực tế chứa chữ "${item.char}"`,
                    subtitle: `Từ "${example.word}" (/${example.romaji}/) nghĩa là gì?`,
                    badge: 'Từ vựng ứng dụng',
                    display: example.word,
                    isAudioPrompt: false,
                    audioChar: example.word,
                    options,
                    correct: example.meaning,
                    kanaChar: example.word,
                    romaji: example.romaji
                });
            } else {
                // Fallback to char to romaji if no example
                const wrongOptions = shuffleArray(otherItems)
                    .slice(0, 3)
                    .map(o => o.romaji);
                const options = shuffleArray([item.romaji, ...wrongOptions]);

                questions.push({
                    id: `${item.id}-fallback-${i}`,
                    type: 'char_to_romaji',
                    title: 'Ký tự sau đây đọc là gì?',
                    subtitle: 'Chọn phiên âm Romaji chính xác',
                    badge: 'Phát âm',
                    display: item.char,
                    isAudioPrompt: false,
                    audioChar: item.char,
                    options,
                    correct: item.romaji,
                    kanaChar: item.char,
                    romaji: item.romaji
                });
            }
        }
    }

    return questions;
};

/**
 * Generate 6 pairs (12 cards) for Memory Match game
 */
export const generateMemoryMatchCards = (pool, targetType = 'hiragana', pairCount = 6) => {
    const selected = shuffleArray([...pool]).slice(0, pairCount);
    const gameCards = [];

    selected.forEach(item => {
        // Card 1: Hiragana
        gameCards.push({
            uniqueId: `card-hira-${item.id}`,
            pairId: item.id,
            content: item.hira,
            sub: 'Hiragana',
            audioChar: item.hira
        });

        // Card 2: Katakana or Romaji
        const isKata = targetType === 'katakana';
        gameCards.push({
            uniqueId: `card-match-${item.id}`,
            pairId: item.id,
            content: isKata ? item.kata : `/${item.romaji}/`,
            sub: isKata ? 'Katakana' : 'Romaji',
            audioChar: item.kata || item.hira
        });
    });

    return shuffleArray(gameCards);
};

