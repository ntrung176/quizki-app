/**
 * Cloudflare Worker - SpeechGen.io TTS Proxy
 * 
 * Bypass CORS cho SpeechGen API + download audio file
 * Hướng dẫn:
 *   1. Vào https://dash.cloudflare.com → Workers & Pages → Create Worker
 *   2. Paste code này vào
 *   3. Deploy → Lấy URL (vd: https://speechgen-proxy.xxx.workers.dev)
 *   4. Dán URL vào .env: VITE_SPEECHGEN_PROXY_URL=https://speechgen-proxy.xxx.workers.dev
 */

export default {
    async fetch(request) {
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

        // GET /audio?url=... → Proxy fetch audio file (bypass CORS on MP3)
        if (request.method === 'GET' && url.pathname === '/audio') {
            const audioUrl = url.searchParams.get('url');
            if (!audioUrl) {
                return new Response(JSON.stringify({ error: 'Missing url parameter' }), {
                    status: 400,
                    headers: { 'Content-Type': 'application/json', ...corsHeaders },
                });
            }

            try {
                const audioResponse = await fetch(audioUrl);
                if (!audioResponse.ok) {
                    return new Response(JSON.stringify({ error: `Audio fetch failed: ${audioResponse.status}` }), {
                        status: audioResponse.status,
                        headers: { 'Content-Type': 'application/json', ...corsHeaders },
                    });
                }

                const audioData = await audioResponse.arrayBuffer();
                return new Response(audioData, {
                    status: 200,
                    headers: {
                        'Content-Type': audioResponse.headers.get('Content-Type') || 'audio/mpeg',
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

        // GET /balance?token=...&email=... → Check SpeechGen account balance
        if (request.method === 'GET' && url.pathname === '/balance') {
            const token = url.searchParams.get('token');
            const email = url.searchParams.get('email');
            if (!token || !email) {
                return new Response(JSON.stringify({ error: 'Missing token or email' }), {
                    status: 400,
                    headers: { 'Content-Type': 'application/json', ...corsHeaders },
                });
            }

            try {
                const response = await fetch('https://speechgen.io/index.php?r=api/balance', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ token, email }),
                });

                const data = await response.text();
                return new Response(data, {
                    status: response.status,
                    headers: { 'Content-Type': 'application/json', ...corsHeaders },
                });
            } catch (err) {
                return new Response(JSON.stringify({ error: err.message }), {
                    status: 500,
                    headers: { 'Content-Type': 'application/json', ...corsHeaders },
                });
            }
        }

        // POST / → Proxy SpeechGen TTS API
        if (request.method === 'POST') {
            try {
                const body = await request.json();

                const response = await fetch('https://speechgen.io/index.php?r=api/text', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(body),
                });

                const data = await response.text();

                return new Response(data, {
                    status: response.status,
                    headers: { 'Content-Type': 'application/json', ...corsHeaders },
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
