/**
 * Cloudflare Worker - SePay API Proxy
 * 
 * Bảo mật SePay API Token và cho phép kiểm tra giao dịch từ ứng dụng Frontend
 * 1. Vào https://dash.cloudflare.com → Workers & Pages → sepay-proxy
 * 2. Cập nhật code này
 * 3. Settings -> Variables and Secrets -> Add variable:
 *    Tên: SEPAY_API_KEY (Chọn loại Secret)
 *    Giá trị: MHH5... (API Token trên my.sepay.vn)
 * 4. Deploy → Dán URL vào .env: VITE_SEPAY_PROXY_URL=https://sepay-proxy.xxx.workers.dev
 */

export default {
    async fetch(request, env) {
        const corsHeaders = {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            'Access-Control-Max-Age': '86400',
        };

        // Handle CORS preflight
        if (request.method === 'OPTIONS') {
            return new Response(null, { headers: corsHeaders });
        }

        const url = new URL(request.url);

        // Lấy path sau worker URL, vd: /transactions/list?...
        const sepayPath = url.pathname.replace(/^\//, '') + url.search;
        const sepayUrl = `https://my.sepay.vn/userapi/${sepayPath}`;

        // Lấy token từ Secret của Worker trước, nếu không có mới lấy từ request client
        let authHeader = request.headers.get('Authorization') || '';
        if (env?.SEPAY_API_KEY) {
            authHeader = `Bearer ${env.SEPAY_API_KEY.trim()}`;
        }

        try {
            const response = await fetch(sepayUrl, {
                method: request.method,
                headers: {
                    'Authorization': authHeader,
                    'Content-Type': 'application/json',
                }
            });

            const data = await response.text();

            return new Response(data, {
                status: response.status,
                headers: {
                    'Content-Type': 'application/json',
                    ...corsHeaders
                }
            });
        } catch (err) {
            return new Response(JSON.stringify({ error: err.message }), {
                status: 500,
                headers: {
                    'Content-Type': 'application/json',
                    ...corsHeaders
                }
            });
        }
    }
};
