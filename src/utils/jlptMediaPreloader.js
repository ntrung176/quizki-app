/**
 * Eager image preloader & browser bitmap decode cache for JLPT exams.
 * Keeps persistent Image() references across section/Mondai switches so images
 * already appear decoded on screen the instant a user switches tabs.
 */

const MAX_CACHED_IMAGES = 250;
const preloadedCache = new Map(); // url -> { img, ready, promise }

const evictOldestIfNeeded = () => {
    while (preloadedCache.size >= MAX_CACHED_IMAGES) {
        const oldestKey = preloadedCache.keys().next().value;
        if (!oldestKey) break;
        preloadedCache.delete(oldestKey);
    }
};

export const isImagePreloaded = (url) => {
    const clean = String(url || '').trim();
    if (!clean) return false;
    if (clean.startsWith('data:')) return true;
    const entry = preloadedCache.get(clean);
    return Boolean(entry?.ready || (entry?.img?.complete && entry?.img?.naturalWidth > 0));
};

export const preloadImageUrl = (url) => {
    const clean = String(url || '').trim();
    if (!clean) return Promise.resolve(false);
    if (clean.startsWith('data:')) return Promise.resolve(true);
    if (typeof window === 'undefined' || typeof window.Image === 'undefined') {
        return Promise.resolve(false);
    }

    const existing = preloadedCache.get(clean);
    if (existing) return existing.promise;

    evictOldestIfNeeded();

    const img = new window.Image();
    img.decoding = 'async';

    const entry = { img, ready: false, promise: null };
    entry.promise = new Promise((resolve) => {
        const markReady = async () => {
            try {
                if (typeof img.decode === 'function') {
                    await img.decode();
                }
            } catch {
                // Fallback safely even if decode() rejects on cross-origin or partial codec
            }
            entry.ready = true;
            resolve(true);
        };

        img.onload = () => { markReady(); };
        img.onerror = () => {
            preloadedCache.delete(clean);
            resolve(false);
        };
        img.src = clean;

        if (img.complete && img.naturalWidth > 0) {
            markReady();
        }
    });

    preloadedCache.set(clean, entry);
    return entry.promise;
};

/**
 * Extracts deduplicated image URLs from an exam, prioritizing listening images first.
 */
export const collectTestImageUrls = (test) => {
    if (!test || !Array.isArray(test.sections)) return [];
    const urls = [];
    const seen = new Set();

    const pushUrl = (raw) => {
        const clean = String(raw || '').trim();
        if (!clean || seen.has(clean)) return;
        seen.add(clean);
        urls.push(clean);
    };

    const orderedSections = [...test.sections].sort((a, b) => {
        const aListen = a?.type === 'listening' || /聴解|nghe/i.test(a?.title || '');
        const bListen = b?.type === 'listening' || /聴解|nghe/i.test(b?.title || '');
        return Number(bListen) - Number(aListen);
    });

    orderedSections.forEach((sec) => {
        (sec?.questions || []).forEach((q) => {
            if (q?.imageUrl) pushUrl(q.imageUrl);
            if (Array.isArray(q?.subQuestions)) {
                q.subQuestions.forEach((sq) => {
                    if (sq?.imageUrl) pushUrl(sq.imageUrl);
                });
            }
            if (typeof q?.passage === 'string' && q.passage.includes('<img')) {
                const matches = q.passage.matchAll(/<img[^>]+src=["']([^"']+)["']/gi);
                for (const m of matches) {
                    if (m[1]) pushUrl(m[1]);
                }
            }
        });
    });

    return urls;
};

/**
 * Preloads and pre-decodes all images in a JLPT test with bounded concurrency.
 */
export const preloadTestImages = async (test, { concurrency = 4 } = {}) => {
    const urls = collectTestImageUrls(test);
    if (urls.length === 0) return 0;

    let cursor = 0;
    let loaded = 0;
    const workers = Array.from({ length: Math.min(concurrency, urls.length) }, async () => {
        while (cursor < urls.length) {
            const idx = cursor++;
            const ok = await preloadImageUrl(urls[idx]);
            if (ok) loaded += 1;
        }
    });

    await Promise.all(workers);
    return loaded;
};

/**
 * Compresses large AI-generated PNG data URLs to lightweight WebP (~10x–20x smaller) before storage upload.
 */
export const optimizeImageDataUrlForWeb = (dataUrl, maxDim = 960, quality = 0.86) => new Promise((resolve) => {
    if (!dataUrl || typeof window === 'undefined' || !dataUrl.startsWith('data:image/')) {
        resolve(dataUrl);
        return;
    }
    const img = new window.Image();
    img.onload = () => {
        try {
            const scale = Math.min(1, maxDim / Math.max(img.width || 1, img.height || 1));
            const canvas = document.createElement('canvas');
            canvas.width = Math.max(1, Math.round(img.width * scale));
            canvas.height = Math.max(1, Math.round(img.height * scale));
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

            const webp = canvas.toDataURL('image/webp', quality);
            if (webp.startsWith('data:image/webp') && webp.length < dataUrl.length) {
                resolve(webp);
                return;
            }
            const jpeg = canvas.toDataURL('image/jpeg', quality);
            resolve(jpeg.length < dataUrl.length ? jpeg : dataUrl);
        } catch {
            resolve(dataUrl);
        }
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
});
