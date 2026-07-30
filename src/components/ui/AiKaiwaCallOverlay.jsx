import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { PhoneOff, Mic, MicOff, MessageSquare, Volume2, Sparkles, Radio, Eye, EyeOff, Activity } from 'lucide-react';
import FuriganaText from './FuriganaText';

const AiKaiwaCallOverlay = ({
    isOpen,
    onClose,
    teacher,
    isAiSpeaking,
    isRecording,
    isGenerating,
    isTranscribing,
    latestAiText,
    latestUserText,
    onToggleMute,
    isMuted
}) => {
    const [showSubtitles, setShowSubtitles] = useState(true);

    if (!isOpen) return null;

    const teacherAvatar = teacher?.avatar || '🌸';
    const teacherName = teacher?.name || 'AI Partner';
    const teacherRole = teacher?.role || 'Neural AI Voice';

    let statusText = '📞 Cuộc gọi AI đang kết nối...';
    let statusBadgeColor = 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30';

    if (isAiSpeaking) {
        statusText = '🗣️ AI đang nói...';
        statusBadgeColor = 'bg-indigo-500/30 text-indigo-300 border-indigo-500/50 animate-pulse';
    } else if (isRecording) {
        statusText = '🎙️ Đang lắng nghe giọng nói...';
        statusBadgeColor = 'bg-rose-500/30 text-rose-300 border-rose-500/50 animate-pulse';
    } else if (isGenerating || isTranscribing) {
        statusText = '🤔 AI đang suy nghĩ...';
        statusBadgeColor = 'bg-amber-500/30 text-amber-300 border-amber-500/50 animate-pulse';
    }

    return createPortal(
        <div className="fixed inset-0 z-[120] bg-slate-950/95 backdrop-blur-xl flex flex-col justify-between p-4 sm:p-6 animate-fade-in font-sans text-white h-[100dvh] overflow-hidden">
            
            {/* Header Telemetry Bar */}
            <div className="flex items-center justify-between z-10 gap-2">
                <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-emerald-500 animate-ping shrink-0"></span>
                    <span className="text-[10px] sm:text-xs font-mono font-bold tracking-widest text-slate-400 uppercase truncate">
                        FACETIME AI KAIWA CALL
                    </span>
                </div>
                <button
                    onClick={() => setShowSubtitles(!showSubtitles)}
                    className="px-3.5 py-2.5 min-h-[44px] rounded-xl bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer select-none active:scale-95 shrink-0"
                >
                    {showSubtitles ? <Eye className="w-4 h-4 text-cyan-400" /> : <EyeOff className="w-4 h-4 text-slate-500" />}
                    <span>Phụ Đề: {showSubtitles ? 'BẬT' : 'TẮT'}</span>
                </button>
            </div>

            {/* Central Call Avatar HUD */}
            <div className="flex flex-col items-center justify-center space-y-5 sm:space-y-6 my-auto z-10 py-2">
                
                {/* Glowing Avatar Orb */}
                <div className="relative flex items-center justify-center">
                    {/* Outer Wave Pulse Rings */}
                    {isAiSpeaking && (
                        <>
                            <div className="absolute w-40 h-40 sm:w-48 sm:h-48 rounded-full bg-cyan-500/20 animate-ping pointer-events-none"></div>
                            <div className="absolute w-32 h-32 sm:w-40 sm:h-40 rounded-full bg-indigo-500/30 animate-pulse pointer-events-none"></div>
                        </>
                    )}
                    {isRecording && (
                        <div className="absolute w-36 h-36 sm:w-44 sm:h-44 rounded-full bg-rose-500/25 animate-ping pointer-events-none"></div>
                    )}

                    {/* Avatar Container */}
                    <div className="w-28 h-28 sm:w-36 sm:h-36 rounded-full bg-gradient-to-tr from-cyan-500 via-indigo-600 to-purple-600 p-1 shadow-2xl shadow-cyan-500/30 relative z-10 flex items-center justify-center">
                        <div className="w-full h-full rounded-full bg-slate-900 flex items-center justify-center text-5xl sm:text-6xl shadow-inner border border-white/10">
                            {teacherAvatar}
                        </div>
                    </div>
                </div>

                {/* Info Text */}
                <div className="text-center space-y-1.5 sm:space-y-2">
                    <h2 className="text-xl sm:text-2xl font-black font-mono tracking-tight text-white flex items-center justify-center gap-2">
                        {teacherName}
                    </h2>
                    <p className="text-xs font-mono text-slate-400">{teacherRole}</p>

                    {/* Status Badge */}
                    <div className="pt-1 sm:pt-2">
                        <span className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-mono font-extrabold border ${statusBadgeColor}`}>
                            <Activity className="w-3.5 h-3.5" />
                            {statusText}
                        </span>
                    </div>
                </div>

                {/* Subtitle Telemetry Display */}
                {showSubtitles && (latestAiText || latestUserText) && (
                    <div className="w-full max-w-lg p-3.5 sm:p-4 rounded-2xl sm:rounded-3xl bg-slate-900/80 border border-slate-800/80 backdrop-blur-md space-y-2 text-center shadow-xl">
                        {latestAiText && (
                            <p className="text-xs sm:text-sm font-bold text-cyan-300 font-japanese leading-relaxed">
                                <FuriganaText text={latestAiText} />
                            </p>
                        )}
                        {latestUserText && (
                            <p className="text-xs font-medium text-slate-400 italic font-japanese">
                                Bạn: "{latestUserText}"
                            </p>
                        )}
                    </div>
                )}
            </div>

            {/* Bottom Controls Panel */}
            <div className="flex items-center justify-center gap-5 sm:gap-6 pb-4 sm:pb-6 z-10">
                {/* Mute Button */}
                <button
                    onClick={onToggleMute}
                    className={`w-14 h-14 sm:w-16 sm:h-16 min-h-[56px] min-w-[56px] rounded-full flex items-center justify-center transition-all shadow-lg cursor-pointer select-none active:scale-95 ${
                        isMuted 
                            ? 'bg-rose-600 text-white shadow-rose-600/30' 
                            : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                    }`}
                    title={isMuted ? "Bật lại Micro" : "Tắt tiếng Micro"}
                >
                    {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
                </button>

                {/* End Call Button (Big Red Button) */}
                <button
                    onClick={onClose}
                    className="w-16 h-16 sm:w-20 sm:h-20 min-h-[64px] min-w-[64px] rounded-full bg-rose-600 hover:bg-rose-500 text-white flex items-center justify-center shadow-2xl shadow-rose-600/40 hover:scale-105 active:scale-95 transition-all cursor-pointer select-none"
                    title="Kết thúc cuộc gọi AI"
                >
                    <PhoneOff className="w-7 h-7 sm:w-8 sm:h-8" />
                </button>

                {/* Switch to Text Chat */}
                <button
                    onClick={onClose}
                    className="w-14 h-14 sm:w-16 sm:h-16 min-h-[56px] min-w-[56px] rounded-full bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center justify-center transition-all shadow-lg cursor-pointer select-none active:scale-95"
                    title="Chuyển sang màn hình nhắn tin văn bản"
                >
                    <MessageSquare className="w-6 h-6" />
                </button>
            </div>
        </div>,
        document.body
    );
};

export default AiKaiwaCallOverlay;
