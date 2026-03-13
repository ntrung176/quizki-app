// --- Gemini AI API utilities ---
// BACKWARD COMPATIBILITY: Module này giữ lại để tương thích ngược.
// Logic chính đã chuyển sang aiProvider.js (OpenRouter only)

import { aiAssistVocab, callAI, parseJsonFromAI, getOpenRouterKeys } from './aiProvider';

// Re-export cho tương thích ngược
export const getAllGeminiApiKeysFromEnv = getOpenRouterKeys;

// Gemini AI Assist - DÙNG OPENROUTER
export const geminiAssist = aiAssistVocab;

// Alias for backward compatibility
export const generateVocabWithAI = aiAssistVocab;
