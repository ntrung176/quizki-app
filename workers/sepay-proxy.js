/**
 * Cloudflare Worker - SePay API Proxy
 * 
 * Deploy lên Cloudflare Workers (miễn phí) để bypass CORS
 * Hướng dẫn: 
 *   1. Vào https://dash.cloudflare.com → Workers & Pages → Create Worker
 *   2. Paste code này vào
 *   3. Deploy → Lấy URL (vd: https://sepay-proxy.xxx.workers.dev)
 *   4. Dán URL vào .env: VITE_SEPAY_PROXY_URL=https://sepay-proxy.xxx.workers.dev
 */

export default {
    async fetch(request) {
        // Handle CORS preflight
        if (request.method === 'OPTIONS') {
            return new Response(null, {
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
                    'Access-Control-Max-Age': '86400',
                }
            });
        }

        const url = new URL(request.url);

        // Lấy path sau worker URL, vd: /transactions/list?...
        const sepayPath = url.pathname.replace(/^\//, '') + url.search;
        const sepayUrl = `https://my.sepay.vn/userapi/${sepayPath}`;

        try {
            const response = await fetch(sepayUrl, {
                method: request.method,
                headers: {
                    'Authorization': request.headers.get('Authorization') || '',
                    'Content-Type': 'application/json',
                }
            });

            const data = await response.text();

            return new Response(data, {
                status: response.status,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
                }
            });
        } catch (err) {
            return new Response(JSON.stringify({ error: err.message }), {
                status: 500,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                }
            });
        }
    }
};
