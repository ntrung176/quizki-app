import React from 'react';
import { Play, Sparkles, Clock, MessageSquare, Flame, BookOpen } from 'lucide-react';
import { KAIWA_CATEGORIES } from './videoKaiwaConstants';

const VideoKaiwaHeroBanner = ({
    video,
    onSelectVideo,
    formatDuration
}) => {
    if (!video) return null;

    const categoryMeta = KAIWA_CATEGORIES.find(c => c.id === video.category);
    const subCount = video.subtitles?.length || 0;
    const thumbnailSrc = video.thumbnail || (video.youtubeId ? `https://img.youtube.com/vi/${video.youtubeId}/hqdefault.jpg` : '');

    return (
        <div className="relative overflow-hidden rounded-3xl bg-slate-900 dark:bg-slate-950 border border-slate-200/90 dark:border-slate-800 shadow-xl dark:shadow-2xl group select-none">
            {/* Background Backdrop Image with Rich Cinematic Gradients */}
            <div className="absolute inset-0 z-0 overflow-hidden">
                {thumbnailSrc ? (
                    <img
                        src={thumbnailSrc}
                        alt={video.title}
                        className="w-full h-full object-cover object-center scale-105 filter blur-xs group-hover:scale-110 transition-transform duration-700 opacity-40 dark:opacity-30"
                    />
                ) : (
                    <div className="w-full h-full bg-slate-900 opacity-40" />
                )}
                <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/85 to-transparent z-10" />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent z-10" />
                <div className="absolute top-0 right-0 w-96 h-96 bg-pink-500/15 dark:bg-pink-500/10 rounded-full blur-3xl pointer-events-none z-10" />
            </div>

            {/* Foreground Content Container */}
            <div className="relative z-20 p-5 sm:p-7 md:p-9 flex flex-col md:flex-row md:items-center justify-between gap-6 max-w-7xl mx-auto">
                {/* Left Side: Metadata, Title, Description, CTAs */}
                <div className="max-w-2xl space-y-3.5 sm:space-y-4">
                    {/* Top Badges */}
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-3 py-1 rounded-full bg-[#f494bc] text-slate-950 text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-[0_4px_14px_rgba(244,148,188,0.5)]">
                            <Flame className="w-3.5 h-3.5 fill-slate-950 text-slate-950" />
                            <span>Nổi Bật Hôm Nay</span>
                        </span>

                        {video.level && (
                            <span className="px-2.5 py-1 rounded-xl bg-slate-900/90 text-white border border-slate-700/80 text-xs font-black uppercase tracking-wider shadow">
                                Cấp độ {video.level}
                            </span>
                        )}

                        {categoryMeta && (
                            <span className="px-2.5 py-1 rounded-xl bg-slate-900/80 text-slate-300 border border-slate-700/60 text-xs font-bold flex items-center gap-1">
                                <span>{categoryMeta.title || categoryMeta.label}</span>
                            </span>
                        )}
                    </div>

                    {/* Main Title */}
                    <div className="space-y-1.5">
                        <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-black text-white tracking-tight leading-tight line-clamp-2 drop-shadow-md">
                            {video.title}
                        </h1>
                        <p className="text-xs sm:text-sm text-slate-300 font-medium line-clamp-2 leading-relaxed max-w-xl">
                            {video.description || video.channelTitle || 'Luyện nghe phản xạ tiếng Nhật thực tế với phụ đề tương tác song ngữ và tra từ điển tức thì.'}
                        </p>
                    </div>

                    {/* Quick Stats */}
                    <div className="flex items-center gap-4 text-xs font-bold text-slate-400 pt-1">
                        <span className="flex items-center gap-1.5 text-slate-200 font-mono">
                            <Clock className="w-4 h-4 text-slate-400" />
                            <span>{formatDuration ? formatDuration(video.duration) : '05:00'}</span>
                        </span>
                        <span className="flex items-center gap-1.5 text-slate-300">
                            <MessageSquare className="w-4 h-4 text-slate-400" />
                            <span>{subCount} câu thoại song ngữ</span>
                        </span>
                    </div>

                    {/* Action CTA Buttons */}
                    <div className="flex items-center gap-3 pt-2 flex-wrap">
                        <button
                            onClick={() => onSelectVideo?.(video)}
                            className="px-7 py-3 rounded-full bg-[#f494bc] hover:bg-[#f6a0c5] text-slate-950 font-black text-xs sm:text-sm flex items-center gap-2.5 shadow-[0_8px_20px_rgba(244,148,188,0.45)] hover:shadow-[0_12px_28px_rgba(244,148,188,0.75)] transition-all duration-300 transform hover:scale-[1.03] active:scale-95 cursor-pointer"
                        >
                            <Play className="w-4 h-4 sm:w-4.5 sm:h-4.5 fill-slate-950 text-slate-950 ml-0.5" />
                            <span>Học Video Này Ngay</span>
                        </button>
                    </div>
                </div>

                {/* Right Side: Visual Poster Preview Card (Desktop) */}
                <div
                    onClick={() => onSelectVideo?.(video)}
                    className="hidden md:block w-72 lg:w-80 shrink-0 aspect-video rounded-2xl overflow-hidden border-2 border-white/10 shadow-2xl relative group/card cursor-pointer transform hover:scale-105 transition-all duration-300"
                >
                    {thumbnailSrc ? (
                        <img
                            src={thumbnailSrc}
                            alt={video.title}
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        <div className="w-full h-full bg-slate-900" />
                    )}
                    <div className="absolute inset-0 bg-black/40 group-hover/card:bg-black/20 transition-colors flex items-center justify-center">
                        <div className="w-14 h-14 rounded-full bg-[#f494bc] text-slate-950 flex items-center justify-center shadow-[0_8px_24px_rgba(244,148,188,0.6)] ring-4 ring-white/30 group-hover/card:scale-110 group-hover/card:shadow-[0_12px_30px_rgba(244,148,188,0.85)] transition-all duration-300">
                            <Play className="w-7 h-7 fill-slate-950 ml-0.5 text-slate-950" />
                        </div>
                    </div>
                    <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded-md bg-black/80 text-white font-mono text-[10px] font-bold">
                        {formatDuration ? formatDuration(video.duration) : '05:00'}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default VideoKaiwaHeroBanner;
