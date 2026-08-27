/**
 * Anki Diff & Text Comparison Engine
 * Chuẩn hóa chuỗi và tính toán so sánh diff từng ký tự kiểu Anki cho tiếng Nhật, Việt và Anh.
 */

// Chuyển Katakana thành Hiragana để so sánh cách đọc linh hoạt
export const toHiragana = (str = '') => {
    if (!str) return '';
    return str.replace(/[\u30A1-\u30F6]/g, (match) => {
        const chr = match.charCodeAt(0) - 0x60;
        return String.fromCharCode(chr);
    });
};

// Chuẩn hóa chuỗi: loại bỏ khoảng trắng thừa, dấu câu, ngoặc furigana
export const normalize = (text = '') => {
    if (!text) return '';
    return String(text)
        .replace(/（[^）]*）/g, '')
        .replace(/\([^)]*\)/g, '')
        .replace(/[。、！？\s\.,!\?~\-–—:;]/g, '')
        .toLowerCase()
        .trim();
};

/**
 * Tách các thành phần của từ tiếng Nhật (Kanji part, Kana reading part, full word)
 */
export const extractJapaneseParts = (card = {}) => {
    const rawFront = card.front || card.vocabulary || card.word || card.character || '';
    const rawReading = card.reading || card.furigana || card.frontWithFurigana || '';
    
    // Tách phần Kanji và phần trong ngoặc
    const kanjiPart = rawFront.split('（')[0].split('(')[0].trim();
    const kanaMatch = (rawFront + ' ' + rawReading).match(/（([^）]+)）/) || (rawFront + ' ' + rawReading).match(/\(([^)]+)\)/);
    const kanaPart = kanaMatch ? kanaMatch[1].trim() : (rawReading ? rawReading.trim() : (kanjiPart ? '' : rawFront));

    // Lấy thêm âm On/Kun nếu là Kanji card
    const onReading = card.on || card.onyomi || '';
    const kunReading = card.kun || card.kunyomi || '';

    return {
        kanjiPart,
        kanaPart,
        rawFront,
        rawReading,
        onReading,
        kunReading,
        sinoViet: card.sinoVietnamese || card.sinoViet || card.hanviet || '',
        meaning: card.back || card.meaning || '',
        synonyms: Array.isArray(card.synonyms) ? card.synonyms : (typeof card.synonyms === 'string' ? card.synonyms.split(/[,;\n]+/).map(s => s.trim()) : [])
    };
};

/**
 * Kiểm tra xem câu trả lời của người dùng có khớp với thẻ hay không
 * Chấp nhận CẢ Hiragana (cách đọc), Katakana, Kanji (chữ Hán), Âm Hán Việt hoặc Nghĩa
 */
export const checkAnswerMatch = (userInput = '', card = {}) => {
    if (!userInput || !userInput.trim()) return false;
    const cleanInput = userInput.trim();
    const normInput = toHiragana(normalize(cleanInput));

    const parts = extractJapaneseParts(card);
    const candidates = [
        parts.kanjiPart,
        parts.kanaPart,
        parts.rawFront,
        parts.rawReading,
        parts.onReading,
        parts.kunReading,
        parts.sinoViet,
        parts.meaning,
        ...parts.synonyms
    ].filter(Boolean);

    // 1. So sánh chuẩn hóa với tất cả các ứng viên (chấp nhận cả Kanji lẫn Hiragana/Katakana)
    for (const cand of candidates) {
        if (normInput === toHiragana(normalize(cand))) return true;
        if (normalize(cleanInput) === normalize(cand)) return true;
    }

    // 2. Hỗ trợ tính từ đuôi な
    if (card.pos === 'adj_na') {
        for (const cand of candidates) {
            const normCand = toHiragana(normalize(cand));
            if (normInput === normCand + 'な' || normInput + 'な' === normCand) return true;
        }
    }

    // 3. Với nghĩa tiếng Việt có nhiều dấu phẩy / chấm phẩy
    if (parts.meaning) {
        const meaningItems = parts.meaning.split(/[,;\n/]+/).map(m => normalize(m)).filter(Boolean);
        for (const m of meaningItems) {
            if (normalize(cleanInput) === m) return true;
        }
    }

    // 4. Với Hán Việt có dấu cách
    if (parts.sinoViet) {
        if (normalize(cleanInput) === normalize(parts.sinoViet)) return true;
    }

    return false;
};

/**
 * Thuật toán Longest Common Subsequence (LCS) để so sánh diff chi tiết từng ký tự giữa input và target
 */
const computeLCS = (s1, s2) => {
    const m = s1.length;
    const n = s2.length;
    const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

    for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
            if (s1[i - 1] === s2[j - 1]) {
                dp[i][j] = dp[i - 1][j - 1] + 1;
            } else {
                dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
            }
        }
    }
    return dp;
};

