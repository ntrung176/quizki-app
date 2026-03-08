/**
 * Cloudflare Worker - Resend Email Proxy
 * 
 * Bảo mật API Key của Resend và cho phép gửi mail từ ứng dụng Frontend
 * 1. Vào https://dash.cloudflare.com → Workers & Pages → Create Worker
 * 2. Paste code này vào
 * 3. Quan trọng: Tới mục Settings -> Variables -> Add variable
 *    Tên: RESEND_API_KEY (Đánh dấu sao/Encrypt là Secret)
 *    Giá trị: re_... (API Key lấy trên trang web Resend)
 * 4. Deploy → Lấy URL dán vào file .env của app:
 *    VITE_RESEND_PROXY_URL=https://resend-proxy.xxx.workers.dev
 */

export default {
    async fetch(request, env) {
        const corsHeaders = {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'OPTIONS, POST',
            'Access-Control-Allow-Headers': 'Content-Type',
        };

        // Handle CORS preflight
        if (request.method === 'OPTIONS') {
            return new Response(null, { headers: corsHeaders });
        }

        // Chỉ chấp nhận POST request
        if (request.method !== 'POST') {
            return new Response(JSON.stringify({ error: 'Method not allowed' }), {
                status: 405, headers: corsHeaders
            });
        }

        try {
            // Đọc thông tin người nhận, tiêu đề, và nội dung mail từ Frontend gửi lên
            const payload = await request.json();
            const { to, subject, html, text } = payload;

            if (!to || !subject || (!html && !text)) {
                return new Response(JSON.stringify({ error: 'Missing required fields (to, subject, html)' }), {
                    status: 400, headers: corsHeaders
                });
            }

            // Gọi API gốc của Resend
            const resendResponse = await fetch('https://api.resend.com/emails', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${env.RESEND_API_KEY}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    from: 'Quizki <noreply@quizki.id.vn>', // Sửa email có chứa tên miền của bạn ở đây
                    to: [to],
                    subject: subject,
                    html: html,
                    text: text
                }),
            });

            const data = await resendResponse.json();

            // Trả kết quả về cho ứng dụng Frontend
            return new Response(JSON.stringify(data), {
                status: resendResponse.status,
                headers: { 'Content-Type': 'application/json', ...corsHeaders },
            });

        } catch (error) {
            return new Response(JSON.stringify({ error: error.message }), {
                status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders }
            });
        }
    }
};
