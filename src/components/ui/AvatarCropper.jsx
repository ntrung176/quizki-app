import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Upload, ZoomIn, ZoomOut, RotateCw, Check, X, ImageIcon } from 'lucide-react';

// =============================================
// AvatarCropper - Upload & Crop avatar từ máy
// =============================================
const AvatarCropper = ({ onConfirm, onCancel, currentAvatarUrl }) => {
    const [imageSrc, setImageSrc] = useState(null);
    const [scale, setScale] = useState(1);
    const [minScale, setMinScale] = useState(0.1); // scale nhỏ nhất để ảnh vẫn lấp đầy khung
    const [maxScale, setMaxScale] = useState(1);   // scale lớn nhất = 100% trên slider
    const [rotation, setRotation] = useState(0);
    const [offset, setOffset] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const [isProcessing, setIsProcessing] = useState(false);

    const canvasRef = useRef(null);
    const previewCanvasRef = useRef(null);
    const fileInputRef = useRef(null);
    const imageRef = useRef(null);
    const animRef = useRef(null);

    const CANVAS_SIZE = 280;
    const CROP_RADIUS = 120; // circle crop radius

    // Load image khi imageSrc thay đổi
    useEffect(() => {
        if (!imageSrc) return;
        const img = new Image();
        img.onload = () => {
            imageRef.current = img;
            // minScale: ảnh nhỏ nhất mà vẫn che đầy vòng tròn crop (cạnh ngắn = đường kính crop)
            const minDim = Math.min(img.width, img.height);
            const maxDim = Math.max(img.width, img.height);
            const computed = (CROP_RADIUS * 2) / minDim;
            const mn = computed;          // = fit vừa khít → đây là min (0%)
            const mx = computed * 3;      // 3x fit = max (100%)
            setMinScale(mn);
            setMaxScale(mx);
            setScale(computed);           // bắt đầu ở vừa khít
            setOffset({ x: 0, y: 0 });
        };
        img.src = imageSrc;
    }, [imageSrc]);

    // Vẽ canvas liên tục (animation loop)
    useEffect(() => {
        const draw = () => {
            const canvas = canvasRef.current;
            if (!canvas) return;
            const ctx = canvas.getContext('2d');
            const img = imageRef.current;

            ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

            const cx = CANVAS_SIZE / 2;
            const cy = CANVAS_SIZE / 2;

            if (img) {
                ctx.save();
                ctx.translate(cx + offset.x, cy + offset.y);
                ctx.rotate((rotation * Math.PI) / 180);
                ctx.scale(scale, scale);
                ctx.drawImage(img, -img.width / 2, -img.height / 2);
                ctx.restore();

                // Overlay tối ngoài vòng tròn
                ctx.save();
                ctx.beginPath();
                ctx.rect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
                ctx.arc(cx, cy, CROP_RADIUS, 0, Math.PI * 2, true);
                ctx.fillStyle = 'rgba(0,0,0,0.55)';
                ctx.fill();
                ctx.restore();
            } else {
                // Placeholder khi chưa chọn ảnh
                ctx.fillStyle = '#1e1b4b';
                ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
            }

            // Vẽ border vòng tròn
            ctx.save();
            ctx.beginPath();
            ctx.arc(cx, cy, CROP_RADIUS, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(129, 140, 248, 0.9)';
            ctx.lineWidth = 2.5;
            ctx.setLineDash([8, 4]);
            ctx.stroke();
            ctx.restore();

            // Vẽ guide lines (crosshair)
            ctx.save();
            ctx.strokeStyle = 'rgba(255,255,255,0.15)';
            ctx.lineWidth = 1;
            ctx.setLineDash([]);
            ctx.beginPath();
            ctx.moveTo(cx, cy - CROP_RADIUS);
            ctx.lineTo(cx, cy + CROP_RADIUS);
            ctx.moveTo(cx - CROP_RADIUS, cy);
            ctx.lineTo(cx + CROP_RADIUS, cy);
            ctx.stroke();
            ctx.restore();

            animRef.current = requestAnimationFrame(draw);
        };

        animRef.current = requestAnimationFrame(draw);
        return () => cancelAnimationFrame(animRef.current);
    }, [imageSrc, scale, rotation, offset]);

    // File input change
    const handleFileChange = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (!file.type.startsWith('image/')) {
            alert('Vui lòng chọn file ảnh!');
            return;
        }
        if (file.size > 5 * 1024 * 1024) {
            alert('Ảnh quá lớn! Tối đa 5MB.');
            return;
        }
        const reader = new FileReader();
        reader.onload = (ev) => setImageSrc(ev.target.result);
        reader.readAsDataURL(file);
        e.target.value = '';
    };

    // Drag to pan
    const handleMouseDown = useCallback((e) => {
        if (!imageRef.current) return;
        setIsDragging(true);
        const rect = canvasRef.current.getBoundingClientRect();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        setDragStart({
            x: clientX - rect.left - offset.x,
            y: clientY - rect.top - offset.y,
        });
    }, [offset]);

    const handleMouseMove = useCallback((e) => {
        if (!isDragging) return;
        const rect = canvasRef.current.getBoundingClientRect();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        setOffset({
            x: clientX - rect.left - dragStart.x,
            y: clientY - rect.top - dragStart.y,
        });
    }, [isDragging, dragStart]);

    const handleMouseUp = useCallback(() => setIsDragging(false), []);

    // Pinch to zoom (touch)
    const lastPinchDist = useRef(null);
    const handleTouchStart = useCallback((e) => {
        if (e.touches.length === 2) {
            const dx = e.touches[0].clientX - e.touches[1].clientX;
            const dy = e.touches[0].clientY - e.touches[1].clientY;
            lastPinchDist.current = Math.sqrt(dx * dx + dy * dy);
        } else {
            handleMouseDown(e);
        }
    }, [handleMouseDown]);

    const handleTouchMove = useCallback((e) => {
        if (e.touches.length === 2) {
            const dx = e.touches[0].clientX - e.touches[1].clientX;
            const dy = e.touches[0].clientY - e.touches[1].clientY;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (lastPinchDist.current) {
                const delta = dist / lastPinchDist.current;
                setScale(s => Math.max(minScale, Math.min(maxScale, s * delta)));
            }
            lastPinchDist.current = dist;
        } else {
            handleMouseMove(e);
        }
    }, [handleMouseMove, minScale, maxScale]);

    // Wheel zoom
    const handleWheel = useCallback((e) => {
        e.preventDefault();
        const delta = e.deltaY < 0 ? 1.05 : 0.95;
        setScale(s => Math.max(minScale, Math.min(maxScale, s * delta)));
    }, [minScale, maxScale]);

    // Crop và export
    const handleConfirm = async () => {
        if (!imageRef.current) return;
        setIsProcessing(true);

        await new Promise(r => setTimeout(r, 50)); // nhường CPU cho UI

        const outputSize = 200; // output avatar size in px
        const offscreen = document.createElement('canvas');
        offscreen.width = outputSize;
        offscreen.height = outputSize;
        const ctx = offscreen.getContext('2d');

        // Clip vòng tròn
        ctx.beginPath();
        ctx.arc(outputSize / 2, outputSize / 2, outputSize / 2, 0, Math.PI * 2);
        ctx.clip();

        // Tính tỉ lệ từ canvas hiển thị (280px) sang output (200px)
        const displayRatio = outputSize / (CROP_RADIUS * 2);

        const img = imageRef.current;
        const cx = CANVAS_SIZE / 2;
        const cy = CANVAS_SIZE / 2;

        // Transform: center crop area → output
        ctx.translate(outputSize / 2, outputSize / 2);
        ctx.rotate((rotation * Math.PI) / 180);
        ctx.scale(scale * displayRatio, scale * displayRatio);
        ctx.drawImage(
            img,
            -img.width / 2 + (offset.x / scale / displayRatio),
            -img.height / 2 + (offset.y / scale / displayRatio)
        );

        const base64 = offscreen.toDataURL('image/jpeg', 0.88);
        setIsProcessing(false);
        onConfirm(base64);
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ backgroundColor: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)' }}
        >
            <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden">
                {/* Header */}
                <div className="px-5 pt-5 pb-3 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
                    <h3 className="font-bold text-gray-800 dark:text-white flex items-center gap-2 text-sm">
                        <ImageIcon className="w-4 h-4 text-indigo-500" />
                        Tải ảnh đại diện
                    </h3>
                    <button onClick={onCancel} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-5 space-y-4">
                    {/* Canvas crop area */}
                    <div className="flex justify-center">
                        <div className="relative" style={{ width: CANVAS_SIZE, height: CANVAS_SIZE }}>
                            <canvas
                                ref={canvasRef}
                                width={CANVAS_SIZE}
                                height={CANVAS_SIZE}
                                style={{
                                    borderRadius: 16,
                                    cursor: imageRef.current ? (isDragging ? 'grabbing' : 'grab') : 'default',
                                    touchAction: 'none',
                                    display: 'block',
                                    background: '#1e1b4b',
                                }}
                                onMouseDown={handleMouseDown}
                                onMouseMove={handleMouseMove}
                                onMouseUp={handleMouseUp}
                                onMouseLeave={handleMouseUp}
                                onTouchStart={handleTouchStart}
                                onTouchMove={handleTouchMove}
                                onTouchEnd={handleMouseUp}
                                onWheel={handleWheel}
                            />
                            {!imageSrc && (
                                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none"
                                    style={{ borderRadius: 16 }}>
                                    <div className="w-32 h-32 rounded-full border-2 border-dashed border-indigo-400/60 flex items-center justify-center">
                                        <ImageIcon className="w-10 h-10 text-indigo-400/50" />
                                    </div>
                                    <p className="text-indigo-300/60 text-xs mt-3 font-medium">Chọn ảnh để bắt đầu</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {imageSrc && (
                        <p className="text-center text-xs text-gray-400 dark:text-gray-500">
                            Kéo để di chuyển · Cuộn để thu phóng · Kẹp 2 ngón để zoom
                        </p>
                    )}

                    {/* Controls */}
                    {imageSrc && (
                        <div className="space-y-3">
                            {/* Zoom slider — 0% = vừa khít khung, 100% = phóng to 3x */}
                            <div className="flex items-center gap-3">
                                <ZoomOut className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                <input
                                    type="range"
                                    min="0"
                                    max="100"
                                    value={maxScale > minScale ? Math.round(((scale - minScale) / (maxScale - minScale)) * 100) : 0}
                                    onChange={e => {
                                        const pct = Number(e.target.value) / 100;
                                        setScale(minScale + pct * (maxScale - minScale));
                                    }}
                                    className="flex-1 h-2 rounded-full appearance-none cursor-pointer accent-indigo-500"
                                    style={{
                                        background: (() => {
                                            const pct = maxScale > minScale ? ((scale - minScale) / (maxScale - minScale)) * 100 : 0;
                                            return `linear-gradient(to right, #6366f1 ${pct}%, #e5e7eb ${pct}%)`;
                                        })()
                                    }}
                                />
                                <ZoomIn className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                <span className="text-xs text-gray-500 w-10 text-right font-mono">
                                    {maxScale > minScale ? Math.round(((scale - minScale) / (maxScale - minScale)) * 100) : 0}%
                                </span>
                            </div>

                            {/* Rotate */}
                            <div className="flex items-center gap-3">
                                <RotateCw className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                <input
                                    type="range"
                                    min="-180"
                                    max="180"
                                    value={rotation}
                                    onChange={e => setRotation(Number(e.target.value))}
                                    className="flex-1 h-2 rounded-full appearance-none cursor-pointer accent-purple-500"
                                    style={{ background: `linear-gradient(to right, #8b5cf6 ${((rotation + 180) / 360) * 100}%, #e5e7eb ${((rotation + 180) / 360) * 100}%)` }}
                                />
                                <span className="text-xs text-gray-500 w-10 text-right font-mono">{rotation}°</span>
                                <button
                                    onClick={() => setRotation(0)}
                                    className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors px-2 py-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
                                >
                                    Reset
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Action buttons */}
                    <div className="flex gap-2 pt-1">
                        {/* Upload button */}
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border-2 border-dashed border-indigo-300 dark:border-indigo-700 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors text-sm font-bold"
                        >
                            <Upload className="w-4 h-4" />
                            {imageSrc ? 'Đổi ảnh' : 'Chọn ảnh'}
                        </button>

                        {imageSrc && (
                            <button
                                onClick={handleConfirm}
                                disabled={isProcessing}
                                className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white text-sm font-bold shadow-lg shadow-indigo-500/25 transition-all disabled:opacity-60"
                            >
                                {isProcessing ? (
                                    <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                                ) : (
                                    <Check className="w-4 h-4" />
                                )}
                                {isProcessing ? 'Đang xử lý...' : 'Xác nhận'}
                            </button>
                        )}
                    </div>

                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        className="hidden"
                    />

                    <p className="text-center text-[10px] text-gray-400 dark:text-gray-600">
                        Hỗ trợ JPG, PNG, GIF, WebP · Tối đa 5MB
                    </p>
                </div>
            </div>
        </div>
    );
};

export default AvatarCropper;
