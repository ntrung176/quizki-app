// --- AI Provider: OpenRouter Only ---
// Sử dụng duy nhất OpenRouter (Gemini 2.5 Flash) cho tất cả AI generation

// ============== KANJI → HÁN VIỆT LOOKUP ==============
export { getSinoVietnamese } from './kanjiHVLookup';
import { getSinoVietnamese } from './kanjiHVLookup';
import { generateFuriganaText } from './furiganaHelper';



// ============== KEY MANAGEMENT ==============

// Lấy tất cả OpenRouter keys
export const getOpenRouterKeys = () => {
    const keys = [];
    let i = 1;
    while (true) {
        const key = import.meta.env[`VITE_OPENROUTER_API_KEY_${i}`];
        if (key) {
            keys.push(key);
            i++;
        } else {
            break;
        }
    }
    const singleKey = import.meta.env.VITE_OPENROUTER_API_KEY;
    if (singleKey && !keys.includes(singleKey)) {
        keys.unshift(singleKey);
    }
    return keys;
};


// ============== OPENROUTER API CALL ==============

const OPENROUTER_MODELS = ['google/gemini-2.5-flash'];

const buildOpenRouterRequest = (prompt, model, apiKey) => ({
    url: 'https://openrouter.ai/api/v1/chat/completions',
    options: {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
            'HTTP-Referer': window.location.origin,
            'X-Title': 'Quizki Vocab'
        },
        body: JSON.stringify({
            model: model,
            messages: [
                { role: 'system', content: 'You are a Japanese-Vietnamese dictionary assistant. Always respond with valid JSON only, no markdown, no explanation.' },
                { role: 'user', content: prompt }
            ],
            temperature: 0.3,
            max_tokens: 2048
        })
    }
});

const extractOpenRouterText = (result) => result?.choices?.[0]?.message?.content || null;


// Core API call with retry across keys and models
const callWithRetry = async (prompt, keyIndex = 0, modelIndex = 0, preferredModel = null) => {
    const keys = getOpenRouterKeys();
    if (keys.length === 0) {
        throw new Error('Không có OpenRouter API key. Vui lòng thêm VITE_OPENROUTER_API_KEY vào file .env');
    }

    let models = [...OPENROUTER_MODELS];
    if (preferredModel) {
        models = [preferredModel, ...models.filter(m => m !== preferredModel)];
    }

    const currentKey = keys[keyIndex];
    const currentModel = models[modelIndex];

    const { url, options } = buildOpenRouterRequest(prompt, currentModel, currentKey);

    try {
        const response = await fetch(url, options);

        if (response.ok) {
            const result = await response.json();
            const text = extractOpenRouterText(result);
            if (text) {
                console.log(`✅ OpenRouter (${currentModel}) thành công!`);
                return text;
            }
        }

        const status = response.status;

        // Rate limited → thử key tiếp theo
        if ((status === 429 || status === 503) && keyIndex < keys.length - 1) {
            console.log(`⚠️ OpenRouter key ${keyIndex + 1} rate limited, thử key ${keyIndex + 2}...`);
            await new Promise(r => setTimeout(r, 500));
            return callWithRetry(prompt, keyIndex + 1, modelIndex, preferredModel);
        }

        // Hết key cho model này → thử model tiếp
        if ((status === 429 || status === 503) && modelIndex < models.length - 1) {
            console.log(`⚠️ Hết quota cho ${currentModel}, thử ${models[modelIndex + 1]}...`);
            await new Promise(r => setTimeout(r, 500));
            return callWithRetry(prompt, 0, modelIndex + 1, preferredModel);
        }

        // Model not found
        if (status === 404 && modelIndex < models.length - 1) {
            console.log(`⚠️ Model ${currentModel} không tồn tại, thử ${models[modelIndex + 1]}...`);
            return callWithRetry(prompt, keyIndex, modelIndex + 1, preferredModel);
        }

        const errorText = await response.text().catch(() => '');
        console.error(`❌ OpenRouter error (${status}):`, errorText);
        throw new Error(`OpenRouter API error: ${status}`);

    } catch (error) {
        if (error.message?.startsWith('OpenRouter API error')) throw error;
        console.error(`❌ OpenRouter network error:`, error.message);
        if (keyIndex < keys.length - 1) {
            return callWithRetry(prompt, keyIndex + 1, modelIndex, preferredModel);
        }
        throw error;
    }
};


// ============== UNIFIED AI CALL ==============

export const callAI = async (prompt, forcedOpenRouterModel = null) => {
    const keys = getOpenRouterKeys();
    if (keys.length === 0) {
        throw new Error('Không có OpenRouter API key. Vui lòng thêm VITE_OPENROUTER_API_KEY vào file .env');
    }

    console.log(`🤖 OpenRouter (${keys.length} keys) — Model: ${forcedOpenRouterModel || 'google/gemini-2.5-flash'}`);
    return callWithRetry(prompt, 0, 0, forcedOpenRouterModel);
};


