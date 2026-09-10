import React from 'react';
import { Play, Layers, Edit3, Trash2, Sparkles, MessageSquare, Clock, Film, HardDrive, Video } from 'lucide-react';
import { KAIWA_LEVELS, KAIWA_CATEGORIES } from './videoKaiwaConstants';

const LEVEL_COLOR_MAP = {
    N5: 'bg-emerald-500 text-white shadow-emerald-500/20',
    N4: 'bg-cyan-500 text-white shadow-cyan-500/20',
    N3: 'bg-amber-500 text-slate-950 shadow-amber-500/20',
    N2: 'bg-indigo-500 text-white shadow-indigo-500/20',
    N1: 'bg-rose-500 text-white shadow-rose-500/20',
};

const VideoKaiwaMovieCard = ({
    video,
    onSelectVideo,
    userIsAdmin,
    onEditVideo,
    onDeleteVideo,
    formatDuration,
    cardWidthClass = 'w-64 sm:w-72 md:w-80 shrink-0'
}) => {
    if (!video) return null;

    const levelBadgeColor = LEVEL_COLOR_MAP[video.level] || 'bg-amber-500 text-slate-950';
    const subCount = video.subtitles?.length || 0;
    const categoryMeta = KAIWA_CATEGORIES.find(c => c.id === video.category);
    const isFileSource = Boolean(video.videoUrl || video.fileUrl || video.videoType === 'file' || !video.youtubeId);
    const thumbnailSrc = video.thumbnail || (video.youtubeId ? `https://img.youtube.com/vi/${video.youtubeId}/hqdefault.jpg` : '');

    return (
        <div
            onClick={() => onSelectVideo?.(video)}
            className={`group relative flex flex-col bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl border border-slate-200/90 dark:border-slate-800/90 shadow-xs hover:shadow-[0_12px_28px_rgba(0,0,0,0.08)] dark:shadow-none dark:hover:shadow-[0_12px_28px_rgba(0,0,0,0.5)] hover:border-pink-300 dark:hover:border-pink-500/50 transition-all duration-300 overflow-hidden cursor-pointer select-none ${cardWidthClass}`}
        >
            {/* Thumbnail Poster with Cinema Overlay */}
            <div className="relative aspect-video bg-slate-950 overflow-hidden flex items-center justify-center">
                {thumbnailSrc ? (
                    <img
                        src={thumbnailSrc}
                        alt={video.title}
                        loading="lazy"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                ) : (
                    <div className="w-full h-full bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 flex flex-col items-center justify-center text-slate-500">
                        <Film className="w-10 h-10 text-amber-500/70" />
                        <span className="text-[10px] font-bold mt-1 text-slate-400">Video Bài Học</span>
                    </div>
                )}

                {/* Smooth Vignette */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20 opacity-70 group-hover:opacity-85 transition-opacity duration-300" />

                {/* Center Hover Play Button */}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 transform scale-75 group-hover:scale-100">
                    <div className="w-12 h-12 rounded-full bg-[#f494bc] text-slate-950 flex items-center justify-center shadow-[0_8px_20px_rgba(244,148,188,0.6)] ring-4 ring-white/30 group-hover:shadow-[0_12px_28px_rgba(244,148,188,0.85)] transition-all duration-300">
                        <Play className="w-6 h-6 fill-slate-950 ml-0.5 text-slate-950" />
                    </div>
                </div>

                {/* Top Floating Badges */}
                <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between gap-1.5 pointer-events-none">
                    {/* JLPT Level Pill */}
                    <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider shadow-md ${levelBadgeColor}`}>
                        {video.level || 'JLPT'}
                    </span>

                    {/* Source & Category Badge */}
                    <div className="flex items-center gap-1">
                        {isFileSource ? (
                            <span className="px-1.5 py-0.5 rounded-md bg-amber-500/90 text-slate-950 text-[9px] font-black uppercase tracking-wider shadow-md flex items-center gap-1">
                                <HardDrive className="w-2.5 h-2.5" /> File
                            </span>
                        ) : (
                            <span className="px-1.5 py-0.5 rounded-md bg-red-600/90 text-white text-[9px] font-black uppercase tracking-wider shadow-md flex items-center gap-1">
                                <Video className="w-2.5 h-2.5" /> YT
                            </span>
                        )}

                        {categoryMeta && (
                            <span className="px-2 py-0.5 rounded-lg bg-slate-900/90 backdrop-blur-md text-white border border-slate-700/80 text-[9px] font-bold tracking-tight shadow-md max-w-[130px] truncate">
                                {categoryMeta.title || categoryMeta.label}
                            </span>
                        )}
                    </div>
                </div>

                {/* Bottom Floating Badges */}
                <div className="absolute bottom-2 left-2.5 right-2.5 flex items-center justify-between pointer-events-none">
                    {/* Dialogue Count */}
                    <span className="px-2 py-0.5 rounded-md bg-black/80 backdrop-blur-md text-white border border-slate-700/60 text-[10px] font-bold flex items-center gap-1">
                        <MessageSquare className="w-3 h-3 text-slate-300" />
                        <span>{subCount} câu</span>
                    </span>

                    {/* Duration */}
                    <span className="px-2 py-0.5 rounded-md bg-black/85 backdrop-blur-md text-slate-200 font-mono text-[10px] font-bold flex items-center gap-1">
                        <Clock className="w-2.5 h-2.5 text-slate-400" />
                        <span>{formatDuration ? formatDuration(video.duration) : `${Math.floor((video.duration || 0) / 60)}:${String((video.duration || 0) % 60).padStart(2, '0')}`}</span>
                    </span>
                </div>
            </div>

            {/* Video Meta Info */}
            <div className="p-3.5 sm:p-4 flex-1 flex flex-col justify-between space-y-2 bg-white dark:bg-slate-900">
                <div className="space-y-1">
                    <h3 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white line-clamp-2 group-hover:text-pink-600 dark:group-hover:text-pink-300 transition-colors leading-snug">
                        {video.title}
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1 leading-relaxed">
                        {video.channelTitle || video.description || 'Học tiếng Nhật qua video'}
                    </p>
                </div>

                {/* Admin Quick Action Controls */}
                {userIsAdmin && (
                    <div
                        className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800/80 text-[11px] text-slate-400"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Admin</span>
                        <div className="flex items-center gap-1">
                            <button
                                type="button"
                                onClick={() => onEditVideo?.(video)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition cursor-pointer"
                                title="Chỉnh sửa video"
                            >
                                <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                                type="button"
                                onClick={(e) => onDeleteVideo?.(e, video.id)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
                                title="Xóa video"
                            >
                                <Trash2 className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default VideoKaiwaMovieCard;
