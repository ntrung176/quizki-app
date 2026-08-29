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

// Chuẩn hóa dấu tiếng Việt giữa kiểu cũ (uý, oà, oè...) và kiểu mới (úy, òa, òe...)
export const normalizeVietnameseTone = (str = '') => {
    if (!str) return '';
    let res = String(str).normalize('NFC');
    
    // Map kiểu cũ (oà, oá, oè, uý,...) sang kiểu mới (òa, óa, òe, úy,...)
    const toneMap = {
        'uỳ': 'ùy', 'uý': 'úy', 'uỷ': 'ủy', 'uỹ': 'ũy', 'uỵ': 'ụy',
        'oà': 'òa', 'oá': 'óa', 'oả': 'ỏa', 'oã': 'õa', 'oạ': 'ọa',
        'oè': 'òe', 'oé': 'óe', 'oẻ': 'ỏe', 'oẽ': 'õe', 'oẹ': 'ọe',
    };
    
    for (const [oldTone, newTone] of Object.entries(toneMap)) {
        res = res.replaceAll(oldTone, newTone);
        res = res.replaceAll(oldTone.toUpperCase(), newTone.toUpperCase());
    }
    return res;
};

// Chuẩn hóa chuỗi: loại bỏ khoảng trắng thừa, dấu câu, ngoặc furigana, đồng bộ Unicode NFC và dấu tiếng Việt (uý <-> úy, hoà <-> hòa)
export const normalize = (text = '') => {
    if (!text) return '';
    return normalizeVietnameseTone(text)
        .replace(/（[^）]*）/g, '')
        .replace(/\([^)]*\)/g, '')
        .replace(/[。、！？\s\.,!\?~\-–—:;]/g, '')
        .toLowerCase()
        .trim();
};

const VOWEL_TABLE = {
    'a': ['a', 'á', 'à', 'ả', 'ã', 'ạ'],
    'ă': ['ă', 'ắ', 'ằ', 'ẳ', 'ẵ', 'ặ'],
    'â': ['â', 'ấ', 'ầ', 'ẩ', 'ẫ', 'ậ'],
    'e': ['e', 'é', 'è', 'ẻ', 'ẽ', 'ẹ'],
    'ê': ['ê', 'ế', 'ề', 'ể', 'ễ', 'ệ'],
    'i': ['i', 'í', 'ì', 'ỉ', 'ĩ', 'ị'],
    'o': ['o', 'ó', 'ò', 'ỏ', 'õ', 'ọ'],
    'ô': ['ô', 'ố', 'ồ', 'ổ', 'ỗ', 'ộ'],
    'ơ': ['ơ', 'ớ', 'ờ', 'ở', 'ỡ', 'ợ'],
    'u': ['u', 'ú', 'ù', 'ủ', 'ũ', 'ụ'],
    'ư': ['ư', 'ứ', 'ừ', 'ử', 'ữ', 'ự'],
    'y': ['y', 'ý', 'ỳ', 'ỷ', 'ỹ', 'ỵ'],
    'A': ['A', 'Á', 'À', 'Ả', 'Ã', 'Ạ'],
    'Ă': ['Ă', 'Ắ', 'Ằ', 'Ẳ', 'Ẵ', 'Ặ'],
    'Â': ['Â', 'Ấ', 'Ầ', 'Ẩ', 'Ẫ', 'Ậ'],
    'E': ['E', 'É', 'È', 'Ẻ', 'Ẽ', 'Ẹ'],
    'Ê': ['Ê', 'Ế', 'Ề', 'Ể', 'Ễ', 'Ệ'],
    'I': ['I', 'Í', 'Ì', 'Ỉ', 'Ĩ', 'Ị'],
    'O': ['O', 'Ó', 'Ò', 'Ỏ', 'Õ', 'Ọ'],
    'Ô': ['Ô', 'Ố', 'Ồ', 'Ổ', 'Ỗ', 'Ộ'],
    'Ơ': ['Ơ', 'Ớ', 'Ờ', 'Ở', 'Ỡ', 'Ợ'],
    'U': ['U', 'Ú', 'Ù', 'Ủ', 'Ũ', 'Ụ'],
    'Ư': ['Ư', 'Ứ', 'Ừ', 'Ử', 'Ữ', 'Ự'],
    'Y': ['Y', 'Ý', 'Ỳ', 'Ỷ', 'Ỹ', 'Ỵ'],
};