/**
 * Tính toán mảng Diff phong cách Anki
 * Tự động nhận diện người dùng gõ Kanji, Hiragana, Hán Việt hay Nghĩa để hiển thị so sánh chuẩn xác
 */
export const calculateAnkiDiff = (userInput = '', card = {}, options = {}) => {
    const isReversed = typeof options === 'boolean' ? options : Boolean(options.isReversed);
    const expectedLanguage = typeof options === 'object' ? (options.expectedLanguage || 'auto') : 'auto';

    const parts = extractJapaneseParts(card);
    const cleanInput = (userInput || '').trim();
    const normInput = toHiragana(normalize(cleanInput));

    const kanjiCandidate = parts.kanjiPart || parts.rawFront || '';
    const kanaCandidate = parts.kanaPart || parts.rawReading || '';
    const isKanjiCard = Boolean(card.character && !card.front);

    const candidates = [
        kanjiCandidate,
        kanaCandidate,
        parts.onReading,
        parts.kunReading,
        parts.sinoViet,
        parts.meaning,
        ...parts.synonyms
    ].filter(Boolean);

    const isMatch = checkAnswerMatch(cleanInput, card);

    if (isMatch) {
        // Tìm ứng viên nào khớp với input của người dùng nhất
        let matchedTarget = kanjiCandidate || kanaCandidate || parts.meaning;
        for (const cand of candidates) {
            if (normInput === toHiragana(normalize(cand)) || normalize(cleanInput) === normalize(cand)) {
                matchedTarget = cand;
                break;
            }
        }

        const displayTarget = matchedTarget.split('（')[0].split('(')[0].trim() || matchedTarget;

        return {
            isMatch: true,
            userTokens: cleanInput.split('').map(char => ({ char, type: 'correct' })),
            targetTokens: displayTarget.split('').map(char => ({ char, type: 'correct' })),
            primaryTarget: displayTarget
        };
    }

    // Nếu không khớp: Xác định target phù hợp nhất dựa trên chế độ đang hỏi
    let bestTarget = '';

    if (expectedLanguage === 'vi' || (!isKanjiCard && !isReversed && expectedLanguage === 'auto')) {
        // Hỏi Tiếng Nhật -> Nhập Tiếng Việt
        bestTarget = parts.meaning || parts.sinoViet || kanjiCandidate;
    } else if (expectedLanguage === 'sino' || (isKanjiCard && !isReversed && expectedLanguage === 'auto')) {
        // Hỏi Kanji -> Nhập Âm Hán Việt
        bestTarget = parts.sinoViet || parts.meaning || kanjiCandidate;
    } else if (expectedLanguage === 'kanji' || (isKanjiCard && isReversed && expectedLanguage === 'auto')) {
        // Hỏi Hán Việt/Nghĩa -> Nhập chữ Kanji
        bestTarget = kanjiCandidate || kanaCandidate || parts.sinoViet;
    } else {
        // Hỏi Tiếng Việt -> Nhập Tiếng Nhật (chọn giữa Hiragana và Kanji theo điểm LCS)
        let bestScore = -1;
        bestTarget = kanaCandidate || kanjiCandidate || parts.meaning || '';

        for (const cand of [kanaCandidate, kanjiCandidate, parts.sinoViet].filter(Boolean)) {
            const cleanCand = cand.split('（')[0].split('(')[0].trim();
            const dp = computeLCS(cleanInput, cleanCand);
            const score = dp[cleanInput.length][cleanCand.length];
            if (score > bestScore) {
                bestScore = score;
                bestTarget = cleanCand;
            }
        }
    }

    const cleanBestTarget = bestTarget.split('（')[0].split('(')[0].trim() || bestTarget;
    const s1 = cleanInput;
    const s2 = cleanBestTarget;
    const dp = computeLCS(s1, s2);

    const userTokens = [];
    const targetTokens = [];

    let i = s1.length;
    let j = s2.length;

    while (i > 0 || j > 0) {
        if (i > 0 && j > 0 && s1[i - 1] === s2[j - 1]) {
            userTokens.unshift({ char: s1[i - 1], type: 'correct' });
            targetTokens.unshift({ char: s2[j - 1], type: 'correct' });
            i--;
            j--;
        } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
            targetTokens.unshift({ char: s2[j - 1], type: 'missing' });
            j--;
        } else if (i > 0 && (j === 0 || dp[i][j - 1] < dp[i - 1][j])) {
            userTokens.unshift({ char: s1[i - 1], type: 'wrong' });
            i--;
        }
    }

    return {
        isMatch: false,
        userTokens,
        targetTokens,
        primaryTarget: cleanBestTarget
    };
};
