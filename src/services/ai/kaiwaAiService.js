import { getOpenRouterKeys, OPENROUTER_MODELS, getEffectiveModel, extractOpenRouterText } from '../../utils/aiProvider';

export const callKaiwaAI = async (systemPrompt, conversationHistory = [], userMessage = '', forcedModel = null) => {
    const keys = getOpenRouterKeys();
    if (keys.length === 0) {
        throw new Error('Không có OpenRouter API key. Vui lòng thêm VITE_OPENROUTER_API_KEY vào file .env');
    }

    let activeModel = forcedModel;
    if (!activeModel) {
        try {
            const { loadAdminConfig } = await import('../../utils/adminSettings');
            const config = await loadAdminConfig();
            if (config?.aiFeatureModels?.kaiwa_agent) {
                activeModel = config.aiFeatureModels.kaiwa_agent;
            }
        } catch (e) {
            console.warn('Failed to load admin config for Kaiwa model:', e);
        }
    }
    if (!activeModel) {
        activeModel = 'google/gemini-2.5-flash';
    }
    activeModel = getEffectiveModel(activeModel);

    const messages = [
        { role: 'system', content: systemPrompt },
        ...conversationHistory,
        { role: 'user', content: userMessage }
    ];

    const callWithMessagesRetry = async (messagesList, keyIndex = 0, modelIndex = 0, preferredModel = null) => {
        const currentKey = keys[keyIndex];
        let models = [...OPENROUTER_MODELS];
        const effectivePreferred = getEffectiveModel(preferredModel);
        if (effectivePreferred) {
            models = [effectivePreferred, ...models.filter(m => m !== effectivePreferred)];
        }
        const currentModel = models[modelIndex];
        const safeOrigin = (typeof window !== 'undefined' && window.location?.origin && window.location.origin.startsWith('http')) 
            ? window.location.origin 
            : 'https://quizki.app';

        const controller = new AbortController();
        const timeoutId = setTimeout(() => {
            console.warn(`⏰ OpenRouter Kaiwa timeout after 18s (${currentModel}), aborting request...`);
            controller.abort();
        }, 18000);

        const url = 'https://openrouter.ai/api/v1/chat/completions';
        const options = {
            method: 'POST',
            signal: controller.signal,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${currentKey}`,
                'HTTP-Referer': safeOrigin,
                'X-Title': 'Quizki Kaiwa'
            },
            body: JSON.stringify({
                model: currentModel,
                messages: messagesList,
                temperature: 0.7,
                max_tokens: 2048,
                response_format: { type: 'json_object' },
                provider: {
                    sort: 'price',
                    allow_fallbacks: true
                }
            })
        };

        try {
            const response = await fetch(url, options);
            clearTimeout(timeoutId);

            if (response.ok) {
                const result = await response.json();
                const text = extractOpenRouterText(result);
                if (text) {
                    console.log(`✅ OpenRouter Kaiwa (${currentModel}) thành công!`);
                    return text;
                }
            }

            const status = response.status;
            if ((status === 429 || status === 503) && keyIndex < keys.length - 1) {
                console.log(`⚠️ OpenRouter Kaiwa key ${keyIndex + 1} rate limited, thử key ${keyIndex + 2}...`);
                await new Promise(r => setTimeout(r, 500));
                return callWithMessagesRetry(messagesList, keyIndex + 1, modelIndex, preferredModel);
            }
            if ((status === 429 || status === 503) && modelIndex < models.length - 1) {
                console.log(`⚠️ Hết quota cho ${currentModel}, thử ${models[modelIndex + 1]}...`);
                await new Promise(r => setTimeout(r, 500));
                return callWithMessagesRetry(messagesList, 0, modelIndex + 1, preferredModel);
            }
            if (status === 404 && modelIndex < models.length - 1) {
                console.log(`⚠️ Model ${currentModel} không tồn tại, thử ${models[modelIndex + 1]}...`);
                return callWithMessagesRetry(messagesList, keyIndex, modelIndex + 1, preferredModel);
            }

            const errorText = await response.text().catch(() => '');
            console.error(`❌ OpenRouter Kaiwa error (${status}):`, errorText);
            throw new Error(`OpenRouter API error: ${status}`);
        } catch (error) {
            clearTimeout(timeoutId);
            if (error.message?.startsWith('OpenRouter API error')) throw error;
            console.error(`❌ OpenRouter Kaiwa network/timeout error:`, error.message);
            if (keyIndex < keys.length - 1) {
                return callWithMessagesRetry(messagesList, keyIndex + 1, modelIndex, preferredModel);
            }
            if (modelIndex < models.length - 1) {
                return callWithMessagesRetry(messagesList, 0, modelIndex + 1, preferredModel);
            }
            throw error;
        }
    };

    return callWithMessagesRetry(messages, 0, 0, activeModel);
};
