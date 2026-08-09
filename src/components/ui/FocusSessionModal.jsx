import React from 'react';
import { createPortal } from 'react-dom';
import { X, Play, Pause, Square, ChevronUp, ChevronDown, Target, Coffee, Flame, Check, Sparkles, Clock, BellOff } from 'lucide-react';
import { useFocus } from '../../context/FocusContext';
import { useLanguage } from '../../context/LanguageContext';

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
        startFocusSession,
        pauseSession,
        resumeSession,
        stopSession,
        formatTime,
        getBreakInfoText
    } = useFocus();

    const { t } = useLanguage();

    if (!isModalOpen) return null;

    const handleIncrement = () => {
        setTargetMinutes(prev => Math.min(180, prev + 5));
    };

    const handleDecrement = () => {
        setTargetMinutes(prev => Math.max(5, prev - 5));
    };

    const isRunning = status === 'focusing' || status === 'break';
    const isPaused = status === 'paused';

    // SVG Circular Progress calculation
    const progressPercent = totalSeconds > 0 ? ((totalSeconds - secondsLeft) / totalSeconds) * 100 : 0;
    const strokeDashoffset = 440 - (440 * progressPercent) / 100;

    return createPortal(
        <div 
            className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md animate-fade-in"
            onClick={() => setIsModalOpen(false)}
        >
            <div 
                className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden p-6 sm:p-7 text-white space-y-6 animate-scale-up"
                onClick={e => e.stopPropagation()}
            >
                {/* Header Window Bar */}
                <div className="flex items-start justify-between gap-3 border-b border-slate-800 pb-4">
                    <div className="flex items-center gap-2.5">
                        <div className="w-10 h-10 rounded-2xl bg-purple-500/20 text-purple-400 border border-purple-500/30 flex items-center justify-center font-bold shadow-inner">
                            🎯
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-white tracking-tight">
                                {isRunning ? (currentMode === 'focus' ? 'Phiên Tập Trung' : 'Giờ Nghỉ Giải Lao') : 'Sẵn sàng tập trung'}
                            </h3>
                            <p className="text-xs text-slate-400">
                                {isRunning ? 'Tắt thông báo & tập trung 100% học tập' : 'Get ready to focus'}
                            </p>
                        </div>
                    </div>

                    <button
                        onClick={() => setIsModalOpen(false)}
                        className="p-2 text-slate-400 hover:text-white rounded-full hover:bg-slate-800 transition-colors cursor-pointer"
                        title="Đóng"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Main Body */}
                {!isRunning && !isPaused ? (
                    /* SETUP VIEW (Matching Image 2) */
                    <div className="space-y-6 text-center">
                        <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-medium px-2">
                            Tự động tạm dừng thông báo trong phiên học. Giúp bạn tập trung tuyệt đối và đạt hiệu suất cao nhất.
                        </p>

                        {/* Centered Stepper Box (Exact style from Image 2) */}
                        <div className="flex items-center justify-center gap-3 my-2">
                            <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 flex items-center gap-4 shadow-inner min-w-[200px] justify-between">
                                <div className="text-left pl-2">
                                    <span className="text-4xl font-extrabold text-white font-mono tracking-tight leading-none block">
                                        {targetMinutes}
                                    </span>
                                    <span className="text-xs font-mono font-bold text-slate-400 uppercase tracking-widest mt-1 block">
                                        phút
                                    </span>
                                </div>

                                <div className="flex flex-col gap-1 border-l border-slate-700/80 pl-3">
                                    <button
                                        type="button"
                                        onClick={handleIncrement}
                                        className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                                        title="Tăng 5 phút"
                                    >
                                        <ChevronUp className="w-5 h-5" />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleDecrement}
                                        className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                                        title="Giảm 5 phút"
                                    >
                                        <ChevronDown className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Quick Presets */}
                        <div className="flex items-center justify-center gap-2 flex-wrap">
                            {[15, 25, 40, 60].map(m => (
                                <button
                                    key={m}
                                    type="button"
                                    onClick={() => setTargetMinutes(m)}
                                    className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer ${
                                        targetMinutes === m
                                            ? 'bg-purple-600 text-white shadow-md border border-purple-400/50'
                                            : 'bg-slate-800/60 text-slate-400 hover:bg-slate-800 hover:text-white border border-slate-700/50'
                                    }`}
                                >
                                    {m === 25 ? '25m (Pomodoro)' : `${m}m`}
                                </button>
                            ))}
                        </div>

                        {/* Break Info & Checkbox */}
                        <div className="space-y-3 pt-1">
                            <p className="text-xs text-purple-300 font-medium flex items-center justify-center gap-1.5">
                                <Coffee className="w-4 h-4 text-purple-400 inline" />
                                {getBreakInfoText(targetMinutes, skipBreaks)}
                            </p>

                            <label className="inline-flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-300 hover:text-white transition-colors select-none">
                                <input
                                    type="checkbox"
                                    checked={skipBreaks}
                                    onChange={e => setSkipBreaks(e.target.checked)}
                                    className="w-4 h-4 rounded border-slate-700 text-purple-600 focus:ring-purple-500 bg-slate-800 cursor-pointer"
                                />
                                <span>Bỏ qua nghỉ ngơi (Skip breaks)</span>
                            </label>
                        </div>

                        {/* Primary Button */}
                        <button
                            type="button"
                            onClick={() => startFocusSession(targetMinutes, skipBreaks)}
                            className="w-full py-3.5 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-2xl shadow-lg hover:shadow-purple-600/30 transition-all flex items-center justify-center gap-2 text-sm cursor-pointer active:scale-95"
                        >
                            <Play className="w-4 h-4 fill-white" />
                            <span>Bắt đầu phiên tập trung ({targetMinutes} phút)</span>
                        </button>
                    </div>
                ) : (
                    /* ACTIVE TIMER COUNTDOWN VIEW */
                    <div className="space-y-6 text-center py-2">
                        {/* Status Badge */}
                        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-purple-500/15 border border-purple-500/30 text-purple-300 text-xs font-mono font-bold animate-pulse">
                            {currentMode === 'focus' ? (
                                <>
                                    <Target className="w-3.5 h-3.5 text-purple-400" />
                                    <span>🎯 ĐANG TẬP TRUNG</span>
                                </>
                            ) : (
                                <>
                                    <Coffee className="w-3.5 h-3.5 text-amber-400" />
                                    <span>☕ ĐANG NGHỈ GIẢI LAO</span>
                                </>
                            )}
                            {isPaused && <span className="text-amber-400 ml-1">(TẠM DỪNG)</span>}
                        </div>

                        {/* Circular Progress Countdown */}
                        <div className="relative w-48 h-48 mx-auto flex items-center justify-center">
                            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 160 160">
                                <circle
                                    cx="80"
                                    cy="80"
                                    r="70"
                                    stroke="currentColor"
                                    strokeWidth="10"
                                    className="text-slate-800"
                                    fill="transparent"
                                />
                                <circle
                                    cx="80"
                                    cy="80"
                                    r="70"
                                    stroke="currentColor"
                                    strokeWidth="10"
                                    className={currentMode === 'focus' ? 'text-purple-500 transition-all duration-1000' : 'text-amber-500 transition-all duration-1000'}
                                    fill="transparent"
                                    strokeDasharray="440"
                                    strokeDashoffset={strokeDashoffset}
                                    strokeLinecap="round"
                                />
                            </svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <span className="text-4xl font-extrabold font-mono tracking-tighter text-white">
                                    {formatTime(secondsLeft)}
                                </span>
                                <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest mt-1">
                                    {currentMode === 'focus' ? 'Còn lại' : 'Giờ nghỉ'}
                                </span>
                            </div>
                        </div>

                        {/* Action Controls */}
                        <div className="flex items-center justify-center gap-3">
                            {isPaused ? (
                                <button
                                    type="button"
                                    onClick={resumeSession}
                                    className="flex-1 py-3 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-2xl shadow-md transition-all flex items-center justify-center gap-2 text-xs cursor-pointer"
                                >
                                    <Play className="w-4 h-4 fill-white" />
                                    <span>Tiếp tục</span>
                                </button>
                            ) : (
                                <button
                                    type="button"
                                    onClick={pauseSession}
                                    className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-2xl border border-slate-700 transition-all flex items-center justify-center gap-2 text-xs cursor-pointer"
                                >
                                    <Pause className="w-4 h-4 fill-slate-200" />
                                    <span>Tạm dừng</span>
                                </button>
                            )}

                            <button
                                type="button"
                                onClick={stopSession}
                                className="px-4 py-3 bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-400 font-bold rounded-2xl transition-all flex items-center justify-center gap-1.5 text-xs cursor-pointer"
                                title="Kết thúc phiên"
                            >
                                <Square className="w-4 h-4 fill-rose-400" />
                                <span>Kết thúc</span>
                            </button>
                        </div>
                    </div>
                )}

                {/* Footer Stats Banner */}
                <div className="bg-slate-950/70 border border-slate-800/80 rounded-2xl p-3 flex items-center justify-between text-xs font-mono text-slate-400">
                    <div className="flex items-center gap-1.5">
                        <Flame className="w-4 h-4 text-orange-500" />
                        <span>Đã tích lũy:</span>
                    </div>
                    <span className="font-bold text-purple-300">
                        {stats.completedSessions} phiên ({stats.totalFocusMinutes} phút)
                    </span>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default FocusSessionModal;
