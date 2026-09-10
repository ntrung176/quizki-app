import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { 
    X, 
    Play, 
    Pause, 
    Square, 
    SkipForward,
    ChevronUp, 
    ChevronDown, 
    Coffee, 
    Flame, 
    Maximize2
} from 'lucide-react';
import { useFocus } from '../../contexts/FocusContext';

const FocusSessionModal = () => {
    const {
        targetMinutes,
        setTargetMinutes,
        skipBreaks,
        setSkipBreaks,
        stats,
        status,
        currentMode,
        secondsLeft,
        totalSeconds,
        isModalOpen,
        setIsModalOpen,
        currentPeriod,
        nextPeriod,
        getUpNextText,
        startFocusSession,
        pauseSession,
        resumeSession,
        skipToNextPeriod,
        stopSession,
        formatTime,
        getBreakInfoText
    } = useFocus();

    const [showExactSeconds, setShowExactSeconds] = useState(false);

    if (!isModalOpen) return null;

    const handleIncrement = () => {
        setTargetMinutes(prev => Math.min(200, (Math.floor(prev / 25) + 1) * 25));
    };

    const handleDecrement = () => {
        setTargetMinutes(prev => Math.max(25, (Math.ceil(prev / 25) - 1) * 25));
    };

    const isRunning = status === 'focusing' || status === 'break';
    const isPaused = status === 'paused';
    const isBreak = currentMode === 'break';

    // Minutes display calculation
    const displayMinutes = Math.floor(secondsLeft / 60);

    // Header title calculation in Vietnamese
    const getHeaderTitle = () => {
        if (!isRunning && !isPaused) return 'Sẵn sàng tập trung';
        if (currentPeriod?.type === 'focus') {
            return `Phiên tập trung (${currentPeriod.periodIndex}/${currentPeriod.totalPeriods})`;
        }
        if (currentPeriod?.type === 'break') {
            const breakName = currentPeriod.isLongBreak ? 'Nghỉ dài' : 'Nghỉ giải lao';
            return `${breakName} (${currentPeriod.breakIndex}/${currentPeriod.totalBreaks})`;
        }
        return isBreak ? 'Giờ nghỉ giải lao' : 'Phiên tập trung';
    };

    const toggleFullscreen = () => {
        try {
            if (typeof document !== 'undefined') {
                if (!document.fullscreenElement) {
                    document.documentElement.requestFullscreen().catch(() => {});
                } else {
                    document.exitFullscreen().catch(() => {});
                }
            }
        } catch (_) {}
    };

    return createPortal(
        <div 
            className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in"
            onClick={() => setIsModalOpen(false)}
        >
            <div 
                className="relative w-full max-w-sm sm:max-w-md bg-[#1e2330] border border-slate-800/90 rounded-[28px] shadow-2xl overflow-hidden p-6 sm:p-7 text-white space-y-6 animate-scale-up select-none"
                onClick={e => e.stopPropagation()}
            >
                {/* Header Window Bar */}
                <div className="flex items-center justify-between gap-3 border-b border-slate-800/60 pb-3">
                    <div className="flex items-center gap-2">
                        <span className="text-sm sm:text-base font-bold text-slate-200 tracking-tight">
                            {getHeaderTitle()}
                        </span>
                        {isPaused && (
                            <span className="text-[11px] font-bold font-mono px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                TẠM DỪNG
                            </span>
                        )}
                    </div>

                    <div className="flex items-center gap-1">
                        <button
                            type="button"
                            onClick={toggleFullscreen}
                            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800/80 transition-colors cursor-pointer"
                            title="Toàn màn hình"
                        >
                            <Maximize2 className="w-4 h-4" />
                        </button>
                        <button
                            type="button"
                            onClick={() => setIsModalOpen(false)}
                            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800/80 transition-colors cursor-pointer"
                            title="Thu nhỏ thành widget"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* Main Content Area */}
                {!isRunning && !isPaused ? (
                    /* SETUP VIEW */
                    <div className="space-y-6 text-center">
                        <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-medium px-2">
                            Tự động tạm dừng thông báo trong phiên học. Giúp bạn tập trung tuyệt đối và đạt hiệu suất cao nhất.
                        </p>

                        {/* Centered Stepper Box */}
                        <div className="flex items-center justify-center gap-3 my-2">
                            <div className="bg-slate-800/70 border border-slate-700/70 rounded-2xl p-4 flex items-center gap-4 shadow-inner min-w-[210px] justify-between">
                                <div className="text-left pl-2">
                                    <span className="text-4xl font-extrabold text-white font-mono tracking-tight leading-none block">
                                        {targetMinutes}
                                    </span>
                                    <span className="text-xs font-mono font-bold text-slate-400 uppercase tracking-widest mt-1 block">
                                        phút ({Math.max(1, Math.round(targetMinutes / 25))} phiên)
                                    </span>
                                </div>

                                <div className="flex flex-col gap-1 border-l border-slate-700/80 pl-3">
                                    <button
                                        type="button"
                                        onClick={handleIncrement}
                                        className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                                        title="Tăng 25 phút (1 phiên)"
                                    >
                                        <ChevronUp className="w-5 h-5" />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleDecrement}
                                        className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                                        title="Giảm 25 phút (1 phiên)"
                                    >
                                        <ChevronDown className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Quick Presets: 25, 50, 75, 100 Pomodoro Milestones */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            {[25, 50, 75, 100].map(m => {
                                const count = m / 25;
                                return (
                                    <button
                                        key={m}
                                        type="button"
                                        onClick={() => setTargetMinutes(m)}
                                        className={`py-2 px-2.5 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer flex flex-col items-center justify-center ${
                                            targetMinutes === m
                                                ? 'bg-sky-500 text-slate-950 shadow-md border border-sky-400 font-black scale-105'
                                                : 'bg-slate-800/60 text-slate-300 hover:bg-slate-800 hover:text-white border border-slate-700/50'
                                        }`}
                                    >
                                        <span className="font-extrabold">{m} phút</span>
                                        <span className="text-[10px] opacity-80">{count} phiên</span>
                                    </button>
                                );
                            })}
                        </div>

                        {/* Break Info & Checkbox */}
                        <div className="space-y-3 pt-1">
                            <p className="text-xs text-sky-300 font-medium flex items-center justify-center gap-1.5 px-2">
                                <Coffee className="w-4 h-4 text-sky-400 shrink-0 inline" />
                                <span>{getBreakInfoText(targetMinutes, skipBreaks)}</span>
                            </p>

                            <label className="inline-flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-300 hover:text-white transition-colors select-none">
                                <input
                                    type="checkbox"
                                    checked={skipBreaks}
                                    onChange={e => setSkipBreaks(e.target.checked)}
                                    className="w-4 h-4 rounded border-slate-700 text-sky-500 focus:ring-sky-400 bg-slate-800 cursor-pointer"
                                />
                                <span>Bỏ qua nghỉ ngơi (Không giải lao)</span>
                            </label>
                        </div>

                        {/* Primary Button */}
                        <button
                            type="button"
                            onClick={() => startFocusSession(targetMinutes, skipBreaks)}
                            className="w-full py-3.5 bg-sky-500 hover:bg-sky-400 text-slate-950 font-black rounded-2xl shadow-lg hover:shadow-sky-500/30 transition-all flex items-center justify-center gap-2 text-sm cursor-pointer active:scale-95"
                        >
                            <Play className="w-4 h-4 fill-slate-950" />
                            <span>Bắt đầu phiên tập trung ({targetMinutes} phút)</span>
                        </button>
                    </div>
                ) : (
                    /* ACTIVE TIMER WINDOWS FOCUS DIAL VIEW */
                    <div className="space-y-6 text-center py-1">
                        {/* Circular Dial with 30 Radial Ticks (Matching Windows Focus Session) */}
                        <div 
                            onClick={() => setShowExactSeconds(prev => !prev)}
                            className="relative w-56 h-56 sm:w-60 sm:h-60 mx-auto flex items-center justify-center cursor-pointer group"
                            title="Bấm để chuyển đổi hiển thị phút / giây chi tiết"
                        >
                            <svg className="w-full h-full" viewBox="0 0 200 200">
                                {/* Dial Background Circle */}
                                <circle
                                    cx="100"
                                    cy="100"
                                    r="78"
                                    className="text-slate-800/40"
                                    fill="currentColor"
                                />

                                {/* 30 Radial Ticks */}
                                {Array.from({ length: 30 }).map((_, i) => {
                                    const angle = (i * 12) - 90; // Start at 12 o'clock (top)
                                    const rad = (angle * Math.PI) / 180;
                                    
                                    const currentFraction = totalSeconds > 0 ? (totalSeconds - secondsLeft) / totalSeconds : 0;
                                    const activeTickIndex = Math.min(29, Math.floor(currentFraction * 30));
                                    const isCurrentActive = i === activeTickIndex;
                                    const isPast = i <= activeTickIndex;

                                    // Active tick line is slightly longer and thicker (notch)
                                    const innerR = isCurrentActive ? 64 : 68;
                                    const outerR = isCurrentActive ? 82 : 78;

                                    const x1 = 100 + innerR * Math.cos(rad);
                                    const y1 = 100 + innerR * Math.sin(rad);
                                    const x2 = 100 + outerR * Math.cos(rad);
                                    const y2 = 100 + outerR * Math.sin(rad);

                                    let strokeColor = 'rgba(148, 163, 184, 0.16)';
                                    if (isCurrentActive) {
                                        strokeColor = isBreak ? '#fbbf24' : '#38bdf8';
                                    } else if (isPast) {
                                        strokeColor = isBreak ? 'rgba(251, 191, 36, 0.35)' : 'rgba(56, 189, 248, 0.35)';
                                    }

                                    return (
                                        <line
                                            key={i}
                                            x1={x1}
                                            y1={y1}
                                            x2={x2}
                                            y2={y2}
                                            stroke={strokeColor}
                                            strokeWidth={isCurrentActive ? '4.5' : '2.5'}
                                            strokeLinecap="round"
                                            className="transition-all duration-300"
                                        />
                                    );
                                })}
                            </svg>

                            {/* Center Time Display */}
                            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                {showExactSeconds || secondsLeft < 60 ? (
                                    <div className="flex flex-col items-center justify-center">
                                        <span className="text-4xl sm:text-5xl font-black font-mono tracking-tight text-white animate-fade-in">
                                            {formatTime(secondsLeft)}
                                        </span>
                                        <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest mt-1">
                                            {isBreak ? (currentPeriod?.isLongBreak ? 'Nghỉ dài' : 'Nghỉ ngắn') : 'Còn lại'}
                                        </span>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center">
                                        <div className="flex items-baseline justify-center gap-1.5 font-mono">
                                            <span className="text-5xl sm:text-6xl font-black text-white tracking-tighter">
                                                {displayMinutes}
                                            </span>
                                            <span className="text-xl sm:text-2xl font-bold text-slate-300 font-sans">
                                                phút
                                            </span>
                                        </div>
                                        <span className="text-[11px] font-mono font-semibold text-slate-400 mt-0.5 opacity-80 group-hover:opacity-100 transition-opacity">
                                            {formatTime(secondsLeft)}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Action Controls: Play/Pause + Skip to next period + Direct End Session Button */}
                        <div className="flex items-center justify-center gap-3">
                            {/* Main Cyan Action Button */}
                            {isPaused ? (
                                <button
                                    type="button"
                                    onClick={resumeSession}
                                    className="w-13 h-13 rounded-full bg-sky-400 hover:bg-sky-300 text-slate-950 flex items-center justify-center shadow-lg shadow-sky-500/25 transition-all active:scale-95 cursor-pointer"
                                    title="Tiếp tục"
                                >
                                    <Play className="w-5 h-5 fill-slate-950 ml-0.5" />
                                </button>
                            ) : (
                                <button
                                    type="button"
                                    onClick={pauseSession}
                                    className="w-13 h-13 rounded-full bg-sky-400 hover:bg-sky-300 text-slate-950 flex items-center justify-center shadow-lg shadow-sky-500/25 transition-all active:scale-95 cursor-pointer"
                                    title="Tạm dừng"
                                >
                                    <Pause className="w-5 h-5 fill-slate-950" />
                                </button>
                            )}

                            {/* Skip / Next Period Button */}
                            <button
                                type="button"
                                onClick={skipToNextPeriod}
                                className="w-11 h-11 rounded-full bg-slate-800/90 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center border border-slate-700/80 transition-all active:scale-95 cursor-pointer"
                                title="Chuyển sang phiên tiếp theo"
                            >
                                <SkipForward className="w-4 h-4" />
                            </button>

                            {/* Direct Stop / End Session Button */}
                            <button
                                type="button"
                                onClick={stopSession}
                                className="w-11 h-11 rounded-full bg-slate-800/90 hover:bg-rose-500/20 text-slate-300 hover:text-rose-400 flex items-center justify-center border border-slate-700/80 hover:border-rose-500/30 transition-all active:scale-95 cursor-pointer"
                                title="Kết thúc phiên học"
                            >
                                <Square className="w-4 h-4 fill-current" />
                            </button>
                        </div>

                        {/* Up Next Subtitle in Vietnamese */}
                        <div className="pt-1 text-xs text-slate-400 font-medium flex items-center justify-center gap-1.5">
                            <span>Tiếp theo:</span>
                            <span className="font-bold text-white tracking-wide">
                                {getUpNextText()}
                            </span>
                        </div>
                    </div>
                )}

                {/* Footer Stats Banner */}
                <div className="bg-slate-950/60 border border-slate-800/70 rounded-2xl p-3 flex items-center justify-between text-xs font-mono text-slate-400">
                    <div className="flex items-center gap-1.5">
                        <Flame className="w-4 h-4 text-orange-500" />
                        <span>Đã tích lũy:</span>
                    </div>
                    <span className="font-bold text-sky-400">
                        {stats.completedSessions} phiên ({stats.totalFocusMinutes} phút)
                    </span>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default FocusSessionModal;
