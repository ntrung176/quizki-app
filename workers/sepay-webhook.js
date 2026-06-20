// ============================================================
// SePay Webhook Worker v2.1 — Quizki Auto Payment
// Deploy lên Cloudflare Workers Dashboard
// Env vars cần thiết: WEBHOOK_SECRET, FIREBASE_SERVICE_ACCOUNT
// ============================================================
const FIREBASE_PROJECT_ID = "quizki-988e9";
const APP_ID = "1:28989364918:web:a2a99ad33fc0c23fca6417";
const WORKER_VERSION = "v2.1"; // Dùng để xác nhận đã deploy đúng bản

export default {
    async fetch(request, env) {
        // CORS preflight
        if (request.method === 'OPTIONS') {
            return new Response(null, { status: 204, headers: corsHeaders() });
        }
        if (request.method !== 'POST') {
            return jsonResponse({ error: 'Only POST allowed', version: WORKER_VERSION }, 405);
        }

        // 1. Xác thực bảo mật webhook
        const webhookToken = extractToken(request);
        if (webhookToken !== env.WEBHOOK_SECRET) {
            return jsonResponse({ error: 'Unauthorized', version: WORKER_VERSION, hint: 'Token mismatch' }, 401);
        }

        try {
            const data = await request.json();

            let saEmail = 'unknown';
            let saProjectId = 'unknown';
            try {
                const sa = JSON.parse(env.FIREBASE_SERVICE_ACCOUNT || '{}');
                saEmail = sa.client_email || 'missing_email';
                saProjectId = sa.project_id || 'missing_project_id';
            } catch (jsonErr) {
                return jsonResponse({
                    status: 'error',
                    step: 'parse_service_account',
                    message: jsonErr.message,
                    version: WORKER_VERSION
                }, 500);
            }

            const content = (data.content || '').toUpperCase();
            const transferAmount = Number(data.transferAmount || 0);
            const transactionId = String(data.id);

            // 2. Tìm mã đơn hàng QKxxxx trong nội dung chuyển khoản
            const orderMatch = content.match(/QK([A-Z0-9]{10,20})/);
            if (!orderMatch) {
                return jsonResponse({ status: 'skipped', reason: 'No QK order code found', version: WORKER_VERSION }, 200);
            }
            const orderCode = `QK${orderMatch[1]}`;

            // 3. Lấy Google Access Token từ Service Account
            let accessToken;
            try {
                accessToken = await getGoogleAccessToken(env.FIREBASE_SERVICE_ACCOUNT);
            } catch (oauthErr) {
                return jsonResponse({
                    status: 'error',
                    step: 'google_oauth',
                    message: oauthErr.message,
                    serviceAccountEmail: saEmail,
                    serviceAccountProjectId: saProjectId,
                    version: WORKER_VERSION
                }, 500);
            }

            if (!accessToken) {
                return jsonResponse({
                    status: 'error',
                    step: 'google_oauth',
                    message: 'Access token is null/empty after OAuth exchange',
                    serviceAccountEmail: saEmail,
                    serviceAccountProjectId: saProjectId,
                    version: WORKER_VERSION
                }, 500);
            }

            // 4. Tìm đơn hàng creditRequest trong Firestore
            const requestInfo = await findCreditRequestByOrderCode(accessToken, orderCode);

            if (!requestInfo.found) {
                return jsonResponse({
                    status: 'not_found',
                    orderCode,
                    primaryStatus: requestInfo.statusPrimary,
                    fallbackStatus: requestInfo.statusFallback,
                    primaryBody: requestInfo.bodyPrimary,
                    fallbackBody: requestInfo.bodyFallback,
                    serviceAccountEmail: saEmail,
                    serviceAccountProjectId: saProjectId,
                    version: WORKER_VERSION
                }, 200);
            }

            const { userId, credits, status, docPath, appIdFound } = requestInfo;

            if (status === 'approved') {
                return jsonResponse({ status: 'already_approved', orderCode, version: WORKER_VERSION }, 200);
            }

            // 5. Cập nhật Firestore: cộng credit, ghi log, đánh dấu approved
            await executeFirestoreBillingTransaction(accessToken, userId, credits, transactionId, orderCode, transferAmount, docPath, appIdFound);

            return jsonResponse({
                status: 'success',
                message: 'Credits updated via Webhook!',
                orderCode,
                userId,
                credits,
                version: WORKER_VERSION
            }, 200);

        } catch (e) {
            return jsonResponse({ status: 'error', message: e.message, stack: e.stack?.substring(0, 300), version: WORKER_VERSION }, 500);
        }
    }
};

