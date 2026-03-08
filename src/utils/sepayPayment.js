/**
 * SePay Payment Integration
 * 
 * Dev: Vite proxy (/api/sepay → my.sepay.vn/userapi)
 * Prod: Cloudflare Worker proxy (VITE_SEPAY_PROXY_URL)
 */

const isDev = import.meta.env.DEV;
const SEPAY_PROXY_URL = import.meta.env.VITE_SEPAY_PROXY_URL || '';

// Lấy SePay token: ưu tiên admin config, fallback .env
export const getSepayToken = (adminConfig) => {
    return adminConfig?.sepayToken || import.meta.env.VITE_SEPAY_API_KEY || '';
};

/**
 * Tạo mã đơn hàng unique
 */
export const generateOrderCode = (userId) => {
    const ts = Date.now().toString(36).toUpperCase();
    const uid = (userId || '').slice(0, 6).toUpperCase();
    return `QK${uid}${ts}`;
};

/**
 * Tạo link QR VietQR
 */
export const generateVietQR = (bankId, accountNo, accountName, amount, content) => {
    const params = new URLSearchParams({
        amount: amount.toString(),
        addInfo: content,
        accountName: accountName
    });
    return `https://img.vietqr.io/image/${bankId}-${accountNo}-compact2.png?${params.toString()}`;
};

/**
 * Kiểm tra giao dịch qua SePay API
 */
export const checkPaymentStatus = async (sepayToken, orderCode, expectedAmount, pollingStartTime) => {
    if (!sepayToken) {
        console.warn('❌ SePay token not configured');
        return null;
    }

    try {
        const today = new Date().toISOString().split('T')[0];
        const queryPath = `transactions/list?amount_in=${expectedAmount}&limit=20&from_date=${today}`;

        let url;
        if (SEPAY_PROXY_URL) {
            // Ưu tiên: Cloudflare Worker proxy (hoạt động cả local lẫn production)
            url = `${SEPAY_PROXY_URL.replace(/\/$/, '')}/${queryPath}`;
            console.log(`🔍 SePay poll [Worker]: ${orderCode} | amount=${expectedAmount} | url=${url}`);
        } else if (isDev) {
            // Fallback: Vite proxy (chỉ dùng khi chưa có VITE_SEPAY_PROXY_URL)
            url = `/api/sepay/${queryPath}`;
            console.log(`🔍 SePay poll [DEV Vite proxy - fallback]: ${orderCode} | amount=${expectedAmount}`);
        } else {
            console.error('❌ VITE_SEPAY_PROXY_URL chưa được cấu hình!');
            return null;
        }

        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${sepayToken}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            const errText = await response.text().catch(() => '');
            console.error(`❌ SePay error ${response.status}:`, errText.substring(0, 300));
            return null;
        }

        const data = await response.json();
        const transactions = data.transactions || [];
        console.log(`📊 SePay: ${transactions.length} giao dịch khớp amount=${expectedAmount} hôm nay`);

        if (transactions.length > 0) {
            // Match 1: Tìm giao dịch có nội dung CK chứa mã đơn hàng
            for (const tx of transactions) {
                const content = (tx.transaction_content || '').toUpperCase();
                const code = orderCode.toUpperCase();
                console.log(`  📝 TX #${tx.id}: "${tx.transaction_content}" | ${tx.amount_in}đ`);

                if (content.includes(code)) {
                    console.log('✅ Khớp theo nội dung chuyển khoản!');
                    return {
                        success: true,
                        transactionId: tx.id,
                        referenceNumber: tx.reference_number,
                        amount: tx.amount_in,
                        content: tx.transaction_content,
                        date: tx.transaction_date
                    };
                }
            }

            // Match 2: Giao dịch mới nhất trong 15 phút, đúng số tiền, và XYẢY RA SAU khi polling bắt đầu
            const recentTx = transactions[0];
            const txTime = new Date(recentTx.transaction_date);
            const now = new Date();
            const diffMin = (now - txTime) / 60000;
            // Chỉ chấp nhận giao dịch xảy ra SAU khi bắt đầu phên thanh toán này (tránh bắt lại giao dịch cũ)
            const isAfterPollingStart = pollingStartTime ? txTime >= pollingStartTime : true;

            if (diffMin <= 15 && recentTx.amount_in >= expectedAmount && isAfterPollingStart) {
                console.log(`✅ Khớp theo số tiền + thời gian (${diffMin.toFixed(1)} phút trước)!`);
                return {
                    success: true,
                    transactionId: recentTx.id,
                    referenceNumber: recentTx.reference_number,
                    amount: recentTx.amount_in,
                    content: recentTx.transaction_content,
                    date: recentTx.transaction_date
                };
            } else if (!isAfterPollingStart) {
                console.log(`⏱️ Bỏ qua TX #${recentTx.id}: xảy ra TRƯỜC khi bắt đầu thanh toán (${txTime.toLocaleTimeString()} < ${pollingStartTime?.toLocaleTimeString()})`);
            }
        }

        return { success: false };
    } catch (e) {
        console.error('❌ SePay error:', e.message);
        return null;
    }
};

export const DEFAULT_BANK_INFO = {
    bankId: 'MB',
    accountNo: '0123456789',
    accountName: 'NGUYEN TRUNG'
};

export const BANK_LIST = [
    { id: 'MB', name: 'MB Bank' },
    { id: 'VCB', name: 'Vietcombank' },
    { id: 'TCB', name: 'Techcombank' },
    { id: 'ACB', name: 'ACB' },
    { id: 'TPB', name: 'TPBank' },
    { id: 'VPB', name: 'VPBank' },
    { id: 'BIDV', name: 'BIDV' },
    { id: 'VTB', name: 'VietinBank' },
    { id: 'MSB', name: 'MSB' },
    { id: 'STB', name: 'Sacombank' },
];
