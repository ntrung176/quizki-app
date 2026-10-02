/**
 * Cloudflare Worker - OpenRouter AI Proxy for Quizki
 * 
 * Bảo mật tuyệt đối OpenRouter API Key:
 * - Không để lộ API Key trên trình duyệt (F12 Network / JS Bundle).
 * - Giới hạn danh sách Model an toàn (chống bị bên ngoài gọi model đắt tiền như GPT-5 Sol).
 * - Giới hạn max_tokens an toàn để tránh token spike.
 * - Hỗ trợ Key Rotation nếu cấu hình nhiều key.
 * 
 * HƯỚNG DẪN TRIỂN KHAI TRÊN CLOUDFLARE (HOÀN TOÀN MIỄN PHÍ):
 * 1. Truy cập https://dash.cloudflare.com → Chọn "Workers & Pages" → "Create Worker" (ví dụ đặt tên: quizki-ai-proxy).
 * 2. Chọn "Edit code" và dán toàn bộ nội dung file này vào `worker.js`.
 * 3. Vào tab "Settings" → "Variables and Secrets" → "Add variable":
 *    - Tên: OPENROUTER_API_KEY (Chọn loại "Secret" / Encrypt)
 *    - Giá trị: sk-or-v1-xxx... (Nếu có nhiều key, ngăn cách bằng dấu phẩy: sk-key1,sk-key2)
 * 4. Nhấn "Deploy".
 * 5. Copy URL Worker vừa tạo (ví dụ: https://quizki-ai-proxy.xxx.workers.dev).
 * 6. Dán vào file `.env` của Quizki:
 *    VITE_AI_PROXY_URL=https://quizki-ai-proxy.xxx.workers.dev
 */

// Danh sách các model được phép gọi qua Proxy
const ALLOWED_MODELS = new Set([
    'google/gemini-2.5-flash',
    'google/gemini-3.1-flash-lite',
    'openai/gpt-4o-mini',
    'deepseek/deepseek-chat',
    'meta-llama/llama-3.1-8b-instruct',
    'google/gemini-2.0-flash-exp:free',
    'meta-llama/llama-3.3-70b-instruct:free',
    'deepseek/deepseek-r1:free',
    'google/gemini-2.5-pro',
    'openai/gpt-4o',
    'anthropic/claude-sonnet-4.6',
    'anthropic/claude-sonnet-4.5',
    'anthropic/claude-sonnet-4',
    '~anthropic/claude-sonnet-latest',
    'anthropic/claude-3.5-haiku',
    'anthropic/claude-3.5-sonnet'
]);

const MODEL_ALIASES = {
    'anthropic/claude-3.5-sonnet': 'anthropic/claude-sonnet-4.6'
};

const MAX_ALLOWED_TOKENS = 8192; // Giới hạn tối đa tokens cho 1 request

function getApiKeys(env) {
    const raw = env.OPENROUTER_API_KEY || env.OPENROUTER_KEY || '';
    const keys = raw.split(',').map(k => k.trim()).filter(Boolean);
    
    // Check thêm OPENROUTER_API_KEY_1, _2... nếu có
    let i = 1;
    while (env[`OPENROUTER_API_KEY_${i}`]) {
        const k = env[`OPENROUTER_API_KEY_${i}`].trim();
        if (k && !keys.includes(k)) keys.push(k);
        i++;
    }
    return keys;
}

