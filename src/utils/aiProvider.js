// --- AI Provider: OpenRouter Only ---
// Sử dụng duy nhất OpenRouter (Gemini 2.5 Flash) cho tất cả AI generation

// ============== KANJI → HÁN VIỆT LOOKUP ==============
export { getSinoVietnamese } from './kanjiHVLookup';


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
    let exampleRule;
    if (contextLevel === 'N5') {
        exampleRule = `4. example: CHỈ 1 CÂU. Thay từ gốc "${frontText}" bằng ＿＿＿＿. Viết bằng HIRAGANA chủ yếu, câu ngắn đơn giản dễ hiểu (tối đa 8-10 từ), tránh dùng kanji ngoài bộ N5. Nếu bắt buộc dùng Kanji khó (ngoài N5) → ghi kèm furigana dạng 漢字（ひらがな）ví dụ: 経営（けいえい）. KHÔNG ghi furigana cho từ gốc đã thay bằng ＿＿＿＿.`;
    } else {
        exampleRule = `4. example: CHỈ 1 CÂU. Thay từ gốc "${frontText}" bằng ＿＿＿＿. Viết câu tự nhiên bằng tiếng Nhật (dùng kanji bình thường). Các Kanji khó/hiếm/cao cấp hơn cấp độ hiện tại → GHI KÈM furigana dạng 漢字（ひらがな）ngay sau kanji đó. Ví dụ: 経営（けいえい）状態（じょうたい）が悪（わる）いので、＿＿＿＿した。 KHÔNG ghi furigana cho từ gốc đã thay bằng ＿＿＿＿. Dùng ngoặc toàn khổ （ ）.`;
    }

    return `Từ điển Nhật-Việt. Từ: "${frontText}"${contextPos ? ` (Từ loại: ${contextPos})` : ''}${contextLevel ? ` [Cấp độ: ${contextLevel}]` : ''}
JSON only, không markdown/backtick:
{"frontWithFurigana":"水道（すいどう）","meaning":"đường ống nước","pos":"noun","level":"N3","sinoVietnamese":"THUỶ ĐẠO","synonym":"配管","synonymSinoVietnamese":"PHỐI QUẢN","example":"＿＿＿＿の水が止まった。","exampleMeaning":"Nước đường ống đã ngừng chảy.","nuance":"Chỉ hệ thống cấp nước sinh hoạt."}

QUY TẮC BẮT BUỘC:
1. frontWithFurigana (QUAN TRỌNG NHẤT — định dạng trường hiển thị chính):
   - Nếu từ có Kanji → viết theo định dạng: TừVựngGốc（toàn bộ phiên âm hiragana）.
   - BẮT BUỘC dùng ngoặc đơn TOÀN KHỔ của Nhật （ ）, KHÔNG dùng ngoặc thường () hay [] hay 「」.
   - Phiên âm trong ngoặc là TOÀN BỘ cụm từ đọc bằng hiragana, KHÔNG tách rời từng Kanji.
   - Nếu từ gốc đã chia → giữ nguyên dạng đã chia, KHÔNG đổi về dạng từ điển.
   - VD ĐÚNG: 振り込む（ふりこむ）, 連絡して（れんらくして）, 水道（すいどう）, 食べる（たべる）, 割り込む（わりこむ）
   - VD SAI: 振（ふ）り込（こ）む, 食（た）べる, 振り込む(ふりこむ), 振り込む[ふりこむ]
   - Nếu từ đã là 100% hiragana/katakana → frontWithFurigana = từ gốc (không thêm ngoặc).
   - CỤM TỪ dài → giữ nguyên cụm, phiên âm toàn bộ: 連絡して教えてもらう（れんらくしておしえてもらう）

2. meaning: Ngắn gọn, nghĩa khác nhau ngăn ";". Không liệt kê nghĩa gần giống.

3. pos/level: Phải khớp ngữ cảnh nếu đã chọn. Grammar→giải thích như ngữ pháp.
   - pos: noun/verb/suru_verb/adj_i/adj_na/adverb/conjunction/particle/grammar/phrase/other.
   - CỤM TỪ có trợ từ (を/に/が/で/と/から/まで) hoặc ghép nhiều động từ → pos="phrase".

${exampleRule}
5. exampleMeaning: Nghĩa tiếng Việt đầy đủ của câu ví dụ.
6. sinoVietnamese: IN HOA từng Kanji (VD: 流行→"LƯU HÀNH"). Không Kanji→"". KHÔNG bịa.
7. nuance: Chi tiết. Động từ→TĐT/ThaĐT. Katakana→ghi từ gốc. Bối cảnh sử dụng, so sánh từ tương tự. KHÔNG quá ngắn.
8. synonym/synonymSinoVietnamese: Cùng/dễ hơn JLPT. N5→"". Không bịa. synonymSinoVietnamese = HV của synonym.
9. level: N5-N1, không rõ→"".

Không trả lời gì ngoài JSON.`;
};

export const generateMoreExamplePrompt = (frontText, targetMeaning) => {
    return `1 câu ví dụ JP cho "${frontText}" nghĩa "${targetMeaning}". Thay "${frontText}" bằng ＿＿＿＿. Các Kanji khó/hiếm → ghi kèm furigana dạng 漢字（ひらがな）ngay sau kanji đó, dùng ngoặc toàn khổ（）. KHÔNG ghi furigana cho từ gốc đã thay bằng ＿＿＿＿. Viết câu tự nhiên. JSON only:{"example":"câu JP có ＿＿＿＿ và furigana cho kanji khó","exampleMeaning":"nghĩa VN"}`;
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
    }

    return result;
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