// ==================== HELPER: Response ====================
function jsonResponse(obj, status = 200) {
    return new Response(JSON.stringify(obj, null, 2), {
        status,
        headers: { 'Content-Type': 'application/json', ...corsHeaders() }
    });
}
function corsHeaders() {
    return { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-api-key' };
}

// ==================== HELPER: Extract Token ====================
function extractToken(request) {
    let token = request.headers.get('x-api-key');
    if (token) return token;
    const auth = request.headers.get('Authorization') || '';
    if (auth.toLowerCase().startsWith('apikey ')) return auth.substring(7).trim();
    if (auth.startsWith('Bearer ')) return auth.substring(7).trim();
    return auth.trim();
}

// ==================== Google OAuth2 (Service Account JWT) ====================
async function getGoogleAccessToken(serviceAccountJson) {
    const sa = JSON.parse(serviceAccountJson);
    const b64url = (s) => btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');

    const header = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
    const now = Math.floor(Date.now() / 1000);
    const claimSet = {
        iss: sa.client_email,
        scope: 'https://www.googleapis.com/auth/cloud-platform',
        aud: 'https://oauth2.googleapis.com/token',
        iat: now,
        exp: now + 3600
    };
    const payload = b64url(JSON.stringify(claimSet));

    // RS256 sign
    const cryptoKey = await crypto.subtle.importKey(
        'pkcs8',
        str2ab(pem2der(sa.private_key)),
        { name: 'RSASSA-PKCS1-v1_5', hash: { name: 'SHA-256' } },
        false,
        ['sign']
    );
    const sigBuf = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', cryptoKey, new TextEncoder().encode(`${header}.${payload}`));
    const signature = btoa(String.fromCharCode(...new Uint8Array(sigBuf)))
        .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');

    const res = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
            assertion: `${header}.${payload}.${signature}`
        })
    });

    const resBody = await res.text();
    if (!res.ok) {
        throw new Error(`OAuth token exchange failed (${res.status}): ${resBody.substring(0, 500)}`);
    }

    const tokenData = JSON.parse(resBody);
    if (!tokenData.access_token) {
        throw new Error(`OAuth response missing access_token: ${resBody.substring(0, 500)}`);
    }
    return tokenData.access_token;
}

// ==================== Find CreditRequest ====================
async function findCreditRequestByOrderCode(token, orderCode) {
    const encodedAppId = encodeURIComponent(APP_ID);

    // Try primary path
    const urlPrimary = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/artifacts/${encodedAppId}/creditRequests/${orderCode}`;
    const resPrimary = await fetch(urlPrimary, { headers: { Authorization: `Bearer ${token}` } });
    const bodyPrimary = await resPrimary.text();

    if (resPrimary.ok) {
        const parsed = parseDocResult(bodyPrimary, APP_ID);
        if (parsed) return parsed;
    }

    // Try fallback path
    const urlFallback = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/artifacts/quizki-app/creditRequests/${orderCode}`;
    const resFallback = await fetch(urlFallback, { headers: { Authorization: `Bearer ${token}` } });
    const bodyFallback = await resFallback.text();

    if (resFallback.ok) {
        const parsed = parseDocResult(bodyFallback, 'quizki-app');
        if (parsed) return parsed;
    }

    return {
        found: false,
        statusPrimary: resPrimary.status,
        statusFallback: resFallback.status,
        bodyPrimary: bodyPrimary.substring(0, 200),
        bodyFallback: bodyFallback.substring(0, 200)
    };
}

function parseDocResult(bodyText, appId) {
    try {
        const doc = JSON.parse(bodyText);
        const f = doc.fields;
        if (!f) return null;
        return {
            found: true,
            docPath: doc.name,
            userId: f.userId?.stringValue,
            credits: f.credits?.integerValue ? Number(f.credits.integerValue) : f.credits?.stringValue,
            status: f.status?.stringValue,
            appIdFound: appId
        };
    } catch { return null; }
}

