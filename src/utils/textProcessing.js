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
const escapeRegExp = (string) => {
    return string ? string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') : '';
};

// Get word for masking in examples
export const getWordForMasking = (text) => {
    if (!text) return '';
    // Strip wave dash ～ or 〜
    let cleanedText = text.replace(/[～〜]/g, '').trim();
    // Strip parenthetical readings (furigana / explanations)
    cleanedText = cleanedText.replace(/\s*[（(][^）)]*[）)]/g, '').trim();
    // If multiple words delimited by ・ or /, take the first
    if (cleanedText.includes('・')) {
        cleanedText = cleanedText.split('・')[0].trim();
    }
    if (cleanedText.includes('/')) {
        cleanedText = cleanedText.split('/')[0].trim();
    }
    // Remove trailing する if present (for noun + する verbs)
    if (cleanedText.endsWith('する') && cleanedText.length > 2) {
        cleanedText = cleanedText.slice(0, -2);
    }
    return cleanedText;
};

// Get the hiragana reading from front text like "勉強する（べんきょうする）"
export const getReadingForMasking = (text) => {
    if (!text) return '';
    const match = text.match(/[（(]([^）)]+)[）)]/);
    if (!match) return '';
    let reading = match[1].trim();
    reading = reading.replace(/[～〜]/g, '').trim();
    if (reading.includes('・')) reading = reading.split('・')[0].trim();
    if (reading.includes('/')) reading = reading.split('/')[0].trim();
    if (reading.endsWith('する') && reading.length > 2) reading = reading.slice(0, -2);
    return reading;
};

// Mask exact word, removing attached furigana in parentheses if present in sentence
const replaceWordWithFurigana = (word, sentence, blank = '_____') => {
    if (!word || !sentence) return null;
    const escaped = escapeRegExp(word);
    const regex = new RegExp(`${escaped}(?:[（(][^）)]*[）)])?`, 'g');
    if (regex.test(sentence)) {
        return sentence.replace(regex, blank);
    }
    return null;
};

// Xử lý masking cho tính từ い
const maskAdjIInExample = (targetWord, exampleSentence) => {
    if (!targetWord || !exampleSentence) return exampleSentence;
    const blank = '_____';
    let normalizedTarget = getWordForMasking(targetWord);
    
    let stem = normalizedTarget;
    if (normalizedTarget.endsWith('い')) {
        stem = normalizedTarget.slice(0, -1);
    }

    const suffixes = ['い', 'く', 'くて', 'かった', 'くない', 'くなかった', 'ければ', 'さ'];
    for (const suffix of suffixes) {
        const pattern = stem + suffix;
        const result = replaceWordWithFurigana(pattern, exampleSentence, blank);
        if (result) return result;
    }
    
    return replaceWordWithFurigana(stem, exampleSentence, blank) || exampleSentence;
};

// Xử lý masking cho động từ với logic hậu tố ngữ pháp
const maskVerbInExample = (targetWord, exampleSentence) => {
    if (!targetWord || !exampleSentence) return exampleSentence;

    const blank = '_____';
    const normalizedTarget = getWordForMasking(targetWord);

    let verbStems = [normalizedTarget];

    if (normalizedTarget.endsWith('ます')) {
        const masuStem = normalizedTarget.slice(0, -2);
        verbStems.push(masuStem);
        verbStems.push(masuStem + 'る');
    }

    if (normalizedTarget.endsWith('る')) {
        verbStems.push(normalizedTarget.slice(0, -1));
    }
    if (normalizedTarget.endsWith('う')) {
        verbStems.push(normalizedTarget.slice(0, -1));
        verbStems.push(normalizedTarget.slice(0, -1) + 'い');
    }
    if (normalizedTarget.endsWith('く')) {
        verbStems.push(normalizedTarget.slice(0, -1));
        verbStems.push(normalizedTarget.slice(0, -1) + 'い');
    }
    if (normalizedTarget.endsWith('す')) {
        verbStems.push(normalizedTarget.slice(0, -1));
        verbStems.push(normalizedTarget.slice(0, -1) + 'し');
    }
    if (normalizedTarget.endsWith('つ')) {
        verbStems.push(normalizedTarget.slice(0, -1));
        verbStems.push(normalizedTarget.slice(0, -1) + 'っ');
    }
    if (normalizedTarget.endsWith('ぬ') || normalizedTarget.endsWith('む') || normalizedTarget.endsWith('ぶ')) {
        verbStems.push(normalizedTarget.slice(0, -1));
        verbStems.push(normalizedTarget.slice(0, -1) + 'ん');
    }
    if (normalizedTarget.endsWith('ぐ')) {
        verbStems.push(normalizedTarget.slice(0, -1));
        verbStems.push(normalizedTarget.slice(0, -1) + 'い');
    }

    verbStems = [...new Set(verbStems)].sort((a, b) => b.length - a.length);

    for (const stem of verbStems) {
        for (const suffix of GRAMMAR_SUFFIXES) {
            const pattern = stem + suffix;
            const res = replaceWordWithFurigana(pattern, exampleSentence, blank);
            if (res) return res;
        }
        for (const particle of PARTICLES) {
            const pattern = stem + particle;
            const res = replaceWordWithFurigana(pattern, exampleSentence, blank);
            if (res) return res;
        }
        if (exampleSentence.endsWith(stem)) {
            const res = replaceWordWithFurigana(stem, exampleSentence, blank);
            if (res) return res;
        }
    }

    return replaceWordWithFurigana(normalizedTarget, exampleSentence, blank) || exampleSentence;
};