// Map each accented char to its base and tone index (0: none, 1: sac, 2: huyen, 3: hoi, 4: nga, 5: nang)
const CHAR_TO_VOWEL_INFO = {};
for (const [base, row] of Object.entries(VOWEL_TABLE)) {
    row.forEach((ch, toneIdx) => {
        CHAR_TO_VOWEL_INFO[ch] = { base, toneIdx };
    });
}

const TONE_MAP = {
    's': 1, 'S': 1, // Sắc
    'f': 2, 'F': 2, // Huyền
    'r': 3, 'R': 3, // Hỏi
    'x': 4, 'X': 4, // Ngã
    'j': 5, 'J': 5, // Nặng
    'z': 0, 'Z': 0  // Xoá dấu
};

/**
 * Chuyển đổi ký tự gõ Telex thời gian thực (Realtime Telex Engine)
 * Đảm bảo gõ tiếng Việt mượt mà 100% ngay từ ký tự đầu tiên
 */
/**
 * Chuyển đổi ký tự gõ Telex thời gian thực (Realtime Advanced Telex Engine)
 * Hỗ trợ gõ tiếng Việt mượt mà 100% theo mọi thứ tự phím tự nhiên (vd: dongdof -> đồng, chuongwf -> chường, hoacjw -> hoặc)
 */
