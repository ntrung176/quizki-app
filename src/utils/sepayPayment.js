/**
 * SePay Payment Integration
 * 
 * Luồng thanh toán:
 * 1. User chọn gói → tạo mã đơn hàng unique
 * 2. Hiện QR chuyển khoản với nội dung = mã đơn hàng
 * 3. Polling SePay API mỗi 5s để kiểm tra giao dịch
 * 4. Khi tìm thấy giao dịch khớp mã + số tiền → tự động cộng credits
 */

const isDev = import.meta.env.DEV;

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
 * Tạo link QR VietQR cho chuyển khoản
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
 * Dev: Vite proxy /api/sepay → my.sepay.vn/userapi
 * Production: corsproxy.io bypass CORS
 */
export const checkPaymentStatus = async (sepayToken, orderCode, expectedAmount) => {
    if (!sepayToken) {
        console.warn('SePay token not configured');
        return null;
    }

    try {
        const queryPath = `transactions/list?transaction_content=${encodeURIComponent(orderCode)}&amount_in=${expectedAmount}&limit=1`;

        let url;
        if (isDev) {
            url = `/api/sepay/${queryPath}`;
        } else {
            // Production: dùng corsproxy.io để bypass CORS
            url = `https://corsproxy.io/?${encodeURIComponent(`https://my.sepay.vn/userapi/${queryPath}`)}`;
        }

        console.log(`🔍 SePay check [${isDev ? 'DEV' : 'PROD'}]: ${orderCode}`);

        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${sepayToken}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            const errText = await response.text().catch(() => '');
            console.error(`SePay API error ${response.status}:`, errText);
            return null;
        }

        const data = await response.json();
        console.log('SePay response:', data);

        const transactions = data.transactions || [];
        if (transactions.length > 0) {
            const tx = transactions[0];
            if (tx.amount_in >= expectedAmount &&
                tx.transaction_content &&
                tx.transaction_content.toUpperCase().includes(orderCode.toUpperCase())) {
                console.log('✅ Payment matched!', tx);
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

        return { success: false };
    } catch (e) {
        console.error('SePay check payment error:', e);
        return null;
    }
};

/**
 * Default bank info
 */
export const DEFAULT_BANK_INFO = {
    bankId: 'MB',
    accountNo: '0123456789',
    accountName: 'NGUYEN TRUNG'
};

/**
 * Bank list for VietQR
 */
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
