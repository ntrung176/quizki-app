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
        <div className="fixed inset-0 z-[120] bg-slate-950/95 backdrop-blur-xl flex flex-col justify-between p-6 animate-fade-in font-sans text-white">
            
            {/* Header Telemetry Bar */}
            <div className="flex items-center justify-between z-10">
                <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-emerald-500 animate-ping"></span>
                    <span className="text-xs font-mono font-bold tracking-widest text-slate-400 uppercase">
                        FACETIME AI KAIWA CALL
                    </span>
                </div>
                <button
                    onClick={() => setShowSubtitles(!showSubtitles)}
                    className="px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                >
                    {showSubtitles ? <Eye className="w-3.5 h-3.5 text-cyan-400" /> : <EyeOff className="w-3.5 h-3.5 text-slate-500" />}
                    <span>Phụ Đề: {showSubtitles ? 'BẬT' : 'TẮT'}</span>
                </button>
            </div>

            {/* Central Call Avatar HUD */}
            <div className="flex flex-col items-center justify-center space-y-6 my-auto z-10">
                
                {/* Glowing Avatar Orb */}
                <div className="relative flex items-center justify-center">
                    {/* Outer Wave Pulse Rings */}
                    {isAiSpeaking && (
                        <>
                            <div className="absolute w-48 h-48 rounded-full bg-cyan-500/20 animate-ping pointer-events-none"></div>
                            <div className="absolute w-40 h-40 rounded-full bg-indigo-500/30 animate-pulse pointer-events-none"></div>
                        </>
                    )}
                    {isRecording && (
                        <div className="absolute w-44 h-44 rounded-full bg-rose-500/25 animate-ping pointer-events-none"></div>
                    )}

                    {/* Avatar Container */}
                    <div className="w-32 h-32 rounded-full bg-gradient-to-tr from-cyan-500 via-indigo-600 to-purple-600 p-1 shadow-2xl shadow-cyan-500/30 relative z-10 flex items-center justify-center">
                        <div className="w-full h-full rounded-full bg-slate-900 flex items-center justify-center text-6xl shadow-inner border border-white/10">
                            {teacherAvatar}
                        </div>
                    </div>
                </div>

                {/* Info Text */}
                <div className="text-center space-y-2">
                    <h2 className="text-2xl font-black font-mono tracking-tight text-white flex items-center justify-center gap-2">
                        {teacherName}
                    </h2>
                    <p className="text-xs font-mono text-slate-400">{teacherRole}</p>

                    {/* Status Badge */}
                    <div className="pt-2">
                        <span className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-mono font-extrabold border ${statusBadgeColor}`}>
                            <Activity className="w-3.5 h-3.5" />
                            {statusText}
                        </span>
                    </div>
                </div>

                {/* Subtitle Telemetry Display */}
                {showSubtitles && (latestAiText || latestUserText) && (
                    <div className="w-full max-w-lg p-4 rounded-3xl bg-slate-900/80 border border-slate-800/80 backdrop-blur-md space-y-2 text-center shadow-xl">
                        {latestAiText && (
                            <p className="text-sm font-bold text-cyan-300 font-japanese leading-relaxed">
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
            <div className="flex items-center justify-center gap-6 pb-4 z-10">
                {/* Mute Button */}
                <button
                    onClick={onToggleMute}
                    className={`w-14 h-14 rounded-full flex items-center justify-center transition-all shadow-lg cursor-pointer ${
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
                    className="w-16 h-16 rounded-full bg-rose-600 hover:bg-rose-500 text-white flex items-center justify-center shadow-2xl shadow-rose-600/40 hover:scale-110 active:scale-95 transition-all cursor-pointer"
                    title="Kết thúc cuộc gọi AI"
                >
                    <PhoneOff className="w-7 h-7" />
                </button>

                {/* Switch to Text Chat */}
                <button
                    onClick={onClose}
                    className="w-14 h-14 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center justify-center transition-all shadow-lg cursor-pointer"
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
