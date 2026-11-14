/**
 * Sentence Translation Service (Dịch câu / Dịch đoạn thông minh)
 * Hỗ trợ 2 chế độ:
 * 1. Dịch nhanh (Google Translate API miễn phí, phản hồi tức thì < 200ms)
 * 2. Dịch AI (Gemini qua OpenRouter, phân tích ngữ cảnh, giải thích ngữ pháp, sinh Furigana & Romaji)
 */

import { callAI, parseJsonFromAI } from '../utils/aiProvider.js';

// In-memory cache for translations to ensure 0ms repeat toggling
const translationCache = new Map();

/**
 * Phát hiện ngôn ngữ nguồn dựa trên ký tự tiếng Nhật (Kanji, Hiragana, Katakana)
 */
export const detectSourceLanguage = (text) => {
    if (!text || typeof text !== 'string') return 'ja';
    const japaneseRegex = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/;
    return japaneseRegex.test(text) ? 'ja' : 'vi';
};

/**
 * Kiểm tra xem chuỗi tìm kiếm có phải là câu / cụm từ cần dịch hay không
 */
export const isSentenceCandidate = (text) => {
    if (!text || typeof text !== 'string') return false;
    const trimmed = text.trim();
    if (!trimmed) return false;

    // Chứa dấu câu kết thúc hoặc ngắt câu
    if (/[。！？!?.,、\n]/.test(trimmed)) return true;

    const isJa = detectSourceLanguage(trimmed) === 'ja';

    if (isJa) {
        // Tiếng Nhật: Chứa trợ từ hoặc đuôi động từ / tính từ thông dụng
        const particlesAndInflections = /(?:は|が|を|に|で|へと|からも|より|ている|てある|ていく|てくる|た|だ|ない|ます|ません|でした|です|になる|になっている|かった)/;
        if (particlesAndInflections.test(trimmed) && trimmed.length >= 4) return true;
        // Hoặc chuỗi tiếng Nhật dài từ 6 ký tự trở lên (vd: 人工知能が高くなっている)
        return trimmed.length >= 6;
    } else {
        // Tiếng Việt: Chứa khoảng trắng và từ 2 từ trở lên, hoặc độ dài >= 8 ký tự
        const words = trimmed.split(/\s+/).filter(Boolean);
        return words.length >= 2 || trimmed.length >= 8;
    }
};

/**
 * Dịch nhanh qua Google Translate API (Miễn phí 100%, không cần API Key, phản hồi < 200ms)
 */
