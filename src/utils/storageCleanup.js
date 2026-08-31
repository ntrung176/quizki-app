/**
 * Tự động dọn dẹp các cache dung lượng lớn lưu nhầm vào localStorage
 * Tránh lỗi DOMException: QuotaExceededError gây crash Firestore
 */
export const runStorageSanityCleanup = () => {
    if (typeof window === 'undefined' || !window.localStorage) return;

    try {
        // Danh sách các key cache lớn cần loại bỏ khỏi localStorage
        const bloatedKeys = [
            'quizki_cached_vocab_list',
            'quizki_vocab_last_backup',
            'quizki_cached_jlpt_tests',
            'quizki_cached_jlpt_tests_v2',
        ];

        bloatedKeys.forEach((key) => {
            if (localStorage.getItem(key)) {
                console.log(`🧹 [Storage Cleanup] Removing bloated key: ${key}`);
                localStorage.removeItem(key);
            }
        });

        // Kiểm tra và dọn bớt nếu dung lượng localStorage bị đầy (> 3.5MB)
        let totalLength = 0;
        const keysToRemove = [];

        for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (!k) continue;
            const val = localStorage.getItem(k) || '';
            const size = k.length + val.length;
            totalLength += size;

            // Xóa các key tạm nếu size đơn lẻ quá lớn (> 200KB) trừ settings/auth
            if (
                size > 200000 &&
                !k.includes('token') &&
                !k.includes('auth') &&
                !k.includes('settings') &&
                !k.includes('user')
            ) {
                keysToRemove.push(k);
            }
        }

        keysToRemove.forEach((k) => {
            console.warn(`🧹 [Storage Cleanup] Removing oversized cache item: ${k}`);
            localStorage.removeItem(k);
        });

        // Nếu jotoba cache quá lớn, giới hạn lại
        const jotobaRaw = localStorage.getItem('quizki_jotoba_cache');
        if (jotobaRaw && jotobaRaw.length > 100000) {
            try {
                const parsed = JSON.parse(jotobaRaw);
                const entries = Object.entries(parsed);
                if (entries.length > 150) {
                    const trimmed = Object.fromEntries(entries.slice(-150));
                    localStorage.setItem('quizki_jotoba_cache', JSON.stringify(trimmed));
                }
            } catch (_) {
                localStorage.removeItem('quizki_jotoba_cache');
            }
        }
    } catch (e) {
        console.warn('Storage cleanup warning:', e);
    }
};

/**
 * Hàm ghi localStorage an toàn có try/catch QuotaExceeded
 */
export const safeSetLocalStorage = (key, value) => {
    try {
        localStorage.setItem(key, value);
    } catch (e) {
        if (e.name === 'QuotaExceededError' || e.code === 22 || e.code === 1014) {
            console.warn(`⚠️ [Storage Quota Exceeded] Cleaning cache and retrying for key: ${key}`);
            runStorageSanityCleanup();
            try {
                localStorage.setItem(key, value);
            } catch (_) {
                console.error(`❌ Cannot write key ${key} to localStorage even after cleanup`);
            }
        }
    }
};
