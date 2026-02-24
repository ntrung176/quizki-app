// --- Gemini AI API utilities ---
// BACKWARD COMPATIBILITY: Module này giữ lại để tương thích ngược.
// Logic chính đã chuyển sang aiProvider.js (hỗ trợ Gemini + Groq + OpenRouter)

import { aiAssistVocab, callAI, parseJsonFromAI, getGeminiKeys } from './aiProvider';

// Re-export cho tương thích ngược
export const getAllGeminiApiKeysFromEnv = getGeminiKeys;

// Danh sách model ưu tiên (thử lần lượt nếu model trước bị hết quota)
const GEMINI_MODELS = ['gemini-2.0-flash-lite', 'gemini-2.0-flash', 'gemini-1.5-flash'];

// Call Gemini API with retry logic for text generation
// GIỮ LẠI để tương thích với code cũ trong App.jsx (batch classification, etc.)
export const callGeminiApiWithRetry = async (payload, model = 'gemini-2.0-flash-lite', apiKeys = null, keyIndex = 0, _triedModels = null) => {
    const keys = apiKeys || getAllGeminiApiKeysFromEnv();
    const triedModels = _triedModels || new Set();

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
                await new Promise(resolve => setTimeout(resolve, 500));
                return callGeminiApiWithRetry(payload, model, keys, keyIndex + 1, triedModels);
            }

            // All keys exhausted for this model - try fallback model
            if ((response.status === 429 || response.status === 503)) {
                triedModels.add(model);
                const fallbackModel = GEMINI_MODELS.find(m => !triedModels.has(m));
                if (fallbackModel) {
                    console.log(`All keys exhausted for ${model}, trying fallback model: ${fallbackModel}...`);
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    return callGeminiApiWithRetry(payload, fallbackModel, keys, 0, triedModels);
                }
            }

            throw new Error(`Lỗi API Gemini ${response.status}: ${errorText}`);
        }

        return await response.json();
    } catch (error) {
        // If network error and more keys available, try next key
        if (keyIndex < keys.length - 1 && !error.message?.includes('Lỗi API Gemini')) {
            console.log(`Gemini API key ${keyIndex + 1} failed, trying key ${keyIndex + 2}...`);
            await new Promise(resolve => setTimeout(resolve, 500));
            return callGeminiApiWithRetry(payload, model, keys, keyIndex + 1, triedModels);
        }
        throw error;
    }
};

// Gemini AI Assist - DÙNG UNIFIED PROVIDER (hỗ trợ Groq + OpenRouter + Gemini)
export const geminiAssist = aiAssistVocab;

// Alias for backward compatibility
export const generateVocabWithAI = aiAssistVocab;