export const transformVietnameseTelex = (text = '') => {
    if (!text) return '';

    return text.replace(/([a-zA-Z\u00C0-\u024F\u1EA0-\u1EF9]+)/g, (rawWord) => {
        let w = rawWord;

        // 1. Phụ âm Đ:
        // Case 1a: 'dd' liền nhau (vd: ddoongf -> đồng, ddi -> đi)
        w = w.replace(/dd/g, 'đ').replace(/DD/g, 'Đ').replace(/Dd/g, 'Đ').replace(/dD/g, 'đ');

        // Case 1b: Gõ 'd' trễ linh hoạt (vd: 'dongd', 'dongdof', 'dond', 'dangd', 'duongd')
        // Nếu từ bắt đầu bằng d/D và có phím d/D được bấm sau nguyên âm:
        if (/[dD]/.test(w) && !/đ|Đ/.test(w)) {
            const firstDIdx = w.search(/[dD]/);
            const afterFirstD = w.slice(firstDIdx + 1);
            if (/[aAeEiIoOuUyY\u00C0-\u024F\u1EA0-\u1EF9]/.test(afterFirstD) && /[dD]/.test(afterFirstD)) {
                const isUpper = w[firstDIdx] === w[firstDIdx].toUpperCase();
                w = w.slice(0, firstDIdx) + (isUpper ? 'Đ' : 'đ') + afterFirstD.replace(/([dD])/, '');
            }
        }

        // 2. Tìm và bóc tách phím dấu thanh (s, f, r, x, j, z)
        // Phím dấu có thể gõ ở bất kỳ vị trí nào trong từ (cuối từ, sau nguyên âm, trước modifier)
        let toneIndex = -1;

        for (let i = w.length - 1; i >= 0; i--) {
            const ch = w[i];
            if (TONE_MAP[ch] !== undefined) {
                let hasVowelContext = false;
                for (let j = 0; j < w.length; j++) {
                    if (j !== i && (CHAR_TO_VOWEL_INFO[w[j]] || /[wW]/.test(w[j]))) {
                        hasVowelContext = true;
                        break;
                    }
                }
                if (hasVowelContext) {
                    toneIndex = TONE_MAP[ch];
                    w = w.slice(0, i) + w.slice(i + 1);
                    break;
                }
            }
        }

        // 3. Xử lý 'w' biến đổi nguyên âm (ă, ơ, ư, ươ, oă)
        if (/[wW]/.test(w)) {
            // Cụm 'uo' + 'w' -> 'ươ' (ví dụ: chuongw, chuowng, chuwong, nguoiw, tuongw)
            if (/[uU]/.test(w) && /[oO]/.test(w)) {
                w = w.replace(/([uU])([oO])w?/gi, (m, u, o) => {
                    const isUpper = u === u.toUpperCase() && o === o.toUpperCase();
                    const isTitle = u === u.toUpperCase();
                    return isUpper ? 'ƯƠ' : (isTitle ? 'Ươ' : 'ươ');
                });
                w = w.replace(/([uU])w([oO])/gi, (m, u, o) => {
                    const isUpper = u === u.toUpperCase() && o === o.toUpperCase();
                    const isTitle = u === u.toUpperCase();
                    return isUpper ? 'ƯƠ' : (isTitle ? 'Ươ' : 'ươ');
                });
                w = w.replace(/([uU])(.*)([oO])/gi, (m, u, mid, o) => {
                    const isUpper = u === u.toUpperCase() && o === o.toUpperCase();
                    return (isUpper ? 'Ư' : 'ư') + mid + (isUpper ? 'Ơ' : 'ơ');
                });
            }
            // Cụm 'oa' + 'w' -> 'oă' (ví dụ: hoacw, hoawc, ngoacw, xoanw)
            else if (/[oO]/.test(w) && /[aA]/.test(w)) {
                w = w.replace(/([oO])([aA])w?/gi, (m, o, a) => {
                    const isUpper = o === o.toUpperCase() && a === a.toUpperCase();
                    const isTitle = o === o.toUpperCase();
                    return isUpper ? 'OĂ' : (isTitle ? 'Oă' : 'oă');
                });
                w = w.replace(/([oO])w([aA])/gi, (m, o, a) => {
                    const isUpper = o === o.toUpperCase() && a === a.toUpperCase();
                    const isTitle = o === o.toUpperCase();
                    return isUpper ? 'OĂ' : (isTitle ? 'Oă' : 'oă');
                });
                w = w.replace(/([oO])(.*)([aA])/gi, (m, o, mid, a) => {
                    const isUpper = o === o.toUpperCase() && a === a.toUpperCase();
                    return (isUpper ? 'O' : 'o') + mid + (isUpper ? 'Ă' : 'ă');
                });
            }
            // Single 'uw' -> 'ư', 'ow' -> 'ơ', 'aw' -> 'ă'
            else {
                w = w.replace(/([uU])w/g, (m, u) => u === u.toUpperCase() ? 'Ư' : 'ư')
                     .replace(/([oO])w/g, (m, o) => o === o.toUpperCase() ? 'Ơ' : 'ơ')
                     .replace(/([aA])w/g, (m, a) => a === a.toUpperCase() ? 'Ă' : 'ă');

                if (/[wW]/.test(w)) {
                    if (/[aA]/.test(w)) {
                        w = w.replace(/([aA])/g, (m, a) => a === a.toUpperCase() ? 'Ă' : 'ă');
                    } else if (/[oO]/.test(w)) {
                        w = w.replace(/([oO])/g, (m, o) => o === o.toUpperCase() ? 'Ơ' : 'ơ');
                    } else if (/[uU]/.test(w)) {
                        w = w.replace(/([uU])/g, (m, u) => u === u.toUpperCase() ? 'Ư' : 'ư');
                    }
                }
            }
            w = w.replace(/[wW]/g, '');
        }

        // 4. Nguyên âm kép Telex: aa -> â, ee -> ê, oo -> ô, uye -> uyê
        w = w.replace(/aa/g, 'â').replace(/AA/g, 'Â').replace(/Aa/g, 'Â').replace(/aA/g, 'â')
             .replace(/ee/g, 'ê').replace(/EE/g, 'Ê').replace(/Ee/g, 'Ê').replace(/eE/g, 'ê')
             .replace(/oo/g, 'ô').replace(/OO/g, 'Ô').replace(/Oo/g, 'Ô').replace(/oO/g, 'ô')
             .replace(/uye/g, 'uyê').replace(/UYE/g, 'UYÊ').replace(/Uye/g, 'Uyê');

        // Xử lý gõ nguyên âm lặp trễ (ví dụ: dongdof -> chữ o thứ 2 biến chữ o thứ 1 thành ô)
        const oMatches = [...w.matchAll(/[oO]/g)];
        if (oMatches.length >= 2 && !/[ôÔơƠ]/.test(w)) {
            const firstO = oMatches[0];
            const isUpper = firstO[0] === firstO[0].toUpperCase();
            w = w.slice(0, firstO.index) + (isUpper ? 'Ô' : 'ô') + w.slice(firstO.index + 1);
            w = w.replace(/([oO])/, '');
        }

        const aMatches = [...w.matchAll(/[aA]/g)];
        if (aMatches.length >= 2 && !/[âÂăĂ]/.test(w)) {
            const firstA = aMatches[0];
            const isUpper = firstA[0] === firstA[0].toUpperCase();
            w = w.slice(0, firstA.index) + (isUpper ? 'Â' : 'â') + w.slice(firstA.index + 1);
            w = w.replace(/([aA])/, '');
        }

        const eMatches = [...w.matchAll(/[eE]/g)];
        if (eMatches.length >= 2 && !/[êÊ]/.test(w)) {
            const firstE = eMatches[0];
            const isUpper = firstE[0] === firstE[0].toUpperCase();
            w = w.slice(0, firstE.index) + (isUpper ? 'Ê' : 'ê') + w.slice(firstE.index + 1);
            w = w.replace(/([eE])/, '');
        }

        // 5. Tự động chuyển 'ie'/'ye' thành 'iê'/'yê' khi có phụ âm cuối (ví dụ: tieng, viet, biet, thiet, chuyen)
        w = w.replace(/([iI])e([cghkmnpt])/g, (m, i, end) => (i === i.toUpperCase() ? 'IÊ' : 'iê') + end)
             .replace(/([yY])e([cghkmnpt])/g, (m, y, end) => (y === y.toUpperCase() ? 'YÊ' : 'yê') + end)
             .replace(/([iI])eu/g, (m, i) => (i === i.toUpperCase() ? 'IÊ' : 'iê') + 'u')
             .replace(/([yY])eu/g, (m, y) => (y === y.toUpperCase() ? 'YÊ' : 'yê') + 'u');

        // Tự động chuyển 'ua' + phụ âm cuối thành 'uâ' (ví dụ: chuan -> chuẩn, xuan -> xuân, khuan -> khuân)
        w = w.replace(/([uU])a([nN])/g, (m, u, n) => (u === u.toUpperCase() ? 'UÂ' : 'uâ') + n);

        // 6. Nếu không có dấu thanh
        if (toneIndex === -1 || toneIndex === 0) {
            if (toneIndex === 0) {
                // Xoá dấu (z)
                return w.replace(/[a-zA-Z\u00C0-\u024F\u1EA0-\u1EF9]/g, (c) => {
                    const info = CHAR_TO_VOWEL_INFO[c];
                    return info ? VOWEL_TABLE[info.base][0] : c;
                });
            }
            return w;
        }

        // 7. Đặt dấu thanh vào đúng nguyên âm chuẩn tiếng Việt
        let vowelIndices = [];
        for (let i = 0; i < w.length; i++) {
            if (CHAR_TO_VOWEL_INFO[w[i]]) {
                vowelIndices.push(i);
            }
        }

        if (vowelIndices.length === 0) return w;

        // Xử lý phụ âm đầu đặc biệt: 'gi' và 'qu'
        const lowerStem = w.toLowerCase();
        if (lowerStem.startsWith('gi') && vowelIndices.length > 1 && vowelIndices[0] === 1) {
            vowelIndices.shift();
        }
        if (lowerStem.startsWith('qu') && vowelIndices.length > 1 && vowelIndices[0] === 1) {
            vowelIndices.shift();
        }

        if (vowelIndices.length === 0) return w;

        let targetIdx = -1;

        // Ưu tiên 1: Cụm 'ươ' / 'ưo' -> Dấu LUÔN LUÔN nằm trên 'ơ' (ví dụ: chưởng, hướng, thường, lượng, đường)
        for (let i = 0; i < vowelIndices.length - 1; i++) {
            const idx1 = vowelIndices[i];
            const idx2 = vowelIndices[i + 1];
            const b1 = CHAR_TO_VOWEL_INFO[w[idx1]]?.base.toLowerCase();
            const b2 = CHAR_TO_VOWEL_INFO[w[idx2]]?.base.toLowerCase();
            if ((b1 === 'ư' || b1 === 'u') && (b2 === 'ơ' || b2 === 'o')) {
                targetIdx = idx2;
                break;
            }
        }

        // Ưu tiên 2: Cụm 'iê', 'yê', 'uô', 'uâ' -> Dấu nằm trên 'ê', 'ô', 'â'
        if (targetIdx === -1) {
            for (let i = 0; i < vowelIndices.length - 1; i++) {
                const idx1 = vowelIndices[i];
                const idx2 = vowelIndices[i + 1];
                const b1 = CHAR_TO_VOWEL_INFO[w[idx1]]?.base.toLowerCase();
                const b2 = CHAR_TO_VOWEL_INFO[w[idx2]]?.base.toLowerCase();
                if ((b1 === 'i' || b1 === 'y') && b2 === 'ê') {
                    targetIdx = idx2;
                    break;
                }
                if (b1 === 'u' && b2 === 'ô') {
                    targetIdx = idx2;
                    break;
                }
                if (b1 === 'u' && b2 === 'â') {
                    targetIdx = idx2;
                    break;
                }
            }
        }

        // Ưu tiên 3: Nguyên âm có dấu mũ hoặc móc (â, ă, ê, ô, ơ, ư)
        if (targetIdx === -1) {
            for (const idx of vowelIndices) {
                const base = CHAR_TO_VOWEL_INFO[w[idx]]?.base.toLowerCase();
                if (['â', 'ă', 'ê', 'ô', 'ơ', 'ư'].includes(base)) {
                    targetIdx = idx;
                    break;
                }
            }
        }

        // Ưu tiên 4: Quy tắc vị trí (có phụ âm cuối hay không)
        if (targetIdx === -1) {
            const lastVowelPos = vowelIndices[vowelIndices.length - 1];
            const hasEndingConsonant = lastVowelPos < w.length - 1;

            if (hasEndingConsonant) {
                targetIdx = lastVowelPos;
            } else {
                if (vowelIndices.length === 1) {
                    targetIdx = vowelIndices[0];
                } else if (vowelIndices.length === 2) {
                    const b1 = CHAR_TO_VOWEL_INFO[w[vowelIndices[0]]]?.base.toLowerCase();
                    const b2 = CHAR_TO_VOWEL_INFO[w[vowelIndices[1]]]?.base.toLowerCase();
                    if (['oa', 'oe', 'uy'].includes(b1 + b2)) {
                        targetIdx = vowelIndices[1];
                    } else {
                        targetIdx = vowelIndices[0];
                    }
                } else {
                    targetIdx = vowelIndices[1];
                }
            }
        }

        if (targetIdx === -1) targetIdx = vowelIndices[0];

        const targetChar = w[targetIdx];
        const info = CHAR_TO_VOWEL_INFO[targetChar];
        if (!info) return w;

        const baseRow = VOWEL_TABLE[info.base];
        if (!baseRow || !baseRow[toneIndex]) return w;

        return w.slice(0, targetIdx) + baseRow[toneIndex] + w.slice(targetIdx + 1);
    });
};