export const translateFast = async (text, forcedSourceLang = null) => {
    if (!text || !text.trim()) return null;
    const cleanText = text.trim();
    const sourceLang = forcedSourceLang || detectSourceLanguage(cleanText);
    const targetLang = sourceLang === 'ja' ? 'vi' : 'ja';

    const cacheKey = `fast_${sourceLang}_${targetLang}_${cleanText}`;
    if (translationCache.has(cacheKey)) {
        return translationCache.get(cacheKey);
    }

    try {
        // 1. Primary: Google Chrome Translate API endpoint (CORS enabled, 100% free)
        const chromeUrl = `https://clients5.google.com/translate_a/t?client=dict-chrome-ex&sl=${sourceLang}&tl=${targetLang}&q=${encodeURIComponent(cleanText)}`;
        const response = await fetch(chromeUrl);
        if (response.ok) {
            const data = await response.json();
            let translated = '';
            if (Array.isArray(data)) {
                if (Array.isArray(data[0])) {
                    translated = data[0][0] || '';
                } else if (typeof data[0] === 'string') {
                    translated = data[0];
                }
            } else if (typeof data === 'string') {
                translated = data;
            }

            if (translated && translated.trim()) {
                const result = {
                    translation: translated.trim(),
                    sourceLang,
                    targetLang,
                    provider: 'fast',
                    furigana: '',
                    romaji: '',
                    explanation: ''
                };
                translationCache.set(cacheKey, result);
                return result;
            }
        }
    } catch (err) {
        console.warn('Fast translate primary endpoint failed, trying fallback...', err);
    }

    // 2. Secondary Fallback: MyMemory Translation API
    try {
        const langPair = `${sourceLang}|${targetLang}`;
        const myMemoryUrl = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(cleanText)}&langpair=${langPair}`;
        const res = await fetch(myMemoryUrl);
        if (res.ok) {
            const json = await res.json();
            const translated = json?.responseData?.translatedText;
            if (translated && translated.trim() && !translated.startsWith('MYMEMORY WARNING')) {
                const result = {
                    translation: translated.trim(),
                    sourceLang,
                    targetLang,
                    provider: 'fast',
                    furigana: '',
                    romaji: '',
                    explanation: ''
                };
                translationCache.set(cacheKey, result);
                return result;
            }
        }
    } catch (fallbackErr) {
        console.warn('Fast translate fallback endpoint also failed:', fallbackErr);
    }

    throw new Error('Không thể kết nối máy chủ dịch nhanh. Vui lòng thử lại hoặc chọn Dịch AI.');
};

/**
 * Chuẩn hóa nếu AI vô tình trả về thẻ HTML <ruby> thay vì ngoặc đơn
 */
export const normalizeFuriganaHtml = (str) => {
    if (!str || typeof str !== 'string') return '';
    if (!str.includes('<ruby') && !str.includes('<rt')) return str.trim();
    return str.replace(/<ruby>([\s\S]*?)<\/ruby>/gi, (_, inner) => {
        const rtMatch = inner.match(/<rt>([\s\S]*?)<\/rt>/i);
        const reading = rtMatch ? rtMatch[1].trim() : '';
        const kanji = inner.replace(/<rt>[\s\S]*?<\/rt>/gi, '').replace(/<rp>[\s\S]*?<\/rp>/gi, '').replace(/<[^>]+>/g, '').trim();
        return reading ? `${kanji}（${reading}）` : kanji;
    }).replace(/<[^>]+>/g, '').trim();
};

/**
 * Dịch AI thông minh chuyên sâu (Gemini qua OpenRouter)
 * Cung cấp:
 * - Bản dịch văn phong tự nhiên, đúng ngữ cảnh
 * - Furigana chính xác cho Kanji
 * - Romaji chuẩn hóa
 * - Giải thích ngữ pháp & sắc thái câu
 */
export const translateWithAI = async (text, forcedSourceLang = null) => {
    if (!text || !text.trim()) return null;
    const cleanText = text.trim();
    const sourceLang = forcedSourceLang || detectSourceLanguage(cleanText);
    const targetLang = sourceLang === 'ja' ? 'vi' : 'ja';

    const cacheKey = `ai_${sourceLang}_${targetLang}_${cleanText}`;
    if (translationCache.has(cacheKey)) {
        return translationCache.get(cacheKey);
    }

    const isJaToVi = sourceLang === 'ja';
    const prompt = `Bạn là chuyên gia dịch thuật tiếng Nhật - tiếng Việt cao cấp cho ứng dụng Flashcard QuizKi.
Hãy dịch câu sau ${isJaToVi ? 'từ tiếng Nhật sang tiếng Việt' : 'từ tiếng Việt sang tiếng Nhật'}:
"${cleanText}"

YÊU CẦU BẮT BUỘC:
1. translation: Bản dịch ${isJaToVi ? 'tiếng Việt' : 'tiếng Nhật'} chuẩn xác, tự nhiên, diễn đạt trôi chảy, đúng văn phong đời sống người bản xứ.
2. ${isJaToVi 
    ? 'furigana: Câu tiếng Nhật GỐC có kèm ngoặc cách đọc Hiragana cho tất cả các chữ Hán Kanji dạng 漢字（かんじ）(Ví dụ: "人工（じんこう）知能（ちのう）が高（たか）くなっている"). TUYỆT ĐỐI KHÔNG dùng thẻ HTML như <ruby>, <rt>, <rp>.\n   romaji: Phiên âm Romaji tiếng Nhật viết thường cho câu gốc (Ví dụ: "jinkou chinou ga takakunatteiru").'
    : 'furigana: Câu tiếng Nhật ĐÃ DỊCH có kèm ngoặc cách đọc Hiragana cho tất cả các chữ Hán Kanji dạng 漢字（かんじ）(Ví dụ: "人工（じんこう）知能（ちのう）はますます発展（はってん）している"). TUYỆT ĐỐI KHÔNG dùng thẻ HTML như <ruby>, <rt>, <rp>.\n   romaji: Phiên âm Romaji tiếng Nhật viết thường cho câu đã dịch (Ví dụ: "jinkou chinou wa masumasu hatten shite imasu").'
}
3. explanation: Giải thích ngắn gọn (1 đến 2 câu tiếng Việt) về điểm ngữ pháp cốt lõi hoặc sắc thái ngữ cảnh của câu.

CHỈ TRẢ VỀ DUY NHẤT 1 ĐỐI TƯỢNG JSON (KHÔNG MARKDOWN, KHÔNG GIẢI THÍCH NGOÀI LỀ):
{
  "translation": "...",
  "furigana": "...",
  "romaji": "...",
  "explanation": "..."
}`;

    const responseText = await callAI(prompt, null, 'sentence_translate');
    const parsed = parseJsonFromAI(responseText);

    if (parsed && (parsed.translation || parsed.trans)) {
        const result = {
            translation: (parsed.translation || parsed.trans || '').trim(),
            furigana: normalizeFuriganaHtml(parsed.furigana || ''),
            romaji: (parsed.romaji || '').trim(),
            explanation: (parsed.explanation || parsed.note || '').trim(),
            sourceLang,
            targetLang,
            provider: 'ai'
        };
        translationCache.set(cacheKey, result);
        return result;
    }

    // Fallback nếu JSON parse có vấn đề nhưng có text phản hồi
    if (responseText && responseText.trim()) {
        const fallbackText = responseText.replace(/```(?:json)?/g, '').replace(/```/g, '').trim();
        const result = {
            translation: fallbackText,
            furigana: '',
            romaji: '',
            explanation: '',
            sourceLang,
            targetLang,
            provider: 'ai'
        };
        translationCache.set(cacheKey, result);
        return result;
    }

    throw new Error('Không nhận được kết quả dịch từ AI. Vui lòng thử lại.');
};
