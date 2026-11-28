/**
 * AI Illustration Recreator Service:
 * Takes a pasted screenshot of a JLPT question diagram/illustration and recreates a clean, sharp version
 * via OpenRouter multimodal image generation, with automatic SVG-to-PNG vector redraw fallback.
 */
import { getAiProxyUrl, getOpenRouterKeys, callAI } from '../../utils/aiProvider';
import { assertCanAffordAi, consumeAiCredits } from '../../utils/aiCreditManager';

const IMAGE_GEN_MODELS = [
    'google/gemini-2.5-flash-image-preview',
    'google/gemini-2.5-flash-image'
];

const buildEndpointHeaders = (apiKey) => {
    const proxyUrl = getAiProxyUrl();
    const isProxy = Boolean(proxyUrl);
    const safeOrigin = (typeof window !== 'undefined' && window.location?.origin?.startsWith('http'))
        ? window.location.origin
        : 'https://quizki.app';

    const headers = {
        'Content-Type': 'application/json',
        'HTTP-Referer': safeOrigin,
        'X-Title': 'Quizki JLPT Illustration'
    };
    if (!isProxy && apiKey && apiKey !== 'cloudflare-proxy-active') {
        headers.Authorization = `Bearer ${apiKey}`;
    }

    const url = isProxy
        ? (proxyUrl.endsWith('/chat/completions') || proxyUrl.endsWith('/v1/chat/completions')
            ? proxyUrl
            : `${proxyUrl.replace(/\/+$/, '')}/v1/chat/completions`)
        : 'https://openrouter.ai/api/v1/chat/completions';

    return { url, headers };
};

const extractImageFromOpenRouterResult = (result) => {
    const msg = result?.choices?.[0]?.message;
    if (!msg) return null;
    if (Array.isArray(msg.images) && msg.images[0]?.image_url?.url) {
        return msg.images[0].image_url.url;
    }
    if (Array.isArray(msg.content)) {
        const imgPart = msg.content.find((p) => p?.type === 'image_url' && p?.image_url?.url);
        if (imgPart) return imgPart.image_url.url;
    }
    if (typeof msg.content === 'string') {
        const dataMatch = msg.content.match(/data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/=]+/);
        if (dataMatch) return dataMatch[0];
    }
    return null;
};

const rasterizeSvgToPngDataUrl = (svgMarkup, width = 1280, height = 800) => new Promise((resolve, reject) => {
    const cleanSvg = svgMarkup.includes('xmlns=')
        ? svgMarkup
        : svgMarkup.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');

    const svgBlob = new Blob([cleanSvg], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);
    const img = new Image();
    img.onload = () => {
        try {
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, width, height);
            ctx.drawImage(img, 0, 0, width, height);
            const pngUrl = canvas.toDataURL('image/png', 0.94);
            resolve(pngUrl);
        } catch (err) {
            reject(err);
        } finally {
            URL.revokeObjectURL(url);
        }
    };
    img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Không thể render ảnh vector từ AI.'));
    };
    img.src = url;
});

/**
 * Recreates a clean JLPT illustration from a pasted reference screenshot.
 * First attempts OpenRouter native image generation; falls back reliably to Gemini Vision SVG -> PNG.
 */
export const recreateIllustrationWithAI = async ({
    referenceDataUrl,
    stylePreset = 'textbook',
    customNote = ''
} = {}) => {
    if (!referenceDataUrl) throw new Error('Vui lòng dán hoặc chọn ảnh chụp đề trước.');
    const keys = getOpenRouterKeys();
    if (keys.length === 0) {
        throw new Error('Chưa cấu hình AI Key (OpenRouter / Proxy).');
    }

    assertCanAffordAi('ocr_image');

    const styleDesc = stylePreset === 'colored'
        ? 'clean modern pastel Japanese learning book flat illustration on crisp pure white background, neat thin dark outlines, gentle pastel fills'
        : stylePreset === 'diagram'
            ? 'crisp high-contrast black-and-white technical schematic, map, floorplan or timetable diagram on pure white background with bold legible numbers'
            : 'clean high-contrast JLPT official exam line-art illustration on pure white background, sharp vector strokes, clear numbered panels (1, 2, 3, 4) if present';

    const promptInstruction = `Redraw the attached Japanese JLPT exam question illustration into a brand new, crystal-clear, ultra-clean ${styleDesc}.
CRITICAL ACCURACY RULES:
- Preserve EVERY meaningful detail, object position, sequence/numbers (1, 2, 3, 4), arrows, schedules, counts, and any Japanese text labels accurately from the reference screenshot.
- Remove ALL scan blur, gray shadows, paper creases, moire patterns, or cropped neighboring question numbers.
${customNote ? `- Extra user direction: ${customNote}` : ''}`;

    // 1. Try native OpenRouter image generation model
    for (const model of IMAGE_GEN_MODELS) {
        for (const key of keys) {
            try {
                const { url, headers } = buildEndpointHeaders(key);
                const resp = await fetch(url, {
                    method: 'POST',
                    headers,
                    body: JSON.stringify({
                        model,
                        modalities: ['image', 'text'],
                        messages: [{
                            role: 'user',
                            content: [
                                { type: 'text', text: promptInstruction },
                                { type: 'image_url', image_url: { url: referenceDataUrl } }
                            ]
                        }]
                    })
                });
                if (!resp.ok) continue;
                const data = await resp.json();
                const outImage = extractImageFromOpenRouterResult(data);
                if (outImage) {
                    await consumeAiCredits('ocr_image').catch(() => {});
                    return { dataUrl: outImage, method: 'raster_ai', model };
                }
            } catch {
                // Fall through to SVG vector redraw
            }
        }
    }

    // 2. Reliable fallback: Gemini Vision -> Clean crisp SVG -> High-DPI PNG
    const svgPrompt = [
        {
            type: 'text',
            text: `You are an expert Japanese JLPT textbook vector illustrator. Study the attached screenshot carefully and redraw it as a CLEAN, BEAUTIFUL, SELF-CONTAINED SVG (<svg viewBox="0 0 800 500" ...>...</svg>) on white background (#ffffff).
RULES:
1. Keep EVERY object, character pose, arrow, direction, clock/chart/calendar detail, Japanese text, and option panels (1, 2, 3, 4 if any) 100% faithful to the screenshot.
2. Style: ${styleDesc}. Use clean rounded shapes, clear Japanese sans-serif fonts, crisp strokes (#1e293b), optional subtle sky/amber/emerald accents if appropriate, pure white background (#ffffff).
3. NO external <image> links, NO markdown explanation, return ONLY raw <svg ...>...</svg>.
${customNote ? `4. Extra note: ${customNote}` : ''}`
        },
        { type: 'image_url', image_url: { url: referenceDataUrl } }
    ];

    const svgRaw = await callAI(svgPrompt, 'google/gemini-2.5-flash', 'ocr_image', 4096);
    const svgMatch = String(svgRaw || '').match(/<svg[\s\S]*<\/svg>/i);
    if (!svgMatch) {
        throw new Error('AI không tạo được ảnh từ mẫu này, hãy thử chụp rõ hơn hoặc thêm mô tả.');
    }

    const pngDataUrl = await rasterizeSvgToPngDataUrl(svgMatch[0], 1280, 800);
    return { dataUrl: pngDataUrl, method: 'vector_svg', model: 'google/gemini-2.5-flash' };
};
