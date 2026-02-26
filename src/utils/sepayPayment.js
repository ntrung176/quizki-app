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
export const checkPaymentStatus = async (sepayToken, orderCode, expectedAmount) => {
    if (!sepayToken) {
        console.warn('❌ SePay token not configured');
        return null;
    }

    try {
        const today = new Date().toISOString().split('T')[0];
        const queryPath = `transactions/list?amount_in=${expectedAmount}&limit=20&from_date=${today}`;

        let url;
        if (isDev) {
            // Dev: Vite proxy
            url = `/api/sepay/${queryPath}`;
        } else if (SEPAY_PROXY_URL) {
            // Production: Cloudflare Worker proxy
            url = `${SEPAY_PROXY_URL}/${queryPath}`;
        } else {
            console.error('❌ No SEPAY_PROXY_URL configured for production');
            return null;
        }

        console.log(`🔍 SePay poll [${isDev ? 'DEV' : 'PROD'}]: ${orderCode} | amount=${expectedAmount}`);

        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${sepayToken}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            const errText = await response.text().catch(() => '');
            console.error(`❌ SePay error ${response.status}:`, errText.substring(0, 200));
            return null;
        }

        const data = await response.json();
        const transactions = data.transactions || [];
        console.log(`📊 SePay: ${transactions.length} giao dịch khớp amount=${expectedAmount}`);

        if (transactions.length > 0) {
            // Match 1: Tìm giao dịch có nội dung CK chứa mã đơn hàng
            for (const tx of transactions) {
                const content = (tx.transaction_content || '').toUpperCase();
                const code = orderCode.toUpperCase();
                console.log(`  📝 TX #${tx.id}: "${tx.transaction_content}" | ${tx.amount_in}đ`);

                if (content.includes(code)) {
                    console.log('✅ Matched by content!');
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

            // Match 2: Giao dịch mới nhất trong 10 phút, đúng số tiền
            const recentTx = transactions[0];
            const txTime = new Date(recentTx.transaction_date);
            const now = new Date();
            const diffMin = (now - txTime) / 60000;

            if (diffMin <= 10 && recentTx.amount_in >= expectedAmount) {
                console.log(`✅ Matched by amount+time (${diffMin.toFixed(1)} min ago)!`);
                return {
                    success: true,
                    transactionId: recentTx.id,
                    referenceNumber: recentTx.reference_number,
                    amount: recentTx.amount_in,
                    content: recentTx.transaction_content,
                    date: recentTx.transaction_date
                };
            }
        }

        return { success: false };
    } catch (e) {
        console.error('❌ SePay error:', e);
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
