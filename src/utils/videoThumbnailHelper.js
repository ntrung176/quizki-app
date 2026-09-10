// Video Thumbnail & Metadata Extraction Helper using HTML5 Canvas

/**
 * Extract a high quality thumbnail and duration from a video file or video URL
 * @param {File|Blob|string} fileOrUrl 
 * @param {number} seekTimeSec - Timestamp in seconds to snapshot (default 1.0s)
 * @returns {Promise<{thumbnail: string, duration: number, width: number, height: number}>}
 */
export const extractVideoThumbnailAndMetadata = (fileOrUrl, seekTimeSec = 1.0) => {
    return new Promise((resolve) => {
        if (!fileOrUrl) {
            return resolve({ thumbnail: '', duration: 0, width: 0, height: 0 });
        }

        const video = document.createElement('video');
        video.crossOrigin = 'anonymous';
        video.muted = true;
        video.playsInline = true;
        video.preload = 'metadata';

        let isCreatedObjectUrl = false;
        let url = '';

        if (typeof fileOrUrl === 'string') {
            url = fileOrUrl;
        } else if (fileOrUrl instanceof Blob || fileOrUrl instanceof File) {
            url = URL.createObjectURL(fileOrUrl);
            isCreatedObjectUrl = true;
        } else {
            return resolve({ thumbnail: '', duration: 0, width: 0, height: 0 });
        }

        video.src = url;

        const cleanup = () => {
            if (isCreatedObjectUrl && url) {
                try {
                    URL.revokeObjectURL(url);
                } catch (e) {}
            }
        };

        // Safety timeout in case video fails to fire events
        const timeoutId = setTimeout(() => {
            cleanup();
            resolve({
                thumbnail: '',
                duration: video.duration || 0,
                width: video.videoWidth || 0,
                height: video.videoHeight || 0
            });
        }, 8000);

        video.onloadedmetadata = () => {
            const dur = video.duration || 0;
            // Seek to appropriate frame (1s, or 10% if video is very short)
            const targetTime = dur > 1 ? Math.min(seekTimeSec, dur / 2) : 0.1;
            video.currentTime = targetTime;
        };

        video.onseeked = () => {
            clearTimeout(timeoutId);
            try {
                const width = video.videoWidth || 640;
                const height = video.videoHeight || 360;

                const canvas = document.createElement('canvas');
                // Limit canvas max resolution for thumbnail efficiency (e.g. max 720p width)
                const maxDim = 720;
                let targetW = width;
                let targetH = height;
                if (targetW > maxDim) {
                    targetH = Math.round((targetH * maxDim) / targetW);
                    targetW = maxDim;
                }

                canvas.width = targetW;
                canvas.height = targetH;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(video, 0, 0, targetW, targetH);

                const dataUrl = canvas.toDataURL('image/jpeg', 0.85);

                cleanup();
                resolve({
                    thumbnail: dataUrl,
                    duration: video.duration || 0,
                    width,
                    height
                });
            } catch (err) {
                console.warn('Canvas video snapshot error (possibly CORS or format):', err);
                cleanup();
                resolve({
                    thumbnail: '',
                    duration: video.duration || 0,
                    width: video.videoWidth || 0,
                    height: video.videoHeight || 0
                });
            }
        };

        video.onerror = (e) => {
            clearTimeout(timeoutId);
            console.warn('Error loading video element for thumbnail:', e);
            cleanup();
            resolve({ thumbnail: '', duration: 0, width: 0, height: 0 });
        };
    });
};
