// IndexedDB Video Storage Utility for QuizKi Kaiwa Video Player
// Stores large video files/blobs locally in IndexedDB to avoid filling localStorage quota

const DB_NAME = 'quizki_kaiwa_videos_db';
const DB_VERSION = 1;
const STORE_NAME = 'videos';

let dbInstance = null;
const blobUrlCache = new Map();

// Initialize or get IndexedDB instance
export const getKaiwaVideoDb = () => {
    return new Promise((resolve, reject) => {
        if (dbInstance) {
            return resolve(dbInstance);
        }

        if (typeof window === 'undefined' || !window.indexedDB) {
            console.warn('IndexedDB is not supported in this environment');
            return resolve(null);
        }

        const request = window.indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME, { keyPath: 'id' });
            }
        };

        request.onsuccess = (event) => {
            dbInstance = event.target.result;
            resolve(dbInstance);
        };

        request.onerror = (event) => {
            console.error('Error opening IndexedDB for Kaiwa Videos:', event.target.error);
            resolve(null);
        };
    });
};

/**
 * Save a video file/blob to IndexedDB
 * @param {string} videoId 
 * @param {Blob|File} fileOrBlob 
 * @param {Object} metadata (optional)
 */
export const saveVideoBlobToIndexedDb = async (videoId, fileOrBlob, metadata = {}) => {
    try {
        const db = await getKaiwaVideoDb();
        if (!db) return false;

        // Cache blob URL immediately
        if (blobUrlCache.has(videoId)) {
            try { URL.revokeObjectURL(blobUrlCache.get(videoId)); } catch (e) {}
        }
        const newObjUrl = URL.createObjectURL(fileOrBlob);
        blobUrlCache.set(videoId, newObjUrl);

        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, 'readwrite');
            const store = tx.objectStore(STORE_NAME);

            const record = {
                id: videoId,
                blob: fileOrBlob,
                name: fileOrBlob.name || `${videoId}.mp4`,
                type: fileOrBlob.type || 'video/mp4',
                size: fileOrBlob.size || 0,
                updatedAt: Date.now(),
                ...metadata
            };

            const request = store.put(record);

            request.onsuccess = () => resolve(true);
            request.onerror = (e) => {
                console.warn('Failed to store video in IndexedDB:', e.target.error);
                resolve(false);
            };
        });
    } catch (err) {
        console.warn('IndexedDB saveVideoBlobToIndexedDb error:', err);
        return false;
    }
};

/**
 * Retrieve a video file/blob from IndexedDB
 * @param {string} videoId 
 * @returns {Promise<Blob|File|null>}
 */
export const getVideoBlobFromIndexedDb = async (videoId) => {
    try {
        const db = await getKaiwaVideoDb();
        if (!db) return null;

        return new Promise((resolve) => {
            const tx = db.transaction(STORE_NAME, 'readonly');
            const store = tx.objectStore(STORE_NAME);
            const request = store.get(videoId);

            request.onsuccess = (event) => {
                const result = event.target.result;
                if (result && result.blob) {
                    resolve(result.blob);
                } else {
                    resolve(null);
                }
            };

            request.onerror = () => resolve(null);
        });
    } catch (err) {
        console.warn('IndexedDB getVideoBlobFromIndexedDb error:', err);
        return null;
    }
};

/**
 * Delete a video file from IndexedDB
 * @param {string} videoId 
 */
export const deleteVideoBlobFromIndexedDb = async (videoId) => {
    try {
        if (blobUrlCache.has(videoId)) {
            try { URL.revokeObjectURL(blobUrlCache.get(videoId)); } catch (e) {}
            blobUrlCache.delete(videoId);
        }

        const db = await getKaiwaVideoDb();
        if (!db) return;

        return new Promise((resolve) => {
            const tx = db.transaction(STORE_NAME, 'readwrite');
            const store = tx.objectStore(STORE_NAME);
            const request = store.delete(videoId);

            request.onsuccess = () => resolve(true);
            request.onerror = () => resolve(false);
        });
    } catch (err) {
        console.warn('IndexedDB deleteVideoBlobFromIndexedDb error:', err);
    }
};

/**
 * Resolve an accessible URL for a video object
 * Checks for direct URL -> cached blob URL -> IndexedDB blob URL -> fallback
 * @param {Object} video 
 * @returns {Promise<string|null>}
 */
export const resolveVideoSourceUrl = async (video) => {
    if (!video) return null;

    // 1. In-memory cache for this video ID
    if (video.id && blobUrlCache.has(video.id)) {
        return blobUrlCache.get(video.id);
    }

    // 2. Direct web URL or existing Blob URL
    if (video.videoUrl && (video.videoUrl.startsWith('http') || video.videoUrl.startsWith('blob:'))) {
        return video.videoUrl;
    }

    if (video.fileUrl && (video.fileUrl.startsWith('http') || video.fileUrl.startsWith('blob:'))) {
        return video.fileUrl;
    }

    // 3. Try loading from IndexedDB
    if (video.id) {
        const blob = await getVideoBlobFromIndexedDb(video.id);
        if (blob) {
            const url = URL.createObjectURL(blob);
            blobUrlCache.set(video.id, url);
            return url;
        }
    }

    return video.videoUrl || video.fileUrl || null;
};