// ============== PARSE JSON RESPONSE ==============

export const parseJsonFromAI = (text) => {
    if (!text) return null;

    let jsonStr = text.trim();

    // Remove markdown code blocks
    if (jsonStr.startsWith('```json')) jsonStr = jsonStr.slice(7);
    if (jsonStr.startsWith('```')) jsonStr = jsonStr.slice(3);
    if (jsonStr.endsWith('```')) jsonStr = jsonStr.slice(0, -3);
    jsonStr = jsonStr.trim();

    // Try to extract JSON from mixed content
    const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
    if (jsonMatch) jsonStr = jsonMatch[0];

    try {
        return JSON.parse(jsonStr);
    } catch (e) {
        console.error('Error parsing AI response JSON:', e, 'Raw text:', text);
        return null;
    }
};


// ============== VOCAB GENERATION PROMPT ==============

export const generateVocabPrompt = (frontText, contextPos = '', contextLevel = '') => {
    // Build example rule dynamically based on level
    let exampleRule = `4. example: CHỈ 1 CÂU. Thay từ gốc "${frontText}" bằng ＿＿＿＿. Viết câu tự nhiên bằng tiếng Nhật. KHÔNG thêm phiên âm hay ngoặc furigana vào câu.`;
    if (contextLevel === 'N5') {
        exampleRule = `4. example: CHỈ 1 CÂU. Thay từ gốc "${frontText}" bằng ＿＿＿＿. Viết bằng HIRAGANA chủ yếu, câu ngắn đơn giản dễ hiểu (tối đa 8-10 từ), phân cách từ rõ ràng. KHÔNG thêm ngoặc phiên âm furigana.`;
    }

    return `Từ điển Nhật-Việt. Từ: "${frontText}"${contextPos ? ` (Từ loại: ${contextPos})` : ''}${contextLevel ? ` [Cấp độ: ${contextLevel}]` : ''}
JSON only, không markdown/backtick:
{"frontWithFurigana":"水道（すいどう）","meaning":"đường ống nước","pos":"noun","level":"N3","sinoVietnamese":"THUỶ ĐẠO","synonym":"配管（はいかん）","synonymSinoVietnamese":"PHỐI QUẢN","example":"＿＿＿＿の水が止まった。","exampleMeaning":"Nước đường ống đã ngừng chảy.","nuance":"Chỉ hệ thống cấp nước sinh hoạt."}

QUY TẮC BẮT BUỘC:
1. Từ vựng (frontWithFurigana) & Từ đồng nghĩa (synonym):
   - BẮT BUỘC dùng định dạng: "Từ gốc（cách đọc hiragana của CẢ TỪ）".
   - NGOẶC PHIÊN ÂM PHẢI ĐẶT Ở CUỐI CÙNG sau toàn bộ chữ gốc. Tuyệt đối KHÔNG chèn ngoặc vào giữa các nhóm Kanji/Hiragana.
   - Ví dụ ĐÚNG: "顔認証（かおにんしょう）", "振り込む（ふりこむ）"
   - Ví dụ SAI: "顔（かお）認証（にんしょう）", "振（ふ）り込（こ）む"
   - Từ đồng nghĩa (synonym) CŨNG BẮT BUỘC tuân theo đúng form này. VD: "配管（はいかん）"
   - Trả về trường "frontWithFurigana" cho từ gốc và "synonym" cho từ đồng nghĩa.

2. meaning: Ngắn gọn, nghĩa khác nhau ngăn ";". Không liệt kê nghĩa gần giống.

3. pos/level: Phải khớp ngữ cảnh nếu đã chọn. Grammar→giải thích như ngữ pháp.
   - pos: noun/verb/suru_verb/adj_i/adj_na/adverb/conjunction/particle/grammar/phrase/other.

${exampleRule}
5. exampleMeaning: Nghĩa tiếng Việt đầy đủ của câu ví dụ.
6. sinoVietnamese: IN HOA từng Kanji (VD: 流行→"LƯU HÀNH"). Không Kanji→"". KHÔNG bịa.
7. nuance: Chi tiết bối cảnh sử dụng.
8. synonym/synonymSinoVietnamese: Cùng/dễ hơn JLPT. N5→"". Không bịa. synonymSinoVietnamese = HV của synonym.
9. level: N5-N1, không rõ→"".

Không trả lời gì ngoài JSON.`;
};

export const generateMoreExamplePrompt = (frontText, targetMeaning) => {
    return `1 câu ví dụ JP cho "${frontText}" nghĩa "${targetMeaning}". Thay "${frontText}" bằng ＿＿＿＿. Viết câu tự nhiên bằng tiếng Nhật. KHÔNG thêm phiên âm hay ngoặc furigana vào câu. JSON only:{"example":"câu JP có ＿＿＿＿","exampleMeaning":"nghĩa VN"}`;
};


