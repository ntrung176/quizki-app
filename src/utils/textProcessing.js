import { GRAMMAR_SUFFIXES, PARTICLES } from '../config/constants';

// Get speech text - extract the main word for TTS
export const getSpeechText = (text) => {
    if (!text) return '';
    // Loại bỏ phần trong ngoặc (furigana, readings, etc.)
    let cleanedText = text.replace(/\s*[（(][^）)]*[）)]/g, '').trim();
    // Nếu có nhiều từ cách bởi ・ hoặc /, lấy từ đầu tiên
    if (cleanedText.includes('・')) {
        cleanedText = cleanedText.split('・')[0].trim();
    }
    if (cleanedText.includes('/')) {
        cleanedText = cleanedText.split('/')[0].trim();
    }
    return cleanedText;
};

// Get word for masking in examples
export const getWordForMasking = (text) => {
    if (!text) return '';
    // Loại bỏ phần trong ngoặc
    let cleanedText = text.replace(/\s*[（(][^）)]*[）)]/g, '').trim();
    // Nếu có ・ hoặc /, lấy từ đầu tiên
    if (cleanedText.includes('・')) {
        cleanedText = cleanedText.split('・')[0].trim();
    }
    if (cleanedText.includes('/')) {
        cleanedText = cleanedText.split('/')[0].trim();
    }
    // Loại bỏ する nếu có ở cuối (cho danh từ する)
    if (cleanedText.endsWith('する')) {
        cleanedText = cleanedText.slice(0, -2);
    }
    return cleanedText;
};

// Xử lý masking cho động từ với logic hậu tố ngữ pháp
export const maskVerbInExample = (targetWord, exampleSentence) => {
    if (!targetWord || !exampleSentence) return exampleSentence;

    const blank = '_____';
    const normalizedTarget = getWordForMasking(targetWord);

    // Các biến thể chính của động từ để tìm kiếm
    let verbStems = [normalizedTarget];

    // Nếu là động từ ます-form, thêm dictionary form
    if (normalizedTarget.endsWith('ます')) {
        const masuStem = normalizedTarget.slice(0, -2);
        verbStems.push(masuStem);
        // Thêm る form (cho ichidan)
        verbStems.push(masuStem + 'る');
    }

    // Nếu là dictionary form, thêm stem
    if (normalizedTarget.endsWith('る')) {
        verbStems.push(normalizedTarget.slice(0, -1));
    }
    if (normalizedTarget.endsWith('う')) {
        verbStems.push(normalizedTarget.slice(0, -1));
        verbStems.push(normalizedTarget.slice(0, -1) + 'い'); // te-form stem
    }
    if (normalizedTarget.endsWith('く')) {
        verbStems.push(normalizedTarget.slice(0, -1));
        verbStems.push(normalizedTarget.slice(0, -1) + 'い'); // te-form stem
    }
    if (normalizedTarget.endsWith('す')) {
        verbStems.push(normalizedTarget.slice(0, -1));
        verbStems.push(normalizedTarget.slice(0, -1) + 'し'); // te-form stem
    }
    if (normalizedTarget.endsWith('つ')) {
        verbStems.push(normalizedTarget.slice(0, -1));
        verbStems.push(normalizedTarget.slice(0, -1) + 'っ'); // te-form stem
    }
    if (normalizedTarget.endsWith('ぬ') || normalizedTarget.endsWith('む') || normalizedTarget.endsWith('ぶ')) {
        verbStems.push(normalizedTarget.slice(0, -1));
        verbStems.push(normalizedTarget.slice(0, -1) + 'ん'); // te-form stem
    }
    if (normalizedTarget.endsWith('ぐ')) {
        verbStems.push(normalizedTarget.slice(0, -1));
        verbStems.push(normalizedTarget.slice(0, -1) + 'い'); // te-form stem
    }

    // Loại bỏ duplicates và sắp xếp theo độ dài giảm dần
    verbStems = [...new Set(verbStems)].sort((a, b) => b.length - a.length);

    // Tìm match dài nhất trong câu
    for (const stem of verbStems) {
        // Thử match stem + suffix
        for (const suffix of GRAMMAR_SUFFIXES) {
            const pattern = stem + suffix;
            if (exampleSentence.includes(pattern)) {
                return exampleSentence.replace(pattern, blank);
            }
        }
        // Thử match stem trực tiếp (nếu theo sau là particle hoặc kết thúc câu)
        for (const particle of PARTICLES) {
            const pattern = stem + particle;
            if (exampleSentence.includes(pattern)) {
                return exampleSentence.replace(stem, blank);
            }
        }
        // Thử match stem ở cuối câu
        if (exampleSentence.endsWith(stem)) {
            return exampleSentence.replace(new RegExp(stem + '$'), blank);
        }
    }

    // Fallback: tìm từ gốc bình thường
    if (exampleSentence.includes(normalizedTarget)) {
        return exampleSentence.replace(normalizedTarget, blank);
    }

    return exampleSentence;
};

