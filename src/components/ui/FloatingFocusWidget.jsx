import React from 'react';
import { useFocus } from '../../contexts/FocusContext';
import { Timer, Coffee } from 'lucide-react';

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

    // Only display floating widget when session is active and modal is closed
    const isActive = status === 'focusing' || status === 'break' || status === 'paused';
    if (!isActive || isModalOpen) return null;

    const isBreak = currentMode === 'break';
    const isPaused = status === 'paused';

    const periodLabel = currentPeriod 
        ? (isBreak ? `Nghỉ ${currentPeriod.breakIndex || 1}/${currentPeriod.totalBreaks || 1}` : `Focus ${currentPeriod.periodIndex || 1}/${currentPeriod.totalPeriods || 1}`)
        : (isBreak ? 'Nghỉ giải lao' : 'Tập trung');

    return (
        <button
            onClick={() => setIsModalOpen(true)}
            className={`fixed bottom-6 right-6 z-[9990] flex items-center gap-2.5 px-4 py-2.5 rounded-full shadow-2xl backdrop-blur-xl border transition-all duration-300 cursor-pointer hover:scale-105 active:scale-95 animate-bounce-subtle select-none ${
                isBreak
                    ? 'bg-amber-950/90 border-amber-500/50 text-amber-300 shadow-amber-950/50'
                    : isPaused
                    ? 'bg-slate-900/95 border-amber-500/50 text-amber-300 shadow-slate-950/50'
                    : 'bg-slate-900/95 border-sky-500/50 text-sky-300 shadow-slate-950/50'
            }`}
            title="Bấm để mở đồng hồ tập trung"
        >
            {/* Pulsing Status Dot */}
            <span className="relative flex h-3 w-3">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                    isBreak ? 'bg-amber-400' : isPaused ? 'bg-amber-400' : 'bg-sky-400'
                }`} />
                <span className={`relative inline-flex rounded-full h-3 w-3 ${
                    isBreak ? 'bg-amber-500' : isPaused ? 'bg-amber-500' : 'bg-sky-500'
                }`} />
            </span>

            {/* Mode Icon */}
            {isBreak ? (
                <Coffee className="w-4 h-4 text-amber-400 animate-pulse" />
            ) : (
                <Timer className="w-4 h-4 text-sky-400 animate-spin-slow" />
            )}

            {/* Countdown Text */}
            <div className="flex items-center gap-2 font-mono font-bold text-xs tracking-wider">
                <span className="text-slate-300">{periodLabel}</span>
                <span className="text-white bg-white/10 px-2 py-0.5 rounded-lg border border-white/15 font-black text-sm">
                    {formatTime(secondsLeft)}
                </span>
            </div>
        </button>
    );
};

export default FloatingFocusWidget;
