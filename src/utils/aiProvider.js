// --- Unified AI Provider System ---
// Hỗ trợ nhiều AI providers: Gemini, Groq, OpenRouter
// Tự động detect keys từ .env và fallback giữa các providers

// ============== KEY MANAGEMENT ==============

// Lấy tất cả Gemini keys
export const getGeminiKeys = () => {
    const keys = [];
    let i = 1;
    while (true) {
        const key = import.meta.env[`VITE_GEMINI_API_KEY_${i}`];
        if (key) {
            keys.push(key);
            i++;
        } else {
            break;
        }
    }
    return keys;
};

// Lấy tất cả Groq keys
export const getGroqKeys = () => {
    const keys = [];
    let i = 1;
    while (true) {
        const key = import.meta.env[`VITE_GROQ_API_KEY_${i}`];
        if (key) {
            keys.push(key);
            i++;
        } else {
            break;
        }
    }
    // Cũng check key đơn (không đánh số)
    const singleKey = import.meta.env.VITE_GROQ_API_KEY;
    if (singleKey && !keys.includes(singleKey)) {
        keys.unshift(singleKey);
    }
    return keys;
};

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

// ============== PROVIDER DEFINITIONS ==============

const PROVIDERS = {
    gemini: {
        name: 'Gemini',
        models: ['gemini-2.0-flash-lite', 'gemini-2.0-flash', 'gemini-1.5-flash'],
        getKeys: getGeminiKeys,
        buildRequest: (prompt, model, apiKey) => ({
            url: `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
            options: {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: { temperature: 0.3, maxOutputTokens: 2048 }
                })
            }
        }),
        extractText: (result) => result?.candidates?.[0]?.content?.parts?.[0]?.text || null
    },
    groq: {
        name: 'Groq',
        // Llama 3.3 70B rất mạnh, miễn phí trên Groq
        models: ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant', 'gemma2-9b-it'],
        getKeys: getGroqKeys,
        buildRequest: (prompt, model, apiKey) => ({
            url: 'https://api.groq.com/openai/v1/chat/completions',
            options: {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
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
        }),
        extractText: (result) => result?.choices?.[0]?.message?.content || null
    },
    openrouter: {
        name: 'OpenRouter',
        // Free models trên OpenRouter (không cần credit card)
        models: ['meta-llama/llama-3.1-8b-instruct:free', 'google/gemma-2-9b-it:free', 'qwen/qwen-2-7b-instruct:free'],
        getKeys: getOpenRouterKeys,
        buildRequest: (prompt, model, apiKey) => ({
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
        }),
        extractText: (result) => result?.choices?.[0]?.message?.content || null
    }
};

// ============== CORE API CALL ==============

// Gọi AI với một provider cụ thể, tự động retry qua các keys và models
const callProviderWithRetry = async (provider, prompt, keyIndex = 0, modelIndex = 0) => {
    const config = PROVIDERS[provider];
    if (!config) throw new Error(`Unknown provider: ${provider}`);

    const keys = config.getKeys();
    if (keys.length === 0) return null; // Provider không có key → bỏ qua

    const models = config.models;
    const currentKey = keys[keyIndex];
    const currentModel = models[modelIndex];

    const { url, options } = config.buildRequest(prompt, currentModel, currentKey);

    try {
        const response = await fetch(url, options);

        if (response.ok) {
            const result = await response.json();
            const text = config.extractText(result);
            if (text) {
                console.log(`✅ ${config.name} (${currentModel}) thành công!`);
                return text;
            }
        }

        const status = response.status;

        // Rate limited → thử key tiếp theo
        if ((status === 429 || status === 503) && keyIndex < keys.length - 1) {
            console.log(`⚠️ ${config.name} key ${keyIndex + 1} rate limited, thử key ${keyIndex + 2}...`);
            await new Promise(r => setTimeout(r, 500));
            return callProviderWithRetry(provider, prompt, keyIndex + 1, modelIndex);
        }

        // Hết key cho model này → thử model tiếp theo
        if ((status === 429 || status === 503) && modelIndex < models.length - 1) {
            console.log(`⚠️ ${config.name} hết quota cho ${currentModel}, thử ${models[modelIndex + 1]}...`);
            await new Promise(r => setTimeout(r, 500));
            return callProviderWithRetry(provider, prompt, 0, modelIndex + 1);
        }

        // Model not found (404) → thử model tiếp theo
        if (status === 404 && modelIndex < models.length - 1) {
            console.log(`⚠️ ${config.name} model ${currentModel} không tồn tại, thử ${models[modelIndex + 1]}...`);
            return callProviderWithRetry(provider, prompt, keyIndex, modelIndex + 1);
        }

        // Lỗi không retry được
        const errorText = await response.text().catch(() => '');
        console.error(`❌ ${config.name} error (${status}):`, errorText);
        return null;

    } catch (error) {
        console.error(`❌ ${config.name} network error:`, error.message);
        // Network error → thử key tiếp
        if (keyIndex < keys.length - 1) {
            return callProviderWithRetry(provider, prompt, keyIndex + 1, modelIndex);
        }
        return null;
    }
};

// ============== UNIFIED AI CALL ==============

// Xác định thứ tự ưu tiên providers dựa trên keys có sẵn
const getAvailableProviders = () => {
    const available = [];
    // Ưu tiên Groq (nhanh nhất, free tier tốt nhất)
    if (getGroqKeys().length > 0) available.push('groq');
    // Gemini
    if (getGeminiKeys().length > 0) available.push('gemini');
    // OpenRouter (fallback cuối)
    if (getOpenRouterKeys().length > 0) available.push('openrouter');
    return available;
};

// Gọi AI thống nhất - tự động chọn provider hoặc dùng provider admin chỉ định
export const callAI = async (prompt, forcedProvider = 'auto') => {
    let providers;

    if (forcedProvider && forcedProvider !== 'auto') {
        // Admin đã chọn provider cụ thể
        const config = PROVIDERS[forcedProvider];
        if (!config) throw new Error(`Unknown provider: ${forcedProvider}`);
        const keys = config.getKeys();
        if (keys.length === 0) {
            throw new Error(`Provider ${config.name} không có API key. Vui lòng thêm key vào .env`);
        }
        providers = [forcedProvider];
    } else {
        // Auto: thử tất cả providers
        providers = getAvailableProviders();
    }

    if (providers.length === 0) {
        throw new Error('Không có API key nào được cấu hình. Vui lòng thêm VITE_GROQ_API_KEY hoặc VITE_GEMINI_API_KEY_1 vào file .env');
    }

    console.log(`🤖 Thử ${providers.length} AI providers: ${providers.map(p => PROVIDERS[p].name).join(' → ')}`);

    for (const provider of providers) {
        try {
            const result = await callProviderWithRetry(provider, prompt);
            if (result) return result;
            console.log(`⚠️ ${PROVIDERS[provider].name} không khả dụng, thử provider tiếp theo...`);
        } catch (e) {
            console.error(`❌ ${PROVIDERS[provider].name} failed:`, e);
        }
    }

    throw new Error('Tất cả AI providers đều không khả dụng. Vui lòng kiểm tra API keys hoặc thử lại sau.');
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

// ============== VOCAB GENERATION ==============

export const generateVocabPrompt = (frontText, contextPos = '', contextLevel = '') => {
    return `Bạn là một trợ lý từ điển Nhật-Việt chuyên nghiệp. Cho từ vựng tiếng Nhật sau: "${frontText}"
${contextPos ? `Từ loại gợi ý: ${contextPos}` : ''}
${contextLevel ? `Level gợi ý: ${contextLevel}` : ''}

Hãy phân tích và trả về DUY NHẤT một JSON hợp lệ (KHÔNG markdown, KHÔNG backtick, chỉ JSON thuần):
{
    "reading": "cách đọc hiragana",
    "meaning": "nghĩa tiếng Việt",
    "example": "câu ví dụ tiếng Nhật",
    "exampleMeaning": "nghĩa câu ví dụ",
    "pos": "từ loại",
    "level": "JLPT level",
    "synonym": "từ đồng nghĩa",
    "nuance": "sắc thái, bối cảnh sử dụng",
    "sinoVietnamese": "âm Hán Việt"
}

=== QUY TẮC BẮT BUỘC ===

1. TRƯỜNG "reading": CHỈ điền cách đọc hiragana nếu từ có Kanji. Không có Kanji thì để trống "".

2. TRƯỜNG "meaning": Nghĩa ngắn gọn. Nếu có nhiều nghĩa KHÁC NHAU HOÀN TOÀN thì ngăn cách bằng dấu ";". Ví dụ: "ăn; sống (bằng nghề)". TUYỆT ĐỐI KHÔNG liệt kê nghĩa gần giống nhau.

3. TRƯỜNG "example" và "exampleMeaning":
- MẶC ĐỊNH CHỈ 1 CÂU VÍ DỤ DUY NHẤT.
- CHỈ KHI có nhiều nghĩa KHÁC BIỆT (đã ngăn cách bằng ;) thì mới viết thêm ví dụ cho từng nghĩa.
- Không đánh số. Các câu cách nhau bằng \\\\n. VD: "彼はまだ甘い。\\\\nこのケーキは甘い。" và "Anh ấy còn non nớt.\\\\nCái bánh này ngọt."
- Số dòng exampleMeaning PHẢI BẰNG example.

4. TRƯỜNG "sinoVietnamese": BẮT BUỘC nếu có Kanji. Viết IN HOA từng Kanji, cách dấu cách.
QUAN TRỌNG: CHỈ CHỌN ÂM HÁN VIỆT PHỔ BIẾN NHẤT hoặc ĐÚNG NHẤT với nghĩa của từ trong ngữ cảnh này.
VD: 流行→"LƯU HÀNH", 行→"HÀNH" hoặc "HẠNG" tùy nghĩa. Bỏ qua hiragana: 新しい→"TÂN". Không có Kanji thì "".

5. TRƯỜNG "nuance": Giải thích CHI TIẾT bối cảnh sử dụng, mức độ trang trọng, so sánh với từ tương tự.
VD TỐT: "Dùng giao tiếp hàng ngày, lịch sự trung bình. Khác với 食う mang sắc thái thô."
VD XẤU: "Dùng phổ biến."

6. "pos": noun/verb/suru_verb/adj_i/adj_na/adverb/conjunction/particle/phrase/other
7. "level": N5/N4/N3/N2/N1`;
};


// Hàm chính để tạo vocab với AI (tương thích ngược với geminiAssist)
export const aiAssistVocab = async (frontText, contextPos = '', contextLevel = '') => {
    if (!frontText || frontText.trim() === '') return null;

    const prompt = generateVocabPrompt(frontText, contextPos, contextLevel);
    const responseText = await callAI(prompt);
    return parseJsonFromAI(responseText);
};

// ============== INFO ==============

export const getAIProviderInfo = () => {
    const providers = getAvailableProviders();
    return {
        available: providers.map(p => ({
            id: p,
            name: PROVIDERS[p].name,
            models: PROVIDERS[p].models,
            keyCount: PROVIDERS[p].getKeys().length
        })),
        totalKeys: providers.reduce((sum, p) => sum + PROVIDERS[p].getKeys().length, 0),
        summary: providers.length > 0
            ? `${providers.map(p => `${PROVIDERS[p].name}(${PROVIDERS[p].getKeys().length} keys)`).join(', ')} `
            : 'Chưa cấu hình AI provider nào'
    };
};
