/**
 * Cloudflare Worker - Microsoft Azure Speech TTS Proxy
 * 
 * Bảo mật API Key Azure và chuyển tiếp yêu cầu Text-to-Speech từ trình duyệt.
 * Hướng dẫn:
 *   1. Vào https://dash.cloudflare.com → Workers & Pages → Create Worker
 *   2. Dán mã nguồn này vào.
 *   3. Trong Settings → Variables → Add Variables:
 *      - AZURE_SPEECH_KEY (Secret): Key của bạn (ví dụ: 78ICHFIMoaS6...)
 *      - AZURE_SPEECH_REGION (Environment Variable): Region của bạn (ví dụ: eastasia)
 *   4. Deploy → Lấy URL proxy (ví dụ: https://azure-speech-proxy.xxx.workers.dev)
 *   5. Dán URL vào .env: VITE_AZURE_SPEECH_PROXY_URL=https://azure-speech-proxy.xxx.workers.dev
 */

export default {
    async fetch(request, env) {
        const corsHeaders = {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
            'Access-Control-Max-Age': '86400',
        };

        // Handle CORS preflight
        if (request.method === 'OPTIONS') {
            return new Response(null, { headers: corsHeaders });
        }

        const url = new URL(request.url);
        const key = env.AZURE_SPEECH_KEY;
        const region = env.AZURE_SPEECH_REGION || 'eastasia';

        if (!key) {
            return new Response(JSON.stringify({ error: 'AZURE_SPEECH_KEY is not configured on the worker' }), {
                status: 500,
                headers: { 'Content-Type': 'application/json', ...corsHeaders },
            });
        }

        // GET /status -> Kiểm tra kết nối và trạng thái của API key
        if (request.method === 'GET' && url.pathname === '/status') {
            try {
                // Thử gọi endpoint list voices để kiểm tra API key
                const azureUrl = `https://${region}.tts.speech.microsoft.com/cognitiveservices/voices/list`;
                const response = await fetch(azureUrl, {
                    method: 'GET',
                    headers: {
                        'Ocp-Apim-Subscription-Key': key,
                        'User-Agent': 'quizki-app'
                    }
                });

                if (response.ok) {
                    return new Response(JSON.stringify({ status: 'Active', region }), {
                        status: 200,
                        headers: { 'Content-Type': 'application/json', ...corsHeaders },
                    });
                } else {
                    return new Response(JSON.stringify({ status: 'Error', error: `Azure returned HTTP ${response.status}` }), {
                        status: 400,
                        headers: { 'Content-Type': 'application/json', ...corsHeaders },
                    });
                }
            } catch (err) {
                return new Response(JSON.stringify({ status: 'Error', error: err.message }), {
                    status: 500,
                    headers: { 'Content-Type': 'application/json', ...corsHeaders },
                });
            }
        }

        // POST / -> Thực hiện TTS và trả về file binary audio
        if (request.method === 'POST') {
            try {
                const { text, voiceName } = await request.json();

                if (!text || !voiceName) {
                    return new Response(JSON.stringify({ error: 'Missing text or voiceName parameter' }), {
                        status: 400,
                        headers: { 'Content-Type': 'application/json', ...corsHeaders },
                    });
                }

                const azureUrl = `https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`;
                const ssml = `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="ja-JP"><voice xml:lang="ja-JP" name="${voiceName}">${text}</voice></speak>`;

                const response = await fetch(azureUrl, {
                    method: 'POST',
                    headers: {
                        'Ocp-Apim-Subscription-Key': key,
                        'Content-Type': 'application/ssml+xml',
                        'X-Microsoft-OutputFormat': 'audio-24khz-48kbitrate-mono-mp3',
                        'User-Agent': 'quizki-app'
                    },
                    body: ssml
                });

                if (!response.ok) {
                    const errorText = await response.text();
                    return new Response(JSON.stringify({ error: `Azure TTS failed with status ${response.status}`, details: errorText }), {
                        status: response.status,
                        headers: { 'Content-Type': 'application/json', ...corsHeaders },
                    });
                }

                const audioData = await response.arrayBuffer();
                return new Response(audioData, {
                    status: 200,
                    headers: {
                        'Content-Type': 'audio/mpeg',
                        'Content-Length': audioData.byteLength.toString(),
                        ...corsHeaders,
                    },
                });
            } catch (err) {
                return new Response(JSON.stringify({ error: err.message }), {
                    status: 500,
                    headers: { 'Content-Type': 'application/json', ...corsHeaders },
                });
            }
        }

        return new Response(JSON.stringify({ error: 'Method not allowed' }), {
            status: 405,
            headers: { 'Content-Type': 'application/json', ...corsHeaders },
        });
    }
};