/**
 * Chuyển đổi chuỗi gõ Telex thô thành tiếng Việt có dấu
 * Hỗ trợ các trường hợp Unikey/EVKey bị trượt hoặc chưa chuyển đổi
 * Ví dụ: "giar" -> "giả", "hoaf" -> "hòa", "uys" -> "úy", "toasn" -> "toán"
 */
export const decodeTelex = (str = '') => {
    if (!str) return '';
    return transformVietnameseTelex(str);
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

    // Tách các âm Hán Việt đa âm: "KHUYẾN, KHUYÊN", "KHUYẾN / KHUYÊN", "KHUYẾN (KHUYÊN)"
    const rawSinoViet = card.sinoVietnamese || card.sinoViet || card.hanviet || '';
    const sinoVietList = typeof rawSinoViet === 'string'
        ? rawSinoViet.split(/[,;\n/|()（）\-–—]+/).map(s => s.trim()).filter(Boolean)
        : (Array.isArray(rawSinoViet) ? rawSinoViet : []);

    // Tách các nghĩa tiếng Việt độc lập
    const rawMeaning = card.back || card.meaning || '';
    const meaningList = typeof rawMeaning === 'string'
        ? rawMeaning.split(/[,;\n/|]+/).map(s => s.trim()).filter(Boolean)
        : (Array.isArray(rawMeaning) ? rawMeaning : []);

    return {
        kanjiPart,
        kanaPart,
        rawFront,
        rawReading,
        onReading,
        kunReading,
        sinoViet: rawSinoViet,
        sinoVietList,
        meaning: rawMeaning,
        meaningList,
        synonyms: Array.isArray(card.synonyms) ? card.synonyms : (typeof card.synonyms === 'string' ? card.synonyms.split(/[,;\n]+/).map(s => s.trim()) : [])
    };
};