// Xử lý masking cho tính từ な với logic khớp không hoàn toàn
export const maskAdjNaInExample = (targetWord, exampleSentence) => {
    if (!targetWord || !exampleSentence) return exampleSentence;

    const blank = '_____';
    let normalizedTarget = getWordForMasking(targetWord);

    // Loại bỏ な ở cuối nếu có trong từ mục tiêu
    if (normalizedTarget.endsWith('な')) {
        normalizedTarget = normalizedTarget.slice(0, -1);
    }

    // Các pattern cần tìm cho tính từ な
    const patterns = [
        normalizedTarget + 'な', // Trước danh từ
        normalizedTarget + 'に', // Dùng như trạng từ
        normalizedTarget + 'だ', // Kết thúc câu (plain)
        normalizedTarget + 'です', // Kết thúc câu (polite)
        normalizedTarget + 'で', // Te-form
        normalizedTarget + 'だった', // Past (plain)
        normalizedTarget + 'でした', // Past (polite)
        normalizedTarget + 'じゃない', // Negative
        normalizedTarget + 'ではない', // Negative (formal)
        normalizedTarget // Từ gốc
    ];

    for (const pattern of patterns) {
        if (exampleSentence.includes(pattern)) {
            return exampleSentence.replace(pattern, blank);
        }
    }

    return exampleSentence;
};

// Xử lý masking cho câu ví dụ dựa trên từ loại
export const maskWordInExample = (targetWord, exampleSentence, pos) => {
    if (!targetWord || !exampleSentence) return exampleSentence;

    const blank = '_____';
    const normalizedTarget = getWordForMasking(targetWord);

    // Helper: thử khớp 100% (từ / （từ） / (từ))
    const maskExact100 = (word, sentence, blankChar = '_____') => {
        const patterns = [word, `（${word}）`, `(${word})`];
        for (const p of patterns) {
            if (sentence.includes(p)) {
                return sentence.replace(p, blankChar);
            }
        }
        return null;
    };

    // Thử match chính xác trước
    const exactMatch = maskExact100(normalizedTarget, exampleSentence, blank);
    if (exactMatch) return exactMatch;

    // Xử lý theo từ loại
    switch (pos) {
        case 'verb':
            return maskVerbInExample(targetWord, exampleSentence);
        case 'adj-na':
            return maskAdjNaInExample(targetWord, exampleSentence);
        default:
            // Fallback cho các từ loại khác: tìm từ gốc
            if (exampleSentence.includes(normalizedTarget)) {
                return exampleSentence.replace(normalizedTarget, blank);
            }
            return exampleSentence;
    }
};

// Với tính từ -na: chấp nhận đáp án có/không có "な"
export const buildAdjNaAcceptedAnswers = (normalizedText) => {
    const answers = [normalizedText];
    if (normalizedText.endsWith('な')) {
        answers.push(normalizedText.slice(0, -1));
    } else {
        answers.push(normalizedText + 'な');
    }
    return answers;
};

// Shuffle array (Fisher-Yates)
export const shuffleArray = (array) => {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
};

// Check if device is mobile/touch
export const isMobileDevice = () => {
    if (typeof navigator === 'undefined') return false;

    const userAgent = navigator.userAgent || navigator.vendor || window.opera;

    // Check for mobile user agents
    const mobileRegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;
    if (mobileRegex.test(userAgent)) return true;

    // Check for touch capability
    if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
        // Additional check: screen size
        if (window.innerWidth <= 1024) return true;
    }

    return false;
};

// Normalize text for comparison
export const normalizeText = (text) => {
    if (!text) return '';
    return text
        .toLowerCase()
        .trim()
        .replace(/\s+/g, ' ')
        .replace(/[（(][^）)]*[）)]/g, '') // Remove parenthetical content
        .replace(/[～〜]/g, ''); // Remove wave dash
};

// Split text ignoring content in parentheses
export const splitIgnoringParentheses = (text, delimiter) => {
    if (!text) return [];

    const result = [];
    let current = '';
    let depth = 0;

    for (const char of text) {
        if (char === '（' || char === '(') {
            depth++;
            current += char;
        } else if (char === '）' || char === ')') {
            depth--;
            current += char;
        } else if (depth === 0 && (char === delimiter || (delimiter === '、' && char === ','))) {
            if (current.trim()) {
                result.push(current.trim());
            }
            current = '';
        } else {
            current += char;
        }
    }

    if (current.trim()) {
        result.push(current.trim());
    }

    return result;
};

// Format multiple meanings with numbered markers
export const formatMultipleMeanings = (text) => {
    if (!text) return '';

    const markers = ['➀', '➁', '➂', '➃', '➄', '➅', '➆', '➇', '➈', '➉'];
    const meanings = splitIgnoringParentheses(text, '、');

    if (meanings.length <= 1) return text;

    return meanings
        .map((meaning, index) => `${markers[index] || `(${index + 1})`} ${meaning}`)
        .join('\n');
};
