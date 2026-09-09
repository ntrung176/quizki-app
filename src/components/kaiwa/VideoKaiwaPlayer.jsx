import React, { useEffect, useRef, useState, useCallback } from 'react';
import { 
    Play, Pause, RotateCcw, RotateCw, Repeat, Volume2, VolumeX, 
    Maximize, Minimize, Settings, Sparkles, Mic, BookOpen, Eye, EyeOff,
    Check, ChevronRight, Layers, SlidersHorizontal, Info, SkipBack, SkipForward, RefreshCw,
    ArrowLeft, Edit3, Languages
} from 'lucide-react';
import FuriganaRenderer from './FuriganaRenderer';

const VideoKaiwaPlayer = ({
    video,
    activeSubIndex,
    setActiveSubIndex,
    isPlaying,
    setIsPlaying,
    onSeekTo,
    isLoopingSentence,
    setIsLoopingSentence,
    onOpenShadowingModal,
    showFurigana,
    setShowFurigana,
    showVietnamese,
    setShowVietnamese,
    onWordLookup,
    onBack,
    isAdmin,
    onEditVideo
}) => {
    const playerContainerRef = useRef(null);
    const iframeRef = useRef(null);
    const playerRef = useRef(null);
    const progressBarRef = useRef(null);

    const [currentTime, setCurrentTime] = useState(0);
    const [isApiReady, setIsApiReady] = useState(false);
    const [duration, setDuration] = useState(video?.duration || 0);
    const [playbackRate, setPlaybackRate] = useState(1);
    const [volume, setVolume] = useState(100);
    const [isMuted, setIsMuted] = useState(false);
    const [showSpeedMenu, setShowSpeedMenu] = useState(false);
    const [showSubtitleMenu, setShowSubtitleMenu] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [isHoveringVideo, setIsHoveringVideo] = useState(false);

    const timeIntervalRef = useRef(null);
    const subtitleMenuRef = useRef(null);
    const subtitles = video?.subtitles || [];
    const currentSub = (activeSubIndex >= 0 && activeSubIndex < subtitles.length) ? subtitles[activeSubIndex] : (subtitles.length > 0 ? subtitles[0] : null);

    // Click outside listener for Subtitle Menu
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (subtitleMenuRef.current && !subtitleMenuRef.current.contains(e.target)) {
                setShowSubtitleMenu(false);
            }
        };
        if (showSubtitleMenu) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showSubtitleMenu]);

    // Load YouTube IFrame API
    useEffect(() => {
        if (!window.YT) {
            const tag = document.createElement('script');
            tag.src = 'https://www.youtube.com/iframe_api';
            const firstScriptTag = document.getElementsByTagName('script')[0];
            firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
            window.onYouTubeIframeAPIReady = () => {
                setIsApiReady(true);
            };
        } else {
            setIsApiReady(true);
        }
    }, []);

    // Initialize YouTube Player with native controls completely HIDDEN
    useEffect(() => {
        if (!isApiReady || !video?.youtubeId || !iframeRef.current) return;

        if (playerRef.current && typeof playerRef.current.destroy === 'function') {
            try { playerRef.current.destroy(); } catch (e) { console.warn(e); }
        }

        const clearCaptions = (target) => {
            if (!target) return;
            try {
                if (typeof target.unloadModule === 'function') {
                    target.unloadModule('captions');
                    target.unloadModule('cc');
                }
                if (typeof target.setOption === 'function') {
                    target.setOption('captions', 'track', {});
                    target.setOption('cc', 'track', {});
                    target.setOption('captions', 'fontSize', -3);
                    target.setOption('captions', 'reload', false);
                }
            } catch (e) {}
        };

        playerRef.current = new window.YT.Player(iframeRef.current, {
            videoId: video.youtubeId,
            playerVars: {
                autoplay: 0,
                controls: 0, // Hide YouTube's native UI controls
                disablekb: 1, // Disable YouTube internal keyboard
                enablejsapi: 1,
                autohide: 1,
                modestbranding: 1,
                rel: 0,
                fs: 0,
                playsinline: 1,
                iv_load_policy: 3, // Hide video annotations
                cc_load_policy: 3, // 3 explicitly disables CC subtitles
                cc_lang_pref: 'none',
                origin: window.location.origin
            },
            events: {
                onReady: (event) => {
                    const dur = event.target.getDuration();
                    if (dur) setDuration(dur);
                    clearCaptions(event.target);
                },
                onApiChange: (event) => {
                    // YouTube loads captions module asynchronously via onApiChange
                    clearCaptions(event.target);
                },
                onStateChange: (event) => {
                    // YT.PlayerState.PLAYING === 1, PAUSED === 2, ENDED === 0
                    if (event.data === 1) {
                        setIsPlaying(true);
                        clearCaptions(event.target);
                    } else if (event.data === 2 || event.data === 0) {
                        setIsPlaying(false);
                    }
                }
            }
        });

        return () => {
            if (timeIntervalRef.current) clearInterval(timeIntervalRef.current);
            if (playerRef.current && typeof playerRef.current.destroy === 'function') {
                try { playerRef.current.destroy(); } catch (e) { console.warn(e); }
            }
        };
    }, [isApiReady, video?.youtubeId]);

    // Synchronize video time and active subtitle
    useEffect(() => {
        if (isPlaying) {
            timeIntervalRef.current = setInterval(() => {
                if (playerRef.current && typeof playerRef.current.getCurrentTime === 'function') {
                    const curr = playerRef.current.getCurrentTime();
                    setCurrentTime(curr);

                    // A-B Loop current sentence
                    if (isLoopingSentence && currentSub) {
                        if (curr >= currentSub.end - 0.1 || curr < currentSub.start - 0.5) {
                            playerRef.current.seekTo(currentSub.start, true);
                            setCurrentTime(currentSub.start);
                            return;
                        }
                    } else {
                        // Identify active subtitle index
                        const subIdx = subtitles.findIndex(s => curr >= s.start && curr <= s.end);
                        if (subIdx !== -1 && subIdx !== activeSubIndex) {
                            setActiveSubIndex(subIdx);
                        }
                    }
                }
            }, 60);
        } else {
            if (timeIntervalRef.current) clearInterval(timeIntervalRef.current);
        }

        return () => {
            if (timeIntervalRef.current) clearInterval(timeIntervalRef.current);
        };
    }, [isPlaying, isLoopingSentence, currentSub, activeSubIndex, subtitles]);

    const segmentTimeoutRef = useRef(null);

    // Seek helper with segment auto-stop support
    const seekToSeconds = useCallback((sec, autoPlay = true, stopAtSec = null) => {
        if (segmentTimeoutRef.current) {
            clearTimeout(segmentTimeoutRef.current);
            segmentTimeoutRef.current = null;
        }

        if (playerRef.current && typeof playerRef.current.seekTo === 'function') {
            playerRef.current.seekTo(sec, true);
            setCurrentTime(sec);
            if (autoPlay && typeof playerRef.current.playVideo === 'function') {
                playerRef.current.playVideo();
                setIsPlaying(true);

                if (stopAtSec && stopAtSec > sec) {
                    const durationMs = Math.max(500, (stopAtSec - sec) * 1000);
                    segmentTimeoutRef.current = setTimeout(() => {
                        if (playerRef.current && typeof playerRef.current.pauseVideo === 'function') {
                            playerRef.current.pauseVideo();
                            setIsPlaying(false);
                        }
                    }, durationMs);
                }
            }
        }
    }, [setIsPlaying]);

    // Expose seek handler to parent
    useEffect(() => {
        if (onSeekTo) {
            onSeekTo.current = seekToSeconds;
        }
    }, [onSeekTo, seekToSeconds]);

    // Sync isPlaying state changes from parent to YouTube player
    useEffect(() => {
        if (!isPlaying && playerRef.current && typeof playerRef.current.pauseVideo === 'function') {
            try {
                const state = playerRef.current.getPlayerState?.();
                if (state === 1) { // If playing
                    playerRef.current.pauseVideo();
                }
            } catch (e) {}
        }
    }, [isPlaying]);

    // Toggle Play/Pause
    const handleTogglePlay = useCallback(() => {
        if (!playerRef.current) return;
        if (isPlaying) {
            playerRef.current.pauseVideo?.();
            setIsPlaying(false);
        } else {
            playerRef.current.playVideo?.();
            setIsPlaying(true);
        }
    }, [isPlaying, setIsPlaying]);

    // Spacebar shortcut for Play/Pause
    useEffect(() => {
        const handleKeyDown = (e) => {
            const activeTag = document.activeElement?.tagName?.toLowerCase();
            const isEditable = activeTag === 'input' || activeTag === 'textarea' || document.activeElement?.isContentEditable;
            if (isEditable) return;

            if (e.code === 'Space' || e.key === ' ') {
                e.preventDefault();
                handleTogglePlay();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [handleTogglePlay]);

    // Toggle A-B Sentence Loop
    const handleToggleLoop = () => {
        const nextLoop = !isLoopingSentence;
        setIsLoopingSentence(nextLoop);
        if (nextLoop) {
            let targetSub = currentSub;
            if (!targetSub && subtitles.length > 0) {
                targetSub = subtitles.find(s => currentTime >= s.start && currentTime <= s.end) || subtitles[activeSubIndex] || subtitles[0];
            }
            if (targetSub) {
                seekToSeconds(targetSub.start, true);
            }
        }
    };

    // Sentence Navigations
    const handlePrevSentence = () => {
        if (subtitles.length === 0) return;
        const targetIdx = Math.max(0, (activeSubIndex >= 0 ? activeSubIndex : 0) - 1);
        setActiveSubIndex(targetIdx);
        seekToSeconds(subtitles[targetIdx].start, true);
    };

    const handleNextSentence = () => {
        if (subtitles.length === 0) return;
        const targetIdx = Math.min(subtitles.length - 1, (activeSubIndex >= 0 ? activeSubIndex : 0) + 1);
        setActiveSubIndex(targetIdx);
        seekToSeconds(subtitles[targetIdx].start, true);
    };

    const handleReplaySentence = () => {
        if (currentSub) {
            seekToSeconds(currentSub.start, true);
        } else {
            seekToSeconds(Math.max(0, currentTime - 5), true);
        }
    };

    // Scrubber click / drag
    const handleScrubberClick = (e) => {
        if (!progressBarRef.current || !duration) return;
        const rect = progressBarRef.current.getBoundingClientRect();
        const clickPos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        const targetTime = clickPos * duration;
        seekToSeconds(targetTime, isPlaying);
    };

    // Playback Speed
    const handleChangeSpeed = (speed) => {
        setPlaybackRate(speed);
        if (playerRef.current && typeof playerRef.current.setPlaybackRate === 'function') {
            playerRef.current.setPlaybackRate(speed);
        }
        setShowSpeedMenu(false);
    };

    // Volume Control
    const handleVolumeChange = (newVol) => {
        setVolume(newVol);
        setIsMuted(newVol === 0);
        if (playerRef.current) {
            playerRef.current.setVolume?.(newVol);
            if (newVol > 0) playerRef.current.unMute?.();
        }
    };

    const handleToggleMute = () => {
        if (!playerRef.current) return;
        if (isMuted) {
            playerRef.current.unMute?.();
            setIsMuted(false);
        } else {
            playerRef.current.mute?.();
            setIsMuted(true);
        }
    };

    // Format mm:ss
    const formatTime = (seconds) => {
        const m = Math.floor(seconds / 60);
        const s = Math.floor(seconds % 60);
        return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    };

    // Fullscreen Toggle
    const handleToggleFullscreen = () => {
        if (!playerContainerRef.current) return;
        if (!document.fullscreenElement) {
            playerContainerRef.current.requestFullscreen?.();
            setIsFullscreen(true);
        } else {
            document.exitFullscreen?.();
            setIsFullscreen(false);
        }
    };

    const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

    return (
        <div 
            ref={playerContainerRef} 
            className="flex flex-col bg-white dark:bg-slate-950 rounded-3xl overflow-hidden shadow-xl dark:shadow-2xl border border-slate-200/90 dark:border-slate-800 text-slate-900 dark:text-white font-sans select-none w-full h-full max-h-full justify-between"
        >
            {/* 1. Video Container with clean IFrame (Full Width 16:9, Native 1x) */}
            <div 
                className="shrink-0 relative w-full aspect-video bg-black rounded-t-3xl overflow-hidden group cursor-pointer flex items-center justify-center select-none"
                onMouseEnter={() => setIsHoveringVideo(true)}
                onMouseLeave={() => setIsHoveringVideo(false)}
                onClick={handleTogglePlay}
            >
                {/* 100% Full Width IFrame (1x Native) */}
                <div className="absolute inset-0 w-full h-full flex items-center justify-center pointer-events-none rounded-t-3xl overflow-hidden">
                    <div ref={iframeRef} className="w-full h-full rounded-t-3xl overflow-hidden" />
                </div>
            </div>

            {/* 2. Interactive Dual Subtitles Display Box (Khung Script Phụ Đề) */}
            <div className="flex-1 min-h-[85px] overflow-y-auto p-3 sm:p-4 bg-gradient-to-b from-slate-50/90 via-white/95 to-slate-50/90 dark:from-slate-900/90 dark:via-slate-950/95 dark:to-slate-950/90 border-t border-slate-200/80 dark:border-slate-800/80 flex flex-col justify-center items-center text-center px-4">
                {currentSub ? (
                    <div className="space-y-1.5 sm:space-y-2 max-w-4xl mx-auto my-auto py-1 transition-opacity duration-200">
                        {/* Japanese Subtitle with Furigana */}
                        <div className="text-base sm:text-xl md:text-2xl font-bold text-amber-600 dark:text-amber-400 tracking-normal leading-relaxed drop-shadow-xs font-sans">
                            <FuriganaRenderer 
                                text={currentSub.furigana || currentSub.ja} 
                                showFurigana={showFurigana} 
                                onWordClick={onWordLookup}
                            />
                        </div>

                        {/* Vietnamese Translation Subtitle */}
                        {showVietnamese && (
                            <p className="text-xs sm:text-sm md:text-base text-slate-700 dark:text-slate-200 font-medium leading-relaxed drop-shadow-xs">
                                {currentSub.vi || '(Chưa có bản dịch Tiếng Việt)'}
                            </p>
                        )}
                    </div>
                ) : (
                    <div className="text-slate-400 dark:text-slate-500 text-xs sm:text-sm italic flex items-center gap-2 my-auto py-2">
                        <Sparkles className="w-4 h-4 text-slate-400 dark:text-slate-600" />
                        <span>(Phụ đề song ngữ sẽ hiển thị đồng bộ khi video phát đến đoạn đối thoại...)</span>
                    </div>
                )}
            </div>

            {/* 3. Custom Web Player Controls Toolbar (Thanh công cụ Web ở giữa) */}
            <div className="shrink-0 p-2.5 sm:p-3.5 bg-white/95 dark:bg-slate-950/95 border-t border-slate-200/80 dark:border-slate-800/80 space-y-2 sm:space-y-2.5 rounded-b-3xl">
                {/* Timeline Scrubber Track */}
                <div className="flex items-center gap-2.5 sm:gap-3 text-xs font-mono font-bold">
                    <span className="px-2 py-0.5 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 min-w-[46px] text-center font-black text-[11px] sm:text-xs">{formatTime(currentTime)}</span>
                    <div 
                        ref={progressBarRef}
                        onClick={handleScrubberClick}
                        className="flex-1 h-2 sm:h-2.5 bg-slate-200 dark:bg-slate-800/80 hover:h-3 rounded-full overflow-hidden cursor-pointer relative transition-all duration-200"
                    >
                        <div 
                            className="h-full bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500 relative transition-all duration-75 rounded-full"
                            style={{ width: `${progressPercent}%` }}
                        >
                            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 sm:w-3.5 sm:h-3.5 bg-white rounded-full shadow-md border border-slate-300 dark:border-transparent transform translate-x-1/2" />
                        </div>
                    </div>
                    <span className="px-2 py-0.5 rounded-xl bg-slate-100 dark:bg-slate-850 text-slate-500 dark:text-slate-400 min-w-[46px] text-center text-[11px] sm:text-xs">{formatTime(duration)}</span>
                </div>

                {/* Centered Controls Row */}
                <div className="flex items-center justify-between gap-2 pt-0.5 flex-wrap sm:flex-nowrap">
                    {/* Left Group: Subtitle Options & Back */}
                    <div className="flex items-center gap-1.5 order-2 sm:order-1">
                        {onBack && (
                            <button
                                type="button"
                                onClick={onBack}
                                title="Quay lại thư viện"
                                className="px-2 sm:px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white border border-slate-200 dark:border-slate-800 transition-all cursor-pointer font-bold text-xs flex items-center gap-1"
                            >
                                <ArrowLeft className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">Quay lại</span>
                            </button>
                        )}

                        {isAdmin && onEditVideo && (
                            <button
                                type="button"
                                onClick={onEditVideo}
                                title="Chỉnh sửa video này (Admin)"
                                className="px-2 sm:px-2.5 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 transition-all cursor-pointer font-bold text-xs flex items-center gap-1"
                            >
                                <Edit3 className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">Sửa</span>
                            </button>
                        )}

                        {/* Unified Subtitle Settings Popover */}
                        <div className="relative" ref={subtitleMenuRef}>
                            <button
                                type="button"
                                onClick={() => setShowSubtitleMenu(!showSubtitleMenu)}
                                title="Tùy chỉnh phụ đề & phiên âm"
                                className={`px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border flex items-center gap-1.5 ${
                                    (showFurigana || showVietnamese)
                                        ? 'bg-amber-500/10 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 border-amber-300/80 dark:border-amber-500/40 shadow-xs'
                                        : 'bg-slate-100 dark:bg-slate-900 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:text-slate-700 dark:hover:text-slate-300'
                                }`}
                            >
                                <Languages className="w-3.5 h-3.5 text-amber-500" />
                                <span>Phụ đề</span>
                                <span className={`w-1.5 h-1.5 rounded-full ${showFurigana || showVietnamese ? 'bg-amber-500' : 'bg-slate-400'}`} />
                            </button>

                            {showSubtitleMenu && (
                                <div className="absolute bottom-full mb-2 left-0 z-50 w-52 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-2 space-y-1 animate-fade-in text-xs">
                                    <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 px-2 py-1">
                                        Tùy chọn phụ đề
                                    </div>

                                    {/* Furigana Toggle */}
                                    <button
                                        type="button"
                                        onClick={() => setShowFurigana(!showFurigana)}
                                        className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl font-bold transition-all text-left cursor-pointer ${
                                            showFurigana
                                                ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60'
                                                : 'bg-slate-50 dark:bg-slate-850 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-transparent'
                                        }`}
                                    >
                                        <div className="flex items-center gap-2">
                                            <span className={`w-2 h-2 rounded-full ${showFurigana ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                                            <span>Furigana (Phiên âm)</span>
                                        </div>
                                        {showFurigana && <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />}
                                    </button>

                                    {/* Tiếng Việt Toggle */}
                                    <button
                                        type="button"
                                        onClick={() => setShowVietnamese(!showVietnamese)}
                                        className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl font-bold transition-all text-left cursor-pointer ${
                                            showVietnamese
                                                ? 'bg-sky-50 dark:bg-sky-950/50 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800/60'
                                                : 'bg-slate-50 dark:bg-slate-850 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-transparent'
                                        }`}
                                    >
                                        <div className="flex items-center gap-2">
                                            <span className={`w-2 h-2 rounded-full ${showVietnamese ? 'bg-sky-500' : 'bg-slate-400'}`} />
                                            <span>Dịch Tiếng Việt</span>
                                        </div>
                                        {showVietnamese && <Check className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />}
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Center Group: Main Playback Cluster (Centered Prominently) */}
                    <div className="flex items-center justify-center gap-1.5 sm:gap-2 order-1 sm:order-2 mx-auto">
                        {/* Prev Sentence */}
                        <button
                            onClick={handlePrevSentence}
                            title="Câu thoại trước ( |<< )"
                            className="p-2 sm:p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white transition-all cursor-pointer active:scale-95 border border-slate-200 dark:border-slate-800 shadow-xs"
                        >
                            <SkipBack className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        </button>

                        {/* Replay Current Sentence */}
                        <button
                            onClick={handleReplaySentence}
                            title="Nghe lại câu hiện tại"
                            className="p-2 sm:p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white transition-all cursor-pointer active:scale-95 border border-slate-200 dark:border-slate-800 shadow-xs"
                        >
                            <RefreshCw className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        </button>

                        {/* Big Center Play/Pause */}
                        <button
                            onClick={handleTogglePlay}
                            title={isPlaying ? 'Tạm dừng' : 'Phát'}
                            className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black shadow-lg shadow-amber-500/25 flex items-center justify-center transition-all cursor-pointer active:scale-95 mx-0.5"
                        >
                            {isPlaying ? <Pause className="w-4 h-4 sm:w-5 sm:h-5 fill-slate-950" /> : <Play className="w-4 h-4 sm:w-5 sm:h-5 fill-slate-950 ml-0.5" />}
                        </button>

                        {/* Next Sentence */}
                        <button
                            onClick={handleNextSentence}
                            title="Câu thoại tiếp theo ( >>| )"
                            className="p-2 sm:p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white transition-all cursor-pointer active:scale-95 border border-slate-200 dark:border-slate-800 shadow-xs"
                        >
                            <SkipForward className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        </button>

                        <div className="h-5 w-[1px] bg-slate-200 dark:bg-slate-800 mx-0.5 hidden sm:block" />

                        {/* Sentence Loop Toggle */}
                        <button
                            onClick={handleToggleLoop}
                            title="Lặp lại câu này liên tục (A-B Loop)"
                            className={`flex items-center gap-1 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                                isLoopingSentence
                                    ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-400 border-amber-300 dark:border-amber-500/60 shadow-md ring-2 ring-amber-400/20'
                                    : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white border-slate-200 dark:border-slate-800 shadow-xs'
                            }`}
                        >
                            <Repeat className={`w-3.5 h-3.5 ${isLoopingSentence ? 'animate-spin' : ''}`} />
                            <span className="hidden md:inline">Lặp câu</span>
                        </button>

                        {/* Shadowing Practice Button */}
                        {onOpenShadowingModal && (
                            <button
                                onClick={() => {
                                    if (playerRef.current && typeof playerRef.current.pauseVideo === 'function') {
                                        playerRef.current.pauseVideo();
                                    }
                                    setIsPlaying(false);
                                    onOpenShadowingModal();
                                }}
                                title="Luyện nói nhại lại câu này (Shadowing AI)"
                                className="flex items-center gap-1 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl text-xs font-bold bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-600/30 dark:hover:bg-indigo-600/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/40 transition-all cursor-pointer active:scale-95 shadow-xs"
                            >
                                <Mic className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                                <span className="hidden md:inline">Shadowing</span>
                            </button>
                        )}
                    </div>

                    {/* Right Group: Volume, Speed, Fullscreen */}
                    <div className="flex items-center gap-1.5 order-3">
                        {/* Volume Control */}
                        <div className="hidden md:flex items-center gap-1 bg-slate-100 dark:bg-slate-900/80 p-1 rounded-xl border border-slate-200 dark:border-slate-800">
                            <button
                                onClick={handleToggleMute}
                                className="p-1 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition cursor-pointer"
                            >
                                {isMuted || volume === 0 ? <VolumeX className="w-3.5 h-3.5 text-rose-500" /> : <Volume2 className="w-3.5 h-3.5" />}
                            </button>
                            <input
                                type="range"
                                min="0"
                                max="100"
                                value={isMuted ? 0 : volume}
                                onChange={(e) => handleVolumeChange(parseInt(e.target.value, 10))}
                                className="w-12 h-1.5 accent-amber-500 bg-slate-300 dark:bg-slate-700 rounded-lg cursor-pointer"
                            />
                        </div>

                        {/* Speed Dropdown */}
                        <div className="relative">
                            <button
                                onClick={() => setShowSpeedMenu(!showSpeedMenu)}
                                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 text-xs font-mono font-bold cursor-pointer shadow-xs"
                            >
                                <span>{playbackRate}x</span>
                            </button>

                            {showSpeedMenu && (
                                <div className="absolute bottom-full right-0 mb-2 w-28 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-1.5 shadow-2xl z-50 space-y-1">
                                    {[0.75, 1.0, 1.25, 1.5].map(speed => (
                                        <button
                                            key={speed}
                                            onClick={() => handleChangeSpeed(speed)}
                                            className={`w-full text-left px-2.5 py-1.5 rounded-xl text-xs font-bold flex items-center justify-between transition-colors cursor-pointer ${
                                                playbackRate === speed
                                                    ? 'bg-amber-500 text-slate-950 font-black'
                                                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                                            }`}
                                        >
                                            <span>{speed}x</span>
                                            {playbackRate === speed && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Fullscreen Button */}
                        <button
                            onClick={handleToggleFullscreen}
                            title="Toàn màn hình"
                            className="p-1.5 sm:p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-800 transition-colors cursor-pointer shadow-xs"
                        >
                            {isFullscreen ? <Minimize className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> : <Maximize className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default VideoKaiwaPlayer;
