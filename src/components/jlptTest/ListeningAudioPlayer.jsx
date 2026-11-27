import React, { useEffect, useRef, useState } from 'react';
import { Play, Pause, RotateCcw, Volume2, Gauge } from 'lucide-react';
import { formatTimeShort } from '../../utils/jlptAudioProcessor';

const ListeningAudioPlayerInner = ({
    src,
    startSec = null,
    endSec = null,
    externalRef = null,
    label = '',
    compact = false,
    onTimeReport = null
}) => {
    const internalRef = useRef(null);
    const audioElRef = externalRef || internalRef;

    const hasSegmentBounds = typeof startSec === 'number' && startSec >= 0 && typeof endSec === 'number' && endSec > startSec;
    const effectiveStart = typeof startSec === 'number' && startSec >= 0 ? startSec : 0;

    const [isPlaying, setIsPlaying] = useState(false);
    const [rawDuration, setRawDuration] = useState(0);
    const [currentTime, setCurrentTime] = useState(effectiveStart);
    const [playbackRate, setPlaybackRate] = useState(1);
    const [audioError, setAudioError] = useState('');

    const effectiveEnd = hasSegmentBounds
        ? Math.min(endSec, rawDuration > 0 ? rawDuration : endSec)
        : rawDuration;
    const segmentDuration = Math.max(0.1, effectiveEnd - effectiveStart);
    const segmentElapsed = Math.max(0, Math.min(segmentDuration, currentTime - effectiveStart));

    // Synchronize external audio element playback rate & stop on unmount
    useEffect(() => {
        const el = audioElRef.current;
        if (!el) return undefined;
        el.playbackRate = playbackRate;
        return () => {
            el.pause();
        };
    }, [audioElRef, playbackRate]);

    const handleLoadedMetadata = () => {
        const el = audioElRef.current;
        if (!el) return;
        setRawDuration(el.duration || 0);
        if (effectiveStart > 0 && Math.abs(el.currentTime - effectiveStart) > 0.4) {
            try {
                el.currentTime = effectiveStart;
                setCurrentTime(effectiveStart);
            } catch {
                // Ignore seek errors before browser buffers metadata
            }
        }
    };

    const handleTimeUpdate = () => {
        const el = audioElRef.current;
        if (!el) return;
        const t = el.currentTime || 0;
        setCurrentTime(t);
        if (onTimeReport) onTimeReport(t);

        if (hasSegmentBounds && t >= effectiveEnd) {
            el.pause();
            el.currentTime = effectiveStart;
            setCurrentTime(effectiveStart);
            setIsPlaying(false);
        }
    };

    const togglePlay = async () => {
        const el = audioElRef.current;
        if (!el || !src) return;
        if (isPlaying) {
            el.pause();
            setIsPlaying(false);
            return;
        }
        try {
            if (el.currentTime < effectiveStart || (hasSegmentBounds && el.currentTime >= effectiveEnd - 0.15)) {
                el.currentTime = effectiveStart;
            }
            el.playbackRate = playbackRate;
            await el.play();
            setIsPlaying(true);
        } catch {
            setAudioError('Không phát được file audio (kiểm tra link MP3 hoặc định dạng).');
            setIsPlaying(false);
        }
    };

    const handleRestart = () => {
        const el = audioElRef.current;
        if (!el) return;
        el.currentTime = effectiveStart;
        setCurrentTime(effectiveStart);
    };

    const handleSeek = (e) => {
        const el = audioElRef.current;
        if (!el) return;
        const val = Number(e.target.value);
        const target = effectiveStart + val;
        el.currentTime = target;
        setCurrentTime(target);
    };

    const cycleSpeed = () => {
        const speeds = [0.85, 1, 1.15, 1.25];
        const next = speeds[(speeds.indexOf(playbackRate) + 1) % speeds.length];
        setPlaybackRate(next);
        if (audioElRef.current) audioElRef.current.playbackRate = next;
    };

    return (
        <div className={`rounded-2xl border-2 border-amber-200 dark:border-amber-800/70 bg-amber-50/70 dark:bg-amber-950/25 ${compact ? 'p-2.5' : 'p-3.5 sm:p-4'} space-y-2`}>
            <audio
                ref={audioElRef}
                src={src}
                preload="metadata"
                onLoadedMetadata={handleLoadedMetadata}
                onTimeUpdate={handleTimeUpdate}
                onEnded={() => setIsPlaying(false)}
                onPause={() => setIsPlaying(false)}
                onPlay={() => setIsPlaying(true)}
                onError={() => setAudioError('Lỗi tải nguồn audio. Kiểm tra URL hoặc quyền truy cập file.')}
                className="hidden"
            />

            <div className="flex items-center gap-2.5 sm:gap-3">
                <button
                    type="button"
                    onClick={togglePlay}
                    className="w-10 h-10 rounded-xl bg-amber-500 hover:bg-amber-400 border-b-4 border-amber-700 active:translate-y-0.5 active:border-b-2 text-white flex items-center justify-center shrink-0 cursor-pointer shadow-xs transition"
                    title={isPlaying ? 'Tạm dừng' : 'Phát audio nghe hiểu'}
                >
                    {isPlaying ? <Pause className="w-4 h-4 fill-white" /> : <Play className="w-4 h-4 fill-white ml-0.5" />}
                </button>

                <button
                    type="button"
                    onClick={handleRestart}
                    className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-amber-200 dark:border-slate-700 text-amber-700 dark:text-amber-300 hover:bg-amber-100/70 transition cursor-pointer shrink-0"
                    title="Nghe lại từ đầu câu"
                >
                    <RotateCcw className="w-3.5 h-3.5" />
                </button>

                <div className="flex-1 min-w-0 space-y-1">
                    {(label || hasSegmentBounds) && (
                        <div className="flex items-center justify-between text-[10px] font-extrabold text-amber-800 dark:text-amber-300">
                            <span className="flex items-center gap-1 truncate">
                                <Volume2 className="w-3 h-3 shrink-0" />
                                <span className="truncate">{label || 'Audio Nghe hiểu JLPT'}</span>
                            </span>
                            {hasSegmentBounds && (
                                <span className="font-mono text-amber-700/80 dark:text-amber-300/80 shrink-0 ml-2">
                                    [{formatTimeShort(effectiveStart)} – {formatTimeShort(effectiveEnd)}]
                                </span>
                            )}
                        </div>
                    )}

                    <div className="flex items-center gap-2">
                        <input
                            type="range"
                            min={0}
                            max={segmentDuration}
                            step={0.1}
                            value={segmentElapsed}
                            onChange={handleSeek}
                            className="flex-1 accent-amber-500 h-1.5 bg-amber-200/80 dark:bg-slate-700 rounded-lg cursor-pointer"
                        />
                        <span className="text-[11px] font-mono font-bold text-slate-600 dark:text-slate-300 shrink-0">
                            {formatTimeShort(segmentElapsed)} / {formatTimeShort(segmentDuration)}
                        </span>
                    </div>
                </div>

                <button
                    type="button"
                    onClick={cycleSpeed}
                    className="px-2 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-amber-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-[11px] font-black flex items-center gap-1 cursor-pointer shrink-0 hover:bg-amber-100/50"
                    title="Đổi tốc độ đọc"
                >
                    <Gauge className="w-3 h-3 text-amber-500" />
                    <span>{playbackRate}x</span>
                </button>
            </div>

            {audioError && (
                <p className="text-[11px] font-bold text-rose-600 dark:text-rose-400 pl-1">
                    {audioError}
                </p>
            )}
        </div>
    );
};

/**
 * Segment-aware JLPT Listening Audio Player.
 * Keys the inner player by segment identity so switching questions cleanly resets audio state.
 */
const ListeningAudioPlayer = (props) => {
    if (!props.src) return null;
    const segmentKey = `${props.src}_${props.startSec ?? 0}_${props.endSec ?? 'full'}`;
    return <ListeningAudioPlayerInner key={segmentKey} {...props} />;
};

export default ListeningAudioPlayer;