export default {
    async fetch(request, env) {
        const corsHeaders = {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, HTTP-Referer, X-Title',
            'Access-Control-Max-Age': '86400',
        };

        // Handle CORS Preflight
        if (request.method === 'OPTIONS') {
            return new Response(null, { headers: corsHeaders });
        }

        const url = new URL(request.url);
        const keys = getApiKeys(env);

        if (keys.length === 0) {
            return new Response(JSON.stringify({
                error: 'OPENROUTER_API_KEY is not configured in Cloudflare Worker Secrets.'
            }), {
                status: 500,
                headers: { 'Content-Type': 'application/json', ...corsHeaders }
            });
        }

        // 1. GET /status -> Trả về tình trạng hoạt động của Worker
        if (request.method === 'GET' && (url.pathname === '/' || url.pathname === '/status')) {
            return new Response(JSON.stringify({
                status: 'Active',
                service: 'Quizki OpenRouter AI Proxy',
                configuredKeys: keys.length,
                allowedModelsCount: ALLOWED_MODELS.size
            }), {
                status: 200,
                headers: { 'Content-Type': 'application/json', ...corsHeaders }
            });
        }

        // 2. GET /credits -> Kiểm tra số dư OpenRouter
        if (request.method === 'GET' && url.pathname === '/credits') {
            try {
                const openRouterRes = await fetch('https://openrouter.ai/api/v1/credits', {
                    headers: { 'Authorization': `Bearer ${keys[0]}` }
                });
                const data = await openRouterRes.json();
                return new Response(JSON.stringify(data), {
                    status: openRouterRes.status,
                    headers: { 'Content-Type': 'application/json', ...corsHeaders }
                });
            } catch (err) {
                return new Response(JSON.stringify({ error: err.message }), {
                    status: 500,
                    headers: { 'Content-Type': 'application/json', ...corsHeaders }
                });
            }
        }

        // 3. POST -> Xử lý Chat Completions
        if (request.method === 'POST') {
            try {
                const body = await request.json();

                // Lấy và kiểm tra model
                let requestedModel = body.model || 'google/gemini-2.5-flash';
                requestedModel = MODEL_ALIASES[requestedModel] || requestedModel;

                // Bảo mật: Nếu model không nằm trong whitelist -> Chặn ngay hoặc fallback về Gemini Flash
                if (!ALLOWED_MODELS.has(requestedModel)) {
                    console.warn(`[Proxy Security] Blocked unapproved model: ${requestedModel}. Fallback to google/gemini-2.5-flash`);
                    requestedModel = 'google/gemini-2.5-flash';
                }

                // Bảo mật: Giới hạn max_tokens tránh tràn bill
                const safeMaxTokens = Math.min(
                    Number(body.max_tokens) || 1500,
                    MAX_ALLOWED_TOKENS
                );

                const sanitizedPayload = {
                    ...body,
                    model: requestedModel,
                    max_tokens: safeMaxTokens,
                    provider: body.provider || {
                        sort: 'price',
                        allow_fallbacks: true
                    }
                };

                // Thử lần lượt các key nếu có key bị 429 / 402
                let lastResponse = null;
                let lastStatus = 500;

                for (let i = 0; i < keys.length; i++) {
                    const currentKey = keys[i];
                    const openRouterResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${currentKey}`,
                            'HTTP-Referer': request.headers.get('HTTP-Referer') || 'https://quizki.app',
                            'X-Title': 'Quizki AI Proxy'
                        },
                        body: JSON.stringify(sanitizedPayload)
                    });

                    lastStatus = openRouterResponse.status;

                    // Nếu thành công hoặc là streaming response
                    if (openRouterResponse.ok) {
                        // Nếu là Stream
                        if (sanitizedPayload.stream) {
                            return new Response(openRouterResponse.body, {
                                status: openRouterResponse.status,
                                headers: {
                                    'Content-Type': 'text/event-stream',
                                    'Cache-Control': 'no-cache',
                                    'Connection': 'keep-alive',
                                    ...corsHeaders
                                }
                            });
                        }

                        const result = await openRouterResponse.json();
                        return new Response(JSON.stringify(result), {
                            status: 200,
                            headers: { 'Content-Type': 'application/json', ...corsHeaders }
                        });
                    }

                    // Nếu bị rate limit hoặc hết tiền trên key này và còn key khác -> thử tiếp
                    if ((lastStatus === 429 || lastStatus === 402 || lastStatus === 503) && i < keys.length - 1) {
                        continue;
                    }

                    // Trả về lỗi trực tiếp
                    const errorData = await openRouterResponse.text();
                    return new Response(errorData, {
                        status: lastStatus,
                        headers: { 'Content-Type': 'application/json', ...corsHeaders }
                    });
                }

                return new Response(JSON.stringify({ error: `All OpenRouter keys failed (HTTP ${lastStatus})` }), {
                    status: lastStatus,
                    headers: { 'Content-Type': 'application/json', ...corsHeaders }
                });

            } catch (err) {
                return new Response(JSON.stringify({ error: err.message }), {
                    status: 500,
                    headers: { 'Content-Type': 'application/json', ...corsHeaders }
                });
            }
        }

        return new Response(JSON.stringify({ error: 'Method not allowed' }), {
            status: 405,
            headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
    }
};
