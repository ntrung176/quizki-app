import React, { useRef, useState, useEffect } from 'react';
import { Pencil, Eraser, RotateCcw, Trash2, Check } from 'lucide-react';

const distanceToSegment = (p, v, w) => {
    const l2 = (v.x - w.x) ** 2 + (v.y - w.y) ** 2;
    if (l2 === 0) return Math.sqrt((p.x - v.x) ** 2 + (p.y - v.y) ** 2);
    let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
    t = Math.max(0, Math.min(1, t));
    const projectionX = v.x + t * (w.x - v.x);
    const projectionY = v.y + t * (w.y - v.y);
    return Math.sqrt((p.x - projectionX) ** 2 + (p.y - projectionY) ** 2);
};

export default function HandwritingCanvas({ initialStrokes = [], onChange, darkMode = false }) {
    const canvasRef = useRef(null);
    const containerRef = useRef(null);
    const [strokes, setStrokes] = useState(initialStrokes);
    const [color, setColor] = useState(darkMode ? '#ffffff' : '#0f172a');
    const [brushSize, setBrushSize] = useState(4);
    const [isEraser, setIsEraser] = useState(false);
    
    // Refs to track drawing state without causing re-renders during active drag
    const isDrawingRef = useRef(false);
    const currentStrokeRef = useRef(null);
    const strokesRef = useRef(strokes);

    // Keep ref in sync with state for access in drawing and erasing operations
    useEffect(() => {
        strokesRef.current = strokes;
    }, [strokes]);

    // Adapt default color if dark mode changes and color is the default black/white
    useEffect(() => {
        const isDefaultColor = color === '#ffffff' || color === '#0f172a';
        if (isDefaultColor) {
            setColor(darkMode ? '#ffffff' : '#0f172a');
        }
    }, [darkMode]);

    // Render strokes on canvas using CSS dimensions
    const drawStroke = (ctx, stroke, cssWidth, cssHeight) => {
        if (!stroke.points || stroke.points.length === 0) return;
        
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.globalCompositeOperation = 'source-over';
        ctx.strokeStyle = stroke.color;

        // Single dot rendering
        if (stroke.points.length === 1) {
            const p = stroke.points[0];
            const pPressure = p.pressure !== undefined ? p.pressure : 0.5;
            ctx.beginPath();
            ctx.arc(p.x * cssWidth, p.y * cssHeight, stroke.width * (0.4 + 1.0 * pPressure) / 2, 0, Math.PI * 2);
            ctx.fillStyle = stroke.color;
            ctx.fill();
            return;
        }

        // Segment by segment rendering to support variable pressure thickness
        for (let i = 0; i < stroke.points.length - 1; i++) {
            const p1 = stroke.points[i];
            const p2 = stroke.points[i + 1];
            
            const press1 = p1.pressure !== undefined ? p1.pressure : 0.5;
            const press2 = p2.pressure !== undefined ? p2.pressure : 0.5;
            const avgPressure = (press1 + press2) / 2;

            ctx.beginPath();
            ctx.lineWidth = stroke.width * (0.4 + 1.0 * avgPressure);
            ctx.moveTo(p1.x * cssWidth, p1.y * cssHeight);
            ctx.lineTo(p2.x * cssWidth, p2.y * cssHeight);
            ctx.stroke();
        }
    };

    const redrawCanvas = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        
        const rect = canvas.getBoundingClientRect();
        const ctx = canvas.getContext('2d');
        
        // Reset scale and clear using full pixel resolution
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.restore();
        
        // Redraw each stroke using CSS dimensions (context is already scaled by dpr)
        strokesRef.current.forEach(stroke => {
            drawStroke(ctx, stroke, rect.width, rect.height);
        });
    };

    // Handle Resize and resolution setup
    useEffect(() => {
        const handleResize = () => {
            const canvas = canvasRef.current;
            const container = containerRef.current;
            if (!canvas || !container) return;

            const rect = container.getBoundingClientRect();
            
            // Set canvas pixel dimensions (High DPI support)
            const dpr = window.devicePixelRatio || 1;
            canvas.width = rect.width * dpr;
            canvas.height = rect.height * dpr;
            
            // Scale context to draw normal size
            const ctx = canvas.getContext('2d');
            ctx.setTransform(1, 0, 0, 1, 0, 0);
            ctx.scale(dpr, dpr);

            redrawCanvas();
        };

        window.addEventListener('resize', handleResize);
        
        // Initial setup timeout to allow DOM to finish rendering
        const timer = setTimeout(handleResize, 100);

        return () => {
            window.removeEventListener('resize', handleResize);
            clearTimeout(timer);
        };
    }, []);

    // Redraw whenever strokes state changes (e.g. undo / clear)
    useEffect(() => {
        redrawCanvas();
    }, [strokes]);

    const getNormalizedCoordinates = (e) => {
        const canvas = canvasRef.current;
        if (!canvas) return null;

        const rect = canvas.getBoundingClientRect();
        return {
            x: (e.clientX - rect.left) / rect.width,
            y: (e.clientY - rect.top) / rect.height
        };
    };

    const findAndRemoveStrokeAt = (coords, rectWidth, rectHeight) => {
        const threshold = 18; // 18 CSS pixels
        const px = coords.x * rectWidth;
        const py = coords.y * rectHeight;

        let strokeToRemoveIdx = -1;

        for (let i = strokesRef.current.length - 1; i >= 0; i--) {
            const stroke = strokesRef.current[i];
            
            if (stroke.points.length === 1) {
                const p1 = stroke.points[0];
                const dist = Math.sqrt((px - p1.x * rectWidth) ** 2 + (py - p1.y * rectHeight) ** 2);
                if (dist < threshold) {
                    strokeToRemoveIdx = i;
                }
            } else {
                for (let j = 0; j < stroke.points.length - 1; j++) {
                    const p1 = stroke.points[j];
                    const p2 = stroke.points[j + 1];

                    const v = { x: p1.x * rectWidth, y: p1.y * rectHeight };
                    const w = { x: p2.x * rectWidth, y: p2.y * rectHeight };
                    const p = { x: px, y: py };

                    if (distanceToSegment(p, v, w) < threshold) {
                        strokeToRemoveIdx = i;
                        break;
                    }
                }
            }
            if (strokeToRemoveIdx !== -1) break;
        }

        if (strokeToRemoveIdx !== -1) {
            const updated = strokesRef.current.filter((_, idx) => idx !== strokeToRemoveIdx);
            setStrokes(updated);
            exportCanvas(updated);
        }
    };

    const handleStart = (e) => {
        e.preventDefault();
        // Capture pointer events for drawing/erasing
        const canvas = canvasRef.current;
        if (canvas) {
            try {
                canvas.setPointerCapture(e.pointerId);
            } catch (err) {}
        }

        const coords = getNormalizedCoordinates(e);
        if (!coords) return;

        let pressure = e.pressure;
        if (e.pointerType === 'mouse' && e.buttons === 1 && pressure === 0) pressure = 0.5;
        if (pressure <= 0) pressure = 0.5;

        const startPoint = { ...coords, pressure };
        isDrawingRef.current = true;

        if (isEraser) {
            const rect = canvas.getBoundingClientRect();
            findAndRemoveStrokeAt(coords, rect.width, rect.height);
            return;
        }

        currentStrokeRef.current = {
            points: [startPoint],
            color,
            width: brushSize,
            isEraser: false
        };
    };

    const handleMove = (e) => {
        if (!isDrawingRef.current) return;
        e.preventDefault();

        const coords = getNormalizedCoordinates(e);
        if (!coords) return;

        const canvas = canvasRef.current;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();

        if (isEraser) {
            findAndRemoveStrokeAt(coords, rect.width, rect.height);
            return;
        }

        if (!currentStrokeRef.current) return;

        let pressure = e.pressure;
        if (e.pointerType === 'mouse' && e.buttons === 1 && pressure === 0) pressure = 0.5;
        if (pressure <= 0) pressure = 0.5;

        const newPoint = { ...coords, pressure };
        const prevPoint = currentStrokeRef.current.points[currentStrokeRef.current.points.length - 1];
        currentStrokeRef.current.points.push(newPoint);

        // Draw the segment in real-time on screen
        const ctx = canvas.getContext('2d');
        ctx.beginPath();
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.globalCompositeOperation = 'source-over';
        ctx.strokeStyle = color;
        
        const prevPress = prevPoint.pressure !== undefined ? prevPoint.pressure : 0.5;
        const avgPressure = (prevPress + pressure) / 2;
        
        ctx.lineWidth = brushSize * (0.4 + 1.0 * avgPressure);
        ctx.moveTo(prevPoint.x * rect.width, prevPoint.y * rect.height);
        ctx.lineTo(coords.x * rect.width, coords.y * rect.height);
        ctx.stroke();
    };

    const handleEnd = (e) => {
        if (!isDrawingRef.current) return;
        isDrawingRef.current = false;

        const canvas = canvasRef.current;
        if (canvas) {
            try {
                canvas.releasePointerCapture(e.pointerId);
            } catch (err) {}
        }

        if (!isEraser && currentStrokeRef.current && currentStrokeRef.current.points.length >= 1) {
            const updatedStrokes = [...strokes, currentStrokeRef.current];
            setStrokes(updatedStrokes);
            exportCanvas(updatedStrokes);
        }
        currentStrokeRef.current = null;
    };

    const exportCanvas = (currentStrokes) => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        // If there are no strokes, pass empty values
        if (currentStrokes.length === 0) {
            onChange([], '');
            return;
        }

        // Export as Data URL
        const dataUrl = canvas.toDataURL('image/png');
        onChange(currentStrokes, dataUrl);
    };

    const handleUndo = () => {
        if (strokes.length === 0) return;
        const updatedStrokes = strokes.slice(0, -1);
        setStrokes(updatedStrokes);
        exportCanvas(updatedStrokes);
    };

    const handleClear = () => {
        setStrokes([]);
        onChange([], '');
        const canvas = canvasRef.current;
        if (canvas) {
            const ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
    };

    // Color palettes for Light/Dark mode
    const colors = darkMode 
        ? [
            { value: '#ffffff', label: 'Trắng' },
            { value: '#06b6d4', label: 'Cyan' },
            { value: '#f43f5e', label: 'Hồng Đỏ' },
            { value: '#10b981', label: 'Xanh Lá' },
            { value: '#e2e8f0', label: 'Bạc' }
          ]
        : [
            { value: '#0f172a', label: 'Đen' },
            { value: '#2563eb', label: 'Xanh Dương' },
            { value: '#dc2626', label: 'Đỏ' },
            { value: '#16a34a', label: 'Xanh Lá' },
            { value: '#e2e8f0', label: 'Tẩy nháp' }
          ];

    return (
        <div className="flex flex-col space-y-3 w-full">
            {/* Canvas controls toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-2 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                {/* Tools: Pencil vs Eraser */}
                <div className="flex items-center bg-white dark:bg-slate-850 p-0.5 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm">
                    <button
                        type="button"
                        onClick={() => setIsEraser(false)}
                        className={`p-2 rounded-md transition-all flex items-center justify-center ${
                            !isEraser 
                                ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400' 
                                : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
                        }`}
                        title="Bút viết"
                    >
                        <Pencil className="w-4 h-4" />
                    </button>
                    <button
                        type="button"
                        onClick={() => setIsEraser(true)}
                        className={`p-2 rounded-md transition-all flex items-center justify-center ${
                            isEraser 
                                ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400' 
                                : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
                        }`}
                        title="Cục tẩy"
                    >
                        <Eraser className="w-4 h-4" />
                    </button>
                </div>

                {/* Colors (only when pencil is active) */}
                {!isEraser ? (
                    <div className="flex items-center gap-1.5">
                        {colors.map((c) => (
                            <button
                                key={c.value}
                                type="button"
                                onClick={() => setColor(c.value)}
                                className={`w-6.5 h-6.5 rounded-full border transition-all flex items-center justify-center hover:scale-108 relative ${
                                    color === c.value 
                                        ? 'border-indigo-600 dark:border-indigo-400 scale-105 shadow-sm ring-2 ring-indigo-500/20' 
                                        : 'border-slate-300 dark:border-slate-600'
                                }`}
                                style={{ backgroundColor: c.value === '#ffffff' && darkMode ? '#ffffff' : c.value }}
                                title={c.label}
                            >
                                {color === c.value && (
                                    <Check className={`w-3.5 h-3.5 ${
                                        c.value === '#ffffff' || c.value === '#e2e8f0' 
                                            ? 'text-slate-800' 
                                            : 'text-white'
                                    }`} />
                                )}
                            </button>
                        ))}
                    </div>
                ) : (
                    <div className="text-[11px] font-bold text-indigo-500 dark:text-indigo-400 animate-pulse px-2">
                        Đang ở chế độ tẩy xóa nét...
                    </div>
                )}

                {/* Sizes */}
                <div className="flex items-center gap-2">
                    <span className="text-[10px] uppercase font-extrabold text-slate-400 dark:text-slate-500">Cỡ nét:</span>
                    <div className="flex items-center bg-white dark:bg-slate-850 p-0.5 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm">
                        {[2, 4, 8].map((size) => (
                            <button
                                key={size}
                                type="button"
                                onClick={() => setBrushSize(size)}
                                className={`px-2.5 py-1 text-xs font-black rounded transition-all ${
                                    brushSize === size 
                                        ? 'bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-white' 
                                        : 'text-slate-400 hover:text-slate-600'
                                }`}
                            >
                                {size === 2 ? 'Mảnh' : size === 4 ? 'Vừa' : 'Dày'}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Actions: Undo, Clear */}
                <div className="flex items-center gap-1.5 ml-auto">
                    <button
                        type="button"
                        onClick={handleUndo}
                        disabled={strokes.length === 0}
                        className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-850 text-slate-500 dark:text-slate-400 disabled:opacity-40 disabled:hover:bg-transparent transition"
                        title="Quay lại (Undo)"
                    >
                        <RotateCcw className="w-4 h-4" />
                    </button>
                    <button
                        type="button"
                        onClick={handleClear}
                        disabled={strokes.length === 0}
                        className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-red-50 dark:hover:bg-red-950/20 text-red-500 disabled:opacity-40 disabled:hover:bg-transparent transition"
                        title="Xóa hết nháp"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Drawing Canvas Area */}
            <div 
                ref={containerRef}
                className="w-full h-[220px] relative rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-800/80 bg-white dark:bg-slate-950 cursor-crosshair overflow-hidden bg-[radial-gradient(#e2e8f0_1.2px,transparent_1.2px)] dark:bg-[radial-gradient(#334155_1.2px,transparent_1.2px)] [background-size:16px_16px]"
            >
                <canvas
                    ref={canvasRef}
                    onPointerDown={handleStart}
                    onPointerMove={handleMove}
                    onPointerUp={handleEnd}
                    onPointerLeave={handleEnd}
                    className="absolute inset-0 w-full h-full block touch-none"
                />
            </div>
            <div className="text-[10px] text-slate-400 dark:text-slate-500 italic text-right px-1">
                Có thể dùng chuột, bút cảm ứng hoặc ngón tay để vẽ nháp/chú thích.
            </div>
        </div>
    );
}
