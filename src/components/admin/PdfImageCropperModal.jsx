import React, { useEffect, useRef, useState } from 'react';
import { X, ChevronLeft, ChevronRight, Crop, Check, Loader2, Upload } from 'lucide-react';
import { loadPdfDocument } from '../../services/ai/pdfExtractorService';
import { uploadBase64ImageToStorage } from '../../utils/jlptAudioProcessor';

/**
 * Interactive PDF / Image rectangular cropper modal for extracting
 * JLPT listening illustrations cleanly onto individual questions.
 */
const PdfImageCropperModal = ({
    isOpen,
    onClose,
    pdfFile = null,
    imageFiles = [],
    storagePrefix = 'jlpt_images/custom',
    onCropComplete
}) => {
    const canvasRef = useRef(null);
    const [pdfDoc, setPdfDoc] = useState(null);
    const [totalPages, setTotalPages] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const [rendering, setRendering] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [uploadToStorage, setUploadToStorage] = useState(true);

    // Selection rectangle in canvas display coordinates (0..1 normalized)
    const [dragStart, setDragStart] = useState(null);
    const [cropRect, setCropRect] = useState(null); // { x, y, w, h } normalized 0..1

    useEffect(() => {
        if (!isOpen) return;
        setCropRect(null);
        setCurrentPage(1);

        if (pdfFile) {
            setRendering(true);
            loadPdfDocument(pdfFile)
                .then((doc) => {
                    setPdfDoc(doc);
                    setTotalPages(doc.numPages || 1);
                })
                .catch((err) => {
                    console.error('PdfImageCropper load error:', err);
                    setPdfDoc(null);
                    setTotalPages(imageFiles.length || 0);
                })
                .finally(() => setRendering(false));
        } else {
            setPdfDoc(null);
            setTotalPages(imageFiles.length || 0);
        }
    }, [isOpen, pdfFile, imageFiles]);

    // Render current PDF page or uploaded image to canvas
    useEffect(() => {
        if (!isOpen || !canvasRef.current) return;
        let cancelled = false;

        const renderSurface = async () => {
            const canvas = canvasRef.current;
            const ctx = canvas.getContext('2d');
            setRendering(true);
            setCropRect(null);

            try {
                if (pdfDoc && currentPage >= 1 && currentPage <= pdfDoc.numPages) {
                    const page = await pdfDoc.getPage(currentPage);
                    if (cancelled) return;
                    const viewport = page.getViewport({ scale: 1.75 });
                    canvas.width = viewport.width;
                    canvas.height = viewport.height;
                    await page.render({ canvasContext: ctx, viewport }).promise;
                } else if (imageFiles[currentPage - 1]) {
                    const imgObj = imageFiles[currentPage - 1];
                    const src = typeof imgObj === 'string' ? imgObj : (imgObj.base64 || URL.createObjectURL(imgObj));
                    await new Promise((resolve, reject) => {
                        const img = new Image();
                        img.onload = () => {
                            if (!cancelled) {
                                canvas.width = img.width;
                                canvas.height = img.height;
                                ctx.drawImage(img, 0, 0);
                            }
                            resolve();
                        };
                        img.onerror = reject;
                        img.src = src;
                    });
                }
            } catch (e) {
                console.error('Render crop surface error:', e);
            } finally {
                if (!cancelled) setRendering(false);
            }
        };

        renderSurface();
        return () => { cancelled = true; };
    }, [isOpen, pdfDoc, currentPage, imageFiles]);

    if (!isOpen) return null;

    const getNormalizedCoords = (e) => {
        const canvas = canvasRef.current;
        if (!canvas) return { x: 0, y: 0 };
        const rect = canvas.getBoundingClientRect();
        const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
        return { x, y };
    };

    const handleMouseDown = (e) => {
        const pt = getNormalizedCoords(e);
        setDragStart(pt);
        setCropRect({ x: pt.x, y: pt.y, w: 0, h: 0 });
    };

    const handleMouseMove = (e) => {
        if (!dragStart) return;
        const pt = getNormalizedCoords(e);
        setCropRect({
            x: Math.min(dragStart.x, pt.x),
            y: Math.min(dragStart.y, pt.y),
            w: Math.abs(pt.x - dragStart.x),
            h: Math.abs(pt.y - dragStart.y)
        });
    };

    const handleMouseUp = () => {
        setDragStart(null);
    };

    const handleConfirmCrop = async () => {
        const canvas = canvasRef.current;
        if (!canvas || !cropRect || cropRect.w < 0.02 || cropRect.h < 0.02) return;

        const sx = Math.floor(cropRect.x * canvas.width);
        const sy = Math.floor(cropRect.y * canvas.height);
        const sw = Math.max(10, Math.floor(cropRect.w * canvas.width));
        const sh = Math.max(10, Math.floor(cropRect.h * canvas.height));

        const outCanvas = document.createElement('canvas');
        const maxDim = 960;
        const scale = Math.min(1, maxDim / Math.max(sw, sh));
        outCanvas.width = Math.round(sw * scale);
        outCanvas.height = Math.round(sh * scale);

        const outCtx = outCanvas.getContext('2d');
        outCtx.fillStyle = '#ffffff';
        outCtx.fillRect(0, 0, outCanvas.width, outCanvas.height);
        outCtx.drawImage(canvas, sx, sy, sw, sh, 0, 0, outCanvas.width, outCanvas.height);

        const dataUrl = outCanvas.toDataURL('image/jpeg', 0.85);

        if (uploadToStorage) {
            setUploading(true);
            try {
                const filePath = `${storagePrefix}/crop_p${currentPage}_${Date.now()}.jpg`;
                const url = await uploadBase64ImageToStorage(dataUrl, filePath);
                onCropComplete(url);
                onClose();
            } catch (err) {
                console.warn('Storage upload failed, fallback to base64:', err);
                onCropComplete(dataUrl);
                onClose();
            } finally {
                setUploading(false);
            }
        } else {
            onCropComplete(dataUrl);
            onClose();
        }
    };

    return (
        <div className="fixed inset-0 z-[10020] bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5">
            <div className="bg-white dark:bg-slate-900 rounded-3xl border-2 border-slate-200 dark:border-slate-700 shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden">
                {/* Header */}
                <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-sky-500 text-white flex items-center justify-center">
                            <Crop className="w-4 h-4" />
                        </div>
                        <div>
                            <h3 className="text-sm font-black text-slate-900 dark:text-white">
                                Cắt Ảnh Minh Họa Từ Đề PDF / Ảnh
                            </h3>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                Kéo chuột khoanh vùng hình vẽ câu hỏi rồi bấm &quot;Cắt &amp; Gắn ảnh&quot;.
                            </p>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 cursor-pointer"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Page & Upload Controls */}
                <div className="px-5 py-2.5 bg-slate-50 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            disabled={currentPage <= 1}
                            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 disabled:opacity-40 cursor-pointer"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                        <span className="text-xs font-black text-slate-700 dark:text-slate-200 font-mono">
                            Trang {currentPage} / {Math.max(1, totalPages)}
                        </span>
                        <button
                            type="button"
                            disabled={currentPage >= totalPages}
                            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 disabled:opacity-40 cursor-pointer"
                        >
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>

                    <label className="flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-300 cursor-pointer select-none">
                        <input
                            type="checkbox"
                            checked={uploadToStorage}
                            onChange={(e) => setUploadToStorage(e.target.checked)}
                            className="w-4 h-4 accent-emerald-500 rounded"
                        />
                        <Upload className="w-3.5 h-3.5 text-emerald-500" />
                        <span>Upload ảnh lên Firebase Storage (khuyên dùng)</span>
                    </label>
                </div>

                {/* Canvas Surface */}
                <div className="flex-1 overflow-auto p-4 bg-slate-200/70 dark:bg-slate-950 flex items-start justify-center relative">
                    {rendering && (
                        <div className="absolute inset-0 z-10 bg-slate-900/30 flex items-center justify-center">
                            <div className="bg-white dark:bg-slate-800 px-4 py-2.5 rounded-2xl shadow-lg flex items-center gap-2 text-xs font-bold">
                                <Loader2 className="w-4 h-4 animate-spin text-emerald-500" />
                                <span>Đang render trang {currentPage}...</span>
                            </div>
                        </div>
                    )}

                    <div
                        className="relative inline-block select-none shadow-lg border border-slate-300 dark:border-slate-700 cursor-crosshair"
                        onMouseDown={handleMouseDown}
                        onMouseMove={handleMouseMove}
                        onMouseUp={handleMouseUp}
                        onMouseLeave={handleMouseUp}
                    >
                        <canvas ref={canvasRef} className="max-w-full h-auto block bg-white" />
                        {cropRect && cropRect.w > 0.005 && cropRect.h > 0.005 && (
                            <div
                                className="absolute border-2 border-emerald-500 bg-emerald-400/20 pointer-events-none"
                                style={{
                                    left: `${cropRect.x * 100}%`,
                                    top: `${cropRect.y * 100}%`,
                                    width: `${cropRect.w * 100}%`,
                                    height: `${cropRect.h * 100}%`
                                }}
                            />
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="px-5 py-3.5 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2.5">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                    >
                        Đóng
                    </button>
                    <button
                        type="button"
                        disabled={!cropRect || cropRect.w < 0.02 || cropRect.h < 0.02 || uploading}
                        onClick={handleConfirmCrop}
                        className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 border-b-4 border-emerald-700 disabled:opacity-40 text-white text-xs font-black flex items-center gap-1.5 cursor-pointer"
                    >
                        {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                        <span>{uploading ? 'Đang lưu ảnh...' : 'Cắt & Gắn ảnh vào câu'}</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PdfImageCropperModal;
