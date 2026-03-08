/**
 * Gửi email thông qua Cloudflare Worker (Resend proxy)
 * Cách này bảo vệ API Key của bạn trên Server, không lộ cho Hacker
 */
export const sendEmail = async (toEmail, subject, htmlContent) => {
    const proxyUrl = import.meta.env.VITE_RESEND_PROXY_URL;

    console.log('📧 sendEmail called:', { toEmail, subject, proxyUrl: proxyUrl || '(chưa cấu hình)' });

    if (!proxyUrl) {
        console.warn('⚠️ Gửi mail thất bại: VITE_RESEND_PROXY_URL chưa được cấu hình.');
        return false;
    }

    try {
        const response = await fetch(proxyUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                to: toEmail,
                subject: subject,
                html: htmlContent
            })
        });

        const responseData = await response.json();
        console.log('📧 Resend proxy response:', { status: response.status, ok: response.ok, data: responseData });

        if (!response.ok) {
            throw new Error(responseData?.message || responseData?.error || JSON.stringify(responseData) || 'Không thể gửi mail');
        }

        console.log(`✅ Mail đã gửi thành công tới: ${toEmail} (ID: ${responseData?.id})`);
        return true;
    } catch (error) {
        console.error('❌ Lỗi khi gửi email:', error.message);
        return false;
    }
};

/**
 * Gửi mail thông báo khách hàng Nâng cấp AI thành công
 */
export const sendAIPurchaseSuccessEmail = async (userEmail, userName, packageName, amountVND, credits) => {
    const subject = `🚀 Nâng cấp thành công gói ${packageName} - Quizki App`;

    const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
        <div style="background-color: #4f46e5; padding: 24px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 24px;">Cảm ơn bạn đã đồng hành!</h1>
        </div>
        
        <div style="padding: 32px; background-color: #ffffff;">
            <p style="font-size: 16px; color: #374151;">Chào <strong>${userName || 'bạn'}</strong>,</p>
            <p style="font-size: 16px; color: #4b5563; line-height: 1.5;">Giao dịch nâng cấp Gói Tín Dụng AI của bạn đã được xác nhận thành công.</p>
            
            <div style="margin: 32px 0; padding: 20px; background-color: #f3f4f6; border-radius: 8px; border-left: 4px solid #4f46e5;">
                <p style="margin: 0 0 12px 0; font-size: 14px; color: #6b7280; text-transform: uppercase; font-weight: bold;">Chi Tiết Giao Dịch</p>
                <p style="margin: 8px 0; font-size: 16px;"><strong>🔹 Tên Gói:</strong> ${packageName}</p>
                <p style="margin: 8px 0; font-size: 16px;"><strong>💳 Số tín dụng nhận được:</strong> <span style="color: #059669; font-weight: bold;">+${credits} thẻ</span></p>
                <p style="margin: 8px 0; font-size: 16px;"><strong>💰 Số tiền:</strong> ${Number(amountVND).toLocaleString('vi-VN')}đ</p>
                <p style="margin: 8px 0; font-size: 14px; color: #6b7280;">Hóa đơn tạo lúc: ${new Date().toLocaleString('vi-VN')}</p>
            </div>
            
            <p style="font-size: 16px; color: #4b5563; line-height: 1.5;">Bạn đã có thể bắt đầu sử dụng AI để tự động dịch và phân tích câu ví dụ tiếng Nhật ngay bây giờ!</p>
            
            <div style="text-align: center; margin-top: 32px;">
                <a href="https://quizki.id.vn" style="display: inline-block; background-color: #4f46e5; color: white; padding: 12px 32px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">Mở ứng dụng ngay</a>
            </div>
        </div>
        
        <div style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e2e8f0;">
            <p style="color: #9ca3af; font-size: 14px; margin: 0;">Trân trọng,<br>Đội ngũ phát triển Quizki App</p>
        </div>
    </div>
    `;

    return await sendEmail(userEmail, subject, htmlContent);
};