// Hàm chính để tạo vocab với AI
export const aiAssistVocab = async (frontText, contextPos = '', contextLevel = '') => {
    if (!frontText || frontText.trim() === '') return null;

    const prompt = generateVocabPrompt(frontText, contextPos, contextLevel);
    const responseText = await callAI(prompt);
    const result = parseJsonFromAI(responseText);

    // Ghi đè âm Hán Việt bằng bảng tra cứu cứng (ưu tiên hơn AI)
    if (result) {
        const lookupHV = getSinoVietnamese(frontText);
        if (lookupHV) {
            console.log(`📘 Hán Việt lookup: "${frontText}" → "${lookupHV}" (AI: "${result.sinoVietnamese || ''}")`);
            result.sinoVietnamese = lookupHV;
        }

        // Tự động phân tích Furigana chuẩn bằng kuroshiro CHỈ CHO CÂU VÍ DỤ, KHÔNG xử lý từ vựng và từ đồng nghĩa
        try {
            // Đảm bảo AI đã gán đúng frontWithFurigana. Nếu thiếu thì fallback
            if (!result.frontWithFurigana) {
                result.frontWithFurigana = result.frontText || frontText;
            }

            // Xử lý câu ví dụ
            if (result.example) {
                result.example = await generateFuriganaText(result.example);
            }
        } catch (e) {
            console.error("Kuroshiro conversion failed:", e);
        }
    }

    return result;
};

// ============== KANJI BATCH FORMAT (AI clean up) ==============

export const aiBatchFormatKanji = async (kanjiItems) => {
    // kanjiItems: [{character, meaning, sinoViet}, ...]
    const listStr = kanjiItems.map((k, i) =>
        `${i + 1}. ${k.character} | meaning: "${k.meaning}" | sinoViet: "${k.sinoViet}"`
    ).join('\n');

    const prompt = `Bạn là chuyên gia Hán tự và bộ thủ. Hãy format lại dữ liệu Kanji/bộ thủ sau:
${listStr}

QUY TẮC:
1. "meaning": Sửa ý nghĩa tiếng Việt ngắn gọn (DƯỚI 5 từ). Xoá nghĩa trùng lặp, chỉ giữ nghĩa phổ biến nhất. Viết thường.
   - Nếu meaning trống hoặc là "-", hãy ĐIỀN ý nghĩa đúng cho chữ đó.
   VD: "Anh, Anh, anh hùng, xuất sắc, đài hoa" → "anh hùng, xuất sắc"
   VD: "nặng nề, quan trọng, quý trọng, kính trọng, chất đống" → "nặng, quan trọng"
2. "sinoViet": Chỉ giữ 1-2 âm Hán Việt PHỔ BIẾN NHẤT, IN HOA. Xoá âm hiếm dùng.
   - Nếu sinoViet trống hoặc là "-", hãy ĐIỀN âm Hán Việt đúng cho chữ đó.
   - Với bộ thủ, dùng tên bộ thủ Hán Việt phổ biến nhất.
   VD: "TRỌNG, TRÙNG" → "TRỌNG"
   VD: "" (trống) cho 木 → "MỘC"

JSON only, không markdown/backtick. Trả về MẢNG JSON:
[{"character":"英","meaning":"anh hùng, xuất sắc","sinoViet":"ANH"}]`;

    const responseText = await callAI(prompt);
    if (!responseText) return null;

    let jsonStr = responseText.trim();
    if (jsonStr.startsWith('```json')) jsonStr = jsonStr.slice(7);
    if (jsonStr.startsWith('```')) jsonStr = jsonStr.slice(3);
    if (jsonStr.endsWith('```')) jsonStr = jsonStr.slice(0, -3);
    jsonStr = jsonStr.trim();

    // Try to extract JSON array
    const arrMatch = jsonStr.match(/\[[\s\S]*\]/);
    if (arrMatch) jsonStr = arrMatch[0];

    try {
        return JSON.parse(jsonStr);
    } catch (e) {
        console.error('Error parsing AI batch format response:', e, 'Raw:', responseText);
        return null;
    }
};

// ============== INFO ==============

export const getAIProviderInfo = () => {
    const keys = getOpenRouterKeys();
    return {
        available: [{
            id: 'openrouter',
            name: 'OpenRouter (Gemini 2.5 Flash)',
            models: OPENROUTER_MODELS,
            keyCount: keys.length
        }],
        totalKeys: keys.length,
        summary: keys.length > 0
            ? `OpenRouter(${keys.length} keys)`
            : 'Chưa cấu hình OpenRouter API key'
    };
};
