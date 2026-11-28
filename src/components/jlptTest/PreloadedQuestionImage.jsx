import React, { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { isImagePreloaded, preloadImageUrl } from '../../utils/jlptMediaPreloader';

/**
 * Renders question illustrations cleanly: renders immediately without shimmer when
 * preloaded in browser memory, or shows a compact loading indicator while downloading.
 */
const PreloadedQuestionImage = ({ src, alt = 'Hình ảnh câu hỏi', className = 'max-h-80 object-contain rounded-xl' }) => {
    const cleanSrc = String(src || '').trim();
    const [loadedSrc, setLoadedSrc] = useState(() => (isImagePreloaded(cleanSrc) ? cleanSrc : ''));

    const isReady = Boolean(cleanSrc) && (isImagePreloaded(cleanSrc) || loadedSrc === cleanSrc);

    useEffect(() => {
        if (!cleanSrc || isImagePreloaded(cleanSrc)) return undefined;
        let cancelled = false;
        preloadImageUrl(cleanSrc).then((ok) => {
            if (!cancelled && ok) setLoadedSrc(cleanSrc);
        });
        return () => { cancelled = true; };
    }, [cleanSrc]);

    if (!cleanSrc) return null;

    return (
        <div className="mb-4 max-w-xl mx-auto rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-white p-2 flex items-center justify-center relative min-h-[112px]">
            {!isReady && (
                <div className="absolute inset-0 flex items-center justify-center bg-slate-100/80 dark:bg-slate-800/70 text-slate-500 dark:text-slate-300 text-xs font-bold gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-emerald-500" />
                    <span>Đang tải hình...</span>
                </div>
            )}
            <img
                src={cleanSrc}
                alt={alt}
                loading="eager"
                decoding={isReady ? 'sync' : 'async'}
                fetchPriority="high"
                onLoad={() => setLoadedSrc(cleanSrc)}
                className={`${className} transition-opacity duration-150 ${isReady ? 'opacity-100' : 'opacity-0'}`}
            />
        </div>
    );
};

export default PreloadedQuestionImage;
