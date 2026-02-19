// Pixabay Image Search API
// Free API with unlimited requests, CC0 license images
// Docs: https://pixabay.com/api/docs/

// Đọc API key từ biến môi trường (VITE_ prefix cho Vite)
const PIXABAY_API_KEY = import.meta.env.VITE_PIXABAY_API_KEY || '';

/**
 * Tách phần Kanji/từ chính từ chuỗi có furigana
 * Ví dụ: "食べる（たべる）" => "食べる"
 * @param {string} text 
 * @returns {string}
 */
const extractMainWord = (text) => {
    if (!text) return '';
    return text.split('（')[0].split('(')[0].trim();
};

/**
 * Chuẩn bị từ khóa tìm kiếm
 * Pixabay hỗ trợ tiếng Nhật trực tiếp, không cần dịch
 * @param {string} query - Từ khóa gốc (tiếng Nhật, Anh, Việt đều okay)
 * @returns {string} Từ khóa đã xử lý
 */
export const prepareSearchQuery = (query) => {
    if (!query || !query.trim()) return '';
    return extractMainWord(query);
};

/**
 * Search for images on Pixabay
 * Pixabay hỗ trợ đa ngôn ngữ bao gồm tiếng Nhật - tìm trực tiếp giống trên web
 * @param {string} query - Search query (hỗ trợ tiếng Nhật, Anh, Việt...)
 * @param {Object} options - Search options
 * @param {number} options.perPage - Results per page (3-200, default 12)
 * @param {number} options.page - Page number (default 1)
 * @param {string} options.imageType - 'all', 'photo', 'illustration', 'vector'
 * @param {string} options.orientation - 'all', 'horizontal', 'vertical'
 * @param {boolean} options.safesearch - Safe search (default true)
 * @param {string} options.lang - Language code (default 'ja' for Japanese)
 * @returns {Promise<{images: Array, total: number}>}
 */
export const searchImages = async (query, options = {}) => {
    const apiKey = PIXABAY_API_KEY;

    if (!apiKey) {
        throw new Error('Pixabay API key chưa được cấu hình. Vui lòng thêm VITE_PIXABAY_API_KEY vào file .env');
    }

    const params = new URLSearchParams({
        key: apiKey,
        q: query.trim(),
        per_page: options.perPage || 12,
        page: options.page || 1,
        image_type: options.imageType || 'photo',
        orientation: options.orientation || 'all',
        safesearch: options.safesearch !== false ? 'true' : 'false',
        lang: options.lang || 'ja', // Mặc định tiếng Nhật
        min_width: 200,
        min_height: 200,
    });

    try {
        const response = await fetch(`https://pixabay.com/api/?${params.toString()}`);

        if (!response.ok) {
            throw new Error(`Pixabay API error: ${response.status}`);
        }

        const data = await response.json();

        return {
            images: data.hits.map(hit => ({
                id: hit.id,
                previewUrl: hit.previewURL,
                webformatUrl: hit.webformatURL, // 640px wide
                largeImageUrl: hit.largeImageURL,
                thumbnailUrl: hit.previewURL,
                tags: hit.tags,
                user: hit.user,
                pageUrl: hit.pageURL,
                width: hit.imageWidth,
                height: hit.imageHeight,
            })),
            total: data.totalHits,
        };
    } catch (error) {
        console.error('Pixabay search error:', error);
        throw error;
    }
};

/**
 * Download image and convert to base64
 * @param {string} imageUrl - URL of the image to download
 * @param {number} maxWidth - Maximum width (default 300)
 * @param {number} quality - JPEG quality 0-1 (default 0.7)
 * @returns {Promise<string>} Base64 data URL
 */
export const imageUrlToBase64 = async (imageUrl, maxWidth = 300, quality = 0.7) => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';

        img.onload = () => {
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;

            // Scale down if needed
            if (width > maxWidth) {
                height = (maxWidth / width) * height;
                width = maxWidth;
            }

            canvas.width = width;
            canvas.height = height;

            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);

            const base64 = canvas.toDataURL('image/jpeg', quality);
            resolve(base64);
        };

        img.onerror = () => {
            reject(new Error('Failed to load image'));
        };

        img.src = imageUrl;
    });
};

/**
 * Check if Pixabay API key is configured
 * @returns {boolean}
 */
export const isPixabayConfigured = () => {
    return !!PIXABAY_API_KEY;
};
