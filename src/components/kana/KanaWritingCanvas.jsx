import React, { useRef, useState, useEffect, useCallback } from 'react';
import { RotateCcw, Eye, EyeOff, CheckCircle2, PenTool } from 'lucide-react';

const KanaWritingCanvas = ({ char = 'あ', romaji = 'a', size = 260, onCompleteStroke }) => {
    const canvasRef = useRef(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [hasDrawn, setHasDrawn] = useState(false);
    const [showGuide, setShowGuide] = useState(true);
    const [strokeCount, setStrokeCount] = useState(0);

    // Canvas background grid & character guide renderer
    const drawBackground = useCallback((ctx) => {
        const width = size;
        const height = size;
        ctx.clearRect(0, 0, width, height);

        // Rounded card background
        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(0, 0, width, height);

        // Dashed crosshairs (Tian grid / Ô chữ điền)
        ctx.strokeStyle = '#cbd5e1';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([5, 5]);

        // Horizontal middle line
        ctx.beginPath();
        ctx.moveTo(0, height / 2);
        ctx.lineTo(width, height / 2);
        ctx.stroke();

        // Vertical middle line
        ctx.beginPath();
        ctx.moveTo(width / 2, 0);
        ctx.lineTo(width / 2, height);
        ctx.stroke();

        // Diagonal faint guidelines
        ctx.strokeStyle = '#e2e8f0';
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 6]);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(width, height);
        ctx.moveTo(width, 0);
        ctx.lineTo(0, height);
        ctx.stroke();

        ctx.setLineDash([]); // Reset line dash

        // Draw character ghost guide in center if enabled
        if (showGuide && char) {
            const isMultiChar = char.length > 1;
            const fontSize = isMultiChar ? size * 0.38 : size * 0.62;
            ctx.fillStyle = 'rgba(148, 163, 184, 0.28)';
            ctx.font = `bold ${fontSize}px "Noto Sans JP", "Hiragino Kaku Gothic Pro", "Yu Gothic", sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(char, width / 2, height / 2 + (isMultiChar ? size * 0.02 : size * 0.04));
        }
    }, [size, showGuide, char]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        drawBackground(ctx);
        setHasDrawn(false);
        setStrokeCount(0);
    }, [char, size, drawBackground]);

    // Touch and mouse coordinate normalizer
    const getCoordinates = (e) => {
        const canvas = canvasRef.current;
        if (!canvas) return { x: 0, y: 0 };
        const rect = canvas.getBoundingClientRect();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        return {
            x: (clientX - rect.left) * (canvas.width / rect.width),
            y: (clientY - rect.top) * (canvas.height / rect.height)
        };
    };

    const startDrawing = (e) => {
        if (e.cancelable && e.type === 'touchstart') e.preventDefault();
        const coords = getCoordinates(e);
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');

        ctx.beginPath();
        ctx.moveTo(coords.x, coords.y);
        ctx.strokeStyle = '#0f172a'; // Deep ink color
        ctx.lineWidth = size * 0.045; // Proportional brush width
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        setIsDrawing(true);
        setHasDrawn(true);
    };

    const draw = (e) => {
        if (!isDrawing) return;
        if (e.cancelable && e.type === 'touchmove') e.preventDefault();
        const coords = getCoordinates(e);
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');

        ctx.lineTo(coords.x, coords.y);
        ctx.stroke();
    };

    const stopDrawing = (e) => {
        if (!isDrawing) return;
        if (e.cancelable && e.type === 'touchend') e.preventDefault();
        setIsDrawing(false);
        setStrokeCount(prev => prev + 1);
        if (onCompleteStroke) onCompleteStroke();
    };

    const handleClear = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        drawBackground(ctx);
        setHasDrawn(false);
        setStrokeCount(0);
    };

    return (
        <div className="flex flex-col items-center select-none">
            {/* Canvas Outer Card Container */}
            <div className="relative rounded-3xl overflow-hidden shadow-xl border-2 border-indigo-200/80 dark:border-indigo-500/30 bg-slate-50 dark:bg-slate-900 p-2">
                <canvas
                    ref={canvasRef}
                    width={size}
                    height={size}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                    className="rounded-2xl cursor-crosshair touch-none shadow-inner"
                    style={{ width: `${size}px`, height: `${size}px` }}
                />

                {/* Floating Clear & Toggle Guide Controls */}
                <div className="absolute top-4 right-4 flex items-center gap-1.5 z-10">
                    <button
                        type="button"
                        onClick={() => setShowGuide(prev => !prev)}
                        className="p-2 rounded-xl bg-white/90 dark:bg-slate-800/90 text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 shadow-md border border-slate-200/70 dark:border-slate-700/70 transition-all hover:scale-105 active:scale-95 cursor-pointer"
                        title={showGuide ? 'Ẩn nét mẫu' : 'Hiện nét mẫu'}
                    >
                        {showGuide ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                    </button>
                    <button
                        type="button"
                        onClick={handleClear}
                        className="p-2 rounded-xl bg-white/90 dark:bg-slate-800/90 text-slate-600 dark:text-slate-300 hover:text-rose-600 dark:hover:text-rose-400 shadow-md border border-slate-200/70 dark:border-slate-700/70 transition-all hover:scale-105 active:scale-95 cursor-pointer"
                        title="Xóa viết lại"
                    >
                        <RotateCcw className="w-4 h-4" />
                    </button>
                </div>

                {/* Stroke Badge */}
                <div className="absolute bottom-4 left-4 z-10 flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white/90 dark:bg-slate-800/90 text-[11px] font-bold text-slate-600 dark:text-slate-300 shadow-sm border border-slate-200/70 dark:border-slate-700/70">
                    <PenTool className="w-3.5 h-3.5 text-indigo-500" />
                    <span>Nét đã vẽ: <strong className="text-indigo-600 dark:text-indigo-400">{strokeCount}</strong></span>
                </div>
            </div>

            {/* Quick Actions Below Canvas */}
            <div className="flex items-center gap-2 mt-3 w-full justify-center">
                <button
                    type="button"
                    onClick={handleClear}
                    className="px-4 py-2 text-xs font-bold rounded-xl bg-slate-200/80 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-all cursor-pointer flex items-center gap-1.5"
                >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Làm sạch ô vẽ</span>
                </button>
            </div>
        </div>
    );
};

export default KanaWritingCanvas;