// ==================== Execute Billing ====================
async function executeFirestoreBillingTransaction(token, userId, credits, transactionId, orderCode, amount, requestDocPath, appIdFound) {
    const encodedAppId = encodeURIComponent(appIdFound || APP_ID);
    const baseUrl = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents`;

    // 1. Anti-replay: ghi processedTransactions
    await fetch(`${baseUrl}/artifacts/${encodedAppId}/processedTransactions/${transactionId}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
            fields: {
                transactionId: { stringValue: transactionId },
                orderCode: { stringValue: orderCode },
                userId: { stringValue: userId },
                amount: { integerValue: amount },
                processedAt: { stringValue: new Date().toISOString() }
            }
        })
    });

    // 2. Đọc profile hiện tại
    const profileUrl = `${baseUrl}/artifacts/${encodedAppId}/users/${userId}/settings/profile`;
    const profileRes = await fetch(profileUrl, { headers: { Authorization: `Bearer ${token}` } });
    let currentCredits = 0;
    let unlockedPackages = [];

    if (profileRes.ok) {
        const profile = await profileRes.json();
        currentCredits = Number(profile.fields?.aiCreditsRemaining?.integerValue || 0);
        unlockedPackages = profile.fields?.unlockedSpecializedPackages?.arrayValue?.values?.map(v => v.stringValue) || [];
    }

    // 3. Tính toán update
    let updateFields = { fields: {} };

    if (typeof credits === 'string' && credits.startsWith('specialized:')) {
        const pkgId = credits.replace('specialized:', '');
        unlockedPackages.push(pkgId);
        if (pkgId.startsWith('premium')) {
            // Thêm các gói liên quan
            ['premium', 'vocab_zen', 'grammar_zen', 'kanji_zen', 'jlpt_prep'].forEach(p => {
                if (!unlockedPackages.includes(p)) unlockedPackages.push(p);
            });
            const bonus = pkgId === 'premium_3y' ? 6000 : (pkgId === 'premium_1y' ? 2000 : 200);
            const durationMs = pkgId === 'premium_3y' ? 3 * 365 * 24 * 3600 * 1000 : (pkgId === 'premium_1y' ? 365 * 24 * 3600 * 1000 : 30 * 24 * 3600 * 1000);
            updateFields.fields.aiCreditsRemaining = { integerValue: currentCredits + bonus };
            updateFields.fields.isPremiumUnlocked = { booleanValue: true };
            updateFields.fields.premiumExpiresAt = { integerValue: Date.now() + durationMs };
        }
        updateFields.fields.unlockedSpecializedPackages = {
            arrayValue: { values: Array.from(new Set(unlockedPackages)).map(p => ({ stringValue: p })) }
        };
    } else {
        updateFields.fields.aiCreditsRemaining = { integerValue: currentCredits + Number(credits) };
    }

    await fetch(profileUrl + '?updateMask.fieldPaths=aiCreditsRemaining&updateMask.fieldPaths=unlockedSpecializedPackages&updateMask.fieldPaths=isPremiumUnlocked&updateMask.fieldPaths=premiumExpiresAt', {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(updateFields)
    });

    // 4. Đánh dấu creditRequest approved
    await fetch(`https://firestore.googleapis.com/v1/${requestDocPath}?updateMask.fieldPaths=status&updateMask.fieldPaths=processedAt&updateMask.fieldPaths=processedBy`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
            fields: {
                status: { stringValue: 'approved' },
                processedAt: { stringValue: new Date().toISOString() },
                processedBy: { stringValue: 'sepay_webhook' }
            }
        })
    });
}

// ==================== Crypto Helpers ====================
function pem2der(pem) {
    return atob(pem.replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\n|\r/g, ''));
}
function str2ab(str) {
    const buf = new ArrayBuffer(str.length);
    const view = new Uint8Array(buf);
    for (let i = 0; i < str.length; i++) view[i] = str.charCodeAt(i);
    return buf;
}
