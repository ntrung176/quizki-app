import React from 'react';
import { Play, Clock, MessageSquare, Flame, BookOpen } from 'lucide-react';
import { KAIWA_CATEGORIES } from './videoKaiwaConstants';
import { useLanguage } from '../../context/LanguageContext';

const VideoKaiwaHeroBanner = ({
    video,
    onSelectVideo,
    formatDuration
}) => {
    const { t } = useLanguage();
    if (!video) return null;

    const categoryMeta = KAIWA_CATEGORIES.find(c => c.id === video.category);
    const subCount = video.subtitles?.length || 0;
    const thumbnailSrc = video.thumbnail || (video.youtubeId ? `https://img.youtube.com/vi/${video.youtubeId}/hqdefault.jpg` : '');

    return (
        <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-slate-900 dark:bg-slate-950 border-2 border-b-4 border-slate-800 shadow-md group select-none">
            {/* Background Backdrop Image with Rich Cinematic Gradients */}
            <div className="absolute inset-0 z-0 overflow-hidden">
                {thumbnailSrc ? (
                    <img
                        src={thumbnailSrc}
                        alt={video.title}
                        className="w-full h-full object-cover object-center scale-105 filter blur-xs group-hover:scale-110 transition-transform duration-700 opacity-35 dark:opacity-25"
                    />
                ) : (
                    <div className="w-full h-full bg-slate-900 opacity-40" />
                )}
                <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/85 to-transparent z-10" />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent z-10" />
                <div className="absolute top-0 right-0 w-64 h-64 bg-pink-500/10 rounded-full blur-3xl pointer-events-none z-10" />
            </div>

            {/* Foreground Content Container - Sleek & Compact */}
            <div className="relative z-20 p-3.5 sm:p-4 md:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 max-w-7xl mx-auto">
                {/* Left Side: Metadata, Title, Description, CTAs */}
                <div className="max-w-2xl space-y-2 sm:space-y-2.5">
                    {/* Top Badges */}
                    <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                        <span className="px-2.5 py-0.5 rounded-full bg-[#f494bc] text-slate-950 text-[11px] font-black uppercase tracking-wider flex items-center gap-1 shadow-xs">
                            <Flame className="w-3 h-3 fill-slate-950 text-slate-950" />
                            <span>{t('videoKaiwa.featuredToday', 'Nổi Bật Hôm Nay')}</span>
                        </span>

                        {video.level && (
                            <span className="px-2 py-0.5 rounded-lg bg-slate-900/90 text-white border border-slate-700/80 text-[11px] font-black uppercase tracking-wider">
                                {t('videoKaiwa.levelPrefix', 'Cấp độ {level}').replace('{level}', video.level)}
                            </span>
                        )}

                        {categoryMeta && (
                            <span className="px-2 py-0.5 rounded-lg bg-slate-900/80 text-slate-300 border border-slate-700/60 text-[11px] font-bold flex items-center gap-1">
                                <span>{categoryMeta.title || categoryMeta.label}</span>
                            </span>
                        )}
                    </div>

                    {/* Main Title */}
                    <div className="space-y-1">
                        <h1 className="text-base sm:text-lg md:text-xl font-black text-white tracking-tight leading-tight line-clamp-1 sm:line-clamp-2 drop-shadow-xs">
                            {video.title}
                        </h1>
                        <p className="text-xs text-slate-300 font-medium line-clamp-1 sm:line-clamp-2 leading-relaxed max-w-xl">
                            {video.description || video.channelTitle || t('videoKaiwa.bannerDescDefault', 'Luyện nghe phản xạ tiếng Nhật thực tế với phụ đề tương tác song ngữ và tra từ điển tức thì.')}
                        </p>
                    </div>

                    {/* Quick Stats & Action Button in one compact row */}
                    <div className="flex items-center gap-3 sm:gap-4 pt-1 flex-wrap">
                        <button
                            onClick={() => onSelectVideo?.(video)}
                            className="px-4 py-2 sm:px-5 sm:py-2.5 rounded-xl sm:rounded-2xl bg-emerald-500 hover:bg-emerald-400 border-b-4 border-emerald-700 active:translate-y-0.5 active:border-b-0 text-white font-black text-xs uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer select-none shadow-xs"
                        >
                            <Play className="w-3.5 h-3.5 fill-white text-white ml-0.5" />
                            <span>{t('videoKaiwa.studyThisVideoNow', 'Học Video Này Ngay')}</span>
                        </button>

                        <div className="flex items-center gap-3 text-xs font-bold text-slate-400">
                            <span className="flex items-center gap-1 text-slate-200 font-mono">
                                <Clock className="w-3.5 h-3.5 text-slate-400" />
                                <span>{formatDuration ? formatDuration(video.duration) : '05:00'}</span>
                            </span>
                            <span className="flex items-center gap-1 text-slate-300">
                                <MessageSquare className="w-3.5 h-3.5 text-slate-400" />
                                <span>{t('videoKaiwa.bilingualLinesCount', '{count} câu thoại song ngữ').replace('{count}', subCount)}</span>
                            </span>
                        </div>
                    </div>
                </div>

                {/* Right Side: Visual Poster Preview Card (Desktop) */}
                <div
                    onClick={() => onSelectVideo?.(video)}
                    className="hidden md:block w-48 lg:w-56 shrink-0 aspect-video rounded-xl sm:rounded-2xl overflow-hidden border-2 border-white/10 shadow-lg relative group/card cursor-pointer transform hover:scale-102 transition-all duration-300"
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
                        <div className="w-10 h-10 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-md ring-3 ring-white/30 group-hover/card:scale-110 transition-all duration-300">
                            <Play className="w-5 h-5 fill-white ml-0.5 text-white" />
                        </div>
                    </div>
                    <div className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 rounded-md bg-black/80 text-white font-mono text-[9px] font-bold">
                        {formatDuration ? formatDuration(video.duration) : '05:00'}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default VideoKaiwaHeroBanner;