/**
 * Kiểm tra xem câu trả lời của người dùng có khớp với thẻ hay không
 * Chấp nhận CẢ Hiragana (cách đọc), Katakana, Kanji (chữ Hán), các âm Hán Việt (kể cả từ đa âm) hoặc Nghĩa
 */
export const checkAnswerMatch = (userInput = '', card = {}) => {
    if (!userInput || !userInput.trim()) return false;
    const cleanInput = userInput.trim();
    const normInput = toHiragana(normalize(cleanInput));
    const telexInput = toHiragana(normalize(decodeTelex(cleanInput)));

    const parts = extractJapaneseParts(card);
    const candidates = [
        parts.kanjiPart,
        parts.kanaPart,
        parts.rawFront,
        parts.rawReading,
        parts.onReading,
        parts.kunReading,
        parts.sinoViet,
        ...parts.sinoVietList,
        parts.meaning,
        ...parts.meaningList,
        ...parts.synonyms
    ].filter(Boolean);

    // 1. So sánh chuẩn hóa với tất cả các ứng viên (chấp nhận cả Kanji, Hiragana/Katakana, tiếng Việt chuẩn và Telex)
    for (const cand of candidates) {
        const normCand = toHiragana(normalize(cand));
        if (normInput === normCand || telexInput === normCand) return true;
        if (normalize(cleanInput) === normalize(cand)) return true;
    }

    // 2. Hỗ trợ tính từ đuôi な
    if (card.pos === 'adj_na') {
        for (const cand of candidates) {
            const normCand = toHiragana(normalize(cand));
            if (normInput === normCand + 'な' || normInput + 'な' === normCand) return true;
            if (telexInput === normCand + 'な' || telexInput + 'な' === normCand) return true;
        }
    }

    // 3. Với nghĩa tiếng Việt có nhiều dấu phẩy / chấm phẩy
    if (parts.meaning) {
        const meaningItems = parts.meaning.split(/[,;\n/]+/).map(m => normalize(m)).filter(Boolean);
        for (const m of meaningItems) {
            if (normalize(cleanInput) === m || normalize(decodeTelex(cleanInput)) === m) return true;
        }
    }

    // 4. Với Hán Việt có dấu cách
    if (parts.sinoViet) {
        if (normalize(cleanInput) === normalize(parts.sinoViet) || normalize(decodeTelex(cleanInput)) === normalize(parts.sinoViet)) return true;
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
    const cleanInput = (userInput || '').normalize('NFC').trim();
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
        ...parts.sinoVietList,
        parts.meaning,
        ...parts.meaningList,
        ...parts.synonyms
    ].filter(Boolean);

    const isMatch = checkAnswerMatch(cleanInput, card);

    if (isMatch) {
        // Tìm ứng viên nào khớp với input của người dùng nhất
        const telexInput = toHiragana(normalize(decodeTelex(cleanInput)));
        let matchedTarget = kanjiCandidate || kanaCandidate || parts.meaning;
        for (const cand of candidates) {
            const normCand = toHiragana(normalize(cand));
            if (normInput === normCand || telexInput === normCand || normalize(cleanInput) === normalize(cand) || normalize(decodeTelex(cleanInput)) === normalize(cand)) {
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
