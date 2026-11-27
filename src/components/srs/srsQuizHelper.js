/**
 * Reusable Multiple-Choice Question Builder for SRS Review Sessions
 * Supports Vocabulary, Kanji, and Grammar decks with deterministic per-card seeding.
 */

const stripHtml = (str = '') => {
    if (!str) return '';
    return String(str)
        .replace(/<br\s*\/?>/gi, ' ')
        .replace(/<[^>]+>/g, '')
        .replace(/\s+/g, ' ')
        .trim();
};

const normCompare = (str = '') => {
    return stripHtml(str)
        .toLowerCase()
        .replace(/[（(][^）)]*[）)]/g, '')
        .replace(/[\[\]【】「」『』.,!?:;'"~～〜\-–—_\s・·。、！？]/g, '')
        .trim();
};

const hashSeed = (str = '') => {
    let h = 2166136261;
    const s = String(str);
    for (let i = 0; i < s.length; i++) {
        h ^= s.charCodeAt(i);
        h = Math.imul(h, 16777619);
    }
    return h >>> 0;
};

const createSeededRng = (seedNum) => {
    let a = (seedNum || 1) >>> 0;
    return () => {
        a |= 0;
        a = (a + 0x6D2B79F5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
};

const shuffleWithRng = (items = [], rng) => {
    const arr = [...items];
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
};

const VOCAB_BACKUPS_VI = [
    'Hành động thường ngày',
    'Phương tiện đi lại',
    'Thời gian biểu',
    'Địa điểm làm việc',
    'Trạng thái cảm xúc',
    'Vật dụng trong nhà'
];

const VOCAB_BACKUPS_JA = [
    'まいにち (Mỗi ngày)',
    'ともだち (Bạn bè)',
    'しごと (Công việc)',
    'でんしゃ (Tàu điện)',
    'りょうり (Món ăn)',
    'じかん (Thời gian)'
];

const KANJI_BACKUPS_CHAR = ['日', '月', '水', '火', '木', '金', '土', '山', '川', '人'];
const KANJI_BACKUPS_MEANING = [
    'NHẬT • Mặt trời / Ngày',
    'THỦY • Nước',
    'MỘC • Cây cối',
    'SƠN • Ngọn núi',
    'HỎA • Ngọn lửa',
    'KIM • Kim loại / Vàng'
];

const GRAMMAR_BACKUPS_VI = [
    'Trong khi làm ~ thì xảy ra ~',
    'Nhờ có ~ nên kết quả tốt đẹp',
    'Mặc dù ~ nhưng kết quả trái ngược',
    'Theo như ~ đã thông báo trước',
    'Cố gắng duy trì thói quen ~',
    'Không hẳn là ~ (phủ định một phần)'
];

const GRAMMAR_BACKUPS_JA = [
    '〜ながら',
    '〜おかげで',
    '〜のに',
    '〜とおりに',
    '〜ようにする',
    '〜わけではない'
];

const pickUniqueDistractors = (targetText, candidateTexts = [], fallbackTexts = [], rng, count = 3) => {
    const seen = new Set([normCompare(targetText)]);
    const picked = [];

    const shuffledCandidates = shuffleWithRng(candidateTexts, rng);
    for (const raw of shuffledCandidates) {
        const clean = stripHtml(raw);
        if (!clean || clean === '—') continue;
        const norm = normCompare(clean);
        if (!norm || seen.has(norm)) continue;
        seen.add(norm);
        picked.push(clean);
        if (picked.length >= count) break;
    }

    if (picked.length < count) {
        const shuffledFallback = shuffleWithRng(fallbackTexts, rng);
        for (const raw of shuffledFallback) {
            const clean = stripHtml(raw);
            const norm = normCompare(clean);
            if (!norm || seen.has(norm)) continue;
            seen.add(norm);
            picked.push(clean);
            if (picked.length >= count) break;
        }
    }

    return picked.slice(0, count);
};

export const resolveGrammarStudyDirection = (card, studyMode = 'ja_to_vi') => {
    if (!studyMode || studyMode === 'ja_to_vi') return 'ja_to_vi';
    if (studyMode === 'vi_to_ja') return 'vi_to_ja';
    if (studyMode === 'random' && card?.id) {
        const sum = String(card.id).split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
        return sum % 2 === 0 ? 'ja_to_vi' : 'vi_to_ja';
    }
    return 'ja_to_vi';
};

const formatVocabForeignOption = (c = {}) => {
    const word = stripHtml(c.front || c.word || c.vocabulary || '');
    const reading = stripHtml(c.reading || c.kana || '');
    if (!word) return reading;
    if (reading && normCompare(reading) !== normCompare(word) && !word.includes(reading)) {
        return `${word}（${reading}）`;
    }
    return word;
};

const formatKanjiMeaningOption = (k = {}) => {
    const hv = stripHtml(k.sinoVietnamese || k.sinoViet || k.hanviet || '').toUpperCase();
    const meaning = stripHtml(k.meaning || k.meaningVi || k.back || '');
    if (hv && meaning && normCompare(hv) !== normCompare(meaning)) {
        return `${hv} • ${meaning}`;
    }
    return hv || meaning || '';
};

export const buildSrsQuizQuestion = ({
    type = 'vocab',
    card,
    pool = [],
    swapSides = false,
    grammarStudyMode = 'ja_to_vi',
    seedKey = ''
}) => {
    if (!card) return { options: [], correctAnswer: '', promptHint: '' };
    const rng = createSeededRng(hashSeed(`${type}_${card.id || card.character || ''}_${seedKey}_${swapSides}`));

    if (type === 'kanji') {
        if (swapSides) {
            const correctAnswer = stripHtml(card.character || card.kanji || card.literal || '');
            const sameLevel = pool.filter(k => k.jlpt && card.jlpt && k.jlpt === card.jlpt && (k.character || k.kanji) !== correctAnswer);
            const otherItems = pool.filter(k => (k.character || k.kanji) !== correctAnswer);
            const candidatePool = [
                ...sameLevel.slice(0, 60).map(k => k.character || k.kanji || k.literal),
                ...otherItems.slice(0, 120).map(k => k.character || k.kanji || k.literal)
            ];
            const distractors = pickUniqueDistractors(correctAnswer, candidatePool, KANJI_BACKUPS_CHAR, rng);
            return {
                options: shuffleWithRng([correctAnswer, ...distractors], rng),
                correctAnswer,
                promptHint: 'Chọn chữ Kanji đúng với Hán Việt / nghĩa ở trên'
            };
        }

        const correctAnswer = formatKanjiMeaningOption(card) || '—';
        const sameLevel = pool.filter(k => k.id !== card.id && k.jlpt && card.jlpt && k.jlpt === card.jlpt);
        const otherItems = pool.filter(k => k.id !== card.id);
        const candidatePool = [
            ...sameLevel.slice(0, 60).map(formatKanjiMeaningOption),
            ...otherItems.slice(0, 120).map(formatKanjiMeaningOption)
        ];
        const distractors = pickUniqueDistractors(correctAnswer, candidatePool, KANJI_BACKUPS_MEANING, rng);
        return {
            options: shuffleWithRng([correctAnswer, ...distractors], rng),
            correctAnswer,
            promptHint: 'Chọn âm Hán Việt & ý nghĩa đúng của chữ Kanji'
        };
    }

    if (type === 'grammar') {
        const direction = resolveGrammarStudyDirection(card, grammarStudyMode);
        if (direction === 'vi_to_ja') {
            const correctAnswer = stripHtml(card.pattern || card.title || '—');
            const sameLevel = pool.filter(g => g.id !== card.id && g.level && card.level && g.level === card.level);
            const otherItems = pool.filter(g => g.id !== card.id);
            const candidatePool = [
                ...sameLevel.slice(0, 60).map(g => g.pattern || g.title),
                ...otherItems.slice(0, 120).map(g => g.pattern || g.title)
            ];
            const distractors = pickUniqueDistractors(correctAnswer, candidatePool, GRAMMAR_BACKUPS_JA, rng);
            return {
                options: shuffleWithRng([correctAnswer, ...distractors], rng),
                correctAnswer,
                promptHint: 'Chọn mẫu ngữ pháp tiếng Nhật tương ứng'
            };
        }

        const correctAnswer = stripHtml(card.meaningShort || card.meaning || card.meaningFull || card.back || '—');
        const sameLevel = pool.filter(g => g.id !== card.id && g.level && card.level && g.level === card.level);
        const otherItems = pool.filter(g => g.id !== card.id);
        const candidatePool = [
            ...sameLevel.slice(0, 60).map(g => g.meaningShort || g.meaning || g.meaningFull || g.back),
            ...otherItems.slice(0, 120).map(g => g.meaningShort || g.meaning || g.meaningFull || g.back)
        ];
        const distractors = pickUniqueDistractors(correctAnswer, candidatePool, GRAMMAR_BACKUPS_VI, rng);
        return {
            options: shuffleWithRng([correctAnswer, ...distractors], rng),
            correctAnswer,
            promptHint: 'Chọn ý nghĩa đúng của mẫu ngữ pháp'
        };
    }

    // Default: Vocabulary SRS
    if (swapSides) {
        const correctAnswer = formatVocabForeignOption(card) || '—';
        const samePos = pool.filter(c => c.id !== card.id && c.pos && card.pos && c.pos === card.pos);
        const otherCards = pool.filter(c => c.id !== card.id);
        const candidatePool = [
            ...samePos.slice(0, 50).map(formatVocabForeignOption),
            ...otherCards.slice(0, 120).map(formatVocabForeignOption)
        ];
        const distractors = pickUniqueDistractors(correctAnswer, candidatePool, VOCAB_BACKUPS_JA, rng);
        return {
            options: shuffleWithRng([correctAnswer, ...distractors], rng),
            correctAnswer,
            promptHint: 'Chọn từ vựng đúng với nghĩa tiếng Việt'
        };
    }

    const correctAnswer = stripHtml(card.back || card.meaning || '—');
    const samePos = pool.filter(c => c.id !== card.id && c.pos && card.pos && c.pos === card.pos);
    const otherCards = pool.filter(c => c.id !== card.id);
    const candidatePool = [
        ...samePos.slice(0, 50).map(c => c.back || c.meaning),
        ...otherCards.slice(0, 120).map(c => c.back || c.meaning)
    ];
    const distractors = pickUniqueDistractors(correctAnswer, candidatePool, VOCAB_BACKUPS_VI, rng);
    return {
        options: shuffleWithRng([correctAnswer, ...distractors], rng),
        correctAnswer,
        promptHint: 'Chọn ý nghĩa đúng của từ vựng trên'
    };
};
