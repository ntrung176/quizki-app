export const DEFAULT_CARD_SETTINGS = {
    front: {
        word: true,
        furigana: false,
        hanviet: false,
        example: false
    },
    back: {
        meaning: true,
        hanviet: true,
        synonym: false,
        example: false,
        word: false,
        furigana: false,
        reading: false,
        exampleFurigana: true,
        exampleMeaning: true,
        synonymFurigana: true,
        nuance: false
    },
    swapSides: false,
    autoPlayAudio: true,
    audioEnabled: true
};

export const splitIgnoringParentheses = (text, delimiter) => {
    if (!text) return [];
    const result = [];
    let currentPart = '';
    let depth = 0;

    for (let i = 0; i < text.length; i++) {
        const char = text[i];
        if (char === '(' || char === '（') {
            depth++;
            currentPart += char;
        } else if (char === ')' || char === '）') {
            depth--;
            currentPart += char;
        } else if (char === delimiter && depth === 0) {
            result.push(currentPart.trim());
            currentPart = '';
        } else {
            currentPart += char;
        }
    }

    if (currentPart.trim()) {
        result.push(currentPart.trim());
    }

    return result;
};

export const formatMultipleMeanings = (text) => {
    if (!text) return text;

    const numberSymbols = ['➀', '➁', '➂', '➃', '➄', '➅', '➆', '➇', '➈', '➉'];
    let meanings = [];

    const numberedMatches = [];
    let depth = 0;

    for (let i = 0; i < text.length; i++) {
        const char = text[i];
        if (char === '(' || char === '（') {
            depth++;
        } else if (char === ')' || char === '）') {
            depth--;
        } else if (depth === 0 && /^\d+\.\s/.test(text.substring(i))) {
            const match = text.substring(i).match(/^(\d+\.\s+)/);
            if (match) {
                numberedMatches.push({ start: i, number: parseInt(match[1]) });
            }
        }
    }

    if (numberedMatches.length >= 2) {
        for (let i = 0; i < numberedMatches.length; i++) {
            const start = numberedMatches[i].start;
            const end = i < numberedMatches.length - 1 ? numberedMatches[i + 1].start : text.length;
            const part = text.substring(start, end).trim();
            if (part) {
                meanings.push(part);
            }
        }
    }

    if (meanings.length <= 1) {
        if (text.includes('\n')) {
            meanings = text.split('\n').map(m => m.trim()).filter(m => m);
        } else if (text.includes(';')) {
            meanings = splitIgnoringParentheses(text, ';')
                .map(m => m.replace(/\s+/g, ' ').trim())
                .filter(m => m);
        } else {
            meanings = [text];
        }
    }

    if (meanings.length <= 1) {
        return text;
    }

    return meanings.map((meaning, index) => {
        const symbol = numberSymbols[index] || `${index + 1}.`;
        return `${symbol} ${meaning}`;
    }).join('\n');
};
