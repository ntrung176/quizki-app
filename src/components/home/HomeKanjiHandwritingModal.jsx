import React, { useState, useRef, useEffect, useCallback } from 'react';
import { PenTool, RotateCcw, X, Loader2 } from 'lucide-react';
import { getJotobaKanjiData } from '../../data/jotobaKanjiData';

/**
 * HomeKanjiHandwritingModal - Clean canvas handwriting recognition modal using Google Input Tools API
 */
export default function HomeKanjiHandwritingModal({
    isOpen,
    onClose,
    onSelectKanji
}) {
    const [suggestions, setSuggestions] = useState([]);
    const [isRecognizing, setIsRecognizing] = useState(false);
    const canvasRef = useRef(null);
    const strokesRef = useRef([]);
    const currentStrokeRef = useRef({ xs: [], ys: [] });
    const recognitionTimeoutRef = useRef(null);

    const clearCanvas = useCallback(() => {
        const canvas = canvasRef.current;
        if (canvas) {
            const ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
        strokesRef.current = [];
        currentStrokeRef.current = { xs: [], ys: [] };
        if (recognitionTimeoutRef.current) clearTimeout(recognitionTimeoutRef.current);
        setSuggestions([]);
    }, []);

    useEffect(() => {
        if (!isOpen) {
            clearCanvas();
        }
    }, [isOpen, clearCanvas]);

    const recognizeStrokes = useCallback(async (strokes, width = 280, height = 240) => {
        if (!strokes || strokes.length === 0) {
            setSuggestions([]);
            return;
        }
        setIsRecognizing(true);
        const ink = strokes.map(s => [s.xs, s.ys]);
        const payload = {
            options: "enable_homophone",
            requests: [
                {
                    writing_guide: { width: Math.round(width), height: Math.round(height) },
                    ink: ink,
                    language: "ja"
                }
            ]
        };

        try {
            const response = await fetch('https://inputtools.google.com/request?itc=ja-t-i0-handwrit&app=translate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await response.json();
            if (data[0] === 'SUCCESS' && data[1] && data[1][0] && data[1][0][1]) {
                const candidates = data[1][0][1];
                const processed = candidates.slice(0, 16).map((char, index) => {
                    const jData = getJotobaKanjiData(char);
                    return {
                        id: `${char}_${index}`,
                        character: char,
                        sinoViet: jData?.sinoViet || '',
                        meaningVi: jData?.meaningVi || ''
                    };
                });
                setSuggestions(processed);
            }
        } catch (err) {
            console.warn("Handwriting recognition failed:", err);
        } finally {
            setIsRecognizing(false);
        }
    }, []);

    const scheduleRecognition = useCallback(() => {
        if (recognitionTimeoutRef.current) clearTimeout(recognitionTimeoutRef.current);
        recognitionTimeoutRef.current = setTimeout(() => {
            const canvas = canvasRef.current;
            if (canvas) {
                recognizeStrokes(strokesRef.current, canvas.width, canvas.height);
            }
        }, 300);
    }, [recognizeStrokes]);

    const handleMouseDown = (e) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        const x = (e.clientX - rect.left) * (canvas.width / rect.width);
        const y = (e.clientY - rect.top) * (canvas.height / rect.height);
        const ctx = canvas.getContext('2d');
        ctx.beginPath();
        ctx.moveTo(x, y);
        canvas.dataset.drawing = 'true';
        currentStrokeRef.current = { xs: [Math.round(x)], ys: [Math.round(y)] };
    };

    const handleMouseMove = (e) => {
        const canvas = canvasRef.current;
        if (!canvas || canvas.dataset.drawing !== 'true') return;
        const rect = canvas.getBoundingClientRect();
        const x = (e.clientX - rect.left) * (canvas.width / rect.width);
        const y = (e.clientY - rect.top) * (canvas.height / rect.height);
        const ctx = canvas.getContext('2d');
        ctx.lineTo(x, y);
        ctx.strokeStyle = '#0284c7'; // Sky/Cyan brand color
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.stroke();
        currentStrokeRef.current.xs.push(Math.round(x));
        currentStrokeRef.current.ys.push(Math.round(y));
    };

    const handleMouseUp = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        canvas.dataset.drawing = 'false';
        if (currentStrokeRef.current.xs.length > 1) {
            strokesRef.current = [...strokesRef.current, { ...currentStrokeRef.current }];
            currentStrokeRef.current = { xs: [], ys: [] };
            scheduleRecognition();
        }
    };

    const handleTouchStart = (e) => {
        e.preventDefault();
        const canvas = canvasRef.current;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        const touch = e.touches[0];
        const x = (touch.clientX - rect.left) * (canvas.width / rect.width);
        const y = (touch.clientY - rect.top) * (canvas.height / rect.height);
        const ctx = canvas.getContext('2d');
        ctx.beginPath();
        ctx.moveTo(x, y);
        canvas.dataset.drawing = 'true';
        currentStrokeRef.current = { xs: [Math.round(x)], ys: [Math.round(y)] };
    };

    const handleTouchMove = (e) => {
        e.preventDefault();
        const canvas = canvasRef.current;
        if (!canvas || canvas.dataset.drawing !== 'true') return;
        const rect = canvas.getBoundingClientRect();
        const touch = e.touches[0];
        const x = (touch.clientX - rect.left) * (canvas.width / rect.width);
        const y = (touch.clientY - rect.top) * (canvas.height / rect.height);
        const ctx = canvas.getContext('2d');
        ctx.lineTo(x, y);
        ctx.strokeStyle = '#0284c7';
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.stroke();
        currentStrokeRef.current.xs.push(Math.round(x));
        currentStrokeRef.current.ys.push(Math.round(y));
    };

    const handleTouchEnd = (e) => {
        e.preventDefault();
        handleMouseUp();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
            <div className="bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden w-full max-w-sm flex flex-col">
                {/* Header */}
                <div className="p-3.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-850">
                    <span className="text-xs sm:text-sm font-black text-slate-800 dark:text-slate-200 flex items-center gap-2">
                        <PenTool className="w-4 h-4 text-amber-500" />
                        Vẽ chữ Kanji để tra cứu
                    </span>
                    <div className="flex items-center gap-1.5">
                        {strokesRef.current.length > 0 && (
                            <span className="text-[11px] text-slate-400 font-mono font-bold mr-1">
                                {strokesRef.current.length} nét
                            </span>
                        )}
                        <button
                            type="button"
                            onClick={clearCanvas}
                            className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-750 rounded-xl text-slate-500 dark:text-slate-400 transition cursor-pointer"
                            title="Xóa và vẽ lại"
                        >
                            <RotateCcw className="w-4 h-4" />
                        </button>
                        <button
                            type="button"
                            onClick={onClose}
                            className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-750 rounded-xl text-slate-500 dark:text-slate-400 transition cursor-pointer"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* Canvas Drawing Area */}
                <div className="relative bg-slate-50 dark:bg-slate-950 flex items-center justify-center" style={{ height: '240px' }}>
                    {/* Grid Guide */}
                    <div className="absolute inset-0 pointer-events-none border-b border-dashed border-slate-200 dark:border-slate-800 top-1/2 -translate-y-1/2" />
                    <div className="absolute inset-0 pointer-events-none border-r border-dashed border-slate-200 dark:border-slate-800 left-1/2 -translate-x-1/2" />

                    <canvas
                        ref={canvasRef}
                        width="300"
                        height="240"
                        className="w-full h-full cursor-crosshair touch-none relative z-10"
                        onMouseDown={handleMouseDown}
                        onMouseMove={handleMouseMove}
                        onMouseUp={handleMouseUp}
                        onMouseLeave={handleMouseUp}
                        onTouchStart={handleTouchStart}
                        onTouchMove={handleTouchMove}
                        onTouchEnd={handleTouchEnd}
                    />

                    {isRecognizing && (
                        <div className="absolute bottom-2 right-2 flex items-center gap-1.5 bg-white/90 dark:bg-slate-800/90 px-2 py-1 rounded-lg text-[10px] font-bold text-amber-600 shadow-xs z-20">
                            <Loader2 className="w-3 h-3 animate-spin" />
                            Đang nhận diện...
                        </div>
                    )}
                </div>

                {/* Candidate Suggestions */}
                <div className="p-3 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 max-h-48 overflow-y-auto">
                    <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">
                        {suggestions.length > 0 ? 'Chọn chữ Kanji đúng:' : 'Vẽ nét chữ vào ô phía trên'}
                    </div>

                    {suggestions.length > 0 ? (
                        <div className="grid grid-cols-4 gap-2">
                            {suggestions.map((item) => (
                                <button
                                    key={item.id}
                                    type="button"
                                    onClick={() => {
                                        onSelectKanji(item.character);
                                        onClose();
                                    }}
                                    className="p-2 rounded-2xl border-2 border-slate-200 dark:border-slate-750 hover:border-amber-400 dark:hover:border-amber-500 hover:bg-amber-50/50 dark:hover:bg-slate-800 flex flex-col items-center justify-center transition-all cursor-pointer active:scale-95 group"
                                >
                                    <span className="font-japanese font-black text-2xl text-slate-900 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-400">
                                        {item.character}
                                    </span>
                                    {item.sinoViet && (
                                        <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase mt-0.5 truncate max-w-full">
                                            {item.sinoViet}
                                        </span>
                                    )}
                                </button>
                            ))}
                        </div>
                    ) : (
                        <p className="text-xs text-slate-400 dark:text-slate-500 text-center py-3 italic">
                            Dùng chuột hoặc ngón tay để vẽ các nét chữ Kanji
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}