// Xử lý masking cho tính từ な
const maskAdjNaInExample = (targetWord, exampleSentence) => {
    if (!targetWord || !exampleSentence) return exampleSentence;

    const blank = '_____';
    let normalizedTarget = getWordForMasking(targetWord);

    if (normalizedTarget.endsWith('な')) {
        normalizedTarget = normalizedTarget.slice(0, -1);
    }

    const patterns = [
        normalizedTarget + 'な',
        normalizedTarget + 'に',
        normalizedTarget + 'だ',
        normalizedTarget + 'です',
        normalizedTarget + 'で',
        normalizedTarget + 'だった',
        normalizedTarget + 'でした',
        normalizedTarget + 'じゃない',
        normalizedTarget + 'ではない',
        normalizedTarget
    ];

    for (const pattern of patterns) {
        const res = replaceWordWithFurigana(pattern, exampleSentence, blank);
        if (res) return res;
    }

    return exampleSentence;
};

// Xử lý masking cho câu ví dụ dựa trên từ loại
export const maskWordInExample = (targetWord, exampleSentence, pos, reading = '') => {
    if (!targetWord || !exampleSentence) return exampleSentence;

    const blank = '_____';
    const normalizedTarget = getWordForMasking(targetWord);
    if (!normalizedTarget) return exampleSentence;

    // 1. Exact match with furigana strip
    let match = replaceWordWithFurigana(normalizedTarget, exampleSentence, blank);
    if (match) return match;

    // 2. Pos-based matching
    let result = exampleSentence;
    const posLower = (pos || '').toLowerCase();
    if (posLower.includes('verb') || posLower.includes('v') || normalizedTarget.endsWith('る') || normalizedTarget.endsWith('う') || normalizedTarget.endsWith('く') || normalizedTarget.endsWith('す') || normalizedTarget.endsWith('つ') || normalizedTarget.endsWith('む') || normalizedTarget.endsWith('ぶ') || normalizedTarget.endsWith('ぐ')) {
        result = maskVerbInExample(normalizedTarget, exampleSentence);
        if (result !== exampleSentence) return result;
    }

    if (posLower.includes('adj-na') || posLower.includes('na') || normalizedTarget.endsWith('な')) {
        result = maskAdjNaInExample(normalizedTarget, exampleSentence);
        if (result !== exampleSentence) return result;
    }

    if (posLower.includes('adj-i') || posLower.includes('adj') || normalizedTarget.endsWith('い')) {
        result = maskAdjIInExample(normalizedTarget, exampleSentence);
        if (result !== exampleSentence) return result;
    }

    // 3. Fallback: Kana reading match
    const kanaReading = reading || getReadingForMasking(targetWord);
    if (kanaReading && kanaReading !== normalizedTarget) {
        match = replaceWordWithFurigana(kanaReading, exampleSentence, blank);
        if (match) return match;

        if (posLower.includes('verb') || posLower.includes('v')) {
            result = maskVerbInExample(kanaReading, exampleSentence);
            if (result !== exampleSentence) return result;
        }
        if (posLower.includes('adj-na')) {
            result = maskAdjNaInExample(kanaReading, exampleSentence);
            if (result !== exampleSentence) return result;
        }
        if (posLower.includes('adj-i') || posLower.includes('adj')) {
            result = maskAdjIInExample(kanaReading, exampleSentence);
            if (result !== exampleSentence) return result;
        }
    }

    // 4. Fallback for Kanji stems: match Kanji stem + any following Japanese hiragana inflections
    if (normalizedTarget.length >= 1) {
        const kanjiMatch = normalizedTarget.match(/^[\u4e00-\u9faf]+/);
        if (kanjiMatch) {
            const kanjiStem = kanjiMatch[0];
            const escapedStem = escapeRegExp(kanjiStem);
            const stemRegex = new RegExp(`${escapedStem}[ぁ-ん]*(?:[（(][^）)]*[）)])?`, 'g');
            if (stemRegex.test(exampleSentence)) {
                return exampleSentence.replace(stemRegex, blank);
            }
        }
    }

    // 5. Final substring match
    if (exampleSentence.includes(normalizedTarget)) {
        return replaceWordWithFurigana(normalizedTarget, exampleSentence, blank);
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
