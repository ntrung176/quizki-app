/**
 * Tự động dọn dẹp các cache dung lượng lớn lưu nhầm vào localStorage
 * Tránh lỗi DOMException: QuotaExceededError gây crash Firestore
 */
export const runStorageSanityCleanup = (force = false) => {
    if (typeof window === 'undefined' || !window.localStorage) return;

    try {
        // 1. Danh sách các key cache lớn BẮT BUỘC loại bỏ ngay lập tức
        const bloatedKeys = [
            'quizki_cached_vocab_list',
            'quizki_vocab_last_backup',
            'quizki_cached_jlpt_tests',
            'quizki_cached_jlpt_tests_v2',
            'quizki_kaiwa_videos_cache',
            'quizki_cached_leaderboard',
            'quizki_cached_kanji_list'
        ];

        bloatedKeys.forEach((key) => {
            if (localStorage.getItem(key)) {
                console.log(`🧹 [Storage Cleanup] Removing bloated key: ${key}`);
                localStorage.removeItem(key);
            }
        });

        // 2. Tính toán tổng dung lượng và quét từng key
        let totalLength = 0;
        const items = [];

        for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (!k) continue;
            const val = localStorage.getItem(k) || '';
            const size = k.length + val.length;
            totalLength += size;
            items.push({ key: k, size });
        }

        // Xóa các key tạm đơn lẻ quá lớn (> 120KB) nếu không phải auth/settings cốt lõi
        items.forEach(({ key, size }) => {
            const isProtected = 
                key.startsWith('firebase:authUser') ||
                key.startsWith('quizki_pending_') ||
                key.includes('token') ||
                key === 'quizki-settings' ||
                key === 'darkMode';

            if (!isProtected && size > 120000) {
                console.warn(`🧹 [Storage Cleanup] Removing oversized cache item: ${key} (${Math.round(size / 1024)}KB)`);
                localStorage.removeItem(key);
                totalLength -= size;
            }
        });

        // 3. Nếu tổng dung lượng vẫn vượt ngưỡng an toàn (> 1.8MB hoặc force = true)
        // Dọn dẹp các cache phụ trợ để luôn bảo đảm Firestore có ít nhất 3MB trống cho WebStorage tab synchronization
        if (totalLength > 1800000 || force) {
            console.warn(`⚠️ [Storage Cleanup] Storage usage high (${Math.round(totalLength / 1024)}KB). Pruning non-critical caches.`);
            
            for (let i = localStorage.length - 1; i >= 0; i--) {
                const k = localStorage.key(i);
                if (!k || k.startsWith('quizki_pending_')) continue;
                if (
                    k.startsWith('quizki_cached_kanji_') ||
                    k.startsWith('quizki_cached_grammar_') ||
                    k.startsWith('study_progress_') ||
                    k === 'quizki_jotoba_cache' ||
                    k === 'jotoba_cache'
                ) {
                    localStorage.removeItem(k);
                }
            }
        }

        // 4. Nếu Jotoba cache quá lớn, giới hạn lại
        const jotobaRaw = localStorage.getItem('quizki_jotoba_cache');
        if (jotobaRaw && jotobaRaw.length > 60000) {
            try {
                const parsed = JSON.parse(jotobaRaw);
                const entries = Object.entries(parsed);
                if (entries.length > 50) {
                    const trimmed = Object.fromEntries(entries.slice(-50));
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
            runStorageSanityCleanup(true);
            try {
                localStorage.setItem(key, value);
            } catch (retryErr) {
                console.error(`❌ Cannot write key ${key} to localStorage even after cleanup:`, retryErr);
            }
        }
    }
};
