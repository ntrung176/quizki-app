// pdfExtractorService.js — Client-side PDF Text & Image Extractor
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

// Configure local worker src bundled by Vite (prevents adblock / ERR_BLOCKED_BY_CLIENT)
if (typeof window !== 'undefined' && !pdfjsLib.GlobalWorkerOptions.workerSrc) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;
}

/**
 * Load PDF Document from File, Blob, or ArrayBuffer
 */
export const loadPdfDocument = async (fileOrBuffer) => {
    let arrayBuffer;
    if (fileOrBuffer instanceof ArrayBuffer) {
        arrayBuffer = fileOrBuffer;
    } else if (fileOrBuffer instanceof Blob || fileOrBuffer instanceof File) {
        arrayBuffer = await fileOrBuffer.arrayBuffer();
    } else {
        throw new Error('Định dạng tài liệu PDF không hợp lệ.');
    }

    const loadingTask = pdfjsLib.getDocument({
        data: arrayBuffer,
        cMapPacked: true,
    });

    return await loadingTask.promise;
};

/**
 * Get PDF Metadata (total pages, title, etc.)
 */
export const getPdfMetadata = async (fileOrBuffer) => {
    const pdf = await loadPdfDocument(fileOrBuffer);
    const metadata = await pdf.getMetadata().catch(() => ({}));
    return {
        numPages: pdf.numPages,
        title: metadata?.info?.Title || '',
        author: metadata?.info?.Author || '',
        producer: metadata?.info?.Producer || '',
    };
};

/**
 * Parse page range string (e.g. "1-10", "1, 3, 5-8", "ALL")
 */
export const parsePageRange = (rangeStr, totalPages) => {
    if (!rangeStr || rangeStr.trim().toUpperCase() === 'ALL') {
        return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    const pages = new Set();
    const parts = rangeStr.split(/[,;\s]+/).filter(Boolean);

    for (const part of parts) {
        if (part.includes('-')) {
            const [startStr, endStr] = part.split('-');
            const start = Math.max(1, parseInt(startStr, 10) || 1);
            const end = Math.min(totalPages, parseInt(endStr, 10) || totalPages);
            for (let p = start; p <= end; p++) {
                pages.add(p);
            }
        } else {
            const p = parseInt(part, 10);
            if (p >= 1 && p <= totalPages) {
                pages.add(p);
            }
        }
    }

    const sortedPages = Array.from(pages).sort((a, b) => a - b);
    return sortedPages.length > 0 ? sortedPages : Array.from({ length: totalPages }, (_, i) => i + 1);
};

/**
 * Extract plain text from PDF pages
 */
export const extractPdfText = async (fileOrBuffer, {
    pageRange = 'ALL',
    onProgress = () => {},
    signal = null
} = {}) => {
    const pdf = await loadPdfDocument(fileOrBuffer);
    const totalPages = pdf.numPages;
    const targetPages = parsePageRange(pageRange, totalPages);

    const extractedPages = [];
    let fullText = '';

    for (let i = 0; i < targetPages.length; i++) {
        if (signal?.aborted) {
            throw new Error('Tiến trình trích xuất PDF đã bị hủy bởi người dùng.');
        }

        const pageNum = targetPages[i];
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();

        // Sort items by vertical position (top to bottom) then horizontal position (left to right)
        const items = textContent.items || [];
        items.sort((a, b) => {
            const yDiff = b.transform[5] - a.transform[5];
            if (Math.abs(yDiff) > 4) return yDiff;
            return a.transform[4] - b.transform[4];
        });

        let pageStr = '';
        let lastY = null;

        for (const item of items) {
            const str = item.str || '';
            const y = item.transform[5];

            if (lastY !== null && Math.abs(lastY - y) > 8) {
                pageStr += '\n';
            } else if (lastY !== null && pageStr.length > 0 && !pageStr.endsWith(' ') && !pageStr.endsWith('\n')) {
                pageStr += ' ';
            }

            pageStr += str;
            lastY = y;
        }

        const cleanPageText = pageStr.trim();
        extractedPages.push({
            pageNumber: pageNum,
            text: cleanPageText,
            charCount: cleanPageText.length
        });

        fullText += `--- [TRANG ${pageNum}] ---\n${cleanPageText}\n\n`;

        onProgress({
            current: i + 1,
            total: targetPages.length,
            percent: Math.round(((i + 1) / targetPages.length) * 100),
            currentPageNumber: pageNum,
            totalPages: totalPages,
            totalChars: fullText.length
        });
    }

    return {
        totalPages,
        pageCount: targetPages.length,
        pages: extractedPages,
        fullText: fullText.trim()
    };
};

/**
 * Render selected PDF pages to base64 JPEG images (for scanned/visual pages)
 */
export const extractPdfPageImages = async (fileOrBuffer, {
    pageRange = '1-5',
    scale = 1.5,
    maxPages = 10,
    onProgress = () => {},
    signal = null
} = {}) => {
    const pdf = await loadPdfDocument(fileOrBuffer);
    const totalPages = pdf.numPages;
    const targetPages = parsePageRange(pageRange, totalPages).slice(0, maxPages);

    const images = [];

    for (let i = 0; i < targetPages.length; i++) {
        if (signal?.aborted) {
            throw new Error('Tiến trình trích xuất hình ảnh đã bị hủy.');
        }

        const pageNum = targetPages[i];
        const page = await pdf.getPage(pageNum);
        const viewport = page.getViewport({ scale });

        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        await page.render({
            canvasContext: context,
            viewport: viewport
        }).promise;

        const base64 = canvas.toDataURL('image/jpeg', 0.85);
        images.push({
            pageNumber: pageNum,
            base64: base64
        });

        onProgress({
            current: i + 1,
            total: targetPages.length,
            percent: Math.round(((i + 1) / targetPages.length) * 100),
            currentPageNumber: pageNum
        });
    }

    return images;
};

/**
 * Chunk full text into logical slices (by page boundaries or max character limit)
 */
export const chunkPdfPages = (pages, maxCharsPerChunk = 6000) => {
    if (!Array.isArray(pages) || pages.length === 0) return [];

    const chunks = [];
    let currentChunkText = '';
    let currentChunkPages = [];

    for (const page of pages) {
        const pageHeader = `--- [TRANG ${page.pageNumber}] ---\n`;
        const candidateLength = currentChunkText.length + pageHeader.length + page.text.length;

        if (candidateLength > maxCharsPerChunk && currentChunkText.length > 0) {
            chunks.push({
                chunkIndex: chunks.length + 1,
                pages: [...currentChunkPages],
                text: currentChunkText.trim()
            });
            currentChunkText = '';
            currentChunkPages = [];
        }

        currentChunkText += `${pageHeader}${page.text}\n\n`;
        currentChunkPages.push(page.pageNumber);
    }

    if (currentChunkText.trim().length > 0) {
        chunks.push({
            chunkIndex: chunks.length + 1,
            pages: [...currentChunkPages],
            text: currentChunkText.trim()
        });
    }

    return chunks;
};
