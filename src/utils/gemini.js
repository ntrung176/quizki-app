// --- Gemini AI API utilities ---

// Helper: Lấy tất cả API keys từ env (VITE_GEMINI_API_KEY_1, VITE_GEMINI_API_KEY_2, ..., VITE_GEMINI_API_KEY_N)
export const getAllGeminiApiKeysFromEnv = () => {
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

// Helper: Lấy danh sách API keys từ env (dùng cho TTS)
export const getTtsApiKeys = () => {
    return getAllGeminiApiKeysFromEnv();
};

// Fetch TTS API call with retry logic
export const fetchTtsApiCall = async (text, voiceName = 'Kore', apiKeys = null, keyIndex = 0) => {
    const keys = apiKeys || getTtsApiKeys();

    if (keys.length === 0) {
        throw new Error('Không có API key được cấu hình cho TTS');
    }

    const currentKey = keys[keyIndex % keys.length];

    const payload = {
        contents: [{
            parts: [{ text: text }]
        }],
        generationConfig: {
            response_modalities: ["AUDIO"],
            speech_config: {
                voice_config: {
                    prebuilt_voice_config: {
                        voice_name: voiceName
                    }
                }
            }
        }
    };

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent?key=${currentKey}`;

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorText = await response.text();

            // If rate limited and more keys available, try next key
            if ((response.status === 429 || response.status === 503) && keyIndex < keys.length - 1) {
                console.log(`TTS API key ${keyIndex + 1} rate limited, trying key ${keyIndex + 2}...`);
                return fetchTtsApiCall(text, voiceName, keys, keyIndex + 1);
            }

            throw new Error(`TTS API error ${response.status}: ${errorText}`);
        }

        const result = await response.json();
        return result;
    } catch (error) {
        // If network error and more keys available, try next key
        if (keyIndex < keys.length - 1) {
            console.log(`TTS API key ${keyIndex + 1} failed, trying key ${keyIndex + 2}...`);
            return fetchTtsApiCall(text, voiceName, keys, keyIndex + 1);
        }
        throw error;
    }
};

// Fetch TTS and return base64 audio data
export const fetchTtsBase64 = async (text) => {
    if (!text || text.trim() === '') {
        return null;
    }

    try {
        const result = await fetchTtsApiCall(text);

        // Extract base64 audio data from response
        const audioData = result?.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

        if (!audioData) {
            console.warn('TTS response missing audio data');
            return null;
        }

        return audioData;
    } catch (error) {
        console.error('TTS fetch error:', error);
        return null;
    }
};

// Call Gemini API with retry logic for text generation
export const callGeminiApiWithRetry = async (payload, model = 'gemini-2.5-flash-preview-09-2025', apiKeys = null, keyIndex = 0) => {
    const keys = apiKeys || getAllGeminiApiKeysFromEnv();

    if (keys.length === 0) {
        throw new Error('Không có API key được cấu hình cho Gemini');
    }

    const currentKey = keys[keyIndex % keys.length];
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${currentKey}`;

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorText = await response.text();

            // If rate limited and more keys available, try next key
            if ((response.status === 429 || response.status === 503) && keyIndex < keys.length - 1) {
                console.log(`Gemini API key ${keyIndex + 1} rate limited, trying key ${keyIndex + 2}...`);
                // Wait a bit before retry
                await new Promise(resolve => setTimeout(resolve, 500));
                return callGeminiApiWithRetry(payload, model, keys, keyIndex + 1);
            }

            throw new Error(`Lỗi API Gemini ${response.status}: ${errorText}`);
        }

        return await response.json();
    } catch (error) {
        // If network error and more keys available, try next key
        if (keyIndex < keys.length - 1 && !error.message?.includes('Lỗi API Gemini')) {
            console.log(`Gemini API key ${keyIndex + 1} failed, trying key ${keyIndex + 2}...`);
            await new Promise(resolve => setTimeout(resolve, 500));
            return callGeminiApiWithRetry(payload, model, keys, keyIndex + 1);
        }
        throw error;
    }
};

// Gemini AI Assist - Get vocabulary information
export const geminiAssist = async (frontText, contextPos = '', contextLevel = '') => {
    if (!frontText || frontText.trim() === '') {
        return null;
    }

    const prompt = `Bạn là một trợ lý học tiếng Nhật. Cho từ vựng tiếng Nhật sau: "${frontText}"
${contextPos ? `Từ loại gợi ý: ${contextPos}` : ''}
${contextLevel ? `Level gợi ý: ${contextLevel}` : ''}

Hãy phân tích và cung cấp thông tin theo format JSON sau (KHÔNG markdown, chỉ JSON thuần):
{
    "reading": "Cách đọc hiragana của từ (nếu có kanji)",
    "meaning": "Nghĩa tiếng Việt chính xác, súc tích",
    "example": "Câu ví dụ tiếng Nhật sử dụng từ này",
    "exampleMeaning": "Nghĩa tiếng Việt của câu ví dụ",
    "pos": "Từ loại (noun/verb/adj-i/adj-na/adverb/conjunction/particle/phrase/other)",
    "level": "Level JLPT ước tính (N5/N4/N3/N2/N1)",
    "synonym": "Từ đồng nghĩa tiếng Nhật (nếu có)",
    "nuance": "Sắc thái, ngữ cảnh sử dụng",
    "sinoVietnamese": "Âm Hán Việt (nếu có kanji)"
}`;

    const payload = {
        contents: [{
            parts: [{ text: prompt }]
        }],
        generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 1024
        }
    };

    try {
        const result = await callGeminiApiWithRetry(payload);
        const responseText = result?.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!responseText) {
            return null;
        }

        // Parse JSON from response
        let jsonStr = responseText.trim();

        // Remove markdown code blocks if present
        if (jsonStr.startsWith('```json')) {
            jsonStr = jsonStr.slice(7);
        }
        if (jsonStr.startsWith('```')) {
            jsonStr = jsonStr.slice(3);
        }
        if (jsonStr.endsWith('```')) {
            jsonStr = jsonStr.slice(0, -3);
        }

        jsonStr = jsonStr.trim();

        try {
            const data = JSON.parse(jsonStr);
            return data;
        } catch (parseError) {
            console.error('Error parsing Gemini response:', parseError);
            return null;
        }
    } catch (error) {
        console.error('Gemini assist error:', error);
        throw error;
    }
};

// Alias for backward compatibility
export const generateVocabWithAI = geminiAssist;
