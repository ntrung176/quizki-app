import React from 'react';
import { useFocus } from '../../context/FocusContext';
import { Timer, Coffee, Play, Pause } from 'lucide-react';

const FloatingFocusWidget = () => {
    const {
        status,
        currentMode,
        secondsLeft,
        formatTime,
        setIsModalOpen,
        isModalOpen
    } = useFocus();

    // Only display floating widget when session is active and modal is closed
    const isActive = status === 'focusing' || status === 'break' || status === 'paused';
    if (!isActive || isModalOpen) return null;

    const isBreak = currentMode === 'break';
    const isPaused = status === 'paused';

    return (
        <button
            onClick={() => setIsModalOpen(true)}
            className={`fixed bottom-6 right-6 z-[9990] flex items-center gap-2.5 px-4 py-2.5 rounded-full shadow-2xl backdrop-blur-xl border transition-all duration-300 cursor-pointer hover:scale-105 active:scale-95 animate-bounce-subtle ${
                isBreak
                    ? 'bg-emerald-950/90 border-emerald-500/50 text-emerald-300 shadow-emerald-950/50'
                    : isPaused
                    ? 'bg-amber-950/90 border-amber-500/50 text-amber-300 shadow-amber-950/50'
                    : 'bg-purple-950/90 border-purple-500/50 text-purple-300 shadow-purple-950/50'
            }`}
            title="Bấm để mở đồng hồ tập trung"
        >
            {/* Pulsing Status Dot */}
            <span className="relative flex h-3 w-3">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                    isBreak ? 'bg-emerald-400' : isPaused ? 'bg-amber-400' : 'bg-purple-400'
                }`} />
                <span className={`relative inline-flex rounded-full h-3 w-3 ${
                    isBreak ? 'bg-emerald-500' : isPaused ? 'bg-amber-500' : 'bg-purple-500'
                }`} />
            </span>

            {/* Mode Icon */}
            {isBreak ? (
                <Coffee className="w-4 h-4 text-emerald-400 animate-pulse" />
            ) : (
                <Timer className="w-4 h-4 text-purple-400 animate-spin-slow" />
            )}

            {/* Countdown Text */}
            <div className="flex items-center gap-1.5 font-mono font-black text-sm tracking-wider">
                <span>{isBreak ? '休憩' : isPaused ? 'TẠM DỪNG' : 'FOCUS'}</span>
                <span className="text-white bg-white/10 px-2 py-0.5 rounded-lg border border-white/15">
                    {formatTime(secondsLeft)}
                </span>
            </div>
        </button>
    );
};

export default FloatingFocusWidget;
