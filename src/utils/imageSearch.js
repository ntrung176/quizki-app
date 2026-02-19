// Pixabay Image Search API
// Free API with unlimited requests, CC0 license images
// Docs: https://pixabay.com/api/docs/

const PIXABAY_API_KEY = ''; // Users need to get their own key from https://pixabay.com/api/docs/

/**
 * Search for images on Pixabay
 * @param {string} query - Search query (English recommended for best results)
 * @param {Object} options - Search options
 * @param {number} options.perPage - Results per page (3-200, default 20)
 * @param {number} options.page - Page number (default 1)
 * @param {string} options.imageType - 'all', 'photo', 'illustration', 'vector'
 * @param {string} options.orientation - 'all', 'horizontal', 'vertical'
 * @param {boolean} options.safesearch - Safe search (default true)
 * @returns {Promise<{images: Array, total: number}>}
 */
export const searchImages = async (query, options = {}) => {
    const apiKey = PIXABAY_API_KEY || localStorage.getItem('pixabay_api_key') || '';

    if (!apiKey) {
        throw new Error('Pixabay API key is required. Get one at https://pixabay.com/api/docs/');
    }

    const params = new URLSearchParams({
        key: apiKey,
        q: encodeURIComponent(query),
        per_page: options.perPage || 12,
        page: options.page || 1,
        image_type: options.imageType || 'photo',
        orientation: options.orientation || 'all',
        safesearch: options.safesearch !== false ? 'true' : 'false',
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
    return !!(PIXABAY_API_KEY || localStorage.getItem('pixabay_api_key'));
};

/**
 * Set Pixabay API key in localStorage
 * @param {string} key
 */
export const setPixabayApiKey = (key) => {
    localStorage.setItem('pixabay_api_key', key);
};

/**
 * Get Pixabay API key
 * @returns {string}
 */
export const getPixabayApiKey = () => {
    return PIXABAY_API_KEY || localStorage.getItem('pixabay_api_key') || '';
};
