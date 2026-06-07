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

const OPENROUTER_MODELS = [
    'google/gemini-2.5-flash',
    'google/gemini-3.1-flash-lite',
    'google/gemini-2.5-pro',
    'openai/gpt-4o-mini',
    'openai/gpt-4o',
    'anthropic/claude-sonnet-4.6',
    'anthropic/claude-sonnet-4.5',
    'anthropic/claude-sonnet-4',
    '~anthropic/claude-sonnet-latest',
    'anthropic/claude-3.5-haiku',
    'anthropic/claude-3.5-sonnet',
    'deepseek/deepseek-chat',
    'meta-llama/llama-3.1-8b-instruct'
];

const MODEL_ALIASES = {
    'anthropic/claude-3.5-sonnet': 'anthropic/claude-sonnet-4.6'
};

const getEffectiveModel = (model) => {
    return MODEL_ALIASES[model] || model;
};


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
            max_tokens: 2048,
            provider: {
                sort: 'price',
                allow_fallbacks: true
            }
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
    const effectivePreferred = getEffectiveModel(preferredModel);
    if (effectivePreferred) {
        models = [effectivePreferred, ...models.filter(m => m !== effectivePreferred)];
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

export const callAI = async (prompt, forcedOpenRouterModel = null, featureId = null) => {
    const keys = getOpenRouterKeys();
    if (keys.length === 0) {
        throw new Error('Không có OpenRouter API key. Vui lòng thêm VITE_OPENROUTER_API_KEY vào file .env');
    }

    let activeModel = forcedOpenRouterModel;
    if (!activeModel) {
        try {
            const { loadAdminConfig } = await import('./adminSettings');
            const config = await loadAdminConfig();
            if (featureId && config?.aiFeatureModels?.[featureId]) {
                activeModel = config.aiFeatureModels[featureId];
            }
        } catch (e) {
            console.warn('Failed to load admin config for AI model:', e);
        }
    }
    if (!activeModel) {
        const FEATURE_DEFAULTS = {
            vocab_gen: 'openai/gpt-4o-mini',
            grammar_gen: 'google/gemini-2.5-flash',
            vocab_sino_viet: 'google/gemini-3.1-flash-lite',
            more_examples: 'openai/gpt-4o-mini',
            ocr_image: 'openai/gpt-4o-mini',
            grammar_check: 'openai/gpt-4o-mini'
        };
        activeModel = FEATURE_DEFAULTS[featureId] || 'google/gemini-2.5-flash';
    }

    activeModel = getEffectiveModel(activeModel);
    console.log(`🤖 OpenRouter (${keys.length} keys) — Feature: ${featureId || 'default'} — Model: ${activeModel}`);
    return callWithRetry(prompt, 0, 0, activeModel);
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

export const generateVocabPrompt = (frontText, contextPos = '', contextLevel = '', contextMeaning = '') => {
    const isGrammar = contextPos === 'grammar';
    const hasMeaning = contextMeaning && contextMeaning.trim() !== '';

    let grammarInstruction = '';
    let exampleRule = '';
    let exampleMeaningRule = '5. exampleMeaning: Nghĩa tiếng Việt đầy đủ của câu ví dụ.';

    if (isGrammar) {
        if (hasMeaning) {
            grammarInstruction = `Bạn đang tạo thẻ ngữ pháp cho cấu trúc "${frontText}" với nghĩa cụ thể được yêu cầu là: "${contextMeaning}".
Yêu cầu cấu trúc kết quả:
- meaning: Giữ nguyên nghĩa "${contextMeaning}".
- nuance: Giải thích cấu trúc ngữ pháp kết hợp chính xác (cách chia động từ/danh từ/tính từ đi kèm với ngữ pháp này) và cách dùng/sắc thái cụ thể của nghĩa này.`;

            exampleRule = `4. example: CHỈ 1 CÂU ví dụ tiêu biểu xuất sắc nhất thể hiện ĐÚNG nghĩa "${contextMeaning}" của ngữ pháp "${frontText}". Hãy thay thế cấu trúc ngữ pháp "${frontText}" (bao gồm cả các hậu tố/cách chia nếu có) bằng ＿＿＿＿. Câu ví dụ phải tự nhiên, chuẩn Nhật Bản, có ngữ cảnh rõ ràng, phản ánh đúng cấu trúc ngữ pháp kết hợp chính xác. KHÔNG thêm phiên âm hay ngoặc furigana vào câu.`;
        } else {
            grammarInstruction = `Bạn đang tạo thẻ ngữ pháp cho cấu trúc "${frontText}". Vì cấu trúc ngữ pháp này có thể có nhiều nghĩa khác nhau, bạn phải:
Yêu cầu cấu trúc kết quả:
- meaning: Liệt kê đầy đủ và chính xác tất cả các nghĩa phổ biến của ngữ pháp này, đánh số thứ tự rõ ràng (Ví dụ: "1. Nghĩa A; 2. Nghĩa B; 3. Nghĩa C").
- nuance: Với mỗi nghĩa ở trên, hãy giải thích rõ cấu trúc ngữ pháp kết hợp chính xác (cách chia động từ, danh từ, tính từ đi kèm) và bối cảnh/sắc thái sử dụng tương ứng.`;

            exampleRule = `4. example: Đối với MỖI nghĩa của ngữ pháp được liệt kê ở trường "meaning", hãy viết 1 câu ví dụ tương ứng tiêu biểu nhất thể hiện đặc trưng của nghĩa đó (đánh số 1, 2, 3... tương ứng trên từng dòng). Hãy thay thế cấu trúc ngữ pháp "${frontText}" trong mỗi câu ví dụ bằng ＿＿＿＿. Các câu ví dụ phải có cấu trúc kết hợp chuẩn xác tuyệt đối, tự nhiên, chuẩn Nhật Bản. KHÔNG thêm phiên âm hay ngoặc furigana vào câu.`;
            exampleMeaningRule = `5. exampleMeaning: Dịch nghĩa tiếng Việt tương ứng cho từng câu ví dụ ở trên, phân dòng và đánh số 1, 2, 3... khớp hoàn toàn với các câu ví dụ ở trường "example".`;
        }
    } else {
        // Build example rule dynamically based on level
        exampleRule = `4. example: CHỈ 1 CÂU. Thay từ gốc "${frontText}" bằng ＿＿＿＿. Viết câu ví dụ tự nhiên bằng tiếng Nhật với ngữ cảnh phong phú, rõ ràng để thể hiện rõ nét nghĩa được nêu trong trường "meaning", giúp người học dễ hiểu và phân biệt bối cảnh sử dụng của từ này. Tránh các câu quá ngắn hoặc chung chung (như "Đây là...", "Tôi thích..."). KHÔNG thêm phiên âm hay ngoặc furigana vào câu.`;
        if (contextLevel === 'N5') {
            exampleRule = `4. example: CHỈ 1 CÂU. Thay từ gốc "${frontText}" bằng ＿＿＿＿. Viết bằng HIRAGANA chủ yếu, câu ngắn đơn giản dễ hiểu (tối đa 8-10 từ) nhưng có ngữ cảnh rõ ràng thể hiện đúng nghĩa, phân cách từ rõ ràng. KHÔNG thêm ngoặc phiên âm furigana.`;
        }
    }

    return `Từ điển Nhật-Việt. Từ: "${frontText}"${contextPos ? ` (Từ loại: ${contextPos})` : ''}${contextLevel ? ` [Cấp độ: ${contextLevel}]` : ''}${hasMeaning ? ` [Nghĩa yêu cầu: ${contextMeaning}]` : ''}
JSON only, không markdown/backtick:
{"frontWithFurigana":"水道（すいどう）","meaning":"đường ống nước","pos":"noun","level":"N3","sinoVietnamese":"THUỶ ĐẠO","synonym":"配管（はいかん）","synonymSinoVietnamese":"PHỐI QUẢN","example":"＿＿＿＿の水가止まった。","exampleMeaning":"Nước đường ống đã ngừng chảy.","nuance":"Chỉ hệ thống cấp nước sinh hoạt."}

${grammarInstruction}

QUY TẮC BẮT BUỘC:
1. Từ vựng (frontWithFurigana) & Từ đồng nghĩa (synonym):
   - BẮT BUỘC dùng định dạng: "Từ gốc（cách đọc hiragana của CẢ TỪ）".
   - NGOẶC PHIÊN ÂM PHẢI ĐẶT Ở CUỐI CÙNG sau toàn bộ chữ gốc. Tuyệt đối KHÔNG chèn ngoặc vào giữa các nhóm Kanji/Hiragana.
   - Ví dụ ĐÚNG: "顔認証（かおにんしょう）", "振り込む（ふりこむ）"
   - Ví dụ SAI: "顔（かお）認証（にんしょう）", "振（ふ）り込（こ）む"
   - Từ đồng nghĩa (synonym) CŨNG BẮT BUỘC tuân theo đúng form này. VD: "配管（はいかん）"
   - Trả về trường "frontWithFurigana" cho từ gốc và "synonym" cho từ đồng nghĩa.

2. meaning: ${isGrammar ? 'Định nghĩa ngữ pháp theo hướng dẫn ở trên.' : 'Ngắn gọn, nghĩa khác nhau ngăn ";". Không liệt kê nghĩa gần giống.'}

3. pos/level: Phải khớp ngữ cảnh nếu đã chọn. Grammar→giải thích như ngữ pháp.
   - pos: noun/verb/suru_verb/adj_i/adj_na/adverb/conjunction/particle/grammar/phrase/other.

${exampleRule}
${exampleMeaningRule}
6. sinoVietnamese: BẮT BUỘC dịch ĐẦY ĐỦ TẤT CẢ các chữ Kanji xuất hiện trong từ vựng/cụm từ (bao gồm cả tiền tố, hậu tố hay các Kanji phụ trong cụm dài) sang âm Hán Việt viết IN HOA, ngăn cách bằng dấu cách. Tuyệt đối không được lược bỏ, rút gọn hay dịch thiếu bất kỳ chữ Kanji nào. Không Kanji→"". KHÔNG bịa.
7. nuance: ${isGrammar ? 'Chi tiết cấu trúc ngữ pháp kết hợp chính xác và sắc thái sử dụng theo hướng dẫn ở trên.' : 'Chi tiết bối cảnh sử dụng.'}
8. synonym/synonymSinoVietnamese: Cùng/dễ hơn JLPT. N5→"". Không bịa. synonymSinoVietnamese = BẮT BUỘC dịch đầy đủ tất cả chữ Kanji của synonym sang âm Hán Việt.
9. level: N5-N1, không rõ→"".

Không trả lời gì ngoài JSON.`;
};

export const generateMoreExamplePrompt = (frontText, targetMeaning) => {
    return `Bạn là giáo viên tiếng Nhật. Hãy tạo 1 câu ví dụ độc đáo, tự nhiên và giàu ngữ cảnh cho từ vựng "${frontText}" với nghĩa cụ thể là "${targetMeaning}".

YÊU CẦU:
1. Ngữ cảnh rõ ràng: Câu ví dụ phải có bối cảnh phong phú để làm nổi bật rõ ràng nghĩa "${targetMeaning}" của từ "${frontText}", giúp người học phân biệt rõ bối cảnh này với các ý nghĩa khác của từ. Tránh tuyệt đối các câu chung chung, đơn điệu hoặc quá ngắn (như "Tôi thích...", "Đây là...").
2. Thay thế từ gốc: Trong câu tiếng Nhật, bắt buộc thay thế từ "${frontText}" (hoặc dạng chia của nó) bằng ký tự "＿＿＿＿" (4 dấu gạch dưới).
3. Không thêm phiên âm/furigana/romaji hay bất kỳ dấu ngoặc nào vào câu tiếng Nhật.
4. "exampleMeaning": Dịch nghĩa tiếng Việt tự nhiên, chính xác, thoát ý và thể hiện rõ bối cảnh câu ví dụ.

JSON ONLY (không markdown, không giải thích):
{"example":"[câu tiếng Nhật có chứa ＿＿＿＿]","exampleMeaning":"[nghĩa tiếng Việt]"}`;
};


// Hàm chính để tạo vocab với AI
export const aiAssistVocab = async (frontText, contextPos = '', contextLevel = '', contextMeaning = '') => {
    if (!frontText || frontText.trim() === '') return null;

    const prompt = generateVocabPrompt(frontText, contextPos, contextLevel, contextMeaning);
    const featureId = contextPos === 'grammar' ? 'grammar_gen' : 'vocab_gen';
    const responseText = await callAI(prompt, null, featureId);
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

    const responseText = await callAI(prompt, null, 'kanji_format');
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

// ============== OCR IMAGE EXTRACTION ==============

export const extractVocabFromImage = async (imageBase64) => {
    if (!imageBase64) return null;

    const imageUrl = imageBase64.startsWith('data:') ? imageBase64 : `data:image/jpeg;base64,${imageBase64}`;

    const promptText = `Hãy trích xuất tất cả các từ vựng tiếng Nhật (Kanji, Hiragana, Katakana hoặc chữ Hán đơn) xuất hiện trong ảnh này.
Yêu cầu trả về duy nhất một mảng JSON các chuỗi chứa các từ được tìm thấy (array of strings), ví dụ: ["単語1", "単語2"].
Không trả về bất kỳ văn bản giải thích nào khác ngoài mảng JSON này.`;

    const prompt = [
        { type: 'text', text: promptText },
        { type: 'image_url', image_url: { url: imageUrl } }
    ];

    const responseText = await callAI(prompt, null, 'ocr_image');
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
        console.error('Lỗi khi phân tích danh sách từ vựng từ AI:', e, 'Văn bản gốc:', responseText);
        return null;
    }
};

// ============== INFO ==============

export const getAIProviderInfo = () => {
    const keys = getOpenRouterKeys();
    return {
        available: [{
            id: 'openrouter',
            name: 'OpenRouter (Gemini)',
            models: OPENROUTER_MODELS,
            keyCount: keys.length
        }],
        totalKeys: keys.length,
        summary: keys.length > 0
            ? `OpenRouter(${keys.length} keys)`
            : 'Chưa cấu hình OpenRouter API key'
    };
};

// ============== GRAMMAR ANSWER CHECK ==============

export const aiCheckGrammarAnswer = async (userAnswer, questionVi, correctAnswers, grammarPattern) => {
    if (!userAnswer || !userAnswer.trim()) return null;

    const answersStr = correctAnswers.map((a, i) => `${i + 1}. ${a}`).join('\n');

    const prompt = `Bạn là giáo viên tiếng Nhật. Hãy chấm điểm và phân tích chi tiết bản dịch của học sinh.

NGỮ PHÁP ĐANG HỌC: ${grammarPattern}
CÂU TIẾNG VIỆT: ${questionVi}
ĐÁP ÁN MẪU:
${answersStr}

BÀI LÀM CỦA HỌC SINH: ${userAnswer}

Hãy đánh giá bài làm và trả về JSON (không markdown, không bọc ngoài bằng từ khóa):
{
  "score": <0-100>,
  "isCorrect": <true/false>,
  "feedback": "<Nhận xét tổng quát ngắn gọn bằng tiếng Việt>",
  "errors": ["<Danh sách lỗi sai cụ thể bằng tiếng Việt, ví dụ: 'Sai trợ từ に thành は', 'Chưa chia đúng thể động từ V-ta', hoặc mảng rỗng [] nếu không có lỗi nào>"],
  "explanation": "<Phân tích so sánh ngắn gọn, súc tích (không viết dông dài) dưới dạng các gạch đầu dòng ngắn. Sử dụng cấu trúc markdown '**A** vs **B**: giải thích ngắn 1 câu'. Đối chiếu trực tiếp từ vựng học sinh đã dùng với từ vựng trong đáp án mẫu và sắc thái ngữ cảnh của chúng (ví dụ: '**登録する** vs **申し込む**: 登録する là đăng ký tài khoản/hệ thống, còn 申し込む là đăng ký tham gia sự kiện/khóa học').>",
  "correction": "<Câu tiếng Nhật đúng gợi ý hoàn chỉnh để sửa lại bài làm của học sinh, hoặc null nếu học sinh viết đúng hoàn toàn>",
  "grammarUsed": <true/false nếu học sinh có dùng đúng cấu trúc ngữ pháp ${grammarPattern}>
}

QUY TẮC CHẤM ĐIỂM (CỰC KỲ KHÁCH QUAN VÀ HỢP LÝ):
- 90-100: Câu viết hoàn hảo, đúng hoàn toàn cả về từ vựng, ngữ pháp và ngữ cảnh, có sử dụng chính xác mẫu ngữ pháp đang học.
- 70-89: Viết đúng ý, có sử dụng mẫu ngữ pháp đang học nhưng mắc lỗi nhỏ không nghiêm trọng (như sai nhẹ trợ từ, nhầm lẫn nhỏ về kanji hoặc cách chia thể động từ nhẹ).
- 50-69: Dịch đúng nghĩa tiếng Việt nhưng không sử dụng mẫu ngữ pháp đang học, hoặc sử dụng mẫu ngữ pháp nhưng mắc lỗi nghiêm trọng về cấu trúc liên kết.
- 30-49: Sai nhiều về cấu trúc ngữ pháp, diễn đạt lủng củng, dùng sai từ vựng quan trọng mặc dù vẫn hiểu được đại ý.
- 0-29: Sai hoàn toàn nghĩa của câu, không sử dụng mẫu ngữ pháp đang học và sai ngữ pháp tiếng Nhật cơ bản.

Chỉ trả về JSON hợp lệ.`;

    try {
        const responseText = await callAI(prompt, null, 'grammar_check');
        return parseJsonFromAI(responseText);
    } catch (e) {
        console.error('AI grammar check error:', e);
        return null;
    }
};

// ============== SENTENCE TRANSLATION ==============
export const aiTranslateSentence = async (japaneseText) => {
    if (!japaneseText || japaneseText.trim() === '') return null;
    const prompt = `Dịch câu/đoạn văn tiếng Nhật sau sang tiếng Việt tự nhiên và giải thích ngắn gọn các cấu trúc ngữ pháp và từ vựng chính.
VĂN BẢN TIẾNG NHẬT: "${japaneseText}"

Hãy trả về JSON (không markdown, không bọc ngoài bằng bất cứ gì khác):
{
  "translation": "<Bản dịch tiếng Việt tự nhiên, trau chuốt>",
  "grammarNotes": ["<Giải thích từ vựng hoặc cấu trúc chính 1>", "<Giải thích từ vựng hoặc cấu trúc chính 2>"]
}

Chỉ trả về JSON hợp lệ.`;

    try {
        const responseText = await callAI(prompt, null, 'sentence_translate');
        return parseJsonFromAI(responseText);
    } catch (e) {
        console.error('AI sentence translation error:', e);
        return null;
    }
};
