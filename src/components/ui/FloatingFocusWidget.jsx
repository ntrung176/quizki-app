import React, { useState, useEffect, useRef } from 'react';
import { useFocus } from '../../contexts/FocusContext';
import { Timer, Coffee, GripVertical } from 'lucide-react';

const STORAGE_KEY = 'quizki_focus_widget_pos';

const FloatingFocusWidget = () => {
    const {
        status,
        currentMode,
        secondsLeft,
        formatTime,
        setIsModalOpen,
        isModalOpen,
        currentPeriod
    } = useFocus();

    const widgetRef = useRef(null);
    const dragDataRef = useRef({
        isDragging: false,
        hasMoved: false,
        startX: 0,
        startY: 0,
        origX: 0,
        origY: 0
    });

    const [position, setPosition] = useState(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                const parsed = JSON.parse(saved);
                if (typeof parsed.x === 'number' && typeof parsed.y === 'number') {
                    return parsed;
                }
            }
        } catch {
            // ignore localStorage error
        }
        return null;
    });

    const [isDraggingState, setIsDraggingState] = useState(false);

    // Keep widget within viewport on resize
    useEffect(() => {
        const handleResize = () => {
            if (!position || !widgetRef.current) return;
            const width = widgetRef.current.offsetWidth || 180;
            const height = widgetRef.current.offsetHeight || 44;
            const maxX = Math.max(8, window.innerWidth - width - 8);
            const maxY = Math.max(8, window.innerHeight - height - 8);

            const clampedX = Math.min(Math.max(8, position.x), maxX);
            const clampedY = Math.min(Math.max(8, position.y), maxY);

            if (clampedX !== position.x || clampedY !== position.y) {
                const newPos = { x: clampedX, y: clampedY };
                setPosition(newPos);
                try {
                    localStorage.setItem(STORAGE_KEY, JSON.stringify(newPos));
                } catch {
                    // ignore
                }
            }
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [position]);

    const handlePointerDown = (e) => {
        if (!widgetRef.current) return;
        const rect = widgetRef.current.getBoundingClientRect();

        dragDataRef.current = {
            isDragging: true,
            hasMoved: false,
            startX: e.clientX,
            startY: e.clientY,
            origX: rect.left,
            origY: rect.top
        };

        try {
            e.currentTarget.setPointerCapture(e.pointerId);
        } catch {
            // ignore
        }
    };

    const handlePointerMove = (e) => {
        if (!dragDataRef.current.isDragging) return;

        const dx = e.clientX - dragDataRef.current.startX;
        const dy = e.clientY - dragDataRef.current.startY;

        if (!dragDataRef.current.hasMoved && Math.hypot(dx, dy) > 4) {
            dragDataRef.current.hasMoved = true;
            setIsDraggingState(true);
        }

        if (dragDataRef.current.hasMoved && widgetRef.current) {
            const width = widgetRef.current.offsetWidth || 180;
            const height = widgetRef.current.offsetHeight || 44;
            const maxX = Math.max(8, window.innerWidth - width - 8);
            const maxY = Math.max(8, window.innerHeight - height - 8);

            const nextX = Math.min(Math.max(8, dragDataRef.current.origX + dx), maxX);
            const nextY = Math.min(Math.max(8, dragDataRef.current.origY + dy), maxY);

            setPosition({ x: nextX, y: nextY });
        }
    };

    const handlePointerUp = (e) => {
        if (!dragDataRef.current.isDragging) return;

        try {
            e.currentTarget.releasePointerCapture(e.pointerId);
        } catch {
            // ignore
        }

        const wasMoved = dragDataRef.current.hasMoved;
        dragDataRef.current.isDragging = false;
        setIsDraggingState(false);

        if (wasMoved) {
            if (position) {
                try {
                    localStorage.setItem(STORAGE_KEY, JSON.stringify(position));
                } catch {
                    // ignore
                }
            }
        } else {
            // It was a click / tap without dragging
            setIsModalOpen(true);
        }
    };

    const handlePointerCancel = (e) => {
        if (dragDataRef.current.isDragging) {
            try {
                e.currentTarget.releasePointerCapture(e.pointerId);
            } catch {
                // ignore
            }
            dragDataRef.current.isDragging = false;
            setIsDraggingState(false);
        }
    };

    // Only display floating widget when session is active and modal is closed
    const isActive = status === 'focusing' || status === 'break' || status === 'paused';
    if (!isActive || isModalOpen) return null;

    const isBreak = currentMode === 'break';
    const isPaused = status === 'paused';

    const periodLabel = currentPeriod
        ? (isBreak ? `Nghỉ ${currentPeriod.breakIndex || 1}/${currentPeriod.totalBreaks || 1}` : `Focus ${currentPeriod.periodIndex || 1}/${currentPeriod.totalPeriods || 1}`)
        : (isBreak ? 'Nghỉ giải lao' : 'Tập trung');

    const style = position
        ? {
            left: `${position.x}px`,
            top: `${position.y}px`,
            right: 'auto',
            bottom: 'auto'
        }
        : undefined;

    return (
        <div
            ref={widgetRef}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerCancel}
            style={style}
            className={`fixed z-[9990] touch-none select-none flex items-center gap-2 px-3.5 py-2.5 rounded-full shadow-2xl backdrop-blur-xl border transition-shadow duration-200 cursor-grab active:cursor-grabbing ${!position ? 'bottom-[calc(4.75rem+env(safe-area-inset-bottom,0px))] right-4 lg:bottom-6 lg:right-6 animate-bounce-subtle' : ''
                } ${isDraggingState ? 'scale-105 shadow-[0_20px_50px_rgba(0,0,0,0.5)] ring-2 ring-sky-400/50' : 'hover:scale-102'
                } ${isBreak
                    ? 'bg-amber-950/95 border-amber-500/60 text-amber-300 shadow-amber-950/50'
                    : isPaused
                        ? 'bg-slate-900/95 border-amber-500/60 text-amber-300 shadow-slate-950/50'
                        : 'bg-slate-900/95 border-sky-500/60 text-sky-300 shadow-slate-950/50'
                }`}
            title="Kéo để di chuyển vị trí · Bấm để mở đồng hồ tập trung"
        >
            {/* Drag Grip Indicator */}
            <GripVertical className="w-3.5 h-3.5 text-slate-400/60 hover:text-slate-300 shrink-0" />

            {/* Pulsing Status Dot */}
            <span className="relative flex h-2.5 w-2.5 shrink-0">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isBreak ? 'bg-amber-400' : isPaused ? 'bg-amber-400' : 'bg-sky-400'
                    }`} />
                <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${isBreak ? 'bg-amber-500' : isPaused ? 'bg-amber-500' : 'bg-sky-500'
                    }`} />
            </span>

            {/* Mode Icon */}
            {isBreak ? (
                <Coffee className="w-3.5 h-3.5 text-amber-400 animate-pulse shrink-0" />
            ) : (
                <Timer className="w-3.5 h-3.5 text-sky-400 animate-spin-slow shrink-0" />
            )}

            {/* Countdown Text */}
            <div className="flex items-center gap-1.5 font-mono font-bold text-xs tracking-wider">
                <span className="text-slate-300 text-[11px] whitespace-nowrap">{periodLabel}</span>
                <span className="text-white bg-white/10 px-2 py-0.5 rounded-lg border border-white/15 font-black text-xs sm:text-sm whitespace-nowrap">
                    {formatTime(secondsLeft)}
                </span>
            </div>
        </div>
    );
};

export default FloatingFocusWidget;
