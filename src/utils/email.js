/**
 * Gửi email thông qua Cloudflare Worker (Resend proxy)
 * Cách này bảo vệ API Key của bạn trên Server, không lộ cho Hacker
 */
const sendEmail = async (toEmail, subject, htmlContent) => {
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
 * Gửi mail thông báo khách hàng Nâng cấp Premium thành công
 */
export const sendAIPurchaseSuccessEmail = async (userEmail, userName, packageName, amountVND, credits) => {
    const subject = `🌸 Kích hoạt thành công gói Premium ${packageName} - Quizki`;

    const htmlContent = `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05); background-color: #ffffff;">
        <div style="background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%); padding: 32px 24px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 26px; font-weight: 700; letter-spacing: -0.5px;">Chào mừng bạn đến với Quizki Premium!</h1>
            <p style="color: #e0e7ff; margin: 8px 0 0 0; font-size: 16px;">Cảm ơn bạn đã tin tưởng và đồng hành cùng chúng mình</p>
        </div>
        
        <div style="padding: 32px; color: #1f2937;">
            <p style="font-size: 16px; line-height: 1.6; margin-top: 0;">Chào <strong>${userName || 'bạn'}</strong> thân mến,</p>
            <p style="font-size: 16px; line-height: 1.6; color: #4b5563;">
                Lời đầu tiên, đội ngũ Quizki xin gửi lời cảm ơn chân thành nhất vì bạn đã lựa chọn nâng cấp tài khoản và đồng hành cùng chúng mình trên con đường chinh phục tiếng Nhật. Sự ủng hộ của bạn là động lực vô cùng lớn lao để chúng mình tiếp tục hoàn thiện và phát triển ứng dụng tốt hơn mỗi ngày.
            </p>
            <p style="font-size: 16px; line-height: 1.6; color: #4b5563;">
                Giao dịch của bạn đã được xác nhận thành công. Tài khoản của bạn đã được nâng cấp lên gói <strong>Premium</strong> với đầy đủ các quyền lợi đặc quyền.
            </p>
            
            <div style="margin: 28px 0; padding: 24px; background-color: #f8fafc; border-radius: 12px; border: 1px solid #e2e8f0;">
                <p style="margin: 0 0 16px 0; font-size: 13px; color: #4f46e5; text-transform: uppercase; font-weight: 700; letter-spacing: 1px;">Chi Tiết Giao Dịch</p>
                <div style="display: flex; justify-content: space-between; margin: 8px 0; font-size: 15px; border-bottom: 1px dashed #e2e8f0; padding-bottom: 8px;">
                    <span style="color: #6b7280;">Dịch vụ kích hoạt:</span>
                    <strong style="color: #1f2937;">${packageName}</strong>
                </div>
                <div style="display: flex; justify-content: space-between; margin: 8px 0; font-size: 15px; border-bottom: 1px dashed #e2e8f0; padding-bottom: 8px;">
                    <span style="color: #6b7280;">Trạng thái tài khoản:</span>
                    <strong style="color: #10b981;">Premium Đã Kích Hoạt</strong>
                </div>
                <div style="display: flex; justify-content: space-between; margin: 8px 0; font-size: 15px; padding-bottom: 8px;">
                    <span style="color: #6b7280;">Số tiền thanh toán:</span>
                    <strong style="color: #4f46e5; font-size: 16px;">${Number(amountVND).toLocaleString('vi-VN')}đ</strong>
                </div>
                <p style="margin: 12px 0 0 0; font-size: 12px; color: #9ca3af; text-align: right;">Thời gian đối soát: ${new Date().toLocaleString('vi-VN')}</p>
            </div>
            
            <p style="font-size: 15px; font-weight: 600; color: #1f2937; margin-bottom: 12px;">Từ bây giờ, bạn đã có toàn quyền sử dụng tất cả tính năng cao cấp:</p>
            <ul style="padding-left: 20px; margin: 0 0 28px 0; font-size: 15px; color: #4b5563; line-height: 1.6;">
                <li style="margin-bottom: 8px;">🤖 <strong>Không giới hạn AI:</strong> Tự động tạo từ vựng, câu ví dụ thông minh và giải thích ngữ cảnh chi tiết.</li>
                <li style="margin-bottom: 8px;">🌸 <strong>Bộ ba học chuyên sâu:</strong> Mở khóa toàn bộ kho dữ liệu Từ vựng Zen, Ngữ pháp Zen và Luyện chữ Kanji Zen.</li>
                <li style="margin-bottom: 8px;">📈 <strong>Thuật toán SRS thông minh:</strong> Tự động lên lịch ôn tập tối ưu để ghi nhớ sâu sắc nhất.</li>
                <li style="margin-bottom: 8px;">🔊 <strong>Phát âm chuẩn bản xứ:</strong> Luyện nghe và phát âm với giọng đọc chất lượng cao.</li>
            </ul>
            
            <div style="text-align: center; margin: 36px 0 12px 0;">
                <a href="https://quizki.id.vn" style="display: inline-block; background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%); color: #ffffff; padding: 14px 36px; text-decoration: none; border-radius: 12px; font-weight: 700; font-size: 16px; box-shadow: 0 4px 10px rgba(79, 70, 229, 0.3); transition: all 0.2s;">Bắt đầu học ngay thôi</a>
            </div>
        </div>
        
        <div style="background-color: #f8fafc; padding: 24px; text-align: center; border-top: 1px solid #e2e8f0; color: #6b7280; font-size: 14px;">
            <p style="margin: 0 0 8px 0; line-height: 1.5;">Nếu gặp bất kỳ khó khăn nào trong quá trình học, tụi mình luôn ở đây sẵn sàng hỗ trợ qua Zalo và Fanpage Messenger nhé.</p>
            <p style="margin: 8px 0 0 0; font-weight: 600; color: #4f46e5;">Thân ái,<br>Đội ngũ phát triển Quizki</p>
        </div>
    </div>
    `;

    return await sendEmail(userEmail, subject, htmlContent);
};

/**
 * Gửi mail thông báo đã nhận yêu cầu xác nhận chuyển khoản thủ công
 */
export const sendAIPendingConfirmationEmail = async (userEmail, userName, packageName, amountVND) => {
    const subject = `⏳ Yêu cầu xác nhận thanh toán gói ${packageName} đang được xử lý`;

    const htmlContent = `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05); background-color: #ffffff;">
        <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 32px 24px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 700; letter-spacing: -0.5px;">Chúng mình đã nhận được yêu cầu</h1>
            <p style="color: #fef3c7; margin: 8px 0 0 0; font-size: 16px;">Hệ thống đang tiến hành đối soát giao dịch</p>
        </div>
        
        <div style="padding: 32px; color: #1f2937;">
            <p style="font-size: 16px; line-height: 1.6; margin-top: 0;">Chào <strong>${userName || 'bạn'}</strong>,</p>
            <p style="font-size: 16px; line-height: 1.6; color: #4b5563;">
                Cảm ơn bạn đã gửi thông báo chuyển khoản thủ công cho gói <strong>${packageName}</strong>. Đội ngũ kỹ thuật của Quizki đã tiếp nhận thông tin và đang đối soát với lịch sử giao dịch ngân hàng.
            </p>
            
            <div style="margin: 28px 0; padding: 24px; background-color: #fffbeb; border-radius: 12px; border: 1px solid #fef3c7;">
                <p style="margin: 0 0 16px 0; font-size: 13px; color: #b45309; text-transform: uppercase; font-weight: 700; letter-spacing: 1px;">Thông Tin Yêu Cầu Chờ Duyệt</p>
                <div style="display: flex; justify-content: space-between; margin: 8px 0; font-size: 15px; border-bottom: 1px dashed #fcd34d; padding-bottom: 8px;">
                    <span style="color: #78350f;">Gói dịch vụ đăng ký:</span>
                    <strong style="color: #451a03;">${packageName}</strong>
                </div>
                <div style="display: flex; justify-content: space-between; margin: 8px 0; font-size: 15px; border-bottom: 1px dashed #fcd34d; padding-bottom: 8px;">
                    <span style="color: #78350f;">Số tiền thanh toán:</span>
                    <strong style="color: #b45309;">${Number(amountVND).toLocaleString('vi-VN')}đ</strong>
                </div>
                <div style="display: flex; justify-content: space-between; margin: 8px 0; font-size: 15px; padding-bottom: 8px;">
                    <span style="color: #78350f;">Trạng thái xử lý:</span>
                    <strong style="color: #d97706;">Đang đối soát ngân hàng</strong>
                </div>
                <p style="margin: 12px 0 0 0; font-size: 12px; color: #b45309; opacity: 0.8; text-align: right;">Đơn tạo lúc: ${new Date().toLocaleString('vi-VN')}</p>
            </div>
            
            <p style="font-size: 16px; line-height: 1.6; color: #4b5563;">
                Chúng mình sẽ kích hoạt tài khoản ngay lập tức khi tiền nổi trên hệ thống ngân hàng (thông thường chỉ mất từ 3 - 10 phút). Bạn cũng sẽ nhận được email thông báo ngay khi gói dịch vụ được kích hoạt thành công.
            </p>
            <p style="font-size: 16px; line-height: 1.6; color: #4b5563;">
                Trong thời gian này nếu bạn có bất kỳ thắc mắc hoặc cần hỗ trợ gấp, vui lòng nhắn tin trực tiếp cho tụi mình qua nút chat hỗ trợ (Zalo/Messenger) trên website nhé.
            </p>
        </div>
        
        <div style="background-color: #f8fafc; padding: 24px; text-align: center; border-top: 1px solid #e2e8f0; color: #6b7280; font-size: 14px;">
            <p style="margin: 0 0 8px 0; line-height: 1.5;">Chúc bạn một ngày học tập thật hiệu quả và tràn đầy niềm vui!</p>
            <p style="margin: 8px 0 0 0; font-weight: 600; color: #d97706;">Thân ái,<br>Đội ngũ phát triển Quizki</p>
        </div>
    </div>
    `;

    return await sendEmail(userEmail, subject, htmlContent);
};
