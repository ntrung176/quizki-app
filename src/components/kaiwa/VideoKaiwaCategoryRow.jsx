import React, { useRef, useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, ArrowRight, Plus, Sparkles } from 'lucide-react';
import VideoKaiwaMovieCard from './VideoKaiwaMovieCard';

const VideoKaiwaCategoryRow = ({
    title,
    titleGradient = 'from-[#00d2ff] via-[#70bbfd] to-[#bfdbfe]',
    videos = [],
    onSelectVideo,
    onViewAll,
    userIsAdmin,
    onEditVideo,
    onDeleteVideo,
    onAddNewVideo,
    formatDuration
}) => {
    const rowRef = useRef(null);
    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(false);

    const checkScrollButtons = () => {
        if (!rowRef.current) return;
        const { scrollLeft, scrollWidth, clientWidth } = rowRef.current;
        setCanScrollLeft(scrollLeft > 10);
        setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
    };

    useEffect(() => {
        checkScrollButtons();
        window.addEventListener('resize', checkScrollButtons);
        return () => window.removeEventListener('resize', checkScrollButtons);
    }, [videos]);

    const handleScroll = (direction) => {
        if (!rowRef.current) return;
        const { scrollLeft, clientWidth } = rowRef.current;
        const scrollAmount = clientWidth * 0.75;
        rowRef.current.scrollTo({
            left: direction === 'left' ? scrollLeft - scrollAmount : scrollLeft + scrollAmount,
            behavior: 'smooth'
        });
    };

    // Dynamic soft fade gradient mask for overflowing edges
    const getMaskStyle = () => {
        if (canScrollLeft && canScrollRight) {
            return {
                maskImage: 'linear-gradient(to right, transparent, black 40px, black calc(100% - 64px), transparent 100%)',
                WebkitMaskImage: 'linear-gradient(to right, transparent, black 40px, black calc(100% - 64px), transparent 100%)'
            };
        }
        if (canScrollRight) {
            return {
                maskImage: 'linear-gradient(to right, black 0%, black calc(100% - 64px), transparent 100%)',
                WebkitMaskImage: 'linear-gradient(to right, black 0%, black calc(100% - 64px), transparent 100%)'
            };
        }
        if (canScrollLeft) {
            return {
                maskImage: 'linear-gradient(to right, transparent 0%, black 40px, black 100%)',
                WebkitMaskImage: 'linear-gradient(to right, transparent 0%, black 40px, black 100%)'
            };
        }
        return {};
    };

    if (!videos || videos.length === 0) {
        if (!userIsAdmin) return null;
    }

    return (
        <div className="space-y-3 py-2 group/row relative">
            {/* Row Header */}
            <div className="flex items-center justify-between gap-3 px-1">
                <div className="flex items-center gap-2.5 flex-wrap">
                    <h2 className={`text-lg sm:text-xl md:text-2xl font-black tracking-tight bg-gradient-to-r ${titleGradient} bg-clip-text text-transparent select-none`}>
                        {title}
                    </h2>
                </div>

                {/* Right Actions: View All & Navigation Arrows */}
                <div className="flex items-center gap-2">
                    {onViewAll && videos.length > 0 && (
                        <button
                            onClick={onViewAll}
                            className="group/btn text-xs font-bold text-slate-800 dark:text-slate-100 bg-white/90 dark:bg-slate-900/90 hover:bg-[#f494bc] dark:hover:bg-[#f494bc] hover:text-slate-950 dark:hover:text-slate-950 border border-slate-200/90 dark:border-slate-800 hover:border-[#f494bc] dark:hover:border-[#f494bc] flex items-center gap-1.5 transition-all duration-200 px-3 py-1.5 rounded-xl shadow-xs cursor-pointer active:scale-95"
                        >
                            <span>Xem tất cả</span>
                            <ArrowRight className="w-3.5 h-3.5 group-hover/btn:translate-x-0.5 transition-transform" />
                        </button>
                    )}

                    {/* Scroll Arrows for Desktop */}
                    <div className="hidden sm:flex items-center gap-1">
                        <button
                            onClick={() => handleScroll('left')}
                            disabled={!canScrollLeft}
                            aria-label="Cuộn sang trái"
                            className={`p-1.5 rounded-xl border transition-all cursor-pointer ${
                                canScrollLeft
                                    ? 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 hover:bg-[#f494bc] hover:text-slate-950 hover:border-[#f494bc] dark:hover:bg-[#f494bc] dark:hover:text-slate-950 dark:hover:border-[#f494bc] shadow-xs active:scale-95'
                                    : 'bg-transparent border-transparent text-slate-300 dark:text-slate-700 cursor-not-allowed opacity-40'
                            }`}
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => handleScroll('right')}
                            disabled={!canScrollRight}
                            aria-label="Cuộn sang phải"
                            className={`p-1.5 rounded-xl border transition-all cursor-pointer ${
                                canScrollRight
                                    ? 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 hover:bg-[#f494bc] hover:text-slate-950 hover:border-[#f494bc] dark:hover:bg-[#f494bc] dark:hover:text-slate-950 dark:hover:border-[#f494bc] shadow-xs active:scale-95'
                                    : 'bg-transparent border-transparent text-slate-300 dark:text-slate-700 cursor-not-allowed opacity-40'
                            }`}
                        >
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Horizontal Movie Cards Carousel Container with Soft Edge Fading */}
            <div className="relative group/carousel">
                {/* Left Subtle Glow / Shadow Edge */}
                <div
                    className={`pointer-events-none absolute -left-1 top-0 bottom-3 w-8 sm:w-12 bg-gradient-to-r from-white/90 via-white/40 to-transparent dark:from-slate-950/90 dark:via-slate-950/40 dark:to-transparent z-10 transition-opacity duration-300 ${
                        canScrollLeft ? 'opacity-100' : 'opacity-0'
                    }`}
                />

                {/* Right Subtle Glow / Shadow Edge */}
                <div
                    className={`pointer-events-none absolute -right-1 top-0 bottom-3 w-12 sm:w-20 bg-gradient-to-l from-white/90 via-white/40 to-transparent dark:from-slate-950/90 dark:via-slate-950/40 dark:to-transparent z-10 transition-opacity duration-300 ${
                        canScrollRight ? 'opacity-100' : 'opacity-0'
                    }`}
                />

                <div
                    ref={rowRef}
                    onScroll={checkScrollButtons}
                    style={getMaskStyle()}
                    className="flex items-stretch gap-4 sm:gap-5 overflow-x-auto scrollbar-none scroll-smooth pb-3 pt-1 px-1 pr-4 sm:pr-8 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden transition-[mask-image] duration-300"
                >
                    {videos.map(video => (
                        <VideoKaiwaMovieCard
                            key={video.id}
                            video={video}
                            onSelectVideo={onSelectVideo}
                            userIsAdmin={userIsAdmin}
                            onEditVideo={onEditVideo}
                            onDeleteVideo={onDeleteVideo}
                            formatDuration={formatDuration}
                            cardWidthClass="w-64 sm:w-72 md:w-80 shrink-0"
                        />
                    ))}

                    {/* Admin Add New Card if Category has room or is empty */}
                    {userIsAdmin && onAddNewVideo && (
                        <div
                            onClick={onAddNewVideo}
                            className="w-56 sm:w-64 shrink-0 rounded-2xl sm:rounded-3xl border-2 border-dashed border-slate-300 dark:border-slate-800 hover:border-amber-500/80 bg-slate-50/50 dark:bg-slate-900/30 hover:bg-amber-50/30 dark:hover:bg-amber-950/20 flex flex-col items-center justify-center p-6 text-center space-y-2 transition-all cursor-pointer group"
                        >
                            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 group-hover:bg-amber-500 text-amber-600 group-hover:text-slate-950 flex items-center justify-center transition-colors shadow-sm">
                                <Plus className="w-5 h-5" />
                            </div>
                            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 group-hover:text-amber-600 dark:group-hover:text-amber-400">
                                Thêm video vào mục này
                            </span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default VideoKaiwaCategoryRow;
