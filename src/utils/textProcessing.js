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

// Get the hiragana reading from front text like "勉強する（べんきょうする）"
// Returns the kana part for N5 fallback masking
export const getReadingForMasking = (text) => {
    if (!text) return '';
    const match = text.match(/[（(]([^）)]+)[）)]/);
    if (!match) return '';
    let reading = match[1].trim();
    // Clean up: lấy phần đầu nếu có ・ hoặc /
    if (reading.includes('・')) reading = reading.split('・')[0].trim();
    if (reading.includes('/')) reading = reading.split('/')[0].trim();
    // Loại bỏ する nếu có ở cuối
    if (reading.endsWith('する')) reading = reading.slice(0, -2);
    return reading;
};

// Xử lý masking cho động từ với logic hậu tố ngữ pháp
const maskVerbInExample = (targetWord, exampleSentence) => {
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
const maskAdjNaInExample = (targetWord, exampleSentence) => {
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
// reading: phần hiragana để fallback khi câu ví dụ viết bằng kana (đặc biệt N5)
export const maskWordInExample = (targetWord, exampleSentence, pos, reading = '') => {
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

    // Thử match chính xác trước (kanji)
    const exactMatch = maskExact100(normalizedTarget, exampleSentence, blank);
    if (exactMatch) return exactMatch;

    // Xử lý theo từ loại (kanji)
    let result = exampleSentence;
    switch (pos) {
        case 'verb':
            result = maskVerbInExample(targetWord, exampleSentence);
            break;
        case 'adj-na':
            result = maskAdjNaInExample(targetWord, exampleSentence);
            break;
        default:
            if (exampleSentence.includes(normalizedTarget)) {
                result = exampleSentence.replace(normalizedTarget, blank);
            }
            break;
    }

    // Nếu đã mask thành công bằng kanji, trả về
    if (result !== exampleSentence) return result;

    // === FALLBACK: thử dùng reading (hiragana) ===
    // Đặc biệt hữu ích cho từ vựng N5 - câu ví dụ viết bằng hiragana
    const kanaReading = reading || getReadingForMasking(targetWord);
    if (kanaReading && kanaReading !== normalizedTarget) {
        // Thử match chính xác bằng kana
        const kanaExact = maskExact100(kanaReading, exampleSentence, blank);
        if (kanaExact) return kanaExact;

        // Thử biến thể verb/adj bằng kana
        switch (pos) {
            case 'verb':
                result = maskVerbInExample(kanaReading, exampleSentence);
                if (result !== exampleSentence) return result;
                break;
            case 'adj-na':
                result = maskAdjNaInExample(kanaReading, exampleSentence);
                if (result !== exampleSentence) return result;
                break;
            default:
                if (exampleSentence.includes(kanaReading)) {
                    return exampleSentence.replace(kanaReading, blank);
                }
                break;
        }

        // Thử match kana + hậu tố ngữ pháp thông dụng
        const commonSuffixes = ['します', 'する', 'した', 'して', 'しない', 'しよう',
            'です', 'だ', 'な', 'に', 'で', 'い', 'く', 'かった', 'くない',
            'ます', 'ました', 'ません', 'ましょう', 'ない', 'なかった',
            'る', 'た', 'て', 'ている', 'ていた', 'れる', 'られる',
            'く', 'くて', 'かった', 'くない'];
        for (const suffix of commonSuffixes) {
            const pattern = kanaReading + suffix;
            if (exampleSentence.includes(pattern)) {
                return exampleSentence.replace(pattern, blank);
            }
        }
    }

    return exampleSentence;
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
const normalizeText = (text) => {
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

// Convert Japanese verb/adjective/phrase to dictionary form
export const convertToDictionaryForm = (text) => {
    if (!text) return '';
    let word = text.trim();

    // Remove ending punctuation/spaces
    word = word.replace(/[。、！？\s]+$/, '');

    // Irregular verbs check (come / do)
    if (word === 'きまして' || word === 'きます' || word === 'きました' || word === 'きよう' || word === 'こない' || word === 'こさせる' || word === 'こられる' || word === 'きて' || word === 'きた') {
        return '来る';
    }
    if (word === 'します' || word === 'しました' || word === 'しましょう' || word === 'して' || word === 'した' || word === 'しない' || word === 'せず' || word === 'せずに' || word === 'しよう') {
        return 'する';
    }

    // Compounds ending in suru / kuru
    if (word.endsWith('きまして') || word.endsWith('きます') || word.endsWith('きました') || word.endsWith('きよう') || word.endsWith('こない') || word.endsWith('こさせる') || word.endsWith('こられる') || word.endsWith('きて') || word.endsWith('きた')) {
        const endings = ['きまして', 'きます', 'きました', 'きよう', 'こない', 'こさせる', 'こられる', 'きて', 'きた'];
        for (const end of endings) {
            if (word.endsWith(end)) {
                return word.slice(0, -end.length) + '来る';
            }
        }
    }
    
    // Check for standard suru compounds, e.g. 勉強します, 勉強して
    const suruEndings = ['します', 'しました', 'しましょう', 'して', 'した', 'しない', 'せず', 'せずに', 'しよう', 'させる', 'される', 'されている', 'させること'];
    for (const end of suruEndings) {
        if (word.endsWith(end) && word.length > end.length) {
            const stem = word.slice(0, -end.length);
            const lastChar = stem.charAt(stem.length - 1);
            const isHiragana = /[\u3040-\u309F]/.test(lastChar);
            if (!isHiragana || lastChar === 'っ') {
                return stem + 'する';
            }
        }
    }

    const A_COLUMN = {
        'わ': 'う', 'ka': 'く', 'か': 'く', 'が': 'ぐ', 'さ': 'す', 'た': 'つ',
        'な': 'ぬ', 'ば': 'ぶ', 'ま': 'む', 'ら': 'る'
    };
    const I_COLUMN = {
        'い': 'う', 'ki': 'く', 'き': 'く', 'ぎ': 'ぐ', 'し': 'す', 'ch': 'つ', 'ち': 'つ',
        'に': 'ぬ', 'び': 'ぶ', 'み': 'む', 'り': 'る'
    };
    const E_COLUMN = {
        'え': 'う', 'ke': 'く', 'け': 'く', 'ge': 'ぐ', 'せ': 'す', 'te': 'つ', 'て': 'つ',
        'ne': 'ぬ', 'ね': 'ぬ', 'べ': 'ぶ', 'め': 'む', 'れ': 'る'
    };

    const isAColumn = (char) => !!A_COLUMN[char];
    const isIColumn = (char) => !!I_COLUMN[char];
    const isEColumn = (char) => !!E_COLUMN[char];

    const convertAColumnToDictionary = (stem) => {
        if (!stem) return '';
        const last = stem.charAt(stem.length - 1);
        if (A_COLUMN[last]) {
            return stem.slice(0, -1) + A_COLUMN[last];
        }
        return stem;
    };

    const convertIColumnToDictionary = (stem) => {
        if (!stem) return '';
        const last = stem.charAt(stem.length - 1);
        if (I_COLUMN[last]) {
            return stem.slice(0, -1) + I_COLUMN[last];
        }
        return stem + 'る'; // fallback to ru-verb
    };

    const convertEColumnToDictionary = (stem) => {
        if (!stem) return '';
        const last = stem.charAt(stem.length - 1);
        if (E_COLUMN[last]) {
            return stem.slice(0, -1) + E_COLUMN[last];
        }
        return stem;
    };

    // Keep reduction loop going to strip nested helpers
    let changed = true;
    let iterations = 0;
    while (changed && iterations < 5) {
        iterations++;
        changed = false;

        // Progressive/State: 〜ている, 〜ていた, etc.
        const progressiveEndings = ['ていらっしゃいます', 'ていらっしゃった', 'ておられます', 'ております', 'ていました', 'ています', 'ていた', 'ている', 'ておる', 'でいました', 'deimasu', 'でいます', 'deita', 'でいた', 'でいる', 'でおる'];
        for (const end of progressiveEndings) {
            if (word.endsWith(end)) {
                word = word.slice(0, -end.length) + (end.startsWith('đ') || end.startsWith('で') ? 'で' : 'て');
                changed = true;
                break;
            }
        }
        if (changed) continue;

        // Try / Preparatory / Completed: 〜てみる, 〜ておく, 〜てしまう, 〜ちゃう
        const prepEndings = ['てみます', 'てみました', 'てみよう', 'てみた', 'てみる', 'ておきます', 'ておきました', 'ておcon', 'ておこう', 'ておいた', 'ておく', 'てしまいます', 'てしまいました', 'てしまおう', 'てしまった', 'てしまう', 'ちゃいます', 'ちゃいました', 'ちゃおう', 'ちゃった', 'ちゃう', 'じゃいます', 'じゃいました', 'じゃおう', 'じゃった', 'じゃう'];
        for (const end of prepEndings) {
            if (word.endsWith(end)) {
                word = word.slice(0, -end.length) + (end.startsWith('gi') || end.startsWith('じ') || end.startsWith('đ') || end.startsWith('で') ? 'で' : 'て');
                changed = true;
                break;
            }
        }
        if (changed) continue;

        // Past polite / polite: 〜ました, 〜ましょう, 〜ます
        const politeEndings = ['ました', 'ましょう', 'ます'];
        let matchedPolite = false;
        for (const end of politeEndings) {
            if (word.endsWith(end)) {
                const stem = word.slice(0, -end.length);
                word = convertIColumnToDictionary(stem);
                matchedPolite = true;
                break;
            }
        }
        if (matchedPolite) {
            if (word.endsWith('行って') || word.endsWith('行った')) {
                word = word.slice(0, -2) + 'く';
            }
            changed = true;
            continue;
        }

        // Auxiliary: causative, passive, potential, desire
        const auxiliaryEndings = ['させられる', 'させられます', 'せられる', 'seられmasu', 'せられます', 'させられた', 'せられた', 'させよう', 'せよう', 'させる', 'される', 'られる', 'れru', 'れる', 'たかった', 'たくない', 'たい'];
        let matchedAux = false;
        for (const end of auxiliaryEndings) {
            if (word.endsWith(end)) {
                const stem = word.slice(0, -end.length);
                if (end === 'たい' || end === 'たくない' || end === 'たかった') {
                    word = convertIColumnToDictionary(stem);
                } else if (end.startsWith('させ') || end.startsWith('せ') || end.startsWith('さ')) {
                    word = convertAColumnToDictionary(stem);
                } else if (end.startsWith('られ') || end.startsWith('れ')) {
                    const lastChar = stem.charAt(stem.length - 1);
                    if (isAColumn(lastChar)) {
                        word = convertAColumnToDictionary(stem);
                    } else {
                        word = stem + 'る';
                    }
                }
                matchedAux = true;
                break;
            }
        }
        if (matchedAux) {
            if (word.endsWith('行って') || word.endsWith('行った')) {
                word = word.slice(0, -2) + 'く';
            }
            changed = true;
            continue;
        }

        // Conditional
        if (word.endsWith('れば')) {
            const stem = word.slice(0, -2);
            const lastChar = stem.charAt(stem.length - 1);
            if (isEColumn(lastChar)) {
                word = convertEColumnToDictionary(stem);
            } else {
                word = stem + 'る';
            }
            changed = true;
            continue;
        }

        // Negative past
        if (word.endsWith('なかった')) {
            word = word.slice(0, -4) + 'ない';
            changed = true;
            continue;
        }
        // Negative
        if (word.endsWith('ない')) {
            const stem = word.slice(0, -2);
            const lastChar = stem.charAt(stem.length - 1);
            if (isAColumn(lastChar)) {
                word = convertAColumnToDictionary(stem);
            } else {
                word = stem + 'る';
            }
            changed = true;
            continue;
        }

        // Past / Te-form (Godan & Ichidan)
        if (word.endsWith('行って') || word.endsWith('行った')) {
            word = word.slice(0, -2) + 'く';
            changed = true;
            continue;
        }

        const pastTeEndings = [
            { suffix: 'って', replacement: 'う' },
            { suffix: 'った', replacement: 'う' },
            { suffix: 'いて', replacement: 'く' },
            { suffix: 'いた', replacement: 'く' },
            { suffix: 'いで', replacement: 'ぐ' },
            { suffix: 'いだ', replacement: 'ぐ' },
            { suffix: 'して', replacement: 'す' },
            { suffix: 'した', replacement: 'す' },
            { suffix: 'んで', replacement: 'む' },
            { suffix: 'んだ', replacement: 'む' },
            { suffix: 'て', replacement: 'る' },
            { suffix: 'た', replacement: 'る' }
        ];

        let matchedPastTe = false;
        for (const { suffix, replacement } of pastTeEndings) {
            if (word.endsWith(suffix)) {
                const stem = word.slice(0, -suffix.length);
                if (suffix === 'って' || suffix === 'った') {
                    word = stem + 'う';
                } else {
                    word = stem + replacement;
                }
                matchedPastTe = true;
                break;
            }
        }
        if (matchedPastTe) {
            changed = true;
            continue;
        }
    }

    return word;
};
